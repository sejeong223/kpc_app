"use client";

import { useReducer } from "react";

import { Toast } from "@/components/common/Toast";
import ProposalSidebar from "@/components/proposals/navigation/ProposalSidebar";
import PipelineBoard from "@/components/proposals/pipeline/PipelineBoard";
import {
  createSourceProposalWorkspaceState,
  sourceProposalWorkspaceReducer,
  type SourceProposalWorkspaceTab,
} from "@/lib/proposals/workspace";
import type {
  ProjectSubTab,
  ProposalLnbTab,
  ProposalProject,
  RfpItem,
  UserRole,
} from "@/types/proposals";

interface ProposalWorkspaceProps {
  canReview: boolean;
}

const PROJECT_TABS: readonly SourceProposalWorkspaceTab[] = [
  "rfp_upload",
  "rfp-docs",
  "setup",
  "ai_analysis",
  "ai-analysis",
  "requirements",
  "editor",
  "structure",
  "tasks",
  "task-mgmt",
  "matrix",
  "inputs",
  "resources",
  "proj-settings",
];

export default function ProposalWorkspace({
  canReview,
}: ProposalWorkspaceProps): React.ReactElement {
  const [state, dispatch] = useReducer(
    sourceProposalWorkspaceReducer,
    undefined,
    createSourceProposalWorkspaceState,
  );
  const userRole: UserRole = canReview ? "admin" : "user";
  const activeProject = PROJECT_TABS.includes(state.activeProposalLnb)
    ? state.activeProject
    : null;

  const showToast = (message: string) => {
    dispatch({ type: "show-toast", message });
  };

  const navigate = (tab: ProposalLnbTab | ProjectSubTab | string) => {
    dispatch({ type: "navigate", tab: tab as SourceProposalWorkspaceTab });
  };

  const selectProject = (project: ProposalProject) => {
    dispatch({ type: "select-project", project });
  };

  const findProject = (rfp: RfpItem): ProposalProject | undefined =>
    state.projects.find(
      (project) => project.rfpId === rfp.id || project.id === rfp.id,
    );

  const openRfpDetail = (rfp: RfpItem) => {
    const project = findProject(rfp);
    if (project) {
      selectProject(project);
      return;
    }
    dispatch({ type: "select-rfp", rfp });
    showToast(`'${rfp.title}' 프로젝트 정보를 불러오지 못했습니다.`);
  };

  const startProposal = (rfp: RfpItem) => {
    const project = findProject(rfp);
    if (project) {
      dispatch({ type: "start-proposal", project });
      return;
    }
    showToast(`'${rfp.title}' 제안서 프로젝트 정보를 불러오지 못했습니다.`);
  };

  const pipelineVisible =
    state.activeProposalLnb === "pipeline" ||
    state.activeProposalLnb === "proposals";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F8F9FA]">
      <ProposalSidebar
        currentLnb={state.activeProposalLnb}
        activeTab={state.activeProposalLnb}
        onLnbChange={navigate}
        onSelectTab={navigate}
        selectedDepartment={state.selectedDepartment}
        onSelectDepartment={(department) =>
          dispatch({ type: "select-department", department })
        }
        activeProject={activeProject}
        projects={state.projects}
        onSelectProject={selectProject}
        onExitProject={() => {
          dispatch({ type: "navigate", tab: "pipeline" });
          showToast("제안 목록으로 이동했습니다.");
        }}
        currentProjectTab={state.activeProposalLnb}
        onProjectTabChange={navigate}
        userRole={userRole}
        onShowToast={showToast}
      />

      <div className="flex min-w-0 flex-1 overflow-hidden">
        {pipelineVisible ? (
          <PipelineBoard
            userRole={userRole}
            rfpList={state.rfpList}
            projects={state.projects}
            selectedDepartment={state.selectedDepartment}
            onSelectDepartment={(department) =>
              dispatch({ type: "select-department", department })
            }
            onOpenProjectRegister={() => {
              dispatch({ type: "navigate", tab: "project_register" });
              showToast("새 프로젝트 등록 화면으로 이동했습니다.");
            }}
            onUpdateStage={(rfpId, stage) =>
              dispatch({ type: "update-project-stage", projectId: rfpId, stage })
            }
            onOpenRfpDetail={openRfpDetail}
            onSelectProject={selectProject}
            onStartProposalProcess={startProposal}
            onShowToast={showToast}
          />
        ) : (
          <section className="flex flex-1 items-center justify-center bg-[#F8F9FA] p-8 text-center">
            <p className="text-xs font-semibold text-neutral-500">
              선택한 화면을 준비하고 있습니다.
            </p>
          </section>
        )}
      </div>

      {state.toastMessage && (
        <Toast
          message={state.toastMessage}
          onClose={() => dispatch({ type: "close-toast" })}
        />
      )}
    </div>
  );
}
