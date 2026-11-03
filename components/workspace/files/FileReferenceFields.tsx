"use client";
import { DadamButton, DadamSelect, DadamTextarea } from "@/components/ui/DadamControls";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { FILE_LIMITS, PROMPT_HINTS, REFERENCE_KINDS, REFERENCE_PRIORITIES } from "@/config/workspace-files";
import type { FileReferenceFieldsProps } from "./file-ui-types";
export default function FileReferenceFields({ value, idPrefix, disabled, onChange }: FileReferenceFieldsProps): React.ReactElement {
  const tooLong = value.instruction.length > FILE_LIMITS.instructionLength;
  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
    <div className="tw:grid tw:grid-cols-1 tw:gap-(--layout-section-gap) tw:sm:grid-cols-[1fr_2fr]">
      <label className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-inline-gap)">종류
        <DadamSelect value={value.kind} disabled={disabled} onChange={(_, data) => {
          const kind = REFERENCE_KINDS.find(item => item.value === data.value)?.value;
          if (kind) onChange({ ...value, kind });
        }}>{REFERENCE_KINDS.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</DadamSelect>
      </label>
      <div className="tw:min-w-0"><span className="tw:mb-1 tw:block">우선순위</span><SegmentedControl ariaLabel="참조 우선순위" variant="chips" options={REFERENCE_PRIORITIES} value={value.priority} disabled={disabled} onChange={priority => onChange({ ...value, priority })} /></div>
    </div>
    <details>
      <summary className="tw:cursor-pointer tw:text-(--dadam-accent-ink)">AI 활용 지침 (선택){value.instruction && " · 입력됨"}</summary>
      <div className="tw:mt-2 tw:flex tw:flex-col tw:gap-(--layout-control-gap)">
        <label htmlFor={idPrefix + "-instruction"} className="tw:sr-only">AI 활용 지침</label>
        <DadamTextarea id={idPrefix + "-instruction"} value={value.instruction} rows={3} disabled={disabled} aria-invalid={tooLong} aria-describedby={idPrefix + "-length"}
          placeholder="예) 3장 기술 부문에 표 형식으로 인용 / 수치는 원문 그대로 사용" onChange={(_, data) => onChange({ ...value, instruction: data.value })} />
        <span id={idPrefix + "-length"} className={tooLong ? "tw:text-xs tw:text-red-700" : "tw:text-xs tw:text-(--kpc-secondary)"}>{value.instruction.length} / 4,000자{tooLong && " · 지침을 줄여 주세요."}</span>
        <div className="tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">{PROMPT_HINTS.map(hint => <DadamButton size="small" key={hint} disabled={disabled}
          onClick={() => onChange({ ...value, instruction: value.instruction ? value.instruction + "\n" + hint : hint })}>+ {hint}</DadamButton>)}</div>
      </div>
    </details>
  </div>;
}
