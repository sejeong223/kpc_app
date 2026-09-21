import { notFound, redirect } from "next/navigation";

import LoginComponent from "@/components/auth/LoginComponent";
import { serverEnv } from "@/config/env";
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
  if (!serverEnv.authEnabled) {
    notFound();
  }

  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const reason = params.reason === "forbidden" ? "forbidden" : undefined;
  const session = await new AuthService().getSession();

  if (session && !reason) {
    redirect(callbackUrl);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <LoginComponent
        callbackUrl={callbackUrl}
        embeddedMode={serverEnv.embeddedMode}
        reason={reason}
      />
    </main>
  );
}
