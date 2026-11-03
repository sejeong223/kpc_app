"use client";
import WorkspaceCard from "@/components/layout/WorkspaceCard";
import { DadamButton } from "@/components/ui/DadamControls";
import { FILE_CATEGORIES } from "@/config/workspace-files";
import type { FileCategory, FileResourceView } from "@/types/workspace-files";
import FileResourceCard, { type FileResourceCardProps } from "./FileResourceCard";
export interface FileCategoryPanelProps extends Pick<FileResourceCardProps, "round" | "readOnly" | "onOpen" | "onEdit" | "onRemove" | "disabled"> {
  category: FileCategory; ordinal: number; resources: FileResourceView[]; canAdd: boolean;
  onAdd?(category: FileCategory): void;
  onDropFiles?(category: Exclude<FileCategory, "web">, files: File[]): void;
  orderControls?: React.ReactNode;
  onCategoryDrop?(source: FileCategory, target: FileCategory): void;
}
export const CATEGORY_DRAG_TYPE = "application/x-kpc-file-category";
export default function FileCategoryPanel({ category, ordinal, resources, canAdd, onAdd, onDropFiles, orderControls, onCategoryDrop, ...card }: FileCategoryPanelProps): React.ReactElement {
  const label = FILE_CATEGORIES.find(item => item.value === category)?.label;
  const writable = canAdd && !card.readOnly && !card.disabled;
  return <div className="tw:min-w-0" onDragOver={event => {
    if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = writable && category !== "web" ? "copy" : "none"; }
    else if (event.dataTransfer.types.includes(CATEGORY_DRAG_TYPE) && onCategoryDrop && !card.disabled) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
  }} onDrop={event => {
    if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); if (writable && category !== "web" && onDropFiles) onDropFiles(category, Array.from(event.dataTransfer.files)); }
    else if (event.dataTransfer.types.includes(CATEGORY_DRAG_TYPE)) {
      event.preventDefault();
      const source = FILE_CATEGORIES.find(item => item.value === event.dataTransfer.getData(CATEGORY_DRAG_TYPE))?.value;
      if (source && onCategoryDrop && !card.readOnly && !card.disabled) onCategoryDrop(source, category);
    }
  }}>
    <WorkspaceCard title={`${ordinal}. ${label} · ${resources.length}`} className="tw:h-full" actions={<div className="tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">{orderControls}{onAdd && canAdd && !card.readOnly
      && <DadamButton size="small" disabled={card.disabled} onClick={() => onAdd(category)}>+ {category === "web" ? "웹 링크" : "파일"}</DadamButton>}</div>}>
      {resources.map(resource => <FileResourceCard key={resource.asset.id} resource={resource} {...card} />)}
      {!resources.length && <div className="tw:flex tw:min-h-32 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-dashed tw:border-(--kpc-line) tw:p-(--layout-card-inset) tw:text-center tw:text-(--kpc-secondary)">
        {card.readOnly ? "이 회차에 등록된 자료가 없습니다." : category === "web" ? "참고할 웹 링크를 추가하세요." : "자료를 선택하거나 여기에 놓으세요."}
      </div>}
    </WorkspaceCard>
  </div>;
}
