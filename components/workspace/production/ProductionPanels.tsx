"use client";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeftRegular, ChevronRightRegular, SlideMultipleRegular, EditRegular, DocumentSearchRegular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import { resolveProductionPanelWidths, useProductionPanels } from "@/hooks/workspace/use-production-panels";
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
  const displayed = resolveProductionPanelWidths(s, width);
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
    if (pending?.namespace === namespace) buttons.current[pending.target]?.focus({ preventScroll: true });
  }, [s.leftOpen, s.rightOpen, s.mobilePanel, namespace]);
  const toggle = (side: "left" | "right", open: boolean) => {
    pendingFocus.current = { namespace, target: `${side}${open ? "Close" : "Open"}` };
    update(side === "left" ? { leftOpen: open } : { rightOpen: open });
  };
  const backToEditor = () => {
    pendingFocus.current = { namespace, target: "editor" };
    update({ mobilePanel: "editor" });
  };
  const collapseButton = (side: "left" | "right") => <>
    <span className="tw:hidden tw:shrink-0 tw:@min-[761px]:inline-flex"><DadamButton type="button" data-comment-control size="small" appearance="subtle"
      ref={node => { buttons.current[`${side}Close`] = node; }} aria-controls={side === "left" ? leftId : rightId} aria-expanded={side === "left" ? s.leftOpen : s.rightOpen}
      aria-label={`${side === "left" ? "슬라이드 목록" : "출처"} 접기`} title={`${side === "left" ? "슬라이드 목록" : "출처"} 접기`}
      icon={side === "left" ? <ChevronLeftRegular /> : <ChevronRightRegular />} onClick={() => toggle(side, false)} /></span>
    <span className="tw:inline-flex tw:shrink-0 tw:@min-[761px]:hidden"><DadamButton type="button" data-comment-control size="small" appearance="subtle"
      aria-label="편집으로 돌아가기" title="편집으로 돌아가기" aria-controls={editorId}
      icon={side === "left" ? <ChevronRightRegular /> : <ChevronLeftRegular />} onClick={backToEditor} /></span>
  </>;
  const rail = (side: "left" | "right") => {
    const open = side === "left" ? s.leftOpen : s.rightOpen, label = side === "left" ? "슬라이드 목록" : "출처";
    return <div data-comment-control className={"tw:hidden tw:w-10 tw:shrink-0 tw:flex-col tw:items-center tw:gap-3 tw:border-x tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:py-2.5" + (open ? "" : " tw:@min-[761px]:flex")}>
      <DadamButton type="button" size="small" appearance="subtle" ref={node => { buttons.current[`${side}Open`] = node; }}
        aria-label={`${label} 펼치기`} title={`${label} 펼치기`} aria-expanded={open} aria-controls={side === "left" ? leftId : rightId}
        icon={side === "left" ? <ChevronRightRegular /> : <ChevronLeftRegular />} onClick={() => toggle(side, true)} />
      <span aria-hidden="true" className="tw:text-xs tw:text-(--kpc-muted)" style={{ writingMode: "vertical-rl" }}>{label}</span>
    </div>;
  };
  const pointer = useRef<{ id: number; x: number } | null>(null);
  const resizeVisible = (side: "left" | "right", delta: number) => resize(side, delta + displayed[side] - (side === "left" ? s.leftWidth : s.rightWidth));
  const restore = (side: "left" | "right") => update(side === "left" ? { leftWidth: 240 } : { rightWidth: 360 });
  const splitter = (side: "left" | "right") => <div data-comment-control role="separator" tabIndex={0} aria-orientation="vertical" aria-label={`${side === "left" ? "슬라이드" : "출처"} 패널 크기`}
    title="드래그 또는 좌우 방향키로 너비 조절 · Home 또는 더블클릭으로 기본 너비 복원"
    aria-valuenow={displayed[side]} aria-valuemin={side === "left" ? 150 : 280} aria-valuemax={side === "left" ? 480 : 680}
    className={"tw:relative tw:hidden tw:w-[6px] tw:box-border tw:shrink-0 tw:touch-none tw:cursor-col-resize tw:border-x tw:border-(--kpc-line) tw:bg-(--kpc-bg) tw:hover:bg-(--dadam-accent-soft) tw:focus-visible:outline-2 tw:after:absolute tw:after:top-1/2 tw:after:left-px tw:after:h-7 tw:after:w-0.5 tw:after:-translate-y-1/2 tw:after:rounded tw:after:bg-(--kpc-muted) " + (side === "left" ? "tw:@min-[761px]:block" : "tw:@min-[1180px]:block")}
    onDoubleClick={() => restore(side)}
    onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (e.key === "Home") restore(side); else resizeVisible(side, (e.key === "ArrowRight" ? 10 : -10) * (side === "left" ? 1 : -1)); } }}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); pointer.current = { id: e.pointerId, x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => { const p = pointer.current; if (p?.id !== e.pointerId) return; resizeVisible(side, (e.clientX - p.x) * (side === "left" ? 1 : -1)); p.x = e.clientX; }}
    onPointerUp={e => { pointer.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
    onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }} />;
  const panel = " tw:box-border tw:min-h-0 tw:bg-(--kpc-card)";
  return <div ref={root} className="tw:@container tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col tw:overflow-hidden">
    <div data-comment-control role="group" aria-label="제작 패널 선택" className="tw:mb-(--layout-control-gap) tw:flex tw:shrink-0 tw:gap-1 tw:@min-[761px]:hidden">
      {(["slides", "editor", "sources"] as const).map((name, i) => <DadamButton key={name} type="button" size="small" appearance="subtle"
        ref={name === "editor" ? node => { buttons.current.editor = node; } : undefined}
        aria-label={["슬라이드 목록 보기", "편집 보기", "출처 보기"][i]} title={["슬라이드 목록 보기", "편집 보기", "출처 보기"][i]}
        aria-controls={[leftId, editorId, rightId][i]} aria-pressed={s.mobilePanel === name}
        icon={[<SlideMultipleRegular key="slides" />, <EditRegular key="editor" />, <DocumentSearchRegular key="sources" />][i]}
        onClick={() => update({ mobilePanel: name })} />)}
    </div>
    <div className="tw:relative tw:flex tw:min-h-0 tw:min-w-0 tw:flex-1 tw:items-stretch" style={{ "--production-left": `${displayed.left}px`, "--production-right": `${displayed.right}px` } as CSSProperties}>
      {rail("left")}
      <aside id={leftId} aria-label="슬라이드 목록" className={(s.mobilePanel === "slides" ? "tw:block" : "tw:hidden") + " " + (s.leftOpen ? "tw:@min-[761px]:block" : "tw:@min-[761px]:hidden") + " tw:w-full tw:min-w-0 tw:shrink-0 tw:overflow-hidden tw:@min-[761px]:w-(--production-left)" + panel}>{left(collapseButton("left"))}</aside>
      {s.leftOpen && splitter("left")}
      <section id={editorId} aria-label="슬라이드 편집" className={(s.mobilePanel === "editor" ? "tw:flex" : "tw:hidden") + " tw:box-border tw:min-h-0 tw:min-w-0 tw:flex-1 tw:flex-col tw:overflow-hidden tw:@min-[761px]:flex"}>{center}</section>
      {s.rightOpen && splitter("right")}
      <aside id={rightId} aria-label="출처" className={(s.mobilePanel === "sources" ? "tw:block" : "tw:hidden") + " " + (s.rightOpen ? "tw:@min-[761px]:block" : "tw:@min-[761px]:hidden") + " tw:w-full tw:min-w-0 tw:shrink-0 tw:overflow-hidden tw:@min-[761px]:absolute tw:@min-[761px]:inset-y-0 tw:@min-[761px]:right-0 tw:@min-[761px]:z-10 tw:@min-[761px]:w-(--production-right) tw:@min-[761px]:shadow-xl tw:@min-[1180px]:static tw:@min-[1180px]:shadow-none" + panel}>{right(collapseButton("right"))}</aside>
      {rail("right")}
    </div>
  </div>;
}
