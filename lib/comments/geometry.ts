import { COMMENT_VISUALS, type CommentPoint } from "@/config/comments";
import type { CommentPopupSize } from "./controller";

export interface PixelPoint { x: number; y: number }
export interface CommentBounds { left: number; top: number; right: number; bottom: number }
export interface PopupLimits { bounds: CommentBounds; minWidth: number; minHeight: number; maxWidth: number; maxHeight: number }
export type ResizeEdge = "e" | "s" | "se";
export interface PopupRect extends PixelPoint, CommentPopupSize {}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const valid = (b: CommentBounds) => Object.values(b).every(Number.isFinite) && b.right > b.left && b.bottom > b.top;

export function clientPointToRatio(p: PixelPoint, b: CommentBounds): CommentPoint | null {
  if (!valid(b) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  return { xRatio: clamp((p.x - b.left) / (b.right - b.left), 0, 1), yRatio: clamp((p.y - b.top) / (b.bottom - b.top), 0, 1) };
}
export function ratioToClientPoint(p: CommentPoint, b: CommentBounds): PixelPoint {
  return { x: b.left + p.xRatio * (b.right - b.left), y: b.top + p.yRatio * (b.bottom - b.top) };
}
export function keepPinInsideSurface(p: PixelPoint, b: CommentBounds): PixelPoint {
  return { x: b.right - b.left < 44 ? (b.left + b.right) / 2 : clamp(p.x, b.left + 22, b.right - 22),
    y: b.bottom - b.top < 44 ? (b.top + b.bottom) / 2 : clamp(p.y, b.top + 22, b.bottom - 22) };
}
export function getPopupLimits(viewport: CommentBounds, surface: CommentBounds): PopupLimits | null {
  if (!valid(viewport) || !valid(surface)) return null;
  const bounds = { left: Math.max(viewport.left, surface.left) + 12, top: Math.max(viewport.top, surface.top) + 12,
    right: Math.min(viewport.right, surface.right) - 12, bottom: Math.min(viewport.bottom, surface.bottom) - 12 };
  if (!valid(bounds)) return null;
  const vw = viewport.right - viewport.left, vh = viewport.bottom - viewport.top;
  const maxWidth = Math.min(bounds.right - bounds.left, vw > COMMENT_VISUALS.mobileBreakpoint ? vw / 2 : vw);
  const maxHeight = Math.min(bounds.bottom - bounds.top, vh * .8);
  return { bounds, maxWidth, maxHeight, minWidth: Math.min(320, maxWidth), minHeight: Math.min(240, maxHeight) };
}
export function clampPopupSize(size: CommentPopupSize, limits: PopupLimits): CommentPopupSize {
  return { width: clamp(Number.isFinite(size.width) ? size.width : 360, limits.minWidth, limits.maxWidth),
    height: clamp(Number.isFinite(size.height) ? size.height : 360, limits.minHeight, limits.maxHeight) };
}
function containRect(rect: PopupRect, limits: PopupLimits): PopupRect {
  return { ...rect, x: clamp(rect.x, limits.bounds.left, limits.bounds.right - rect.width),
    y: clamp(rect.y, limits.bounds.top, limits.bounds.bottom - rect.height) };
}
export function placeCommentPopup(anchor: PixelPoint, size: CommentPopupSize, limits: PopupLimits): PopupRect {
  const clamped = clampPopupSize(size, limits);
  const x = anchor.x + 16 + clamped.width <= limits.bounds.right ? anchor.x + 16 : anchor.x - 16 - clamped.width;
  return containRect({ ...clamped, x, y: anchor.y - 22 }, limits);
}
export function resizeCommentPopup(start: PopupRect, delta: PixelPoint, edge: ResizeEdge, limits: PopupLimits): PopupRect {
  const size = clampPopupSize({ width: start.width + (edge.includes("e") ? delta.x : 0), height: start.height + (edge.includes("s") ? delta.y : 0) }, limits);
  return containRect({ ...start, ...size }, limits);
}
