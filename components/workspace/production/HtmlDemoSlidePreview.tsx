"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import SlideCommentSurface from "@/components/comments/SlideCommentSurface";
import { HTML_DEMO_PROPOSAL_NAME, type HtmlDemoLayout } from "@/config/production-html-demo";
import { outlineNumbers } from "@/lib/workspace/production/selectors";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";
import styles from "./HtmlDemoSlidePreview.module.css";

export default function HtmlDemoSlidePreview({ view, slide, layout, mode, number, commentCreateTarget }: {
  view: ProjectView; slide: ProposalSlide; layout: HtmlDemoLayout;
  mode: "full" | "thumbnail"; number?: number; commentCreateTarget?: HTMLElement | null;
}): React.ReactElement {
  const content = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const section = view.state.body.sections.find(item => item.id === slide.sectionId);
  const sectionSlides = view.state.body.slides.filter(item => item.sectionId === slide.sectionId);
  const sectionNumber = outlineNumbers(view.state)[slide.sectionId];
  const table = slide.content.blocks[0];
  const showColumns = table?.kind === "table" && (table.columns[0] !== "구분" || table.columns[1] !== "내용");

  useLayoutEffect(() => {
    let pending = 0;
    const measure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const element = content.current;
        if (element) setOverflow(element.clientHeight > 0 && element.scrollHeight > element.clientHeight + 1);
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (content.current) observer?.observe(content.current);
    measure();
    return () => { observer?.disconnect(); cancelAnimationFrame(pending); };
  }, [slide.content, layout]);

  const renderedSlide = <div className={styles.slide} role="img" aria-label={`${slide.content.title || "제목 없음"} · HTML 예시 슬라이드`}>
        <span className={styles.number}>Slide {number ?? sectionSlides.findIndex(item => item.id === slide.id) + 1}</span>
        <span className={styles.page}>{sectionNumber} · {sectionSlides.findIndex(item => item.id === slide.id) + 1}/{sectionSlides.length}</span>
        <div ref={content} className={styles.content}>
          <div className={styles.tag}>{sectionNumber} {section?.title}</div>
          <h3 className={styles.title}>{slide.content.title || "제목 없음"}</h3>
          {slide.content.lead && <p className={styles.lead}>{slide.content.lead}</p>}
          {layout === "table" && table?.kind === "table" ? <table className={styles.table} aria-label="슬라이드 본문 표">
            {showColumns && <thead><tr>{table.columns.map((text, index) => <th key={index} scope="col">{text}</th>)}</tr></thead>}
            <tbody>{table.rows.map((row, index) => <tr key={index}><th scope="row">{row[0]}</th><td>{row[1]}</td></tr>)}</tbody>
          </table> : <div className={styles[layout]}>
            {slide.content.blocks.map((block, index) => {
              if (block.kind !== "text") return null; // htmlDemoLayout already checks the complete structure.
              const [heading, ...lines] = block.text.split("\n");
              return <Fragment key={block.id}>
                {layout === "process" && index > 0 && <span className={styles.arrow} aria-hidden>›</span>}
                <div className={styles.item}>
                  {layout !== "kpi" && <span className={styles.itemNumber}>{layout === "process" ? `STEP ${index + 1}` : `0${index + 1}`}</span>}
                  <b>{heading || "\u00a0"}</b><p>{lines.join("\n")}</p>
                </div>
              </Fragment>;
            })}
          </div>}
        </div>
        <footer className={styles.footer}><span>{HTML_DEMO_PROPOSAL_NAME}</span><span>행정안전부 제안서</span></footer>
      </div>;
  return <>
    <div className={styles.frame}>{mode === "full" ? <SlideCommentSurface slideId={slide.id} enabled commentCreateTarget={commentCreateTarget}>{renderedSlide}</SlideCommentSurface> : renderedSlide}</div>
    {overflow && <p className={styles.notice}>{mode === "thumbnail" ? "본문 초과" : "본문이 슬라이드 영역을 넘습니다. 편집 영역에서 내용을 나누거나 줄여 주세요."}</p>}
  </>;
}
