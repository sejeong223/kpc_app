"use client";

import { useId } from "react";
import { DadamInput, DadamSelect } from "./DadamControls";

export interface DateRangeValue { from: string; to: string }
export interface DateRangePreset extends DateRangeValue { id: string; label: string }
export interface DateRangeFilterProps {
  value: DateRangeValue;
  presets: readonly DateRangePreset[];
  maxDate?: string;
  disabled?: boolean;
  compact?: boolean;
  error?: string;
  onChange(value: DateRangeValue): void;
}

export default function DateRangeFilter({ value, presets, maxDate, disabled, compact = false, error, onChange }: DateRangeFilterProps): React.ReactElement {
  const id = useId();
  const size = compact ? "small" : "medium";
  const dateWidth = compact ? "tw:w-[132px] tw:max-w-full" : "tw:w-40 tw:max-w-full";
  const presetId = presets.find(preset => preset.from === value.from && preset.to === value.to)?.id ?? "custom";
  return <fieldset disabled={disabled} className="tw:m-0 tw:min-w-0 tw:border-0 tw:p-0">
    <legend className="tw:sr-only">조회 기간 설정</legend>
    <div className={"tw:flex tw:flex-wrap tw:items-center " + (compact ? "tw:gap-(--layout-inline-gap)" : "tw:gap-(--layout-control-gap)")}>
      {!compact && <span aria-hidden="true" className="tw:text-sm tw:text-(--dadam-control-ink)">기간</span>}
      <DadamInput aria-label="시작일" type="date" size={size} className={dateWidth} max={maxDate}
        disabled={disabled} value={value.from} aria-invalid={Boolean(error)} aria-describedby={error ? id + "-error" : undefined}
        onChange={(_, data) => onChange({ ...value, from: data.value })} />
      <span aria-hidden="true" className="tw:text-(--kpc-muted)">~</span>
      <DadamInput aria-label="종료일" type="date" size={size} className={dateWidth} max={maxDate}
        disabled={disabled} value={value.to} aria-invalid={Boolean(error)} aria-describedby={error ? id + "-error" : undefined}
        onChange={(_, data) => onChange({ ...value, to: data.value })} />
      <DadamSelect aria-label="조회 기간" size={size} className={compact ? "tw:w-28 tw:max-w-full" : "tw:w-36 tw:max-w-full"} disabled={disabled} value={presetId}
        onChange={(_, data) => { const preset = presets.find(option => option.id === data.value); if (preset) onChange({ from: preset.from, to: preset.to }); }}>
        {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        <option value="custom" disabled>직접 선택</option>
      </DadamSelect>
    </div>
    {error && <p id={id + "-error"} role="alert" className="tw:mb-0 tw:mt-(--layout-inline-gap) tw:text-xs tw:text-(--kpc-danger)">{error}</p>}
  </fieldset>;
}
