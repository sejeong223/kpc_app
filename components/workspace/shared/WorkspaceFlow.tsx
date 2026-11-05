"use client";
import { useEffect, useRef, useState } from "react";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { WorkspaceSceneProps } from "../WorkspaceScreen";
import { proposalRequestBlocked, useWorkspaceProposals } from "@/hooks/workspace/use-workspace-proposals";
import { loadProjectView } from "@/hooks/workspace/use-workspace-production";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { MockRequest } from "@/types/workspace-production";
import TocWorkspace from "../toc/TocWorkspace";
import ProductionWorkspace from "../production/ProductionWorkspace";
import ProposalReview from "../production/ProposalReview";
import ProductionJobStatus from "../production/ProductionJobStatus";
import PptControls from "../production/PptControls";
import { WorkspaceErrorText } from "./WorkspaceUi";
export default function WorkspaceFlow({ screen, readOnlyError = null, accessDenied = false, ...scene }: WorkspaceSceneProps & {
  screen: "toc" | "write"; readOnlyError?: string | null; accessDenied?: boolean;
}) {
  const [requestError, setRequestError] = useState<string | null>(null), [starting, setStarting] = useState(false);
  const runtime = useWorkspaceRuntime(), proposals = useWorkspaceProposals(), ticket = useRef(0), live = scene.liveView;
  useEffect(() => () => { ticket.current++; }, []);
  const assertScope = (projectId: string) => {
    const selection = runtime.selection.get();
    check(!readOnlyError && !accessDenied && runtime.isActive() && selection?.projectId === projectId && !selection.snapshotId,
      "READ_ONLY", readOnlyError ?? "요청한 프로젝트의 현재 작업에서 실행해 주세요.");
  };
  const report = (failure: unknown) => setRequestError(failure instanceof Error ? failure.message : "요청을 완료하지 못했습니다.");
  const start = (input: MockRequest) => {
    if (starting || proposals.propose.isPending || proposals.apply.isPending || readOnlyError || accessDenied) return;
    const request = structuredClone(input), epoch = ++ticket.current;
    void runtime.navigate(async () => {
      if (epoch !== ticket.current) return;
      setRequestError(null); setStarting(true);
      try {
        assertScope(request.projectId);
        const fresh = await loadProjectView(runtime, request.projectId);
        if (epoch !== ticket.current) return;
        assertScope(request.projectId);
        const blocked = proposalRequestBlocked(fresh, request, runtime.selection.get()?.snapshotId ?? null);
        check(!blocked, "FORBIDDEN", blocked ?? "요청 대상을 확인해 주세요.");
        proposals.start({ ...request, expectedRevision: fresh.state.revision, expectedRound: fresh.state.currentRound });
      } finally { if (epoch === ticket.current) setStarting(false); }
    }).catch(failure => { if (epoch === ticket.current) report(failure); });
  };
  const close = () => { if (proposals.apply.isPending) return; ticket.current++; setStarting(false); setRequestError(null); proposals.close(); };
  const regenerate = () => {
    if (starting || proposals.apply.isPending || proposals.propose.isPending || readOnlyError || accessDenied) return;
    const epoch = ++ticket.current;
    void runtime.navigate(async () => {
      if (epoch !== ticket.current || !proposals.request) return;
      assertScope(proposals.request.projectId); setRequestError(null);
      await proposals.regenerate();
    }).catch(failure => { if (epoch === ticket.current) report(failure); });
  };
  const blockedReason = screen === "write" ? readOnlyError ?? (accessDenied ? "프로젝트 접근 권한을 확인해 주세요." : proposals.request ? proposalRequestBlocked(live, proposals.request, scene.selection.snapshotId) : null) : null;
  const feedback = <div data-comment-control>
    <WorkspaceErrorText error={requestError ?? proposals.error} />
    <ProductionJobStatus busy={starting || proposals.propose.isPending} progress={null} error={proposals.propose.error?.message ?? null} onCancel={screen === "toc" ? close : undefined} onRetry={screen === "toc" ? regenerate : undefined} />
    {proposals.apply.isPending && <p role="status" className="tw:text-sm">선택한 변경을 반영하고 있습니다.</p>}
  </div>;
  const busy = starting || proposals.propose.isPending || proposals.apply.isPending;
  return <>
    {screen === "toc" ? <TocWorkspace {...scene} actions={<PptControls view={scene.view} liveView={live} snapshotId={scene.selection.snapshotId} />} onPropose={start} /> :
      <ProductionWorkspace {...scene} readOnlyError={readOnlyError} accessDenied={accessDenied} onPropose={start} aiBusy={busy} aiFeedback={accessDenied ? null : feedback} />}
    {screen === "toc" && feedback}
    {proposals.propose.data && !accessDenied && <ProposalReview key={proposals.propose.data.id} view={live} proposal={proposals.propose.data} busy={busy}
      error={requestError ?? proposals.error ?? proposals.apply.error?.message ?? null} blockedReason={blockedReason} onKeep={close} onRegenerate={regenerate}
      onApply={itemIds => {
        const proposal = proposals.propose.data, request = proposals.request;
        if (!proposal || busy || blockedReason) return;
        const epoch = ++ticket.current;
        void runtime.navigate(async () => {
          if (epoch !== ticket.current) return;
          setRequestError(null); assertScope(proposal.projectId);
          const fresh = await loadProjectView(runtime, proposal.projectId);
          if (epoch !== ticket.current) return;
          assertScope(proposal.projectId);
          if (screen === "write" && request) {
            const reason = proposalRequestBlocked(fresh, request, runtime.selection.get()?.snapshotId ?? null);
            check(!reason, "FORBIDDEN", reason ?? "요청 대상을 확인해 주세요.");
          }
          check(itemIds.length > 0 && itemIds.every(id => proposal.items.some(item => item.id === id)), "VALIDATION", "비교한 항목만 선택해 주세요.");
          await proposals.apply.mutateAsync({ projectId: proposal.projectId, expectedRevision: proposal.baseRevision, expectedRound: proposal.round, proposalId: proposal.id, itemIds });
          if (epoch === ticket.current && runtime.isActive()) proposals.close();
        }).catch(failure => { if (epoch === ticket.current) report(failure); });
      }} />}
  </>;
}
