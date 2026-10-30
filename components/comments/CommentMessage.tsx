"use client";

import { makeStyles, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import type { CommentDraft, CommentMessage } from "@/config/comments";
import { splitCommentText } from "@/lib/comments/mentions";
import { formatCommentTime } from "@/lib/comments/format";
import CommentActionsMenu from "./CommentActionsMenu";

const useStyles = makeStyles({
  message: { padding: "12px 0", borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  meta: { display: "flex", alignItems: "center", columnGap: "8px", rowGap: "4px", flexWrap: "wrap", marginBottom: "6px", minWidth: 0 },
  author: { fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 700, overflowWrap: "anywhere" },
  time: { marginLeft: "auto", color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, flexShrink: 0 },
  body: { fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: tokens.colorNeutralForeground1 },
  mention: { color: tokens.colorBrandForeground2, backgroundColor: tokens.colorBrandBackground2, borderRadius: "3px" },
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
