"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import type { CommentPoint } from "@/config/comments";
import type { CommentControllerState } from "@/lib/comments/controller";
import { clientPointToRatio, getPopupLimits, keepPinInsideSurface, placeCommentPopup, ratioToClientPoint, type CommentBounds, type PixelPoint } from "@/lib/comments/geometry";
import { useComments } from "./CommentsProvider";
import CommentCreateButton from "./CommentCreateButton";
import CommentPin from "./CommentPin";
import CommentPopover from "./CommentPopover";
import CommentPreview from "./CommentPreview";

const DRAFT_ID = "pending-comment";
const useStyles = makeStyles({
  surface: { position: "relative", width: "100%", minWidth: 0, overflow: "visible", ":focus": { outline: "none" } },
  creating: { cursor: "crosshair", outline: `2px dashed ${tokens.colorBrandStroke1}`, outlineOffset: "3px" },
  tools: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--layout-control-gap)", marginTop: "var(--layout-control-gap)" },
  text: { margin: 0, fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  hidden: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 },
});
interface Measurement { surface: CommentBounds; viewport: CommentBounds; visible: CommentBounds | null }
interface PinGesture { id: string; pointerId: number; origin: PixelPoint; offset: PixelPoint; point: CommentPoint; moved: boolean; element: HTMLButtonElement }
export interface SlideCommentSurfaceProps { slideId: string; enabled: boolean; children: React.ReactNode }
const boundsOf = (element: HTMLElement): CommentBounds => {
  const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
};
const viewportBounds = (): CommentBounds => {
  const v = window.visualViewport;
  return v ? { left: v.offsetLeft, top: v.offsetTop, right: v.offsetLeft + v.width, bottom: v.offsetTop + v.height } : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
};
const contains = (b: CommentBounds | null, p: PixelPoint) => !!b && b.right > b.left && b.bottom > b.top && p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
function visibleBounds(surface: CommentBounds, viewport: CommentBounds, scroller: CommentBounds): CommentBounds | null {
  const b = { left: Math.max(surface.left, viewport.left, scroller.left), top: Math.max(surface.top, viewport.top, scroller.top), right: Math.min(surface.right, viewport.right, scroller.right), bottom: Math.min(surface.bottom, viewport.bottom, scroller.bottom) };
  return b.right > b.left && b.bottom > b.top ? b : null;
}
function viewSlide(state: CommentControllerState): string | null {
  const view = state.view;
  return view?.kind === "new" ? state.pendingSlideId : view?.kind === "thread" ? state.snapshot?.threads.find(t => t.id === view.threadId)?.slideId ?? null : null;
}

