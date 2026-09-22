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
  it("provides KPC branding and the ordered global navigation", () => {
    expect(appConfig.name).toBe("KPC AI");
    expect(appConfig.description).toBe("KPC Enterprise AI 업무 플랫폼");
    expect(appConfig.headerNavigation.map((item) => item.label)).toEqual([
      "Knowledge AI",
      "AI Worker",
      "제안서 AI",
      "Custom AI",
      "AI Agent",
      "AI Community",
    ]);
    expect(appConfig.headerNavigation.find((item) => item.id === "proposal-ai")).toMatchObject({
      href: "/proposals",
    });
    expect(appConfig.headerNavigation.some((item) => item.id === "admin")).toBe(false);
    expect(appConfig.profileNavigation.some((item) => item.id === "proposal-ai")).toBe(false);
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
