"use client";

import { Button, makeStyles, shorthands } from "@fluentui/react-components";
import { Send20Regular } from "@fluentui/react-icons";
import { useEffect, useId, useRef, useState } from "react";
import { COMMENT_PLACEHOLDER, type CommentDraft, type CommentUser } from "@/config/comments";
import { findMentionQuery, insertMention, reconcileMentionEdits, type MentionQuery } from "@/lib/comments/mentions";

const useStyles = makeStyles({
  root: { position: "relative", minWidth: 0 },
  input: { display: "block", width: "100%", boxSizing: "border-box", minHeight: "56px", maxHeight: "120px", resize: "none", padding: "10px", border: "1px solid #e6e7eb", borderRadius: "8px", fontFamily: "inherit", fontSize: "12px", lineHeight: "1.5", backgroundColor: "#fafafa", color: "#30313b", ":focus": { outline: "2px solid #d7192f33", ...shorthands.borderColor("#d7192f") }, "@media (max-height: 500px)": { minHeight: "40px", maxHeight: "64px" } },
  controls: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "8px" },
  hint: { color: "#94949c", fontSize: "10px", marginRight: "auto" },
  send: { minWidth: "32px", width: "32px", height: "32px", padding: 0, border: 0, borderRadius: "7px", backgroundColor: "#d7192f", color: "#fff", ":hover": { backgroundColor: "#b91427", color: "#fff" }, ":disabled": { backgroundColor: "#9ca3af", color: "#fff", opacity: 1 } },
  suggestions: { position: "absolute", zIndex: 4, bottom: "100%", left: 0, right: 0, maxHeight: "160px", overflowY: "auto", marginBottom: "6px", padding: "4px", border: "1px solid #e6e7eb", borderRadius: "8px", backgroundColor: "#fff", boxShadow: "0 4px 16px #10111422" },
  option: { display: "block", width: "100%", textAlign: "left", padding: "8px", border: 0, borderRadius: "4px", backgroundColor: "transparent", fontFamily: "inherit", fontSize: "12px", cursor: "pointer", '&[aria-selected="true"]': { backgroundColor: "#fff1f2", color: "#d7192f" } },
  empty: { padding: "8px", fontSize: "12px", color: "#74747d" },
});
export interface CommentComposerProps {
  mode: "new" | "reply" | "edit"; draft: CommentDraft; users: CommentUser[]; disabled: boolean; submitDisabled: boolean; autoFocus?: boolean;
  onChange(draft: CommentDraft): void; onSubmit(): void; onCancel?: () => void;
}
export default function CommentComposer(p: CommentComposerProps): React.ReactElement {
  const styles = useStyles(), id = useId(), input = useRef<HTMLTextAreaElement>(null), composing = useRef(false);
  const [query, setQuery] = useState<MentionQuery | null>(null), [active, setActive] = useState(0);
  const [menuHeight, setMenuHeight] = useState(160);
  const dismissed = useRef<string | null>(null), previousSelection = useRef<string | null>(null);
  const restoringCaret = useRef(false);
  const matches = query ? [...p.users].filter(u => u.name.toLocaleLowerCase().includes(query.query.toLocaleLowerCase())).sort((a, b) => a.name.localeCompare(b.name, "ko")).slice(0, 6) : [];
  const expanded = Boolean(query && !p.disabled);
  useEffect(() => { if (p.autoFocus) input.current?.focus({ preventScroll: true }); }, [p.autoFocus]);
  useEffect(() => {
    if (input.current) { input.current.style.height = "auto"; input.current.style.height = `${input.current.scrollHeight}px`; }
  }, [p.draft.text]);
  const selectionStamp = (draft: CommentDraft) => JSON.stringify([draft.text, input.current?.selectionStart, input.current?.selectionEnd]);
  const refresh = (draft = p.draft, force = false) => {
    if (!input.current || composing.current || restoringCaret.current) return;
    const stamp = selectionStamp(draft);
    if (force) dismissed.current = null;
    if (dismissed.current === stamp) return;
    if (previousSelection.current !== stamp) { setActive(0); previousSelection.current = stamp; }
    const popup = input.current.closest("[data-comment-popup]");
    if (popup) setMenuHeight(Math.max(32, Math.min(160, input.current.getBoundingClientRect().top - popup.getBoundingClientRect().top - 56)));
    setQuery(findMentionQuery(draft, input.current.selectionStart, input.current.selectionEnd));
  };
  const choose = (user: CommentUser) => {
    if (!query) return;
    const result = insertMention(p.draft, query, user);
    restoringCaret.current = true;
    p.onChange(result.draft); setQuery(null);
    requestAnimationFrame(() => { input.current?.focus({ preventScroll: true }); input.current?.setSelectionRange(result.caret, result.caret); restoringCaret.current = false; });
  };
  return <div className={styles.root} data-comment-composer={p.mode} data-comment-control>
    {expanded && <div className={styles.suggestions} style={{ maxHeight: menuHeight }} role="listbox" id={id} aria-label="멘션할 사람">
      {matches.length ? matches.map((user, i) => <button type="button" tabIndex={-1} role="option" id={`${id}-${i}`} aria-selected={i === Math.min(active, matches.length - 1)} className={styles.option} key={user.id}
        onPointerDown={e => { e.preventDefault(); choose(user); }}>@{user.name}</button>) : <div className={styles.empty}>일치하는 사람이 없습니다.</div>}
    </div>}
    <textarea ref={input} className={styles.input} value={p.draft.text} disabled={p.disabled} placeholder={COMMENT_PLACEHOLDER}
      aria-label={p.mode === "edit" ? "의견 수정" : "의견 입력"} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      aria-activedescendant={expanded && matches.length ? `${id}-${Math.min(active, matches.length - 1)}` : undefined}
      onChange={e => { const draft = reconcileMentionEdits(p.draft, e.target.value); p.onChange(draft); refresh(draft, true); }}
      onSelect={() => refresh()} onClick={() => refresh(p.draft, true)} onBlur={() => setQuery(null)}
      onCompositionStart={() => { composing.current = true; setQuery(null); }} onCompositionEnd={() => { composing.current = false; refresh(); }}
      onKeyDown={e => {
        if (composing.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
        if (expanded) {
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); dismissed.current = selectionStamp(p.draft); setQuery(null); return; }
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault(); e.stopPropagation(); if (matches.length) setActive(i => (i + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length); return;
          }
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); if (matches.length) choose(matches[Math.min(active, matches.length - 1)]); return; }
        }
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!p.disabled && !p.submitDisabled) p.onSubmit(); }
      }}
    />
    <div className={styles.controls}><span className={styles.hint}>Shift + Enter 줄바꿈</span>
      {p.onCancel && <Button size="small" appearance="subtle" onClick={p.onCancel}>취소</Button>}
      <Button type="button" className={styles.send} icon={<Send20Regular />} data-comment-send aria-label={p.mode === "edit" ? "수정 저장" : "의견 등록"} disabled={p.disabled || p.submitDisabled} onClick={p.onSubmit} />
    </div>
  </div>;
}
