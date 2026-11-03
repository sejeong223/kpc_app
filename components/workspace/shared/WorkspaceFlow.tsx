"use client";
import { useState } from "react";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { WorkspaceSceneProps } from "../WorkspaceScreen";
import { DadamButton } from "@/components/ui/DadamControls";
import { useProjectRound } from "@/hooks/workspace/use-project-round";
import { useWorkspaceProposals } from "@/hooks/workspace/use-workspace-proposals";
import { loadProjectView } from "@/hooks/workspace/use-workspace-production";
import type { MockRequest } from "@/types/workspace-production";
import TocWorkspace from "../toc/TocWorkspace";
import ProductionWorkspace from "../production/ProductionWorkspace";
import ProposalReview from "../production/ProposalReview";
import ProductionJobStatus from "../production/ProductionJobStatus";
import PptControls from "../production/PptControls";
import ProjectRoundDialog from "./ProjectRoundDialog";
import ProjectHistorySelector from "./ProjectHistorySelector";
import { WorkspaceErrorText } from "./WorkspaceUi";
export default function WorkspaceFlow({
  screen,
  ...scene
}: WorkspaceSceneProps & { screen: "toc" | "write" }) {
  const [requestError, setRequestError] = useState<string | null>(null);
  const runtime = useWorkspaceRuntime(),
    round = useProjectRound(scene.view.project.id, () =>
      scene.choose({
        projectId: scene.view.project.id,
        sectionId: null,
        slideId: null,
        snapshotId: null,
      }),
    ),
    proposals = useWorkspaceProposals(),
    live = scene.liveView;
  const start = (request: MockRequest) => {
    void runtime
      .navigate(async () => {
        setRequestError(null);
        const fresh = await loadProjectView(runtime, request.projectId);
        proposals.start({
          ...request,
          expectedRevision: fresh.state.revision,
          expectedRound: fresh.state.currentRound,
        });
      })
      .catch((e) =>
        setRequestError(
          e instanceof Error ? e.message : "요청 정보를 읽지 못했습니다.",
        ),
      );
  };
  const actions = (
    <>
      <ProjectHistorySelector
        state={live.state}
        snapshotId={scene.selection.snapshotId}
        onSelect={(snapshotId) => {
          void scene
            .choose({
              ...scene.selection,
              snapshotId,
              sectionId: null,
              slideId: null,
            })
            .catch(() => {});
        }}
      />
      {!scene.selection.snapshotId && (
        <>
          {live.capabilities.actions.complete && (
            <DadamButton onClick={() => round.open("complete")}>
              완성
            </DadamButton>
          )}
          {live.capabilities.actions.rework && (
            <DadamButton onClick={() => round.open("start-round")}>
              재작업
            </DadamButton>
          )}
        </>
      )}
      <PptControls
        view={scene.view}
        liveView={live}
        snapshotId={scene.selection.snapshotId}
      />
    </>
  );
  return (
    <>
      {screen === "toc" ? (
        <TocWorkspace {...scene} actions={actions} onPropose={start} />
      ) : (
        <ProductionWorkspace {...scene} actions={actions} onPropose={start} />
      )}
      <WorkspaceErrorText
        error={
          requestError ??
          proposals.error ??
          (!round.dialog ? round.error : null)
        }
      />
      <ProductionJobStatus
        busy={proposals.propose.isPending}
        progress={null}
        error={proposals.propose.error?.message ?? null}
        onCancel={proposals.close}
        onRetry={() => {
          void proposals.regenerate();
        }}
      />
      {proposals.propose.data && (
        <ProposalReview
          key={proposals.propose.data.id}
          view={live}
          proposal={proposals.propose.data}
          busy={proposals.apply.isPending || proposals.propose.isPending}
          error={proposals.apply.error?.message ?? null}
          onKeep={proposals.close}
          onRegenerate={() => {
            void proposals.regenerate();
          }}
          onApply={(itemIds) => {
            const proposal = proposals.propose.data!;
            void proposals.apply
              .mutateAsync({
                projectId: proposal.projectId,
                expectedRevision: proposal.baseRevision,
                expectedRound: proposal.round,
                proposalId: proposal.id,
                itemIds,
              })
              .then(proposals.close)
              .catch(() => {});
          }}
        />
      )}
      {round.dialog && (
        <ProjectRoundDialog
          key={round.dialog.mode + ":" + round.dialog.view.state.revision}
          open
          mode={round.dialog.mode}
          view={round.dialog.view}
          busy={round.busy}
          error={round.error}
          onConfirm={(input) => {
            void round.confirm(input).catch(() => {});
          }}
          onClose={round.close}
        />
      )}
    </>
  );
}
