"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LockClosed16Regular } from "@fluentui/react-icons";
import type { ProjectView, WorkspaceOperation } from "@/types/workspace-production";
import type { ProductionSlideRow } from "@/lib/workspace/production/presentation";
import { isTypingTarget } from "@/lib/workspace/production/editor";
import ProductionPreview from "./ProductionPreview";

export interface SlideNavigatorProps {
  view: ProjectView; rows: readonly ProductionSlideRow[]; activeId: string | null; sectionId: string | null; selectedIds: readonly string[];
  snapshotId: string | null; busy: boolean; panelToggle?: React.ReactNode;
  onSelect(id: string, mode: "single" | "toggle" | "range"): void;
  onCommand(operation: WorkspaceOperation): void; onCopy(ids: string[]): void;
  onPaste(sectionId: string, afterId: string | null): void; onRemove(ids: string[]): void;
  canCopy(ids: readonly string[]): boolean; canPaste: boolean;
}
export default function SlideNavigator(props: SlideNavigatorProps): React.ReactElement {
  const { view, rows, activeId, selectedIds, snapshotId, busy, onSelect, onCommand, onCopy, onPaste, onRemove, canCopy, canPaste } = props;
  const [menu, setMenu] = useState<{ id: string | null; sectionId: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null), trigger = useRef<HTMLElement | null>(null);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const node = list.current?.querySelector<HTMLElement>("[aria-current='true']");
    if (node?.getClientRects().length) node.scrollIntoView({ block: "nearest" });
  }, [activeId]);
  const editable = (ids: readonly string[]) => ids.length > 0 && ids.every(id => rows.find(r => r.slide.id === id)?.editable);
  const active = rows.find(r => r.slide.id === activeId), menuRow = rows.find(r => r.slide.id === menu?.id);
  const menuSection = view.state.body.sections.find(section => section.id === menu?.sectionId);
  const canEditMenu = !!menuSection && view.capabilities.editableSectionIds.includes(menuSection.id);
  const menuIds = menuRow ? selectedIds.includes(menuRow.slide.id) ? [...selectedIds] : [menuRow.slide.id] : [];
  const closeMenu = (restoreFocus = true) => { setMenu(null); if (restoreFocus) trigger.current?.focus(); };
  const openEmptyMenu = (element: HTMLElement, x: number, y: number) => {
    if (busy || !props.sectionId || rows.some(row => row.section.id === props.sectionId)) return;
    trigger.current = element; setMenu({ id: null, sectionId: props.sectionId, x, y });
  };
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!menu || !element) return;
    const rect = element.getBoundingClientRect();
    element.style.left = Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)) + "px";
    element.style.top = Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)) + "px";
    element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const dismiss = () => setMenu(null);
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [menu]);
  return <section data-comment-control aria-label="슬라이드 탐색" tabIndex={0} className="tw:flex tw:h-full tw:min-h-0 tw:min-w-0 tw:flex-col"
    onKeyDown={e => {
      if (busy || menu || e.defaultPrevented || isTypingTarget(e.target) || e.nativeEvent.isComposing || document.querySelector("[data-modal-frame], [data-comment-popup]") || !(e.target instanceof Element)) return;
      if (e.target !== e.currentTarget && !e.target.closest("[data-slide-select]")) return;
      const modifier = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
      if (["arrowup", "arrowright", "arrowdown", "arrowleft"].includes(key) && !modifier && !e.altKey && !e.shiftKey && active) {
        const index = rows.findIndex(row => row.slide.id === active.slide.id);
        const next = rows[index + (key === "arrowup" || key === "arrowright" ? 1 : -1)];
        if (next) { e.preventDefault(); e.stopPropagation(); onSelect(next.slide.id, "single"); }
      }
      else if (key === "escape" && active) { e.preventDefault(); e.stopPropagation(); onSelect(active.slide.id, "single"); }
      else if (modifier && key === "c" && canCopy(selectedIds)) { e.preventDefault(); onCopy([...selectedIds]); }
      else if (modifier && key === "v" && active?.editable && canPaste) { e.preventDefault(); onPaste(active.section.id, active.slide.id); }
      else if ((key === "delete" || key === "backspace") && editable(selectedIds)) { e.preventDefault(); onRemove([...selectedIds]); }
    }}>
    <header className="tw:flex tw:min-h-11 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b tw:border-(--kpc-line) tw:px-3">
      <h2 className="tw:m-0 tw:min-w-0 tw:flex-1 tw:text-sm">슬라이드 <span className="tw:font-normal tw:text-(--kpc-muted)">{rows.length}장</span></h2>{props.panelToggle}
    </header>
    <div tabIndex={0} aria-label="슬라이드 목록" className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain tw:p-2.5"
      onContextMenu={event => { if (!(event.target as Element).closest("[data-slide-select]")) { event.preventDefault(); openEmptyMenu(event.currentTarget, event.clientX, event.clientY); } }}
      onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openEmptyMenu(event.currentTarget, rect.left, rect.top); } }}>
      <ol ref={list} className="tw:m-0 tw:list-none tw:space-y-2.5 tw:p-0">{rows.map(row => {
        const { slide, section, number } = row, siblings = rows.filter(r => r.section.id === section.id);
        const multiSelected = selectedIds.length > 1 && selectedIds.includes(slide.id), isActive = activeId === slide.id;
        const border = multiSelected ? "tw:border-2 tw:border-purple-600 tw:ring-2 tw:ring-purple-100" : isActive ? "tw:border-2 tw:border-(--dadam-accent) tw:ring-2 tw:ring-(--dadam-accent-soft)" : row.mine ? "tw:border-2 tw:border-blue-600" : "tw:border tw:border-(--kpc-line)";
        const caption = multiSelected ? "tw:bg-purple-50 tw:text-purple-700" : isActive ? "tw:bg-(--dadam-accent-soft) tw:text-(--dadam-accent-ink)" : row.mine ? "tw:bg-blue-50 tw:text-blue-700" : "tw:text-(--kpc-secondary)";
        const openMenu = (button: HTMLButtonElement, x: number, y: number) => {
          if (busy) return;
          trigger.current = button; setMenu({ id: slide.id, sectionId: section.id, x, y });
        };
        return <li key={slide.id} className={"tw:overflow-hidden tw:rounded-lg tw:bg-(--kpc-card) " + border}>
          <button type="button" data-slide-select disabled={busy} aria-current={isActive ? "true" : undefined} aria-pressed={selectedIds.includes(slide.id)}
            aria-haspopup="menu" aria-label={number + "번 " + (slide.content.title || "제목 없음") + " 선택"}
            title={row.mine ? "내가 담당한 슬라이드" : undefined}
            className="tw:block tw:w-full tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-(--dadam-accent)"
            onContextMenu={e => { e.preventDefault(); openMenu(e.currentTarget, e.clientX, e.clientY); }}
            onKeyDown={e => {
              if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
                e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); openMenu(e.currentTarget, rect.left, rect.top);
              }
            }}
            onClick={e => { closeMenu(false); onSelect(slide.id, e.shiftKey ? "range" : e.ctrlKey || e.metaKey ? "toggle" : "single"); }}>
            <ProductionPreview view={view} slide={slide} snapshotId={snapshotId} mode="thumbnail" number={number} priority={slide.id === activeId} />
            <span className={"tw:flex tw:min-w-0 tw:items-center tw:gap-1.5 tw:border-t tw:border-(--kpc-line) tw:px-2 tw:py-[5px] tw:text-[10.5px] tw:font-bold " + caption}><span className="tw:shrink-0">{number}</span>{section.locked && <LockClosed16Regular className="tw:shrink-0" aria-label="고정됨" />}
              <span className="tw:truncate">{row.sectionNumber} {section.title}{siblings.length > 1 && " · " + (siblings.findIndex(item => item.slide.id === slide.id) + 1) + "/" + siblings.length}</span>
              {row.openComments > 0 && <span aria-label={`미처리 의견 ${row.openComments}개`} className="tw:ml-auto tw:shrink-0 tw:rounded-full tw:bg-(--dadam-accent-soft) tw:px-1.5 tw:text-(--dadam-accent-ink)">{row.openComments}</span>}
            </span>
          </button>
        </li>;
      })}</ol>
      {!rows.length && <p className="tw:text-sm">{props.sectionId ? "목록을 마우스 오른쪽 버튼으로 눌러 슬라이드를 추가해 주세요." : "목차 화면에서 소목차를 먼저 추가해 주세요."}</p>}
    </div>
    {menu && menuSection && createPortal(<div ref={menuRef} role="menu" aria-label="슬라이드 작업" data-comment-control
      style={{ position: "fixed", left: menu.x, top: menu.y, zIndex: 1000, width: 224, maxWidth: "calc(100vw - 16px)" }}
      className="tw:rounded-lg tw:border tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-1 tw:shadow-lg"
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
        if (e.key === "Tab") { closeMenu(false); return; }
        const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : e.key === "ArrowDown" ? (index + 1) % buttons.length : e.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length : -1;
        if (next >= 0) { e.preventDefault(); buttons[next]?.focus(); }
      }}>
      {([
        { label: "복사", disabled: !canCopy(menuIds), run: () => onCopy(menuIds) },
        { label: "붙여넣기", disabled: !canEditMenu || !canPaste, run: () => onPaste(menuSection.id, menuRow?.slide.id ?? null) },
        { label: "삭제", disabled: !editable(menuIds), run: () => onRemove(menuIds) },
        { label: "추가", disabled: !canEditMenu, run: () => onCommand({ type: "add-slide", sectionId: menuSection.id, afterId: menuRow?.slide.id ?? null, template: null }) },
      ]).map(item => <button key={item.label} type="button" role="menuitem" disabled={busy || item.disabled}
        className="tw:block tw:w-full tw:cursor-pointer tw:rounded tw:border-0 tw:bg-transparent tw:px-3 tw:py-2 tw:text-left tw:text-sm tw:hover:bg-(--kpc-bg) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand) tw:disabled:cursor-not-allowed tw:disabled:opacity-40"
        onClick={() => { closeMenu(); item.run(); }}>{item.label}</button>)}
    </div>, document.body)}
  </section>;
}
