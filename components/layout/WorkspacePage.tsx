"use client";

import { useEffect, useRef } from "react";
import WorkspaceHeader, { type WorkspaceHeaderProps } from "./WorkspaceHeader";

export interface WorkspacePageProps {
  title: string;
  /** 메뉴명은 접근성용으로만 남기고 등록·수정·상세 제목만 명시적으로 표시한다. */
  showTitle?: boolean;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  headingId?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  stickyHeader?: boolean;
  headerComponent?: React.ComponentType<WorkspaceHeaderProps>;
  /** 지정하면 화면 높이에 맞추고 본문만 스크롤하여 하단 액션을 계속 표시한다. */
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export default function WorkspacePage({ children, footer, className = "", stickyHeader = false, headerComponent: HeaderComponent = WorkspaceHeader, ...header }: WorkspacePageProps): React.ReactElement {
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

  return <div ref={root} data-workspace-page className={"tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap) " +
    (footer ? "tw:relative tw:h-[calc(100dvh-var(--layout-page-inset)-var(--layout-page-inset))] tw:min-h-0 " : "") + className}>
    <HeaderComponent {...header} headerRef={heading} sticky={stickyHeader} />
    {footer ? <>
      <div data-workspace-scroll-region role="region" aria-label={`${header.title} 입력 영역`} tabIndex={0}
        className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain tw:scroll-py-2 tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-2 tw:focus-visible:outline-(--kpc-brand)">
        {children}
      </div>
      <div data-workspace-footer className="tw:min-w-0 tw:shrink-0 tw:space-y-(--layout-control-gap)">{footer}</div>
    </> : children}
  </div>;
}
