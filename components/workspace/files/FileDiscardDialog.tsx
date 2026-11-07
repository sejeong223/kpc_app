"use client";
import ModalFrame, { type ModalFrameProps } from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
export interface FileDiscardDialogProps {
  open: boolean; onKeep(): void; onDiscard(): void; onSave?(): void; busy?: boolean; error?: string | null;
  slotClassNames?: ModalFrameProps["slotClassNames"];
  buttonClassName?: string;
}
export default function FileDiscardDialog({ open, onKeep, onDiscard, onSave, busy=false, error, slotClassNames, buttonClassName }: FileDiscardDialogProps): React.ReactElement {
  return <ModalFrame open={open} title="저장하지 않은 변경 사항이 있습니다" contentKey="discard-file-draft" slotClassNames={slotClassNames} onClose={()=>{if(!busy)onKeep();}}
    footer={<><span className="tw:mr-auto" /><DadamButton className={buttonClassName} disabled={busy} onClick={onKeep}>계속 편집</DadamButton><DadamButton className={buttonClassName} disabled={busy} onClick={onDiscard}>버리고 계속</DadamButton>{onSave&&<DadamButton appearance="primary" disabled={busy} onClick={onSave}>{busy?"저장 중…":"저장하고 계속"}</DadamButton>}</>}>
    <p>이동하기 전에 입력 내용을 확인해 주세요. 저장에 실패하면 입력한 내용을 유지합니다.</p>{error&&<p role="alert" className="tw:text-red-700">{error}</p>}
  </ModalFrame>;
}
