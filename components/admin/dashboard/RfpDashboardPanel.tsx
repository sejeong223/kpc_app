"use client";
import { DadamButton as Button } from "@/components/ui/DadamControls";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import RfpRecordsPanel from "./RfpRecordsPanel";
import RfpDepartmentsPanel from "./RfpDepartmentsPanel";
import RfpResultsPanel from "./RfpResultsPanel";

interface RfpDashboardPanelProps {
  view: DashboardView; query: DashboardQuery; onChange(query: DashboardQuery): void;
  departmentPage: number; onDepartmentPageChange(page: number): void;
  onShowList(): void; focusList: boolean; onListFocused(): void;
}
export default function RfpDashboardPanel({ view, query, onChange, departmentPage, onDepartmentPageChange, onShowList, focusList, onListFocused }: RfpDashboardPanelProps): React.ReactElement {
  const bucket = view.registrations.find(row => row.id === query.bucketStart);
  const weekly = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1 <= 120;
  return <>
    <div className="tw:grid tw:items-stretch tw:gap-(--layout-section-gap) tw:lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <AdminCard title={(weekly ? "주별" : "월별") + " RFP 등록"} actions={<Button size="small" appearance="subtle" onClick={onShowList}>RFP 목록으로 이동 ↓</Button>}>
        <AdminSeriesChart label="등록 추이" kind="bar" unit="건" points={view.registrations.map(row => ({ id: row.id, label: row.label, value: row.count, tooltip: row.from + " 이후 등록 " + row.count + "건" }))}
          selectedId={query.bucketStart} onSelect={(id) => onChange({ ...query, bucketStart: id, rfpPage: 1 })} />
      </AdminCard>
      <RfpResultsPanel view={view} query={query} onChange={onChange} />
    </div>
    <RfpDepartmentsPanel rows={view.departments} page={departmentPage} onPageChange={onDepartmentPageChange} />
    <RfpRecordsPanel rows={view.rfps} query={query} bucketLabel={bucket?.label ?? null} onChange={onChange} focusRequested={focusList} onFocused={onListFocused} />
  </>;
}
