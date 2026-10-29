"use client";

import { makeStyles, mergeClasses, shorthands } from "@fluentui/react-components";
import type { CommentStatus } from "@/config/comments";
import type { PixelPoint } from "@/lib/comments/geometry";

const useStyles = makeStyles({
  hit: { position: "absolute", width: "44px", height: "44px", padding: 0, border: 0, backgroundColor: "transparent", transform: "translate(-22px, -22px)", cursor: "grab", touchAction: "none", zIndex: 2, borderRadius: "8px", ":focus-visible": { outline: "2px solid #d7192f", outlineOffset: "2px" } },
  body: { position: "absolute", left: "22px", top: "22px", width: "24px", height: "24px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", borderRadius: "50% 50% 50% 2px", backgroundColor: "#d7192f", color: "#fff", fontSize: "10.5px", fontWeight: 850, boxShadow: "0 2px 6px rgba(215,25,47,.35)", transform: "translate(-2px, -22px)", transformOrigin: "2px 22px", pointerEvents: "none" },
  draft: { backgroundColor: "#fff", color: "#d7192f", ...shorthands.borderColor("#d7192f") },
  resolved: { backgroundColor: "#9ca3af", boxShadow: "none" },
  selected: { transform: "translate(-2px, -22px) scale(1.25)", boxShadow: "0 0 0 4px rgba(215,25,47,.18)" },
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
