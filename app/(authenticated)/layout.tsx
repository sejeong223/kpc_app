import DadamThemeScope from "@/components/providers/DadamThemeScope";
import AppShell from "@/components/layout/AppShell";
import FluentUiProvider from "@/components/providers/FluentUiProvider";
import ProfilePreviewProvider from "@/components/profile/ProfilePreviewProvider";
import TokenDialogs from "@/components/profile/token/TokenDialogs";
import { AppToaster } from "@/components/ui/AppToast";
import AdminRuntimeProvider from "@/components/admin/AdminRuntimeProvider";
import CommentsProvider from "@/components/comments/CommentsProvider";
import ProjectHeaderProvider from "@/components/common/ProjectHeaderProvider";
import { requireAppAccess } from "@/lib/auth/guards";

// 배포 후에도 매 요청에서 세션과 앱 역할을 검사한다.
export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  await requireAppAccess();
  return (
    <FluentUiProvider>
      <ProfilePreviewProvider>
        <AdminRuntimeProvider>
          <CommentsProvider>
            <ProjectHeaderProvider><AppShell>{children}</AppShell></ProjectHeaderProvider>
            <DadamThemeScope><TokenDialogs /></DadamThemeScope>
            <DadamThemeScope><AppToaster /></DadamThemeScope>
          </CommentsProvider>
        </AdminRuntimeProvider>
      </ProfilePreviewProvider>
    </FluentUiProvider>
  );
}
