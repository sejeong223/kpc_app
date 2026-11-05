"use client";
import { useState } from "react";
import { DadamButton, DadamCheckbox, DadamSelect } from "@/components/ui/DadamControls";
import type { ProjectView, WorkspaceOperation } from "@/types/workspace-production";
import type { ProductionSlideRow } from "@/lib/workspace/production/presentation";
import { isTypingTarget } from "@/lib/workspace/production/editor";
import ProductionPreview from "./ProductionPreview";
export interface SlideNavigatorProps {
  view: ProjectView; rows: readonly ProductionSlideRow[]; activeId: string | null; selectedIds: readonly string[];
  snapshotId: string | null; busy: boolean;
  onSelect(id: string, mode: "single" | "toggle" | "range"): void;
  onSelectMany(ids: string[]): void; contextId: string | null; onContext(id: string | null): void;
  onCommand(operation: WorkspaceOperation): void; onCopy(ids: string[]): void;
  onPaste(sectionId: string, afterId: string | null): void; onRemove(ids: string[]): void;
  onMove(ids: string[], sectionId: string): void; canCopy(ids: readonly string[]): boolean; canPaste: boolean;
}
export default function SlideNavigator(props: SlideNavigatorProps): React.ReactElement {
  const { view, rows, activeId, selectedIds, snapshotId, busy, onSelect, onCommand, onCopy, onPaste, onRemove, onMove, canCopy, canPaste } = props;
  const [target, setTarget] = useState("");
  const editable = (ids: readonly string[]) => ids.length > 0 && ids.every(id => rows.find(r => r.slide.id === id)?.editable);
  const active = rows.find(r => r.slide.id === activeId), sectionIds = view.capabilities.editableSectionIds;
  return <section data-comment-control aria-label="슬라이드 탐색" tabIndex={0} className="tw:p-(--layout-card-inset)"
    onKeyDown={e => {
      if (busy || isTypingTarget(e.target) || e.nativeEvent.isComposing || document.querySelector("[data-modal-frame]") || !(e.target instanceof Element)) return;
      if (e.target !== e.currentTarget && !e.target.closest("[data-slide-select]")) return;
      const modifier = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (modifier && key === "a") { e.preventDefault(); props.onSelectMany(rows.map(r => r.slide.id)); }
      else if (modifier && key === "c" && canCopy(selectedIds)) { e.preventDefault(); onCopy([...selectedIds]); }
      else if (modifier && key === "v" && active?.editable && canPaste) { e.preventDefault(); onPaste(active.section.id, active.slide.id); }
      else if (modifier && key === "d" && active?.editable) { e.preventDefault(); onCommand({ type: "duplicate-slide", id: active.slide.id, targetSectionId: active.section.id, afterId: active.slide.id }); }
      else if (key === "delete" && editable(selectedIds)) { e.preventDefault(); onRemove([...selectedIds]); }
    }}>
    <h2 className="tw:mt-0 tw:text-sm">슬라이드 <span className="tw:font-normal tw:text-(--kpc-muted)">{rows.length}장</span></h2>
    <div className="tw:mb-3 tw:flex tw:flex-wrap tw:gap-1"><DadamButton size="small" disabled={busy || !rows.length} onClick={() => props.onSelectMany(rows.map(r => r.slide.id))}>모두 선택</DadamButton><DadamButton size="small" disabled={busy || !selectedIds.length} onClick={() => props.onSelectMany([])}>선택 해제</DadamButton><span className="tw:text-xs">{selectedIds.length}장 선택</span></div>
    {selectedIds.length > 0 && <div className="tw:mb-3 tw:flex tw:flex-wrap tw:gap-1">
      <DadamButton size="small" disabled={busy || !canCopy(selectedIds)} onClick={() => onCopy([...selectedIds])}>복사</DadamButton>
      {editable(selectedIds) && <><DadamButton size="small" disabled={busy} onClick={() => onRemove([...selectedIds])}>삭제</DadamButton>
        <DadamSelect aria-label="선택 슬라이드 이동할 소목차" value={target} disabled={busy} onChange={(_, d) => setTarget(d.value)}><option value="">이동할 소목차</option>{view.state.body.sections.filter(s => sectionIds.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</DadamSelect>
        <DadamButton size="small" disabled={busy || !sectionIds.includes(target)} onClick={() => onMove([...selectedIds], target)}>선택 이동</DadamButton></>}
    </div>}
    <ol className="tw:m-0 tw:list-none tw:space-y-3 tw:p-0">{rows.map(row => {
      const { slide, section, number } = row, siblings = rows.filter(r => r.section.id === section.id), index = siblings.findIndex(r => r.slide.id === slide.id);
      const menuIds = selectedIds.includes(slide.id) ? [...selectedIds] : [slide.id];
      return <li key={slide.id} onContextMenu={e => { e.preventDefault(); if (!busy) props.onContext(slide.id); }} className={"tw:rounded-lg tw:border tw:p-2 " + (selectedIds.includes(slide.id) ? "tw:border-(--kpc-brand) tw:bg-(--dadam-accent-soft)" : "tw:border-(--kpc-line)")}>
        <div className="tw:mb-1 tw:flex tw:items-center tw:gap-1"><DadamCheckbox disabled={busy} aria-label={`${number}번 슬라이드 다중 선택`} checked={selectedIds.includes(slide.id)} onChange={() => onSelect(slide.id, "toggle")} /><span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-xs">{number} · {row.sectionNumber} {section.title}</span><DadamButton size="small" disabled={busy} aria-label={`${number}번 슬라이드 더보기`} aria-expanded={props.contextId === slide.id} onClick={() => props.onContext(props.contextId === slide.id ? null : slide.id)}>⋯</DadamButton></div>
        <button type="button" data-slide-select disabled={busy} aria-current={activeId === slide.id ? "true" : undefined} aria-label={`${number}번 ${slide.content.title || "제목 없음"} 선택`} className="tw:block tw:w-full tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left" onClick={e => onSelect(slide.id, e.shiftKey ? "range" : e.ctrlKey || e.metaKey ? "toggle" : "single")}>
          <ProductionPreview view={view} slide={slide} snapshotId={snapshotId} mode="thumbnail" number={number} priority={slide.id === activeId} />
          <span className="tw:mt-1 tw:block tw:truncate tw:text-xs tw:font-semibold">{slide.content.title || "제목 없음"}</span>
        </button>
        <p className="tw:mb-0 tw:mt-1 tw:text-xs tw:text-(--kpc-muted)">{row.mine ? "내 담당 · " : ""}{section.locked ? "작성 완료 · 고정" : section.state === "done" ? "작성 완료" : "작성 중"}{!row.editable && " · 읽기 전용"}</p>
        {props.contextId === slide.id && <div role="group" aria-label={`${number}번 슬라이드 작업`} className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-1">
          <DadamButton size="small" disabled={busy || !canCopy(menuIds)} onClick={() => onCopy(menuIds)}>복사</DadamButton>
          {row.editable && <>
            <DadamButton size="small" disabled={busy || !canPaste} onClick={() => onPaste(section.id, slide.id)}>붙여넣기</DadamButton>
            <DadamButton size="small" disabled={busy} onClick={() => onCommand({ type: "duplicate-slide", id: slide.id, targetSectionId: section.id, afterId: slide.id })}>복제</DadamButton>
            <DadamButton size="small" disabled={busy || index === 0} onClick={() => onCommand({ type: "move-slide", id: slide.id, sectionId: section.id, beforeId: siblings[index - 1].slide.id })}>위로</DadamButton>
            <DadamButton size="small" disabled={busy || index === siblings.length - 1} onClick={() => onCommand({ type: "move-slide", id: slide.id, sectionId: section.id, beforeId: siblings[index + 2]?.slide.id ?? null })}>아래로</DadamButton>
          </>}
          {editable(menuIds) && <DadamButton size="small" disabled={busy} onClick={() => onRemove(menuIds)}>삭제</DadamButton>}
          <DadamButton size="small" disabled={busy} onClick={() => props.onContext(null)}>닫기</DadamButton>
        </div>}
      </li>;
    })}</ol>
    {!rows.length && <p className="tw:text-sm">등록된 슬라이드가 없습니다. 소목차를 선택해 슬라이드를 추가해 주세요.</p>}
  </section>;
}
