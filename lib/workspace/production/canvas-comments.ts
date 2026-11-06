import type { CommentCommand, CommentErrorCode, CommentSnapshot, CommentUser } from "@/config/comments";
import { applyCommentCommand, CommentError, normalizeCommentDraft, validateCommentSnapshot } from "@/lib/comments/domain";
import { canAccessFileProject } from "@/lib/workspace/files/permissions";
import type { CanvasCommentState, CanvasCommentThread, RoundBody, ProjectWorkspaceState, WorkspaceContext, WorkspaceErrorCode } from "@/types/workspace-production";
import { workspaceAssert as check, WorkspaceError } from "./errors";
import { CanvasCommandSchema } from "./canvas-schemas";
import { canManageProject } from "./permissions";
export interface CanvasCommentCapabilities {
    slideIds: string[];
    readOnly: boolean;
    canCreate: boolean;
    replyThreadIds: string[];
    moveThreadIds: string[];
    statusThreadIds: string[];
    deleteThreadIds: string[];
    editableMessageIds: string[];
    deletableMessageIds: string[];
}
export function visibleCanvasThreads(body: RoundBody): (CanvasCommentThread & { slideId: string })[] {
    const ids = new Set(body.slides.map(s => s.id));
    return body.canvasComments.threads.filter((t): t is CanvasCommentThread & { slideId: string } => typeof t.slideId === "string" && ids.has(t.slideId));
}
export function canvasCapabilities(state: ProjectWorkspaceState, context: WorkspaceContext, readOnly: boolean): CanvasCommentCapabilities {
    const allowed = !readOnly && state.phase === "writing" && canAccessFileProject(context.identity, context.project);
    const accessible = state.projectId === context.project.id && canAccessFileProject(context.identity, context.project);
    const threads = accessible ? visibleCanvasThreads(state.body) : [], ids = new Set(threads.map(t => t.id));
    const canvas = { threads, messages: state.body.canvasComments.messages.filter(m => ids.has(m.threadId)) }, actor = context.identity.actor.id;
    return {
        slideIds: accessible ? state.body.slides.map(s => s.id) : [],
        readOnly: !allowed || !accessible, canCreate: allowed && accessible,
        replyThreadIds: allowed ? canvas.threads.filter(t => t.status === "open").map(t => t.id) : [],
        moveThreadIds: allowed ? canvas.threads.map(t => t.id) : [],
        statusThreadIds: allowed ? canvas.threads.filter(t => t.authorId === actor || canManageProject(context)).map(t => t.id) : [],
        deleteThreadIds: allowed ? canvas.threads.filter(t => t.authorId === actor).map(t => t.id) : [],
        editableMessageIds: allowed ? canvas.messages.filter(m => m.authorId === actor).map(m => m.id) : [],
        deletableMessageIds: allowed ? canvas.messages.filter(m => m.authorId === actor && m.kind === "reply").map(m => m.id) : [],
    };
}
export function projectCanvasSnapshot(state: ProjectWorkspaceState, context: WorkspaceContext, createdAt: string): CommentSnapshot {
    check(state.projectId === context.project.id && canAccessFileProject(context.identity, context.project), "FORBIDDEN", "프로젝트 접근 권한이 없습니다.");
    const canvas = state.body.canvasComments;
    const scope = { surfaceId: "production-preview" as const, namespace: JSON.stringify([context.identity.namespace, state.projectId, state.currentRound]) };
    const users = new Map<string, CommentUser>(context.members.map(m => [m.id, { id: m.id, name: m.name, isMock: context.identity.actor.isMock }]));
    const { id, name, isMock } = context.identity.actor;
    users.set(id, { id, name, isMock });
    // 과거 참여자는 조회 무결성 확인에만 포함한다. 신규 멘션 자격은 별도로 검사한다.
    const historical = (id: string, name: string) => { if (!users.has(id))
        users.set(id, { id, name, isMock: false }); };
    for (const m of canvas.messages) {
        historical(m.authorId, m.authorName);
        m.mentions.forEach(v => historical(v.userId, v.name));
    }
    for (const t of canvas.threads) {
        historical(t.authorId, "이전 참여자");
        if (t.resolvedBy)
            historical(t.resolvedBy, "이전 참여자");
    }
    return validateCommentSnapshot({
        scope, surface: { ...scope, seedVersion: 1, nextNumber: canvas.nextNumber, createdAt }, users: [...users.values()],
        threads: canvas.threads.map(({ carriedFrom, ...t }) => { void carriedFrom; return { ...scope, ...t }; }),
        messages: canvas.messages.map(m => ({ ...scope, ...m })),
    }, scope);
}
const errors: Record<CommentErrorCode, WorkspaceErrorCode> = { empty: "VALIDATION", invalid: "VALIDATION", resolved: "VALIDATION", forbidden: "FORBIDDEN", unidentified: "FORBIDDEN", not_found: "NOT_FOUND", conflict: "CONFLICT", db_unavailable: "DB_UNAVAILABLE", db_blocked: "DB_BLOCKED", storage: "STORAGE" };
export function applyCanvasCommand(state: ProjectWorkspaceState, command: CommentCommand, context: WorkspaceContext, createdAt: string, reservedIds: Set<string>): {
    canvas: CanvasCommentState;
    createdIds: string[];
} {
    check(state.phase === "writing", "READ_ONLY", "이 회차의 의견은 읽기 전용입니다.");
    const parsed = CanvasCommandSchema.safeParse(command);
    check(parsed.success, "VALIDATION", "의견 입력을 확인해 주세요.");
    const operation = parsed.data, caps = canvasCapabilities(state, context, false);
    check(caps.canCreate, "FORBIDDEN", "프로젝트 접근 권한이 없습니다.");
    const target = operation.type === "create-thread" ? operation.slideId : state.body.canvasComments.threads.find(t =>
        t.id === ("threadId" in operation ? operation.threadId : state.body.canvasComments.messages.find(m => m.id === operation.messageId)?.threadId))?.slideId;
    check(typeof target === "string" && state.body.slides.some(s => s.id === target), "NOT_FOUND", "의견을 남길 슬라이드를 찾을 수 없습니다.");
    if (operation.type === "set-status") {
        check(state.body.canvasComments.threads.some(t => t.id === operation.threadId), "NOT_FOUND", "의견을 찾을 수 없습니다.");
        check(caps.statusThreadIds.includes(operation.threadId), "FORBIDDEN", "작성자, PM과 슈퍼 관리자만 처리 상태를 변경할 수 있습니다.");
    }
    const createdIds = operation.type === "create-thread" ? [operation.threadId, operation.messageId] : operation.type === "reply" ? [operation.messageId] : [];
    check(new Set(createdIds).size === createdIds.length && createdIds.every(id => !reservedIds.has(id)), "VALIDATION", "의견 식별자가 중복되었습니다.");
    try {
        if ("draft" in operation) {
            normalizeCommentDraft(operation.draft, context.members.map(m => ({ id: m.id, name: m.name, isMock: false })));
            check(operation.draft.mentions.every(m => context.members.some(u => u.id === m.userId && u.name === m.name)), "VALIDATION", "멘션 사용자를 다시 선택해 주세요.");
        }
        const { id, name, isMock } = context.identity.actor;
        const next = applyCommentCommand(projectCanvasSnapshot(state, context, createdAt), { id, name, isMock }, operation, context.now);
        const prior = new Map(state.body.canvasComments.threads.map(t => [t.id, t.carriedFrom]));
        return { createdIds, canvas: { nextNumber: next.surface.nextNumber,
                threads: next.threads.map(({ namespace, surfaceId, ...t }) => { void namespace; void surfaceId; return { ...t, slideId: t.slideId ?? null, carriedFrom: prior.get(t.id) ?? null }; }),
                messages: next.messages.map(({ namespace, surfaceId, ...m }) => { void namespace; void surfaceId; return m; }),
            } };
    }
    catch (error) {
        if (error instanceof CommentError)
            throw new WorkspaceError(errors[error.code], error.message, { cause: error });
        throw error;
    }
}
export function carryCanvasComments(source: CanvasCommentState, round: number, newId: () => string): CanvasCommentState {
    const next: CanvasCommentState = { nextNumber: source.nextNumber, threads: [], messages: [] };
    for (const thread of source.threads.filter(t => t.status === "open")) {
        const id = newId();
        const messages = source.messages.filter(m => m.threadId === thread.id).map(m => ({ ...m, id: newId(), threadId: id, revision: 1 }));
        const root = messages.find(m => m.kind === "root");
        check(!!root, "STORAGE", "의견 본문을 찾을 수 없습니다.");
        next.threads.push({ ...thread, id, rootMessageId: root.id, revision: 1, carriedFrom: { round, threadId: thread.id } });
        next.messages.push(...messages);
    }
    return next;
}
