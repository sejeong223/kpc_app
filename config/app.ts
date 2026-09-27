import { hasRole, type AppRole } from "@/lib/auth/roles";

export interface HeaderNavigationItem {
  id: string;
  label: string;
  href?: `/${string}` | "/";
  isMock?: boolean;
  requiresAuth?: boolean;
  requiredRole?: AppRole;
}

export interface AppConfig {
  name: string;
  description: string;
  headerNavigation: readonly HeaderNavigationItem[];
  profileNavigation: readonly HeaderNavigationItem[];
}

export const appConfig: AppConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "KPC AI",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "KPC Enterprise AI 업무 플랫폼",
  headerNavigation: [
    {
      id: "knowledge_ai",
      label: "Knowledge AI",
      isMock: true,
    },
    {
      id: "ai_worker",
      label: "AI Worker",
      isMock: true,
    },
    {
      id: "proposals",
      label: "제안서 AI",
      href: "/proposals",
    },
    {
      id: "custom_ai",
      label: "Custom AI",
      isMock: true,
    },
    {
      id: "ai_agent",
      label: "AI Agent",
      isMock: true,
    },
    {
      id: "ai_community",
      label: "AI Community",
      isMock: true,
    },
  ],
  profileNavigation: [
    {
      id: "admin",
      label: "관리자",
      href: "/admin",
      requiresAuth: true,
      requiredRole: "Admin",
    },
  ],
};

export function getVisibleNavigation(
  items: readonly HeaderNavigationItem[],
  context: {
    authEnabled: boolean;
    authenticated: boolean;
    roles?: readonly string[];
  },
): HeaderNavigationItem[] {
  // Menu filtering is a UX convenience. Server-side authorization remains
  // responsible for protecting every restricted route.
  return items.filter((item) => {
    const isRestricted = item.requiresAuth || item.requiredRole !== undefined;

    if (!context.authEnabled && isRestricted) {
      return false;
    }

    if (item.requiresAuth && !context.authenticated) {
      return false;
    }

    if (
      item.requiredRole &&
      (!context.authenticated || !hasRole(context.roles, item.requiredRole))
    ) {
      return false;
    }

    return true;
  });
}
