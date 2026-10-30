import AppShell from "@/components/layout/AppShell";
import FluentUiProvider from "@/components/providers/FluentUiProvider";
import ProfilePreviewProvider from "@/components/profile/ProfilePreviewProvider";
import TokenDialogs from "@/components/profile/token/TokenDialogs";
<<<<<<< HEAD
import AdminRuntimeProvider from "@/components/admin/AdminRuntimeProvider";
=======
import CommentsProvider from "@/components/comments/CommentsProvider";
>>>>>>> 8a0f76711582bc54b00d8eec073c851fe1c1f3e8
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
<<<<<<< HEAD
        <AdminRuntimeProvider>
        <AppShell>{children}</AppShell>
        <TokenDialogs />
        </AdminRuntimeProvider>
=======
        <CommentsProvider>
          <AppShell>{children}</AppShell>
          <TokenDialogs />
        </CommentsProvider>
>>>>>>> 8a0f76711582bc54b00d8eec073c851fe1c1f3e8
      </ProfilePreviewProvider>
    </FluentUiProvider>
  );
}
