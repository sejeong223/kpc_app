"use client";

import { makeStyles } from "@fluentui/react-components";
import type { CommentDraft, CommentMessage } from "@/config/comments";
import { splitCommentText } from "@/lib/comments/mentions";
import { formatCommentTime } from "@/lib/comments/format";
import CommentActionsMenu from "./CommentActionsMenu";

const useStyles = makeStyles({
  message: { padding: "12px 0", borderBottom: "1px solid #f0f0f3" },
  meta: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", minWidth: 0 },
  author: { fontSize: "12px", fontWeight: 700, overflowWrap: "anywhere" },
  time: { marginLeft: "auto", color: "#74747d", fontSize: "11px", flexShrink: 0 },
  body: { fontSize: "12px", lineHeight: "1.5", whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#30313b" },
  mention: { color: "#d7192f", backgroundColor: "#fff1f2", borderRadius: "3px" },
});
export function CommentBody({ draft }: { draft: CommentDraft }): React.ReactElement {
  const styles = useStyles();
  return <div className={styles.body}>{splitCommentText(draft).map((part, i) => part.kind === "mention" ? <span key={i} className={styles.mention}>{part.text}</span> : part.text)}</div>;
}
export interface CommentMessageViewProps {
  message: CommentMessage; now: number; showActions: boolean; disabled: boolean;
  onEdit(): void; onDelete(): void; children?: React.ReactNode;
}
export default function CommentMessageView({ message, now, showActions, disabled, onEdit, onDelete, children }: CommentMessageViewProps): React.ReactElement {
  const styles = useStyles(), time = formatCommentTime(message.createdAt, now);
  return <article className={styles.message} data-comment-message={message.id}>
    <div className={styles.meta}>
      <span className={styles.author}>{message.authorName}</span>
      <time className={styles.time} dateTime={message.createdAt} title={time.full}>{time.label}{message.updatedAt && " · 수정됨"}</time>
      {showActions && <CommentActionsMenu label={`${message.authorName} 답글 메뉴`} disabled={disabled} deleteLabel="답글 삭제" onEdit={onEdit} onDelete={onDelete} />}
    </div>
    {children ?? <CommentBody draft={message} />}
  </article>;
}
