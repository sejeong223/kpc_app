"use client";

import { useCallback, useReducer } from "react";

import {
  createSourceProposalWorkspaceState,
  getFilesForSourceProject,
  sourceProposalWorkspaceReducer,
  type ProposalConversionInput,
  type SourceProposalWorkspaceState,
  type SourceProposalWorkspaceTab,
} from "@/lib/proposals/workspace";
import type {
  ChecklistRequirement,
  Department,
  ProposalProject,
  ProposalSectionItem,
  ProposalStage,
  RfpOpportunity,
  UploadedProposalFile,
} from "@/types/proposals";

export interface ProposalWorkspaceController extends SourceProposalWorkspaceState {
  setActiveProposalLnb(tab: SourceProposalWorkspaceTab): void;
  selectDepartment(department: Department): void;
  selectProject(project: ProposalProject): void;
  selectRfp(rfp: RfpOpportunity): void;
  exitProject(): void;
  registerProject(project: ProposalProject): void;
  startProjectReview(project: ProposalProject): void;
  updateProjectStage(
    projectId: string,
    stage: ProposalStage,
    extraData?: Partial<ProposalProject>,
  ): void;
  updateProject(project: ProposalProject): void;
  startProposalWriting(project?: ProposalProject | null): void;
  getFilesForProject(project?: ProposalProject | null): UploadedProposalFile[];
  updateProjectFiles(projectId: string, files: UploadedProposalFile[]): void;
  startAnalysis(projectId?: string): void;
  completeAnalysis(projectId?: string): void;
  setChecklistRequirements(requirements: ChecklistRequirement[]): void;
  updateChecklistRequirement(requirement: ChecklistRequirement): void;
  setProposalSections(sections: ProposalSectionItem[]): void;
  updateProposalSection(section: ProposalSectionItem): void;
  openEditorSection(sectionId: string): void;
  openConvertModal(rfp: RfpOpportunity): void;
  closeConvertModal(): void;
  confirmConvert(input: ProposalConversionInput): void;
  showToast(message: string): void;
  closeToast(): void;
}

export function useProposalWorkspace(): ProposalWorkspaceController {
  const [state, dispatch] = useReducer(
    sourceProposalWorkspaceReducer,
    undefined,
    createSourceProposalWorkspaceState,
  );

  const setActiveProposalLnb = useCallback((tab: SourceProposalWorkspaceTab) => {
    dispatch({ type: "navigate", tab });
  }, []);
  const selectDepartment = useCallback((department: Department) => {
    dispatch({ type: "select-department", department });
  }, []);
  const selectProject = useCallback((project: ProposalProject) => {
    dispatch({ type: "select-project", project });
  }, []);
  const selectRfp = useCallback((rfp: RfpOpportunity) => {
    dispatch({ type: "select-rfp", rfp });
  }, []);
  const exitProject = useCallback(() => {
    dispatch({ type: "navigate", tab: "pipeline" });
    dispatch({ type: "show-toast", message: "제안 목록으로 이동했습니다." });
  }, []);
  const registerProject = useCallback((project: ProposalProject) => {
    dispatch({ type: "register-project", project, startReview: false });
  }, []);
  const startProjectReview = useCallback((project: ProposalProject) => {
    dispatch({ type: "register-project", project, startReview: true });
  }, []);
  const updateProjectStage = useCallback(
    (projectId: string, stage: ProposalStage, extraData?: Partial<ProposalProject>) => {
      dispatch({ type: "update-project-stage", projectId, stage, extraData });
    },
    [],
  );
  const updateProject = useCallback((project: ProposalProject) => {
    dispatch({ type: "update-project", project });
  }, []);
  const startProposalWriting = useCallback(
    (project?: ProposalProject | null) => {
      dispatch({ type: "start-proposal", project: project ?? state.selectedReviewProject ?? state.activeProject });
    },
    [state.activeProject, state.selectedReviewProject],
  );
  const getFilesForProject = useCallback(
    (project?: ProposalProject | null) => getFilesForSourceProject(state, project),
    [state],
  );
  const updateProjectFiles = useCallback((projectId: string, files: UploadedProposalFile[]) => {
    dispatch({ type: "set-project-files", projectId, files });
  }, []);
  const startAnalysis = useCallback(
    (projectId?: string) => {
      dispatch({ type: "start-analysis", projectId: projectId ?? state.activeProject.id });
    },
    [state.activeProject.id],
  );
  const completeAnalysis = useCallback(
    (projectId?: string) => {
      dispatch({ type: "complete-analysis", projectId: projectId ?? state.activeProject.id });
    },
    [state.activeProject.id],
  );
  const setChecklistRequirements = useCallback((requirements: ChecklistRequirement[]) => {
    dispatch({ type: "set-checklist", requirements });
  }, []);
  const updateChecklistRequirement = useCallback((requirement: ChecklistRequirement) => {
    dispatch({ type: "update-checklist", requirement });
  }, []);
  const setProposalSections = useCallback((sections: ProposalSectionItem[]) => {
    dispatch({ type: "set-sections", sections });
  }, []);
  const updateProposalSection = useCallback((section: ProposalSectionItem) => {
    dispatch({ type: "update-section", section });
  }, []);
  const openEditorSection = useCallback((sectionId: string) => {
    dispatch({ type: "open-editor-section", sectionId });
  }, []);
  const openConvertModal = useCallback((rfp: RfpOpportunity) => {
    dispatch({ type: "open-convert", rfp });
  }, []);
  const closeConvertModal = useCallback(() => {
    dispatch({ type: "close-convert" });
  }, []);
  const confirmConvert = useCallback((input: ProposalConversionInput) => {
    dispatch({ type: "confirm-convert", input });
  }, []);
  const showToast = useCallback((message: string) => {
    dispatch({ type: "show-toast", message });
  }, []);
  const closeToast = useCallback(() => {
    dispatch({ type: "close-toast" });
  }, []);

  return {
    ...state,
    setActiveProposalLnb,
    selectDepartment,
    selectProject,
    selectRfp,
    exitProject,
    registerProject,
    startProjectReview,
    updateProjectStage,
    updateProject,
    startProposalWriting,
    getFilesForProject,
    updateProjectFiles,
    startAnalysis,
    completeAnalysis,
    setChecklistRequirements,
    updateChecklistRequirement,
    setProposalSections,
    updateProposalSection,
    openEditorSection,
    openConvertModal,
    closeConvertModal,
    confirmConvert,
    showToast,
    closeToast,
  };
}
