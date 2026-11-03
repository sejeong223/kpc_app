"use client";
import { useState } from "react";
import { DadamSelect } from "@/components/ui/DadamControls";
import SkillStylePreview from "@/components/admin/skills/SkillStylePreview";
import TemplateSlidePreview from "@/components/admin/templates/workbench/TemplateSlidePreview";
import type { AssetPin } from "@/types/workspace-production";
import { useWorkspaceAssetPreview } from "@/hooks/workspace/use-workspace-assets";
import { resolveProjectPrompt } from "@/lib/workspace/production/prompt-resolution";
import SkillRuleSummary from "./SkillRuleSummary";
import { WorkspaceErrorText } from "../shared/WorkspaceUi";
export default function AppliedAssetDetail({
  projectId,
  pin,
}: {
  projectId: string;
  pin: AssetPin;
}) {
  const [index, setIndex] = useState(0),
    query = useWorkspaceAssetPreview(
      projectId,
      pin.kind === "template" ? pin.id : null,
    );
  return (
    <section aria-label={pin.name + " 상세"}>
      <h3 className="tw:text-base">
        {pin.name} · v{pin.revision}
      </h3>
      <p>{pin.snapshot.description || "설명 없음"}</p>
      {pin.kind === "skill" && (
        <div className="tw:grid tw:gap-3 tw:lg:grid-cols-2">
          <SkillRuleSummary rules={pin.snapshot.rules} />
          <SkillStylePreview rules={pin.snapshot.rules} />
        </div>
      )}
      {pin.kind === "prompt" &&
        pin.snapshot.items.map((item) => {
          const value = resolveProjectPrompt(pin.snapshot.items, item.id, []);
          return (
            <article key={item.id} className="tw:mb-3">
              <strong>
                {item.level === 1 ? "대목차" : "소목차"} · {item.title}
              </strong>
              <p className="tw:whitespace-pre-wrap">
                {value.prompt || "프롬프트 없음"}
              </p>
              <small>
                소스 {value.sources.join(" → ") || "없음"}
                {value.inherited ? " · 상위 상속" : ""}
              </small>
            </article>
          );
        })}
      {pin.kind === "template" && (
        <>
          <p>
            {pin.snapshot.definition.extraction.filename} ·{" "}
            {pin.snapshot.definition.extraction.slides.length}쪽
          </p>
          <details>
            <summary>레이아웃·브랜드 추출 정보</summary>
            <pre className="tw:max-h-56 tw:overflow-auto tw:whitespace-pre-wrap tw:text-xs">
              {JSON.stringify(
                {
                  layouts: pin.snapshot.definition.extraction.layouts,
                  themes: pin.snapshot.definition.extraction.themes,
                  fonts: pin.snapshot.definition.extraction.fonts,
                  logoCandidates:
                    pin.snapshot.definition.extraction.logoCandidates,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <p>
            적용 제외 {pin.snapshot.definition.excluded.length}개 · 지정 역할{" "}
            {Object.keys(pin.snapshot.definition.roles).length}개
          </p>
          {query.isPending ? (
            <p role="status">구조를 불러오고 있습니다.</p>
          ) : (
            <WorkspaceErrorText error={query.error} />
          )}
          {query.data && (
            <>
              <DadamSelect
                aria-label="Template 슬라이드"
                value={String(index)}
                onChange={(_, d) => setIndex(Number(d.value))}
              >
                {query.data.slides.map((s) => (
                  <option key={s.path} value={s.index}>
                    {s.index + 1}쪽 ·{" "}
                    {pin.snapshot.definition.pageTypes[String(s.index)] ??
                      s.type}
                  </option>
                ))}
              </DadamSelect>
              <TemplateSlidePreview
                document={query.data}
                slideIndex={index}
                selectedObjectId={null}
                onSelect={() => {}}
              />
              <p className="tw:text-xs">
                구조 미리보기 · PowerPoint 렌더링과 차이가 있을 수 있습니다.
              </p>
              <ul>
                {query.data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <dl>
                {query.data.slides
                  .find((s) => s.index === index)
                  ?.objects.map((o) => (
                    <div key={o.id}>
                      <dt>
                        {o.name} · {o.kind} · 역할{" "}
                        {pin.snapshot.definition.roles[o.id] ?? o.role}
                        {pin.snapshot.definition.excluded.includes(o.id)
                          ? " · 적용 제외"
                          : ""}
                      </dt>
                      <dd>
                        {[...o.reasons, ...o.notices].join(" · ") ||
                          "지원 요소"}
                      </dd>
                    </div>
                  ))}
              </dl>
            </>
          )}
        </>
      )}
    </section>
  );
}
