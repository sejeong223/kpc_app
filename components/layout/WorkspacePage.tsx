"use client";

import { useEffect, useRef } from "react";
import WorkspaceHeader from "./WorkspaceHeader";

export interface WorkspacePageProps {
  title: string;
  /** 메뉴명은 접근성용으로만 남기고 등록·수정·상세 제목만 명시적으로 표시한다. */
  showTitle?: boolean;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  headingId?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  stickyHeader?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function WorkspacePage({ children, className = "", stickyHeader = false, ...header }: WorkspacePageProps): React.ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLElement>(null);
  useEffect(() => {
    const page = root.current, element = heading.current;
    if (!page || !element || !stickyHeader) return;
    // 액션 줄바꿈으로 바뀐 높이도 미리보기의 sticky 위치에 반영한다.
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      if (Number.isFinite(height) && height >= 0) page.style.setProperty("--layout-sticky-header-height", height + "px");
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      page.style.removeProperty("--layout-sticky-header-height");
    };
  }, [stickyHeader]);

  return <div ref={root} data-workspace-page className={"tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap) " + className}>
    <WorkspaceHeader {...header} headerRef={heading} sticky={stickyHeader} />
    {children}
  </div>;
}
