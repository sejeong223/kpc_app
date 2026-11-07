"use client";
import { mergeClasses } from "@fluentui/react-components";
import { DadamButton, DadamSelect, DadamTextarea } from "@/components/ui/DadamControls";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { FILE_LIMITS, PROMPT_HINTS, REFERENCE_KINDS, REFERENCE_PRIORITIES } from "@/config/workspace-files";
import type { FileReferenceFieldsProps } from "./file-ui-types";
import { useFileDialogStyles } from "./file-dialog.styles";
export default function FileReferenceFields({ value, idPrefix, disabled, onChange }: FileReferenceFieldsProps): React.ReactElement {
  const styles = useFileDialogStyles();
  const tooLong = value.instruction.length > FILE_LIMITS.instructionLength;
  return <div className={styles.fieldStack}>
    <div className={styles.fields}>
      <label className={styles.field}>종류
        <DadamSelect value={value.kind} disabled={disabled} onChange={(_, data) => {
          const kind = REFERENCE_KINDS.find(item => item.value === data.value)?.value;
          if (kind) onChange({ ...value, kind });
        }}>{REFERENCE_KINDS.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</DadamSelect>
      </label>
      <div className={styles.priority}><span>우선순위</span><SegmentedControl className={styles.priorityGroup} ariaLabel="참조 우선순위" variant="chips" options={REFERENCE_PRIORITIES} value={value.priority} disabled={disabled} onChange={priority => onChange({ ...value, priority })} /></div>
    </div>
    <details>
      <summary className={styles.summary}>AI 활용 지침 (선택){value.instruction && " · 입력됨"}</summary>
      <div className={styles.instruction}>
        <label htmlFor={idPrefix + "-instruction"} className="tw:sr-only">AI 활용 지침</label>
        <DadamTextarea className={styles.textarea} id={idPrefix + "-instruction"} value={value.instruction} rows={3} disabled={disabled} aria-invalid={tooLong} aria-describedby={idPrefix + "-length"}
          placeholder="예) 3장 기술 부문에 표 형식으로 인용 / 수치는 원문 그대로 사용" onChange={(_, data) => onChange({ ...value, instruction: data.value })} />
        <span id={idPrefix + "-length"} className={mergeClasses(styles.counter, tooLong && styles.invalid)}>{value.instruction.length.toLocaleString("ko-KR")} / 4,000자{tooLong && " · 지침을 줄여 주세요."}</span>
        <div className={styles.hints}>{PROMPT_HINTS.map(hint => <DadamButton className={mergeClasses(styles.button, styles.smallButton)} size="small" key={hint} disabled={disabled}
          onClick={() => onChange({ ...value, instruction: value.instruction ? value.instruction + "\n" + hint : hint })}>+ {hint}</DadamButton>)}</div>
      </div>
    </details>
  </div>;
}
