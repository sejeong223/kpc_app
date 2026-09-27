import {
  INITIAL_KPC_CHECKLIST,
  INITIAL_PROJECT_FILES,
  INITIAL_PROPOSAL_SECTIONS,
  SAMPLE_REFERENCE_MATERIALS,
} from "@/data/proposals/authoring";
import { SAMPLE_PROJECTS, SAMPLE_RFPS } from "@/data/proposals/projects";
import type {
  AnalysisStatus,
  ChecklistRequirement,
  Department,
  ProposalLnbTab,
  ProposalProject,
  ProposalSectionItem,
  ProposalStage,
  ProjectSubTab,
  RfpOpportunity,
  UploadedProposalFile,
} from "@/types/proposals";

const cloneProject = (project: ProposalProject): ProposalProject => ({
  ...project,
  teamMembers: [...project.teamMembers],
  documents: project.documents?.map((document) => ({ ...document })),
  pwinBreakdown: project.pwinBreakdown?.map((item) => ({ ...item })),
  relatedDocs: project.relatedDocs?.map((document) => ({ ...document })),
  keyRequirements: project.keyRequirements ? [...project.keyRequirements] : undefined,
  keyRisks: project.keyRisks ? [...project.keyRisks] : undefined,
});

export type SourceProposalWorkspaceTab =
  | ProposalLnbTab
  | ProjectSubTab
  | "setup"
  | "ai-analysis"
  | "my_tasks";

export interface SourceProposalWorkspaceState {
  activeProposalLnb: SourceProposalWorkspaceTab;
  selectedDepartment: Department;
  projects: ProposalProject[];
  rfpList: RfpOpportunity[];
  activeProject: ProposalProject;
  selectedRfp: RfpOpportunity;
  selectedReviewProject: ProposalProject | null;
  projectFilesMap: Record<string, UploadedProposalFile[]>;
  checklistRequirements: ChecklistRequirement[];
  proposalSections: ProposalSectionItem[];
  selectedEditorSectionId: string | null;
  convertModalOpen: boolean;
  rfpToConvert: RfpOpportunity;
  toastMessage: string | null;
}

export interface ProposalConversionInput {
  id?: string;
  title: string;
  targetPrice: number;
  teamLead: string;
  members: string[];
  deadline: string;
  agency: string;
}

export type SourceProposalWorkspaceAction =
  | { type: "navigate"; tab: SourceProposalWorkspaceTab }
  | { type: "select-department"; department: Department }
  | { type: "select-project"; project: ProposalProject }
  | { type: "select-rfp"; rfp: RfpOpportunity }
  | { type: "register-project"; project: ProposalProject; startReview: boolean }
  | {
      type: "update-project-stage";
      projectId: string;
      stage: ProposalStage;
      extraData?: Partial<ProposalProject>;
    }
  | { type: "update-project"; project: ProposalProject }
  | { type: "start-proposal"; project: ProposalProject }
  | { type: "start-analysis"; projectId: string }
  | { type: "complete-analysis"; projectId: string }
  | { type: "set-project-files"; projectId: string; files: UploadedProposalFile[] }
  | { type: "set-checklist"; requirements: ChecklistRequirement[] }
  | { type: "update-checklist"; requirement: ChecklistRequirement }
  | { type: "set-sections"; sections: ProposalSectionItem[] }
  | { type: "update-section"; section: ProposalSectionItem }
  | { type: "open-editor-section"; sectionId: string }
  | { type: "open-convert"; rfp: RfpOpportunity }
  | { type: "close-convert" }
  | { type: "confirm-convert"; input: ProposalConversionInput }
  | { type: "show-toast"; message: string }
  | { type: "close-toast" };

const cloneUploadedFile = (file: UploadedProposalFile): UploadedProposalFile => ({ ...file });

const cloneChecklistRequirement = (
  requirement: ChecklistRequirement,
): ChecklistRequirement => ({ ...requirement });

const cloneProposalSectionItem = (section: ProposalSectionItem): ProposalSectionItem => ({
  ...section,
  children: section.children?.map(cloneProposalSectionItem),
});

