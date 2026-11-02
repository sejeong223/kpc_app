import WorkspaceCard from "@/components/layout/WorkspaceCard";
import WorkspacePage from "@/components/layout/WorkspacePage";

import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

export default async function AdminPage(): Promise<React.ReactElement> {
  await requireRole(APP_ROLES.ADMIN, "/admin");

  return (
    <WorkspacePage title="관리자" description="워크스페이스를 관리하는 공간입니다.">
      <WorkspaceCard title="관리자 워크스페이스" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">Admin</span>}>
        <p>관리자 권한이 확인되었습니다.</p>
        <p>프로젝트에서 사용하는 관리 항목이 이 공간에 표시됩니다.</p>
      </WorkspaceCard>
    </WorkspacePage>
  );
}
