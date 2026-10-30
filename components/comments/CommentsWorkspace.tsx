"use client";

import { Button, makeStyles, mergeClasses } from "@fluentui/react-components";
import { useEffect, useRef, useState } from "react";
import type { CommentPoint } from "@/config/comments";
import { clientPointToRatio, getPopupLimits, keepPinInsideSurface, placeCommentPopup, ratioToClientPoint, type CommentBounds, type PixelPoint } from "@/lib/comments/geometry";
import CommentCreateButton from "./CommentCreateButton";
import CommentPin from "./CommentPin";
import CommentPopover from "./CommentPopover";
import CommentPreview from "./CommentPreview";
import { useComments } from "./CommentsProvider";

const DRAFT_ID = "pending-comment";
const useStyles = makeStyles({
  surface: { position: "relative", flex: 1, width: "100%", minHeight: "100svh", overflow: "visible", backgroundColor: "#f8f9fb", ":focus": { outline: "none" } },
  creating: { cursor: "crosshair" },
  intro: { padding: "88px 32px 24px", pointerEvents: "none", color: "#74747d", userSelect: "none", "@media (max-width: 760px)": { padding: "88px 20px 24px" } },
  title: { fontSize: "20px", fontWeight: 700, color: "#30313b", margin: "0 0 10px" },
  text: { fontSize: "13px", lineHeight: "1.7", margin: 0 },
  alert: { position: "relative", zIndex: 3, margin: "16px 24px", padding: "12px", border: "1px solid #efc1c8", borderRadius: "8px", color: "#a31525", backgroundColor: "#fff1f2", fontSize: "12px" },
  hidden: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 },
});
interface Measurement { surface: CommentBounds; viewport: CommentBounds }
interface PinGesture { id: string; pointerId: number; origin: PixelPoint; offset: PixelPoint; point: CommentPoint; moved: boolean; element: HTMLButtonElement }
const boundsOf = (element: HTMLElement): CommentBounds => {
  const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};
const viewportBounds = (): CommentBounds => {
  const v = window.visualViewport; return v ? { left: v.offsetLeft, top: v.offsetTop, right: v.offsetLeft + v.width, bottom: v.offsetTop + v.height } : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
};

