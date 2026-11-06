"use client";

import { makeStyles, mergeClasses, shorthands, tokens } from "@fluentui/react-components";
import { useLayoutEffect, useRef } from "react";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { COMMENT_VISUALS, type CommentStatus } from "@/config/comments";
import type { PixelPoint } from "@/lib/comments/geometry";

const PIN_BORDER_WIDTH = 2;
const NUMBER_SIZE = COMMENT_VISUALS.pinSize - PIN_BORDER_WIDTH * 2;
const NUMBER_CENTER = NUMBER_SIZE / 2;

const useStyles = makeStyles({
  hit: { position: "absolute", width: "44px", height: "44px", padding: 0, border: 0, backgroundColor: "transparent", transform: "translate(-22px, -22px)", cursor: "grab", touchAction: "none", zIndex: 2, borderRadius: "8px", ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "2px" }, "@media (forced-colors: active)": { ":focus-visible": { outlineColor: "Highlight" } } },
  body: { position: "absolute", left: "22px", top: "22px", width: `${COMMENT_VISUALS.pinSize}px`, height: `${COMMENT_VISUALS.pinSize}px`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: `${PIN_BORDER_WIDTH}px solid ${tokens.colorNeutralForegroundOnBrand}`, borderRadius: "50% 50% 50% 2px", backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, fontFamily: tokens.fontFamilyBase, fontSize: `${COMMENT_VISUALS.pinFontSize}px`, lineHeight: "14px", fontWeight: COMMENT_VISUALS.pinFontWeight, boxShadow: dadamUi.pinShadow, transform: "translate(-2px, -22px)", transformOrigin: "2px 22px", pointerEvents: "none" },
  number: { display: "block", width: "100%", height: "100%", overflow: "visible" },
  draft: { backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorBrandForeground1, ...shorthands.borderColor(tokens.colorBrandStroke1) },
  resolved: { backgroundColor: tokens.colorNeutralForeground3, boxShadow: "none" },
  selected: { transform: "translate(-2px, -22px) scale(1.25)", boxShadow: dadamUi.pinSelectedRing },
});

function PinNumber({ value, className }: { value: number; className: string }): React.ReactElement {
  const textRef = useRef<SVGTextElement>(null);
  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text || typeof CanvasRenderingContext2D === "undefined") return;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;
    let disposed = false;
    const center = () => {
      if (disposed) return;
      const font = getComputedStyle(text);
      context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      const metrics = context.measureText(String(value));
      const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right,
        actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = metrics;
      if (![left, right, ascent, descent].every(Number.isFinite) || ascent + descent <= 0) return;
      // Align the actual numeral ink to the circle, independent of line height and the tail.
      text.setAttribute("text-anchor", "start");
      text.setAttribute("dominant-baseline", "alphabetic");
      text.setAttribute("x", String(NUMBER_CENTER + (left - right) / 2));
      text.setAttribute("y", String(NUMBER_CENTER + (ascent - descent) / 2));
    };
    center();
    const fonts = document.fonts;
    void fonts?.ready.then(center);
    fonts?.addEventListener("loadingdone", center);
    return () => { disposed = true; fonts?.removeEventListener("loadingdone", center); };
  }, [value]);

  return <svg className={className} viewBox={`0 0 ${NUMBER_SIZE} ${NUMBER_SIZE}`} aria-hidden="true" focusable="false">
    <text ref={textRef} x={NUMBER_CENTER} y={NUMBER_CENTER} textAnchor="middle" dominantBaseline="central" fill="currentColor">{value}</text>
  </svg>;
}

export interface CommentPinProps {
  pinId: string; number: number; status: "draft" | CommentStatus; position: PixelPoint; selected: boolean; disabled: boolean;
  previewId?: string; helpId?: string; onActivate(): void; onPreview(visible: boolean): void;
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>; onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
}
export default function CommentPin(p: CommentPinProps): React.ReactElement {
  const styles = useStyles();
  return <button type="button" data-comment-pin={p.pinId} className={styles.hit} style={{ left: p.position.x, top: p.position.y, cursor: p.onPointerDown ? "grab" : "pointer" }}
    aria-label={`코멘트 ${p.number} · ${p.status === "draft" ? "작성 중" : p.status === "resolved" ? "반영 완료" : "진행 중"}`}
    aria-expanded={p.selected} aria-controls={p.selected ? "production-comment-popup" : undefined} aria-describedby={p.previewId ?? p.helpId ?? "comment-pin-help"}
    disabled={p.disabled} onClick={p.onActivate} onPointerDown={p.onPointerDown} onKeyDown={p.onKeyDown}
    onMouseEnter={() => p.onPreview(true)} onMouseLeave={() => p.onPreview(false)} onFocus={() => p.onPreview(true)} onBlur={() => p.onPreview(false)}>
    <span className={mergeClasses(styles.body, p.status === "draft" && styles.draft, p.status === "resolved" && styles.resolved, p.selected && styles.selected)}><PinNumber value={p.number} className={styles.number} /></span>
  </button>;
}
