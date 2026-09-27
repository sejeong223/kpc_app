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
  analysisStatus: AnalysisStatus | RfpAnalysisStatus;
  lastModified: string;
  primaryRfpFileName: string;
  status?: string;
  rfpId?: string;
  projectType?: ProjectType;
  workflowType?: ProposalWorkflowType;
  analysisProgress?: number;
  analysisStepIndex?: number;
  rfpName?: string;
  creationMethod?: "requirements" | "qa" | "blank" | string;
  documents?: DocumentItem[];
  currentStep?: string;
  progressPercent?: number;
  teamInvited?: boolean;
  projectName?: string;
  businessName?: string;
  businessField?: string;
  businessSummary?: string;
  businessPeriod?: string;
  memo?: string;
  pwinBreakdown?: PWinEvaluationItem[];
  rejectionReason?: string;
  rejectionNote?: string;
  adminOpinion?: string;
  managerOpinion?: string;
  keyRequirements?: string[];
  keyRisks?: string[];
  relatedDocs?: ProjectRelatedDoc[];
  templateType?: string;
  targetScope?: string;
  language?: string;
  announcementDate?: string;
  purpose?: string;
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
  department: string;
  size: string;
  tags: string[];
  updatedAt: string;
  lastModified?: string;
  useCount: number;
  previewContent?: {
    summary: string;
    keyHighlights: string[];
    sampleText: string;
    toc?: string[];
    metadata?: Record<string, string>;
  };
}

export interface ProposalComment {
  id: string;
  author: string;
  sectionId?: string;
  text?: string;
  createdAt?: string;
  resolved: boolean;
  date?: string;
  content?: string;
  selectedTextSnippet?: string;
  replies?: Array<{
    id: string;
    author: string;
    content?: string;
    text?: string;
    createdAt?: string;
    date?: string;
  }>;
}

export interface ProposalVersion {
  id: string;
  sectionId: string;
  label: string;
  author: string;
  createdAt: string;
  content: string;
}

export interface SectionReferenceConfig {
  sectionId: string;
  internalKnowledge: {
    selectedFileIds: string[];
    files: Array<{
      id: string;
      title: string;
      category: string;
      folderPath?: string;
      fileFormat: string;
      size: string;
      updatedAt: string;
      relevanceScore?: number;
    }>;
  };
  uploadedFiles: SectionReferenceFileItem[];
  webSearch: {
    enabled: boolean;
    includeUrls: string[];
    excludeUrls: string[];
  };
}

export interface ProposalReviewSummary {
  totalSections: number;
  completedSections: number;
  totalCharacters: number;
  targetCharacters: number;
  coveredRequirements: number;
  totalRequirements: number;
  completionRate: number;
}

export interface ProposalFactIssue {
  id: string;
  sectionId: string;
  severity: "주의" | "확인 필요";
  message: string;
  excerpt: string;
}

