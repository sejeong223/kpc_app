"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import { useProductionPanels } from "@/hooks/workspace/use-production-panels";
export default function ProductionPanels({ namespace, left, center, right }: { namespace: string; left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  const { state: s, update, resize, reset } = useProductionPanels(namespace), root = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number } | null>(null), [height, setHeight] = useState(620);
  useEffect(() => {
    let frame = 0;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      if (!root.current) return;
      const viewport = window.visualViewport, bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const next = Math.max(420, Math.floor(bottom - root.current.getBoundingClientRect().top - 12));
      setHeight(previous => previous === next ? previous : next);
    }); };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    const header = root.current?.closest("[data-comment-surface]")?.querySelector("[data-production-header]");
    if (header) observer?.observe(header);
    window.addEventListener("resize", measure); window.visualViewport?.addEventListener("resize", measure); measure();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("resize", measure); };
  }, []);
  const splitter = (side: "left" | "right") => <div data-comment-control role="separator" tabIndex={0} aria-orientation="vertical" aria-label={`${side === "left" ? "슬라이드" : "출처"} 패널 크기`}
    aria-valuenow={side === "left" ? s.leftWidth : s.rightWidth} aria-valuemin={side === "left" ? 200 : 280} aria-valuemax={side === "left" ? 320 : 420}
    className="tw:hidden tw:w-1 tw:shrink-0 tw:touch-none tw:cursor-col-resize tw:rounded tw:bg-(--kpc-line) tw:@min-[1180px]:block tw:focus-visible:outline-2"
    onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (e.key === "Home") update(side === "left" ? { leftWidth: 240 } : { rightWidth: 320 }); else resize(side, (e.key === "ArrowRight" ? 10 : -10) * (side === "left" ? 1 : -1)); } }}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); pointer.current = { id: e.pointerId, x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => { const p = pointer.current; if (p?.id !== e.pointerId) return; resize(side, (e.clientX - p.x) * (side === "left" ? 1 : -1)); p.x = e.clientX; }}
    onPointerUp={e => { pointer.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
    onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }} />;
  const panel = " tw:min-h-0 tw:overflow-y-auto tw:overscroll-contain tw:rounded-xl tw:border tw:border-(--kpc-line) tw:bg-(--kpc-card)";
  return <div className="tw:@container tw:min-w-0">
    <div data-comment-control className="tw:mb-(--layout-control-gap) tw:flex tw:flex-wrap tw:gap-(--layout-control-gap)">
      <div className="tw:flex tw:gap-1 tw:@min-[761px]:hidden">{(["slides", "editor", "sources"] as const).map((name, i) => <DadamButton key={name} size="small" aria-pressed={s.mobilePanel === name} onClick={() => update({ mobilePanel: name })}>{["슬라이드", "편집", "출처"][i]}</DadamButton>)}</div>
      <div className="tw:hidden tw:gap-1 tw:@min-[761px]:flex"><DadamButton size="small" aria-pressed={s.leftOpen} onClick={() => update({ leftOpen: !s.leftOpen })}>슬라이드 목록</DadamButton><DadamButton size="small" aria-pressed={s.rightOpen} onClick={() => update({ rightOpen: !s.rightOpen })}>출처</DadamButton><DadamButton size="small" onClick={reset}>기본 배치</DadamButton></div>
    </div>
    <div ref={root} className="tw:relative tw:flex tw:min-w-0 tw:items-stretch tw:gap-(--layout-control-gap)" style={{ height, "--production-left": `${s.leftWidth}px`, "--production-right": `${s.rightWidth}px` } as CSSProperties}>
      <aside aria-label="슬라이드 목록" className={(s.mobilePanel === "slides" ? "tw:block" : "tw:hidden") + " " + (s.leftOpen ? "tw:@min-[761px]:block" : "tw:@min-[761px]:hidden") + " tw:w-full tw:min-w-0 tw:shrink-0 tw:@min-[761px]:w-(--production-left)" + panel}>{left}</aside>
      {s.leftOpen && splitter("left")}
      <section aria-label="슬라이드 편집" className={(s.mobilePanel === "editor" ? "tw:block" : "tw:hidden") + " tw:min-w-0 tw:flex-1 tw:p-(--layout-card-inset) tw:@min-[761px]:block" + panel}>{center}</section>
      {s.rightOpen && splitter("right")}
      <aside aria-label="출처" className={(s.mobilePanel === "sources" ? "tw:block" : "tw:hidden") + " " + (s.rightOpen ? "tw:@min-[761px]:block" : "tw:@min-[761px]:hidden") + " tw:w-full tw:min-w-0 tw:shrink-0 tw:@min-[761px]:absolute tw:@min-[761px]:inset-y-0 tw:@min-[761px]:right-0 tw:@min-[761px]:z-10 tw:@min-[761px]:w-(--production-right) tw:@min-[761px]:shadow-xl tw:@min-[1180px]:static tw:@min-[1180px]:shadow-none" + panel}>{right}</aside>
    </div>
  </div>;
}
