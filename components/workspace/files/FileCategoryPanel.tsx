"use client";
import { useEffect, useRef, useState } from "react";
import { mergeClasses } from "@fluentui/react-components";
import WorkspaceCard from "@/components/layout/WorkspaceCard";
import { DadamButton } from "@/components/ui/DadamControls";
import { FILE_CATEGORIES } from "@/config/workspace-files";
import type { FileCategory, FileResourceView } from "@/types/workspace-files";
import FileResourceCard, { type FileResourceCardProps } from "./FileResourceCard";
import { useFileListStyles } from "./file-list.styles";
export interface FileCategoryPanelProps extends Pick<FileResourceCardProps, "round" | "readOnly" | "onOpen" | "onEdit" | "onRemove" | "disabled"> {
  category: FileCategory; ordinal: number; resources: FileResourceView[]; canAdd: boolean;
  onAdd?(category: FileCategory): void;
  onDropFiles?(category: Exclude<FileCategory, "web">, files: File[]): void;
  orderControls?: React.ReactNode;
  onCategoryDrop?(source: FileCategory, target: FileCategory): void;
}
export const CATEGORY_DRAG_TYPE = "application/x-kpc-file-category";
export default function FileCategoryPanel({ category, ordinal, resources, canAdd, onAdd, onDropFiles, orderControls, onCategoryDrop, ...card }: FileCategoryPanelProps): React.ReactElement {
  const styles = useFileListStyles();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepth = useRef(0);
  const label = FILE_CATEGORIES.find(item => item.value === category)?.label;
  const writable = canAdd && !card.readOnly && !card.disabled;
  const canMoveCategory = !!onCategoryDrop && !card.readOnly && !card.disabled;
  const canDropFiles = writable && category !== "web" && !!onDropFiles;
  if (isDragOver && !canMoveCategory && !canDropFiles) setIsDragOver(false);
  useEffect(() => {
    const clear = () => { dragDepth.current = 0; setIsDragOver(false); };
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    window.addEventListener("blur", clear);
    return () => { window.removeEventListener("dragend", clear); window.removeEventListener("drop", clear); window.removeEventListener("blur", clear); };
  }, []);
  const accepts = (types: readonly string[]) => types.includes("Files") ? canDropFiles : types.includes(CATEGORY_DRAG_TYPE) && canMoveCategory;
  return <div className={styles.panelHost} onDragEnter={event => {
    if (accepts(event.dataTransfer.types)) { dragDepth.current += 1; setIsDragOver(true); }
  }} onDragLeave={() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setIsDragOver(false);
  }} onDragOver={event => {
    if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = canDropFiles ? "copy" : "none"; }
    else if (event.dataTransfer.types.includes(CATEGORY_DRAG_TYPE) && canMoveCategory) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }
  }} onDrop={event => {
    dragDepth.current = 0; setIsDragOver(false);
    if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); if (canDropFiles && onDropFiles) onDropFiles(category, Array.from(event.dataTransfer.files)); }
    else if (event.dataTransfer.types.includes(CATEGORY_DRAG_TYPE)) {
      event.preventDefault();
      const source = FILE_CATEGORIES.find(item => item.value === event.dataTransfer.getData(CATEGORY_DRAG_TYPE))?.value;
      if (source && canMoveCategory && onCategoryDrop) onCategoryDrop(source, category);
    }
  }}>
    <WorkspaceCard title={`${ordinal}. ${label} · ${resources.length}`} className={mergeClasses(styles.panel, isDragOver && styles.panelOver)} actions={<div className={styles.actions}>{orderControls}{onAdd && canAdd && !card.readOnly
      && <DadamButton size="small" className={styles.smallButton} disabled={card.disabled} onClick={() => onAdd(category)}>+ {category === "web" ? "웹 링크" : "파일"}</DadamButton>}</div>}>
      {resources.map(resource => <FileResourceCard key={resource.asset.id} resource={resource} {...card} />)}
      {!resources.length && <div className={styles.empty}>
        {card.readOnly ? "이 회차에 등록된 자료가 없습니다." : category === "web" ? "참고할 웹 링크를 추가하세요." : "자료를 선택하거나 여기에 놓으세요."}
      </div>}
    </WorkspaceCard>
  </div>;
}
