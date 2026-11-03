"use client";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
export default function FileDiscardDialog({ open, onKeep, onDiscard }: { open: boolean; onKeep(): void; onDiscard(): void }): React.ReactElement {
  return <ModalFrame open={open} title="입력한 내용을 버릴까요?" contentKey="discard-file-draft" onClose={onKeep}
    footer={<><span className="tw:mr-auto" /><DadamButton onClick={onKeep}>계속 편집</DadamButton><DadamButton appearance="primary" onClick={onDiscard}>버리고 계속</DadamButton></>}>
    <p>저장하지 않은 설정과 대기 중인 파일이 사라집니다. 이미 저장된 자료는 유지됩니다.</p>
  </ModalFrame>;
}
