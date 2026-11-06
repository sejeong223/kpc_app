import type { ProjectWorkspaceState, ProposalSlide, RoundBody, Section } from "@/types/workspace-production";

export function isSlideLocked(slide: Pick<ProposalSlide, "state">): boolean {
  return slide.state === "done";
}

export function isSectionLocked(section: Pick<Section, "state" | "locked">): boolean {
  return section.locked || section.state === "done";
}

export function hasLockedSlides(body: RoundBody, sectionId: string): boolean {
  return body.slides.some(slide => slide.sectionId === sectionId && isSlideLocked(slide));
}

/** 슬라이드 상태를 소목차로 집계한다. 소목차 캐시를 형제 슬라이드에 전파하지 않는다. */
export function syncSectionCompletion(body: RoundBody): RoundBody {
  let changed = false;
  const sections = body.sections.map(section => {
    const slides = body.slides.filter(slide => slide.sectionId === section.id);
    const done = slides.length ? slides.every(isSlideLocked) : section.state === "done";
    const state = done ? "done" : "writing";
    if (section.state === state && section.locked === done) return section;
    changed = true;
    return { ...section, state, locked: done } satisfies Section;
  });
  return changed ? { ...body, sections } : body;
}

export function normalizeWorkspaceCompletion(state: ProjectWorkspaceState): ProjectWorkspaceState {
  const body = syncSectionCompletion(state.body);
  return body === state.body ? state : { ...state, body };
}