export default function SlideCommentSurface({ slideId, enabled, children }: SlideCommentSurfaceProps): React.ReactElement {
  const styles = useStyles(), id = useId(), surfaceId = `${id}-surface`, buttonId = `${id}-create`, helpId = `${id}-help`;
  const { state, controller, capabilities } = useComments();
  const available = enabled && capabilities.slideIds.includes(slideId);
  const latestCapabilities = useRef(capabilities);
  useLayoutEffect(() => { latestCapabilities.current = capabilities; });
  const creating = available && capabilities.canCreate && state.pinMode && state.pinModeSlideId === slideId;
  const surface = useRef<HTMLDivElement>(null), gesture = useRef<PinGesture | null>(null), suppressClick = useRef<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null), clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null), [hovered, setHovered] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; point: CommentPoint } | null>(null), [now, setNow] = useState(0);

  useEffect(() => {
    if (!available) { controller?.suspendSlide(slideId); return; }
    let frame = 0;
    const node = surface.current, scroller = node?.closest<HTMLElement>("[data-production-scroll]");
    const measure = () => {
      if (!node) return;
      const box = boundsOf(node), viewport = viewportBounds();
      const next = { surface: box, viewport, visible: visibleBounds(box, viewport, scroller ? boundsOf(scroller) : viewport) };
      setMeasurement(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      const current = controller?.getSnapshot();
      if (!current) return;
      if (!next.visible) { controller?.suspendSlide(slideId); return; }
      if (viewSlide(current) !== slideId) return;
      const view = current.view;
      const point = view?.kind === "new" ? current.pendingPoint : view?.kind === "thread" ? current.snapshot?.threads.find(t => t.id === view.threadId) : null;
      if (point && !contains(next.visible, keepPinInsideSurface(ratioToClientPoint(point, box), box))) controller?.suspendSlide(slideId);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const onScroll = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest("[data-comment-popup]")) schedule(); };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (node) observer?.observe(node); if (scroller) observer?.observe(scroller);
    window.addEventListener("resize", schedule); document.addEventListener("scroll", onScroll, true);
    window.visualViewport?.addEventListener("resize", schedule); window.visualViewport?.addEventListener("scroll", schedule);
    schedule();
    const clock = requestAnimationFrame(() => setNow(Date.now())), interval = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(clock); clearInterval(interval); observer?.disconnect();
      window.removeEventListener("resize", schedule); document.removeEventListener("scroll", onScroll, true);
      window.visualViewport?.removeEventListener("resize", schedule); window.visualViewport?.removeEventListener("scroll", schedule);
      controller?.suspendSlide(slideId);
    };
  }, [available, controller, slideId]);

  useEffect(() => {
    if (!creating || !surface.current) return;
    const node = surface.current, scroller = node.closest<HTMLElement>("[data-production-scroll]"), viewport = viewportBounds();
    if (!visibleBounds(boundsOf(node), viewport, scroller ? boundsOf(scroller) : viewport)) controller?.suspendSlide(slideId);
    else node.focus({ preventScroll: true });
  }, [creating, controller, slideId]);
  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (clickTimer.current) clearTimeout(clickTimer.current);
  }, []);

  useEffect(() => {
    if (!available || capabilities.readOnly || !controller) return;
    const movable = (g: PinGesture) => {
      const current = controller.getSnapshot();
      const caps = latestCapabilities.current;
      return !caps.readOnly && caps.slideIds.includes(slideId) && current.status === "ready" && !current.busy && (g.id === DRAFT_ID ? caps.canCreate && current.pendingSlideId === slideId : caps.moveThreadIds.includes(g.id) && current.snapshot?.threads.some(t => t.id === g.id && t.slideId === slideId));
    };
    const move = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId || !surface.current || !movable(g)) return;
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
        suppressClick.current = g.id;
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => { suppressClick.current = null; }, 0);
        if (!cancel && movable(g)) {
          if (g.id === DRAFT_ID) controller.movePendingPin(g.point);
          else { void controller.moveThread(g.id, g.point).then(() => setDrag(null)); return; }
        }
      }
      setDrag(null);
    };
    const up = (e: PointerEvent) => finish(false, e.pointerId), cancel = (e: PointerEvent) => finish(true, e.pointerId);
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.isComposing && gesture.current) { e.preventDefault(); e.stopPropagation(); finish(true); } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", escape, true);
    return () => {
      const g = gesture.current; gesture.current = null;
      if (g?.element.hasPointerCapture(g.pointerId)) g.element.releasePointerCapture(g.pointerId);
      if (g) setDrag(null);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", escape, true);
    };
  }, [available, controller, capabilities.readOnly, slideId]);

  useEffect(() => {
    if (!available || !controller) return;
    const outside = (e: PointerEvent) => {
      const current = controller.getSnapshot();
      if (viewSlide(current) === slideId && e.target instanceof Element && !e.target.closest("[data-comment-popup], [data-comment-pin], [data-comment-create]")) controller.closePopup();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing || e.keyCode === 229 || document.querySelector("[data-modal-frame]")) return;
      const current = controller.getSnapshot();
      if (viewSlide(current) !== slideId && current.pinModeSlideId !== slideId) return;
      e.preventDefault();
      const pinId = current.view?.kind === "thread" ? current.view.threadId : DRAFT_ID;
      controller.closePopup();
      requestAnimationFrame(() => (Array.from(surface.current?.querySelectorAll<HTMLElement>("[data-comment-pin]") ?? []).find(el => el.dataset.commentPin === pinId) ?? document.getElementById(buttonId))?.focus({ preventScroll: true }));
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [available, controller, slideId, buttonId]);

  const ready = state.status === "ready", visible = available && !!measurement?.visible;
  const ownsView = available && viewSlide(state) === slideId;
  const selectedId = ownsView ? state.view?.kind === "new" ? DRAFT_ID : state.view?.kind === "thread" ? state.view.threadId : null : null;
  const pins = [...(state.snapshot?.threads.filter(t => t.slideId === slideId).map(t => ({ id: t.id, point: t as CommentPoint, number: t.number, status: t.status })) ?? []),
    ...(state.pendingPoint && state.pendingSlideId === slideId && state.snapshot ? [{ id: DRAFT_ID, point: state.pendingPoint, number: state.snapshot.surface.nextNumber, status: "draft" as const }] : [])];
  const tipFor = (pinId: string) => {
    const pin = pins.find(p => p.id === pinId);
    return pin && measurement ? keepPinInsideSurface(ratioToClientPoint(drag?.id === pinId ? drag.point : pin.point, measurement.surface), measurement.surface) : null;
  };
  const limits = visible && measurement ? getPopupLimits(measurement.viewport, measurement.viewport) : null;
  const selectedTip = selectedId ? tipFor(selectedId) : null;
  const hoverThread = hovered && !state.view && !state.pinMode && !drag ? state.snapshot?.threads.find(t => t.id === hovered && t.slideId === slideId) : null;
  const previewMessage = hoverThread ? state.snapshot?.messages.find(m => m.id === hoverThread.rootMessageId) : null;
  const previewTip = hovered ? tipFor(hovered) : null;
  const previewLimits = limits ? { ...limits, minWidth: 0, minHeight: 0, maxWidth: Math.min(280, limits.maxWidth), maxHeight: Math.min(140, limits.maxHeight) } : null;
  const previewRect = previewTip && previewLimits && contains(measurement?.visible ?? null, previewTip) ? placeCommentPopup(previewTip, { width: previewLimits.maxWidth, height: previewLimits.maxHeight }, previewLimits) : null;
  const focusCreate = () => { requestAnimationFrame(() => document.getElementById(buttonId)?.focus({ preventScroll: true })); };
  const closeAndFocus = () => {
    controller?.closePopup();
    requestAnimationFrame(() => (Array.from(surface.current?.querySelectorAll<HTMLElement>("[data-comment-pin]") ?? []).find(el => el.dataset.commentPin === selectedId) ?? document.getElementById(buttonId))?.focus({ preventScroll: true }));
  };

  return <>
    <div ref={surface} id={surfaceId} data-comment-surface={available ? slideId : undefined} className={mergeClasses(styles.surface, creating && styles.creating)} tabIndex={available ? 0 : undefined} aria-label={available ? "슬라이드 핀 영역" : undefined} aria-describedby={available ? helpId : undefined}
      onClick={e => {
        if (!creating || !ready || state.busy || !surface.current || (e.target instanceof Element && e.target.closest("[data-comment-control], [data-comment-pin], button, a, input, textarea, select, [contenteditable='true'], [role='separator']"))) return;
        const p = { x: e.clientX, y: e.clientY }, b = boundsOf(surface.current);
        if (!contains(b, p)) return;
        const point = clientPointToRatio(p, b); if (point) controller?.placePin(point, slideId);
      }}
      onKeyDown={e => { if (e.target === e.currentTarget && creating && ready && !state.busy && ["Enter", " "].includes(e.key) && !e.nativeEvent.isComposing) { e.preventDefault(); controller?.placePin({ xRatio: .5, yRatio: .5 }, slideId); } }}>
      {children}
      {available && <p className={styles.hidden} id={helpId}>{capabilities.readOnly ? "핀을 선택하면 의견을 읽을 수 있습니다." : "핀은 드래그하거나 Alt와 방향키로 이동할 수 있습니다. Shift를 함께 누르면 더 크게 이동합니다."}</p>}
      {visible && measurement && pins.map(pin => {
        const tip = tipFor(pin.id)!;
        const movable = !capabilities.readOnly && (pin.id === DRAFT_ID ? capabilities.canCreate : capabilities.moveThreadIds.includes(pin.id));
        return <CommentPin key={pin.id} pinId={pin.id} number={pin.number} status={pin.status} selected={selectedId === pin.id} disabled={!ready} helpId={helpId}
          position={{ x: tip.x - measurement.surface.left, y: tip.y - measurement.surface.top }} previewId={previewMessage?.threadId === pin.id ? `comment-preview-${pin.id}` : undefined}
          onActivate={() => { if (suppressClick.current === pin.id || state.busy) return; setHovered(null); if (pin.id === DRAFT_ID) controller?.placePin(pin.point, slideId); else controller?.openThread(pin.id); }}
          onPreview={show => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            if (!show) { setHovered(null); return; }
            hoverTimer.current = setTimeout(() => { if (!gesture.current && !controller?.getSnapshot().view && pin.status !== "draft") setHovered(pin.id); }, 200);
          }}
          onPointerDown={movable ? e => {
            if (!ready || state.busy || e.button !== 0 || !e.isPrimary) return;
            setHovered(null);
            gesture.current = { id: pin.id, pointerId: e.pointerId, origin: { x: e.clientX, y: e.clientY }, offset: { x: e.clientX - tip.x, y: e.clientY - tip.y }, point: pin.point, moved: false, element: e.currentTarget };
            e.currentTarget.setPointerCapture(e.pointerId);
          } : undefined}
          onKeyDown={movable ? e => {
            if (!e.altKey || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault(); if (e.repeat || e.nativeEvent.isComposing || state.busy || !ready) return;
            const step = e.shiftKey ? .05 : .01;
            const point = { xRatio: Math.max(0, Math.min(1, pin.point.xRatio + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0))), yRatio: Math.max(0, Math.min(1, pin.point.yRatio + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0))) };
            if (pin.id === DRAFT_ID) controller?.movePendingPin(point); else void controller?.moveThread(pin.id, point);
          } : undefined} />;
      })}
    </div>
    {available && capabilities.canCreate && <div className={styles.tools} data-comment-control>
      <CommentCreateButton slideId={slideId} surfaceId={surfaceId} buttonId={buttonId} disabled={!visible} />
      {creating && <p className={styles.text} role="status">이 슬라이드에서 의견을 남길 위치를 선택해 주세요. Esc로 취소할 수 있어요.</p>}
    </div>}
    {visible && typeof document !== "undefined" && createPortal(<DadamThemeScope>
      {previewMessage && previewRect && <CommentPreview message={previewMessage} position={previewRect} width={previewRect.width} now={now} />}
      {selectedTip && limits && contains(measurement?.visible ?? null, selectedTip) && <CommentPopover key={selectedId} anchor={selectedTip} limits={limits} now={now} onClose={closeAndFocus} onThreadDeleted={focusCreate} />}
    </DadamThemeScope>, document.body)}
  </>;
}
