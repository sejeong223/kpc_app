import { applyCanvasCommand, carryCanvasComments } from "./canvas-comments";
import { emptyCanvasComments } from "./canvas-schemas";
import { MFG_DEMO_PROJECT_ID } from "@/config/production-mfg-demo";
import { applyManufacturingPromptContent, manufacturingLayout } from "./manufacturing-prompt";
import type { FileProjectState } from "@/types/workspace-files";
import type {
  AssetPin,
  PreparedWorkspaceMutation,
  ProjectPermission,
  ProjectWorkspaceState,
  ProposalSlide,
  RoundBody,
  Section,
  WorkspaceContext,
  WorkspaceReceipt,
} from "@/types/workspace-production";
import { WORKSPACE_LIMITS } from "@/config/workspace-production";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import {
  FileIsoSchema,
  FileProjectStateSchema,
} from "@/lib/workspace/files/schemas";
import { advanceFileRound } from "@/lib/workspace/files/domain";
import { WorkspaceError, workspaceAssert as check } from "./errors";
import {
  PreparedWorkspaceMutationSchema,
  WorkspaceIdSchema,
  WorkspaceStateSchema,
} from "./schemas";
import {
  canEditSection,
  canEditSlide,
  canInsertSlide,
  canManageProject,
  applyProjectGrants,
  canProjectAction,
  isSectionAuthor,
} from "./permissions";
import { applyProjectComment } from "./comment-domain";
import { moveSlideSelection } from "./editor";
import { resolveProjectPrompt } from "./prompt-resolution";
import { hasLockedSlides, isSlideLocked, normalizeWorkspaceCompletion } from "./section-locks";

