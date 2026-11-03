export const RFP_DB_NAME = "kpc-rfp-register";
export const RFP_DB_VERSION = 1;
export const RFP_SCHEMA_VERSION = 1 as const;
export const RFP_FILE_MAX_BYTES = 50 * 1024 * 1024; // 파일당 50MB
export const RFP_FILE_MAX_COUNT = 30;
export const RFP_ANALYZE_DURATION_MS = 1000; // 진행바 연출 시간
export const RFP_REVIEWER_MAX = 20;

export const RFP_FILE_KINDS = ["rfp", "related", "reference", "etc"] as const;
export type RfpFileKind = (typeof RFP_FILE_KINDS)[number];
export const RFP_FILE_KIND_LABELS: Record<RfpFileKind, string> = {
  rfp: "RFP", related: "사업 관련 문서", reference: "참고자료", etc: "기타 자료",
};

export const RFP_PERIOD_OPTIONS = ["3개월", "6개월", "8개월", "12개월"] as const;
export type RfpPeriod = (typeof RFP_PERIOD_OPTIONS)[number];

export const RFP_TEXT_FIELDS = ["name", "org", "due", "budget", "summary", "official", "memo"] as const;
export type RfpTextField = (typeof RFP_TEXT_FIELDS)[number];
export const RFP_FIELD_LABELS: Record<RfpTextField | "period" | "reviewers", string> = {
  name: "프로젝트명", org: "발주처", due: "제안 마감일", budget: "사업예산 (원)", summary: "사업 주요내용 (RFP 핵심 과업 및 목적)",
  official: "사업명 (공식 공고명)", memo: "기타 사업 관련 메모", period: "사업기간", reviewers: "검토자",
};
export const RFP_REQUIRED_KEYS = ["name", "org", "due", "summary", "reviewers"] as const;

// "AI 추출" 시연값. page는 태그 "AI 추출 · p.N"에 표시한다.
export const RFP_SAMPLE_EXTRACTION: Readonly<Partial<Record<RfpTextField, { value: string; page: number }>>> = {
  name: { value: "공공기관 생성형 AI 기반 지능형 업무혁신 플랫폼 구축", page: 1 },
  official: { value: "2026년도 국가 디지털 행정 혁신 지원 사업 — 생성형 AI 업무혁신 플랫폼 구축", page: 1 },
  org: { value: "행정안전부 디지털정부혁신실", page: 1 },
  due: { value: "2026-11-27", page: 2 },
  budget: { value: "1200000000", page: 4 },
  summary: { value: "공공기관 맞춤형 생성형 AI 업무혁신 플랫폼 구축, 지능형 RAG 사내 지식검색, 보안 가이드라인 준수 망연계 시스템 구현.", page: 5 },
};
export const RFP_SAMPLE_PERIOD: RfpPeriod = "8개월";
export const RFP_SAMPLE_FILES = [
  { name: "2026_공공기관_생성형AI_업무혁신_플랫폼_구축_RFP.pdf", sizeBytes: 4_812_000 },
  { name: "과업지시서_세부과업내역서_v1.0.docx", sizeBytes: 1_204_000 },
] as const;
export const RFP_DATA_NOTICE = "예시 화면입니다. AI 추출은 샘플 값이며, 등록 내용은 이 브라우저에만 저장됩니다.";
export const RFP_DATA_NOTICE_SUMMARY = "예시 데이터 · 이 브라우저에만 저장";
