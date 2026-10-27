import { describe, expect, it } from "vitest";

import { PROFILE_TOKEN_USAGE } from "@/config/profile-preview";
import {
  TOKEN_PROJECT_OPTIONS, TOKEN_USAGE_SNAPSHOT,
  type TokenPreviewAction, type TokenProjectId, type TokenRequestDraft,
} from "@/config/token-preview";
import {
  createInitialTokenPreviewState, estimateMonthEndUsage, getLatestPendingTokenRequest,
  getRequestedTokenAmountK, getUsageBarPercent, tokenPreviewReducer, validateTokenRequestDraft,
} from "@/lib/token-preview";

const draft: TokenRequestDraft = {
  amountChoice: "50", customAmountK: "", projectId: "mois", reason: "  검수 반영  ",
};
const submit: TokenPreviewAction & { type: "submit" } = {
  type: "submit", requestId: "req-1", submittedAt: "2026-10-27T01:00:00.000Z",
  requesterName: "정소담", department: "AI사업본부",
};
function validState() {
  return { ...createInitialTokenPreviewState(), dialogView: "request" as const, requestDraft: { ...draft } };
}

describe("token usage snapshot", () => {
  it("keeps daily and project totals consistent with the profile, and features at 100%", () => {
    const snapshot = TOKEN_USAGE_SNAPSHOT;
    expect(snapshot.daily.map((item) => item.day)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(snapshot.daily.reduce((sum, item) => sum + item.tokens, 0)).toBe(PROFILE_TOKEN_USAGE.used);
    expect(snapshot.byProject.reduce((sum, item) => sum + item.tokens, 0)).toBe(PROFILE_TOKEN_USAGE.used);
    expect(snapshot.byFeature.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
    expect(snapshot.recent).toHaveLength(6);
    expect(snapshot.recent.reduce((sum, item) => sum + item.tokens, 0)).toBeLessThan(PROFILE_TOKEN_USAGE.used);
    expect(TOKEN_PROJECT_OPTIONS.map((item) => item.id)).toEqual(["mois", "edu", "sample", "outside"]);
    expect(estimateMonthEndUsage(PROFILE_TOKEN_USAGE.used, snapshot.elapsedDays, snapshot.daysInMonth)).toBe(112220);
  });

  it.each([
    [0, 20, 31, 0], [100, 0, 31, 0], [100, -1, 31, 0],
    [100, 20.5, 31, 0], [100, 20, 19, 0], [100, 20, Infinity, 0],
    [-1, 20, 31, 0], [NaN, 20, 31, 0], [Infinity, 20, 31, 0],
    [Number.MAX_VALUE, 1, 31, 0],
  ])("handles estimate boundaries (%s, %s, %s)", (used, elapsed, total, expected) => {
    expect(estimateMonthEndUsage(used, elapsed, total)).toBe(expected);
  });

  it.each([
    [0, 10, 0], [5, 10, 50], [10, 10, 100], [20, 10, 100], [-1, 10, 0],
    [5, 0, 0], [5, -1, 0], [NaN, 10, 0], [10, Infinity, 0], [Infinity, 10, 0],
  ])("clamps bar values %s / %s", (value, max, expected) => {
    expect(getUsageBarPercent(value, max)).toBe(expected);
  });
});

describe("token request validation", () => {
  it.each(["30", "50", "100"] as const)("accepts the %sK preset", (amountChoice) => {
    const result = validateTokenRequestDraft({ ...draft, amountChoice }, 100000);
    expect(result).toEqual({
      ok: true, value: {
        amountK: Number(amountChoice), amountTokens: Number(amountChoice) * 1000,
        projectId: "mois", projectName: TOKEN_PROJECT_OPTIONS[0].name, reason: "검수 반영",
      },
    });
  });

  it.each(["70", " 70 ", "00070"])("accepts integer custom input %s", (customAmountK) => {
    expect(getRequestedTokenAmountK({ ...draft, amountChoice: "custom", customAmountK })).toBe(70);
    expect(validateTokenRequestDraft({ ...draft, amountChoice: "custom", customAmountK }, 100000).ok).toBe(true);
  });

  it.each(["", " ", "0", "-1", "1.5", ".5", "1e3", "Infinity", "NaN", "+1", "1 0",
    "9007199254740992", "9007199254741"])("rejects invalid custom input %s", (customAmountK) => {
    const value = { ...draft, amountChoice: "custom" as const, customAmountK };
    expect(getRequestedTokenAmountK(value)).toBeNull();
    expect(validateTokenRequestDraft(value, 100000)).toMatchObject({ ok: false, errors: { amount: expect.any(String) } });
  });

  it("checks token conversion and projected limit at the safe integer boundary", () => {
    const amountK = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
    const value = { ...draft, amountChoice: "custom" as const, customAmountK: String(amountK) };
    expect(validateTokenRequestDraft(value, 0).ok).toBe(true);
    expect(validateTokenRequestDraft(value, Number.MAX_SAFE_INTEGER - amountK * 1000).ok).toBe(true);
    expect(validateTokenRequestDraft(value, Number.MAX_SAFE_INTEGER - amountK * 1000 + 1).ok).toBe(false);
    expect(validateTokenRequestDraft({ ...value, customAmountK: String(amountK - 100) }, 100000).ok).toBe(true);
    expect(validateTokenRequestDraft(value, 100000)).toMatchObject({ ok: false, errors: { amount: expect.any(String) } });
  });

  it.each([NaN, Infinity, -1, 1.5])("rejects unavailable limits %s", (limit) => {
    expect(validateTokenRequestDraft(draft, limit)).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
  });

  it.each(["", " ", "가", " 가 "])("requires a trimmed reason of at least two characters: %s", (reason) => {
    expect(validateTokenRequestDraft({ ...draft, reason }, 100000)).toMatchObject({ ok: false, errors: { reason: expect.any(String) } });
  });

  it("accepts outside-project use and trims a two-character reason", () => {
    expect(validateTokenRequestDraft({ ...draft, projectId: "outside", reason: " 승인 " }, 100000)).toMatchObject({
      ok: true, value: { projectId: "outside", projectName: "프로젝트 외 사용", reason: "승인" },
    });
  });

  it("returns all field errors together and leaves the input unchanged", () => {
    const value = { ...draft, amountChoice: "custom" as const, customAmountK: "0", reason: " ",
      projectId: "unknown" as TokenProjectId };
    const before = { ...value };
    expect(validateTokenRequestDraft(value, 100000)).toEqual({
      ok: false, errors: { amount: expect.any(String), project: expect.any(String), reason: expect.any(String) },
    });
    expect(value).toEqual(before);
  });
});

describe("local token request state", () => {
  it("creates independent initial drafts and request arrays", () => {
    const first = createInitialTokenPreviewState();
    const second = createInitialTokenPreviewState();
    expect(first).toEqual({
      dialogView: null, requestDraft: { amountChoice: "50", customAmountK: "", projectId: "mois", reason: "" }, requests: [],
    });
    expect(first.requestDraft).not.toBe(second.requestDraft);
    expect(first.requests).not.toBe(second.requests);
    expect(getLatestPendingTokenRequest([])).toBeNull();
  });

  it("preserves custom text while switching presets, then resets amount/reason on reopen", () => {
    let state = tokenPreviewReducer(createInitialTokenPreviewState(), { type: "open", view: "request" });
    state = tokenPreviewReducer(state, { type: "set-project", projectId: "edu" });
    state = tokenPreviewReducer(state, { type: "set-amount", choice: "custom" });
    state = tokenPreviewReducer(state, { type: "set-custom-amount", value: "70" });
    state = tokenPreviewReducer(state, { type: "set-amount", choice: "30" });
    state = tokenPreviewReducer(state, { type: "set-amount", choice: "custom" });
    expect(state.requestDraft.customAmountK).toBe("70");
    state = tokenPreviewReducer(state, { type: "set-reason", value: "첫 사유" });
    state = tokenPreviewReducer(state, { type: "set-reason", value: "검수 의견 반영 재작성" });
    expect(state.requestDraft.reason).toBe("검수 의견 반영 재작성");
    const usage = tokenPreviewReducer(state, { type: "open", view: "usage" });
    expect(usage.requestDraft).toBe(state.requestDraft);
    const request = tokenPreviewReducer(usage, { type: "open", view: "request" });
    expect(request.requestDraft).toEqual({ amountChoice: "50", customAmountK: "", projectId: "edu", reason: "" });
    const closed = tokenPreviewReducer(request, { type: "close" });
    expect(tokenPreviewReducer(closed, { type: "close" })).toBe(closed);
    expect(tokenPreviewReducer(closed, { type: "open", view: "request" }).requestDraft).toEqual(request.requestDraft);
  });

  it("ignores edits when closed and unknown projects when open", () => {
    const closed = createInitialTokenPreviewState();
    expect(tokenPreviewReducer(closed, { type: "set-reason", value: "수정" })).toBe(closed);
    const state = validState();
    expect(tokenPreviewReducer(state, { type: "set-project", projectId: "unknown" as TokenProjectId })).toBe(state);
  });

  it("submits pending requests without granting allowance, and allows another request", () => {
    const before = { ...PROFILE_TOKEN_USAGE };
    const state = validState();
    const first = tokenPreviewReducer(state, submit);
    expect(first.dialogView).toBeNull();
    expect(first.requests).toHaveLength(1);
    expect(first.requests[0]).toMatchObject({
      id: "req-1", amountK: 50, amountTokens: 50000, requesterName: "정소담", department: "AI사업본부",
      reason: "검수 반영", status: "pending", createdAt: submit.submittedAt,
    });
    expect(state.requests).toEqual([]);
    const next = tokenPreviewReducer(tokenPreviewReducer(first, { type: "open", view: "request" }),
      { type: "set-reason", value: "두 번째 사유" });
    const second = tokenPreviewReducer(next, { ...submit, requestId: "req-2", department: null });
    expect(second.requests).toHaveLength(2);
    expect(second.requests[1]).toBe(first.requests[0]);
    expect(getLatestPendingTokenRequest(second.requests)?.id).toBe("req-2");
    expect(second.requests[0].department).toBeNull();
    expect(PROFILE_TOKEN_USAGE).toEqual(before);
    expect(tokenPreviewReducer(next, submit)).toBe(next);
  });

  it.each([
    { requestId: "" }, { requestId: " " }, { requesterName: " " },
    { submittedAt: "invalid" }, { submittedAt: "2026" }, { submittedAt: "2026-02-30T00:00:00.000Z" },
  ])("ignores invalid submission metadata %j", (invalid) => {
    const state = validState();
    expect(tokenPreviewReducer(state, { ...submit, ...invalid })).toBe(state);
  });

  it("rejects incomplete drafts and submissions outside the request dialog", () => {
    const empty = tokenPreviewReducer(createInitialTokenPreviewState(), { type: "open", view: "request" });
    expect(tokenPreviewReducer(empty, submit)).toBe(empty);
    const closed = createInitialTokenPreviewState();
    expect(tokenPreviewReducer(closed, submit)).toBe(closed);
    const usage = { ...validState(), dialogView: "usage" as const };
    expect(tokenPreviewReducer(usage, submit)).toBe(usage);
  });
});
