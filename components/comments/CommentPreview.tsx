"use client";

import { makeStyles } from "@fluentui/react-components";
import type { CommentMessage } from "@/config/comments";
import type { PixelPoint } from "@/lib/comments/geometry";
import { formatCommentTime } from "@/lib/comments/format";
import { CommentBody } from "./CommentMessage";
const useStyles = makeStyles({
  root: { position: "fixed", zIndex: 9, pointerEvents: "none", padding: "12px", backgroundColor: "#fff", border: "1px solid #e6e7eb", borderRadius: "12px", boxShadow: "0 6px 24px #10111416", boxSizing: "border-box" },
  meta: { display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px", fontSize: "12px", fontWeight: 700 },
  time: { fontSize: "11px", color: "#74747d", fontWeight: 400, flexShrink: 0 },
  body: { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
});
export default function CommentPreview({ message, position, now, width }: { message: CommentMessage; position: PixelPoint; now: number; width: number }): React.ReactElement {
  const styles = useStyles(), time = formatCommentTime(message.createdAt, now);
  return <div id={`comment-preview-${message.threadId}`} role="tooltip" data-comment-preview className={styles.root} style={{ left: position.x, top: position.y, width }}>
    <div className={styles.meta}><span>{message.authorName}</span><time dateTime={message.createdAt} title={time.full} className={styles.time}>{time.label}</time></div>
    <div className={styles.body}><CommentBody draft={message} /></div>
  </div>;
}
