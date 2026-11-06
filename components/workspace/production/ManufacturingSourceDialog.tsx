"use client";
import { useEffect, useRef, useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import { MFG_DEMO_FILES, MFG_DEMO_SLIDES } from "@/config/production-mfg-demo";
import type { ManufacturingDemoSource } from "@/lib/workspace/production/manufacturing-sources";
import type { ProjectView } from "@/types/workspace-production";

export default function ManufacturingSourceDialog({ source, view, onClose }: { source: ManufacturingDemoSource; view: ProjectView; onClose(): void }) {
  const mark = useRef<HTMLElement>(null), [notice, setNotice] = useState<string | null>(null);
  const file = source.kind === "file" ? MFG_DEMO_FILES.find(f => f.id === source.targetId) : null;
  const rfp = source.kind === "rfp" || file?.main;
  const sections = file?.id === "mfgf2" ? ["s31", "s21"] : file?.id === "mfgf3" ? ["s11", "s33"] : ["s33", "s41"];
  useEffect(() => { const frame = requestAnimationFrame(() => mark.current?.scrollIntoView({ block: "center" })); return () => cancelAnimationFrame(frame); }, [source.id]);
  return <ModalFrame open width={source.kind === "rfp" ? 880 : 960} title={source.kind === "rfp" ? "RFP 원문" : source.title}
    subtitle={source.kind === "rfp" ? `p.${source.page} · ${source.location}` : undefined} contentKey={source.id} onClose={onClose}
    footer={<><span className="tw:flex-1" />{file && <DadamButton onClick={() => setNotice("원본 다운로드 시연입니다. 실제 파일은 연결되지 않았습니다.")}>원본 다운로드</DadamButton>}<DadamButton onClick={onClose}>닫기</DadamButton></>}>
    <div className="tw:min-h-0 tw:max-h-[65vh] tw:overflow-auto tw:bg-(--kpc-bg) tw:p-4">
      {file && <p className="tw:mt-0 tw:flex tw:flex-wrap tw:gap-3 tw:text-xs tw:text-(--kpc-muted)">{[`${file.round}차`, file.type, file.priority, file.by, file.at, file.sizeLabel].map((text, i) => <span key={i}>{text}</span>)}</p>}
      <p className="tw:text-xs tw:text-(--kpc-muted)">시연용 내용 · 실제 파일 미연동</p>
      {rfp ? view.state.body.requirements.map(requirement => <section key={requirement.id} className="tw:mb-4 tw:rounded tw:border tw:border-(--kpc-line) tw:bg-white tw:p-6">
        <div className="tw:flex tw:justify-between tw:text-xs tw:text-(--kpc-muted)"><span>제안요청서</span><span>Page {requirement.page} of 64</span></div>
        <h3 className="tw:text-base">요구사항 상세 · {requirement.id}</h3>
        <p className="tw:text-sm tw:leading-7">{requirement.id === source.targetId ? <mark ref={mark} className="tw:bg-yellow-100">{requirement.excerpt}</mark> : requirement.excerpt}</p>
      </section>) : <article className="tw:rounded tw:border tw:border-(--kpc-line) tw:bg-white tw:p-6">
        <h3 className="tw:text-base">{file?.name}</h3>
        {MFG_DEMO_SLIDES.filter(slide => sections.includes(slide.sectionId)).slice(0, 6).map(slide => <section key={slide.id}>
          <h4 className="tw:mb-1 tw:mt-5 tw:text-sm">{slide.title}</h4><p className="tw:my-1 tw:text-sm">{slide.lead}</p>
          <ul className="tw:my-2 tw:list-disc tw:pl-5 tw:text-sm tw:leading-7">{slide.items.map(([heading, text]) => <li key={heading}><b>{heading}</b> · {text}</li>)}</ul>
        </section>)}
      </article>}
      {notice && <p role="status" className="tw:text-sm">{notice}</p>}
    </div>
  </ModalFrame>;
}
