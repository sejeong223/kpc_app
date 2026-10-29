import { describe, expect, it } from "vitest";
import { createAdminSeed } from "@/config/admin-seed";
import { buildSelfUsage } from "@/lib/admin/selectors";
import { toTokenUsageSnapshot } from "@/lib/token-preview";

import { PROFILE_TOKEN_USAGE } from "@/config/profile-preview";
import {
  TOKEN_PROJECT_OPTIONS, TOKEN_USAGE_SNAPSHOT,
  type TokenProjectId, type TokenRequestDraft,
} from "@/config/token-preview";
import {
  createInitialTokenPreviewState, estimateMonthEndUsage, getLatestPendingTokenRequest,
  getRequestedTokenAmountK, getUsageBarPercent, tokenPreviewReducer, validateTokenRequestDraft,
} from "@/lib/token-preview";

const draft: TokenRequestDraft = {
  amountChoice: "50", customAmountK: "", projectId: "mois", reason: "  검수 반영  ",
};
function validState() {
  return { ...createInitialTokenPreviewState(), dialogView: "request" as const, requestDraft: { ...draft } };
}

describe("token usage snapshot", () => {
  it("새 원장의 합계를 유지하고 빈 날짜와 기능 비율을 파생한다", () => {
    const state = createAdminSeed(), self = state.users[0];
    const view = buildSelfUsage(state, { userId: self.id, name: self.name, email: self.email, role: "user", departmentId: self.departmentId });
    const snapshot = toTokenUsageSnapshot(view);
    expect(snapshot.daily).toEqual(TOKEN_USAGE_SNAPSHOT.daily);
    expect(snapshot.byProject.map((r) => r.tokens)).toEqual(TOKEN_USAGE_SNAPSHOT.byProject.map((r) => r.tokens));
    expect(snapshot.byFeature.reduce((n, r) => n + r.percent, 0)).toBe(100);
    expect(toTokenUsageSnapshot({ ...view, usedTokens: 0, usage: [] }).byFeature.every((f) => f.percent === 0)).toBe(true);
    expect(snapshot.recent.every((r) => !r.timeLabel.startsWith("10.19"))).toBe(true);
  });
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
  it("10억 한도와 1000자 사유의 경계를 검증한다", () => {
    expect(validateTokenRequestDraft({ ...draft, amountChoice: "custom", customAmountK: "1" }, 999999000).ok).toBe(true);
    expect(validateTokenRequestDraft({ ...draft, amountChoice: "custom", customAmountK: "2" }, 999999000).ok).toBe(false);
    expect(validateTokenRequestDraft({ ...draft, reason: "가".repeat(1001) }, 100000).ok).toBe(false);
  });
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
      dialogView: null, requestDraft: { amountChoice: "50", customAmountK: "", projectId: "mois", reason: "" },
    });
    expect(first.requestDraft).not.toBe(second.requestDraft);
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
});
