"use client";
import { useEffect, useRef, useState } from "react";
import SlideCommentSurface from "@/components/comments/SlideCommentSurface";
import TemplateSlidePreview from "@/components/admin/templates/workbench/TemplateSlidePreview";
import { useProductionPreview } from "@/hooks/workspace/use-production-preview";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";
import BasicSlidePreview from "./BasicSlidePreview";
import HtmlDemoSlidePreview from "./HtmlDemoSlidePreview";
import { htmlDemoLayout } from "@/config/production-html-demo";

export interface ProductionPreviewProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null;
  mode?: "full" | "thumbnail"; number?: number; priority?: boolean;
  lazy?: boolean;
}
export default function ProductionPreview({ view, slide, snapshotId, mode = "full", number, priority = false, lazy = false }: ProductionPreviewProps): React.ReactElement {
  const root = useRef<HTMLDivElement>(null), [near, setNear] = useState(false);
  const enabled = (mode === "full" && !lazy) || priority || near;
  useEffect(() => {
    if ((mode === "full" && !lazy) || !root.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setNear(true); observer.disconnect(); } }, { rootMargin: "200px" });
    observer.observe(root.current); return () => observer.disconnect();
  }, [mode, lazy]);
  const query = useProductionPreview(view, slide, snapshotId, enabled);
  const inaccessible = !!slide.template && [slide.template.pinId, slide.usedSettings.skillPinId, slide.usedSettings.promptPinId].filter(Boolean).some(id => view.assetAccess.find(a => a.pinId === id)?.access.status !== "available");
  const templateSlide = query.data?.preview.slides.find(s => s.path === slide.template?.sourceSlidePath);
  const demoLayout = htmlDemoLayout(view.project.id, slide);
  const templatePreview = query.data && templateSlide ? <div role="img" aria-label={`${slide.content.title || "제목 없음"} · Template 미리보기`}>
    <div inert style={{ pointerEvents: "none" }}><TemplateSlidePreview document={query.data.preview} slideIndex={templateSlide.index} selectedObjectId={null} onSelect={() => {}} /></div>
  </div> : null;
  return <div ref={root} aria-label={`${number ? `${number}번 ` : ""}슬라이드 저장본`}>
    {demoLayout ? <HtmlDemoSlidePreview view={view} slide={slide} layout={demoLayout} mode={mode} number={number} /> : !slide.template ? <BasicSlidePreview view={view} slide={slide} snapshotId={snapshotId} mode={mode} enabled={enabled} /> : inaccessible ?
      <p role="status">Template 또는 적용 자산의 원본·권한을 확인할 수 없습니다. 제작 설정에서 재선택해 주세요.</p> : query.error ?
      <p role="status">{query.error.message}</p> : query.data && templateSlide ? <>
        {mode === "full" ? <SlideCommentSurface slideId={slide.id} enabled>{templatePreview}</SlideCommentSurface> : templatePreview}
        {mode === "full" && query.data.warnings.length > 0 && <ul className="tw:text-xs tw:text-(--kpc-muted)">{query.data.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      </> : <div className="tw:flex tw:aspect-video tw:items-center tw:justify-center tw:border tw:border-(--kpc-line) tw:text-xs">
        {query.data ? "연결한 Template 슬라이드를 찾을 수 없습니다. 제작 설정을 확인해 주세요." : enabled ? "슬라이드를 불러오는 중입니다." : "미리보기 대기"}
      </div>}
    {mode === "full" && <p className="tw:mt-2 tw:text-xs tw:text-(--kpc-muted)">{slide.template ? "PowerPoint와 다를 수 있는 구조 미리보기입니다." : demoLayout ? "HTML 예시 미리보기 · PPT 출력에는 Template 연결이 필요합니다." : "기본 16:9 미리보기 · PPT 출력에는 Template 연결이 필요합니다."}</p>}
  </div>;
}
