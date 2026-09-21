import { describe, expect, it } from "vitest";

import {
  appConfig,
  getVisibleNavigation,
  type NavigationItem,
} from "@/config/app";
import { APP_ROLES } from "@/lib/auth/roles";

const navigation: readonly NavigationItem[] = [
  {
    id: "public",
    label: "Public",
    href: "/",
    icon: "dashboard",
  },
  {
    id: "account",
    label: "Account",
    href: "/account",
    icon: "dashboard",
    requiresAuth: true,
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    icon: "admin",
    requiresAuth: true,
    requiredRole: APP_ROLES.ADMIN,
  },
];

describe("appConfig", () => {
  it("provides neutral default branding and navigation", () => {
    expect(appConfig.name).toBe("KPC App");
    expect(appConfig.description).toBe("사내 업무 애플리케이션");
    expect(appConfig.navigation).toEqual([
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
        requiredRole: APP_ROLES.ADMIN,
      },
    ]);
  });
});

describe("getVisibleNavigation", () => {
  it("hides every restricted item when authentication is disabled", () => {
    expect(
      getVisibleNavigation(navigation, {
        authEnabled: false,
        authenticated: false,
      }).map((item) => item.id),
    ).toEqual(["public"]);
  });

  it("hides authenticated items from anonymous users", () => {
    expect(
      getVisibleNavigation(navigation, {
        authEnabled: true,
        authenticated: false,
      }).map((item) => item.id),
    ).toEqual(["public"]);
  });

  it("shows ordinary authenticated items without exposing admin navigation", () => {
    expect(
      getVisibleNavigation(navigation, {
        authEnabled: true,
        authenticated: true,
        roles: [APP_ROLES.USER],
      }).map((item) => item.id),
    ).toEqual(["public", "account"]);
  });

  it("shows role-protected navigation to an administrator", () => {
    expect(
      getVisibleNavigation(navigation, {
        authEnabled: true,
        authenticated: true,
        roles: [APP_ROLES.ADMIN],
      }).map((item) => item.id),
    ).toEqual(["public", "account", "admin"]);
  });
});