export function createSourceProposalWorkspaceState(): SourceProposalWorkspaceState {
  return {
    activeProposalLnb: "pipeline",
    selectedDepartment: "전체",
    projects: SAMPLE_PROJECTS.map(cloneProject),
    rfpList: SAMPLE_RFPS.map((rfp) => ({
      ...rfp,
      participants: [...rfp.participants],
      tasks: [...rfp.tasks],
      relatedDocs: rfp.relatedDocs?.map((document) => ({ ...document })),
    })),
    activeProject: cloneProject(SAMPLE_PROJECTS[2]),
    selectedRfp: { ...SAMPLE_RFPS[0] },
    selectedReviewProject: cloneProject(SAMPLE_PROJECTS[0]),
    projectFilesMap: {
      "proj-1": INITIAL_PROJECT_FILES.map(cloneUploadedFile),
    },
    checklistRequirements: INITIAL_KPC_CHECKLIST.map(cloneChecklistRequirement),
    proposalSections: INITIAL_PROPOSAL_SECTIONS.map(cloneProposalSectionItem),
    selectedEditorSectionId: null,
    convertModalOpen: false,
    rfpToConvert: { ...SAMPLE_RFPS[0] },
    toastMessage: null,
  };
}

export function getFilesForSourceProject(
  state: Pick<SourceProposalWorkspaceState, "projectFilesMap">,
  project?: ProposalProject | null,
): UploadedProposalFile[] {
  if (!project) return [];

  const savedFiles = state.projectFilesMap[project.id];
  if (savedFiles) return savedFiles.map(cloneUploadedFile);

  const defaultRfpFile: UploadedProposalFile = {
    id: `rfp-${project.id}`,
    fileName: `${(project.title || "제안사업").replace(/\s+/g, "_")}_RFP.pdf`,
    category: "RFP 문서",
    size: "7.4 MB",
    pages: 64,
    uploader: project.manager || "정소담",
    uploadDate: "26.09.14",
    status: "분석 준비 완료",
    type: "PDF",
  };
  return [defaultRfpFile, ...SAMPLE_REFERENCE_MATERIALS.map(cloneUploadedFile)];
}

export function createRfpFromProject(project: ProposalProject): RfpOpportunity {
  return {
    id: project.rfpId || `rfp-${project.id}`,
    title: project.title,
    agency: project.agency,
    budget: project.budget,
    budgetFormatted: `₩${project.budget.toLocaleString("en-US")}`,
    deadline: project.deadline,
    announcementDate: project.announcementDate || "2026.09.18",
    contractType: "AI 시스템 구축",
    country: "대한민국",
    currency: "KRW",
    language: "한국어",
    status: "모집 중",
    department: project.department || "AI산업본부",
    stage: "검토 대기",
    pwin: project.pWin || 74,
    assignee: project.manager || "정소담",
    participants: [...(project.teamMembers || ["정소담"])],
    purpose: project.purpose || "",
    tasks: [],
    requirementsSummary: "",
    evalSummary: "",
    source: "직접 등록",
    lastModified: "2026.09.18",
    primaryRfpFileName: project.primaryRfpFileName,
  };
}

function replaceProject(
  projects: ProposalProject[],
  updatedProject: ProposalProject,
): ProposalProject[] {
  return projects.map((project) =>
    project.id === updatedProject.id ? cloneProject(updatedProject) : project,
  );
}

