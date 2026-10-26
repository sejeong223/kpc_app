import { appConfig } from "@/config/app";

export default function DashboardPage(): React.ReactElement {
  return (
    <section>
      <h1>{appConfig.name}</h1>
      <p>새 프로젝트의 기능을 추가할 수 있는 시작 지점입니다.</p>
      <p>인증과 Azure 서비스는 필요한 환경에서 활성화할 수 있습니다.</p>
    </section>
  );
}
