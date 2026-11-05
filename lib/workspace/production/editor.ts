import type {
  ProjectView,
  ProposalSlide,
  SlideContent,
  SlideTemplateRef,
} from "@/types/workspace-production";
import { workspaceAssert as check } from "./errors";
import { SlideContentSchema } from "./schemas";
export interface SlideDraft {
  projectId: string;
  round: number;
  slideId: string;
  baseRevision: number;
  content: SlideContent;
  template: SlideTemplateRef | null;
  dirty: boolean;
}
export function createSlideDraft(
  view: ProjectView,
  slide: ProposalSlide,
): SlideDraft {
  return {
    projectId: view.project.id,
    round: view.state.currentRound,
    slideId: slide.id,
    baseRevision: view.state.revision,
    content: structuredClone(slide.content),
    template: structuredClone(slide.template),
    dirty: false,
  };
}
export function refreshSlideDraft(
  draft: SlideDraft,
  view: ProjectView,
  slide: ProposalSlide,
): { draft: SlideDraft; conflict: boolean } {
  if (draft.dirty)
    return { draft, conflict: draft.projectId !== view.project.id || draft.round !== view.state.currentRound || draft.slideId !== slide.id || draft.baseRevision !== view.state.revision };
  if (
    draft.projectId !== view.project.id ||
    draft.round !== view.state.currentRound ||
    draft.slideId !== slide.id
  )
    return { draft: createSlideDraft(view, slide), conflict: false };
  return { draft: createSlideDraft(view, slide), conflict: false };
}
export function validateSlideDraft(draft: SlideDraft): string | null {
  const result = SlideContentSchema.safeParse(draft.content);
  return result.success
    ? null
    : (result.error.issues[0]?.message ?? "입력 범위를 확인해 주세요.");
}
export function normalizeSelectedSlides(
  slides: readonly ProposalSlide[],
  selectedIds: readonly string[],
): string[] {
  const ids = new Set(selectedIds);
  return slides.filter((s) => ids.has(s.id)).map((s) => s.id);
}
export function moveSlideSelection(
  slides: readonly ProposalSlide[],
  ids: readonly string[],
  targetSectionId: string,
  beforeId: string | null,
): ProposalSlide[] {
  check(
    ids.length > 0 &&
      new Set(ids).size === ids.length &&
      ids.every((id) => slides.some((s) => s.id === id)),
    "NOT_FOUND",
    "선택한 슬라이드를 확인해 주세요.",
  );
  check(
    beforeId === null ||
      (!ids.includes(beforeId) &&
        slides.some(
          (s) => s.id === beforeId && s.sectionId === targetSectionId,
        )),
    "VALIDATION",
    "선택하지 않은 대상 소목차의 슬라이드 앞을 지정해 주세요.",
  );
  const selected = slides
      .filter((s) => ids.includes(s.id))
      .map((s) => ({
        ...structuredClone(s),
        sectionId: targetSectionId,
        revision: s.revision + 1,
      })),
    rest = structuredClone(slides.filter((s) => !ids.includes(s.id)));
  const index =
    beforeId === null ? rest.length : rest.findIndex((s) => s.id === beforeId);
  rest.splice(index, 0, ...selected);
  return rest;
}
export function plainTextBlock(text: string, newId: () => string) {
  check(
    text.trim().length > 0 && text.length <= 10000,
    "LIMIT",
    "붙여넣기는 1~10,000자의 일반 텍스트만 지원합니다.",
  );
  check(
    !/<\/?[a-z][^>]*>/i.test(text) &&
      !/^\s*(https?:|javascript:|data:)/i.test(text),
    "VALIDATION",
    "HTML·스크립트·URL은 붙여넣을 수 없습니다.",
  );
  return { id: newId(), kind: "text" as const, text };
}
export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest("input,textarea,select,[contenteditable='true']")
  );
}
