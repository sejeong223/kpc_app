import type {
  Chapter,
  ChecklistItem,
  MockRequest,
  PreparedProposalChange,
  ProjectWorkspaceState,
  ProposalItem,
  ProposalSlide,
  Requirement,
  Section,
  WorkspaceContext,
  WorkspaceProposal,
} from "@/types/workspace-production";
import { currentSlideSettings } from "./domain";

type CandidateChange =
  | {
      kind: "chapter";
      chapter: Chapter;
      sections: Section[];
      requirements: Requirement[];
    }
  | { kind: "slide"; slide: ProposalSlide }
  | { kind: "check"; item: ChecklistItem };
export interface MockCandidate {
  view: WorkspaceProposal;
  actorId: string;
  expiresAt: number;
  changes: Array<{ id: string; change: CandidateChange }>;
}
export function createMockProposal(
  state: ProjectWorkspaceState,
  request: MockRequest,
  context: WorkspaceContext,
): MockCandidate {
  const changes: MockCandidate["changes"] = [],
    items: ProposalItem[] = [],
    now = context.now;
  const add = (
    change: CandidateChange,
    title: string,
    before: string,
    after: string,
    sectionId: string | null,
    slideId: string | null,
  ) => {
    const id = context.newId();
    changes.push({ id, change });
    items.push({
      id,
      sectionId,
      slideId,
      title,
      before,
      after,
      affectedSectionIds:
        change.kind === "chapter"
          ? change.sections.map((s) => s.id)
          : sectionId
            ? [sectionId]
            : [],
      warnings: ["실제 AI·파일 분석 없이 입력 내용을 이용한 모의 제안입니다."],
    });
  };
  if (request.kind === "recommend-toc") {
    for (const title of ["사업 이해", "추진 전략", "수행 계획"]) {
      const chapter: Chapter = { id: context.newId(), title },
        section: Section = {
          id: context.newId(),
          chapterId: chapter.id,
          title: title + " 상세",
          assigneeIds: [context.project.pmId],
          reviewerIds: [],
          state: "writing",
          locked: false,
        };
      add(
        {
          kind: "chapter",
          chapter,
          sections: [section],
          requirements: [
            {
              id: context.newId(),
              sectionId: section.id,
              title: "[시연] " + title + " 확인",
              coverage: "none",
              page: null,
              excerpt: null,
              provenance: "mock",
            },
          ],
        },
        title,
        "새 대목차",
        title +
          " / " +
          section.title +
          " · 기본 담당: " +
          context.project.pmName,
        null,
        null,
      );
    }
  } else if (request.kind === "edit-toc") {
    for (const chapter of state.body.chapters) {
      const sections = state.body.sections.filter(
        (s) => s.chapterId === chapter.id,
      );
      if (
        request.sectionIds.length &&
        !sections.some((s) => request.sectionIds.includes(s.id))
      )
        continue;
      const next = {
        ...chapter,
        title: (chapter.title + " · 보완").slice(0, 200),
      };
      add(
        {
          kind: "chapter",
          chapter: next,
          sections: structuredClone(sections),
          requirements: [],
        },
        chapter.title,
        chapter.title,
        next.title + "\n요청: " + request.instruction,
        null,
        null,
      );
    }
  } else if (request.kind === "check") {
    const targetIds = new Set([
      ...request.sectionIds,
      ...state.body.slides
        .filter((s) => request.slideIds.includes(s.id))
        .map((s) => s.sectionId),
    ]);
    const sections = state.body.sections.filter(
      (s) => !targetIds.size || targetIds.has(s.id),
    );
    for (const section of sections) {
      const item: ChecklistItem = {
        id: context.newId(),
        title: ("[시연] " + section.title + "의 근거·누락 확인").slice(0, 200),
        source: (
          "모의 점검 제안 · 파일 분석 없음 · " + request.instruction
        ).slice(0, 2000),
        assigneeIds: [],
        done: false,
        checkedBy: null,
        checkedAt: null,
      };
      add(
        { kind: "check", item },
        section.title,
        "체크 항목 없음",
        item.title + "\n" + item.source,
        section.id,
        null,
      );
    }
  } else {
    const selected = state.body.sections.filter(
      (s) =>
        request.sectionIds.includes(s.id) ||
        state.body.slides.some(
          (sl) => sl.sectionId === s.id && request.slideIds.includes(sl.id),
        ),
    );
    for (const section of selected) {
      let slides = state.body.slides.filter(
        (s) =>
          s.sectionId === section.id &&
          (request.sectionIds.includes(section.id) ||
            request.slideIds.includes(s.id)),
      );
      if (!slides.length && request.kind === "draft")
        slides = [
          {
            id: context.newId(),
            sectionId: section.id,
            revision: 0,
            content: { title: section.title, lead: "", blocks: [] },
            template: null,
            usedSettings: currentSlideSettings(state, section.id),
            sources: [],
          },
        ];
      for (const original of slides) {
        const slide = structuredClone(original);
        slide.revision++;
        if (request.kind === "draft") {
          const old = slide.content.blocks.find((b) => b.kind === "text"),
            id = old?.id ?? context.newId();
          slide.content = {
            title: section.title,
            lead: "[모의 초안] 검토 후 내용을 보완해 주세요.",
            blocks: [
              {
                id,
                kind: "text",
                text: context.project.name + "\n" + request.instruction,
              },
            ],
          };
          if (slide.template)
            slide.template.bindings = slide.template.bindings.filter(
              (b) => b.key === "title" || b.key === "lead" || b.key === id,
            );
          slide.usedSettings = currentSlideSettings(state, section.id);
        } else {
          const tidy = (text: string) =>
            text
              .split("\n")
              .map((line) => line.replace(/[ \t]+/g, " ").trim())
              .join("\n")
              .trim();
          slide.content.title = tidy(slide.content.title);
          slide.content.lead = tidy(slide.content.lead);
          slide.content.blocks = slide.content.blocks.map((b) =>
            b.kind === "text"
              ? { ...b, text: tidy(b.text) }
              : b.kind === "list"
                ? { ...b, items: b.items.map(tidy) }
                : b,
          );
          if (request.instruction.includes("20%")) {
            // 의미 분석 대신 문장 경계로 줄이는 시연이며 비교 화면에서 사용자가 결정한다.
            const shorten = (text: string) => {
              const lines = text.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [
                text,
              ];
              return lines
                .slice(0, Math.max(1, Math.ceil(lines.length * 0.8)))
                .join(" ")
                .trim();
            };
            slide.content.blocks = slide.content.blocks.map((b) =>
              b.kind === "text"
                ? { ...b, text: shorten(b.text) }
                : b.kind === "list"
                  ? {
                      ...b,
                      items: b.items.slice(
                        0,
                        Math.max(1, Math.ceil(b.items.length * 0.8)),
                      ),
                    }
                  : b,
            );
          } else if (request.instruction.includes("표로")) {
            const converted = new Set<string>();
            slide.content.blocks = slide.content.blocks.map((b) => {
              if (b.kind !== "text" && b.kind !== "list") return b;
              const rows = (b.kind === "list" ? b.items : b.text.split("\n"))
                .filter(Boolean)
                .map((text, i) => [String(i + 1), text]);
              if (
                !rows.length ||
                rows.length > 100 ||
                rows.some((r) => r[1].length > 2000)
              )
                return b;
              converted.add(b.id);
              return {
                id: b.id,
                kind: "table",
                columns: ["순서", "내용"],
                rows,
              };
            });
            // 본문 종류가 바뀌면 기존 텍스트 칸에 표를 억지로 배치하지 않는다.
            if (slide.template)
              slide.template.bindings = slide.template.bindings.filter(
                (b) => !converted.has(b.key),
              );
          }
        }
        add(
          { kind: "slide", slide },
          section.title,
          JSON.stringify(original.content, null, 2),
          JSON.stringify(slide.content, null, 2),
          section.id,
          slide.id,
        );
      }
    }
  }
  return {
    view: {
      id: context.newId(),
      projectId: state.projectId,
      round: state.currentRound,
      baseRevision: state.revision,
      kind: request.kind,
      items,
      mock: true,
      createdAt: now,
    },
    actorId: context.identity.actor.id,
    expiresAt: Date.parse(now) + 600000,
    changes,
  };
}
export function selectedMockChange(
  state: ProjectWorkspaceState,
  candidate: MockCandidate,
  itemIds: readonly string[],
): PreparedProposalChange {
  const body = structuredClone(state.body),
    changed = new Set<string>();
  let structure = false,
    content = false,
    requirements = false,
    checklist = false;
  for (const { change } of candidate.changes.filter((c) =>
    itemIds.includes(c.id),
  )) {
    if (change.kind === "chapter") {
      structure = true;
      const index = body.chapters.findIndex((c) => c.id === change.chapter.id);
      if (index < 0) body.chapters.push(structuredClone(change.chapter));
      else body.chapters[index] = structuredClone(change.chapter);
      for (const section of change.sections) {
        const index = body.sections.findIndex((s) => s.id === section.id);
        if (index < 0) body.sections.push(structuredClone(section));
        else body.sections[index] = structuredClone(section);
        changed.add(section.id);
      }
      if (change.requirements.length) {
        requirements = true;
        body.requirements.push(...structuredClone(change.requirements));
      }
    } else if (change.kind === "slide") {
      content = true;
      changed.add(change.slide.sectionId);
      const index = body.slides.findIndex((s) => s.id === change.slide.id);
      if (index < 0) body.slides.push(structuredClone(change.slide));
      else body.slides[index] = structuredClone(change.slide);
    } else {
      checklist = true;
      body.checklist.push(structuredClone(change.item));
    }
  }
  return {
    type: "apply-proposal",
    sectionIds: [...changed],
    chapters: structure ? body.chapters : null,
    sections: structure ? body.sections : null,
    slides: content ? body.slides : null,
    requirements: requirements ? body.requirements : null,
    checklist: checklist ? body.checklist : null,
  };
}
