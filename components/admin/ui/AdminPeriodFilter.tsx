"use client";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useState } from "react";
import { PeriodSchema } from "@/lib/admin/schemas";
import type { Period } from "@/types/admin";
interface AdminPeriodFilterProps { value: Period; onChange(value: Period): void; maxDate: string; compact?: boolean }
export default function AdminPeriodFilter({ value, onChange, maxDate, compact = false }: AdminPeriodFilterProps): React.ReactElement {
  const [draft, setDraft] = useState<Period | null>(null), [error, setError] = useState("");
  function change(next: Period) { setDraft(next); const result = PeriodSchema.safeParse(next); if (!result.success) { setError("시작일·종료일과 기준일을 확인해 주세요."); return; } setError(""); setDraft(null); onChange(result.data); }
  const displayed = draft ?? value;
  const presets = [
    ...[30, 90].map(days => ({ id: String(days), label: `최근 ${days}일`, from: new Date(Date.parse(maxDate) - (days - 1) * 86400000).toISOString().slice(0, 10) })),
    { id: "year", label: "올해", from: maxDate.slice(0, 4) + "-01-01" }, { id: "all", label: "전체 기간", from: "2025-01-01" },
  ];
  return <div className={compact ? "tw:min-w-0" : "tw:min-w-0 tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset)"}>
    <DateRangeFilter value={displayed} onChange={change} maxDate={maxDate} error={error} presets={presets.map(preset => ({ ...preset, to: maxDate }))} />
  </div>;
}
