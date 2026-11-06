import { MFG_DEMO_PROJECT_ID, MFG_DEMO_CHAPTERS, MFG_DEMO_SECTIONS, MFG_DEMO_SLIDES, MFG_DEMO_REQUIREMENTS, manufacturingSectionPrompt } from "@/config/production-mfg-demo";
import { advanceFileRound, createEmptyFileProject } from "@/lib/workspace/files/domain";
import { FileProjectStateSchema } from "@/lib/workspace/files/schemas";
import { createWorkspaceState } from "@/lib/workspace/production/domain";
import { WorkspaceStateSchema } from "@/lib/workspace/production/schemas";
import { carryCanvasComments } from "@/lib/workspace/production/canvas-comments";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import { manufacturingPptFilename } from "./manufacturing-demo-ppt";
import type { RoundBody, StoredWorkspaceBlob, WorkspaceBundle, WorkspaceContext } from "@/types/workspace-production";

/** 두 레코드가 없는 최초 접근에서만 호출한다. 실제 원본 파일을 가장하지 않는다. */
export function createManufacturingDemoBundle(context: WorkspaceContext): WorkspaceBundle | null {
  if (context.project.id !== MFG_DEMO_PROJECT_ID) return null;
  const files = createEmptyFileProject(context), state = createWorkspaceState(context, files);
  const authors: Record<string, string> = { "이서연": "demo:mfg:lee", "정소담": context.identity.actor.id, "김민수": "demo:mfg:kim" };
  state.grants = [{ userId: context.identity.actor.id, permissions: ["complete", "rework", "setup", "assign"] }];
  state.body.chapters = MFG_DEMO_CHAPTERS.map(chapter => ({ ...chapter }));
  state.body.sections = MFG_DEMO_SECTIONS.map(section => ({
    id: section.id, chapterId: section.chapterId, title: section.title, state: section.state,
    assigneeIds: [authors[section.assignee]], reviewerIds: [], locked: false,
    demoPrompt: manufacturingSectionPrompt(section.id),
  }));
  state.body.requirements = MFG_DEMO_REQUIREMENTS.map(requirement => ({ ...requirement, provenance: "mock",
    excerpt: `${requirement.title}을(를) 위한 구체적인 구현 방안과 검증 방법을 제안서에 제시하여야 한다. 제안사는 관련 근거와 수행 일정을 함께 기술한다.`,
  }));
  state.body.slides = MFG_DEMO_SLIDES.map(slide => ({
    id: slide.id, sectionId: slide.sectionId, demoSourceKey: slide.id, revision: 1, template: null,
    content: { title: slide.title, lead: slide.lead, blocks: slide.layout === "table"
      ? [{ id: `${slide.id}-table`, kind: "table", columns: ["구분", "내용"], rows: slide.items.map(item => [...item]) }]
      : slide.items.map((item, i) => ({ id: `${slide.id}-text-${i + 1}`, kind: "text", text: item.join("\n") })),
    },
    usedSettings: { skillPinId: null, promptPinId: null, promptItemId: null, prompt: "", sources: [] },
    sources: state.body.requirements.filter(requirement => requirement.sectionId === slide.sectionId).map(requirement => ({
      id: `${slide.id}-${requirement.id}`, kind: "requirement", targetId: requirement.id, fileRound: null, versionId: null,
      page: requirement.page, quote: requirement.excerpt, provenance: "mock",
    })),
  }));
  const at = "2026-10-20T09:00:00.000Z";
  state.body.threads = [
    { id: "m1", sectionId: "s31", author: "이서연", text: "PoC 범위(공정 2개)를 표로 정리해주세요" },
    { id: "m2", sectionId: "s41", author: "김민수", text: "데이터 연계 일정이 고객사 휴무 기간과 겹칩니다" },
  ].map((comment, index) => ({
    id: comment.id, sectionId: comment.sectionId, slideId: `mfg-${comment.sectionId}-1`, round: 1, number: index + 1,
    authorId: authors[comment.author], status: "open", point: null, createdAt: at, updatedAt: at,
    resolvedBy: null, resolvedAt: null, revision: 1, carriedFromId: null,
    messages: [{ id: `${comment.id}-message`, threadId: comment.id, authorId: authors[comment.author], authorName: comment.author,
      text: comment.text, mentions: [], createdAt: at, updatedAt: null, deletedAt: null, revision: 1 }],
  }));
  state.nextCommentNumber = 3;
  return { state: WorkspaceStateSchema.parse(state), files: FileProjectStateSchema.parse(files) };
}

export function needsManufacturingDemoCompletion(bundle: WorkspaceBundle): boolean {
  return bundle.state.projectId === MFG_DEMO_PROJECT_ID && bundle.state.currentRound === 1 &&
    bundle.state.phase === "writing" && bundle.state.snapshots.length === 0;
}

/** 원본 예시 보관본을 추가하되 사용자의 현재 수정 내용은 다음 회차에 유지한다. */
export function addManufacturingDemoCompletion(source: WorkspaceBundle, context: WorkspaceContext, ppt: { blob: Blob; sha256: string }): { bundle: WorkspaceBundle; original: StoredWorkspaceBlob } {
  check(needsManufacturingDemoCompletion(source) && context.project.id === MFG_DEMO_PROJECT_ID, "VALIDATION", "제조업 완성본 예시를 추가할 수 없습니다.");
  const state = structuredClone(source.state), files = advanceFileRound(source.files, context);
  const body = createManufacturingDemoBundle(context)!.state.body;
  const snapshotId = context.newId(), versionId = context.newId(), blobId = context.newId();
  const filename = manufacturingPptFilename(1), createdBy = context.project.pmId;
  state.snapshots.push({ id: snapshotId, round: 1, kind: "complete", createdAt: context.now, createdBy,
    inputRevision: 1, body, fileEntries: [], fileRevision: source.files.revision, pptVersionId: versionId });
  state.pptVersions.push({ id: versionId, index: Math.max(0, ...state.pptVersions.map(v => v.index)) + 1,
    round: 1, snapshotId, kind: "generated", pinIds: [], blobId, filename,
    byteLength: ppt.blob.size, sha256: ppt.sha256, createdAt: context.now, createdBy,
    inputRevision: 1, baseVersionId: null, manifest: null });
  state.currentRound = files.currentRound;
  state.revision++; state.inputRevision++;
  const carry = (current: RoundBody) => {
    current.sections.forEach(section => { section.locked = section.state === "done"; });
    current.threads.forEach(thread => { thread.round = state.currentRound; });
    current.canvasComments = carryCanvasComments(current.canvasComments, source.state.currentRound, context.newId);
  };
  carry(state.body);
  if (state.undo) {
    carry(state.undo.previousBody);
    if (state.undo.round === source.state.currentRound && state.undo.afterRevision === source.state.revision) {
      state.undo.round = state.currentRound; state.undo.afterRevision = state.revision;
    }
  }
  files.removals = source.files.removals.map(removal => ({ ...structuredClone(removal), round: files.currentRound }));
  return {
    bundle: { state: WorkspaceStateSchema.parse(state), files: FileProjectStateSchema.parse(files) },
    original: { namespace: context.identity.namespace, projectId: context.project.id, id: blobId, kind: "ppt", ...ppt,
      filename, byteLength: ppt.blob.size, createdAt: context.now },
  };
}
