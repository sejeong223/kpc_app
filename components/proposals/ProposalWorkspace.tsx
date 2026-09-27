"use client";

import { useReducer } from "react";

import { Toast } from "@/components/common/Toast";
import AiAnalysisView from "@/components/proposals/authoring/AiAnalysisView";
import ProposalSetupView from "@/components/proposals/authoring/ProposalSetupView";
import RequirementsView from "@/components/proposals/authoring/RequirementsView";
import RfpAnalysisRequiredState from "@/components/proposals/authoring/RfpAnalysisRequiredState";
import ProposalSidebar from "@/components/proposals/navigation/ProposalSidebar";
import PipelineBoard from "@/components/proposals/pipeline/PipelineBoard";
import ProjectRegistrationView from "@/components/proposals/review/ProjectRegistrationView";
import ProjectReviewDetail from "@/components/proposals/review/ProjectReviewDetail";
import {
  createSourceProposalWorkspaceState,
  getFilesForSourceProject,
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
  const projectFiles = getFilesForSourceProject(state, state.activeProject);

  const renderContent = (): React.ReactElement => {
    if (pipelineVisible) {
      return (
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
      );
    }

    if (state.activeProposalLnb === "project_register") {
      const closeRegistration = () => {
        dispatch({ type: "navigate", tab: "pipeline" });
        showToast("프로젝트 등록을 취소하고 제안 목록으로 복귀했습니다.");
      };
      return (
        <ProjectRegistrationView
          onBack={closeRegistration}
          onCancel={closeRegistration}
          onRegisterComplete={(project) =>
            dispatch({ type: "register-project", project, startReview: false })
          }
          onShowToast={showToast}
        />
      );
    }

    if (
      state.activeProposalLnb === "project_review" &&
      state.selectedReviewProject
    ) {
      return (
        <ProjectReviewDetail
          userRole={userRole}
          project={state.selectedReviewProject}
          onBack={() => {
            dispatch({ type: "navigate", tab: "pipeline" });
            showToast("제안 목록 보드로 복귀했습니다.");
          }}
          onUpdateProjectStage={(projectId, stage, extraData) =>
            dispatch({
              type: "update-project-stage",
              projectId,
              stage,
              extraData,
            })
          }
          onUpdateProject={(project) =>
            dispatch({ type: "update-project", project })
          }
          onStartProposalWriting={(project) =>
            dispatch({ type: "start-proposal", project })
          }
          onShowToast={showToast}
        />
      );
    }

    if (
      state.activeProposalLnb === "rfp_upload" ||
      state.activeProposalLnb === "setup" ||
      state.activeProposalLnb === "rfp-docs"
    ) {
      return (
        <ProposalSetupView
          project={state.activeProject}
          onStartAnalysis={() => {
            dispatch({ type: "complete-analysis", projectId: state.activeProject.id });
            showToast("RFP 심층 분석(2단계)이 활성화되어 이동했습니다.");
          }}
          onShowToast={showToast}
        />
      );
    }

    if (
      state.activeProposalLnb === "ai_analysis" ||
      state.activeProposalLnb === "ai-analysis"
    ) {
      if (state.activeProject.analysisStatus !== "분석 완료" || projectFiles.length === 0) {
        return (
          <RfpAnalysisRequiredState
            stepNumber="02"
            stepTitle="RFP 분석"
            projectName={state.activeProject.title}
            onNavigateToStep1={() => dispatch({ type: "navigate", tab: "rfp_upload" })}
          />
        );
      }
      return (
        <AiAnalysisView
          activeProject={state.activeProject}
          uploadedFiles={projectFiles}
          onNavigateToProjects={() => dispatch({ type: "navigate", tab: "pipeline" })}
          onNavigateToProjectRoot={() => dispatch({ type: "navigate", tab: "rfp_upload" })}
          onNavigateNext={() => {
            dispatch({ type: "navigate", tab: "requirements" });
            showToast("요구사항 관리 화면으로 이동했습니다.");
          }}
          onShowToast={showToast}
        />
      );
    }

    if (state.activeProposalLnb === "requirements") {
      if (state.activeProject.analysisStatus !== "분석 완료" || projectFiles.length === 0) {
        return (
          <RfpAnalysisRequiredState
            stepNumber="03"
            stepTitle="체크리스트"
            projectName={state.activeProject.title}
            onNavigateToStep1={() => dispatch({ type: "navigate", tab: "rfp_upload" })}
          />
        );
      }
      return (
        <RequirementsView
          activeProject={state.activeProject}
          requirementsList={state.checklistRequirements}
          onUpdateRequirements={(requirements) =>
            dispatch({ type: "set-checklist", requirements })
          }
          onNavigateToProjects={() => dispatch({ type: "navigate", tab: "pipeline" })}
          onNavigateToProjectRoot={() => dispatch({ type: "navigate", tab: "rfp_upload" })}
          onNavigateNext={() => {
            dispatch({ type: "navigate", tab: "editor" });
            showToast("04 제안서 작성 화면으로 이동했습니다.");
          }}
          onShowToast={showToast}
        />
      );
    }

    return (
      <section className="flex flex-1 items-center justify-center bg-[#F8F9FA] p-8 text-center">
        <p className="text-xs font-semibold text-neutral-500">
          선택한 화면을 준비하고 있습니다.
        </p>
      </section>
    );
  };

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
        {renderContent()}
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
