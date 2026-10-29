import type { CommentDraft, CommentUser } from "@/config/comments";

import { CommentError } from "./domain";

export interface MentionQuery { start: number; end: number; query: string }
export type CommentTextPart = { kind: "text"; text: string } | { kind: "mention"; text: string; userId: string };

export function findMentionQuery(draft: CommentDraft, selectionStart: number, selectionEnd: number): MentionQuery | null {
  if (!Number.isInteger(selectionStart) || selectionStart !== selectionEnd || selectionStart < 0 || selectionStart > draft.text.length
    || draft.mentions.some((m) => selectionStart > m.start && selectionStart <= m.end)) return null;
  const match = /(?:^|\s)@([^\s@]*)$/u.exec(draft.text.slice(0, selectionStart));
  if (!match) return null;
  const start = selectionStart - match[1].length - 1;
  let end = selectionStart;
  while (end < draft.text.length && !/[\s@]/u.test(draft.text[end])) end++;
  return { start, end, query: match[1] };
}

export function insertMention(draft: CommentDraft, query: MentionQuery, user: CommentUser): { draft: CommentDraft; caret: number } {
  if (!Number.isInteger(query.start) || !Number.isInteger(query.end) || query.start < 0
    || query.end <= query.start || query.end > draft.text.length || draft.text[query.start] !== "@"
    || !user.id.trim() || !user.name.trim()) throw new CommentError("invalid", "멘션할 사용자를 다시 선택해 주세요.");
  const label = `@${user.name}`;
  const replacement = label + " ";
  const delta = replacement.length - (query.end - query.start);
  const mentions = draft.mentions.flatMap((m) => {
    if (m.end <= query.start) return [{ ...m }];
    if (m.start >= query.end) return [{ ...m, start: m.start + delta, end: m.end + delta }];
    return [];
  });
  mentions.push({ userId: user.id, name: user.name, start: query.start, end: query.start + label.length });
  mentions.sort((a, b) => a.start - b.start);
  return {
    draft: { text: draft.text.slice(0, query.start) + replacement + draft.text.slice(query.end), mentions },
    caret: query.start + replacement.length,
  };
}

export function reconcileMentionEdits(previous: CommentDraft, nextText: string): CommentDraft {
  let start = 0;
  while (start < previous.text.length && start < nextText.length && previous.text[start] === nextText[start]) start++;
  let oldEnd = previous.text.length;
  let newEnd = nextText.length;
  while (oldEnd > start && newEnd > start && previous.text[oldEnd - 1] === nextText[newEnd - 1]) { oldEnd--; newEnd--; }
  const delta = newEnd - oldEnd;
  return { text: nextText, mentions: previous.mentions.flatMap((m) => {
    if (m.end <= start) return [{ ...m }];
    if (m.start >= oldEnd) return [{ ...m, start: m.start + delta, end: m.end + delta }];
    return [];
  }).filter((m) => nextText.slice(m.start, m.end) === `@${m.name}`) };
}

export function splitCommentText(draft: CommentDraft): CommentTextPart[] {
  const parts: CommentTextPart[] = [];
  let position = 0;
  for (const mention of [...draft.mentions].sort((a, b) => a.start - b.start)) {
    if (mention.start < position || mention.end <= mention.start || mention.end > draft.text.length
      || draft.text.slice(mention.start, mention.end) !== `@${mention.name}`) continue;
    if (mention.start > position) parts.push({ kind: "text", text: draft.text.slice(position, mention.start) });
    parts.push({ kind: "mention", text: draft.text.slice(mention.start, mention.end), userId: mention.userId });
    position = mention.end;
  }
  if (position < draft.text.length) parts.push({ kind: "text", text: draft.text.slice(position) });
  return parts;
}
