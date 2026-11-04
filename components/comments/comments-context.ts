"use client";
import { createContext } from "react";
import type { CommentIdentity, CommentUser } from "@/config/comments";
import { createCommentControllerState, type CommentController, type CommentControllerState } from "@/lib/comments/controller";
import type { CanvasCommentCapabilities } from "@/lib/workspace/production/canvas-comments";
export interface CommentsContextValue {
    identity: CommentIdentity | null;
    state: CommentControllerState;
    controller: CommentController | null;
    capabilities: CanvasCommentCapabilities;
    mentionUsers: CommentUser[];
    roundConflict?: { from: number; to: number; reload(): void };
}
export const inactiveComments: CommentsContextValue = {
    identity: null, controller: null, state: createCommentControllerState(), mentionUsers: [],
    capabilities: { readOnly: true, canCreate: false, replyThreadIds: [], moveThreadIds: [], statusThreadIds: [], deleteThreadIds: [], editableMessageIds: [], deletableMessageIds: [] },
};
export const CommentsContext = createContext<CommentsContextValue>(inactiveComments);
export const LegacyCommentIdentityContext = createContext<CommentIdentity | null>(null);
