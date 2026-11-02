"use client";
import { ProgressBar } from "@fluentui/react-components";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import type { TokenOverview } from "@/types/admin";
import TokenPolicyForm from "./TokenPolicyForm";

interface TokenMonthSummaryProps {
  value: Pick<TokenOverview, "monthlyUsedTokens" | "monthlyLimitTokens" | "warningPercents" | "settings">;
  monthLabel: string;
  canEdit: boolean;
  isSuper: boolean;
}
export default function TokenMonthSummary({ value, monthLabel, canEdit, isSuper }: TokenMonthSummaryProps): React.ReactElement {
  const percent = value.monthlyLimitTokens > 0 ? value.monthlyUsedTokens / value.monthlyLimitTokens * 100 : null;
  const tone = percent !== null && percent >= value.warningPercents[1] ? "error" : percent !== null && percent >= value.warningPercents[0] ? "warning" : "brand";
  return <AdminCard title={isSuper ? "이번 달 전사 사용량" : "이번 달 부서 사용량"} actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">{monthLabel}</span>}>
    <div className={value.settings ? "tw:grid tw:items-start tw:gap-(--layout-section-gap) tw:lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : ""}>
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-control-gap)" aria-label="월 토큰 사용량 요약">
        <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-(--layout-control-gap) tw:tabular-nums"><strong className="tw:text-2xl tw:text-(--kpc-brand)">{value.monthlyUsedTokens.toLocaleString("ko-KR")}</strong><span>/ {value.monthlyLimitTokens.toLocaleString("ko-KR")} Token</span></div>
        <ProgressBar aria-label="월 토큰 소진율" value={percent === null ? 0 : Math.min(1, percent / 100)} color={tone} thickness="large" />
        <span>{percent === null ? "설정된 개인 한도 없음" : `${percent.toFixed(1)}% 소진`} · 경고 {value.warningPercents[0]}% / {value.warningPercents[1]}%</span>
        {!isSuper && <span className="tw:text-[11px] tw:text-(--kpc-muted)">부서 구성원의 개인 한도를 합산합니다.</span>}
      </div>
      {value.settings && <TokenPolicyForm value={value.settings} canEdit={canEdit} />}
    </div>
  </AdminCard>;
}
