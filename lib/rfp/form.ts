import {
  RFP_FIELD_LABELS, RFP_FILE_MAX_BYTES, RFP_FILE_MAX_COUNT, RFP_REQUIRED_KEYS, RFP_REVIEWER_MAX,
  RFP_SAMPLE_EXTRACTION, RFP_SAMPLE_PERIOD, RFP_SCHEMA_VERSION, RFP_TEXT_FIELDS,
  type RfpFileKind, type RfpPeriod, type RfpTextField,
} from "@/config/rfp-register";

import { RfpError } from "./errors";
import { RfpRecordSchema, type RfpFileMeta, type RfpPerson, type RfpRecord } from "./schemas";

export type RfpFormPhase = "idle" | "analyzing" | "extracted";
export interface RfpFormState {
  values: Record<RfpTextField, string>; // budget은 숫자만 담은 문자열
  period: RfpPeriod | null;
  reviewers: RfpPerson[];
  files: RfpFileMeta[];
  ai: Partial<Record<RfpTextField, number>>; // 필드 → 원문 페이지. 존재하면 AI 태그 표시
  phase: RfpFormPhase;
  fileError: string | null;
}
export type RfpFormAction =
  | { type: "set-field"; field: RfpTextField; value: string }
  | { type: "set-period"; period: RfpPeriod | null }
  | { type: "add-files"; files: { id: string; name: string; sizeBytes: number }[] }
  | { type: "set-file-kind"; id: string; kind: RfpFileKind }
  | { type: "remove-file"; id: string }
  | { type: "start-analysis" }
  | { type: "finish-analysis" }
  | { type: "toggle-reviewer"; person: RfpPerson }
  | { type: "remove-reviewer"; id: string }
  | { type: "reset" };

export function createRfpFormState(): RfpFormState {
  return {
    values: { name: "", org: "", due: "", budget: "", summary: "", official: "", memo: "" },
    period: null, reviewers: [], files: [], ai: {}, phase: "idle", fileError: null,
  };
}

export function normalizeBudgetInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.slice(0, 16);
}

export function formatBudget(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function addFiles(state: RfpFormState, incoming: { id: string; name: string; sizeBytes: number }[]): RfpFormState {
  const oversized = incoming.filter((f) => f.sizeBytes > RFP_FILE_MAX_BYTES);
  const allowed = incoming.filter((f) => f.sizeBytes <= RFP_FILE_MAX_BYTES);
  const room = Math.max(0, RFP_FILE_MAX_COUNT - state.files.length);
  const accepted = allowed.slice(0, room);
  const messages: string[] = [];
  if (oversized.length) {
    messages.push(`${oversized[0].name}${oversized.length > 1 ? ` 외 ${oversized.length - 1}개` : ""}: 파일당 50MB를 넘을 수 없습니다.`);
  }
  if (allowed.length > room) messages.push(`파일은 최대 ${RFP_FILE_MAX_COUNT}개까지 올릴 수 있습니다.`);
  const hadMain = state.files.length > 0;
  const added: RfpFileMeta[] = accepted.map((f, i) => {
    const main = !hadMain && i === 0;
    return { id: f.id, name: f.name, sizeBytes: f.sizeBytes, kind: main ? "rfp" : "related", isMain: main };
  });
  return { ...state, files: [...state.files, ...added], fileError: messages.length ? messages.join(" ") : null };
}

function removeFile(state: RfpFormState, id: string): RfpFormState {
  const target = state.files.find((f) => f.id === id);
  if (!target) return state;
  const rest = state.files.filter((f) => f.id !== id);
  const files = target.isMain && rest.length ? rest.map((f, i) => (i === 0 ? { ...f, isMain: true } : f)) : rest;
  return { ...state, files };
}

function finishAnalysis(state: RfpFormState): RfpFormState {
  const values = { ...state.values };
  const ai: Partial<Record<RfpTextField, number>> = { ...state.ai };
  for (const field of RFP_TEXT_FIELDS) {
    const sample = RFP_SAMPLE_EXTRACTION[field];
    if (!sample) continue;
    values[field] = sample.value;
    ai[field] = sample.page;
  }
  return { ...state, values, ai, period: RFP_SAMPLE_PERIOD, phase: "extracted" };
}

export function rfpFormReducer(state: RfpFormState, action: RfpFormAction): RfpFormState {
  switch (action.type) {
    case "set-field": {
      const value = action.field === "budget" ? normalizeBudgetInput(action.value) : action.value;
      if (state.values[action.field] === value) return state;
      const ai = { ...state.ai };
      delete ai[action.field];
      return { ...state, values: { ...state.values, [action.field]: value }, ai };
    }
    case "set-period":
      return state.period === action.period ? state : { ...state, period: action.period };
    case "add-files":
      return addFiles(state, action.files);
    case "set-file-kind":
      return { ...state, files: state.files.map((f) => (f.id === action.id ? { ...f, kind: action.kind } : f)) };
    case "remove-file":
      return removeFile(state, action.id);
    case "start-analysis":
      return { ...state, phase: "analyzing" };
    case "finish-analysis":
      // 다시 하기·언마운트 뒤 늦게 끝난 타이머가 값을 되살리지 않게 한다.
      return state.phase === "analyzing" ? finishAnalysis(state) : state;
    case "toggle-reviewer": {
      if (state.reviewers.some((p) => p.id === action.person.id)) {
        return { ...state, reviewers: state.reviewers.filter((p) => p.id !== action.person.id) };
      }
      if (state.reviewers.length >= RFP_REVIEWER_MAX) return state;
      return { ...state, reviewers: [...state.reviewers, { id: action.person.id, name: action.person.name }] };
    }
    case "remove-reviewer":
      return { ...state, reviewers: state.reviewers.filter((p) => p.id !== action.id) };
    case "reset":
      return createRfpFormState();
  }
}

export function rfpRequiredProgress(state: RfpFormState): { done: number; total: 5; missing: string[] } {
  const missing = RFP_REQUIRED_KEYS.filter((key) => (key === "reviewers" ? state.reviewers.length === 0 : !state.values[key].trim()))
    .map((key) => RFP_FIELD_LABELS[key]);
  return { done: RFP_REQUIRED_KEYS.length - missing.length, total: 5, missing };
}

export function isPastDue(due: string, today: string): boolean {
  return Boolean(due && today) && due < today;
}

export function toRfpRecord(state: RfpFormState, ctx: {
  id: string; namespace: string; actor: RfpPerson; departmentName: string | null; now: string;
}): RfpRecord {
  const { values } = state;
  const budgetKrw = values.budget ? Number(values.budget) : null;
  if (budgetKrw !== null && !Number.isSafeInteger(budgetKrw)) throw new RfpError("invalid", "사업예산을 확인해 주세요.");
  const parsed = RfpRecordSchema.safeParse({
    schemaVersion: RFP_SCHEMA_VERSION,
    id: ctx.id,
    namespace: ctx.namespace,
    name: values.name,
    org: values.org,
    dueDate: values.due,
    budgetKrw,
    summary: values.summary,
    officialName: values.official,
    period: state.period,
    memo: values.memo,
    reviewers: state.reviewers,
    files: state.files,
    aiExtractedFields: RFP_TEXT_FIELDS.filter((field) => state.ai[field] !== undefined),
    registeredBy: { id: ctx.actor.id, name: ctx.actor.name },
    pmId: ctx.actor.id,
    departmentName: ctx.departmentName,
    status: "review",
    createdAt: ctx.now,
  });
  if (!parsed.success) throw new RfpError("invalid", "필수 항목을 확인해 주세요.", { cause: parsed.error });
  return parsed.data;
}
