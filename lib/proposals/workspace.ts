import {
  MOCK_LIBRARY_ITEMS,
  MOCK_PROPOSAL_DOCUMENTS,
  MOCK_PROPOSAL_PROJECTS,
  MOCK_PROPOSAL_SECTIONS,
  MOCK_REQUIREMENTS,
} from "@/data/proposals/mock-data";
import type {
  AnalysisStatus,
  ProposalDepartment,
  ProposalDocument,
  ProposalLibraryItem,
  ProposalProject,
  ProposalRequirement,
  ProposalSection,
  ProposalStage,
  ProposalWorkflowStep,
  ProposalWorkspaceState,
  ProposalWorkspaceView,
} from "@/types/proposals";

export type ProposalWorkspaceAction =
  | { type: "navigate"; view: ProposalWorkspaceView; step?: ProposalWorkflowStep }
  | { type: "select-project"; projectId: string }
  | { type: "set-department"; department: ProposalDepartment }
  | { type: "set-search-query"; query: string }
  | { type: "add-project"; project: ProposalProject; documents: ProposalDocument[] }
  | { type: "update-stage"; projectId: string; stage: ProposalStage; rejectionReason?: string }
  | { type: "add-document"; document: ProposalDocument }
  | { type: "remove-document"; documentId: string }
  | { type: "set-workflow-mode"; projectId: string; mode: ProposalProject["workflowMode"] }
  | { type: "set-analysis-status"; projectId: string; status: AnalysisStatus }
  | { type: "toggle-requirement"; requirementId: string }
  | { type: "add-requirement"; requirement: ProposalRequirement }
  | {
      type: "update-requirement";
      requirementId: string;
      changes: Partial<ProposalRequirement>;
    }
  | { type: "delete-requirement"; requirementId: string }
  | { type: "select-section"; sectionId: string }
  | { type: "update-section"; sectionId: string; changes: Partial<ProposalSection> }
  | { type: "import-library-item"; item: ProposalLibraryItem };

const cloneProject = (project: ProposalProject): ProposalProject => ({
  ...project,
  teamMembers: [...project.teamMembers],
});

const cloneSection = (section: ProposalSection): ProposalSection => ({
  ...section,
  requirementIds: [...section.requirementIds],
});

const cloneLibraryItem = (item: ProposalLibraryItem): ProposalLibraryItem => ({
  ...item,
  tags: [...item.tags],
});

export function createInitialProposalWorkspaceState(): ProposalWorkspaceState {
  return {
    view: "pipeline",
    activeStep: "requirements",
    selectedProjectId: "project-enterprise-ai",
    selectedSectionId: "section-strategy",
    selectedDepartment: "전체",
    searchQuery: "",
    projects: MOCK_PROPOSAL_PROJECTS.map(cloneProject),
    documents: MOCK_PROPOSAL_DOCUMENTS.map((document) => ({ ...document })),
    requirements: MOCK_REQUIREMENTS.map((requirement) => ({ ...requirement })),
    sections: MOCK_PROPOSAL_SECTIONS.map(cloneSection),
    libraryItems: MOCK_LIBRARY_ITEMS.map(cloneLibraryItem),
  };
}

export function getSelectedProposalProject(
  state: ProposalWorkspaceState,
): ProposalProject | null {
  return state.projects.find((project) => project.id === state.selectedProjectId) ?? null;
}

export function canOpenProposalStep(
  project: ProposalProject,
  step: ProposalWorkflowStep,
): boolean {
  if (project.stage !== "진행") {
    return false;
  }

  if (step === "setup" || step === "analysis") {
    return true;
  }

  return project.analysisStatus === "분석 완료";
}

export function filterProposalProjects(state: ProposalWorkspaceState): ProposalProject[] {
  const normalizedQuery = state.searchQuery.trim().toLocaleLowerCase("ko-KR");

  return state.projects.filter((project) => {
    const belongsToDepartment =
      state.selectedDepartment === "전체" || project.department === state.selectedDepartment;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [project.title, project.agency, project.manager, project.summary].some((value) =>
        value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
      );

    return belongsToDepartment && matchesQuery;
  });
}

