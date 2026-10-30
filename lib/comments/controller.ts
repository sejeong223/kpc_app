import {
  COMMENT_VISUALS, type CommentCommand, type CommentDraft, type CommentErrorCode,
  type CommentIdentity, type CommentPoint, type CommentSnapshot, type CommentStatus, type CommentUser,
} from "@/config/comments";

import { canEditComment, CommentError, normalizeCommentDraft } from "./domain";
import type { CommentRepository } from "./repository";

export type CommentView = { kind: "new" } | { kind: "thread"; threadId: string } | null;
export interface CommentEditorDraft extends CommentDraft { revision: number; baseRevision: number | null }
export interface CommentPopupSize { width: number; height: number }
export interface CommentControllerState {
  status: "idle" | "loading" | "ready" | "error";
  snapshot: CommentSnapshot | null;
  error: { code: CommentErrorCode; message: string } | null;
  busy: boolean; pinMode: boolean; view: CommentView; pendingPoint: CommentPoint | null;
  drafts: Record<string, CommentEditorDraft>; editingMessageId: string | null; popupSize: CommentPopupSize;
}
export type CommentOperationResult = { ok: true } | { ok: false; code: CommentErrorCode | "busy"; message: string };
export interface CommentControllerOptions {
  identity: CommentIdentity; repositoryFactory: () => CommentRepository; createId?: () => string;
}
export function createCommentControllerState(): CommentControllerState {
  return { status: "idle", snapshot: null, error: null, busy: false, pinMode: false, view: null,
    pendingPoint: null, drafts: {}, editingMessageId: null,
    popupSize: { width: COMMENT_VISUALS.popupDefaultWidth, height: COMMENT_VISUALS.popupDefaultHeight } };
}
function asError(error: unknown): CommentError {
  return error instanceof CommentError ? error : new CommentError("storage", "코멘트를 처리하지 못했습니다. 다시 시도해 주세요.", { cause: error });
}
function checkPoint(point: CommentPoint): void {
  if (![point.xRatio, point.yRatio].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new CommentError("invalid", "핀 위치를 다시 선택해 주세요.");
  }
}

