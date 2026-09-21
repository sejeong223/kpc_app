import { describe, expect, it } from "vitest";

import {
  buildLoginUrl,
  evaluateAccess,
} from "@/lib/auth/access-policy";
import { APP_ROLES } from "@/lib/auth/roles";

describe("access policy", () => {
  it.each([
    { authenticated: false, roles: undefined },
    { authenticated: true, roles: [APP_ROLES.ADMIN] },
  ])("hides protected features when auth is disabled", (identity) => {
    expect(
      evaluateAccess({
        authEnabled: false,
        requiredRole: APP_ROLES.ADMIN,
        callbackUrl: "/admin",
        ...identity,
      }),
    ).toEqual({ kind: "not-found" });
  });

  it("sends anonymous users to login", () => {
    expect(
      evaluateAccess({
        authEnabled: true,
        authenticated: false,
        requiredRole: APP_ROLES.ADMIN,
        callbackUrl: "/admin/permissions",
      }),
    ).toEqual({ kind: "login", callbackUrl: "/admin/permissions" });
  });

  it("marks authenticated users without Admin as forbidden", () => {
    expect(
      evaluateAccess({
        authEnabled: true,
        authenticated: true,
        roles: [APP_ROLES.USER],
        requiredRole: APP_ROLES.ADMIN,
        callbackUrl: "/admin/permissions",
      }),
    ).toEqual({ kind: "forbidden", callbackUrl: "/admin/permissions" });
  });

  it("allows an administrator", () => {
    expect(
      evaluateAccess({
        authEnabled: true,
        authenticated: true,
        roles: [APP_ROLES.ADMIN],
        requiredRole: APP_ROLES.ADMIN,
        callbackUrl: "/admin",
      }),
    ).toEqual({ kind: "allow" });
  });

  it("encodes callback and optional reason query values", () => {
    expect(
      buildLoginUrl({ callbackUrl: "/admin/a?tab=users&sort=name" }),
    ).toBe(
      "/auth/login?callbackUrl=%2Fadmin%2Fa%3Ftab%3Dusers%26sort%3Dname",
    );
    expect(
      buildLoginUrl({
        callbackUrl: "/admin",
        reason: "forbidden",
      }),
    ).toBe("/auth/login?reason=forbidden&callbackUrl=%2Fadmin");
  });
});
