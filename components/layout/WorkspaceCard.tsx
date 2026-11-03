import type { ReactElement, ReactNode } from "react";

export interface WorkspaceCardProps {
  title?: string;
  /** 제목 바로 옆(왼쪽 묶음)에 붙는 보조 정보. 예: "* 필수 2/5" */
  titleMeta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyPadding?: "inset" | "flush";
}
export interface WorkspaceCardSectionProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  afterHeader?: boolean;
}

export default function WorkspaceCard({ title, titleMeta, actions, children, className = "", bodyPadding = "inset" }: WorkspaceCardProps): ReactElement {
  const hasHeader = Boolean(title || titleMeta || actions);
  const heading = title ? <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">{title}</h2> : null;
  return <section aria-label={title} className={"tw:min-w-0 tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) " + className}>
    {hasHeader && <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:p-(--layout-card-inset)">
      {/* titleMeta가 없으면 기존처럼 h2를 header의 직접 자식으로 둔다(다른 화면 DOM 불변). */}
      {titleMeta
        ? <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2">{heading}{titleMeta}</div>
        : heading}{actions}
    </header>}
    <div className={"tw:flex tw:min-w-0 tw:flex-col tw:[&>p]:m-0 " + (bodyPadding === "flush" ? "tw:p-0" :
      "tw:gap-(--layout-section-gap) tw:p-(--layout-card-inset)" + (hasHeader ? " tw:pt-0" : ""))}>{children}</div>
  </section>;
}

export function WorkspaceCardSection({ children, className = "", afterHeader = false }: WorkspaceCardSectionProps): ReactElement {
  return <div className={"tw:flex tw:min-w-0 tw:flex-col tw:[&>p]:m-0 tw:gap-(--layout-section-gap) tw:p-(--layout-card-inset)" +
    (afterHeader ? " tw:pt-0" : "") + " " + className}>{children}</div>;
}
