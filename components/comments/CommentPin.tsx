"use client";

import { makeStyles, mergeClasses, shorthands, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { COMMENT_VISUALS, type CommentStatus } from "@/config/comments";
import type { PixelPoint } from "@/lib/comments/geometry";

const useStyles = makeStyles({
  hit: { position: "absolute", width: "44px", height: "44px", padding: 0, border: 0, backgroundColor: "transparent", transform: "translate(-22px, -22px)", cursor: "grab", touchAction: "none", zIndex: 2, borderRadius: "8px", ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "2px" }, "@media (forced-colors: active)": { ":focus-visible": { outlineColor: "Highlight" } } },
  body: { position: "absolute", left: "22px", top: "22px", width: `${COMMENT_VISUALS.pinSize}px`, height: `${COMMENT_VISUALS.pinSize}px`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${tokens.colorNeutralForegroundOnBrand}`, borderRadius: "50% 50% 50% 2px", backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, fontFamily: tokens.fontFamilyBase, fontSize: `${COMMENT_VISUALS.pinFontSize}px`, lineHeight: "14px", fontWeight: COMMENT_VISUALS.pinFontWeight, boxShadow: dadamUi.pinShadow, transform: "translate(-2px, -22px)", transformOrigin: "2px 22px", pointerEvents: "none" },
  draft: { backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorBrandForeground1, ...shorthands.borderColor(tokens.colorBrandStroke1) },
  resolved: { backgroundColor: tokens.colorNeutralForeground3, boxShadow: "none" },
  selected: { transform: "translate(-2px, -22px) scale(1.25)", boxShadow: dadamUi.pinSelectedRing },
});
export interface CommentPinProps {
  pinId: string; number: number; status: "draft" | CommentStatus; position: PixelPoint; selected: boolean; disabled: boolean;
  previewId?: string; onActivate(): void; onPreview(visible: boolean): void;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>; onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
}
export default function CommentPin(p: CommentPinProps): React.ReactElement {
  const styles = useStyles();
  return <button type="button" data-comment-pin={p.pinId} className={styles.hit} style={{ left: p.position.x, top: p.position.y }}
    aria-label={`코멘트 ${p.number} · ${p.status === "draft" ? "작성 중" : p.status === "resolved" ? "반영 완료" : "진행 중"}`}
    aria-expanded={p.selected} aria-controls={p.selected ? "production-comment-popup" : undefined} aria-describedby={p.previewId ?? "comment-pin-help"}
    disabled={p.disabled} onClick={p.onActivate} onPointerDown={p.onPointerDown} onKeyDown={p.onKeyDown}
    onMouseEnter={() => p.onPreview(true)} onMouseLeave={() => p.onPreview(false)} onFocus={() => p.onPreview(true)} onBlur={() => p.onPreview(false)}>
    <span className={mergeClasses(styles.body, p.status === "draft" && styles.draft, p.status === "resolved" && styles.resolved, p.selected && styles.selected)}>{p.number}</span>
  </button>;
}
