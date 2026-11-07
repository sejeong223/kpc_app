"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import { SlidePromptTextSchema } from "@/lib/workspace/production/schemas";
import { readSlidePrompt } from "@/lib/workspace/production/slide-prompt";
import type { ProjectView, ProposalSlide, SlidePromptRequest, WorkspaceReceipt } from "@/types/workspace-production";
import { useWorkspaceAction } from "./use-workspace-production";

export interface SlidePromptDraft {
  projectId: string;
  round: number;
  slideId: string;
  baseRevision: number;
  prompt: string;
  dirty: boolean;
}
export interface SlidePromptEditorModel {
  draft: SlidePromptDraft;
  conflict: boolean;
  error: string | null;
  busy: boolean;
  markDirty(): void;
  setPrompt(value: string): void;
  save(): Promise<void>;
  discard(): void;
}
function baseline(view: ProjectView, slide: ProposalSlide): SlidePromptDraft {
  return { projectId: view.project.id, round: view.state.currentRound, slideId: slide.id,
    baseRevision: view.state.revision, prompt: readSlidePrompt(slide), dirty: false };
}
function sameTarget(draft: SlidePromptDraft, view: ProjectView, slide: ProposalSlide): boolean {
  return draft.projectId === view.project.id && draft.round === view.state.currentRound && draft.slideId === slide.id;
}

export function useSlidePrompt(view: ProjectView, slide: ProposalSlide): SlidePromptEditorModel {
  const runtime = useWorkspaceRuntime();
  const mutation = useWorkspaceAction<WorkspaceReceipt, SlidePromptRequest>((r, input) => r.service.applySlidePrompt(input));
  const [local, setLocal] = useState(() => baseline(view, slide)), [failure, setFailure] = useState<string | null>(null);
  // Keep a successful receipt until the query has caught up, and never replace an unsaved draft.
  const draft = local.dirty || (sameTarget(local, view, slide) && local.baseRevision > view.state.revision) ? local : baseline(view, slide);
  const conflict = draft.dirty && (!sameTarget(draft, view, slide) || draft.baseRevision !== view.state.revision);
  const validation = SlidePromptTextSchema.safeParse(draft.prompt);
  const latest = useRef({ view, slide, draft, conflict }), mounted = useRef(true), running = useRef(false), generation = useRef(0);
  useLayoutEffect(() => { latest.current = { view, slide, draft, conflict }; });
  useEffect(() => {
    const lifetime = generation;
    mounted.current = true;
    return () => { mounted.current = false; lifetime.current++; };
  }, []);
  const update = (next: SlidePromptDraft) => {
    latest.current = { ...latest.current, draft: next };
    setLocal(next);
  };
  const markDirty = () => {
    if (!running.current && !latest.current.draft.dirty) update({ ...latest.current.draft, dirty: true });
  };
  const setPrompt = (prompt: string) => {
    if (running.current) return;
    update({ ...latest.current.draft, prompt, dirty: true });
    setFailure(null);
  };
  const save = async () => {
    if (running.current) throw new WorkspaceError("CANCELLED", "슬라이드에 반영하고 있습니다.");
    const current = latest.current, captured = { ...current.draft }, run = generation.current;
    if (!mounted.current || !runtime.isActive()) throw new WorkspaceError("CANCELLED", "작업 화면이 변경되었습니다.");
    if (current.conflict) throw new WorkspaceError("CONFLICT", "다른 변경이 저장되었습니다. 입력을 보관했으니 최신 내용을 확인해 주세요.");
    if (current.view.state.phase !== "writing" || !current.view.capabilities.editableSlideIds.includes(captured.slideId))
      throw new WorkspaceError("READ_ONLY", "지금은 슬라이드에 반영할 수 없습니다.");
    const parsed = SlidePromptTextSchema.safeParse(captured.prompt);
    if (!parsed.success) throw new WorkspaceError("VALIDATION", parsed.error.issues[0].message);
    const stillCurrent = () => mounted.current && runtime.isActive() && generation.current === run &&
      sameTarget(captured, latest.current.view, latest.current.slide);
    running.current = true;
    try {
      const receipt = await mutation.mutateAsync({ projectId: captured.projectId, expectedRevision: captured.baseRevision,
        expectedRound: captured.round, slideId: captured.slideId, prompt: captured.prompt });
      if (!stillCurrent()) throw new WorkspaceError("CANCELLED", "작업 화면이 변경되었습니다.");
      const saved = receipt.state.body.slides.find(item => item.id === captured.slideId);
      if (!saved) throw new WorkspaceError("NOT_FOUND", "반영한 슬라이드를 찾을 수 없습니다.");
      update(baseline({ ...latest.current.view, state: receipt.state }, saved));
      setFailure(null);
    } catch (error) {
      if (stillCurrent()) setFailure(error instanceof Error ? error.message : "슬라이드를 저장하지 못했습니다.");
      throw error;
    } finally { running.current = false; }
  };
  const discard = () => {
    if (running.current) throw new WorkspaceError("CANCELLED", "슬라이드에 반영하고 있습니다.");
    generation.current++;
    update(baseline(latest.current.view, latest.current.slide));
    setFailure(null);
    mutation.reset();
  };
  return { draft, conflict, busy: mutation.isPending, error: (!validation.success ? validation.error.issues[0].message : null) ?? failure,
    markDirty, setPrompt, save, discard };
}
