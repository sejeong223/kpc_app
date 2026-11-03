"use client";
import { useState } from "react";
import { DadamSelect } from "@/components/ui/DadamControls";
import TemplateSlidePreview from "@/components/admin/templates/workbench/TemplateSlidePreview";
import { useWorkspaceAssetPreview } from "@/hooks/workspace/use-workspace-assets";
import { inspectContentSlots } from "@/lib/pptx/production/content";
import { buildDefaultOptions } from "@/lib/admin/assets/work-policy";
import type {
  ProjectView,
  SlideContent,
  SlideTemplateRef,
} from "@/types/workspace-production";
import { workspaceCard, WorkspaceErrorText } from "../shared/WorkspaceUi";
export default function SlideTemplatePicker({
  view,
  content,
  value,
  readOnly,
  onChange,
}: {
  view: ProjectView;
  content: SlideContent;
  value: SlideTemplateRef | null;
  readOnly: boolean;
  onChange(value: SlideTemplateRef | null): void;
}) {
  const [candidatePin, setCandidatePin] = useState<string | null>(null);
  const pins = view.state.pins.filter(
      (p) =>
        p.kind === "template" &&
        (p.id === value?.pinId ||
          p.id === view.state.body.settings.templatePinId),
    ),
    pin =
      pins.find((p) => p.id === (candidatePin ?? value?.pinId)) ??
      pins.find((p) => p.id === view.state.body.settings.templatePinId),
    access = view.assetAccess.find((a) => a.pinId === pin?.id)?.access,
    query = useWorkspaceAssetPreview(
      view.project.id,
      pin?.id ?? null,
      access?.status === "available",
    );
  const slide = query.data?.slides.find(
      (s) => pin?.id === value?.pinId && s.path === value?.sourceSlidePath,
    ),
    slots =
      query.data && slide && pin?.kind === "template"
        ? inspectContentSlots(
            query.data,
            slide.path,
            buildDefaultOptions(pin.snapshot),
          )
        : [],
    keys = [
      { key: "title", label: "제목", role: "title" },
      { key: "lead", label: "리딩 메시지", role: "sub" },
      ...content.blocks.map((b, i) => ({
        key: b.id,
        label: i + 1 + ". " + b.kind,
        role: b.kind === "list" || b.kind === "text" ? "body" : b.kind,
      })),
    ];
  return (
    <details className={workspaceCard} open={!value}>
      <summary>Template 슬라이드·내용 칸 연결</summary>
      {!pins.length ? (
        <p>
          제작 설정에서 실제 등록 Template을 선택해 주세요. 내용은 Template
          없이도 저장할 수 있습니다.
        </p>
      ) : (
        <>
          <DadamSelect
            aria-label="적용 Template 사본"
            value={pin?.id ?? ""}
            disabled={readOnly || pins.length < 2}
            onChange={(_, d) => {
              const next = pins.find((p) => p.id === d.value);
              if (next?.kind === "template") {
                setCandidatePin(next.id);
              }
            }}
          >
            {pins.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · v{p.revision}
              </option>
            ))}
          </DadamSelect>
          {access?.status !== "available" ? (
            <p>
              {access?.reason ?? "이용 권한 확인 중"} 사용 가능한 자산을 다시
              선택해 주세요.
            </p>
          ) : (
            <>
              <WorkspaceErrorText error={query.error} />
              {query.isPending && <p>Template 구조를 불러오고 있습니다.</p>}
              {query.data && (
                <>
                  <label>
                    원본 슬라이드
                    <DadamSelect
                      value={slide?.path ?? ""}
                      disabled={readOnly}
                      onChange={(_, d) => {
                        if (pin)
                          onChange(
                            d.value
                              ? {
                                  pinId: pin.id,
                                  sourceSlidePath: d.value,
                                  bindings: [],
                                }
                              : null,
                          );
                      }}
                    >
                      <option value="">슬라이드 선택</option>
                      {query.data.slides.map((s) => (
                        <option key={s.path} value={s.path}>
                          {s.index + 1}쪽 · {s.name} · {s.type}
                        </option>
                      ))}
                    </DadamSelect>
                  </label>
                  {slide && (
                    <>
                      <TemplateSlidePreview
                        document={query.data}
                        slideIndex={slide.index}
                        selectedObjectId={null}
                        onSelect={() => {}}
                      />
                      {keys.map((key) => (
                        <label key={key.key} className="tw:my-2 tw:block">
                          {key.label}
                          <DadamSelect
                            disabled={readOnly}
                            value={
                              value?.bindings.find((b) => b.key === key.key)
                                ?.objectId ?? ""
                            }
                            onChange={(_, d) => {
                              if (value)
                                onChange({
                                  ...value,
                                  bindings: [
                                    ...value.bindings.filter(
                                      (b) => b.key !== key.key,
                                    ),
                                    ...(d.value
                                      ? [{ key: key.key, objectId: d.value }]
                                      : []),
                                  ],
                                });
                            }}
                          >
                            <option value="">연결 안 함</option>
                            {slots.map((slot) => (
                              <option
                                key={slot.objectId}
                                value={slot.objectId}
                                disabled={
                                  !slot.supported ||
                                  slot.role !== key.role ||
                                  !!value?.bindings.some(
                                    (b) =>
                                      b.objectId === slot.objectId &&
                                      b.key !== key.key,
                                  )
                                }
                              >
                                {slide.objects.find(
                                  (o) => o.id === slot.objectId,
                                )?.name ?? slot.objectId}{" "}
                                · {slot.role}
                                {!slot.supported
                                  ? " · " + slot.reasons.join(" / ")
                                  : ""}
                              </option>
                            ))}
                          </DadamSelect>
                        </label>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </details>
  );
}
