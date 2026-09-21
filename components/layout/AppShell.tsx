"use client";

import { usePathname } from "next/navigation";

import type { ProvidersProps } from "@/components/providers";

import AppSidebar from "./AppSidebar";

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
    <div className="flex h-screen overflow-hidden">
      <AppSidebar authEnabled={authEnabled} session={session} />
      <main className="min-w-0 flex-1 overflow-y-auto transition-[margin] duration-300">
        {children}
      </main>
    </div>
  );
}
