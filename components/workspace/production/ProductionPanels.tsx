"use client";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeftRegular, ChevronRightRegular, SlideMultipleRegular, EditRegular, DocumentSearchRegular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import { useProductionPanels } from "@/hooks/workspace/use-production-panels";
import { resolveProductionPanelLayout } from "@/lib/workspace/production/panel-layout";
interface ProductionPanelsProps {
  namespace: string;
  left(toggleButton: React.ReactNode): React.ReactNode;
  center: React.ReactNode;
  right(toggleButton: React.ReactNode): React.ReactNode;
}
type FocusTarget = "leftClose" | "leftOpen" | "rightClose" | "rightOpen" | "editor";
export default function ProductionPanels({ namespace, left, center, right }: ProductionPanelsProps) {
  const { state: s, update, resize } = useProductionPanels(namespace);
  const root = useRef<HTMLDivElement>(null), [width, setWidth] = useState(0);
  const mode = resolveProductionPanelLayout(s, width).mode;
  const [compact, setCompact] = useState({ namespace, mode, rightOpen: false });
  // A compact visit is temporary; never overwrite the saved wide-screen preference.
  const sameVisit = compact.namespace === namespace && compact.mode === mode;
  if (!sameVisit) setCompact({ namespace, mode, rightOpen: false });
  const displayed = resolveProductionPanelLayout(s, width, { compactRightOpen: sameVisit && compact.rightOpen });
  const mobile = displayed.mode === "mobile";
  const leftPanel = useRef<HTMLElement>(null), rightPanel = useRef<HTMLElement>(null), editorPanel = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const node = root.current; if (!node) return;
    let frame = 0;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setWidth(node.clientWidth)); };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(node); window.addEventListener("resize", measure); measure();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const id = useId(), leftId = `${id}-slides`, rightId = `${id}-sources`, editorId = `${id}-editor`;
  const buttons = useRef<Partial<Record<FocusTarget, HTMLButtonElement | HTMLAnchorElement | null>>>({});
  const pendingFocus = useRef<{ namespace: string; target: FocusTarget } | null>(null);
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    if (pending?.namespace === namespace) {
      buttons.current[pending.target]?.focus({ preventScroll: true });
      return;
    }
    // Only move focus when the currently focused panel has actually been hidden.
    const active = document.activeElement;
    if (!displayed.leftOpen && leftPanel.current?.contains(active)) buttons.current[mobile ? "editor" : "leftOpen"]?.focus({ preventScroll: true });
    else if (!displayed.rightOpen && rightPanel.current?.contains(active)) buttons.current[mobile ? "editor" : "rightOpen"]?.focus({ preventScroll: true });
    else if (mobile && s.mobilePanel !== "editor" && editorPanel.current?.contains(active)) buttons.current.editor?.focus({ preventScroll: true });
  }, [displayed.leftOpen, displayed.rightOpen, mobile, s.mobilePanel, namespace]);
  const toggle = (side: "left" | "right", open: boolean) => {
    pendingFocus.current = { namespace, target: `${side}${open ? "Close" : "Open"}` };
    if (mode === "compact" && (side === "right" || (side === "left" && open && width < 762))) {
      setCompact({ namespace, mode, rightOpen: side === "right" && open });
    }
    update(side === "left" ? { leftOpen: open } : { rightOpen: open });
  };
  const backToEditor = () => {
    pendingFocus.current = { namespace, target: "editor" };
    update({ mobilePanel: "editor" });
  };
  const collapseButton = (side: "left" | "right") => <>
    <span className="tw:shrink-0" style={{ display: mobile ? "none" : "inline-flex" }}><DadamButton type="button" data-comment-control size="small" appearance="subtle"
      ref={node => { buttons.current[`${side}Close`] = node; }} aria-controls={side === "left" ? leftId : rightId} aria-expanded={side === "left" ? displayed.leftOpen : displayed.rightOpen}
      aria-label={`${side === "left" ? "슬라이드 목록" : "출처"} 접기`} title={`${side === "left" ? "슬라이드 목록" : "출처"} 접기`}
      icon={side === "left" ? <ChevronLeftRegular /> : <ChevronRightRegular />} onClick={() => toggle(side, false)} /></span>
    <span className="tw:shrink-0" style={{ display: mobile ? "inline-flex" : "none" }}><DadamButton type="button" data-comment-control size="small" appearance="subtle"
      aria-label="편집으로 돌아가기" title="편집으로 돌아가기" aria-controls={editorId}
      icon={side === "left" ? <ChevronRightRegular /> : <ChevronLeftRegular />} onClick={backToEditor} /></span>
  </>;
  const rail = (side: "left" | "right") => {
    const open = side === "left" ? displayed.leftOpen : displayed.rightOpen, label = side === "left" ? "슬라이드 목록" : "출처";
    return <div data-comment-control style={{ display: mobile || open ? "none" : "flex", width: displayed[side === "left" ? "leftRail" : "rightRail"] }} className="tw:box-border tw:shrink-0 tw:flex-col tw:items-center tw:gap-3 tw:border-x tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:py-2.5">
      <DadamButton type="button" size="small" appearance="subtle" ref={node => { buttons.current[`${side}Open`] = node; }}
        aria-label={`${label} 펼치기`} title={`${label} 펼치기`} aria-expanded={open} aria-controls={side === "left" ? leftId : rightId}
        icon={side === "left" ? <ChevronRightRegular /> : <ChevronLeftRegular />} onClick={() => toggle(side, true)} />
      <span aria-hidden="true" className="tw:text-xs tw:text-(--kpc-muted)" style={{ writingMode: "vertical-rl" }}>{label}</span>
    </div>;
  };
  const pointer = useRef<{ id: number; x: number } | null>(null);
  const resizeMax = (side: "left" | "right") => Math.min(side === "left" ? 480 : 680, displayed[side] + Math.max(0, displayed.center - 320));
  const resizeVisible = (side: "left" | "right", delta: number) => {
    const next = Math.max(side === "left" ? 150 : 280, Math.min(resizeMax(side), displayed[side] + delta));
    resize(side, next - (side === "left" ? s.leftWidth : s.rightWidth));
  };
  const restore = (side: "left" | "right") => update(side === "left" ? { leftWidth: 240 } : { rightWidth: 360 });
  const splitter = (side: "left" | "right") => <div data-comment-control role="separator" tabIndex={0} aria-orientation="vertical" aria-label={`${side === "left" ? "슬라이드" : "출처"} 패널 크기`}
    title="드래그 또는 좌우 방향키로 너비 조절 · Home 또는 더블클릭으로 기본 너비 복원"
    aria-valuenow={displayed[side]} aria-valuemin={side === "left" ? 150 : 280} aria-valuemax={resizeMax(side)}
    className="tw:relative tw:w-[6px] tw:box-border tw:shrink-0 tw:touch-none tw:cursor-col-resize tw:border-x tw:border-(--kpc-line) tw:bg-(--kpc-bg) tw:hover:bg-(--dadam-accent-soft) tw:focus-visible:outline-2 tw:after:absolute tw:after:top-1/2 tw:after:left-px tw:after:h-7 tw:after:w-0.5 tw:after:-translate-y-1/2 tw:after:rounded tw:after:bg-(--kpc-muted)"
    onDoubleClick={() => restore(side)}
    onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (e.key === "Home") restore(side); else resizeVisible(side, (e.key === "ArrowRight" ? 10 : -10) * (side === "left" ? 1 : -1)); } }}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); pointer.current = { id: e.pointerId, x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => { const p = pointer.current; if (p?.id !== e.pointerId) return; resizeVisible(side, (e.clientX - p.x) * (side === "left" ? 1 : -1)); p.x = e.clientX; }}
    onPointerUp={e => { pointer.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
    onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }} />;
  const panel = " tw:box-border tw:min-h-0 tw:bg-(--kpc-card)";
  return <div ref={root} data-production-mode={mode} className="tw:@container tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col tw:overflow-hidden">
    <div data-comment-control role="group" aria-label="제작 패널 선택" style={{ display: mobile ? "flex" : "none" }} className="tw:mb-(--layout-control-gap) tw:shrink-0 tw:gap-1">
      {(["slides", "editor", "sources"] as const).map((name, i) => <DadamButton key={name} type="button" size="small" appearance="subtle"
        ref={name === "editor" ? node => { buttons.current.editor = node; } : undefined}
        aria-label={["슬라이드 목록 보기", "편집 보기", "출처 보기"][i]} title={["슬라이드 목록 보기", "편집 보기", "출처 보기"][i]}
        aria-controls={[leftId, editorId, rightId][i]} aria-pressed={s.mobilePanel === name}
        icon={[<SlideMultipleRegular key="slides" />, <EditRegular key="editor" />, <DocumentSearchRegular key="sources" />][i]}
        onClick={() => update({ mobilePanel: name })} />)}
    </div>
    <div className="tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:items-stretch">
      {rail("left")}
      <aside ref={leftPanel} id={leftId} aria-label="슬라이드 목록" style={{ display: displayed.leftOpen ? "block" : "none", width: displayed.left }} className={"tw:min-w-0 tw:shrink-0 tw:overflow-hidden" + panel}>{left(collapseButton("left"))}</aside>
      {!mobile && displayed.leftOpen && splitter("left")}
      <section ref={editorPanel} id={editorId} aria-label="슬라이드 편집" style={{ display: !mobile || s.mobilePanel === "editor" ? "flex" : "none" }} className="tw:box-border tw:min-h-0 tw:min-w-0 tw:max-w-full tw:flex-1 tw:flex-col tw:overflow-hidden">{center}</section>
      {!mobile && displayed.rightOpen && splitter("right")}
      <aside ref={rightPanel} id={rightId} aria-label="출처" style={{ display: displayed.rightOpen ? "block" : "none", width: displayed.right }} className={"tw:min-w-0 tw:shrink-0 tw:overflow-hidden" + panel}>{right(collapseButton("right"))}</aside>
      {rail("right")}
    </div>
  </div>;
}
