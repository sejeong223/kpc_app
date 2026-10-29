import {
  TOKEN_PROJECT_OPTIONS,
  type TokenPreviewAction,
  type TokenPreviewState,
  type TokenRequestDraft,
  type TokenRequestErrors,
  type TokenRequestPreview,
  type TokenRequestValidation,
} from "@/config/token-preview";
import type { TokenUsageSnapshot } from "@/config/token-preview";
import type { AdminDepartment, AdminTokenRequest, SelfUsageView, UsageFeature } from "@/types/admin";
import { toKoreanDay } from "@/lib/admin/dates";

export function createInitialTokenPreviewState(): TokenPreviewState {
  return {
    dialogView: null,
    requestDraft: { amountChoice: "50", customAmountK: "", projectId: "mois", reason: "" },
  };
}

export function getRequestedTokenAmountK(draft: TokenRequestDraft): number | null {
  const text = draft.amountChoice === "custom" ? draft.customAmountK.trim() : draft.amountChoice;
  if (!/^\d+$/.test(text)) return null;
  if (draft.amountChoice !== "custom" && !["30", "50", "100"].includes(draft.amountChoice)) return null;
  const amountK = Number(text);
  return amountK > 0 && Number.isSafeInteger(amountK) && Number.isSafeInteger(amountK * 1000)
    ? amountK : null;
}

export function validateTokenRequestDraft(
  draft: TokenRequestDraft,
  currentLimit: number,
): TokenRequestValidation {
  const errors: TokenRequestErrors = {};
  const amountK = getRequestedTokenAmountK(draft);
  const validLimit = Number.isSafeInteger(currentLimit) && currentLimit >= 0;
  if (!validLimit) errors.form = "현재 한도를 확인할 수 없습니다.";
  if (amountK === null || (validLimit && (!Number.isSafeInteger(currentLimit + amountK * 1000) || currentLimit + amountK * 1000 > 1_000_000_000))) {
    errors.amount = "신청량은 안전한 양의 정수(K)로 입력하세요.";
  }
  const project = TOKEN_PROJECT_OPTIONS.find((item) => item.id === draft.projectId);
  if (!project) errors.project = "프로젝트를 선택하세요.";
  const reason = draft.reason.trim();
  if (reason.length < 2 || reason.length > 1000) errors.reason = "신청 사유를 2~1000자로 입력하세요.";
  if (Object.keys(errors).length || amountK === null || !project) return { ok: false, errors };
  return {
    ok: true,
    value: { amountK, amountTokens: amountK * 1000, projectId: project.id, projectName: project.name, reason },
  };
}

export function tokenPreviewReducer(
  state: TokenPreviewState,
  action: TokenPreviewAction,
): TokenPreviewState {
  if (state.dialogView === null && action.type.startsWith("set-")) return state;
  switch (action.type) {
    case "open":
      return {
        ...state,
        dialogView: action.view,
        requestDraft: action.view === "request"
          ? { ...state.requestDraft, amountChoice: "50", customAmountK: "", reason: "" }
          : state.requestDraft,
      };
    case "close":
      return state.dialogView === null ? state : { ...state, dialogView: null };
    case "set-amount":
      if (!["30", "50", "100", "custom"].includes(action.choice)) return state;
      return { ...state, requestDraft: { ...state.requestDraft, amountChoice: action.choice } };
    case "set-custom-amount":
      return { ...state, requestDraft: { ...state.requestDraft, customAmountK: action.value } };
    case "set-project":
      if (!TOKEN_PROJECT_OPTIONS.some((item) => item.id === action.projectId)) return state;
      return { ...state, requestDraft: { ...state.requestDraft, projectId: action.projectId } };
    case "set-reason":
      return { ...state, requestDraft: { ...state.requestDraft, reason: action.value } };
  }
}

export function getLatestPendingTokenRequest(
  requests: readonly TokenRequestPreview[],
): TokenRequestPreview | null {
  return requests.find((request) => request.status === "pending") ?? null;
}

export function estimateMonthEndUsage(used: number, elapsedDays: number, daysInMonth: number): number {
  if (!Number.isFinite(used) || used < 0 || !Number.isInteger(elapsedDays) || elapsedDays <= 0
    || !Number.isInteger(daysInMonth) || daysInMonth < elapsedDays) return 0;
  const estimate = Math.round(used / elapsedDays * daysInMonth);
  return Number.isFinite(estimate) ? estimate : 0;
}

export function getUsageBarPercent(value: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(100, value / maximum * 100));
}

export function toTokenRequestPreview(request: AdminTokenRequest, departments: readonly AdminDepartment[]): TokenRequestPreview {
  const project = TOKEN_PROJECT_OPTIONS.find((p) => p.id === (request.projectId ?? "outside")) ?? TOKEN_PROJECT_OPTIONS[3];
  return { id: request.id, requesterName: request.requesterName, department: departments.find((d) => d.id === request.departmentId)?.name ?? null,
    status: request.status, createdAt: request.createdAt, amountK: request.amountTokens / 1000, amountTokens: request.amountTokens, projectId: project.id, projectName: project.name, reason: request.reason };
}
export function toTokenUsageSnapshot(view: SelfUsageView): TokenUsageSnapshot {
  const features: { id: UsageFeature; name: string }[] = [{ id: "rfp", name: "RFP 분석" }, { id: "draft", name: "초안 생성 · 재작성" }, { id: "polish", name: "문장 다듬기" }, { id: "slides", name: "슬라이드 생성" }, { id: "review", name: "검수 · 누락 점검" }];
  const tokens = (rows: SelfUsageView["usage"]) => rows.reduce((n, r) => n + r.inputTokens + r.outputTokens, 0);
  const ratios = features.map((f) => view.usedTokens > 0 ? tokens(view.usage.filter((u) => u.feature === f.id)) / view.usedTokens * 100 : 0);
  const percentages = ratios.map(Math.floor);
  const remainder = view.usedTokens > 0 ? 100 - percentages.reduce((n, p) => n + p, 0) : 0;
  ratios.map((r, i) => ({ i, remainder: r - Math.floor(r) })).sort((a, b) => b.remainder - a.remainder || a.i - b.i).slice(0, remainder).forEach(({ i }) => percentages[i]++);
  return { periodLabel: view.from.replaceAll("-", ".") + " ~ " + view.to.slice(5).replaceAll("-", "."), elapsedDays: view.elapsedDays, daysInMonth: view.daysInMonth,
    daily: Array.from({ length: view.elapsedDays }, (_, i) => ({ day: i + 1, tokens: tokens(view.usage.filter((u) => Number(toKoreanDay(u.occurredAt).slice(-2)) === i + 1)) })),
    byProject: TOKEN_PROJECT_OPTIONS.map((p) => ({ ...p, tokens: tokens(view.usage.filter((u) => (u.projectId ?? "outside") === p.id)) })),
    byFeature: features.map((f, i) => ({ ...f, percent: percentages[i] })),
    recent: [...view.usage].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)).slice(0, 6).map((u) => ({ id: u.id,
      timeLabel: new Date(Date.parse(u.occurredAt) + 9 * 3600000).toISOString().slice(5, 16).replace("-", ".").replace("T", " "), projectName: TOKEN_PROJECT_OPTIONS.find((p) => p.id === (u.projectId ?? "outside"))?.name ?? "프로젝트 외 사용",
      operation: features.find((f) => f.id === u.feature)?.name ?? u.feature, tokens: u.inputTokens + u.outputTokens })) };
}
