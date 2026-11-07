"use client";

import { useLayoutEffect, useRef } from "react";

const VIEWPORT_GUTTER = 1;

/** 원과 글자를 같은 좌표에서 그려 축소 배율의 테두리·줄 상자 반올림을 분리하지 않는다. */
export default function ProductionTocBadge({ text, kind, color }: {
  text: string; kind: "count" | "avatar"; color: string;
}): React.ReactElement {
  const height = kind === "avatar" ? 22 : 17;
  const width = kind === "avatar" ? 22 : Math.max(17, 10 + text.length * 6);
  const textRef = useRef<SVGTextElement>(null);

  useLayoutEffect(() => {
    const label = textRef.current;
    if (!label) return;
    const document = label.ownerDocument;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;
    let disposed = false;
    const center = () => {
      if (disposed) return;
      const font = document.defaultView?.getComputedStyle(label);
      if (!font) return;
      context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right,
        actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = context.measureText(text);
      if (![left, right, ascent, descent].every(Number.isFinite) || ascent + descent <= 0) return;
      // 이름 첫 글자와 숫자의 실제 글자 영역을 중앙에 놓고 줄 높이의 영향을 없앤다.
      label.setAttribute("text-anchor", "start");
      label.setAttribute("dominant-baseline", "alphabetic");
      label.setAttribute("x", String(width / 2 + (left - right) / 2));
      label.setAttribute("y", String(height / 2 + (ascent - descent) / 2));
    };
    center();
    void document.fonts?.ready.then(center);
    document.fonts?.addEventListener("loadingdone", center);
    return () => { disposed = true; document.fonts?.removeEventListener("loadingdone", center); };
  }, [text, width, height]);

  // 확대 시 가장자리 픽셀이 잘리지 않도록 SVG에 여백을 주고, 음수 margin으로 배지 크기·간격은 유지한다.
  return <svg width={width + VIEWPORT_GUTTER * 2} height={height + VIEWPORT_GUTTER * 2}
    viewBox={`${-VIEWPORT_GUTTER} ${-VIEWPORT_GUTTER} ${width + VIEWPORT_GUTTER * 2} ${height + VIEWPORT_GUTTER * 2}`} aria-hidden="true" focusable="false"
    style={{ display: "block", flexShrink: 0, margin: -VIEWPORT_GUTTER, overflow: "visible", fontFamily: "var(--dadam-font-family)", fontSize: 10, fontWeight: 700 }}>
    {kind === "avatar" ? <><circle cx="11" cy="11" r="11" fill="#fff" /><circle cx="11" cy="11" r="9" fill={color} /></>
      : <rect width={width} height={height} rx="8.5" fill={color} />}
    <text ref={textRef} x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="central" fill="#fff">{text}</text>
  </svg>;
}
