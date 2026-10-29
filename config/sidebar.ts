import { APP_ROLES, hasRole, type AppRole } from "@/lib/auth/roles";
import type { PreviewRole } from "@/config/profile-preview";

export type SidebarScreen =
  | "register"
  | "pipeline"
  | "analysis"
  | "files"
  | "toc"
  | "setup"
  | "write"
  | "prompt-sets"
  | "skills"
  | "templates"
  | "policy"
  | "tokens"
  | "users"
  | "dashboard"
  | "audit";

export type SidebarIcon =
  | "document-add"
  | "clipboard"
  | "analysis"
  | "upload"
  | "list"
  | "settings"
  | "edit"
  | "prompts"
  | "skills"
  | "template"
  | "policy"
  | "tokens"
  | "users"
  | "dashboard"
  | "history";

export interface SidebarNavigationItem {
  id: SidebarScreen;
  label: string;
  href: `/workspace/${SidebarScreen}`;
  icon: SidebarIcon;
  requiredRole?: AppRole;
}

export interface SidebarNavigationGroup {
  id: "proposal" | "project" | "admin";
  items: readonly SidebarNavigationItem[];
}

export interface SidebarNavigationContext {
  authEnabled: boolean;
  authenticated: boolean;
  roles?: readonly string[];
  previewRole?: PreviewRole;
}

function navigationItem(
  id: SidebarScreen,
  label: string,
  icon: SidebarIcon,
  requiredRole?: AppRole,
): SidebarNavigationItem {
  return {
    id,
    label,
    href: `/workspace/${id}`,
    icon,
    ...(requiredRole ? { requiredRole } : {}),
  };
}

export const sidebarGroups: readonly SidebarNavigationGroup[] = [
  {
    id: "proposal",
    items: [
      navigationItem("register", "RFP 등록", "document-add"),
      navigationItem("pipeline", "검토 목록", "clipboard"),
    ],
  },
  {
    id: "project",
    items: [
      navigationItem("analysis", "AI 분석", "analysis"),
      navigationItem("files", "파일 업로드", "upload"),
      navigationItem("toc", "목차", "list"),
      navigationItem("setup", "제작 설정", "settings"),
      navigationItem("write", "제작", "edit"),
    ],
  },
  {
    id: "admin",
    items: [
      navigationItem("prompt-sets", "프롬프트 세트", "prompts", APP_ROLES.ADMIN),
      navigationItem("skills", "Skill", "skills", APP_ROLES.ADMIN),
      navigationItem("templates", "Template", "template", APP_ROLES.ADMIN),
      navigationItem("policy", "모델·토큰 관리", "policy", APP_ROLES.ADMIN),      navigationItem("users", "사용자 설정", "users", APP_ROLES.ADMIN),
      navigationItem("dashboard", "대시보드", "dashboard", APP_ROLES.ADMIN),
      navigationItem("audit", "활동 로그", "history", APP_ROLES.ADMIN),
    ],
  },
];

const sidebarItems = sidebarGroups.flatMap((group) => group.items);

export function getVisibleSidebarGroups(
  context: SidebarNavigationContext,
): SidebarNavigationGroup[] {
  if (context.authEnabled && !context.authenticated) return [];

  // 미리보기 역할은 mock 화면의 범위만 바꾸며 실제 인증은 세션 역할로 검사한다.
  return sidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          context.authEnabled
            ? !item.requiredRole || hasRole(context.roles, item.requiredRole)
            : !item.requiredRole || (context.previewRole ?? "super_admin") !== "user",
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function getSidebarItemByScreen(
  screen: string,
): SidebarNavigationItem | undefined {
  return sidebarItems.find((item) => item.id === (screen === "tokens" ? "policy" : screen));
}

export function getSidebarItemByPathname(
  pathname: string,
): SidebarNavigationItem | undefined {
  return sidebarItems.find((item) => item.href === (pathname === "/workspace/tokens" ? "/workspace/policy" : pathname));
}
