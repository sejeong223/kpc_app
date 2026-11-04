import type { CommentCommand, CommentIdentity, CommentSnapshot } from "@/config/comments";
import type { ProjectRequest } from "@/types/workspace-production";
import type { CanvasCommentCapabilities } from "@/lib/workspace/production/canvas-comments";
import { WorkspaceError } from "@/lib/workspace/production/errors";
import { CommentError } from "./domain";
import type { CommentRepository } from "./repository";
export interface CanvasCommentBinding {
    projectId: string;
    round: number;
    snapshotId: string | null;
}
export interface CanvasCommentRead {
    snapshot: CommentSnapshot;
    request: ProjectRequest;
    capabilities: CanvasCommentCapabilities;
}
export interface WorkspaceCommentRepositoryOptions {
    binding: CanvasCommentBinding;
    identity: CommentIdentity;
    read(): Promise<CanvasCommentRead>;
    execute(request: ProjectRequest, command: CommentCommand): Promise<CanvasCommentRead>;
}
export class WorkspaceCommentRepository implements CommentRepository {
    private closed = false;
    private last: CanvasCommentRead | null = null;
    constructor(private readonly options: WorkspaceCommentRepositoryOptions) { }
    getRevision(): number | null { return this.last?.request.expectedRevision ?? null; }
    private check(identity: CommentIdentity): void {
        if (this.closed)
            throw new CommentError("storage", "종료된 의견 화면입니다.");
        const expected = this.options.identity;
        if (identity.actor.id !== expected.actor.id || identity.scope.namespace !== expected.scope.namespace || identity.scope.surfaceId !== expected.scope.surfaceId)
            throw new CommentError("forbidden", "다른 프로젝트의 의견입니다.");
    }
    private accept(value: CanvasCommentRead, identity: CommentIdentity): CommentSnapshot {
        this.check(identity);
        if (value.request.projectId !== this.options.binding.projectId || value.snapshot.scope.namespace !== identity.scope.namespace || value.snapshot.scope.surfaceId !== identity.scope.surfaceId)
            throw new CommentError("forbidden", "의견 조회 범위가 변경되었습니다.");
        this.last = value;
        return value.snapshot;
    }
    private async mapped(operation: () => Promise<CommentSnapshot>): Promise<CommentSnapshot> {
        try {
            return await operation();
        }
        catch (error) {
            if (error instanceof WorkspaceError)
                throw new CommentError(error.code === "CONFLICT" ? "conflict" : error.code === "FORBIDDEN" || error.code === "READ_ONLY" ? "forbidden" : error.code === "NOT_FOUND" ? "not_found" : error.code === "VALIDATION" || error.code === "LIMIT" ? "invalid" : "storage", error.message, { cause: error });
            throw error;
        }
    }
    load(identity: CommentIdentity): Promise<CommentSnapshot> {
        return this.mapped(async () => { this.check(identity); return this.accept(await this.options.read(), identity); });
    }
    execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot> {
        return this.mapped(async () => {
            this.check(identity);
            const last = this.last;
            if (!last)
                throw new CommentError("invalid", "의견을 먼저 불러와 주세요.");
            if (this.options.binding.snapshotId || last.capabilities.readOnly || last.request.expectedRound !== this.options.binding.round)
                throw new CommentError("forbidden", "이 회차의 의견은 읽기 전용입니다.");
            return this.accept(await this.options.execute(last.request, command), identity);
        });
    }
    close(): void { this.closed = true; }
}
