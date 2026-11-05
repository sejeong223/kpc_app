import type { Chapter, ProjectView, ProposalSlide, Section } from "@/types/workspace-production";
import type { FileResourceView, FileWorkspaceView } from "@/types/workspace-files";
import { outlineNumbers } from "./selectors";

export interface ProductionSlideRow {
  slide: ProposalSlide; section: Section; chapter: Chapter;
  number: number; sectionNumber: string; mine: boolean; editable: boolean;
}
export interface ProductionSourceCard {
  id: string; group: "rfp" | "reference"; title: string;
  page: number | null; quote: string | null; provenance: "mock" | "manual";
  resource: FileResourceView | null; round: number | null; missingReason: string | null;
}
export function selectProductionSlides(view: ProjectView): ProductionSlideRow[] {
  const { body } = view.state, numbers = outlineNumbers(view.state);
  return body.chapters.flatMap(chapter => body.sections.filter(s => s.chapterId === chapter.id).flatMap(section =>
    body.slides.filter(s => s.sectionId === section.id).map(slide => ({
      slide, section, chapter, sectionNumber: numbers[section.id],
      mine: section.assigneeIds.includes(view.actor.id), editable: view.capabilities.editableSectionIds.includes(section.id),
    })),
  )).map((row, index) => ({ ...row, number: index + 1 }));
}
export function selectProductionSources(view: ProjectView, slide: ProposalSlide | null, files: FileWorkspaceView | null): ProductionSourceCard[] {
  if (!slide) return [];
  const refs = slide.sources.filter(s => s.kind === "requirement");
  const ids = [...new Set([...view.state.body.requirements.filter(r => r.sectionId === slide.sectionId).map(r => r.id), ...refs.map(r => r.targetId)])];
  const cards: ProductionSourceCard[] = ids.map(id => {
    const requirement = view.state.body.requirements.find(r => r.id === id), ref = refs.find(r => r.targetId === id);
    return { id: `rfp:${id}`, group: "rfp", title: requirement?.title ?? "요구사항 확인 필요",
      page: ref?.page ?? requirement?.page ?? null, quote: ref?.quote ?? requirement?.excerpt ?? null,
      provenance: ref?.provenance ?? requirement?.provenance ?? "manual", resource: null, round: null,
      missingReason: "원문 파일 연결 정보 없음" };
  });
  return cards.concat(slide.sources.filter(s => s.kind === "file").map(ref => {
    const resource = files?.project.id === view.project.id ? files.rounds.find(r => r.number === ref.fileRound)?.resources.find(r => r.asset.id === ref.targetId && r.version.assetId === ref.targetId && r.version.id === ref.versionId) ?? null : null;
    return { id: `file:${ref.id}`, group: "reference", title: resource?.version.label ?? "원본 확인 필요", page: ref.page, quote: ref.quote,
      provenance: ref.provenance, resource, round: resource ? ref.fileRound : null,
      missingReason: resource || files === null ? null : "연결된 회차·자료 버전을 찾을 수 없습니다." };
  }));
}
export function productionPreviewFingerprint(view: ProjectView, slide: ProposalSlide): string {
  const ids = [...new Set([slide.template?.pinId, slide.usedSettings.skillPinId, slide.usedSettings.promptPinId].filter((id): id is string => !!id))].sort();
  return JSON.stringify([slide.content, slide.template, slide.usedSettings, ids.map(id => {
    const pin = view.state.pins.find(p => p.id === id);
    return [id, pin?.revisionId ?? null, pin?.revision ?? null, view.assetAccess.find(a => a.pinId === id)?.access ?? null];
  })]);
}
