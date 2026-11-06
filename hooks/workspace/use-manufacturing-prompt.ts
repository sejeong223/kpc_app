"use client";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceCommand } from "./use-workspace-production";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { ManufacturingPromptSchema } from "@/lib/workspace/production/schemas";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import type { ManufacturingPrompt, ProjectView, ProposalSlide } from "@/types/workspace-production";

export function useManufacturingPrompt(view: ProjectView, slide: ProposalSlide) {
  const runtime = useWorkspaceRuntime(), mutation = useWorkspaceCommand();
  const baseline = () => ({ projectId: view.project.id, sectionId: slide.sectionId, round: view.state.currentRound,
    baseRevision: view.state.revision, prompt: structuredClone(view.state.body.sections.find(s => s.id === slide.sectionId)?.demoPrompt ?? { intro: "", bullets: [] }), dirty: false });
  const [local, setLocal] = useState(baseline), mounted = useRef(true), running = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const draft = local.dirty ? local : baseline();
  const conflict = draft.projectId !== view.project.id || draft.round !== view.state.currentRound || draft.sectionId !== slide.sectionId || (draft.dirty && draft.baseRevision !== view.state.revision);
  const save = async () => {
    if (running.current) throw new WorkspaceError("CANCELLED", "본문을 저장하고 있습니다.");
    if (conflict) throw new WorkspaceError("CONFLICT", "다른 변경이 저장되었습니다. 입력을 보관했으니 최신 내용을 확인해 주세요.");
    const parsed = ManufacturingPromptSchema.safeParse(draft.prompt);
    if (!parsed.success) throw new WorkspaceError("VALIDATION", "본문 길이와 목록 수를 확인해 주세요.");
    running.current = true;
    try {
      const receipt = await mutation.mutateAsync({ projectId: draft.projectId, expectedRevision: draft.baseRevision, expectedRound: draft.round,
        operation: { type: "apply-manufacturing-prompt", sectionId: draft.sectionId, slideId: slide.id, prompt: parsed.data } });
      if (mounted.current && runtime.isActive()) setLocal({ ...draft, baseRevision: receipt.state.revision, dirty: false });
    } finally { running.current = false; }
  };
  return { draft, conflict, save, busy: mutation.isPending, error: mutation.error?.message ?? null,
    markDirty: () => setLocal({ ...draft, dirty: true }),
    setPrompt: (prompt: ManufacturingPrompt) => { setLocal({ ...draft, prompt, dirty: true }); if (mutation.error && !running.current) mutation.reset(); },
    discard: () => { setLocal(baseline()); mutation.reset(); },
  };
}