export default function CommentsWorkspace(): React.ReactElement {
  const styles = useStyles(), { state, controller } = useComments();
  const surface = useRef<HTMLElement>(null), gesture = useRef<PinGesture | null>(null), suppressClick = useRef<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; point: CommentPoint } | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      if (!surface.current) return;
      const next = { surface: boundsOf(surface.current), viewport: viewportBounds() };
      setMeasurement(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      const current = controller?.getSnapshot();
      const view = current?.view;
      const point = view?.kind === "new" ? current?.pendingPoint : view?.kind === "thread" ? current?.snapshot?.threads.find(t => t.id === view.threadId) : null;
      if (point) {
        const tip = keepPinInsideSurface(ratioToClientPoint(point, next.surface), next.surface), v = next.viewport;
        if (tip.x < v.left || tip.x > v.right || tip.y < v.top || tip.y > v.bottom || !getPopupLimits(v, next.surface)) controller?.closePopup();
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const onScroll = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest("[data-comment-popup]")) schedule(); };
    const observer = new ResizeObserver(schedule);
    if (surface.current) observer.observe(surface.current);
    window.addEventListener("resize", schedule); document.addEventListener("scroll", onScroll, true);
    window.visualViewport?.addEventListener("resize", schedule); window.visualViewport?.addEventListener("scroll", schedule);
    schedule();
    const clock = requestAnimationFrame(() => setNow(Date.now()));
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(clock); clearInterval(interval); observer.disconnect();
      window.removeEventListener("resize", schedule); document.removeEventListener("scroll", onScroll, true);
      window.visualViewport?.removeEventListener("resize", schedule); window.visualViewport?.removeEventListener("scroll", schedule);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, [controller]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId || !surface.current) return;
      if (!g.moved && Math.hypot(e.clientX - g.origin.x, e.clientY - g.origin.y) < 5) return;
      const point = clientPointToRatio({ x: e.clientX - g.offset.x, y: e.clientY - g.offset.y }, boundsOf(surface.current));
      if (point) { g.moved = true; g.point = point; setDrag({ id: g.id, point }); setHovered(null); }
    };
    const finish = (cancel: boolean, pointerId?: number) => {
      const g = gesture.current;
      if (!g || (pointerId !== undefined && g.pointerId !== pointerId)) return;
      gesture.current = null;
      if (g.element.hasPointerCapture(g.pointerId)) g.element.releasePointerCapture(g.pointerId);
      if (g.moved) {
        suppressClick.current = g.id; setTimeout(() => { suppressClick.current = null; }, 0);
        if (!cancel && controller) {
          if (g.id === DRAFT_ID) controller.movePendingPin(g.point);
          else { void controller.moveThread(g.id, g.point).then(() => setDrag(null)); return; }
        }
      }
      setDrag(null);
    };
    const up = (e: PointerEvent) => finish(false, e.pointerId), cancel = (e: PointerEvent) => finish(true, e.pointerId);
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && gesture.current) { e.preventDefault(); e.stopPropagation(); finish(true); } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", escape, true);
    return () => { gesture.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", escape, true); };
  }, [controller]);

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (controller?.getSnapshot().view && e.target instanceof Element && !e.target.closest("[data-comment-popup], [data-comment-pin], [data-comment-create]")) controller.closePopup();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing || e.keyCode === 229 || document.querySelector("[data-modal-frame]")) return;
      const current = controller?.getSnapshot();
      if (!current?.view && !current?.pinMode) return;
      e.preventDefault();
      const id = current.view?.kind === "thread" ? current.view.threadId : DRAFT_ID;
      controller?.closePopup();
      requestAnimationFrame(() => (Array.from(surface.current?.querySelectorAll<HTMLElement>("[data-comment-pin]") ?? []).find(el => el.dataset.commentPin === id) ?? surface.current?.querySelector<HTMLElement>("[data-comment-create]"))?.focus());
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [controller]);

  const ready = state.status === "ready", limits = measurement ? getPopupLimits(measurement.viewport, measurement.surface) : null;
  const selectedId = state.view?.kind === "new" ? DRAFT_ID : state.view?.kind === "thread" ? state.view.threadId : null;
  const pins = [...(state.snapshot?.threads.map(t => ({ id: t.id, point: t as CommentPoint, number: t.number, status: t.status })) ?? []),
    ...(state.pendingPoint && state.snapshot ? [{ id: DRAFT_ID, point: state.pendingPoint, number: state.snapshot.surface.nextNumber, status: "draft" as const }] : [])];
  const tipFor = (id: string): PixelPoint | null => {
    const pin = pins.find(p => p.id === id); if (!pin || !measurement) return null;
    return keepPinInsideSurface(ratioToClientPoint(drag?.id === id ? drag.point : pin.point, measurement.surface), measurement.surface);
  };
  const selectedTip = selectedId ? tipFor(selectedId) : null;
  const hoverThread = hovered && !state.view && !drag ? state.snapshot?.threads.find(t => t.id === hovered) : null;
  const previewMessage = hoverThread ? state.snapshot?.messages.find(m => m.id === hoverThread.rootMessageId) : null;
  const previewTip = hovered ? tipFor(hovered) : null;
  const previewLimits = limits ? { ...limits, minWidth: 0, minHeight: 0, maxWidth: Math.min(280, limits.bounds.right - limits.bounds.left), maxHeight: Math.min(140, limits.maxHeight) } : null;
  const previewRect = previewTip && previewLimits ? placeCommentPopup(previewTip, { width: previewLimits.maxWidth, height: previewLimits.maxHeight }, previewLimits) : null;
  const closeAndFocus = () => {
    controller?.closePopup();
    requestAnimationFrame(() => (Array.from(surface.current?.querySelectorAll<HTMLElement>("[data-comment-pin]") ?? []).find(el => el.dataset.commentPin === selectedId) ?? surface.current?.querySelector<HTMLElement>("[data-comment-create]"))?.focus({ preventScroll: true }));
  };

  return <section ref={surface} data-comment-surface className={mergeClasses(styles.surface, state.pinMode && styles.creating)} aria-labelledby="workspace-screen-title" tabIndex={0}
    onClick={e => {
      if (!ready || state.busy || !state.pinMode || (e.target instanceof Element && e.target.closest("[data-comment-control], [data-comment-pin], button, a, input, textarea, select"))) return;
      const point = clientPointToRatio({ x: e.clientX, y: e.clientY }, boundsOf(e.currentTarget)); if (point) controller?.placePin(point);
    }}
    onKeyDown={e => { if (e.target === e.currentTarget && state.pinMode && ["Enter", " "].includes(e.key) && !e.nativeEvent.isComposing) { e.preventDefault(); controller?.placePin({ xRatio: .5, yRatio: .5 }); } }}>
    <CommentCreateButton />
    <div className={styles.intro}><h1 id="workspace-screen-title" className={styles.title}>제작</h1>
      <p className={styles.text}>{state.pinMode ? "의견을 남길 위치를 선택해 주세요. Esc로 취소할 수 있어요." : "핀 생성 버튼을 누르고 원하는 위치에 의견을 남겨보세요."}</p>
      {(state.status === "idle" || state.status === "loading") && <p className={styles.text} role="status">코멘트를 불러오는 중입니다.</p>}
    </div>
    <p className={styles.hidden} id="comment-pin-help">핀은 드래그하거나 Alt와 방향키로 이동할 수 있습니다. Shift를 함께 누르면 더 크게 이동합니다.</p>
    {state.error && !state.view && <div className={styles.alert} role="alert" data-comment-control>{state.error.message} {controller && <Button size="small" disabled={state.busy || state.status === "loading"} onClick={() => void controller.load()}>다시 불러오기</Button>}</div>}
    {measurement && pins.map(pin => {
      const tip = tipFor(pin.id)!;
      return <CommentPin key={pin.id} pinId={pin.id} number={pin.number} status={pin.status} selected={selectedId === pin.id} disabled={!ready}
        position={{ x: tip.x - measurement.surface.left, y: tip.y - measurement.surface.top }} previewId={previewMessage?.threadId === pin.id ? `comment-preview-${pin.id}` : undefined}
        onActivate={() => { if (suppressClick.current === pin.id) return; setHovered(null); if (pin.id === DRAFT_ID) controller?.placePin(pin.point); else controller?.openThread(pin.id); }}
        onPreview={visible => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          if (!visible) { setHovered(null); return; }
          hoverTimer.current = setTimeout(() => { if (!gesture.current && !controller?.getSnapshot().view && pin.status !== "draft") setHovered(pin.id); }, 200);
        }}
        onPointerDown={e => {
          if (!ready || state.busy || e.button !== 0 || !e.isPrimary) return;
          gesture.current = { id: pin.id, pointerId: e.pointerId, origin: { x: e.clientX, y: e.clientY }, offset: { x: e.clientX - tip.x, y: e.clientY - tip.y }, point: pin.point, moved: false, element: e.currentTarget };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onKeyDown={e => {
          if (!e.altKey || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
          e.preventDefault(); if (e.repeat || state.busy || !ready) return;
          const step = e.shiftKey ? .05 : .01;
          const point = { xRatio: Math.max(0, Math.min(1, pin.point.xRatio + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0))), yRatio: Math.max(0, Math.min(1, pin.point.yRatio + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0))) };
          if (pin.id === DRAFT_ID) controller?.movePendingPin(point); else void controller?.moveThread(pin.id, point);
        }} />;
    })}
    {previewMessage && previewRect && <CommentPreview message={previewMessage} position={previewRect} width={previewRect.width} now={now} />}
    {selectedTip && limits && <CommentPopover key={selectedId} anchor={selectedTip} limits={limits} now={now} onClose={closeAndFocus} />}
  </section>;
}
