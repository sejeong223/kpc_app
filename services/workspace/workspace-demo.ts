import { HTML_DEMO_PROJECT_ID, HTML_DEMO_SECTION_ID, HTML_DEMO_SLIDES, htmlDemoSlideId } from "@/config/production-html-demo";
import { createEmptyFileProject } from "@/lib/workspace/files/domain";
import { FileProjectStateSchema } from "@/lib/workspace/files/schemas";
import { createWorkspaceState } from "@/lib/workspace/production/domain";
import { WorkspaceStateSchema } from "@/lib/workspace/production/schemas";
import type { StoredFileBlob } from "@/types/workspace-files";
import type { WorkspaceBundle, WorkspaceContext } from "@/types/workspace-production";

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
