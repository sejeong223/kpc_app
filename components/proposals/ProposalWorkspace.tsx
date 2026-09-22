"use client";

import { useReducer, useState } from "react";
import { Menu } from "lucide-react";

import AnalysisRequiredState from "@/components/proposals/authoring/AnalysisRequiredState";
import ProposalAnalysisView from "@/components/proposals/authoring/ProposalAnalysisView";
import ProposalSetupView from "@/components/proposals/authoring/ProposalSetupView";
import ProposalRequirementsView from "@/components/proposals/authoring/ProposalRequirementsView";
import ProposalTaskManagementView from "@/components/proposals/authoring/ProposalTaskManagementView";
import ProposalEditorView from "@/components/proposals/editor/ProposalEditorView";
import ProposalSidebar from "@/components/proposals/ProposalSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProposalPipelineBoard from "@/components/proposals/pipeline/ProposalPipelineBoard";
import ProposalRegistrationView from "@/components/proposals/review/ProposalRegistrationView";
import ProposalReviewDetail from "@/components/proposals/review/ProposalReviewDetail";
import ProposalReviewView from "@/components/proposals/review-final/ProposalReviewView";
import ProposalLibraryView from "@/components/proposals/support/ProposalLibraryView";
import ProposalSettingsView from "@/components/proposals/support/ProposalSettingsView";
import { MOCK_ANALYSIS_ITEMS } from "@/data/proposals/mock-data";
import {
  createInitialProposalWorkspaceState,
  getSelectedProposalDocuments,
  getSelectedProposalProject,
  getSelectedProposalRequirements,
  getSelectedProposalSections,
  proposalWorkspaceReducer,
} from "@/lib/proposals/workspace";
import type { ProposalWorkspaceView } from "@/types/proposals";

interface ProposalWorkspaceProps {
  canReview: boolean;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled proposal view: ${String(value)}`);
}

export default function ProposalWorkspace({
  canReview,
}: ProposalWorkspaceProps): React.ReactElement {
  const [state, dispatch] = useReducer(
    proposalWorkspaceReducer,
    undefined,
    createInitialProposalWorkspaceState,
  );
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const selectedProject = getSelectedProposalProject(state);
  const selectedDocuments = getSelectedProposalDocuments(state);
  const selectedRequirements = getSelectedProposalRequirements(state);
  const selectedSections = getSelectedProposalSections(state);
  const renderWorkspace = () => {
    if (!selectedProject) {
      return <section className="flex min-h-full items-center justify-center p-6 text-sm text-[#77787E]">프로젝트를 선택하세요.</section>;
    }
    if (state.taskManagementOpen) {
      return <ProposalTaskManagementView project={selectedProject} sections={selectedSections} dispatch={dispatch} />;
    }
    if (state.activeStep === "setup") {
      return <ProposalSetupView project={selectedProject} documents={selectedDocuments} dispatch={dispatch} />;
    }
    if (selectedProject.analysisStatus !== "분석 완료") {
      return <AnalysisRequiredState projectName={selectedProject.title} onOpenSetup={() => dispatch({ type: "navigate", view: "workspace", step: "setup" })} />;
    }
    if (state.activeStep === "analysis") {
      return <ProposalAnalysisView project={selectedProject} analysisItems={MOCK_ANALYSIS_ITEMS} onNavigate={(step) => dispatch({ type: "navigate", view: "workspace", step })} />;
    }
    if (state.activeStep === "requirements") {
      return <ProposalRequirementsView project={selectedProject} requirements={selectedRequirements} dispatch={dispatch} onNavigate={(step) => dispatch({ type: "navigate", view: "workspace", step })} />;
    }
    if (state.activeStep === "editor") {
      return <ProposalEditorView project={selectedProject} sections={selectedSections} requirements={selectedRequirements} documents={selectedDocuments} libraryItems={state.libraryItems} selectedSectionId={state.selectedSectionId || null} dispatch={dispatch} onNavigate={(step) => dispatch({ type: "navigate", view: "workspace", step })} />;
    }
    if (state.activeStep === "review") {
      return <ProposalReviewView project={selectedProject} sections={selectedSections} requirements={selectedRequirements} dispatch={dispatch} />;
    }
    return assertNever(state.activeStep);
  };

  const renderView = (view: ProposalWorkspaceView): React.ReactElement => {
    switch (view) {
      case "pipeline":
        return <ProposalPipelineBoard state={state} dispatch={dispatch} canReview={canReview} />;
      case "register":
        return <ProposalRegistrationView dispatch={dispatch} />;
      case "project-review":
        return <ProposalReviewDetail state={state} dispatch={dispatch} canReview={canReview} />;
      case "workspace":
        return renderWorkspace();
      case "library":
        return <ProposalLibraryView items={state.libraryItems} activeProject={selectedProject} importedDocumentIds={selectedDocuments.map((document) => document.id)} dispatch={dispatch} />;
      case "settings":
        return <ProposalSettingsView canReview={canReview} />;
      default:
        return assertNever(view);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-workspace-surface">
      <ProposalSidebar state={state} dispatch={dispatch} />
      <Button size="icon" variant="outline" className="fixed left-3 top-[4.25rem] z-30 bg-white print:hidden lg:hidden" aria-label="제안 메뉴 열기" onClick={() => setMobileNavigationOpen(true)}><Menu className="size-5" /></Button>
      <Dialog open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}><DialogContent className="left-0 top-14 h-[calc(100vh-3.5rem)] max-w-72 translate-x-0 translate-y-0 rounded-none p-0"><DialogHeader className="sr-only"><DialogTitle>제안 메뉴</DialogTitle><DialogDescription>제안서 화면과 작성 단계로 이동합니다.</DialogDescription></DialogHeader><ProposalSidebar mobile state={state} dispatch={dispatch} onNavigate={() => setMobileNavigationOpen(false)} /></DialogContent></Dialog>
      <main className="min-w-0 flex-1 overflow-auto pt-12 lg:pt-0">
        {renderView(state.view)}
      </main>
    </div>
  );
}
