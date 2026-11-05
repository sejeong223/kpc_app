"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import { activeWorkspaceRead, loadProjectView, useWorkspaceAction } from "./use-workspace-production";
import type { MockRequest, ProjectRequest, ProjectView, WorkspaceProposal, WorkspaceReceipt } from "@/types/workspace-production";
import { WorkspaceError } from "@/lib/workspace/production/errors";

export function proposalRequestBlocked(view: ProjectView, request: MockRequest, snapshotId: string | null): string | null {
  if (snapshotId || view.state.phase !== "writing") return "보관본·완성 회차에서는 요청을 적용할 수 없습니다.";
  if (view.project.id !== request.projectId || view.state.currentRound !== request.expectedRound) return "요청한 프로젝트 또는 회차가 변경되었습니다. 대상을 다시 선택해 주세요.";
  const slides = request.slideIds.map(id => view.state.body.slides.find(s => s.id === id));
  if (slides.some(s => !s) || request.sectionIds.some(id => !view.state.body.sections.some(s => s.id === id))) return "요청 대상이 삭제되었습니다. 슬라이드를 다시 선택해 주세요.";
  const sections = [...new Set([...request.sectionIds, ...slides.map(s => s!.sectionId)])];
  if (sections.some(id => view.state.body.sections.find(s => s.id === id)?.locked)) return "요청 대상에 고정된 소목차가 있습니다. 선택을 바꾸거나 고정을 해제해 주세요.";
  if (["check", "recommend-toc", "edit-toc"].includes(request.kind)) return view.capabilities.actions.outline ? null : "점검·목차 요청 권한이 없습니다.";
  if (!sections.length) return "요청할 슬라이드 또는 빈 소목차를 선택해 주세요.";
  return sections.every(id => view.capabilities.editableSectionIds.includes(id)) ? null : "선택한 모든 슬라이드의 수정 권한이 필요합니다. 대상을 다시 선택해 주세요.";
}
export function useWorkspaceProposals() {
  const runtime = useWorkspaceRuntime(), abort = useRef<AbortController | null>(null), proposalId = useRef<string | null>(null), generationRef = useRef(0);
  const [generation, setGeneration] = useState(0), [request, setRequest] = useState<MockRequest | null>(null), [error, setError] = useState<string | null>(null), [regenerating, setRegenerating] = useState(false);
  const mutation = useMutation<{ generation: number; proposal: WorkspaceProposal }, WorkspaceError, { request: MockRequest; generation: number; control: AbortController }>({
    mutationKey: workspaceQueryKeys(runtime.queryScope).mutation, retry: false, gcTime: 0,
    mutationFn: async input => {
      let candidate: WorkspaceProposal | undefined;
      try {
        const result = await activeWorkspaceRead(runtime, async () => {
          candidate = await runtime.service.propose(input.request, input.control.signal);
          if (input.generation !== generationRef.current || !runtime.isActive() || input.control.signal.aborted) throw new WorkspaceError("CANCELLED", "취소된 제안입니다.");
          return candidate;
        }, input.control.signal);
        if (input.generation !== generationRef.current || !runtime.isActive() || input.control.signal.aborted) throw new WorkspaceError("CANCELLED", "취소된 제안입니다.");
        proposalId.current = result.id;
        return { generation: input.generation, proposal: result };
      } catch (failure) {
        if (candidate) runtime.service.discardProposal(candidate.id);
        throw failure;
      }
    },
  });
  const apply = useWorkspaceAction<WorkspaceReceipt, ProjectRequest & { proposalId: string; itemIds: string[] }>((r, input) => r.service.applyProposal(input));
  const invalidate = () => {
    const next = ++generationRef.current;
    abort.current?.abort(); abort.current = null;
    if (proposalId.current) runtime.service.discardProposal(proposalId.current);
    proposalId.current = null; setGeneration(next); mutation.reset();
    return next;
  };
  useEffect(() => () => {
    generationRef.current++; abort.current?.abort();
    if (proposalId.current) runtime.service.discardProposal(proposalId.current);
  }, [runtime]);
  const send = (input: MockRequest, next: number) => {
    const control = new AbortController(); abort.current = control;
    setRequest(structuredClone(input)); setError(null); setRegenerating(false); apply.reset();
    mutation.mutate({ request: structuredClone(input), generation: next, control });
  };
  const close = () => { invalidate(); apply.reset(); setRequest(null); setError(null); setRegenerating(false); };
  const regenerate = async () => {
    if (!request) return;
    const next = invalidate(); setRegenerating(true); setError(null);
    try {
      const selection = runtime.selection.get();
      if (selection?.projectId !== request.projectId || selection.snapshotId) throw new WorkspaceError("CONFLICT", "요청한 프로젝트의 현재 작업으로 돌아와 주세요.");
      const view = await loadProjectView(runtime, request.projectId);
      if (next !== generationRef.current || !runtime.isActive()) return;
      const current = runtime.selection.get(), blocked = proposalRequestBlocked(view, request, current?.snapshotId ?? null);
      if (current?.projectId !== request.projectId || blocked) throw new WorkspaceError("CONFLICT", blocked ?? "요청 프로젝트가 변경되었습니다.");
      send({ ...request, expectedRevision: view.state.revision, expectedRound: view.state.currentRound }, next);
    } catch (failure) {
      if (next === generationRef.current && runtime.isActive()) setError(failure instanceof Error ? failure.message : "현재 내용을 읽지 못했습니다.");
    } finally { if (next === generationRef.current && runtime.isActive()) setRegenerating(false); }
  };
  const current = mutation.variables?.generation === generation;
  return { propose: { ...mutation, data: current && mutation.data?.generation === generation ? mutation.data.proposal : undefined,
    isPending: regenerating || (current && mutation.isPending), error: current && mutation.error?.code !== "CANCELLED" ? mutation.error : null },
    apply, request, error, close, regenerate,
    start: (input: MockRequest) => send(input, invalidate()),
  };
}
