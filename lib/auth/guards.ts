import { notFound, redirect } from "next/navigation";
import type { Session } from "next-auth";

import AuthService from "@/services/AuthService";

import { buildLoginUrl, evaluateAccess } from "./access-policy";
import type { AppRole } from "./roles";

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
