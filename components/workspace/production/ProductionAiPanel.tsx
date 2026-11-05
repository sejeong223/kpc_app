"use client";
import { useState } from "react";
import {
  DadamButton,
  DadamTextarea,
  DadamSelect,
} from "@/components/ui/DadamControls";
import type { MockRequest, ProjectView } from "@/types/workspace-production";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import { requestFor, workspaceCard } from "../shared/WorkspaceUi";
const requests: readonly {
  label: string;
  kind: MockRequest["kind"];
  instruction: string;
}[] = [
  {
    label: "목차 프롬프트대로 초안 생성",
    kind: "draft",
    instruction: "목차에 연결한 프롬프트대로 초안을 생성해 주세요.",
  },
  {
    label: "문장 다듬기",
    kind: "polish",
    instruction: "문장을 간결하고 명확하게 다듬어 주세요.",
  },
  {
    label: "프롬프트 반영 누락 점검",
    kind: "check",
    instruction: "적용 프롬프트에서 반영되지 않은 내용을 점검해 주세요.",
  },
  {
    label: "요구사항 누락 점검",
    kind: "check",
    instruction: "RFP 요구사항 누락을 점검해 주세요.",
  },
  {
    label: "Skill 규칙으로 레이아웃 점검",
    kind: "check",
    instruction: "Skill 규칙에 따라 레이아웃 점검 항목을 제안해 주세요.",
  },
  {
    label: "분량 20% 줄이기",
    kind: "polish",
    instruction: "본문 분량을 20% 줄여 주세요.",
  },
  {
    label: "표로 정리",
    kind: "polish",
    instruction: "본문을 표로 정리해 주세요.",
  },
];
function usedPromptLabel(view: ProjectView, slideId: string): string {
  const slide = view.state.body.slides.find((s) => s.id === slideId),
    pin = view.state.pins.find((p) => p.id === slide?.usedSettings.promptPinId);
  if (!slide || pin?.kind !== "prompt") return "미연결";
  const index = pin.snapshot.items.findIndex(
      (item) => item.id === slide.usedSettings.promptItemId,
    ),
    item = pin.snapshot.items[index];
  if (!item) return "미연결";
  const parent =
    item.level === 2
      ? pin.snapshot.items
          .slice(0, index)
          .reverse()
          .find((p) => p.level === 1)
      : null;
  return item.title + (parent ? " · 상속 기준 대목차: " + parent.title : "");
}
export default function ProductionAiPanel({
  view,
  slideIds,
  sectionId,
  onPropose,
  busy = false,
}: {
  view: ProjectView;
  slideIds: string[];
  sectionId: string | null;
  onPropose(request: MockRequest): void;
  busy?: boolean;
}) {
  const [instruction, setInstruction] = useState(""),
    [kind, setKind] = useState<"draft" | "polish" | "check">("polish"),
    rows = selectProductionSlides(view).filter(row => slideIds.includes(row.slide.id)),
    slides = rows.map(row => row.slide),
    emptySection = !!sectionId && !view.state.body.slides.some(s => s.sectionId === sectionId),
    editable = slideIds.length
      ? slides.length === slideIds.length &&
        slides.every((s) =>
          view.capabilities.editableSectionIds.includes(s.sectionId),
        )
      : emptySection && !!sectionId && view.capabilities.editableSectionIds.includes(sectionId),
    canCheck = view.capabilities.actions.outline && (slides.length > 0 || emptySection) && rows.every(row => !row.section.locked);
  const effectiveKind = !editable && canCheck ? "check" : kind;
  const send = (request: Pick<MockRequest, "kind" | "instruction">) => {
    if (busy || !request.instruction.trim() || view.state.phase !== "writing" || (request.kind === "check" ? !canCheck : !editable) || (!slideIds.length && request.kind !== "draft")) return;
    onPropose({
      ...requestFor(view),
      ...request,
      slideIds,
      sectionIds: slideIds.length ? [] : emptySection && sectionId ? [sectionId] : [],
    });
  };
  if (view.state.phase !== "writing") return null;
  return (
    <details className={workspaceCard} data-comment-control open={slideIds.length > 1}>
      <summary>시연용 AI 작성 요청 · {slideIds.length ? `선택 ${slideIds.length}장` : "빈 소목차 초안"}</summary>
      <p className="tw:text-xs">
        {rows.map(row => `${row.number}번 ${row.slide.content.title || "제목 없음"}`).join(" · ") ||
          view.state.body.sections.find((s) => s.id === sectionId)?.title}
      </p>
      {slides.map((slide) => (
        <details key={slide.id}>
          <summary>
            {slide.content.title || "제목 없음"}의 적용 프롬프트·Skill
          </summary>
          <p className="tw:whitespace-pre-wrap tw:text-sm">
            {slide.usedSettings.prompt || "적용 프롬프트 없음"}
          </p>
          <p className="tw:text-xs">
            항목 {usedPromptLabel(view, slide.id)} · 소스{" "}
            {slide.usedSettings.sources.join(" → ") || "없음"} · Skill{" "}
            {view.state.pins.find((p) => p.id === slide.usedSettings.skillPinId)
              ?.name ?? "미선택"}
          </p>
        </details>
      ))}
      <div className="tw:my-2 tw:flex tw:flex-wrap tw:gap-1">
        {requests
          .filter((r) => (slideIds.length > 0 || r.kind === "draft") && (r.kind === "check" ? canCheck : editable))
          .map((r) => (
            <DadamButton key={r.label} size="small" disabled={busy} onClick={() => send(r)}>
              {r.label}
            </DadamButton>
          ))}
      </div>
      {(editable || canCheck) && (
        <>
          <DadamSelect
            aria-label="작성 요청 종류"
            value={slideIds.length ? effectiveKind : "draft"}
            disabled={busy}
            onChange={(_, d) =>
              setKind(
                d.value === "draft"
                  ? "draft"
                  : d.value === "check"
                    ? "check"
                    : "polish",
              )
            }
          >
            {editable && (
              <>
                <option value="draft">초안</option>
                {slideIds.length > 0 && <option value="polish">다듬기</option>}
              </>
            )}
            {canCheck && slideIds.length > 0 && <option value="check">점검</option>}
          </DadamSelect>
          <label>
            추가 요청
            <DadamTextarea
              maxLength={4000}
              value={instruction}
              disabled={busy}
              onChange={(_, d) => setInstruction(d.value)}
            />
          </label>
          <DadamButton
            disabled={
              busy || !instruction.trim() ||
              (slideIds.length > 0 && effectiveKind === "check" ? !canCheck : !editable)
            }
            onClick={() => send({ kind: slideIds.length ? effectiveKind : "draft", instruction })}
          >
            비교 제안 만들기
          </DadamButton>
        </>
      )}
      <p className="tw:text-xs tw:text-(--kpc-muted)">
        시연용 AI입니다. 결과를 비교한 뒤 선택한 변경만 적용합니다.
      </p>
    </details>
  );
}
