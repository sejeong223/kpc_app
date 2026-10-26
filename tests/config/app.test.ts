import { describe, expect, it } from "vitest";

import {
  appConfig,
  getVisibleNavigation,
  type HeaderNavigationItem,
} from "@/config/app";
import { APP_ROLES } from "@/lib/auth/roles";

const navigation: readonly HeaderNavigationItem[] = [
  {
    id: "public",
    label: "Public",
    href: "/",
  },
  {
    id: "account",
    label: "Account",
    href: "/account",
    requiresAuth: true,
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    requiresAuth: true,
    requiredRole: APP_ROLES.ADMIN,
  },
];

describe("appConfig", () => {
  it("provides neutral branding and routes only to the home page", () => {
    expect(appConfig.name).toBe("Azure App Template");
    expect(appConfig.description).toBe("Azure 기반 업무 애플리케이션 템플릿");
    expect(appConfig.headerNavigation).toEqual([
      { id: "home", label: "홈", href: "/" },
    ]);
    expect(appConfig.profileNavigation).toEqual([
      {
        id: "admin",
        label: "관리자",
        href: "/admin",
        requiresAuth: true,
        requiredRole: APP_ROLES.ADMIN,
      },
    ]);
  });

  it("keeps admin navigation in the role-filtered profile menu", () => {
    expect(
      getVisibleNavigation(appConfig.profileNavigation, {
        authEnabled: true,
        authenticated: true,
        roles: [APP_ROLES.USER],
      }),
    ).toEqual([]);
    expect(
      getVisibleNavigation(appConfig.profileNavigation, {
        authEnabled: true,
        authenticated: true,
        roles: [APP_ROLES.ADMIN],
      }).map((item) => item.href),
    ).toEqual(["/admin"]);
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