export class CommentController {
  private state = createCommentControllerState();
  private readonly listeners = new Set<() => void>();
  private repository: CommentRepository | null = null;
  private pendingLoad: Promise<void> | null = null;
  private epoch = 0;
  private identity: CommentIdentity;
  constructor(private readonly options: CommentControllerOptions) { this.identity = structuredClone(options.identity); }
  getSnapshot = (): CommentControllerState => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<CommentControllerState>): void {
    if (Object.entries(patch).every(([key, value]) => this.state[key as keyof CommentControllerState] === value)) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private repo(): CommentRepository { return this.repository ??= this.options.repositoryFactory(); }
  private ready(): CommentSnapshot {
    if (this.state.status !== "ready" || !this.state.snapshot) throw new CommentError("invalid", "코멘트를 먼저 불러와 주세요.");
    return this.state.snapshot;
  }
  private ui(action: () => void): void {
    try { action(); } catch (error) { const failure = asError(error); this.update({ error: { code: failure.code, message: failure.message } }); }
  }
  private message(id: string) {
    const value = this.ready().messages.find((m) => m.id === id);
    if (!value) throw new CommentError("not_found", "의견을 찾을 수 없습니다. 다시 불러와 주세요.");
    return value;
  }
  private thread(id: string) {
    const value = this.ready().threads.find((t) => t.id === id);
    if (!value) throw new CommentError("not_found", "대화를 찾을 수 없습니다. 다시 불러와 주세요.");
    return value;
  }
  private ownedMessage(id: string) {
    const message = this.message(id);
    if (!canEditComment(message, this.identity.actor.id)) throw new CommentError("forbidden", "본인이 작성한 의견만 수정할 수 있습니다.");
    return message;
  }

  load(): Promise<void> {
    if (this.state.busy) return Promise.resolve();
    if (this.pendingLoad) return this.pendingLoad;
    const epoch = this.epoch;
    this.update({ status: "loading", error: null });
    const pending = (async () => {
      try {
        const snapshot = await this.repo().load(this.identity);
        if (epoch !== this.epoch) return;
        const { drafts, view, editingMessageId } = this.prune(snapshot);
        const removedEdit = Object.keys(this.state.drafts).some((key) => key.startsWith("edit:") && !drafts[key]);
        this.update({ status: "ready", snapshot, drafts, view, editingMessageId,
          error: removedEdit ? { code: "not_found", message: "삭제된 의견의 수정 초안을 정리했습니다." } : null });
      } catch (error) {
        if (epoch === this.epoch) { const failure = asError(error); this.update({ status: "error", error: { code: failure.code, message: failure.message } }); }
      }
    })().finally(() => { if (this.pendingLoad === pending) this.pendingLoad = null; });
    this.pendingLoad = pending;
    return pending;
  }
  private prune(snapshot: CommentSnapshot) {
    const threads = new Set(snapshot.threads.map((t) => t.id));
    const messages = new Set(snapshot.messages.map((m) => m.id));
    const drafts = Object.fromEntries(Object.entries(this.state.drafts).filter(([key]) =>
      key === "new" || (key.startsWith("reply:") && threads.has(key.slice(6))) || (key.startsWith("edit:") && messages.has(key.slice(5)))));
    const view = this.state.view?.kind === "thread" && !threads.has(this.state.view.threadId) ? null : this.state.view;
    const editingMessageId = this.state.editingMessageId && messages.has(this.state.editingMessageId) ? this.state.editingMessageId : null;
    return { drafts, view, editingMessageId };
  }
  updateActor(actor: CommentUser): void {
    this.ui(() => {
      if (actor.id !== this.identity.actor.id || !actor.name.trim()) throw new CommentError("unidentified", "사용자 정보가 변경되었습니다.");
      this.identity = { ...this.identity, actor: { ...actor } };
    });
  }
  togglePinMode(): void {
    this.ui(() => {
      this.ready(); if (this.state.busy) return;
      if (this.state.pendingPoint && this.state.drafts.new?.text.trim()) {
        this.update({ view: { kind: "new" }, pinMode: false, editingMessageId: null });
      } else this.update({ pinMode: !this.state.pinMode, view: null, editingMessageId: null });
    });
  }
  placePin(point: CommentPoint): void {
    this.ui(() => {
      this.ready(); checkPoint(point); if (this.state.busy) return;
      this.update({ pendingPoint: { ...point }, view: { kind: "new" }, pinMode: false, editingMessageId: null });
    });
  }
  movePendingPin(point: CommentPoint): void {
    this.ui(() => { checkPoint(point); if (this.state.pendingPoint && !this.state.busy) this.update({ pendingPoint: { ...point } }); });
  }
  openThread(threadId: string): void {
    this.ui(() => { this.thread(threadId); this.update({ view: { kind: "thread", threadId }, pinMode: false, editingMessageId: null }); });
  }
  closePopup(): void {
    const drafts = { ...this.state.drafts };
    const keepPending = Boolean(drafts.new?.text.trim());
    if (!keepPending) delete drafts.new;
    this.update({ view: null, pinMode: false, editingMessageId: null,
      pendingPoint: keepPending ? this.state.pendingPoint : null, drafts });
  }
  suspendUi(): void { this.closePopup(); }
  setDraft(key: string, draft: CommentDraft): void {
    this.ui(() => {
      if (key === "new") {
        if (!this.state.pendingPoint) throw new CommentError("invalid", "핀 위치를 먼저 선택해 주세요.");
      } else if (key.startsWith("reply:")) this.thread(key.slice(6));
      else if (key.startsWith("edit:")) {
        this.ownedMessage(key.slice(5));
        if (!this.state.drafts[key]) throw new CommentError("invalid", "수정 메뉴에서 의견을 열어 주세요.");
      } else throw new CommentError("invalid", "작성 대상을 확인해 주세요.");
      const previous = this.state.drafts[key];
      if (previous?.text === draft.text && JSON.stringify(previous.mentions) === JSON.stringify(draft.mentions)) return;
      this.update({ drafts: { ...this.state.drafts, [key]: { text: draft.text, mentions: draft.mentions.map((m) => ({ ...m })),
        revision: (previous?.revision ?? 0) + 1, baseRevision: previous?.baseRevision ?? null } }, error: null });
    });
  }
  startEdit(messageId: string): void {
    this.ui(() => {
      const message = this.ownedMessage(messageId);
      const key = `edit:${messageId}`;
      const draft = this.state.drafts[key] ?? { text: message.text, mentions: message.mentions.map((m) => ({ ...m })), revision: 1, baseRevision: message.revision };
      this.update({ view: { kind: "thread", threadId: message.threadId }, editingMessageId: messageId, drafts: { ...this.state.drafts, [key]: draft } });
    });
  }
  rebaseEdit(messageId: string): void {
    this.ui(() => {
      const message = this.ownedMessage(messageId);
      const key = `edit:${messageId}`, draft = this.state.drafts[key];
      if (!draft) return;
      this.update({ drafts: { ...this.state.drafts, [key]: { ...draft, baseRevision: message.revision, revision: draft.revision + 1 } }, error: null });
    });
  }
  cancelEdit(): void {
    const drafts = { ...this.state.drafts };
    if (this.state.editingMessageId) delete drafts[`edit:${this.state.editingMessageId}`];
    this.update({ drafts, editingMessageId: null });
  }
  setPopupSize(size: CommentPopupSize): void {
    if ([size.width, size.height].every((n) => Number.isFinite(n) && n > 0)
      && (size.width !== this.state.popupSize.width || size.height !== this.state.popupSize.height)) this.update({ popupSize: { ...size } });
  }
  clearError(): void { if (this.state.status === "ready") this.update({ error: null }); }

  private async mutate(build: () => { command: CommentCommand; draftKey?: string }): Promise<CommentOperationResult> {
    if (this.state.busy) return { ok: false, code: "busy", message: "저장 중입니다." };
    const epoch = this.epoch;
    try {
      this.ready();
      const { command, draftKey } = build();
      const submittedRevision = draftKey ? this.state.drafts[draftKey]?.revision : undefined;
      const submittedView = this.state.view;
      this.update({ busy: true, error: null });
      const snapshot = await this.repo().execute(this.identity, command);
      if (epoch !== this.epoch) return { ok: false, code: "storage", message: "작업 화면이 변경되었습니다." };
      const patch = this.prune(snapshot);
      if (draftKey && patch.drafts[draftKey]?.revision === submittedRevision) delete patch.drafts[draftKey];
      if (command.type === "edit-message") {
        const remaining = patch.drafts[`edit:${command.messageId}`];
        if (remaining) patch.drafts[`edit:${command.messageId}`] = { ...remaining, baseRevision: snapshot.messages.find((m) => m.id === command.messageId)!.revision };
        else if (patch.editingMessageId === command.messageId) patch.editingMessageId = null;
      }
      let pendingPoint = this.state.pendingPoint;
      if (command.type === "create-thread" && !patch.drafts.new) {
        pendingPoint = null;
        if (submittedView === this.state.view && submittedView?.kind === "new") patch.view = { kind: "thread", threadId: command.threadId };
      }
      this.update({ ...patch, snapshot, pendingPoint, busy: false, error: null });
      return { ok: true };
    } catch (error) {
      const failure = asError(error);
      if (epoch === this.epoch) this.update({ busy: false, error: { code: failure.code, message: failure.message } });
      return { ok: false, code: failure.code, message: failure.message };
    }
  }
  private draft(key: string): CommentDraft {
    const draft = this.state.drafts[key];
    return normalizeCommentDraft({ text: draft?.text ?? "", mentions: draft?.mentions ?? [] }, this.ready().users);
  }
  submitNew(): Promise<CommentOperationResult> {
    return this.mutate(() => {
      if (!this.state.pendingPoint) throw new CommentError("invalid", "핀 위치를 선택해 주세요.");
      const id = this.options.createId ?? (() => crypto.randomUUID());
      return { command: { type: "create-thread", threadId: id(), messageId: id(), point: this.state.pendingPoint, draft: this.draft("new") }, draftKey: "new" };
    });
  }
  submitReply(threadId: string): Promise<CommentOperationResult> {
    return this.mutate(() => ({ command: { type: "reply", threadId,
      messageId: (this.options.createId ?? (() => crypto.randomUUID()))(), draft: this.draft(`reply:${threadId}`) }, draftKey: `reply:${threadId}` }));
  }
  saveEdit(messageId: string): Promise<CommentOperationResult> {
    return this.mutate(() => {
      const draft = this.state.drafts[`edit:${messageId}`];
      if (!draft?.baseRevision) throw new CommentError("invalid", "수정 메뉴에서 의견을 열어 주세요.");
      return { command: { type: "edit-message", messageId, expectedRevision: draft.baseRevision, draft: this.draft(`edit:${messageId}`) }, draftKey: `edit:${messageId}` };
    });
  }
  deleteReply(messageId: string): Promise<CommentOperationResult> {
    return this.mutate(() => ({ command: { type: "delete-message", messageId, expectedRevision: this.message(messageId).revision } }));
  }
  deleteThread(threadId: string): Promise<CommentOperationResult> {
    return this.mutate(() => ({ command: { type: "delete-thread", threadId, expectedRevision: this.thread(threadId).revision } }));
  }
  moveThread(threadId: string, point: CommentPoint): Promise<CommentOperationResult> {
    return this.mutate(() => ({ command: { type: "move-thread", threadId, point, expectedRevision: this.thread(threadId).revision } }));
  }
  setStatus(threadId: string, status: CommentStatus): Promise<CommentOperationResult> {
    return this.mutate(() => ({ command: { type: "set-status", threadId, status, expectedRevision: this.thread(threadId).revision } }));
  }
  dispose(): void {
    this.epoch++;
    this.repository?.close(); this.repository = null; this.pendingLoad = null;
    this.state = { ...this.state, status: this.state.snapshot ? "ready" : "idle", busy: false };
  }
}
