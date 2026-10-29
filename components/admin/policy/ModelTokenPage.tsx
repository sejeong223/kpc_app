"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminTabs from "@/components/admin/ui/AdminTabs";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { useAdminAccess } from "@/hooks/admin/use-admin-data";
import ModelDefaultsPanel from "./ModelDefaultsPanel";
import PricingPanel from "./PricingPanel";
import TokenOverviewPanel from "./TokenOverviewPanel";
import TokenRequestsPanel from "./TokenRequestsPanel";
interface ModelTokenPageProps { requestedTab: "models" | "tokens" | null }
export default function ModelTokenPage({ requestedTab }: ModelTokenPageProps): React.ReactElement {
  const router = useRouter(), access = useAdminAccess();
  const isSuper = access.data?.actor.role === "super_admin";
  const tab = isSuper ? requestedTab ?? "models" : "tokens";
  useEffect(() => { if (access.data && requestedTab !== tab) router.replace("/workspace/policy?tab=" + tab, { scroll: false }); }, [access.data, requestedTab, tab, router]);
  if (!access.data) return <AdminAsyncState state="loading" />;
  const grants = access.data.grants;
  return <AdminPage title="모델·토큰 관리" description={isSuper ? "업무별 모델과 사용량, 토큰 정책을 한곳에서 관리합니다." : "우리 부서 사용량과 토큰 추가 신청을 확인합니다."}>
    <AdminTabs label="모델·토큰 관리 탭" value={tab} options={isSuper ? [{ value: "models", label: "모델 설정" }, { value: "tokens", label: "토큰·비용 관리" }] : [{ value: "tokens", label: "토큰·비용 관리" }]} onChange={(value) => router.push("/workspace/policy?tab=" + value, { scroll: false })} />
    {tab === "models" ? <>{grants.modelSettings.read ? <ModelDefaultsPanel /> : <AdminAsyncState state="forbidden" message="모델 설정 조회 권한이 없습니다." />}{grants.pricing.read && <PricingPanel />}</> : <>
      {grants.tokenPolicies.read && <TokenOverviewPanel />}{grants.tokenRequests.read && <TokenRequestsPanel />}
      {!grants.tokenPolicies.read && !grants.tokenRequests.read && <AdminAsyncState state="forbidden" />}
    </>}
  </AdminPage>;
}