export function sourceProposalWorkspaceReducer(
  state: SourceProposalWorkspaceState,
  action: SourceProposalWorkspaceAction,
): SourceProposalWorkspaceState {
  switch (action.type) {
    case "navigate":
      return { ...state, activeProposalLnb: action.tab };
    case "select-department":
      return {
        ...state,
        selectedDepartment: action.department,
        activeProposalLnb: "pipeline",
        toastMessage: `[${action.department}] 부서로 필터링되었습니다.`,
      };
    case "select-project":
      return action.project.stage === "진행"
        ? {
            ...state,
            activeProject: cloneProject(action.project),
            activeProposalLnb: "rfp_upload",
            toastMessage: `'${action.project.title}' 제안서 작성 설정(1단계)으로 이동했습니다.`,
          }
        : {
            ...state,
            selectedReviewProject: cloneProject(action.project),
            activeProposalLnb: "project_review",
            toastMessage: `'${action.project.title}' 검토 화면으로 이동했습니다.`,
          };
    case "select-rfp":
      return { ...state, selectedRfp: { ...action.rfp } };
    case "register-project": {
      const project = cloneProject(action.project);
      return {
        ...state,
        projects: [project, ...state.projects],
        rfpList: [createRfpFromProject(project), ...state.rfpList],
        selectedReviewProject: action.startReview ? project : state.selectedReviewProject,
        activeProposalLnb: action.startReview ? "project_review" : "pipeline",
        toastMessage: action.startReview
          ? `'${project.title}' 2열 검토 화면으로 바로 이동했습니다.`
          : `'${project.title}' 프로젝트가 [검토 대기] 상태로 등록되었습니다.`,
      };
    }
    case "update-project-stage": {
      let selectedReviewProject = state.selectedReviewProject;
      const projects = state.projects.map((project) => {
        if (project.id !== action.projectId && project.rfpId !== action.projectId) {
          return project;
        }
        const updated = {
          ...project,
          stage: action.stage,
          status: action.stage,
          ...action.extraData,
        };
        selectedReviewProject = updated;
        return updated;
      });
      const selectedRfpId = state.selectedReviewProject?.rfpId;
      const rfpList = state.rfpList.map((rfp) =>
        rfp.id === action.projectId || rfp.id === selectedRfpId
          ? {
              ...rfp,
              stage: action.stage,
              rejectionReason: action.extraData?.rejectionReason,
            }
          : rfp,
      );
      return { ...state, projects, rfpList, selectedReviewProject };
    }
    case "update-project": {
      const project = cloneProject(action.project);
      return {
        ...state,
        projects: replaceProject(state.projects, project),
        activeProject:
          state.activeProject.id === project.id ? project : state.activeProject,
        selectedReviewProject: project,
        rfpList: state.rfpList.map((rfp) =>
          rfp.id === project.rfpId || rfp.id === project.id
            ? {
                ...rfp,
                stage: project.stage,
                rejectionReason: project.rejectionReason,
              }
            : rfp,
        ),
      };
    }
    case "start-proposal":
      return action.project.stage === "진행"
        ? {
            ...state,
            activeProject: cloneProject(action.project),
            activeProposalLnb: "rfp_upload",
            toastMessage: `'${action.project.title}' 제안서 작성 프로세스(1단계 작성 설정)로 이동했습니다.`,
          }
        : {
            ...state,
            toastMessage: "제안서 작성은 관리자 검토를 통해 [진행]으로 승인된 프로젝트만 가능합니다.",
          };
    case "start-analysis":
    case "complete-analysis": {
      const status: AnalysisStatus =
        action.type === "start-analysis" ? "분석 중" : "분석 완료";
      const projects = state.projects.map((project) =>
        project.id === action.projectId ? { ...project, analysisStatus: status } : project,
      );
      const activeProject =
        state.activeProject.id === action.projectId
          ? { ...state.activeProject, analysisStatus: status }
          : state.activeProject;
      return {
        ...state,
        projects,
        activeProject,
        activeProposalLnb: action.type === "complete-analysis" ? "ai_analysis" : state.activeProposalLnb,
      };
    }
    case "set-project-files":
      return {
        ...state,
        projectFilesMap: {
          ...state.projectFilesMap,
          [action.projectId]: action.files.map(cloneUploadedFile),
        },
      };
    case "set-checklist":
      return {
        ...state,
        checklistRequirements: action.requirements.map(cloneChecklistRequirement),
      };
    case "update-checklist":
      return {
        ...state,
        checklistRequirements: state.checklistRequirements.map((requirement) =>
          requirement.id === action.requirement.id
            ? cloneChecklistRequirement(action.requirement)
            : requirement,
        ),
      };
    case "set-sections":
      return { ...state, proposalSections: action.sections.map(cloneProposalSectionItem) };
    case "update-section":
      return {
        ...state,
        proposalSections: state.proposalSections.map((section) =>
          section.id === action.section.id ? cloneProposalSectionItem(action.section) : section,
        ),
      };
    case "open-editor-section":
      return {
        ...state,
        selectedEditorSectionId: action.sectionId,
        activeProposalLnb: "editor",
      };
    case "open-convert":
      return { ...state, rfpToConvert: { ...action.rfp }, convertModalOpen: true };
    case "close-convert":
      return { ...state, convertModalOpen: false };
    case "confirm-convert": {
      const project = {
        id: action.input.id || `proj-${Date.now()}`,
        title: action.input.title,
        agency: action.input.agency,
        budget: action.input.targetPrice,
        deadline: action.input.deadline,
        dDay: 28,
        status: "제안 착수",
        stage: "kickoff",
        manager: action.input.teamLead,
        teamMembers: [...action.input.members],
        pWin: 85,
        rfpId: state.rfpToConvert.id,
      } as unknown as ProposalProject;
      return {
        ...state,
        projects: [project, ...state.projects],
        activeProject: project,
        convertModalOpen: false,
        activeProposalLnb: "rfp_upload",
        toastMessage: `'${project.title}' 제안 사업이 성공적으로 등록되었습니다.`,
      };
    }
    case "show-toast":
      return { ...state, toastMessage: action.message };
    case "close-toast":
      return { ...state, toastMessage: null };
  }
}
