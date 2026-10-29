import type { AdminRole } from "@/types/admin";
import type { SidebarScreen } from "@/config/sidebar";
import type { TokenPreviewAction, TokenPreviewState } from "@/config/token-preview";

export type PreviewRole = AdminRole;
export type ProfileTab = "general" | "notifications" | "preferences";
export type NotificationFilter = "all" | "unread";
export type NotificationKind = "ai" | "comment" | "deadline" | "token";
export type DigestSchedule = "off" | "daily" | "weekly";

export interface ProfilePreferences {
  comments: boolean;
  reviews: boolean;
  deadlines: boolean;
  aiJobs: boolean;
  tokenWarnings: boolean;
  email: boolean;
  digest: DigestSchedule;
  startScreen: "pipeline" | "write";
  editorView: "doc" | "slide";
  listView: "table" | "board";
}

export interface ProfileNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  timeLabel: string;
  unread: boolean;
  targetScreen: SidebarScreen | null;
}

export interface ProfileDisplay {
  name: string;
  email: string | null;
  department: string | null;
  organization: string;
  role: PreviewRole;
  isPreview: boolean;
}

export interface ProfilePreviewState {
  previewRole: PreviewRole;
  selectedTab: ProfileTab;
  notificationFilter: NotificationFilter;
  notifications: ProfileNotification[];
  preferences: ProfilePreferences;
  tokens: TokenPreviewState;
}

export type ProfilePreferenceAction = {
  [K in keyof ProfilePreferences]: {
    type: "set-preference";
    key: K;
    value: ProfilePreferences[K];
  }
}[keyof ProfilePreferences];

export type ProfilePreviewAction =
  | { type: "set-role"; role: PreviewRole }
  | { type: "set-tab"; tab: ProfileTab }
  | { type: "set-notification-filter"; filter: NotificationFilter }
  | { type: "mark-notification-read"; id: string }
  | { type: "mark-all-notifications-read" }
  | { type: "token"; action: TokenPreviewAction }
  | ProfilePreferenceAction;

// Display-only fixtures. These values never represent a session or server grants.
export const PROFILE_PREVIEW_USER = {
  name: "정소담",
  email: "sodam.jeong@example.invalid",
  department: "AI사업본부",
  organization: "KPC",
} as const;

export const PROFILE_TOKEN_USAGE = { used: 72400, limit: 100000, warningThreshold: 70 } as const;
export const PROFILE_WORK_COUNTS = { assignedProjects: 3, openComments: 2 } as const;

export const PROFILE_NOTIFICATION_SEED: readonly Readonly<ProfileNotification>[] = [
  {
    id: "n1", kind: "ai", title: "분석 결과 예시 생성",
    description: "RFP 분석 시연 결과가 준비되었습니다. 실제 AI 분석 결과가 아닙니다.",
    timeLabel: "10분 전", unread: true, targetScreen: "analysis",
  },
  {
    id: "n2", kind: "comment", title: "댓글 알림",
    description: "김민수 님이 [3.3 보안 체계] 섹션에 새로운 댓글을 남겼습니다.",
    timeLabel: "35분 전", unread: true, targetScreen: "write",
  },
  {
    id: "n3", kind: "deadline", title: "제안서 마감 임박",
    description: "한국교육진흥원 컨설팅 사업 제안서 마감이 24일 남았습니다.",
    timeLabel: "2시간 전", unread: false, targetScreen: "pipeline",
  },
  {
    id: "n4", kind: "token", title: "AI Token 70% 사용",
    description: "이번 달 개인 한도의 70%를 넘었습니다. 필요하면 추가 신청하세요.",
    timeLabel: "어제", unread: false, targetScreen: null,
  },
];

export const PROFILE_PREFERENCE_DEFAULTS: Readonly<ProfilePreferences> = {
  comments: true,
  reviews: true,
  deadlines: true,
  aiJobs: true,
  tokenWarnings: true,
  email: false,
  digest: "daily",
  startScreen: "pipeline",
  editorView: "doc",
  listView: "table",
};
