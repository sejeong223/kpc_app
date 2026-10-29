import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import { PROFILE_NOTIFICATION_SEED, PROFILE_PREFERENCE_DEFAULTS } from "@/config/profile-preview";
import { APP_ROLES } from "@/lib/auth/roles";
import {
  createInitialProfilePreviewState,
  formatTokenCount,
  getProfileTokenSummary,
  getUnreadNotificationCount,
  getVisibleProfileNotifications,
  profilePreviewReducer,
  resolveProfileDisplay,
  shouldHidePreviewScreen,
} from "@/lib/profile-preview";

describe("profile preview state", () => {
  it("creates independent states without sharing the seed or nested preferences", () => {
    const first = createInitialProfilePreviewState();
    const second = createInitialProfilePreviewState();
    expect(first.previewRole).toBe("super_admin");
    expect(first.selectedTab).toBe("general");
    expect(first.preferences).toEqual(PROFILE_PREFERENCE_DEFAULTS);
    expect(first.notifications).toEqual(PROFILE_NOTIFICATION_SEED);
    expect(first.notifications).not.toBe(second.notifications);
    expect(first.notifications[0]).not.toBe(second.notifications[0]);
    expect(first.notifications[0]).not.toBe(PROFILE_NOTIFICATION_SEED[0]);
    expect(first.preferences).not.toBe(second.preferences);
    expect(first.preferences).not.toBe(PROFILE_PREFERENCE_DEFAULTS);
    expect(first.tokens).not.toBe(second.tokens);
    expect(first.tokens.requestDraft).not.toBe(second.tokens.requestDraft);
  });

  it("marks one or all notifications read without altering earlier states", () => {
    const original = createInitialProfilePreviewState();
    const one = profilePreviewReducer(original, { type: "mark-notification-read", id: "n1" });
    expect(getUnreadNotificationCount(original.notifications)).toBe(2);
    expect(getUnreadNotificationCount(one.notifications)).toBe(1);
    expect(getVisibleProfileNotifications(one.notifications, "unread").map((n) => n.id)).toEqual(["n2"]);
    expect(getVisibleProfileNotifications(one.notifications, "all")).toHaveLength(4);
    const all = profilePreviewReducer(one, { type: "mark-all-notifications-read" });
    expect(getUnreadNotificationCount(all.notifications)).toBe(0);
    expect(getVisibleProfileNotifications(all.notifications, "unread")).toEqual([]);
    expect(all.notifications).toHaveLength(4);
    expect(profilePreviewReducer(all, { type: "mark-all-notifications-read" })).toBe(all);
    expect(profilePreviewReducer(one, { type: "mark-notification-read", id: "n1" })).toBe(one);
    expect(profilePreviewReducer(one, { type: "mark-notification-read", id: "unknown" })).toBe(one);
    expect(PROFILE_NOTIFICATION_SEED.filter((n) => n.unread)).toHaveLength(2);
  });

  it("preserves settings, selected tab and notification state across role changes", () => {
    let state = createInitialProfilePreviewState();
    state = profilePreviewReducer(state, { type: "set-preference", key: "comments", value: false });
    state = profilePreviewReducer(state, { type: "set-preference", key: "digest", value: "weekly" });
    state = profilePreviewReducer(state, { type: "set-preference", key: "editorView", value: "slide" });
    state = profilePreviewReducer(state, { type: "set-tab", tab: "preferences" });
    state = profilePreviewReducer(state, { type: "set-notification-filter", filter: "unread" });
    state = profilePreviewReducer(state, { type: "mark-notification-read", id: "n1" });
    const user = profilePreviewReducer(state, { type: "set-role", role: "user" });
    const admin = profilePreviewReducer(user, { type: "set-role", role: "super_admin" });
    expect(user.previewRole).toBe("user");
    expect(admin).toEqual(state);
    expect(admin.selectedTab).toBe("preferences");
    expect(admin.notificationFilter).toBe("unread");
    expect(admin.preferences).toEqual({ ...PROFILE_PREFERENCE_DEFAULTS, comments: false, digest: "weekly", editorView: "slide" });
    expect(getUnreadNotificationCount(admin.notifications)).toBe(1);
  });

  it("handles an empty notification list", () => {
    expect(getUnreadNotificationCount([])).toBe(0);
    expect(getVisibleProfileNotifications([], "all")).toEqual([]);
    expect(getVisibleProfileNotifications([], "unread")).toEqual([]);
  });

  it("delegates token actions while preserving other profile state and vice versa", () => {
    const initial = createInitialProfilePreviewState();
    const open = profilePreviewReducer(initial, { type: "token", action: { type: "open", view: "request" } });
    expect(open.tokens.dialogView).toBe("request");
    expect(open.notifications).toBe(initial.notifications);
    expect(open.preferences).toBe(initial.preferences);
    expect(open.previewRole).toBe(initial.previewRole);
    expect(open.selectedTab).toBe(initial.selectedTab);
    const reason = profilePreviewReducer(open, { type: "token", action: { type: "set-reason", value: "추가 신청" } });
    const submitted = profilePreviewReducer(reason, { type: "token", action: { type: "close" } });
    const role = profilePreviewReducer(submitted, { type: "set-role", role: "user" });
    const settings = profilePreviewReducer(role, { type: "set-preference", key: "comments", value: false });
    const read = profilePreviewReducer(settings, { type: "mark-notification-read", id: "n1" });
    expect(read.tokens).toBe(submitted.tokens);
    expect(profilePreviewReducer(read, { type: "token", action: { type: "close" } })).toBe(read);
    expect(initial.tokens.requestDraft.reason).toBe("");
  });
});

