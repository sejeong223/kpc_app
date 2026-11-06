import { PROJECT_PERMISSIONS } from "@/config/workspace-production";
import { visibleCanvasThreads } from "./canvas-comments";
import type {
  ProjectPermission,
  ProjectWorkspaceState,
  WorkspaceContext,
} from "@/types/workspace-production";
import {
  canEditSection,
  canManageProject,
  canProjectAction,
  isSectionAuthor,
} from "./permissions";
import type {
  ProjectView,
  WorkspaceBundle,
} from "@/types/workspace-production";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import { workspaceAssert as check } from "./errors";
import type { ChecklistItem } from "@/types/workspace-production";
export interface TocRow {
  kind: "chapter" | "section";
  id: string;
  chapterId: string | null;
  number: string;
  title: string;
  assigneeIds: string[];
  reviewerIds: string[];
  state: "writing" | "done" | null;
  locked: boolean;
  sectionCount: number;
  doneCount: number;
  slideCount: number;
  openComments: number;
  coverage: { full: number; partial: number; none: number };
  canStructure: boolean;
  canAssign: boolean;
  canEdit: boolean;
  canUnlock: boolean;
}
export function selectTocRows(view: ProjectView): TocRow[] {
  const { state, capabilities: c } = view,
    body = state.body,
    numbers = outlineNumbers(state);
  return body.chapters.flatMap((chapter) => {
    const sections = body.sections.filter((s) => s.chapterId === chapter.id);
    const row = (
      item: typeof chapter | (typeof sections)[number],
      ids: string[],
      kind: TocRow["kind"],
    ): TocRow => {
      const sub = sections.filter((s) => ids.includes(s.id)),
        locked = sub.some((s) => s.locked),
        requirements = body.requirements.filter(
          (r) => r.sectionId && ids.includes(r.sectionId),
        );
      return {
        kind,
        id: item.id,
        chapterId: "chapterId" in item ? item.chapterId : null,
        number: numbers[item.id],
        title: item.title,
        assigneeIds: "assigneeIds" in item ? item.assigneeIds : [],
        reviewerIds: "reviewerIds" in item ? item.reviewerIds : [],
        state: "state" in item ? item.state : null,
        locked,
        sectionCount: sub.length,
        doneCount: sub.filter((s) => s.state === "done").length,
        slideCount: body.slides.filter((s) => ids.includes(s.sectionId)).length,
        openComments: [
          ...body.threads,
          ...state.reviews.filter((t) => t.round === state.currentRound),
        ].filter((t) => ids.includes(t.sectionId) && t.status === "open")
          .length + visibleCanvasThreads(body).filter(t => t.status === "open" && body.slides.some(s => s.id === t.slideId && ids.includes(s.sectionId))).length,
        coverage: {
          full: requirements.filter((r) => r.coverage === "full").length,
          partial: requirements.filter((r) => r.coverage === "partial").length,
          none: requirements.filter((r) => r.coverage === "none").length,
        },
        canStructure: c.actions.outline && !locked,
        canAssign: kind === "section" && c.actions.assign && !locked,
        canEdit: kind === "section" && c.editableSectionIds.includes(item.id),
        canUnlock:
          kind === "section" && c.unlockableSectionIds.includes(item.id),
      };
    };
    return [
      row(
        chapter,
        sections.map((s) => s.id),
        "chapter",
      ),
      ...sections.map((s) => row(s, [s.id], "section")),
    ];
  });
}
export function selectDeletionImpact(view: ProjectView, id: string) {
  const row = selectTocRows(view).find((r) => r.id === id),
    sectionIds =
      row?.kind === "chapter"
        ? view.state.body.sections
            .filter((s) => s.chapterId === id)
            .map((s) => s.id)
        : row
          ? [id]
          : [],
    slide = view.state.body.slides.find((s) => s.id === id);
  const slideIds = slide
      ? [slide.id]
      : view.state.body.slides
          .filter((s) => sectionIds.includes(s.sectionId))
          .map((s) => s.id),
    blocked = slide
      ? !view.capabilities.editableSectionIds.includes(slide.sectionId)
      : !row?.canStructure;
  return {
    sectionIds,
    slideIds,
    openComments: view.state.body.threads.filter(
      (t) => slideIds.includes(t.slideId) && t.status === "open",
    ).length + visibleCanvasThreads(view.state.body).filter(t => t.status === "open" && slideIds.includes(t.slideId)).length,
    blocked,
    reasons: blocked
      ? [
          row?.locked
            ? "고정된 소목차를 먼저 해제해 주세요."
            : "삭제 권한이 없거나 읽기 전용 회차입니다.",
        ]
      : [],
  };
}
export function selectChecklistPermissions(
  view: ProjectView,
  item: ChecklistItem,
  actorId: string,
) {
  return {
    structure: view.capabilities.actions.outline,
    assign: view.capabilities.actions.assign,
    check:
      view.state.phase === "writing" &&
      (view.capabilities.managePermissions ||
        item.assigneeIds.includes(actorId)),
  };
}
export function getCompletionSummary(state: ProjectWorkspaceState) {
  return {
    writingSections: state.body.sections.filter((s) => s.state === "writing")
      .length,
    openComments: [
      ...visibleCanvasThreads(state.body),
      ...state.body.threads,
      ...state.reviews.filter((t) => t.round === state.currentRound),
    ].filter((t) => t.status === "open").length,
    uncheckedItems: state.body.checklist.filter((c) => !c.done).length,
    slideCount: state.body.slides.length,
  };
}
export function getWorkspaceCapabilities(
  context: WorkspaceContext,
  state: ProjectWorkspaceState,
) {
  const actions = Object.fromEntries(
    PROJECT_PERMISSIONS.map((p) => [p, canProjectAction(context, state, p)]),
  ) as Record<ProjectPermission, boolean>;
  return {
    managePermissions: canManageProject(context),
    actions,
    editableSectionIds: state.body.sections
      .filter((s) => canEditSection(context, state, s.id))
      .map((s) => s.id),
    unlockableSectionIds: state.body.sections
      .filter(
        (s) =>
          state.phase === "writing" &&
          s.locked &&
          isSectionAuthor(context, state, s.id),
      )
      .map((s) => s.id),
  };
}
export function outlineNumbers(
  state: Pick<ProjectWorkspaceState, "body">,
): Record<string, string> {
  return Object.fromEntries(
    state.body.chapters.flatMap((c, i) => [
      [c.id, String(i + 1)],
      ...state.body.sections
        .filter((s) => s.chapterId === c.id)
        .map((s, j) => [s.id, `${i + 1}.${j + 1}`]),
    ]),
  );
}
export function selectProjectView(
  bundle: WorkspaceBundle,
  context: WorkspaceContext,
  access: ProjectView["assetAccess"],
): ProjectView {
  requireFileProjectAccess(context.identity, context.project);
  check(
    bundle.state.projectId === context.project.id &&
      bundle.files.projectId === context.project.id,
    "FORBIDDEN",
    "다른 프로젝트의 조회 정보입니다.",
  );
  const round=bundle.files.rounds.find(r=>r.number===bundle.state.currentRound);
  check(!!round,"STORAGE","현재 자료 회차를 찾을 수 없습니다.");
  return {
    roundCreatedAt:round.createdAt,
    actor: { id: context.identity.actor.id, role: context.identity.actor.role },
    project: structuredClone(context.project),
    members: structuredClone([...context.members]),
    state: structuredClone(bundle.state),
    fileRevision: bundle.files.revision,
    capabilities: getWorkspaceCapabilities(context, bundle.state),
    assetAccess: structuredClone(access),
  };
}
export function selectSnapshotView(
  view: ProjectView,
  snapshotId: string | null,
): ProjectView {
  if (!snapshotId) return view;
  const snapshot = view.state.snapshots.find((s) => s.id === snapshotId);
  check(!!snapshot, "NOT_FOUND", "보관본이 없습니다.");
  return {
    ...view,
    roundCreatedAt:snapshot.createdAt,
    state: {
      ...view.state,
      body: snapshot.body,
      reviews: [],
      currentRound: snapshot.round,
      phase: "completed",
      undo: null,
    },
    capabilities: {
      managePermissions: false,
      actions: {
        outline: false,
        assign: false,
        setup: false,
        complete: false,
        rework: false,
      },
      editableSectionIds: [],
      unlockableSectionIds: [],
    },
  };
}
