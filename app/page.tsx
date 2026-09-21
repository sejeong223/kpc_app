import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appConfig } from "@/config/app";

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title={appConfig.name}
        description="새 기능을 추가할 수 있는 기본 대시보드입니다"
      />
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 시작 지점</CardTitle>
          <CardDescription>
            필요한 기능을 프로젝트 요구사항에 맞게 연결하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            중앙 앱 설정에서 이름과 메뉴를 관리하고, 공통 UI로
            화면을 구성할 수 있습니다.
          </p>
          <p>
            인증과 Azure 서비스는 필요한 환경에서만 활성화하도록
            분리되어 있습니다.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
