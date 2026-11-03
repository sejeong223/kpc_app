"use client";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamInput, DadamTextarea } from "@/components/ui/DadamControls";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { FILE_LIMITS, WEB_PERIODS } from "@/config/workspace-files";
import { normalizeWebUrl } from "@/lib/workspace/files/validation";
import FileDialogFeedback from "./FileDialogFeedback";
import type { WebReferenceDialogProps, WebReferenceDraft } from "./file-ui-types";
export default function WebReferenceDialog(props: WebReferenceDialogProps): React.ReactElement {
  const { initial, busy, onClose, onSubmit, onDirtyChange } = props;
  const [baseline] = useState<WebReferenceDraft>(() => initial ?? { url: "", period: "1y", instruction: "" });
  const [value, setValue] = useState(baseline);
  const change = (next: WebReferenceDraft) => { setValue(next); onDirtyChange(JSON.stringify(next) !== JSON.stringify(baseline)); };
  let urlError = "";
  try { normalizeWebUrl(value.url); } catch { urlError = "올바른 HTTP 또는 HTTPS 링크를 입력해 주세요."; }
  const tooLong = value.instruction.length > FILE_LIMITS.instructionLength;
  return <ModalFrame open={props.open} title={initial ? "웹 자료 설정" : "웹 링크 추가"} subtitle={props.copyToCurrent ? "과거 자료를 보존하고 현재 회차에 반영합니다." : undefined} width={640} contentKey="web-reference" onClose={onClose}
    footer={<><span className="tw:mr-auto" /><DadamButton disabled={busy} onClick={onClose}>취소</DadamButton><DadamButton appearance="primary" disabled={busy || Boolean(urlError) || tooLong} onClick={() => { void onSubmit({ ...value, url: normalizeWebUrl(value.url) }).catch(() => {}); }}>{busy ? "저장 중…" : initial ? "설정 저장" : "링크 추가"}</DadamButton></>}>
    <label className="tw:flex tw:flex-col tw:gap-(--layout-inline-gap)">링크 *<DadamInput value={value.url} disabled={busy} aria-invalid={Boolean(value.url && urlError)} placeholder="https://… 또는 mois.go.kr" onChange={(_, data) => change({ ...value, url: data.value })} />
      {value.url && urlError && <span role="alert" className="tw:text-xs tw:text-red-700">{urlError}</span>}</label>
    <div><span className="tw:mb-1 tw:block">기간</span><SegmentedControl ariaLabel="자료 참고 기간" options={WEB_PERIODS} value={value.period} disabled={busy} onChange={period => change({ ...value, period })} /></div>
    <label className="tw:flex tw:flex-col tw:gap-(--layout-inline-gap)">활용 지침<DadamTextarea value={value.instruction} rows={4} disabled={busy} aria-invalid={tooLong} placeholder="예) 최근 1년 정책 발표를 사업 배경에 활용" onChange={(_, data) => change({ ...value, instruction: data.value })} />
      <span className={tooLong ? "tw:text-xs tw:text-red-700" : "tw:text-xs tw:text-(--kpc-secondary)"}>{value.instruction.length} / 4,000자{tooLong && " · 지침을 줄여 주세요."}</span></label>
    <FileDialogFeedback {...props} />
  </ModalFrame>;
}
