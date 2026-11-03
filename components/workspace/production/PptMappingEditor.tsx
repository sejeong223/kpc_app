"use client";
import { useState } from "react";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import { slidePinIds } from "@/lib/workspace/production/clipboard";
import type {
  ImportMapping,
  PptComparison,
  ProjectView,
} from "@/types/workspace-production";
import {
  mappingConflict,
  pinsAvailable,
} from "@/lib/workspace/production/diff";
export default function PptMappingEditor({
  comparison,
  view,
  busy,
  initial,
  onRemap,
}: {
  comparison: PptComparison;
  view: ProjectView;
  busy: boolean;
  initial: ImportMapping[];
  onRemap(mapping: ImportMapping[]): void;
}) {
  const [mapping, setMapping] = useState<ImportMapping[]>(initial),
    [external, setExternal] = useState(""),
    [target, setTarget] = useState(""),
    shapes = comparison.externalShapes,
    shape = shapes.find(
      (s) => JSON.stringify([s.path, s.shapeId]) === external,
    ),
    targets = view.state.body.slides
      .filter(
        (s) =>
          view.capabilities.editableSectionIds.includes(s.sectionId) &&
          pinsAvailable(view, slidePinIds([s])),
      )
      .flatMap((s) => [
        {
          slideId: s.id,
          key: "title",
          label: s.content.title + " / 제목",
          kind: "text",
        },
        {
          slideId: s.id,
          key: "lead",
          label: s.content.title + " / 리딩 메시지",
          kind: "text",
        },
        ...s.content.blocks
          .filter((b) => b.kind !== "image")
          .map((b, i) => ({
            slideId: s.id,
            key: b.id,
            label: s.content.title + " / " + (i + 1) + ". " + b.kind,
            kind: b.kind,
          })),
      ]),
    chosen = targets.find((t) => JSON.stringify([t.slideId, t.key]) === target),
    compatible =
      !!shape &&
      !!chosen &&
      !shape.reasons.length &&
      (chosen.kind === "table"
        ? shape.kind === "table"
        : shape.kind === "text" || shape.kind === "shape");
  const next = compatible
    ? [
        ...mapping,
        {
          externalPath: shape!.path,
          externalShapeId: shape!.shapeId,
          slideId: chosen!.slideId,
          key: chosen!.key,
        },
      ]
    : mapping;
  return (
    <details>
      <summary>외부 요소와 현재 본문 직접 연결</summary>
      <p className="tw:text-xs">
        번호·제목만으로 대응시키지 않습니다. 실제 외부 요소와 변경할 내용 칸을
        확인하세요. 이미지·디자인 변경은 원본 PPT에 보존됩니다.
      </p>
      <label>
        외부 슬라이드·요소
        <DadamSelect
          value={external}
          disabled={busy}
          onChange={(_, d) => {
            setExternal(d.value);
            setTarget("");
          }}
        >
          <option value="">요소 선택</option>
          {shapes.map((s, i) => (
            <option
              key={i}
              value={JSON.stringify([s.path, s.shapeId])}
              disabled={
                !s.shapeId ||
                s.reasons.length > 0 ||
                s.kind === "image" ||
                s.kind === "unsupported"
              }
            >
              {s.slideName} / {s.name} · {s.kind}
              {s.reasons.length ? " · " + s.reasons.join(" / ") : ""}
            </option>
          ))}
        </DadamSelect>
      </label>
      {shape && (
        <pre className="tw:max-h-40 tw:overflow-auto tw:whitespace-pre-wrap tw:text-xs">
          {shape.excerpt || "(빈 내용)"}
          {shape.excerpt.length === 2000 ? "\n(앞 2,000자 발췌)" : ""}
        </pre>
      )}
      <label>
        현재 슬라이드·본문 칸
        <DadamSelect
          value={target}
          disabled={busy || !shape}
          onChange={(_, d) => setTarget(d.value)}
        >
          <option value="">대상 선택</option>
          {targets.map((t) => (
            <option
              key={JSON.stringify([t.slideId, t.key])}
              value={JSON.stringify([t.slideId, t.key])}
            >
              {t.label}
            </option>
          ))}
        </DadamSelect>
      </label>
      <DadamButton
        disabled={busy || !compatible || mappingConflict(next)}
        onClick={() => {
          setMapping(next);
          setExternal("");
          setTarget("");
        }}
      >
        연결 추가
      </DadamButton>
      {compatible && mappingConflict(next) && (
        <p role="alert">동일 요소나 본문에 중복 연결할 수 없습니다.</p>
      )}
      <ul>
        {mapping.map((m, i) => (
          <li key={i}>
            {shapes.find(
              (s) =>
                s.path === m.externalPath && s.shapeId === m.externalShapeId,
            )?.name ?? m.externalShapeId}{" "}
            →{" "}
            {targets.find((t) => t.slideId === m.slideId && t.key === m.key)
              ?.label ?? m.key}
            <DadamButton
              size="small"
              disabled={busy}
              onClick={() => setMapping((v) => v.filter((_, j) => j !== i))}
            >
              연결 제거
            </DadamButton>
          </li>
        ))}
      </ul>
      <DadamButton
        disabled={busy || mappingConflict(mapping)}
        onClick={() => onRemap(mapping)}
      >
        연결을 확인하고 다시 비교
      </DadamButton>
    </details>
  );
}
