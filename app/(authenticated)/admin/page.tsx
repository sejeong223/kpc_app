import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

export default async function AdminPage(): Promise<React.ReactElement> {
  await requireRole(APP_ROLES.ADMIN, "/admin");

  return (
    <section>
      <h1>관리자</h1>
      <p>Admin 역할이 필요한 보호된 예시 페이지입니다.</p>
      <p>프로젝트별 관리 기능은 이 경로에 추가할 수 있습니다.</p>
    </section>
  );
}
