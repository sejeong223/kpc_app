"use client";
import { DocumentRegular, GlobeRegular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import ReferencePriorityBadge from "./ReferencePriorityBadge";
import FileResourceMeta from "./FileResourceMeta";
import type { FileResourceView } from "@/types/workspace-files";
export interface FileResourceCardProps {
  resource: FileResourceView; round: number; readOnly: boolean; disabled?: boolean;
  onOpen?(resource: FileResourceView, round: number): void;
  onEdit?(resource: FileResourceView, round: number): void;
  onRemove?(resource: FileResourceView): void;
}
export default function FileResourceCard({ resource, round, readOnly, disabled, onOpen, onEdit, onRemove }: FileResourceCardProps): React.ReactElement {
  const { version } = resource;
  const source = version.source;
  return <article className={"tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset) " + (version.priority === "excluded" ? "tw:opacity-65" : "")}>
    <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-(--layout-control-gap)">
      <span className="tw:mt-1 tw:shrink-0 tw:text-(--dadam-accent-ink)" aria-hidden="true">{source.type === "file" ? <DocumentRegular /> : <GlobeRegular />}</span>
      <div className="tw:min-w-0 tw:flex-1">
        {onOpen ? <button type="button" className="tw:w-full tw:cursor-pointer tw:break-words tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:font-semibold tw:text-inherit tw:[overflow-wrap:anywhere] tw:hover:underline" onClick={() => onOpen(resource, round)}>{version.label}</button>
          : <strong className="tw:block tw:break-words tw:[overflow-wrap:anywhere]">{version.label}</strong>}
        <FileResourceMeta resource={resource}/>
      </div>
    </div>
    <div className="tw:my-2 tw:flex tw:flex-wrap tw:gap-1 tw:text-xs">
      <ReferencePriorityBadge priority={version.priority}/>
      {resource.isInherited && <span className="tw:rounded tw:bg-(--kpc-bg) tw:px-2 tw:py-1">이전 회차 계승</span>}
    </div>
    {version.instruction && <p className="tw:my-2 tw:line-clamp-2 tw:break-words tw:text-xs tw:text-(--kpc-secondary)">{version.instruction}</p>}
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap)">
      <div className="tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">
        {resource.canManage && onEdit && <DadamButton size="small" disabled={disabled} onClick={() => onEdit(resource, round)}>{readOnly ? "현재 회차에서 편집" : resource.isInherited ? "현재 회차로 복사하여 수정" : "설정"}</DadamButton>}
        {resource.canManage && !readOnly && onRemove && <DadamButton size="small" disabled={disabled} onClick={() => onRemove(resource)}>삭제</DadamButton>}
      </div>
    </div>
  </article>;
}