export function groupProjectsByStage(
  projects: readonly ProposalProject[],
): Record<ProposalStage, ProposalProject[]> {
  const groups: Record<ProposalStage, ProposalProject[]> = {
    "검토 대기": [],
    "검토 중": [],
    진행: [],
    "진행 안 함": [],
  };

  for (const project of projects) {
    groups[project.stage].push(project);
  }

  return groups;
}

export function proposalWorkspaceReducer(
  state: ProposalWorkspaceState,
  action: ProposalWorkspaceAction,
): ProposalWorkspaceState {
  switch (action.type) {
    case "navigate": {
      if (action.view !== "workspace") {
        return {
          ...state,
          view: action.view,
          activeStep: action.step ?? state.activeStep,
        };
      }

      const selectedProject = getSelectedProposalProject(state);
      const requestedStep = action.step ?? state.activeStep;
      if (!selectedProject || !canOpenProposalStep(selectedProject, requestedStep)) {
        return state;
      }

      return { ...state, view: action.view, activeStep: requestedStep };
    }

    case "select-project": {
      const project = state.projects.find((item) => item.id === action.projectId);
      if (!project) {
        return state;
      }

      const firstSection = state.sections.find((section) => section.projectId === project.id);
      return {
        ...state,
        selectedProjectId: project.id,
        selectedSectionId: firstSection?.id ?? "",
        activeStep: project.activeStep,
      };
    }

    case "set-department":
      return { ...state, selectedDepartment: action.department };

    case "set-search-query":
      return { ...state, searchQuery: action.query };

    case "add-project":
      return {
        ...state,
        projects: [...state.projects, cloneProject(action.project)],
        documents: [
          ...state.documents,
          ...action.documents.map((document) => ({ ...document })),
        ],
        selectedProjectId: action.project.id,
        selectedSectionId: "",
        activeStep: action.project.activeStep,
      };

    case "update-stage":
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.projectId
            ? {
                ...project,
                stage: action.stage,
                rejectionReason:
                  action.stage === "진행 안 함" ? action.rejectionReason : undefined,
              }
            : project,
        ),
      };

    case "add-document":
      return { ...state, documents: [...state.documents, { ...action.document }] };

    case "remove-document":
      return {
        ...state,
        documents: state.documents.filter((document) => document.id !== action.documentId),
      };

    case "set-workflow-mode":
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.projectId
            ? { ...project, workflowMode: action.mode }
            : project,
        ),
      };

    case "set-analysis-status":
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.projectId
            ? { ...project, analysisStatus: action.status }
            : project,
        ),
      };

    case "toggle-requirement":
      return {
        ...state,
        requirements: state.requirements.map((requirement) =>
          requirement.id === action.requirementId
            ? { ...requirement, checked: !requirement.checked }
            : requirement,
        ),
      };

    case "add-requirement":
      return {
        ...state,
        requirements: [...state.requirements, { ...action.requirement }],
      };

    case "update-requirement":
      return {
        ...state,
        requirements: state.requirements.map((requirement) =>
          requirement.id === action.requirementId
            ? { ...requirement, ...action.changes }
            : requirement,
        ),
      };

    case "delete-requirement":
      return {
        ...state,
        requirements: state.requirements.filter(
          (requirement) => requirement.id !== action.requirementId,
        ),
        sections: state.sections.map((section) => ({
          ...section,
          requirementIds: section.requirementIds.filter(
            (requirementId) => requirementId !== action.requirementId,
          ),
        })),
      };

    case "select-section": {
      const section = state.sections.find(
        (item) =>
          item.id === action.sectionId && item.projectId === state.selectedProjectId,
      );
      return section ? { ...state, selectedSectionId: section.id } : state;
    }

    case "update-section":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? {
                ...section,
                ...action.changes,
                requirementIds: action.changes.requirementIds
                  ? [...action.changes.requirementIds]
                  : section.requirementIds,
              }
            : section,
        ),
      };

    case "import-library-item":
      return {
        ...state,
        libraryItems: [...state.libraryItems, cloneLibraryItem(action.item)],
      };
  }
}
