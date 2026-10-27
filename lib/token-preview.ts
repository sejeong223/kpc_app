import { PROFILE_TOKEN_USAGE } from "@/config/profile-preview";
import {
  TOKEN_PROJECT_OPTIONS,
  type TokenPreviewAction,
  type TokenPreviewState,
  type TokenRequestDraft,
  type TokenRequestErrors,
  type TokenRequestPreview,
  type TokenRequestValidation,
} from "@/config/token-preview";

export function createInitialTokenPreviewState(): TokenPreviewState {
  return {
    dialogView: null,
    requestDraft: { amountChoice: "50", customAmountK: "", projectId: "mois", reason: "" },
    requests: [],
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
  if (amountK === null || (validLimit && !Number.isSafeInteger(currentLimit + amountK * 1000))) {
    errors.amount = "신청량은 안전한 양의 정수(K)로 입력하세요.";
  }
  const project = TOKEN_PROJECT_OPTIONS.find((item) => item.id === draft.projectId);
  if (!project) errors.project = "프로젝트를 선택하세요.";
  const reason = draft.reason.trim();
  if (reason.length < 2) errors.reason = "신청 사유를 2자 이상 입력하세요.";
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
    case "submit": {
      if (state.dialogView !== "request") return state;
      const result = validateTokenRequestDraft(state.requestDraft, PROFILE_TOKEN_USAGE.limit);
      const id = action.requestId.trim();
      const requesterName = action.requesterName.trim();
      const time = Date.parse(action.submittedAt);
      if (!result.ok || !id || !requesterName || !Number.isFinite(time)
        || new Date(time).toISOString() !== action.submittedAt
        || state.requests.some((request) => request.id === id)) return state;
      const request: TokenRequestPreview = {
        ...result.value, id, requesterName, department: action.department,
        status: "pending", createdAt: action.submittedAt,
      };
      return { ...state, dialogView: null, requests: [request, ...state.requests] };
    }
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
