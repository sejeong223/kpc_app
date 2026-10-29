"use client";
import { Button, Field, Input } from "@fluentui/react-components";
import { useState } from "react";
import { PeriodSchema } from "@/lib/admin/schemas";
import type { Period } from "@/types/admin";
interface AdminPeriodFilterProps { value: Period; onChange(value: Period): void; maxDate: string }
export default function AdminPeriodFilter({ value, onChange, maxDate }: AdminPeriodFilterProps): React.ReactElement {
  const [draft, setDraft] = useState<Period | null>(null), [error, setError] = useState("");
  function change(next: Period) { setDraft(next); const result = PeriodSchema.safeParse(next); if (!result.success) { setError("시작일·종료일과 기준일을 확인해 주세요."); return; } setError(""); setDraft(null); onChange(result.data); }
  const displayed = draft ?? value;
  return <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-2">
    <Field label="시작일" validationMessage={error} validationState={error ? "error" : "none"}><Input type="date" size="small" max={maxDate} value={displayed.from} onChange={(_, data) => change({ ...displayed, from: data.value })} /></Field>
    <Field label="종료일"><Input type="date" size="small" max={maxDate} value={displayed.to} onChange={(_, data) => change({ ...displayed, to: data.value })} /></Field>
    {[30, 90].map((days) => <Button key={days} size="small" onClick={() => change({ from: new Date(Date.parse(maxDate) - (days - 1) * 86400000).toISOString().slice(0, 10), to: maxDate })}>최근 {days}일</Button>)}
    <Button size="small" onClick={() => change({ from: maxDate.slice(0, 4) + "-01-01", to: maxDate })}>올해</Button>
    <Button size="small" onClick={() => change({ from: "2025-01-01", to: maxDate })}>전체</Button>
  </div>;
}
