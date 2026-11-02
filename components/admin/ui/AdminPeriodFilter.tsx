"use client";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import { Button, Field, Input, Select } from "@fluentui/react-components";
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
  if (compact) return <WorkspaceToolbar align="center">
    <Field validationMessage={error} validationState={error ? "error" : "none"}>
      <Input aria-label="시작일" type="date" size="small" max={maxDate} value={displayed.from} onChange={(_, data) => change({ ...displayed, from: data.value })} />
    </Field><span aria-hidden="true">~</span>
    <Input aria-label="종료일" type="date" size="small" max={maxDate} value={displayed.to} onChange={(_, data) => change({ ...displayed, to: data.value })} />
    <Select aria-label="조회 기간" size="small" value={displayed.to === maxDate ? presets.find(preset => preset.from === displayed.from)?.id ?? "custom" : "custom"}
      onChange={(_, data) => { const preset = presets.find(preset => preset.id === data.value); if (preset) change({ from: preset.from, to: maxDate }); }}>
      {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}<option value="custom" disabled>직접 선택</option>
    </Select>
  </WorkspaceToolbar>;
  return <WorkspaceToolbar>
    <Field label="시작일" validationMessage={error} validationState={error ? "error" : "none"}><Input type="date" size="small" max={maxDate} value={displayed.from} onChange={(_, data) => change({ ...displayed, from: data.value })} /></Field>
    <Field label="종료일"><Input type="date" size="small" max={maxDate} value={displayed.to} onChange={(_, data) => change({ ...displayed, to: data.value })} /></Field>
    {[30, 90].map((days) => <Button key={days} size="small" onClick={() => change({ from: new Date(Date.parse(maxDate) - (days - 1) * 86400000).toISOString().slice(0, 10), to: maxDate })}>최근 {days}일</Button>)}
    <Button size="small" onClick={() => change({ from: maxDate.slice(0, 4) + "-01-01", to: maxDate })}>올해</Button>
    <Button size="small" onClick={() => change({ from: "2025-01-01", to: maxDate })}>전체</Button>
  </WorkspaceToolbar>;
}
