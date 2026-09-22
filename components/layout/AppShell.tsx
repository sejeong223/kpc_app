"use client";

import { usePathname } from "next/navigation";

import type { ProvidersProps } from "@/components/providers";

import AppHeader from "./AppHeader";

type AppShellProps = ProvidersProps;

export default function AppShell({
  children,
  authEnabled,
  session,
}: AppShellProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/auth")) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen">
      <AppHeader authEnabled={authEnabled} session={session} />
      <main className="min-h-screen pt-14">{children}</main>
    </div>
  );
}
