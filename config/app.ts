import { hasRole, type AppRole } from "@/lib/auth/roles";

export interface HeaderNavigationItem {
  id: string;
  label: string;
  href: `/${string}` | "/";
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
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Azure App Template",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Azure 기반 업무 애플리케이션 템플릿",
  headerNavigation: [
    {
      id: "home",
      label: "홈",
      href: "/",
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
