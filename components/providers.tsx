"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { createContext, useContext, useMemo } from "react";

export interface AuthRuntimeContextValue {
  authEnabled: boolean;
  session: Session | null;
}

export const AuthRuntimeContext = createContext<AuthRuntimeContextValue | null>(null);

export interface ProvidersProps {
  children: React.ReactNode;
  authEnabled: boolean;
  session: Session | null;
}

export default function Providers({
  children,
  authEnabled,
  session,
}: ProvidersProps): React.ReactElement {
  const runtime = useMemo(
    () => ({ authEnabled, session }),
    [authEnabled, session],
  );

  return (
    <AuthRuntimeContext.Provider value={runtime}>
      <SessionProvider
        refetchInterval={authEnabled ? 15 * 60 : 0}
        refetchOnWindowFocus={authEnabled}
        session={session}
      >
        {children}
      </SessionProvider>
    </AuthRuntimeContext.Provider>
  );
}

export function useAuthRuntime(): AuthRuntimeContextValue {
  const runtime = useContext(AuthRuntimeContext);
  if (!runtime) {
    throw new Error("useAuthRuntime must be used within Providers");
  }
  return runtime;
}
