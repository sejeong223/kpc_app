import { describe, expect, it } from "vitest";
import { clampPopupSize, clientPointToRatio, getPopupLimits, keepPinInsideSurface, placeCommentPopup, ratioToClientPoint, resizeCommentPopup } from "@/lib/comments/geometry";
const viewport = { left: 0, top: 0, right: 1440, bottom: 900 };
const surface = { ...viewport, left: 220 };
const limits = getPopupLimits(viewport, surface)!;

describe("comment surface geometry", () => {
  it.each([220, 54, 0])("round trips with sidebar width %s and scrolling", left => {
    const b = { left, top: -150, right: 1440, bottom: 750 }, point = { xRatio: .35, yRatio: .68 };
    const restored = clientPointToRatio(ratioToClientPoint(point, b), b)!;
    expect(restored.xRatio).toBeCloseTo(point.xRatio); expect(restored.yRatio).toBeCloseTo(point.yRatio);
  });
  it("clamps drag coordinates and rejects invalid surfaces", () => {
    expect(clientPointToRatio({ x: -1, y: 1000 }, surface)).toEqual({ xRatio: 0, yRatio: 1 });
    expect(clientPointToRatio({ x: NaN, y: 0 }, surface)).toBeNull();
    expect(clientPointToRatio({ x: 0, y: 0 }, { ...surface, right: 220 })).toBeNull();
    expect(getPopupLimits(viewport, { ...surface, left: 1500, right: 2000 })).toBeNull();
  });
  it("contains hit targets without changing saved ratios", () => {
    const point = { xRatio: 0, yRatio: 1 };
    expect(keepPinInsideSurface(ratioToClientPoint(point, surface), surface)).toEqual({ x: 242, y: 878 });
    expect(point).toEqual({ xRatio: 0, yRatio: 1 });
    expect(keepPinInsideSurface({ x: 0, y: 0 }, { left: 10, right: 30, top: 10, bottom: 40 })).toEqual({ x: 20, y: 25 });
  });
});
describe("comment popup limits and resizing", () => {
  it("limits desktop dimensions to half width and 80% height", () => {
    expect(clampPopupSize({ width: 9999, height: 9999 }, limits)).toEqual({ width: 720, height: 720 });
    expect(clampPopupSize({ width: 420, height: 360 }, limits).width).toBe(420);
    expect(clampPopupSize({ width: 0, height: 0 }, limits)).toEqual({ width: 320, height: 240 });
  });
  it.each([390, 320])("fits mobile width %s", width => {
    const b = { left: 0, top: 0, right: width, bottom: 568 }, l = getPopupLimits(b, b)!;
    expect(clampPopupSize({ width: 360, height: 360 }, l).width).toBe(Math.min(360, width - 24));
    expect(l.minWidth).toBeLessThanOrEqual(l.maxWidth);
  });
  it("accounts for a short visual viewport and offset", () => {
    const l = getPopupLimits({ left: 10, top: 200, right: 330, bottom: 380 }, { left: 0, top: 0, right: 390, bottom: 844 })!;
    expect(l.bounds).toEqual({ left: 22, top: 212, right: 318, bottom: 368 });
    expect(l.minHeight).toBe(144); expect(l.maxHeight).toBe(144);
  });
  it("flips at the right edge and contains bottom anchors", () => {
    const r = placeCommentPopup({ x: 1400, y: 890 }, { width: 360, height: 360 }, limits);
    expect(r.x).toBe(1024); expect(r.y + r.height).toBeLessThanOrEqual(888);
    expect(placeCommentPopup({ x: 250, y: 100 }, { width: 360, height: 360 }, limits).x).toBe(266);
  });
  it.each(["e", "s", "se"] as const)("resizes %s from a stable origin without mutating input", edge => {
    const start = { x: 900, y: 500, width: 360, height: 360 };
    const r = resizeCommentPopup(start, { x: 1000, y: 1000 }, edge, limits);
    expect(r.width).toBe(edge.includes("e") ? 720 : 360); expect(r.height).toBe(edge.includes("s") ? 720 : 360);
    expect(r.x + r.width).toBeLessThanOrEqual(limits.bounds.right); expect(r.y + r.height).toBeLessThanOrEqual(limits.bounds.bottom);
    expect(start).toEqual({ x: 900, y: 500, width: 360, height: 360 });
  });
});
