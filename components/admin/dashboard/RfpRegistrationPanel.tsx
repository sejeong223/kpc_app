"use client";
import Button from "@/components/common/Button";
import { ArrowRightRegular } from "@fluentui/react-icons";
import { AdminSeriesChart } from "@/components/admin/ui/AdminCharts";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import DashboardCard from "./DashboardCard";

interface RfpRegistrationPanelProps {
  view: DashboardView; query: DashboardQuery; onShowList(query: DashboardQuery): void;
}
export default function RfpRegistrationPanel({ view, query, onShowList }: RfpRegistrationPanelProps): React.ReactElement {
  const weekly = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1 <= 120;
  return <DashboardCard title="RFP 등록 추이" actions={<Button className="ghost tw:h-7 tw:px-2 tw:text-xs" onClick={() => onShowList({ ...query, rfpStatus: "all", bucketStart: null, rfpPage: 1 })}>전체 목록 <ArrowRightRegular aria-hidden="true" /></Button>}>
    <div className="tw:flex tw:items-baseline tw:gap-2"><strong className="tw:text-2xl tw:font-semibold tw:tracking-tight tw:tabular-nums">{view.totalRfps.toLocaleString("ko-KR")}<span className="tw:ml-1 tw:text-xs tw:font-normal tw:text-(--kpc-muted)">건</span></strong><span className="tw:text-[11px] tw:text-(--kpc-secondary)">조회 기간 전체 · {weekly ? "주별" : "월별"} 등록</span></div>
    <AdminSeriesChart label={(weekly ? "주별" : "월별") + " RFP 등록"} kind="bar" unit="건" points={view.registrations.map(row => ({ id: row.id, label: row.label, value: row.count, tooltip: row.label + " 등록 " + row.count + "건" }))}
      selectedId={query.bucketStart} onSelect={bucketStart => onShowList({ ...query, bucketStart, rfpStatus: "all", rfpPage: 1 })} />
  </DashboardCard>;
}
