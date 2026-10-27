import AppShell from "@/components/layout/AppShell";
import FluentUiProvider from "@/components/providers/FluentUiProvider";
import { requireAppAccess } from "@/lib/auth/guards";

// Session and app-role checks must run for each request, including after deployment.
export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  await requireAppAccess();
  return (
    <FluentUiProvider>
      <AppShell>{children}</AppShell>
    </FluentUiProvider>
  );
}
