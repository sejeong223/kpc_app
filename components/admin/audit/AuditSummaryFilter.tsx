"use client";
import SegmentedControl from "@/components/ui/SegmentedControl";
import type { AuditList, AuditQuery } from "@/types/admin";

interface AuditSummaryFilterProps {
  counts?: Pick<AuditList, "successCount" | "failureCount">;
  value: AuditQuery["outcome"];
  onChange(value: AuditQuery["outcome"]): void;
}
export default function AuditSummaryFilter({ counts, value, onChange }: AuditSummaryFilterProps): React.ReactElement {
  const count = (value?: number) => value?.toLocaleString("ko-KR") ?? "—";
  return <SegmentedControl ariaLabel="활동 결과" variant="chips" value={value} onChange={onChange} options={[
    { value: "all", label: `전체 ${count(counts ? counts.successCount + counts.failureCount : undefined)}` },
    { value: "success", label: `성공 ${count(counts?.successCount)}` },
    { value: "failure", label: `실패 ${count(counts?.failureCount)}` },
  ]} />;
}
