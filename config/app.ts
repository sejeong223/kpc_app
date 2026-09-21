import { hasRole, type AppRole } from "@/lib/auth/roles";

export type NavigationIcon = "dashboard" | "admin";

export interface NavigationItem {
  id: string;
  label: string;
  href: `/${string}` | "/";
  icon: NavigationIcon;
  requiresAuth?: boolean;
  requiredRole?: AppRole;
}

export interface AppConfig {
  name: string;
  description: string;
  navigation: readonly NavigationItem[];
}

export const appConfig: AppConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "KPC App",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "사내 업무 애플리케이션",
  navigation: [
    {
      id: "dashboard",
      label: "대시보드",
      href: "/",
      icon: "dashboard",
    },
    {
      id: "admin",
      label: "관리자",
      href: "/admin",
      icon: "admin",
      requiresAuth: true,
      requiredRole: "Admin",
    },
  ],
};

export function getVisibleNavigation(
  items: readonly NavigationItem[],
  context: {
    authEnabled: boolean;
    authenticated: boolean;
    roles?: readonly string[];
  },
): NavigationItem[] {
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
