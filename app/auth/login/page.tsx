import { redirect } from "next/navigation";

import LoginComponent from "@/components/auth/LoginComponent";
import { serverEnv } from "@/config/env";
import { evaluateAppAccess } from "@/lib/auth/access-policy";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import AuthService from "@/services/AuthService";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    reason?: string;
  }>;
}) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const session = serverEnv.authEnabled ? await new AuthService().getSession() : null;
  const access = evaluateAppAccess({
    authEnabled: serverEnv.authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
    callbackUrl,
  });
  const reason = params.reason === "forbidden" || access.kind === "forbidden"
    ? "forbidden" : undefined;

  if (session && access.kind === "allow" && !reason) {
    redirect(callbackUrl);
  }

  return (
    <main style={{ display: "grid", minHeight: "100svh", placeItems: "center", padding: "40px 24px", background: "#fff" }}>
      <LoginComponent
        authEnabled={serverEnv.authEnabled}
        callbackUrl={callbackUrl}
        embeddedMode={serverEnv.embeddedMode}
        reason={reason}
      />
    </main>
  );
}
