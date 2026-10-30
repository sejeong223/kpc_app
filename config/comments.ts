export const COMMENT_SURFACE_ID = "production-preview" as const;
export const COMMENT_DB_NAME = "kpc-pin-comments";
export const COMMENT_DB_VERSION = 1;
export const COMMENT_PLACEHOLDER = "의견 남기기 (@이름 멘션) · Enter 등록";
export const COMMENT_VISUALS = {
  red: "#d7192f", gray: "#9ca3af", white: "#fff", pinSize: 24,
  pinFontSize: 10.5, pinFontWeight: 850, popupDefaultWidth: 360,
  popupDefaultHeight: 360, popupMinWidth: 320, popupMinHeight: 240,
  popupLabelWidth: 420, mobileBreakpoint: 760,
} as const;

export type CommentStatus = "open" | "resolved";
export interface CommentScope { namespace: string; surfaceId: typeof COMMENT_SURFACE_ID }
export interface CommentUser { id: string; name: string; isMock: boolean }
export interface CommentIdentity { scope: CommentScope; actor: CommentUser }
export interface CommentPoint { xRatio: number; yRatio: number }
export interface CommentMention { userId: string; name: string; start: number; end: number }
export interface CommentDraft { text: string; mentions: CommentMention[] }
export interface CommentSurface extends CommentScope {
  seedVersion: 1; nextNumber: number; createdAt: string;
}
export interface CommentThread extends CommentScope, CommentPoint {
  id: string; number: number; rootMessageId: string; authorId: string;
  status: CommentStatus; createdAt: string; updatedAt: string;
  resolvedAt: string | null; resolvedBy: string | null;
  revision: number; isSeed: boolean;
}
export interface CommentMessage extends CommentScope, CommentDraft {
  id: string; threadId: string; kind: "root" | "reply";
  authorId: string; authorName: string; createdAt: string; updatedAt: string | null;
  revision: number; isSeed: boolean;
}
export interface CommentSnapshot {
  scope: CommentScope; surface: CommentSurface; users: CommentUser[];
  threads: CommentThread[]; messages: CommentMessage[];
}
export type CommentErrorCode =
  | "empty" | "invalid" | "forbidden" | "not_found" | "conflict"
  | "resolved" | "unidentified" | "db_unavailable" | "db_blocked" | "storage";
export type CommentCommand =
  | { type: "create-thread"; threadId: string; messageId: string; point: CommentPoint; draft: CommentDraft }
  | { type: "reply"; threadId: string; messageId: string; draft: CommentDraft }
  | { type: "edit-message"; messageId: string; expectedRevision: number; draft: CommentDraft }
  | { type: "delete-message"; messageId: string; expectedRevision: number }
  | { type: "delete-thread"; threadId: string; expectedRevision: number }
  | { type: "move-thread"; threadId: string; expectedRevision: number; point: CommentPoint }
  | { type: "set-status"; threadId: string; expectedRevision: number; status: CommentStatus };
