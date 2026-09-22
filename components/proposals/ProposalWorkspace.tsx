"use client";

import { useReducer } from "react";

import ProposalPlaceholder from "@/components/proposals/ProposalPlaceholder";
import ProposalSidebar from "@/components/proposals/ProposalSidebar";
import ProposalPipelineBoard from "@/components/proposals/pipeline/ProposalPipelineBoard";
import ProposalRegistrationView from "@/components/proposals/review/ProposalRegistrationView";
import ProposalReviewDetail from "@/components/proposals/review/ProposalReviewDetail";
import {
  createInitialProposalWorkspaceState,
  getSelectedProposalProject,
  proposalWorkspaceReducer,
} from "@/lib/proposals/workspace";
import type { ProposalWorkflowStep, ProposalWorkspaceView } from "@/types/proposals";

interface ProposalWorkspaceProps {
  canReview: boolean;
}

const viewTitles: Record<Exclude<ProposalWorkspaceView, "workspace">, string> = {
  pipeline: "제안 목록",
  register: "제안서 생성",
  "project-review": "제안 검토",
  library: "자료 라이브러리",
  settings: "제안 설정",
};

const stepTitles: Record<ProposalWorkflowStep, string> = {
  setup: "문서 설정",
  analysis: "AI 분석",
  requirements: "요구사항",
  editor: "제안서 작성",
  review: "검토 및 완성",
};

export default function ProposalWorkspace({
  canReview,
}: ProposalWorkspaceProps): React.ReactElement {
  const [state, dispatch] = useReducer(
    proposalWorkspaceReducer,
    undefined,
    createInitialProposalWorkspaceState,
  );
  const selectedProject = getSelectedProposalProject(state);
  const title =
    state.view === "workspace"
      ? stepTitles[state.activeStep]
      : viewTitles[state.view];
  const description =
    state.view === "workspace" && selectedProject
      ? `${selectedProject.title} · 다음 Task에서 구현 예정입니다.`
      : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-workspace-surface">
      <ProposalSidebar state={state} dispatch={dispatch} />
      <main className="min-w-0 flex-1 overflow-auto">
        {state.view === "pipeline" ? (
          <ProposalPipelineBoard state={state} dispatch={dispatch} canReview={canReview} />
        ) : state.view === "register" ? (
          <ProposalRegistrationView dispatch={dispatch} />
        ) : state.view === "project-review" ? (
          <ProposalReviewDetail state={state} dispatch={dispatch} canReview={canReview} />
        ) : (
          <ProposalPlaceholder title={title} description={description} />
        )}
      </main>
    </div>
  );
}
