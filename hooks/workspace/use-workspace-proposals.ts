"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useWorkspaceRuntime } from "@/components/workspace/WorkspaceProjectProvider";
import { workspaceQueryKeys } from "@/lib/workspace/production/query-keys";
import {
  activeWorkspaceRead,
  loadProjectView,
  useWorkspaceAction,
} from "./use-workspace-production";
import type {
  MockRequest,
  ProjectRequest,
  WorkspaceProposal,
  WorkspaceReceipt,
} from "@/types/workspace-production";
import type { WorkspaceError } from "@/lib/workspace/production/errors";
export function useWorkspaceProposals() {
  const runtime = useWorkspaceRuntime(),
    abort = useRef<AbortController | null>(null),
    proposalId = useRef<string | null>(null),
    [request, setRequest] = useState<MockRequest | null>(null),
    [error, setError] = useState<string | null>(null);
  const propose = useMutation<WorkspaceProposal, WorkspaceError, MockRequest>({
    mutationKey: workspaceQueryKeys(runtime.queryScope).mutation,
    retry: false,
    gcTime: 0,
    mutationFn: async (input) => {
      abort.current?.abort();
      if (proposalId.current)
        runtime.service.discardProposal(proposalId.current);
      const control = new AbortController();
      abort.current = control;
      const value = await activeWorkspaceRead(
        runtime,
        () => runtime.service.propose(input, control.signal),
        control.signal,
      );
      proposalId.current = value.id;
      return value;
    },
  });
  const apply = useWorkspaceAction<
    WorkspaceReceipt,
    ProjectRequest & { proposalId: string; itemIds: string[] }
  >((r, i) => r.service.applyProposal(i));
  useEffect(
    () => () => {
      abort.current?.abort();
      if (proposalId.current)
        runtime.service.discardProposal(proposalId.current);
    },
    [runtime],
  );
  const close = () => {
    abort.current?.abort();
    if (proposalId.current) runtime.service.discardProposal(proposalId.current);
    proposalId.current = null;
    propose.reset();
    apply.reset();
    setError(null);
  };
  return {
    propose,
    apply,
    request,
    error,
    close,
    start: (input: MockRequest) => {
      setError(null);
      setRequest(input);
      apply.reset();
      propose.mutate(input);
    },
    regenerate: async () => {
      if (!request) return;
      setError(null);
      try {
        const view = await loadProjectView(runtime, request.projectId);
        const next = {
          ...request,
          expectedRevision: view.state.revision,
          expectedRound: view.state.currentRound,
        };
        setRequest(next);
        apply.reset();
        propose.mutate(next);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "현재 내용을 읽지 못했습니다.",
        );
      }
    },
  };
}
