"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export interface ProvidersProps {
  children: React.ReactNode;
  authEnabled: boolean;
  session: Session | null;
}

export default function Providers({
  children,
  authEnabled,
  session,
}: ProvidersProps) {
  if (!authEnabled) {
    return <>{children}</>;
  }

  return (
    <SessionProvider
      refetchInterval={15 * 60}
      refetchOnWindowFocus
      session={session}
    >
      {children}
    </SessionProvider>
  );
}
