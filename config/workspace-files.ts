import type { AllowedFileExtension, FileCategory, ReferenceKind, ReferencePriority, WebPeriod } from "@/types/workspace-files";

export const FILE_CATEGORIES = [
  { value: "proposal", label: "제안 관련 자료" },
  { value: "related", label: "유관자료" },
  { value: "web", label: "웹 검색" },
] as const satisfies readonly { value: FileCategory; label: string }[];

export const REFERENCE_KINDS = [
  { value: "rfp", label: "RFP (공고문)" },
  { value: "business", label: "사업 관련 문서" },
  { value: "customer", label: "고객 제공자료" },
  { value: "case-study", label: "수행 사례" },
  { value: "technical", label: "기술자료" },
  { value: "company", label: "회사 소개·실적" },
  { value: "web", label: "웹 검색 자료" },
  { value: "other", label: "기타" },
] as const satisfies readonly { value: ReferenceKind; label: string }[];

export const REFERENCE_PRIORITIES = [
  { value: "required", label: "필수 참조", description: "항상 근거로 사용" },
  { value: "preferred", label: "우선 참조", description: "먼저 찾아서 사용" },
  { value: "normal", label: "일반 참조", description: "필요할 때 사용" },
  { value: "excluded", label: "참조 제외", description: "보관만 · AI 미사용" },
] as const satisfies readonly { value: ReferencePriority; label: string; description: string }[];

export const WEB_PERIODS = [
  { value: "all", label: "전체 기간" },
  { value: "1y", label: "최근 1년" },
  { value: "3m", label: "최근 3개월" },
] as const satisfies readonly { value: WebPeriod; label: string }[];

export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".hwp", ".hwpx", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt"] as const satisfies readonly AllowedFileExtension[];
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_CURRENT_MATERIALS = 30;
export const UNDO_TTL_MS = 15_000;
export const TXT_PREVIEW_BYTES = 256 * 1024;
export const FILE_LIMITS = {
  fileBytes: MAX_FILE_BYTES,
  currentMaterials: MAX_CURRENT_MATERIALS,
  undoTtlMs: UNDO_TTL_MS,
  txtPreviewBytes: TXT_PREVIEW_BYTES,
  idLength: 256,
  namespaceLength: 512,
  filenameLength: 255,
  urlLength: 2048,
  instructionLength: 4000,
} as const;

export const PROMPT_HINTS = [
  "핵심 수치만 원문 그대로 발췌",
  "평가 기준 관점으로 요약",
  "표 형식으로 정리해 인용",
  "최신 내용만 사용",
  "특정 장(章) 작성에만 사용",
] as const;
