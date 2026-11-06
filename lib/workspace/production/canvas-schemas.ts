import { CommentCommandSchema } from "@/lib/comments/domain";
import { z } from "zod";
import { WORKSPACE_LIMITS } from "@/config/workspace-production";
import type { CanvasCommentState, ProjectWorkspaceState, V2ProjectWorkspaceState } from "@/types/workspace-production";
const id = z.string().min(1).max(400).regex(/^\S+$/);
const count = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const time = z.iso.datetime();
const mention = z.strictObject({ userId: id, name: z.string().min(1).max(500), start: z.number().int().nonnegative(), end: count });
const thread = z.strictObject({
    id, slideId: id.nullable().default(null), number: count, rootMessageId: id, authorId: id, status: z.enum(["open", "resolved"]),
    xRatio: z.number().finite().min(0).max(1), yRatio: z.number().finite().min(0).max(1),
    createdAt: time, updatedAt: time, resolvedAt: time.nullable(), resolvedBy: id.nullable(),
    revision: count, isSeed: z.boolean(), carriedFrom: z.strictObject({ round: count, threadId: id }).nullable(),
});
const message = z.strictObject({
    id, threadId: id, kind: z.enum(["root", "reply"]), authorId: id, authorName: z.string().min(1).max(500),
    text: z.string().min(1).max(WORKSPACE_LIMITS.comment), mentions: z.array(mention).max(100),
    createdAt: time, updatedAt: time.nullable(), revision: count, isSeed: z.boolean(),
});
export const CanvasCommentStateSchema = z.strictObject({
    nextNumber: count, threads: z.array(thread).max(5000), messages: z.array(message).max(50000),
}).superRefine((state, ctx) => {
    const issue = () => ctx.addIssue({ code: "custom", message: "화면 의견의 연결 정보를 확인해 주세요." });
    const threads = new Map(state.threads.map(t => [t.id, t]));
    const messages = new Map(state.messages.map(m => [m.id, m]));
    if (new Set([...threads.keys(), ...messages.keys()]).size !== state.threads.length + state.messages.length ||
        new Set(state.threads.map(t => t.number)).size !== state.threads.length)
        issue();
    for (const t of state.threads) {
        const root = messages.get(t.rootMessageId);
        if (!root || root.threadId !== t.id || root.kind !== "root" || root.authorId !== t.authorId ||
            state.messages.filter(m => m.threadId === t.id && m.kind === "root").length !== 1 || t.number >= state.nextNumber || t.updatedAt < t.createdAt ||
            (t.status === "open" ? t.resolvedAt !== null || t.resolvedBy !== null : !t.resolvedAt || !t.resolvedBy || t.resolvedAt < t.createdAt || t.resolvedAt > t.updatedAt))
            issue();
    }
    for (const m of state.messages) {
        const t = threads.get(m.threadId);
        if (!t || m.createdAt < t.createdAt || (m.updatedAt !== null && m.updatedAt < m.createdAt) || m.text.trim() !== m.text)
            issue();
        let end = 0;
        for (const mention of m.mentions) {
            if (mention.start < end || mention.end <= mention.start || mention.end > m.text.length || m.text.slice(mention.start, mention.end) !== `@${mention.name}`)
                issue();
            end = mention.end;
        }
    }
}) satisfies z.ZodType<CanvasCommentState>;
export function emptyCanvasComments(): CanvasCommentState { return { nextNumber: 1, threads: [], messages: [] }; }
export function canvasReferenceErrors(state: ProjectWorkspaceState | V2ProjectWorkspaceState): string[] {
    const errors: string[] = [];
    const bodies = [{ round: state.currentRound, body: state.body }, ...state.snapshots,
        ...(state.undo ? [{ round: state.undo.round, body: state.undo.previousBody }] : [])];
    for (const { body, round } of bodies) {
        const slideIds = new Set(body.threads.flatMap(t => [t.id, ...t.messages.map(m => m.id)]));
        if ([...body.canvasComments.threads, ...body.canvasComments.messages].some(v => slideIds.has(v.id)))
            errors.push("슬라이드 의견과 화면 의견의 식별자가 중복되었습니다.");
        for (const t of body.canvasComments.threads) {
            const from = t.carriedFrom;
            if (from && (from.round >= round || from.threadId === t.id || !state.snapshots.some(s => s.round === from.round && s.body.canvasComments.threads.some(old => old.id === from.threadId))))
                errors.push("이전 회차 의견의 연결이 다릅니다.");
        }
    }
    return errors;
}
export const CanvasCommandSchema = CommentCommandSchema.superRefine((command, ctx) => {
    if (command.type === "create-thread" && !id.safeParse(command.slideId).success)
        ctx.addIssue({ code: "custom", path: ["slideId"], message: "의견을 남길 슬라이드를 선택해 주세요." });
    const identifiers = [...("threadId" in command ? [command.threadId] : []), ...("messageId" in command ? [command.messageId] : [])];
    if (identifiers.some(value => !id.safeParse(value).success))
        ctx.addIssue({ code: "custom", message: "의견 식별자를 확인해 주세요." });
    if ("draft" in command && !message.pick({ text: true, mentions: true }).safeParse(command.draft).success)
        ctx.addIssue({ code: "custom", message: "의견 길이와 멘션을 확인해 주세요." });
});
