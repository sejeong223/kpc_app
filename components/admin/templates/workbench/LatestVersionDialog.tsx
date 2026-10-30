"use client";
import { Button } from "@fluentui/react-components";
import ModalFrame from "@/components/ui/ModalFrame";
import type { WorkView } from "@/types/template-work";
interface LatestVersionDialogProps {open:boolean;view:WorkView;pending:boolean;onConfirm():void;onClose():void}
export default function LatestVersionDialog({open,view,pending,onConfirm,onClose}:LatestVersionDialogProps){
  return <ModalFrame open={open} title="최신 버전 재적용" contentKey={view.work.id} onClose={onClose} footer={<><Button disabled={pending} onClick={onClose}>취소</Button>{view.canApplyLatest&&<Button appearance="primary" disabled={pending} onClick={onConfirm}>최신 버전 적용</Button>}</>}>
    <p>현재 작업의 Template v{view.work.template.revision} / Skill v{view.work.skill.revision}을 최신 활성 버전으로 다시 적용합니다.</p>
    <p>성공하면 이 작업의 출력만 교체합니다. 실패하거나 취소하면 이전 성공 버전과 결과를 유지합니다.</p>
    <p>Template 파일이 달라지면 슬라이드 선택·역할·적용 제외·공유 편집을 새 파일의 기본값으로 초기화합니다. 같은 파일의 Template 설정이 변경되면 새 등록 매핑을 반영합니다.</p>
  </ModalFrame>;
}
