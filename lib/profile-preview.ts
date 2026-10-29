import type { Session } from "next-auth";

import {
  PROFILE_NOTIFICATION_SEED,
  PROFILE_PREFERENCE_DEFAULTS,
  PROFILE_PREVIEW_USER,
  type NotificationFilter,
  type PreviewRole,
  type ProfileDisplay,
  type ProfileNotification,
  type ProfilePreviewAction,
  type ProfilePreviewState,
} from "@/config/profile-preview";
import { APP_ROLES, hasRole, type AppRole } from "@/lib/auth/roles";
import { createInitialTokenPreviewState, tokenPreviewReducer } from "@/lib/token-preview";

export function createInitialProfilePreviewState(): ProfilePreviewState {
  return {
    previewRole: "super_admin",
    selectedTab: "general",
    notificationFilter: "all",
    notifications: PROFILE_NOTIFICATION_SEED.map((notification) => ({ ...notification })),
    preferences: { ...PROFILE_PREFERENCE_DEFAULTS },
    tokens: createInitialTokenPreviewState(),
  };
}

export function profilePreviewReducer(
  state: ProfilePreviewState,
  action: ProfilePreviewAction,
): ProfilePreviewState {
  switch (action.type) {
    case "token": {
      const tokens = tokenPreviewReducer(state.tokens, action.action);
      return tokens === state.tokens ? state : { ...state, tokens };
    }
    case "set-role":
      return { ...state, previewRole: action.role };
    case "set-tab":
      return { ...state, selectedTab: action.tab };
    case "set-notification-filter":
      return { ...state, notificationFilter: action.filter };
    case "mark-notification-read":
      if (!state.notifications.some((item) => item.id === action.id && item.unread)) return state;
      return {
        ...state,
        notifications: state.notifications.map((item) => item.id === action.id ? { ...item, unread: false } : item),
      };
    case "mark-all-notifications-read":
      if (!state.notifications.some((item) => item.unread)) return state;
      return { ...state, notifications: state.notifications.map((item) => item.unread ? { ...item, unread: false } : item) };
    case "set-preference":
      return { ...state, preferences: { ...state.preferences, [action.key]: action.value } };
  }
}

export function getUnreadNotificationCount(notifications: readonly ProfileNotification[]): number {
  return notifications.filter((item) => item.unread).length;
}

export function getVisibleProfileNotifications(
  notifications: readonly ProfileNotification[],
  filter: NotificationFilter,
): ProfileNotification[] {
  return notifications.filter((item) => filter === "all" || item.unread);
}

export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  return value >= 1000
    ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1).replace(/\.0$/, "")}K`
    : String(Math.round(value));
}

export interface ProfileTokenSummary {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  progressPercent: number;
  status: "normal" | "warning" | "over" | "unavailable";
}

export function getProfileTokenSummary(
  used: number,
  limit: number,
  warningThreshold = 70,
): ProfileTokenSummary {
  if (!Number.isFinite(used) || used < 0 || !Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used / limit * 100)) {
    return { used: 0, limit: 0, remaining: 0, percent: 0, progressPercent: 0, status: "unavailable" };
  }
  const percent = Math.round(used / limit * 100);
  const threshold = Number.isFinite(warningThreshold) && warningThreshold >= 0 && warningThreshold <= 100
    ? warningThreshold : 70;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent,
    progressPercent: Math.min(100, Math.max(0, percent)),
    status: percent >= 100 ? "over" : percent >= threshold ? "warning" : "normal",
  };
}

export function resolveProfileDisplay({ authEnabled, session, previewRole }: {
  authEnabled: boolean;
  session: Session | null;
  previewRole: PreviewRole;
}): ProfileDisplay {
  if (!authEnabled) return { ...PROFILE_PREVIEW_USER, role: previewRole, isPreview: true };

  const email = session?.user.email?.trim() || null;
  return {
    name: session?.user.name?.trim() || email || "사용자",
    email,
    department: null,
    organization: "KPC",
    role: hasRole(session?.user.roles, APP_ROLES.ADMIN) ? "super_admin" : "user",
    isPreview: false,
  };
}

// This only hides empty preview screens; the server remains responsible for authorization.
export function shouldHidePreviewScreen(
  authEnabled: boolean,
  previewRole: PreviewRole,
  requiredRole?: AppRole,
): boolean {
  return !authEnabled && previewRole === "user" && requiredRole === APP_ROLES.ADMIN;
}