function validateContext(context: WorkspaceContext): void {
  try {
    requireFileProjectAccess(context.identity, context.project);
  } catch (error) {
    throw new WorkspaceError(
      "FORBIDDEN",
      "프로젝트 접근 정보를 확인해 주세요.",
      { cause: error },
    );
  }
  check(
    FileIsoSchema.safeParse(context.now).success &&
      typeof context.newId === "function",
    "VALIDATION",
    "저장 시각을 확인해 주세요.",
  );
  check(
    new Set(context.members.map((m) => m.id)).size === context.members.length &&
      context.members.some((m) => m.id === context.project.pmId),
    "VALIDATION",
    "프로젝트 참여자를 확인해 주세요.",
  );
}
export function emptyRoundBody(): RoundBody {
  return {
    chapters: [],
    sections: [],
    slides: [],
    requirements: [],
    checklist: [],
    settings: {
      promptPinId: null,
      skillPinId: null,
      templatePinId: null,
      bindings: [],
      overrides: [],
    },
    threads: [],
    canvasComments: emptyCanvasComments(),
  };
}
export function createWorkspaceState(
  context: WorkspaceContext,
  files: FileProjectState,
): ProjectWorkspaceState {
  validateContext(context);
  check(
    FileProjectStateSchema.safeParse(files).success &&
      files.projectId === context.project.id,
    "STORAGE",
    "프로젝트 자료 정보를 확인해 주세요.",
  );
  return {
    nextCommentNumber: 1,
    schemaVersion: 3,
    projectId: context.project.id,
    revision: 1,
    inputRevision: 1,
    currentRound: files.currentRound,
    phase: "writing",
    grants: [],
    body: emptyRoundBody(),
    snapshots: [],
    pins: [],
    pptVersions: [],
    reviews: [],
    undo: null,
  };
}
function putRelative<T extends { id: string }>(
  rows: T[],
  value: T,
  reference: string | null,
  after: boolean,
): T[] {
  check(
    reference !== value.id,
    "VALIDATION",
    "자기 자신을 이동 위치로 지정할 수 없습니다.",
  );
  const filtered = rows.filter((row) => row.id !== value.id);
  const index =
    reference === null
      ? filtered.length
      : filtered.findIndex((row) => row.id === reference);
  check(index >= 0, "NOT_FOUND", "이동 기준 항목이 없습니다.");
  filtered.splice(index + (reference !== null && after ? 1 : 0), 0, value);
  return filtered;
}
export function currentSlideSettings(
  state: ProjectWorkspaceState,
  sectionId: string,
): ProposalSlide["usedSettings"] {
  const settings = state.body.settings,
    pin = state.pins.find((p) => p.id === settings.promptPinId),
    itemId =
      settings.bindings.find((b) => b.sectionId === sectionId)?.itemId ?? null;
  const resolved = resolveProjectPrompt(
    pin?.kind === "prompt" ? pin.snapshot.items : [],
    itemId,
    settings.overrides,
  );
  return {
    skillPinId: settings.skillPinId,
    promptPinId: settings.promptPinId,
    promptItemId: resolved.itemId,
    prompt: resolved.prompt,
    sources: resolved.sources,
  };
}
export function applyWorkspaceMutation(
  source: ProjectWorkspaceState,
  input: PreparedWorkspaceMutation,
  context: WorkspaceContext,
  sourceFiles: FileProjectState,
): { receipt: WorkspaceReceipt; files: FileProjectState } {
  validateContext(context);
  const stored = WorkspaceStateSchema.safeParse(source),
    parsed = PreparedWorkspaceMutationSchema.safeParse(input);
  check(stored.success, "STORAGE", "저장된 프로젝트 정보를 확인해 주세요.");
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues.some((i) => i.code === "too_big")
        ? "LIMIT"
        : "VALIDATION",
      "입력값과 허용 범위를 확인해 주세요.",
    );
  const state: ProjectWorkspaceState = structuredClone(normalizeWorkspaceCompletion(stored.data)),
    operation = parsed.data.operation;
  let files = structuredClone(sourceFiles);
  check(
    FileProjectStateSchema.safeParse(files).success &&
      files.projectId === state.projectId &&
      files.currentRound === state.currentRound,
    "STORAGE",
    "파일과 제작 회차가 다릅니다.",
  );
  check(
    context.project.id === state.projectId &&
      input.projectId === state.projectId,
    "NOT_FOUND",
    "다른 프로젝트의 요청입니다.",
  );
  check(
    input.expectedRevision === state.revision &&
      input.expectedRound === state.currentRound,
    "CONFLICT",
    "작업 내용 또는 회차가 변경되었습니다. 다시 불러와 주세요.",
  );
  check(
    state.revision < Number.MAX_SAFE_INTEGER,
    "LIMIT",
    "작업 버전 한도입니다.",
  );
  const actorId = context.identity.actor.id,
    body = state.body,
    createdIds: string[] = [];
  const used = new Set([
    state.projectId,
    ...state.pins.map((v) => v.id),
    ...state.pptVersions.flatMap((v) => [v.id, v.blobId]),
    ...state.snapshots.map((v) => v.id),
  ]);
  for (const b of [body, ...state.snapshots.map((s) => s.body), ...(state.undo?[state.undo.previousBody]:[])])
    for (const row of [
      ...b.chapters,
      ...b.sections,
      ...b.slides,
      ...b.requirements,
      ...b.checklist,
      ...b.threads,
      ...b.canvasComments.threads,
      ...b.canvasComments.messages,
      ...b.threads.flatMap((t) => t.messages),
      ...b.slides.flatMap((s) => s.content.blocks),
    ])
      used.add(row.id);
  for (const t of state.reviews) {
    used.add(t.id);
    t.messages.forEach((m) => used.add(m.id));
  }
  const newId = () => {
    const value = WorkspaceIdSchema.safeParse(context.newId());
    check(
      value.success && !used.has(value.data),
      "STORAGE",
      "새 식별자를 생성하지 못했습니다.",
    );
    used.add(value.data);
    return value.data;
  };
  const writing = () =>
    check(
      state.phase === "writing",
      "READ_ONLY",
      "보관본은 수정할 수 없습니다. 재작업을 시작해 주세요.",
    );
  const action = (p: ProjectPermission) => {
    if (p !== "rework") writing();
    check(
      canProjectAction(context, state, p),
      "FORBIDDEN",
      "이 작업의 관리 권한이 없습니다.",
    );
  };
  const section = (id: string): Section => {
    const value = body.sections.find((s) => s.id === id);
    check(!!value, "NOT_FOUND", "섹션이 없습니다.");
    return value;
  };
  const unlocked = (id: string) => {
    writing();
    check(!section(id).locked && !hasLockedSlides(body, id), "LOCKED", "완료된 슬라이드를 먼저 해제해 주세요.");
  };
  const edit = (id: string) => {
    unlocked(id);
    check(
      canEditSection(context, state, id),
      "FORBIDDEN",
      "해당 섹션 담당자만 내용을 변경할 수 있습니다.",
    );
  };
  const slide = (id: string) => {
    const value = body.slides.find((s) => s.id === id);
    check(!!value, "NOT_FOUND", "슬라이드가 없습니다.");
    return value;
  };
  const members = (ids: string[]) =>
    check(
      ids.every((id) => context.members.some((m) => m.id === id)),
      "VALIDATION",
      "프로젝트 참여자만 지정할 수 있습니다.",
    );
  let changesInput = false,
    undoPermission: ProjectPermission | "content" | null = null,
    undoSections: string[] = [];
  const contentChanged = (ids: string[]) => {
    [...new Set(ids)].forEach(edit);
    changesInput = true;
    undoPermission = "content";
    undoSections = [...new Set(ids)];
  };
  const editSlide = (id: string) => {
    writing();
    const item = slide(id);
    check(!isSlideLocked(item), "LOCKED", "완료된 슬라이드를 먼저 해제해 주세요.");
    check(canEditSlide(context, state, id), "FORBIDDEN", "담당 슬라이드만 변경할 수 있습니다.");
  };
  const insertInto = (id: string) => {
    writing();
    check(!section(id).locked, "LOCKED", "완료된 소목차를 먼저 해제해 주세요.");
    check(canInsertSlide(context, state, id), "FORBIDDEN", "담당 소목차에만 추가할 수 있습니다.");
  };
  const contentSlidesChanged = (ids: string[], destinations: string[] = []) => {
    [...new Set(ids)].forEach(editSlide);
    [...new Set(destinations)].forEach(insertInto);
    changesInput = true;
    undoPermission = "content";
    undoSections = [...new Set([...ids.map(id => slide(id).sectionId), ...destinations])];
  };
  const validateSlideReplacement = (next: ProposalSlide[], nextSections = body.sections) => {
    const changedIds: string[] = [], destinations = new Set<string>();
    for (const old of body.slides) {
      const item = next.find(value => value.id === old.id);
      check(!item || item.state === old.state, "FORBIDDEN", "내용 반영으로 완료 상태를 변경할 수 없습니다.");
      if (JSON.stringify(item) !== JSON.stringify(old)) {
        changedIds.push(old.id);
        if (item && item.sectionId !== old.sectionId) destinations.add(item.sectionId);
      }
    }
    for (const item of next) if (!body.slides.some(old => old.id === item.id)) {
      check(item.state === "writing", "FORBIDDEN", "새 슬라이드는 작성 중으로 시작합니다.");
      destinations.add(item.sectionId);
    }
    const existing = [...destinations].filter(id => body.sections.some(s => s.id === id));
    for (const id of destinations) if (!existing.includes(id)) {
      action("outline");
      const owner = nextSections.find(s => s.id === id);
      check(!!owner, "NOT_FOUND", "대상 소목차가 없습니다.");
      check(canManageProject(context) || owner.assigneeIds.includes(actorId), "FORBIDDEN", "담당 소목차에만 추가할 수 있습니다.");
    }
    contentSlidesChanged(changedIds, existing);
    undoSections = [...new Set([...undoSections, ...destinations])];
  };
  const structure = (ids: string[]) => {
    action("outline");
    ids.forEach(unlocked);
    changesInput = true;
    undoPermission = "outline";
    undoSections = ids;
  };
  const removeSections = (ids: string[]) => {
    const deleted = new Set(ids);
    body.sections = body.sections.filter((s) => !deleted.has(s.id));
    body.slides = body.slides.filter((s) => !deleted.has(s.sectionId));
    body.threads = body.threads.filter((t) => !deleted.has(t.sectionId));
    body.requirements.forEach((r) => {
      if (r.sectionId && deleted.has(r.sectionId)) r.sectionId = null;
    });
    body.settings.bindings = body.settings.bindings.filter(
      (b) => !deleted.has(b.sectionId),
    );
  };
  const mergePins = (pins: AssetPin[]) => {
    for (const p of pins) {
      const old = state.pins.find((v) => v.id === p.id);
      check(
        !old || JSON.stringify(old) === JSON.stringify(p),
        "CONFLICT",
        "적용 사본은 변경할 수 없습니다.",
      );
      if (!old) state.pins.push(p);
    }
  };
  const snapshot = (kind: "complete" | "unfinished") => {
    check(
      !state.snapshots.some((s) => s.round === state.currentRound),
      "READ_ONLY",
      "이미 보관된 회차입니다.",
    );
    state.snapshots.push({
      id: newId(),
      round: state.currentRound,
      kind,
      createdAt: context.now,
      createdBy: actorId,
      inputRevision: state.inputRevision,
      body: structuredClone(body),
      fileEntries: structuredClone(
        files.rounds[files.currentRound - 1].entries,
      ),
      fileRevision: files.revision,
      pptVersionId:
        state.pptVersions
          .filter(
            (v) =>
              v.kind === "generated" &&
              v.round === state.currentRound &&
              v.inputRevision === state.inputRevision,
          )
          .at(-1)?.id ?? null,
    });
  };
  if (operation.type.startsWith("comment-")) {
    applyProjectComment(state, operation, context, newId, createdIds);
  } else
    switch (operation.type) {
      case "canvas-command": {
        const next=applyCanvasCommand(state,operation.command,context,files.rounds[files.currentRound-1].createdAt,used);
        body.canvasComments=next.canvas;
        createdIds.push(...next.createdIds);
        break;
      }
      case "add-chapter": {
        structure([]);
        check(
          !operation.beforeId || operation.afterId === null,
          "VALIDATION",
          "추가 위치를 하나만 지정해 주세요.",
        );
        const id = newId();
        body.chapters = putRelative(
          body.chapters,
          { id, title: operation.title },
          operation.beforeId ?? operation.afterId,
          !operation.beforeId,
        );
        createdIds.push(id);
        break;
      }
      case "rename-chapter": {
        const chapter = body.chapters.find((c) => c.id === operation.id);
        check(!!chapter, "NOT_FOUND", "대목차가 없습니다.");
        structure(
          body.sections
            .filter((s) => s.chapterId === chapter.id)
            .map((s) => s.id),
        );
        chapter.title = operation.title;
        break;
      }
      case "move-chapter": {
        const chapter = body.chapters.find((c) => c.id === operation.id);
        check(!!chapter, "NOT_FOUND", "대목차가 없습니다.");
        structure(
          body.sections
            .filter((s) => s.chapterId === chapter.id)
            .map((s) => s.id),
        );
        body.chapters = putRelative(
          body.chapters,
          chapter,
          operation.beforeId,
          false,
        );
        break;
      }
      case "remove-chapter": {
        check(
          body.chapters.some((c) => c.id === operation.id),
          "NOT_FOUND",
          "대목차가 없습니다.",
        );
        const ids = body.sections
          .filter((s) => s.chapterId === operation.id)
          .map((s) => s.id);
        structure(ids);
        removeSections(ids);
        body.chapters = body.chapters.filter((c) => c.id !== operation.id);
        break;
      }
      case "add-section": {
        structure([]);
        check(
          !operation.beforeId || operation.afterId === null,
          "VALIDATION",
          "추가 위치를 하나만 지정해 주세요.",
        );
        check(
          !operation.beforeId ||
            section(operation.beforeId).chapterId === operation.chapterId,
          "VALIDATION",
          "추가 위치가 다릅니다.",
        );
        check(
          body.chapters.some((c) => c.id === operation.chapterId),
          "NOT_FOUND",
          "대목차가 없습니다.",
        );
        check(
          operation.afterId === null ||
            section(operation.afterId).chapterId === operation.chapterId,
          "VALIDATION",
          "추가 위치가 다릅니다.",
        );
        const id = newId();
        body.sections = putRelative(
          body.sections,
          {
            id,
            chapterId: operation.chapterId,
            title: operation.title,
            assigneeIds: [context.project.pmId],
            reviewerIds: [],
            state: "writing",
            locked: false,
          },
          operation.beforeId ?? operation.afterId,
          !operation.beforeId,
        );
        createdIds.push(id);
        break;
      }
      case "rename-section": {
        structure([operation.id]);
        section(operation.id).title = operation.title;
        break;
      }
      case "move-section": {
        structure([operation.id]);
        check(
          body.chapters.some((c) => c.id === operation.chapterId),
          "NOT_FOUND",
          "대목차가 없습니다.",
        );
        check(
          operation.beforeId === null ||
            section(operation.beforeId).chapterId === operation.chapterId,
          "VALIDATION",
          "이동 위치가 다릅니다.",
        );
        const value = section(operation.id);
        value.chapterId = operation.chapterId;
        body.sections = putRelative(
          body.sections,
          value,
          operation.beforeId,
          false,
        );
        break;
      }
      case "remove-section":
        structure([operation.id]);
        removeSections([operation.id]);
        break;
      case "assign-section":
        action("assign");
        unlocked(operation.id);
        members(operation.assigneeIds);
        members(operation.reviewerIds);
        Object.assign(section(operation.id), {
          assigneeIds: operation.assigneeIds,
          reviewerIds: operation.reviewerIds,
        });
        break;
      case "set-grants":
        state.grants=applyProjectGrants(context,state,[{userId:operation.userId,permissions:operation.permissions}]);
        break;
      case "set-grants-batch":
        state.grants=applyProjectGrants(context,state,operation.grants);
        break;
      case "apply-manufacturing-prompt": {
        check(state.projectId === MFG_DEMO_PROJECT_ID, "VALIDATION", "제조업 예시에서만 사용할 수 있습니다.");
        const target = slide(operation.slideId), owner = section(operation.sectionId);
        check(target.sectionId === owner.id, "VALIDATION", "다른 섹션의 슬라이드입니다.");
        check(owner.assigneeIds.includes(actorId), "FORBIDDEN", "담당자만 본문을 수정할 수 있습니다.");
        check(!!operation.prompt.intro.trim() || operation.prompt.bullets.some(item => item.trim()), "VALIDATION", "본문 내용을 입력해 주세요.");
        check(!target.template, "LAYOUT", "Template 슬라이드는 문서 편집기를 사용해 주세요.");
        contentSlidesChanged([target.id]);
        target.content = applyManufacturingPromptContent(target.content, operation.prompt, manufacturingLayout(state.projectId, target), newId);
        target.revision++;
        owner.demoPrompt = structuredClone(operation.prompt);
        break;
      }
      case "set-slide-state":
      case "unlock-slide": {
        writing();
        const item = slide(operation.id);
        check(isSectionAuthor(context, state, item.sectionId), "FORBIDDEN", "담당자만 상태를 변경할 수 있습니다.");
        if (operation.type === "unlock-slide")
          check(isSlideLocked(item), "VALIDATION", "고정된 슬라이드가 아닙니다.");
        const next = operation.type === "unlock-slide" ? "writing" : operation.state;
        if (item.state !== next) { item.state = next; item.revision++; }
        break;
      }
      case "set-section-state":
      case "unlock-section": {
        writing();
        check(
          isSectionAuthor(context, state, operation.id),
          "FORBIDDEN",
          "담당자만 고정을 해제할 수 있습니다.",
        );
        const owner = section(operation.id);
        if (operation.type === "unlock-section")
          check(owner.locked || hasLockedSlides(body, owner.id), "VALIDATION", "고정된 슬라이드가 없습니다.");
        const next = operation.type === "unlock-section" ? "writing" : operation.state;
        for (const item of body.slides.filter(s => s.sectionId === owner.id)) {
          if (item.state !== next) { item.state = next; item.revision++; }
        }
        Object.assign(owner, { state: next, locked: next === "done" });
        break;
      }
      case "add-check": {
        action("outline");
        const id = newId();
        body.checklist.push({
          id,
          title: operation.title,
          source: operation.source,
          assigneeIds: [],
          done: false,
          checkedBy: null,
          checkedAt: null,
        });
        createdIds.push(id);
        break;
      }
      case "edit-check":
      case "assign-check":
      case "check":
      case "remove-check": {
        writing();
        const item = body.checklist.find((c) => c.id === operation.id);
        check(!!item, "NOT_FOUND", "체크 항목이 없습니다.");
        if (operation.type === "check") {
          check(
            canManageProject(context) || item.assigneeIds.includes(actorId),
            "FORBIDDEN",
            "확인 담당자가 아닙니다.",
          );
          Object.assign(item, {
            done: operation.done,
            checkedBy: operation.done ? actorId : null,
            checkedAt: operation.done ? context.now : null,
          });
        } else if (operation.type === "assign-check") {
          action("assign");
          members(operation.assigneeIds);
          item.assigneeIds = operation.assigneeIds;
        } else {
          action("outline");
          undoPermission = "outline";
          if (operation.type === "edit-check")
            Object.assign(item, {
              title: operation.title,
              source: operation.source,
            });
          else body.checklist = body.checklist.filter((c) => c.id !== item.id);
        }
        break;
      }
      case "add-slide": {
        contentSlidesChanged([], [operation.sectionId]);
        check(
          operation.afterId === null ||
            slide(operation.afterId).sectionId === operation.sectionId,
          "VALIDATION",
          "추가 위치가 다릅니다.",
        );
        const id = newId();
        body.slides = putRelative(
          body.slides,
          {
            id,
            sectionId: operation.sectionId,
            state: "writing",
            revision: 1,
            content: { title: "새 슬라이드", lead: "", blocks: [] },
            template: operation.template,
            usedSettings: currentSlideSettings(state, operation.sectionId),
            sources: [],
          },
          operation.afterId,
          true,
        );
        createdIds.push(id);
        break;
      }
      case "edit-slide":
      case "save-slide": {
        const item = slide(operation.id);
        contentSlidesChanged([item.id]);
        item.content = operation.content;
        if (operation.type === "save-slide") item.template = operation.template;
        if (item.template)
          item.template.bindings = item.template.bindings.filter(
            (b) =>
              b.key === "title" ||
              b.key === "lead" ||
              item.content.blocks.some((v) => v.id === b.key),
          );
        item.revision++;
        break;
      }
      case "bind-slide": {
        const item = slide(operation.id);
        contentSlidesChanged([item.id]);
        item.template = operation.template;
        item.revision++;
        break;
      }
      case "duplicate-slide": {
        const item = structuredClone(slide(operation.id));
        contentSlidesChanged([], [operation.targetSectionId]);
        check(
          operation.afterId === null ||
            slide(operation.afterId).sectionId === operation.targetSectionId,
          "VALIDATION",
          "복제 위치가 다릅니다.",
        );
        item.id = newId();
        item.sectionId = operation.targetSectionId;
        item.revision = 1;
        item.state = "writing";
        const mapping = new Map<string, string>();
        item.content.blocks.forEach((b) => {
          const old = b.id;
          b.id = newId();
          mapping.set(old, b.id);
        });
        item.template?.bindings.forEach((b) => {
          b.key = mapping.get(b.key) ?? b.key;
        });
        body.slides = putRelative(body.slides, item, operation.afterId, true);
        createdIds.push(item.id);
        break;
      }
      case "move-slide": {
        const item = slide(operation.id),
          oldSection = item.sectionId;
        contentSlidesChanged([item.id], oldSection === operation.sectionId ? [] : [operation.sectionId]);
        check(
          operation.beforeId === null ||
            slide(operation.beforeId).sectionId === operation.sectionId,
          "VALIDATION",
          "이동 위치가 다릅니다.",
        );
        item.sectionId = operation.sectionId;
        item.revision++;
        body.slides = putRelative(body.slides, item, operation.beforeId, false);
        body.threads
          .filter((t) => t.slideId === item.id)
          .forEach((t) => {
            t.sectionId = item.sectionId;
          });
        break;
      }
      case "remove-slide": {
        const item = slide(operation.id);
        contentSlidesChanged([item.id]);
        body.slides = body.slides.filter((s) => s.id !== item.id);
        body.threads = body.threads.filter((t) => t.slideId !== item.id);
        break;
      }
      case "batch-slides": {
        if (operation.operation === "move") {
          check(
            !!operation.sectionId,
            "VALIDATION",
            "대상 소목차가 필요합니다.",
          );
        }
        contentSlidesChanged(operation.slideIds, operation.operation === "move" && operation.sectionId ? [operation.sectionId] : []);
        if (operation.operation === "remove") {
          check(
            operation.sectionId === null && operation.beforeId === null,
            "VALIDATION",
            "삭제 위치는 지정하지 않습니다.",
          );
          body.slides = body.slides.filter(
            (s) => !operation.slideIds.includes(s.id),
          );
          body.threads = body.threads.filter(
            (t) => !operation.slideIds.includes(t.slideId),
          );
        } else {
          body.slides = moveSlideSelection(
            body.slides,
            operation.slideIds,
            operation.sectionId!,
            operation.beforeId,
          );
          body.threads.forEach((t) => {
            if (operation.slideIds.includes(t.slideId))
              t.sectionId = operation.sectionId!;
          });
        }
        break;
      }
      case "set-sources": {
        const item = slide(operation.id);
        contentSlidesChanged([item.id]);
        for (const ref of operation.sources)
          if (ref.kind === "file")
            check(
              files.rounds.some(
                (r) =>
                  r.number === ref.fileRound &&
                  r.entries.some(
                    (e) =>
                      e.assetId === ref.targetId &&
                      e.versionId === ref.versionId,
                  ),
              ),
              "NOT_FOUND",
              "해당 회차의 자료가 아닙니다.",
            );
        item.sources = operation.sources;
        item.revision++;
        break;
      }
      case "set-coverage": {
        const req = body.requirements.find(
          (r) => r.id === operation.requirementId,
        );
        check(
          !!req && req.sectionId !== null,
          "NOT_FOUND",
          "연결된 요구사항이 없습니다.",
        );
        contentChanged([req.sectionId]);
        req.coverage = operation.coverage;
        break;
      }
      case "map-prompt":
        action("setup");
        section(operation.sectionId);
        body.settings.bindings = [
          ...body.settings.bindings.filter(
            (b) => b.sectionId !== operation.sectionId,
          ),
          { sectionId: operation.sectionId, itemId: operation.itemId },
        ];
        changesInput = true;
        break;
      case "override-prompt":
        action("setup");
        body.settings.overrides = [
          ...body.settings.overrides.filter(
            (v) => v.itemId !== operation.itemId,
          ),
          {
            itemId: operation.itemId,
            prompt: operation.prompt,
            sources: operation.sources,
          },
        ];
        changesInput = true;
        break;
      case "pin-assets": {
        action("setup");
        mergePins(operation.pins);
        check(
          operation.slides.length === body.slides.length &&
            operation.slides.every((s) =>
              body.slides.some((v) => v.id === s.id),
            ),
          "VALIDATION",
          "자산 적용으로 슬라이드를 추가/삭제할 수 없습니다.",
        );
        for (const item of operation.slides) {
          const old = slide(item.id);
          check(item.state === old.state, "FORBIDDEN", "자산 적용으로 완료 상태를 변경할 수 없습니다.");
          check(
            item.sectionId === old.sectionId &&
              JSON.stringify(item.content) === JSON.stringify(old.content) &&
              JSON.stringify(item.sources) === JSON.stringify(old.sources),
            "VALIDATION",
            "자산 적용으로 본문이나 소속을 변경할 수 없습니다.",
          );
          if (JSON.stringify(item) !== JSON.stringify(old)) editSlide(old.id);
        }
        body.settings = operation.settings;
        body.slides = operation.slides;
        changesInput = true;
        break;
      }
      case "apply-proposal": {
        if (operation.chapters !== null || operation.sections !== null) {
          const changedChapters = new Set(
            body.chapters
              .filter(
                (c) =>
                  operation.chapters !== null &&
                  JSON.stringify(c) !==
                    JSON.stringify(
                      operation.chapters.find((v) => v.id === c.id),
                    ),
              )
              .map((c) => c.id),
          );
          const oldOrder = body.chapters
              .filter((c) => operation.chapters?.some((v) => v.id === c.id))
              .map((c) => c.id),
            newOrder =
              operation.chapters
                ?.filter((c) => body.chapters.some((v) => v.id === c.id))
                .map((c) => c.id) ?? oldOrder;
          oldOrder.forEach((id, index) => {
            if (newOrder[index] !== id) changedChapters.add(id);
          });
          const affected = body.sections
            .filter(
              (s) =>
                changedChapters.has(s.chapterId) ||
                (operation.sections !== null &&
                  (JSON.stringify(s) !==
                    JSON.stringify(
                      operation.sections.find((v) => v.id === s.id),
                    ) ||
                    body.sections.indexOf(s) !==
                      operation.sections.findIndex((v) => v.id === s.id))),
            )
            .map((s) => s.id);
          structure(affected);
          if (operation.sections)
            for (const s of operation.sections) {
              members(s.assigneeIds);
              members(s.reviewerIds);
              const old = body.sections.find((v) => v.id === s.id);
              check(
                !old ||
                  JSON.stringify([
                    old.assigneeIds,
                    old.reviewerIds,
                    old.state,
                    old.locked,
                  ]) ===
                    JSON.stringify([
                      s.assigneeIds,
                      s.reviewerIds,
                      s.state,
                      s.locked,
                    ]),
                "FORBIDDEN",
                "제안으로 담당자나 고정 상태를 변경할 수 없습니다.",
              );
              check(
                !!old ||
                  (s.assigneeIds.length === 1 &&
                    s.assigneeIds[0] === context.project.pmId &&
                    s.reviewerIds.length === 0 &&
                    s.state === "writing" &&
                    !s.locked),
                "FORBIDDEN",
                "새 섹션은 PM 담당의 작성 중 상태로 시작합니다.",
              );
            }
        }
        if (operation.slides !== null) {
          validateSlideReplacement(operation.slides, operation.sections ?? body.sections);
        }
        if (operation.requirements !== null || operation.checklist !== null) {
          action("outline");
          changesInput = true;
          undoPermission = "outline";
        }
        if (operation.requirements)
          for (const item of operation.requirements) {
            const old = body.requirements.find((r) => r.id === item.id);
            check(
              !old || old.coverage === item.coverage,
              "FORBIDDEN",
              "제안으로 기존 반영 상태를 바꿀 수 없습니다.",
            );
            check(
              !!old ||
                (item.coverage === "none" &&
                  item.provenance === "mock" &&
                  item.page === null &&
                  item.excerpt === null),
              "VALIDATION",
              "모의 요구사항에 실제 분석 근거를 지정할 수 없습니다.",
            );
          }
        if (operation.checklist)
          for (const item of operation.checklist) {
            const old = body.checklist.find((c) => c.id === item.id);
            check(
              old
                ? JSON.stringify([
                    old.assigneeIds,
                    old.done,
                    old.checkedBy,
                    old.checkedAt,
                  ]) ===
                    JSON.stringify([
                      item.assigneeIds,
                      item.done,
                      item.checkedBy,
                      item.checkedAt,
                    ])
                : !item.done &&
                    !item.assigneeIds.length &&
                    !item.checkedBy &&
                    !item.checkedAt,
              "FORBIDDEN",
              "제안으로 확인 상태나 담당자를 바꿀 수 없습니다.",
            );
          }
        for (const [next, old] of [
          [operation.chapters, body.chapters],
          [operation.sections, body.sections],
          [operation.slides, body.slides],
          [operation.checklist, body.checklist],
        ] as const)
          if (next)
            createdIds.push(
              ...next
                .filter((n) => !old.some((o) => o.id === n.id))
                .map((n) => n.id),
            );
        if (operation.chapters) body.chapters = operation.chapters;
        if (operation.sections) body.sections = operation.sections;
        if (operation.slides) body.slides = operation.slides;
        if (operation.requirements) body.requirements = operation.requirements;
        if (operation.checklist) body.checklist = operation.checklist;
        body.threads = body.threads.filter((t) =>
          body.slides.some((s) => s.id === t.slideId),
        );
        body.settings.bindings = body.settings.bindings.filter((b) =>
          body.sections.some((s) => s.id === b.sectionId),
        );
        body.requirements.forEach((r) => {
          if (r.sectionId && !body.sections.some((s) => s.id === r.sectionId))
            r.sectionId = null;
        });
        break;
      }
      case "replace-content": {
        const changed = [
          ...new Set(
            [...body.slides, ...operation.slides]
              .filter(
                (s) =>
                  JSON.stringify(body.slides.find((v) => v.id === s.id)) !==
                  JSON.stringify(operation.slides.find((v) => v.id === s.id)),
              )
              .map((s) => s.sectionId),
          ),
        ];
        check(
          changed.length === operation.sectionIds.length &&
            changed.every((id) => operation.sectionIds.includes(id)),
          "VALIDATION",
          "실제 변경 범위와 요청 범위가 다릅니다.",
        );
        const oldOrder = body.slides
            .filter((s) => operation.slides.some((v) => v.id === s.id))
            .map((s) => s.id),
          newOrder = operation.slides
            .filter((s) => body.slides.some((v) => v.id === s.id))
            .map((s) => s.id);
        check(
          JSON.stringify(oldOrder) === JSON.stringify(newOrder),
          "VALIDATION",
          "내용 적용으로 기존 슬라이드 순서를 바꿀 수 없습니다.",
        );
        validateSlideReplacement(operation.slides);
        mergePins(operation.pins);
        createdIds.push(
          ...operation.slides
            .filter((s) => !body.slides.some((o) => o.id === s.id))
            .map((s) => s.id),
        );
        body.slides = operation.slides;
        body.threads = body.threads.filter((t) =>
          body.slides.some((s) => s.id === t.slideId),
        );
        break;
      }
      case "register-ppt": {
        const v = operation.version;
        check(
          !state.pptVersions.some(
            (p) => p.id === v.id || p.index === v.index,
          ) && v.index === state.pptVersions.length + 1,
          "CONFLICT",
          "PPT 버전이 변경되었습니다.",
        );
        const target =
          v.snapshotId === null
            ? state
            : state.snapshots.find((s) => s.id === v.snapshotId);
        check(
          !!target &&
            ("currentRound" in target ? target.currentRound : target.round) ===
              v.round &&
            target.inputRevision === v.inputRevision,
          "CONFLICT",
          "출력 기준이 변경되었습니다.",
        );
        check(v.createdBy === actorId, "FORBIDDEN", "버전 작성자가 다릅니다.");
        state.pptVersions.push(v);
        createdIds.push(v.id);
        break;
      }
      case "protect-ppt": {
        writing();
        check(
          (body.slides.some(s => canEditSlide(context, state, s.id)) ||
            body.sections.some(s => !body.slides.some(slide => slide.sectionId === s.id) && canInsertSlide(context, state, s.id))),
          "FORBIDDEN",
          "수정본을 연결할 수 있는 담당 섹션이 없습니다.",
        );
        const version = state.pptVersions.find(
          (v) => v.id === operation.versionId && v.kind === "uploaded",
        );
        check(!!version, "NOT_FOUND", "등록된 수정본이 없습니다.");
        check(
          operation.pinIds.every((id) => state.pins.some((p) => p.id === id)),
          "ASSET_UNAVAILABLE",
          "연결 자산 사본이 없습니다.",
        );
        version.pinIds = [...new Set([...version.pinIds, ...operation.pinIds])];
        break;
      }
      case "complete-manufacturing-demo": {
        check(state.projectId === MFG_DEMO_PROJECT_ID, "VALIDATION", "제조업 예시의 완성 요청이 아닙니다.");
        action("complete");
        check(operation.acknowledged, "VALIDATION", "완성 내용을 확인해 주세요.");
        check(operation.expectedFileRevision === files.revision, "CONFLICT", "자료가 변경되었습니다.");
        const version = structuredClone(operation.version);
        check(version.round === state.currentRound && version.inputRevision === state.inputRevision &&
          version.index === Math.max(0, ...state.pptVersions.map(v => v.index)) + 1, "CONFLICT", "출력 기준 또는 PPT 버전이 변경되었습니다.");
        check(version.kind === "generated" && version.snapshotId === null && version.manifest === null &&
          version.baseVersionId === null && version.pinIds.length === 0 && version.filename === `제조업_PoC_${state.currentRound}차_완성본.pptx`, "VALIDATION", "완성본 PPT 정보를 확인해 주세요.");
        check(version.createdBy === actorId, "FORBIDDEN", "버전 작성자가 다릅니다.");
        check(version.id !== version.blobId && !used.has(version.id) && !used.has(version.blobId), "CONFLICT", "완성본 식별자가 중복되었습니다.");
        used.add(version.id); used.add(version.blobId);
        state.pptVersions.push(version);
        snapshot("complete");
        const saved = state.snapshots.at(-1)!;
        version.snapshotId = saved.id;
        createdIds.push(version.id, saved.id);
        state.phase = "completed";
        break;
      }
      case "complete":
        action("complete");
        check(
          operation.acknowledged,
          "VALIDATION",
          "완성 내용을 확인해 주세요.",
        );
        check(
          operation.expectedFileRevision === files.revision,
          "CONFLICT",
          "자료가 변경되었습니다.",
        );
        snapshot("complete");
        state.phase = "completed";
        break;
      case "start-round": {
        action("rework");
        check(
          operation.acknowledged,
          "VALIDATION",
          "새 회차 내용을 확인해 주세요.",
        );
        check(
          operation.expectedFileRevision === files.revision,
          "CONFLICT",
          "자료가 변경되었습니다.",
        );
        if (state.phase === "writing") snapshot("unfinished");
        const open = [
          ...body.threads,
          ...state.reviews.filter((t) => t.round === state.currentRound),
        ].filter((t) => t.status === "open");
        body.canvasComments=carryCanvasComments(body.canvasComments,state.currentRound,newId);
        files = advanceFileRound(files, context);
        state.currentRound = files.currentRound;
        state.phase = "writing";
        state.nextCommentNumber = open.length + 1;
        body.threads = open.map((old, index) => {
          const t = structuredClone(old);
          t.carriedFromId = t.id;
          t.id = newId();
          t.round = state.currentRound;
          t.number = index + 1;
          t.revision = 1;
          t.messages = t.messages.map((m) => ({
            ...m,
            id: newId(),
            threadId: t.id,
            revision: 1,
          }));
          return t;
        });
        break;
      }
      case "undo": {
        writing();
        const undo = state.undo;
        check(
          !!undo &&
            undo.id === operation.id &&
            Date.parse(undo.expiresAt) > Date.parse(context.now),
          "UNDO_EXPIRED",
          "되돌리기 시간이 지났습니다.",
        );
        check(
          undo.actorId === actorId,
          "FORBIDDEN",
          "본인 작업만 되돌릴 수 있습니다.",
        );
        check(
          undo.afterRevision === state.revision &&
            undo.round === state.currentRound,
          "CONFLICT",
          "다른 작업 이후에는 되돌릴 수 없습니다.",
        );
        if (undo.permission === "content") {
          validateSlideReplacement(undo.previousBody.slides, undo.previousBody.sections);
          // 요구사항 반영도 등 슬라이드 외 소목차 변경은 기존 전체 권한을 확인한다.
          if (JSON.stringify(body.requirements) !== JSON.stringify(undo.previousBody.requirements))
            for (const id of undo.sectionIds) edit(id);
          undoPermission = null;
        } else {
          action(undo.permission);
          for (const id of undo.sectionIds)
            if (body.sections.some((s) => s.id === id)) unlocked(id);
        }
        state.body = structuredClone(undo.previousBody);
        changesInput = true;
        break;
      }
    }
  state.revision++;
  if (changesInput) state.inputRevision++;
  state.undo = undoPermission
    ? {
        id: newId(),
        actorId,
        expiresAt: new Date(
          Date.parse(context.now) + WORKSPACE_LIMITS.undoMs,
        ).toISOString(),
        afterRevision: state.revision,
        round: state.currentRound,
        label: "변경 되돌리기",
        previousBody: structuredClone(source.body),
        sectionIds: undoSections,
        permission: undoPermission,
      }
    : null;
  const result = WorkspaceStateSchema.safeParse(normalizeWorkspaceCompletion(state));
  if (!result.success)
    throw new WorkspaceError(
      result.error.issues.some((i) => i.code === "too_big")
        ? "LIMIT"
        : "VALIDATION",
      result.error.issues[0]?.message ?? "변경 결과를 확인해 주세요.",
    );
  return {
    receipt: { state: result.data, createdIds, undoId: state.undo?.id ?? null },
    files,
  };
}
