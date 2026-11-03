"use client";
import { DadamButton as Button } from "@/components/ui/DadamControls";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import RfpDepartmentsPanel from "./RfpDepartmentsPanel";
import RfpResultsPanel from "./RfpResultsPanel";

interface RfpStatisticsPanelProps {
  view: DashboardView; query: DashboardQuery; onChange(query: DashboardQuery): void;
  departmentPage: number; onDepartmentPageChange(page: number): void;
  onShowList(query: DashboardQuery): void;
}
export default function RfpStatisticsPanel({ view, query, onChange, departmentPage, onDepartmentPageChange, onShowList }: RfpStatisticsPanelProps): React.ReactElement {
  const weekly = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1 <= 120;
  return <>
    <div className="tw:grid tw:items-stretch tw:gap-(--layout-section-gap) tw:lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <AdminCard title={(weekly ? "주별" : "월별") + " RFP 등록"} actions={<Button size="small" appearance="subtle" onClick={() => onShowList(query)}>RFP 목록 보기</Button>}>
        <AdminSeriesChart label="등록 추이" kind="bar" unit="건" points={view.registrations.map(row => ({ id: row.id, label: row.label, value: row.count, tooltip: row.from + " 이후 등록 " + row.count + "건" }))}
          selectedId={query.bucketStart} onSelect={(id) => onShowList({ ...query, bucketStart: id, rfpPage: 1 })} />
      </AdminCard>
      <RfpResultsPanel view={view} query={query} onChange={onChange} onSelectStatus={(rfpStatus) => onShowList({ ...query, rfpStatus, rfpPage: 1 })} />
    </div>
    <RfpDepartmentsPanel rows={view.departments} page={departmentPage} onPageChange={onDepartmentPageChange} />
  </>;
}
