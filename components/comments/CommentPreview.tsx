"use client";

import { makeStyles, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import type { CommentMessage } from "@/config/comments";
import type { PixelPoint } from "@/lib/comments/geometry";
import { formatCommentTime } from "@/lib/comments/format";
import { CommentBody } from "./CommentMessage";
const useStyles = makeStyles({
  root: { position: "fixed", zIndex: 9, pointerEvents: "none", padding: "12px", backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.surfaceRadius, boxShadow: dadamUi.popoverShadow, color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, boxSizing: "border-box" },
  meta: { display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 700 },
  time: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: 400, flexShrink: 0 },
  body: { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
});
export default function CommentPreview({ message, position, now, width }: { message: CommentMessage; position: PixelPoint; now: number; width: number }): React.ReactElement {
  const styles = useStyles(), time = formatCommentTime(message.createdAt, now);
  return <div id={`comment-preview-${message.threadId}`} role="tooltip" data-comment-preview className={styles.root} style={{ left: position.x, top: position.y, width }}>
    <div className={styles.meta}><span>{message.authorName}</span><time dateTime={message.createdAt} title={time.full} className={styles.time}>{time.label}</time></div>
    <div className={styles.body}><CommentBody draft={message} /></div>
  </div>;
}