export interface ProposalMember {
  id: string;
  name: string;
  department: string;
  role: "PM" | "작성자" | "검토자";
  email: string;
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface ProposalAiPolicy {
  modelLabel: string;
  allowWebSearch: boolean;
  requireCitation: boolean;
  maxMonthlyTokens: number;
}

export interface ProposalNotificationSettings {
  deadline: boolean;
  comments: boolean;
  reviewRequests: boolean;
  analysisComplete: boolean;
}

export interface ProposalWorkspaceState {
  view: ProposalWorkspaceView;
  activeStep: ProposalWorkflowStep;
  taskManagementOpen: boolean;
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

export type GnbTab =
  | "dia"
  | "knowledge_ai"
  | "custom_ai"
  | "proposals"
  | "reports"
  | "ai_worker"
  | "ai_agent"
  | "ai_community"
  | "admin";

export type UserRole = "user" | "admin";

export type ProposalLnbTab =
  | "search"
  | "pipeline"
  | "proposals"
  | "my-tasks"
  | "project_register"
  | "project_review"
  | "rfp_upload"
  | "ai_analysis"
  | "requirements"
  | "structure"
  | "tasks"
  | "editor"
  | "matrix"
  | "my_tasks"
  | "library"
  | "settings";

export type ProjectSubTab =
  | "rfp-docs"
  | "ai-analysis"
  | "requirements"
  | "structure"
  | "matrix"
  | "task-mgmt"
  | "editor"
  | "resources"
  | "inputs"
  | "review"
  | "export"
  | "proj-settings";

export type Department = ProposalDepartment;
export type PipelineStage = ProposalStage;
export type ProjectType = "Knowledge AI" | "Proposal AI" | "AI Platform & Agent";
export type ProposalWorkflowType = "requirements" | "qa" | "blank";
export type RfpAnalysisStatus =
  | "RFP 미등록"
  | "등록 완료"
  | "분석 대기"
  | "분석 중"
  | "분석 완료"
  | "분석 실패";

export interface PWinEvaluationItem {
  id: string;
  category: string;
  score: number;
  maxScore?: number;
  resultLabel: "최우수" | "우수" | "적합" | "보통" | "주의" | "미흡";
  rationale: string;
  rfpCitationLocation: string;
  rfpPage: number;
  aiExplanation: string;
}

export type ProposalDocumentType = "RFP" | "사업 관련 문서" | "참고자료" | "기타 자료";

export interface ProjectRelatedDoc {
  id: string;
  fileName: string;
  docType: ProposalDocumentType;
  uploader: string;
  uploadDate: string;
  size: string;
  isPrimaryRfp: boolean;
  pageCount?: number;
}

export interface RfpItem {
  id: string;
  title: string;
  agency: string;
  budget: number;
  budgetFormatted: string;
  deadline: string;
  announcementDate: string;
  contractType: string;
  country: string;
  currency: string;
  language: string;
  status: "모집 중" | "마감 임박" | "예정" | "마감";
  department: Department;
  stage: PipelineStage;
  pwin: number;
  assignee: string;
  participants: string[];
  purpose: string;
  tasks: string[];
  requirementsSummary: string;
  evalSummary: string;
  source: string;
  lastModified: string;
  projectName?: string;
  businessName?: string;
  businessField?: string;
  businessSummary?: string;
  businessPeriod?: string;
  memo?: string;
  primaryRfpFileName?: string;
  pwinBreakdown?: PWinEvaluationItem[];
  rejectionReason?: string;
  rejectionNote?: string;
  adminOpinion?: string;
  managerOpinion?: string;
  keyRequirements?: string[];
  keyRisks?: string[];
  relatedDocs?: ProjectRelatedDoc[];
}

export type RfpOpportunity = RfpItem;

export type ProposalDocCategory =
  | "RFP 문서"
  | "참고자료"
  | "기존 제안서"
  | "회사소개서"
  | "기술자료"
  | "기타 참고문서";

export interface DocumentItem {
  id: string;
  fileName: string;
  type: "PDF" | "DOCX" | "PPTX" | "XLSX" | "HWP" | "TXT";
  size: string;
  uploader: string;
  updatedAt: string;
  status: "분석 준비 완료" | "분석 완료" | "업로드 완료" | "등록 완료" | "대기";
  isRfp?: boolean;
  category?: ProposalDocCategory;
  pageCount?: number;
  previewContent?: {
    summary: string;
    keyHighlights: string[];
    sampleText: string;
    toc?: string[];
    metadata?: Record<string, string>;
  };
}

export interface ProposalOutlineItem {
  id: string;
  code?: string;
  sectionNumber?: string;
  title: string;
  level?: number;
  sourceReqId?: string;
  sourceText?: string;
  status: "작성 준비" | "작성 대기" | "작성 중" | "검토 준비" | "검토 요청" | "검토 중" | "완료";
  author?: string;
  assignee?: string;
  reviewer?: string;
  deadline?: string;
  targetPages?: number;
  pageEstimate?: number;
  targetWords?: number;
  currentWords?: number;
  rfpMappingReqs?: string[];
  isExpanded?: boolean;
  children?: ProposalOutlineItem[];
}

export interface StoryboardSection {
  id: string;
  guidelines: string;
  evaluationCriteria: string;
  taskDescription: string;
  otherRequirements: string;
  winStrategy: string;
  differentiators: string[];
  painPoints: string[];
  targetPages: number | string;
  targetWords?: number;
  author?: string;
  assignee?: string;
  reviewer?: string;
  rfpRequirements?: string;
}

export type ProposalStoryboard = StoryboardSection;

export interface EditorVersion {
  id: string;
  versionCode?: string;
  versionName?: string;
  title?: string;
  time?: string;
  createdAt?: string;
  author: string;
  content: string;
}

export type ProposalFileCategory = "RFP 문서" | "참고자료";

export interface UploadedProposalFile {
  id: string;
  fileName: string;
  category: ProposalFileCategory;
  size: string;
  pages: number;
  uploader: string;
  uploadDate: string;
  status: "분석 완료" | "등록 완료" | "분석 준비 완료" | "업로드 완료";
  type: string;
}

export interface ChecklistRequirement {
  id: string;
  category: string;
  text: string;
  source: string;
  rfpPage?: number;
  rfpQuote?: string;
  checked: boolean;
  completedBy?: string;
  completedAt?: string;
  type?: string;
  assignedSection?: string;
  bodyPage?: string;
}

export type SectionStatusType = "시작 전" | "작성 중" | "검토 대기" | "검토 중" | "완료";

export interface ProposalSectionItem {
  id: string;
  sectionNumber: string;
  title: string;
  level: number;
  status: SectionStatusType;
  author: string;
  reviewer: string;
  updatedAt: string;
  dueDate?: string;
  charLimit: number;
  currentCharCount: number;
  content: string;
  children?: ProposalSectionItem[];
}

export interface SectionReferenceFileItem {
  id: string;
  fileName: string;
  fileSize: string;
  format: string;
  category: string;
  uploadDate: string;
  uploader?: string;
  status: string;
  selected: boolean;
}

export type LibraryItem = ProposalLibraryItem;

export interface ProposalSectionTask {
  id: string;
  project?: string;
  section?: string;
  sectionNumber?: string;
  sectionTitle?: string;
  role?: "작성자" | "검토자";
  assignee?: string;
  reviewer?: string;
  status: string;
  deadline: string;
  progress?: number;
  targetPages?: number;
  targetWords?: number;
  currentWords?: number;
}

export type ProposalTaskStatus =
  | "작성 대기"
  | "작성 중"
  | "검토 요청"
  | "검토 준비"
  | "완료";
