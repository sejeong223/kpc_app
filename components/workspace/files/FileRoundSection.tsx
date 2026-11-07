"use client";
import { useState } from "react";
import type { FileCategory, FileRoundView } from "@/types/workspace-files";
import { DadamButton } from "@/components/ui/DadamControls";
import { FILE_CATEGORIES } from "@/config/workspace-files";
import FileCategoryPanel, { CATEGORY_DRAG_TYPE, type FileCategoryPanelProps } from "./FileCategoryPanel";
import { getDisplayedFileResources } from "./file-round-display";
export interface FileRoundSectionProps extends Pick<FileCategoryPanelProps, "onAdd" | "onOpen" | "onEdit" | "onRemove" | "onDropFiles" | "disabled"> {
  initialOpen?:boolean; value: FileRoundView; isCurrent: boolean; snapshotId: string | null; canAdd: boolean; canReorder: boolean;
  onReorder?(order: FileCategory[]): void;
}
export default function FileRoundSection({ value, initialOpen, isCurrent, snapshotId, canAdd, canReorder, onReorder, ...callbacks }: FileRoundSectionProps): React.ReactElement {
  const [open, setOpen] = useState(initialOpen ?? (snapshotId !== null || isCurrent));
  const displayedResources = getDisplayedFileResources(value, snapshotId);
  const reorder = !value.readOnly && canReorder && onReorder ? (source: FileCategory, target: FileCategory) => {
    if (source === target || callbacks.disabled) return;
    const order = value.categoryOrder.filter(category => category !== source);
    order.splice(value.categoryOrder.indexOf(target), 0, source);
    onReorder(order);
  } : undefined;
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="tw:min-w-0">
    <summary className="tw:mb-3 tw:cursor-pointer tw:font-semibold">{value.number}차 자료 <span className="tw:ml-2 tw:text-xs tw:font-normal tw:text-(--kpc-secondary)">{snapshotId === null && isCurrent ? "현재 회차" : "보관 · 읽기 전용"} · {displayedResources.length}개</span></summary>
    <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:gap-(--layout-section-gap) tw:md:grid-cols-2 tw:xl:grid-cols-3">
      {value.categoryOrder.map((category, index) => <FileCategoryPanel key={category} category={category} ordinal={index + 1} round={value.number} readOnly={value.readOnly}
        resources={displayedResources.filter(resource => resource.version.category === category)} canAdd={canAdd} {...callbacks} onCategoryDrop={reorder}
        orderControls={reorder && <div className="tw:flex tw:gap-(--layout-inline-gap)">
          <DadamButton size="small" disabled={callbacks.disabled} draggable={!callbacks.disabled} aria-label={`${FILE_CATEGORIES.find(item => item.value === category)?.label} 참조 순서 끌어서 변경`}
            onDragStart={event => { event.dataTransfer.setData(CATEGORY_DRAG_TYPE, category); event.dataTransfer.effectAllowed = "move"; }}>⠿</DadamButton>
          <DadamButton size="small" disabled={callbacks.disabled || index === 0} aria-label={`${category} 참조 순서 앞으로 이동`} onClick={() => reorder(category, value.categoryOrder[index - 1])}>←</DadamButton>
          <DadamButton size="small" disabled={callbacks.disabled || index === value.categoryOrder.length - 1} aria-label={`${category} 참조 순서 뒤로 이동`} onClick={() => reorder(category, value.categoryOrder[index + 1])}>→</DadamButton>
        </div>} />)}
    </div>
  </details>;
}
