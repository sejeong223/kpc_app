// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommentPin, { type CommentPinProps } from "@/components/comments/CommentPin";

type InkBounds = Pick<TextMetrics, "actualBoundingBoxLeft" | "actualBoundingBoxRight" | "actualBoundingBoxAscent" | "actualBoundingBoxDescent">;
let host: HTMLDivElement, root: Root, metrics: InkBounds;
let fonts: EventTarget & { ready: Promise<void> }, resolveFonts: () => void;
let originalFonts: PropertyDescriptor | undefined;
const measureText = vi.fn(() => metrics);
const context = { font: "", textAlign: "", textBaseline: "", measureText };
const props: CommentPinProps = {
  pinId: "pin", number: 1, status: "open", position: { x: 200, y: 300 }, selected: false, disabled: false,
  onActivate() {}, onPreview() {}, onPointerDown() {}, onKeyDown() {},
};
async function render(changes: Partial<CommentPinProps> = {}) {
  await act(async () => root.render(createElement(CommentPin, { ...props, ...changes })));
}
function text(): SVGTextElement { return host.querySelector("text")!; }
function expectCentered() {
  const x = Number(text().getAttribute("x")), y = Number(text().getAttribute("y"));
  // The inner 20px square shares the 24px circle's center, excluding its 2px border.
  const inkLeft = x - metrics.actualBoundingBoxLeft, inkRight = x + metrics.actualBoundingBoxRight;
  const inkTop = y - metrics.actualBoundingBoxAscent, inkBottom = y + metrics.actualBoundingBoxDescent;
  expect((inkLeft + inkRight) / 2).toBeCloseTo(10);
  expect((inkTop + inkBottom) / 2).toBeCloseTo(10);
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("CanvasRenderingContext2D", class {});
  metrics = { actualBoundingBoxLeft: -.7, actualBoundingBoxRight: 5.6, actualBoundingBoxAscent: 7.8, actualBoundingBoxDescent: 0 };
  measureText.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const originalStyle = getComputedStyle;
  vi.spyOn(globalThis, "getComputedStyle").mockImplementation(element => element.tagName === "text"
    ? { fontWeight: "700", fontSize: "10.5px", fontFamily: '"Spoqa Han Sans Neo", sans-serif' } as CSSStyleDeclaration
    : originalStyle(element));
  fonts = Object.assign(new EventTarget(), { ready: new Promise<void>(resolve => { resolveFonts = resolve; }) });
  originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("comment pin numeral ink alignment", () => {
  it.each([
    [1, -.7, 5.6, 7.8, 0], [8, -.3, 5.9, 8, .2], [12, -.7, 12, 7.9, 0], [100, -.7, 18, 7.9, .2],
  ])("centers %s independently of its side bearings and ascent/descent", async (number, left, right, ascent, descent) => {
    metrics = { actualBoundingBoxLeft: left, actualBoundingBoxRight: right, actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent };
    await render({ number }); expectCentered();
    expect(measureText).toHaveBeenCalledWith(String(number));
    expect(context.font).toBe('700 10.5px "Spoqa Han Sans Neo", sans-serif');
    expect(host.querySelector("button")!.getAttribute("aria-label")).toBe(`코멘트 ${number} · 진행 중`);
    expect(host.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });
  it("remeasures after font loading and number changes without cumulative movement", async () => {
    await render(); const initialY = text().getAttribute("y");
    metrics = { actualBoundingBoxLeft: -.2, actualBoundingBoxRight: 6.2, actualBoundingBoxAscent: 6.8, actualBoundingBoxDescent: .4 };
    await act(async () => { resolveFonts(); await fonts.ready; });
    expectCentered(); expect(text().getAttribute("y")).not.toBe(initialY);
    const loadedY = text().getAttribute("y");
    await act(async () => { fonts.dispatchEvent(new Event("loadingdone")); fonts.dispatchEvent(new Event("loadingdone")); });
    expect(text().getAttribute("y")).toBe(loadedY);
    metrics = { ...metrics, actualBoundingBoxRight: 12.1, actualBoundingBoxAscent: 7.5 };
    await render({ number: 12, selected: true, status: "resolved" }); expectCentered();
    expect(host.querySelector("button")!.style.left).toBe("200px");
    expect(host.querySelector("button")!.style.top).toBe("300px");
  });
  it("keeps the centered fallback when measurement is unavailable and stops after unmount", async () => {
    metrics = { ...metrics, actualBoundingBoxAscent: NaN };
    await render();
    expect(text().getAttribute("x")).toBe("10"); expect(text().getAttribute("y")).toBe("10");
    expect(text().getAttribute("dominant-baseline")).toBe("central");
    await act(async () => root.render(null));
    measureText.mockClear();
    await act(async () => { resolveFonts(); await fonts.ready; fonts.dispatchEvent(new Event("loadingdone")); });
    expect(measureText).not.toHaveBeenCalled();
  });
});
