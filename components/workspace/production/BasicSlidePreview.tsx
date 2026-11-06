"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import SlideCommentSurface from "@/components/comments/SlideCommentSurface";
import { useSlideImageUrl } from "@/hooks/workspace/use-production-preview";
import type { ContentBlock, ProjectView, ProposalSlide } from "@/types/workspace-production";

export interface BasicSlidePreviewProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null;
  mode: "full" | "thumbnail"; enabled: boolean; onOverflow?(value: boolean): void;
  commentCreateTarget?: HTMLElement | null;
}
const useStyles = makeStyles({
  frame: { position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1 },
  canvas: { boxSizing: "border-box", position: "absolute", width: "960px", height: "540px", transformOrigin: "top left", padding: "44px 52px", color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: "20px", lineHeight: "1.5", overflow: "hidden" },
  title: { fontSize: "34px", fontWeight: 700, lineHeight: "1.3", margin: "0 0 12px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  lead: { fontSize: "22px", margin: "0 0 24px", color: tokens.colorBrandForeground1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  body: { "& p": { margin: "12px 0", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, "& ul": { paddingLeft: "28px", margin: "12px 0" },
    "& li": { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, "& table": { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: "16px" },
    "& th, & td": { border: `1px solid ${tokens.colorNeutralStroke2}`, padding: "8px 12px", textAlign: "left", whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
    "& th": { backgroundColor: tokens.colorNeutralBackground3 }, "& figure": { margin: "16px 0" },
  },
  image: { display: "block", maxWidth: "100%", maxHeight: "280px", objectFit: "contain" },
  notice: { color: tokens.colorNeutralForeground3, fontSize: "12px", marginTop: "8px" },
});
function SavedImage({ block, ...props }: Omit<BasicSlidePreviewProps, "mode" | "onOverflow"> & { block: Extract<ContentBlock, { kind: "image" }> }) {
  const styles = useStyles(), image = useSlideImageUrl(props.view, props.slide, block.id, props.snapshotId, props.enabled);
  return <figure>{image.url ? <>
    {/* Blob URL is owned and released by useSlideImageUrl. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.image} src={image.url} width={block.width} height={block.height} alt={block.alt} draggable={false} />
  </> : <div>{block.alt || "이미지"} · {image.error?.message ?? (image.loading ? "불러오는 중" : "미리보기 대기")}</div>}</figure>;
}
function SlideBody(props: BasicSlidePreviewProps) {
  return props.slide.content.blocks.map(block => {
    if (block.kind === "text") return <p key={block.id}>{block.text || "\u00a0"}</p>;
    if (block.kind === "list") return <ul key={block.id}>{block.items.map((text, i) => <li key={i}>{text || "\u00a0"}</li>)}</ul>;
    if (block.kind === "table") return <table key={block.id} aria-label="슬라이드 본문 표"><thead><tr>{block.columns.map((text, i) => <th key={i} scope="col">{text}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((text, j) => <td key={j}>{text}</td>)}</tr>)}</tbody></table>;
    return <SavedImage key={block.id} {...props} block={block} />;
  });
}
export default function BasicSlidePreview(props: BasicSlidePreviewProps): React.ReactElement {
  const styles = useStyles(), frame = useRef<HTMLDivElement>(null), canvas = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0), [overflow, setOverflow] = useState(false);
  const { slide, onOverflow } = props;
  useLayoutEffect(() => {
    let pending = 0;
    const measure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        if (!frame.current || !canvas.current) return;
        setScale(frame.current.clientWidth / 960);
        const value = canvas.current.scrollHeight > 540 || canvas.current.scrollWidth > 960;
        setOverflow(value); onOverflow?.(value);
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (frame.current) observer?.observe(frame.current); if (body.current) observer?.observe(body.current);
    measure(); return () => { observer?.disconnect(); cancelAnimationFrame(pending); };
  }, [slide.content, onOverflow]);
  const preview = <div ref={frame} className={styles.frame} role="img" aria-label={`${slide.content.title || "제목 없음"} · 기본 슬라이드 미리보기`}>
      <div ref={canvas} className={styles.canvas} style={{ transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}>
        <div ref={body} className={styles.body}><h3 className={styles.title}>{slide.content.title || "제목 없음"}</h3>
          {slide.content.lead && <p className={styles.lead}>{slide.content.lead}</p>}<SlideBody {...props} />
        </div>
      </div>
    </div>;
  return <>
    {props.mode === "full" ? <SlideCommentSurface slideId={slide.id} enabled={scale > 0} commentCreateTarget={props.commentCreateTarget}>{preview}</SlideCommentSurface> : preview}
    {overflow && <p className={styles.notice}>{props.mode === "thumbnail" ? "본문 초과" : "본문이 슬라이드 영역을 넘습니다. 편집 영역에서 내용을 나누거나 줄여 주세요."}</p>}
  </>;
}
