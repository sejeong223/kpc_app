"use client";
import { Button } from "@fluentui/react-components";
import ModalFrame from "@/components/ui/ModalFrame";
import type { AssetRow } from "@/types/admin-assets";
import type { VersionedRef } from "@/types/admin";
interface AssetDeleteDialogProps {open:boolean;asset:AssetRow|null;pending:boolean;error:string|null;onConfirm(target:VersionedRef):void;onClose():void}
export default function AssetDeleteDialog({open,asset,pending,error,onConfirm,onClose}:AssetDeleteDialogProps){
  return <ModalFrame open={open} title="자산 삭제" contentKey={asset?.id??"delete"} onClose={()=>{if(!pending)onClose();}} footer={<><Button disabled={pending} onClick={onClose}>취소</Button>{asset?.capabilities.delete&&<Button appearance="primary" disabled={pending} onClick={()=>onConfirm({id:asset.id,version:asset.version})}>{pending?"삭제 중…":"삭제"}</Button>}</>}>
    <p><strong>{asset?.name}</strong>을 삭제합니다.</p><p>새 작업에서 선택할 수 없습니다. 기존 작업은 권한이 유지되는 동안 적용 당시 버전을 계속 사용합니다.</p>{error&&<p role="alert" className="tw:text-(--kpc-danger)">{error}</p>}
  </ModalFrame>;
}
