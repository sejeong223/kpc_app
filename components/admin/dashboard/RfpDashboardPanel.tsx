"use client";
import { Badge, Button } from "@fluentui/react-components";
import { AdminCard, AdminMetric } from "@/components/admin/ui/AdminPrimitives";
import { AdminBreakdown, AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import { RFP_STATUS_LABELS } from "@/config/admin-labels";
import { RfpStatusSchema } from "@/lib/admin/schemas";
import { toKoreanDay } from "@/lib/admin/dates";
import type { DashboardQuery, DashboardView, RfpStatus } from "@/types/admin";
interface RfpDashboardPanelProps { view: DashboardView; query: DashboardQuery; onChange(query: DashboardQuery): void }
const statuses: RfpStatus[] = ["review", "writing", "submitted", "won", "lost", "dropped"];
const winRate = (won: number, lost: number): string => won + lost === 0 ? "—" : (won / (won + lost) * 100).toFixed(1) + "%";
export default function RfpDashboardPanel({ view, query, onChange }: RfpDashboardPanelProps): React.ReactElement {
  const bucket = view.registrations.find((r) => r.id === query.bucketStart);
  return <>
    <AdminCard title="RFP 등록 추이 · 조회 기간 전체" actions={bucket && <Button size="small" onClick={() => onChange({ ...query, bucketStart: null, rfpPage: 1 })}>{bucket.label} 선택 해제</Button>}>
      <AdminSeriesChart label="등록 추이" kind="bar" unit="건" points={view.registrations.map((r) => ({ id: r.id, label: r.label, value: r.count, tooltip: r.from + " 이후 등록 " + r.count + "건" }))} selectedId={query.bucketStart} onSelect={(id) => onChange({ ...query, bucketStart: id, rfpPage: 1 })} />
    </AdminCard>
    <div className="tw:grid tw:gap-4 tw:lg:grid-cols-2"><AdminCard title={bucket ? bucket.label + " 등록분 · 결과 분포" : "조회 기간 전체 · 결과 분포"}>
      <AdminBreakdown label="RFP 결과 분포" items={statuses.map((id) => ({ id, label: RFP_STATUS_LABELS[id], count: view.distribution[id], failures: 0 }))} selectedId={query.rfpStatus} onSelect={(id) => { const result = RfpStatusSchema.safeParse(id); onChange({ ...query, rfpStatus: result.success ? result.data : "all", rfpPage: 1 }); }} />
    </AdminCard><div className="tw:grid tw:grid-cols-2 tw:gap-3"><AdminMetric label="선택 구간 등록" value={String(view.selectedRfpCount)} caption="건" /><AdminMetric label="선택 구간 수주율" value={winRate(view.distribution.won, view.distribution.lost)} caption="수주 / (수주 + 실패)" tone="success" /><AdminMetric label="선택 구간 수주 금액" value={(view.wonBudgetKrw / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + "억"} caption="원 · 예산 기준" tone="brand" /><AdminMetric label="선택 구간 결과 대기" value={String(view.distribution.submitted)} caption="건" /></div></div>
    <AdminCard title="부서별 RFP 현황 · 조회 기간 전체"><AdminTable label="부서별 RFP 현황" rows={view.departments} emptyMessage="해당 부서가 없습니다." columns={[
      { id: "name", label: "부서", render: (d) => <strong>{d.name}</strong> }, { id: "total", label: "등록", align: "end", render: (d) => d.total }, { id: "progress", label: "진행", align: "end", render: (d) => d.counts.review + d.counts.writing },
      { id: "submitted", label: "결과 대기", align: "end", render: (d) => d.counts.submitted }, { id: "won", label: "수주", align: "end", render: (d) => d.counts.won }, { id: "lost", label: "실패", align: "end", render: (d) => d.counts.lost }, { id: "drop", label: "진행 안함", align: "end", render: (d) => d.counts.dropped },
      { id: "rate", label: "수주율", align: "end", render: (d) => winRate(d.counts.won, d.counts.lost) }, { id: "composition", label: "결과 구성", render: (d) => <span className="tw:whitespace-nowrap tw:text-[11px]">수주 {d.counts.won} · 실패 {d.counts.lost} · 대기 {d.counts.submitted}</span> },
    ]} /></AdminCard>
    <AdminCard title={(bucket ? bucket.label + " 등록분" : "조회 기간 전체") + " · RFP 목록"} actions={query.rfpStatus !== "all" && <Button size="small" onClick={() => onChange({ ...query, rfpStatus: "all", rfpPage: 1 })}>{query.rfpStatus === "progress" ? "진행 중" : RFP_STATUS_LABELS[query.rfpStatus]} 필터 해제</Button>}>
      <AdminTable label="RFP 목록" rows={view.rfps.items} emptyMessage="조건에 맞는 RFP가 없습니다." columns={[
        { id: "number", label: "번호", render: (r) => <span className="tw:whitespace-nowrap tw:text-[11px]">{r.number}</span> }, { id: "name", label: "사업명", render: (r) => <strong className="tw:block tw:min-w-40">{r.name}</strong> },
        { id: "department", label: "부서", render: (r) => r.departmentName }, { id: "pm", label: "PM", render: (r) => r.pmName }, { id: "date", label: "등록일", render: (r) => toKoreanDay(r.registeredAt) },
        { id: "budget", label: "예산 (원)", align: "end", render: (r) => r.budgetKrw.toLocaleString("ko-KR") }, { id: "status", label: "상태", render: (r) => <Badge appearance="tint" color={r.status === "won" ? "success" : r.status === "lost" ? "danger" : "informative"}>{RFP_STATUS_LABELS[r.status]}</Badge> },
      ]} /><AdminPager {...view.rfps} onChange={(rfpPage) => onChange({ ...query, rfpPage })} />
    </AdminCard>
  </>;
}
