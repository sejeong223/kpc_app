import AppShell from "@/components/layout/AppShell";
import FluentUiProvider from "@/components/providers/FluentUiProvider";
import ProfilePreviewProvider from "@/components/profile/ProfilePreviewProvider";
import TokenDialogs from "@/components/profile/token/TokenDialogs";
import AdminRuntimeProvider from "@/components/admin/AdminRuntimeProvider";
import { requireAppAccess } from "@/lib/auth/guards";

// Session and app-role checks must run for each request, including after deployment.
export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  await requireAppAccess();
  return (
    <FluentUiProvider>
      <ProfilePreviewProvider>
        <AdminRuntimeProvider>
        <AppShell>{children}</AppShell>
        <TokenDialogs />
        </AdminRuntimeProvider>
      </ProfilePreviewProvider>
    </FluentUiProvider>
  );
}
