export type TokenDialogView = "usage" | "request";
export type TokenAmountChoice = "30" | "50" | "100" | "custom";
export type TokenProjectId = "mois" | "edu" | "sample" | "outside";

export interface TokenProjectOption { id: TokenProjectId; name: string }
export interface TokenDailyUsage { day: number; tokens: number }
export interface TokenProjectUsage { id: TokenProjectId; name: string; tokens: number }
export interface TokenFeatureUsage { id: string; name: string; percent: number }
export interface TokenRecentUsage {
  id: string;
  timeLabel: string;
  projectName: string;
  operation: string;
  tokens: number;
}
export interface TokenUsageSnapshot {
  periodLabel: string;
  elapsedDays: number;
  daysInMonth: number;
  daily: readonly Readonly<TokenDailyUsage>[];
  byProject: readonly Readonly<TokenProjectUsage>[];
  byFeature: readonly Readonly<TokenFeatureUsage>[];
  recent: readonly Readonly<TokenRecentUsage>[];
}
export interface TokenRequestDraft {
  amountChoice: TokenAmountChoice;
  customAmountK: string;
  projectId: TokenProjectId;
  reason: string;
}
export interface ValidatedTokenRequest {
  amountK: number;
  amountTokens: number;
  projectId: TokenProjectId;
  projectName: string;
  reason: string;
}
export interface TokenRequestPreview extends ValidatedTokenRequest {
  id: string;
  requesterName: string;
  department: string | null;
  status: "pending";
  createdAt: string;
}
export interface TokenRequestErrors {
  amount?: string;
  project?: string;
  reason?: string;
  form?: string;
}
export type TokenRequestValidation =
  | { ok: true; value: ValidatedTokenRequest }
  | { ok: false; errors: TokenRequestErrors };
export type TokenSubmitResult =
  | { ok: true; request: TokenRequestPreview }
  | { ok: false; errors: TokenRequestErrors };
export interface TokenPreviewState {
  dialogView: TokenDialogView | null;
  requestDraft: TokenRequestDraft;
  requests: TokenRequestPreview[];
}
export type TokenPreviewAction =
  | { type: "open"; view: TokenDialogView }
  | { type: "close" }
  | { type: "set-amount"; choice: TokenAmountChoice }
  | { type: "set-custom-amount"; value: string }
  | { type: "set-project"; projectId: TokenProjectId }
  | { type: "set-reason"; value: string }
  | { type: "submit"; requestId: string; submittedAt: string;
      requesterName: string; department: string | null };

// Display-only fixtures, unrelated to server grants, billing or project membership.
export const TOKEN_PROJECT_OPTIONS: readonly Readonly<TokenProjectOption>[] = [
  { id: "mois", name: "초거대 AI 기반 맞춤형 지능 행정업무 에이전트 구축" },
  { id: "edu", name: "지능형 디지털 인재양성 AI 교육 통합 플랫폼" },
  { id: "sample", name: "[테스트용] 전 과정 샘플" },
  { id: "outside", name: "프로젝트 외 사용" },
];

export const TOKEN_REASON_PRESETS: readonly string[] = [
  "검수 의견 반영 재작성",
  "RFP 변경 · 재분석",
  "마감 전 슬라이드 재생성",
];

export const TOKEN_USAGE_SNAPSHOT: Readonly<TokenUsageSnapshot> = {
  periodLabel: "2026.10.01 ~ 10.20",
  elapsedDays: 20,
  daysInMonth: 31,
  // Proportional to the HTML fixture, rounded to 100 tokens, totaling 72.4K.
  daily: [2500, 4000, 1400, 0, 0, 5600, 6500, 4500, 4900, 3100,
    0, 0, 7100, 8600, 6100, 5700, 4400, 0, 0, 8000]
    .map((tokens, index) => ({ day: index + 1, tokens })),
  byProject: [
    { id: "mois", name: TOKEN_PROJECT_OPTIONS[0].name, tokens: 41200 },
    { id: "edu", name: TOKEN_PROJECT_OPTIONS[1].name, tokens: 18500 },
    { id: "sample", name: TOKEN_PROJECT_OPTIONS[2].name, tokens: 8100 },
    { id: "outside", name: "기타 · 프로젝트 외 질문", tokens: 4600 },
  ],
  byFeature: [
    { id: "rfp", name: "RFP 분석", percent: 22 },
    { id: "draft", name: "초안 생성 · 재작성", percent: 32 },
    { id: "polish", name: "문장 다듬기", percent: 18 },
    { id: "slides", name: "슬라이드 생성", percent: 16 },
    { id: "review", name: "검수 · 누락 점검", percent: 12 },
  ],
  recent: [
    { id: "r1", timeLabel: "10.20 08:52", projectName: "초거대 AI 행정 에이전트", operation: "3.3 초안 재작성", tokens: 3120 },
    { id: "r2", timeLabel: "10.20 08:40", projectName: "초거대 AI 행정 에이전트", operation: "문장 다듬기", tokens: 840 },
    { id: "r3", timeLabel: "10.19 17:12", projectName: "AI 교육 통합 플랫폼", operation: "슬라이드 생성", tokens: 2260 },
    { id: "r4", timeLabel: "10.19 16:30", projectName: "AI 교육 통합 플랫폼", operation: "요구사항 누락 점검", tokens: 1180 },
    { id: "r5", timeLabel: "10.19 11:05", projectName: "초거대 AI 행정 에이전트", operation: "RFP 분석", tokens: 5400 },
    { id: "r6", timeLabel: "10.18 15:44", projectName: "[테스트용] 전 과정 샘플", operation: "초안 생성", tokens: 1960 },
  ],
};
