import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";

import AuthService from "@/services/AuthService";

import { buildLoginUrl, evaluateAccess, evaluateAppAccess } from "./access-policy";
import type { AppRole } from "./roles";

export async function requireAppAccess(
  callbackUrl = "/",
  options: { authService?: AuthService } = {},
): Promise<Session | null> {
  const authService = options.authService ?? new AuthService();
  if (!authService.isEnabled()) return null;

  const session = await authService.getSession();
  if (session?.error) redirect("/auth/logout");

  const decision = evaluateAppAccess({
    authEnabled: true,
    authenticated: session !== null,
    roles: session?.user.roles,
    callbackUrl,
  });

  if (decision.kind === "login" || decision.kind === "forbidden") {
    redirect(buildLoginUrl({
      callbackUrl: decision.callbackUrl,
      reason: decision.kind === "forbidden" ? "forbidden" : undefined,
    }));
  }

  return session;
}

export async function requireRole(
  requiredRole: AppRole,
  callbackUrl: string,
  options: { authService?: AuthService } = {},
): Promise<Session> {
  const authService = options.authService ?? new AuthService();
  const session = await authService.getSession();
  const decision = evaluateAccess({
    authEnabled: authService.isEnabled(),
    authenticated: session !== null,
    roles: session?.user.roles,
    requiredRole,
    callbackUrl,
  });

  switch (decision.kind) {
    case "not-found":
      notFound();
    case "login":
      redirect(buildLoginUrl({ callbackUrl: decision.callbackUrl }));
    case "forbidden":
      redirect(
        buildLoginUrl({
          callbackUrl: decision.callbackUrl,
          reason: "forbidden",
        }),
      );
    case "allow":
      if (!session) {
        throw new Error("Authenticated session is unavailable");
      }

      return session;
  }
}
