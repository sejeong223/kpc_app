import { HTML_DEMO_PROJECT_ID, HTML_DEMO_SECTION_ID, HTML_DEMO_SLIDES, htmlDemoSlideId } from "@/config/production-html-demo";
import { advanceFileRound, createEmptyFileProject } from "@/lib/workspace/files/domain";
import { FileProjectStateSchema } from "@/lib/workspace/files/schemas";
import { createWorkspaceState } from "@/lib/workspace/production/domain";
import { WorkspaceStateSchema } from "@/lib/workspace/production/schemas";
import type { StoredFileBlob } from "@/types/workspace-files";
import type { StoredWorkspaceBlob, WorkspaceBundle, WorkspaceContext } from "@/types/workspace-production";
import { HTML_DEMO_PPT_FILENAME } from "./html-demo-ppt";

/** 첫 접근 전용. 호출자는 files/workspaces 레코드가 모두 없는지 확인해야 한다. */
export function createHtmlDemoBundle(context: WorkspaceContext): (WorkspaceBundle & { original: StoredFileBlob }) | null {
  if (context.project.id !== HTML_DEMO_PROJECT_ID) return null;
  const files = createEmptyFileProject(context), state = createWorkspaceState(context, files);
  const actor = context.identity.actor, assetId = "html-demo-source", versionId = "html-demo-source-v1";
  const filename = "HTML 제작 예시 발췌 (시연 자료).txt";
  const text = [
    "KPC_제안서_UI_v12 8.html · DECK.mois.s11 발췌",
    "제작 화면 수동 테스트용 시연 자료입니다. 실제 RFP 또는 검증된 사업 근거가 아닙니다.",
    ...HTML_DEMO_SLIDES.map((slide, index) => `\n${index + 1}. ${slide.title}\n${slide.lead}\n${slide.items.map(item => item.join(": ")).join("\n")}`),
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const original: StoredFileBlob = {
    namespace: context.identity.namespace, projectId: context.project.id, id: "html-demo-source-blob",
    blob, filename, mediaType: "text/plain", byteLength: blob.size, createdAt: context.now,
  };
  files.assets.push({ id: assetId, ownerId: actor.id, ownerName: actor.name, createdAt: context.now, sourceKind: "file" });
  files.versions.push({
    id: versionId, assetId, category: "related", createdInRound: 1, createdAt: context.now, createdBy: actor.id,
    label: filename, kind: "other", priority: "normal",
    instruction: "첨부 HTML의 슬라이드 예시를 발췌한 수동 테스트용 자료입니다.",
    source: { type: "file", blobId: original.id, filename, extension: ".txt", mediaType: original.mediaType, byteLength: blob.size, lastModified: Date.parse(context.now) },
  });
  files.rounds[0].entries.push({ assetId, versionId });
  state.body.chapters = [{ id: "html-demo-ch1", title: "사업 이해" }];
  state.body.sections = [{
    id: HTML_DEMO_SECTION_ID, chapterId: "html-demo-ch1", title: "사업 배경 및 목적",
    assigneeIds: [actor.id], reviewerIds: [], state: "writing", locked: false,
  }];
  state.body.requirements = HTML_DEMO_SLIDES.map((slide, index) => ({
    id: `html-demo-requirement-${index + 1}`, sectionId: null, title: `시연 근거 · ${slide.title}`,
    coverage: "full", page: null, excerpt: slide.lead, provenance: "mock",
  }));
  state.body.slides = HTML_DEMO_SLIDES.map((slide, index) => {
    const id = htmlDemoSlideId(index);
    return {
      id, sectionId: HTML_DEMO_SECTION_ID, revision: 1,
      content: {
        title: slide.title, lead: slide.lead,
        blocks: slide.layout === "table"
          ? [{ id: `${id}-table`, kind: "table", columns: ["구분", "내용"], rows: slide.items.map(item => [...item]) }]
          : slide.items.map((item, i) => ({ id: `${id}-text-${i + 1}`, kind: "text", text: item.join("\n") })),
      },
      template: null,
      usedSettings: { skillPinId: null, promptPinId: null, promptItemId: null, prompt: "", sources: [] },
      sources: [
        { id: `${id}-rfp`, kind: "requirement", targetId: state.body.requirements[index].id, fileRound: null, versionId: null, page: null, quote: slide.lead, provenance: "mock" },
        { id: `${id}-source`, kind: "file", targetId: assetId, fileRound: 1, versionId, page: null, quote: slide.items.map(item => item.join(": ")).join("\n"), provenance: "mock" },
      ],
    };
  });
  return { state: WorkspaceStateSchema.parse(state), files: FileProjectStateSchema.parse(files), original };
}

export function needsHtmlDemoCompletion(bundle: WorkspaceBundle): boolean {
  return bundle.state.projectId === HTML_DEMO_PROJECT_ID && bundle.state.currentRound === 1 &&
    bundle.state.phase === "writing" && bundle.state.snapshots.length === 0;
}

/** 사용자 편집본과 별개인 예시 완성본을 추가한다. 호출자는 최신 레코드에서 조건을 재확인한다. */
export function addHtmlDemoCompletion(source: WorkspaceBundle, context: WorkspaceContext, ppt: { blob: Blob; sha256: string }): { bundle: WorkspaceBundle; original: StoredWorkspaceBlob } {
  if (!needsHtmlDemoCompletion(source) || context.project.id !== HTML_DEMO_PROJECT_ID) throw new Error("완성본 예시를 추가할 수 없는 프로젝트입니다.");
  const state = structuredClone(source.state), files = advanceFileRound(source.files, context);
  const body = createHtmlDemoBundle(context)!.state.body;
  body.sections.forEach(section => { section.state = "done"; section.locked = true; });
  // 보관본은 독립된 시연 자료다. 사용자가 삭제/변경했을 수 있는 현재 파일 버전을 가리키지 않는다.
  body.slides.forEach(slide => { slide.sources = slide.sources.filter(source => source.kind === "requirement"); });
  const snapshotId = context.newId(), versionId = context.newId(), blobId = context.newId();
  state.snapshots.push({ id: snapshotId, round: 1, kind: "complete", createdAt: context.now, createdBy: context.identity.actor.id,
    inputRevision: 1, body, fileEntries: [], fileRevision: source.files.revision, pptVersionId: versionId });
  state.pptVersions.push({ id: versionId, index: state.pptVersions.length + 1, round: 1, snapshotId, kind: "generated", pinIds: [], blobId,
    filename: HTML_DEMO_PPT_FILENAME, byteLength: ppt.blob.size, sha256: ppt.sha256, createdAt: context.now, createdBy: context.identity.actor.id,
    inputRevision: 1, baseVersionId: null, manifest: null });
  state.currentRound = files.currentRound;
  state.revision++; state.inputRevision++;
  // 기존 텍스트·핀·메시지 ID와 편집 상태는 그대로 두고 현재 회차 표시만 옮긴다.
  state.body.threads.forEach(thread => { thread.round = state.currentRound; });
  if (state.undo) {
    state.undo.previousBody.threads.forEach(thread => { thread.round = state.currentRound; });
    if (state.undo.round === source.state.currentRound && state.undo.afterRevision === source.state.revision) {
      state.undo.round = state.currentRound; state.undo.afterRevision = state.revision;
    }
  }
  files.removals = source.files.removals.map(removal => ({ ...structuredClone(removal), round: files.currentRound }));
  return {
    bundle: { state: WorkspaceStateSchema.parse(state), files: FileProjectStateSchema.parse(files) },
    original: { namespace: context.identity.namespace, projectId: context.project.id, id: blobId, kind: "ppt", ...ppt,
      filename: HTML_DEMO_PPT_FILENAME, byteLength: ppt.blob.size, createdAt: context.now },
  };
}
