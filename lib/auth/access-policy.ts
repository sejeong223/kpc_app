import type { AppRole } from "./roles";
import { hasRole, normalizeRoles } from "./roles";

export type AccessDecision =
  | { kind: "allow" }
  | { kind: "not-found" }
  | { kind: "login"; callbackUrl: string }
  | { kind: "forbidden"; callbackUrl: string };

export function evaluateAppAccess(input: {
  authEnabled: boolean;
  authenticated: boolean;
  roles?: readonly string[];
  callbackUrl: string;
}): Exclude<AccessDecision, { kind: "not-found" }> {
  if (!input.authEnabled) return { kind: "allow" };
  if (!input.authenticated) return { kind: "login", callbackUrl: input.callbackUrl };
  if (normalizeRoles(input.roles).length === 0) {
    return { kind: "forbidden", callbackUrl: input.callbackUrl };
  }
  return { kind: "allow" };
}

export function evaluateAccess(input: {
  authEnabled: boolean;
  authenticated: boolean;
  roles?: readonly string[];
  requiredRole: AppRole;
  callbackUrl: string;
}): AccessDecision {
  if (!input.authEnabled) {
    return { kind: "not-found" };
  }

  if (!input.authenticated) {
    return { kind: "login", callbackUrl: input.callbackUrl };
  }

  if (!hasRole(input.roles, input.requiredRole)) {
    return { kind: "forbidden", callbackUrl: input.callbackUrl };
  }

  return { kind: "allow" };
}

export function buildLoginUrl(input: {
  callbackUrl: string;
  reason?: "forbidden";
}): string {
  const searchParams = new URLSearchParams();

  if (input.reason) {
    searchParams.set("reason", input.reason);
  }

  searchParams.set("callbackUrl", input.callbackUrl);
  return `/auth/login?${searchParams.toString()}`;
}
