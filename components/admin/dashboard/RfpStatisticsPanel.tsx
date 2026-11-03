"use client";
import type { DashboardQuery, DashboardView } from "@/types/admin";
import RfpRegistrationPanel from "./RfpRegistrationPanel";
import RfpResultsPanel from "./RfpResultsPanel";

interface RfpStatisticsPanelProps {
  view: DashboardView; query: DashboardQuery; onChange(query: DashboardQuery): void;
  onShowList(query: DashboardQuery): void;
}
export default function RfpStatisticsPanel({ view, query, onChange, onShowList }: RfpStatisticsPanelProps): React.ReactElement {
  return <>
    <div className="tw:grid tw:items-stretch tw:gap-(--layout-section-gap) tw:lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <RfpRegistrationPanel view={view} query={query} onShowList={onShowList} />
      <RfpResultsPanel view={view} query={query} onChange={onChange} onSelectStatus={(rfpStatus) => onShowList({ ...query, rfpStatus, rfpPage: 1 })} />
    </div>
  </>;
}
