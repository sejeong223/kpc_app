"use client";
import { useState } from "react";
import {
  DadamButton,
  DadamTextarea,
  DadamSelect,
} from "@/components/ui/DadamControls";
import type { MockRequest, ProjectView } from "@/types/workspace-production";
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
}: {
  view: ProjectView;
  slideIds: string[];
  sectionId: string | null;
  onPropose(request: MockRequest): void;
}) {
  const [instruction, setInstruction] = useState(""),
    [kind, setKind] = useState<"draft" | "polish" | "check">("polish"),
    slides = view.state.body.slides.filter((s) => slideIds.includes(s.id)),
    editable = slideIds.length
      ? slides.length === slideIds.length &&
        slides.every((s) =>
          view.capabilities.editableSectionIds.includes(s.sectionId),
        )
      : !!sectionId && view.capabilities.editableSectionIds.includes(sectionId),
    canCheck = view.capabilities.actions.outline;
  const effectiveKind = !editable && canCheck ? "check" : kind;
  const send = (request: Pick<MockRequest, "kind" | "instruction">) => {
    onPropose({
      ...requestFor(view),
      ...request,
      slideIds,
      sectionIds: slideIds.length ? [] : sectionId ? [sectionId] : [],
    });
  };
  return (
    <details className={workspaceCard}>
      <summary>작성 요청 · 선택 {slideIds.length}장</summary>
      <p className="tw:text-xs">
        {slides.map((s) => s.content.title || "제목 없음").join(" · ") ||
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
          .filter((r) => (r.kind === "check" ? canCheck : editable))
          .map((r) => (
            <DadamButton key={r.label} size="small" onClick={() => send(r)}>
              {r.label}
            </DadamButton>
          ))}
      </div>
      {(editable || canCheck) && (
        <>
          <DadamSelect
            aria-label="작성 요청 종류"
            value={effectiveKind}
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
                <option value="polish">다듬기</option>
              </>
            )}
            {canCheck && <option value="check">점검</option>}
          </DadamSelect>
          <label>
            추가 요청
            <DadamTextarea
              maxLength={4000}
              value={instruction}
              onChange={(_, d) => setInstruction(d.value)}
            />
          </label>
          <DadamButton
            disabled={
              !instruction.trim() ||
              (effectiveKind === "check" ? !canCheck : !editable)
            }
            onClick={() => send({ kind: effectiveKind, instruction })}
          >
            비교 제안 만들기
          </DadamButton>
        </>
      )}
      <p className="tw:text-xs tw:text-(--kpc-muted)">
        Mock 요청입니다. 파일 분석·자동 배치·토큰 차감은 실행하지 않으며 결과를
        비교한 뒤 적용합니다.
      </p>
    </details>
  );
}
