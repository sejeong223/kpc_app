import type {
  ProjectCommentThread,
  ProjectView,
} from "@/types/workspace-production";
import type { CommentBounds, PixelPoint } from "@/lib/comments/geometry";
import { clientPointToRatio } from "@/lib/comments/geometry";
export interface ProjectCommentView {
  threads: ProjectCommentThread[];
  openCount: number;
  readOnly: boolean;
  review: boolean;
  canCreate: boolean;
  canResolve: boolean;
  editableMessageIds: string[];
  movableThreadIds: string[];
  readonlyThreadIds: string[];
}
export function selectProjectComments(
  view: ProjectView,
  slideId: string,
  snapshotId: string | null,
): ProjectCommentView {
  const { state, actor } = view,
    section = state.body.sections.find(
      (s) =>
        s.id === state.body.slides.find((s) => s.id === slideId)?.sectionId,
    ),
    readOnly = snapshotId !== null,
    review = state.phase === "completed",
    threads = [
      ...state.body.threads,
      ...(readOnly
        ? []
        : state.reviews.filter((t) => t.round === state.currentRound)),
    ].filter((t) => t.slideId === slideId),
    readonlyThreadIds = threads
      .filter(
        (t) =>
          readOnly || (review && !state.reviews.some((r) => r.id === t.id)),
      )
      .map((t) => t.id),
    writable = threads.filter(
      (t) => !readonlyThreadIds.includes(t.id) && t.status === "open",
    );
  return {
    threads,
    openCount: threads.filter((t) => t.status === "open").length,
    readOnly,
    review,
    canCreate: !readOnly && !!section,
    canResolve:
      !readOnly &&
      !!section &&
      (actor.role === "super_admin" ||
        view.project.pmId === actor.id ||
        section.assigneeIds.includes(actor.id)),
    editableMessageIds: writable.flatMap((t) =>
      t.messages
        .filter((m) => m.authorId === actor.id && !m.deletedAt)
        .map((m) => m.id),
    ),
    movableThreadIds: writable
      .filter((t) => t.authorId === actor.id && !t.messages[0].deletedAt)
      .map((t) => t.id),
    readonlyThreadIds,
  };
}
export function pointInsideSlide(point: PixelPoint, bounds: CommentBounds) {
  if (
    point.x < bounds.left ||
    point.x > bounds.right ||
    point.y < bounds.top ||
    point.y > bounds.bottom
  )
    return null;
  return clientPointToRatio(point, bounds);
}
