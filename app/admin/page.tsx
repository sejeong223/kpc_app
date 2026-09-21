import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

export default async function AdminPage() {
  await requireRole(APP_ROLES.ADMIN, "/admin");

  return (
    <PageContainer>
      <PageHeader
        title="관리자"
        description="Admin 역할이 필요한 보호된 예시 화면입니다"
      />
      <Card>
        <CardHeader>
          <CardTitle>보호된 관리자 예시</CardTitle>
          <CardDescription>
            메뉴 노출과 무관하게 서버에서 역할을 다시 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          프로젝트별 관리 기능은 이 페이지를 기준으로 추가할 수
          있습니다.
        </CardContent>
      </Card>
    </PageContainer>
  );
}
