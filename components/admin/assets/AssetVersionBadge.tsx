"use client";
interface AssetVersionBadgeProps {currentRevision:number;appliedRevision?:number;inactive?:boolean;deleted?:boolean}
export default function AssetVersionBadge({currentRevision,appliedRevision,inactive,deleted}:AssetVersionBadgeProps){
  return <span className="tw:inline-flex tw:flex-wrap tw:items-center tw:gap-(--layout-inline-gap) tw:text-[11px]">
    <span className="tw:rounded tw:bg-(--kpc-bg) tw:px-(--layout-control-gap) tw:py-(--layout-inline-gap)">{appliedRevision?`적용 v${appliedRevision}`:`v${currentRevision}`}</span>
    {appliedRevision&&currentRevision>appliedRevision?<span className="tw:font-semibold tw:text-(--kpc-brand)">새 버전 v{currentRevision}</span>:null}
    {(inactive||deleted)&&<span className="tw:text-(--kpc-muted)">{deleted?"삭제된 원본":"비활성"}</span>}
  </span>;
}
