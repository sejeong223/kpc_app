export type ProposalDepartment =
  | "전체"
  | "AI산업본부"
  | "AI사업본부"
  | "컨설팅본부"
  | "교육사업본부"
  | "생산성본부"
  | "CX본부"
  | "자격사업본부";

export type ProposalStage = "검토 대기" | "검토 중" | "진행" | "진행 안 함";

export type ProposalWorkflowStep =
  | "setup"
  | "analysis"
  | "requirements"
  | "editor"
  | "review";

export type ProposalWorkspaceView =
  | "pipeline"
  | "register"
  | "project-review"
  | "workspace"
  | "library"
  | "settings";

export type AnalysisStatus = "분석 전" | "분석 중" | "분석 완료";
export type RequirementStatus = "미반영" | "작성 중" | "반영";
export type SectionStatus = "작성 대기" | "작성 중" | "검토 요청" | "완료";

export interface ProposalProject {
  id: string;
  title: string;
  agency: string;
  budget: number;
  deadline: string;
  dDay: number;
  stage: ProposalStage;
  department: Exclude<ProposalDepartment, "전체">;
  manager: string;
  teamMembers: string[];
  pWin: number;
  summary: string;
  progress: number;
  activeStep: ProposalWorkflowStep;
  workflowMode: "requirements" | "qa" | "blank";
  analysisStatus: AnalysisStatus;
  lastModified: string;
  primaryRfpFileName: string;
  rejectionReason?: string;
}

export interface ProposalRegistrationDraft {
  title: string;
  agency: string;
  department: Exclude<ProposalDepartment, "전체">;
  budget: number;
  deadline: string;
  manager: string;
  summary: string;
}

export interface ProposalReviewCriterion {
  id: string;
  category: string;
  score: number;
  maxScore: number;
  rationale: string;
  sourcePage: number;
  sourceQuote: string;
}

export interface ProposalDocument {
  id: string;
  projectId: string;
  name: string;
  kind: "RFP" | "참고자료" | "기존 제안서" | "회사소개서" | "기술자료";
  size: string;
  pageCount?: number;
  status: "업로드 완료" | "분석 완료";
  isPrimary: boolean;
}

export interface ProposalAnalysisItem {
  id: string;
  title: string;
  content: string;
  sourcePage: string;
  sourceQuote: string;
  tone: "default" | "risk" | "win";
}

export interface ProposalRequirement {
  id: string;
  projectId: string;
  category: string;
  title: string;
  sourcePage: string;
  priority: "높음" | "보통" | "낮음";
  status: RequirementStatus;
  assignee: string;
  checked: boolean;
}

export interface ProposalSection {
  id: string;
  projectId: string;
  number: string;
  title: string;
  status: SectionStatus;
  assignee: string;
  reviewer: string;
  dueDate: string;
  targetCharacters: number;
  content: string;
  requirementIds: string[];
  updatedAt: string;
}

export interface ProposalLibraryItem {
  id: string;
  title: string;
  category: string;
  description: string;
  fileFormat: string;
  department: Exclude<ProposalDepartment, "전체">;
  size: string;
  tags: string[];
  updatedAt: string;
  useCount: number;
}

export interface ProposalWorkspaceState {
  view: ProposalWorkspaceView;
  activeStep: ProposalWorkflowStep;
  selectedProjectId: string;
  selectedSectionId: string;
  selectedDepartment: ProposalDepartment;
  searchQuery: string;
  projects: ProposalProject[];
  documents: ProposalDocument[];
  requirements: ProposalRequirement[];
  sections: ProposalSection[];
  libraryItems: ProposalLibraryItem[];
}
