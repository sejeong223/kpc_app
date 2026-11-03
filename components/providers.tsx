"use client";

import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
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

type AuthRuntimeBridgeProps = Pick<ProvidersProps, "children" | "authEnabled">;

function AuthRuntimeBridge({ children, authEnabled }: AuthRuntimeBridgeProps): React.ReactElement {
  const { data, status } = useSession();
  const runtime = useMemo(
    () => ({ authEnabled, session: authEnabled && status !== "unauthenticated" && !data?.error ? data : null }),
    [authEnabled, data, status],
  );
  return <AuthRuntimeContext.Provider value={runtime}>{children}</AuthRuntimeContext.Provider>;
}

export default function Providers({ children, authEnabled, session }: ProvidersProps): React.ReactElement {
  return (
    <SessionProvider
      refetchInterval={authEnabled ? 15 * 60 : 0}
      refetchOnWindowFocus={authEnabled}
      session={session}
    >
      <AuthRuntimeBridge authEnabled={authEnabled}>{children}</AuthRuntimeBridge>
    </SessionProvider>
  );
}

export function useAuthRuntime(): AuthRuntimeContextValue {
  const runtime = useContext(AuthRuntimeContext);
  if (!runtime) {
    throw new Error("useAuthRuntime must be used within Providers");
  }
  return runtime;
}