describe("token display", () => {
  it.each([
    [0, "0"], [999, "999"], [1000, "1K"], [72400, "72.4K"], [27600, "27.6K"], [100000, "100K"], [112220, "112K"],
  ] as const)("formats %s as %s", (value, expected) => {
    expect(formatTokenCount(value)).toBe(expected);
  });

  it("calculates the sample usage and remaining allowance", () => {
    expect(getProfileTokenSummary(72400, 100000)).toEqual({
      used: 72400, limit: 100000, remaining: 27600, percent: 72, progressPercent: 72, status: "warning",
    });
  });

  it.each([
    [0, 0, 100000, "normal"],
    [69000, 69, 31000, "normal"],
    [70000, 70, 30000, "warning"],
    [100000, 100, 0, "over"],
    [120000, 120, 0, "over"],
  ] as const)("handles a usage boundary at %s", (used, percent, remaining, status) => {
    const summary = getProfileTokenSummary(used, 100000);
    expect(summary).toMatchObject({ percent, remaining, status, progressPercent: Math.min(100, percent) });
  });

  it.each([[1, 0], [1, -1], [-1, 100], [NaN, 100], [Infinity, 100], [1, Infinity]])(
    "handles unavailable values used=%s limit=%s", (used, limit) => {
      const summary = getProfileTokenSummary(used, limit);
      expect(summary.status).toBe("unavailable");
      expect(Object.values(summary).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
      expect(summary.remaining).toBe(0);
    },
  );
});

function session(user: Partial<Session["user"]> = {}): Session {
  return { expires: "2099-01-01T00:00:00Z", user: { roles: [APP_ROLES.USER], ...user } };
}

describe("display roles remain separate from authentication", () => {
  it.each(["user", "super_admin"] as const)("uses the display fixture for preview %s", (previewRole) => {
    const profile = resolveProfileDisplay({ authEnabled: false, session: null, previewRole });
    expect(profile).toMatchObject({ name: "정소담", role: previewRole, isPreview: true, department: "AI사업본부" });
  });

  it("prefers the actual User role to a preview administrator", () => {
    const actual = session({ name: "  실제 사용자  ", email: "person@example.invalid" });
    expect(resolveProfileDisplay({ authEnabled: true, session: actual, previewRole: "super_admin" })).toEqual({
      name: "실제 사용자", email: "person@example.invalid", department: null, organization: "KPC", role: "user", isPreview: false,
    });
    expect(actual.user.roles).toEqual(["User"]);
  });

  it("uses the actual Admin role regardless of the preview choice", () => {
    expect(resolveProfileDisplay({ authEnabled: true, session: session({ roles: [APP_ROLES.ADMIN] }), previewRole: "user" }).role).toBe("super_admin");
  });

  it("falls back from a blank name to email, then to 사용자", () => {
    expect(resolveProfileDisplay({ authEnabled: true, session: session({ name: " ", email: " person@example.invalid " }), previewRole: "super_admin" }).name).toBe("person@example.invalid");
    expect(resolveProfileDisplay({ authEnabled: true, session: null, previewRole: "super_admin" })).toMatchObject({ name: "사용자", email: null, role: "user", isPreview: false });
  });

  it("hides only admin-required preview content from the preview user", () => {
    expect(shouldHidePreviewScreen(false, "user", APP_ROLES.ADMIN)).toBe(true);
    expect(shouldHidePreviewScreen(false, "super_admin", APP_ROLES.ADMIN)).toBe(false);
    expect(shouldHidePreviewScreen(false, "user")).toBe(false);
    expect(shouldHidePreviewScreen(false, "user", APP_ROLES.USER)).toBe(false);
    expect(shouldHidePreviewScreen(true, "user", APP_ROLES.ADMIN)).toBe(false);
  });
});
