"use client";

import { Button, makeStyles } from "@fluentui/react-components";
import { Checkmark16Regular, Dismiss16Regular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { COMMENT_VISUALS, type CommentDraft } from "@/config/comments";
import { canEditComment, canManageThread, getThreadMessages, normalizeCommentDraft } from "@/lib/comments/domain";
import { placeCommentPopup, resizeCommentPopup, type PixelPoint, type PopupLimits, type PopupRect, type ResizeEdge } from "@/lib/comments/geometry";
import CommentActionsMenu from "./CommentActionsMenu";
import CommentComposer from "./CommentComposer";
import CommentMessageView, { CommentBody } from "./CommentMessage";
import { useComments } from "./CommentsProvider";

const EMPTY: CommentDraft = { text: "", mentions: [] };
const useStyles = makeStyles({
  root: { position: "fixed", zIndex: 10, display: "flex", flexDirection: "column", boxSizing: "border-box", backgroundColor: "#fff", border: "1px solid #e6e7eb", borderRadius: "12px", boxShadow: "0 18px 48px rgba(16,17,20,.16), 0 2px 6px rgba(16,17,20,.06)", overflow: "hidden", color: "#30313b" },
  header: { display: "flex", alignItems: "center", gap: "4px", minHeight: "48px", padding: "8px 16px", boxSizing: "border-box", flexShrink: 0, borderBottom: "1px solid #eeeef1", position: "relative", zIndex: 2 },
  title: { fontSize: "13px", fontWeight: 700, margin: 0, marginRight: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ":focus": { outline: "none" } },
  action: { minWidth: "30px", height: "30px", padding: "0 6px", fontSize: "12px", flexShrink: 0 },
  body: { flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px", overscrollBehavior: "contain" },
  footer: { padding: "12px 20px 20px 16px", borderTop: "1px solid #eeeef1", flexShrink: 0, maxHeight: "65%", overflowY: "auto" },
  note: { color: "#74747d", fontSize: "12px", lineHeight: "1.6", margin: "12px 0" },
  error: { padding: "8px 16px", fontSize: "12px", color: "#a31525", backgroundColor: "#fff1f2", overflowY: "auto", maxHeight: "25%", flexShrink: 0 },
  conflict: { padding: "8px", border: "1px solid #efc1c8", borderRadius: "6px", marginBottom: "8px", fontSize: "12px" },
  confirm: { padding: "16px", overflowY: "auto", minHeight: 0, flex: 1, fontSize: "12px", lineHeight: "1.6" },
  confirmButtons: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" },
  handle: { position: "absolute", border: 0, padding: 0, backgroundColor: "transparent", touchAction: "none", zIndex: 5, ":focus-visible": { outline: "2px solid #d7192f", outlineOffset: "-2px" } },
  grip: { display: "block", position: "absolute", right: "5px", bottom: "5px", width: "10px", height: "10px", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, #b3b3bc 3px 4px)" },
});
interface Props { anchor: PixelPoint; limits: PopupLimits; now: number; onClose(): void }
type Confirmation = { kind: "thread" | "reply"; id: string } | null;
interface Gesture { start: PopupRect; point: PixelPoint; edge: ResizeEdge; element: HTMLButtonElement; pointerId: number }

export default function CommentPopover({ anchor, limits, now, onClose }: Props): React.ReactElement | null {
  const styles = useStyles(), { state, controller, identity } = useComments();
  const [manual, setManual] = useState<{ signature: string; rect: PopupRect } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const gesture = useRef<Gesture | null>(null), root = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null), cancelButton = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const threadId = state.view?.kind === "thread" ? state.view.threadId : null;
  const thread = state.snapshot?.threads.find(t => t.id === threadId);
  const isNew = state.view?.kind === "new";
  const signature = JSON.stringify([anchor, limits]);
  const rect = manual?.signature === signature ? manual.rect : placeCommentPopup(anchor, state.popupSize, limits);
  const messages = thread && state.snapshot ? getThreadMessages(state.snapshot, thread.id) : [];
  const resolved = thread?.status === "resolved";
  const unavailable = state.status !== "ready" || !controller;
  const locked = unavailable || state.busy || Boolean(confirmation);
  useEffect(() => {
    mounted.current = true;
    if (!root.current?.querySelector("textarea:not(:disabled)")) root.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    return () => { mounted.current = false; gesture.current = null; };
  }, []);
  useEffect(() => { if (confirmation) cancelButton.current?.focus(); }, [confirmation]);
  if (!controller || !identity || !state.snapshot || (!thread && !isNew)) return null;
  const users = state.snapshot.users;
  const canSubmit = (draft: CommentDraft, original?: CommentDraft) => {
    try {
      const normalized = normalizeCommentDraft({ text: draft.text, mentions: draft.mentions }, users);
      return !original || JSON.stringify(normalized) !== JSON.stringify({ text: original.text, mentions: original.mentions });
    } catch { return false; }
  };
  const sizeTo = (next: PopupRect) => { setManual({ signature, rect: next }); controller.setPopupSize({ width: next.width, height: next.height }); };
  const endResize = (cancel = false) => {
    const current = gesture.current; gesture.current = null;
    if (!current) return;
    if (cancel) sizeTo(current.start);
    if (current.element.hasPointerCapture(current.pointerId)) current.element.releasePointerCapture(current.pointerId);
  };
  const focusComposer = () => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("textarea:not(:disabled), h2")?.focus({ preventScroll: true }));
  const deleteConfirmed = async () => {
    if (!confirmation) return;
    const result = await (confirmation.kind === "thread" ? controller.deleteThread(confirmation.id) : controller.deleteReply(confirmation.id));
    if (!result.ok) return;
    if (confirmation.kind === "thread" && !controller.getSnapshot().view) requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-comment-create]")?.focus());
    else if (mounted.current) { setConfirmation(null); focusComposer(); }
  };
  const composerKey = isNew ? "new" : `reply:${thread!.id}`;
  const draft = state.drafts[composerKey] ?? EMPTY;

  return <div ref={root} id="production-comment-popup" data-comment-popup data-comment-control className={styles.root}
    style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} role="dialog" aria-modal={false} aria-labelledby="comment-popup-title"
    onKeyDownCapture={e => { if (e.key === "Escape" && gesture.current) { e.preventDefault(); e.stopPropagation(); endResize(true); } }}
    onKeyDown={e => { if (e.key === "Escape" && !e.defaultPrevented && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) { e.preventDefault(); e.stopPropagation(); if (confirmation) { setConfirmation(null); focusComposer(); } else onClose(); } }}>
    <div className={styles.header}>
      <h2 id="comment-popup-title" tabIndex={-1} className={styles.title}>{isNew ? "새 코멘트" : `코멘트 ${thread!.number}`}</h2>
      {thread && canManageThread(thread, identity.actor.id) && <CommentActionsMenu label="코멘트 메뉴" disabled={locked} deleteLabel="대화 전체 삭제"
        onEdit={() => controller.startEdit(thread.rootMessageId)} onDelete={() => setConfirmation({ kind: "thread", id: thread.id })} />}
      {thread && <Button className={styles.action} appearance="subtle" icon={<Checkmark16Regular />} disabled={locked} aria-label={resolved ? "다시 열기" : "반영 완료"} aria-pressed={resolved}
        onClick={() => void controller.setStatus(thread.id, resolved ? "open" : "resolved")}>{rect.width >= COMMENT_VISUALS.popupLabelWidth ? (resolved ? "다시 열기" : "반영 완료") : null}</Button>}
      <Button className={styles.action} appearance="subtle" icon={<Dismiss16Regular />} aria-label="코멘트 닫기" onClick={onClose} />
    </div>
    {state.error && <div className={styles.error} role="alert">{state.error.message} <Button size="small" appearance="subtle" disabled={state.busy || state.status === "loading"} onClick={() => void controller.load()}>최신 내용 불러오기</Button></div>}
    {confirmation ? <div className={styles.confirm} role="alertdialog" aria-modal={false} aria-labelledby="comment-delete-title" aria-describedby="comment-delete-description">
      <strong id="comment-delete-title">{confirmation.kind === "thread" ? "대화를 삭제할까요?" : "답글을 삭제할까요?"}</strong>
      <p id="comment-delete-description">{confirmation.kind === "thread" ? `이 핀과 첫 의견, 답글 ${Math.max(0, messages.length - 1)}개가 함께 삭제됩니다.` : "선택한 답글만 삭제됩니다."}</p>
      <div className={styles.confirmButtons}><Button ref={cancelButton} onClick={() => { setConfirmation(null); focusComposer(); }}>취소</Button><Button disabled={state.busy || unavailable} onClick={() => void deleteConfirmed()}>삭제</Button></div>
    </div> : <>
      <div ref={body} className={styles.body}>
        {isNew && <p className={styles.note}>이 위치에 남길 의견을 작성해 주세요.</p>}
        {resolved && <p className={styles.note}>반영 완료된 코멘트입니다. 다시 열면 답글을 남길 수 있어요.</p>}
        {messages.map(message => {
          const editing = state.editingMessageId === message.id;
          const editDraft = state.drafts[`edit:${message.id}`];
          const conflict = editDraft?.baseRevision !== message.revision;
          return <CommentMessageView key={message.id} message={message} now={now} showActions={message.kind === "reply" && canEditComment(message, identity.actor.id)} disabled={locked}
            onEdit={() => controller.startEdit(message.id)} onDelete={() => setConfirmation({ kind: "reply", id: message.id })}>
            {editing && editDraft ? <>
              {conflict && <div className={styles.conflict}><p>저장된 내용이 변경되었습니다.</p><CommentBody draft={message} /><Button size="small" disabled={locked} onClick={() => controller.rebaseEdit(message.id)}>최신 내용 기준으로 수정</Button></div>}
              <CommentComposer mode="edit" draft={editDraft} users={users} autoFocus disabled={unavailable} submitDisabled={locked || conflict || !canSubmit(editDraft, message)}
                onChange={value => controller.setDraft(`edit:${message.id}`, value)} onSubmit={() => void controller.saveEdit(message.id)} onCancel={() => { controller.cancelEdit(); focusComposer(); }} />
            </> : undefined}
          </CommentMessageView>;
        })}
      </div>
      <div className={styles.footer} style={rect.height >= 240 ? { overflowY: "visible", maxHeight: "none" } : undefined}>
        <CommentComposer mode={isNew ? "new" : "reply"} draft={draft} users={users} autoFocus={!resolved}
          disabled={unavailable || Boolean(resolved) || Boolean(state.editingMessageId)} submitDisabled={locked || !canSubmit(draft)}
          onChange={value => controller.setDraft(composerKey, value)} onSubmit={() => {
            void (isNew ? controller.submitNew() : controller.submitReply(thread!.id)).then(result => {
              if (result.ok) requestAnimationFrame(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; });
            });
          }} />
      </div>
    </>}
    {(["e", "s", "se"] as const).map(edge => <button type="button" key={edge} data-comment-resize={edge} className={styles.handle}
      style={edge === "e" ? { right: 0, top: 48, bottom: 24, width: 8, cursor: "ew-resize" } : edge === "s" ? { left: 12, right: 24, bottom: 0, height: 8, cursor: "ns-resize" } : { right: 0, bottom: 0, width: 24, height: 24, cursor: "nwse-resize" }}
      aria-label={`팝업 ${edge === "e" ? "너비" : edge === "s" ? "높이" : "너비와 높이"} 조절 (방향키, Shift로 크게)`}
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); gesture.current = { start: rect, point: { x: e.clientX, y: e.clientY }, edge, element: e.currentTarget, pointerId: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const g = gesture.current; if (g && g.pointerId === e.pointerId) sizeTo(resizeCommentPopup(g.start, { x: e.clientX - g.point.x, y: e.clientY - g.point.y }, g.edge, limits)); }}
      onPointerUp={() => endResize()} onPointerCancel={() => endResize(true)} onLostPointerCapture={() => endResize(true)}
      onKeyDown={e => { const step = e.shiftKey ? 32 : 16; const delta = { x: e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0, y: e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0 }; if (delta.x || delta.y) { e.preventDefault(); sizeTo(resizeCommentPopup(rect, delta, edge, limits)); } }}>
      {edge === "se" && <span className={styles.grip} />}
    </button>)}
  </div>;
}
