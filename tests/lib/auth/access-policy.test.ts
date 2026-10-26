import { describe, expect, it } from "vitest";

import {
  buildLoginUrl,
  evaluateAccess,
  evaluateAppAccess,
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

describe("application entry policy", () => {
  it("allows the local workspace while authentication is disabled", () => {
    expect(evaluateAppAccess({
      authEnabled: false, authenticated: false, callbackUrl: "/",
    })).toEqual({ kind: "allow" });
  });

  it("requires login before entering an authenticated application", () => {
    expect(evaluateAppAccess({
      authEnabled: true, authenticated: false, callbackUrl: "/documents",
    })).toEqual({ kind: "login", callbackUrl: "/documents" });
  });

  it.each([APP_ROLES.USER, APP_ROLES.ADMIN])("accepts the %s app role", (role) => {
    expect(evaluateAppAccess({
      authEnabled: true, authenticated: true, roles: [role], callbackUrl: "/",
    })).toEqual({ kind: "allow" });
  });

  it.each([{ roles: undefined }, { roles: [] }, { roles: ["unknown-role"] }])("blocks sessions without an assigned app role: %j", ({ roles }) => {
    expect(evaluateAppAccess({
      authEnabled: true, authenticated: true, roles, callbackUrl: "/",
    })).toEqual({ kind: "forbidden", callbackUrl: "/" });
  });
});
