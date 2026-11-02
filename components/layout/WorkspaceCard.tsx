import type { ReactElement, ReactNode } from "react";

export interface WorkspaceCardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyPadding?: "inset" | "flush";
}
export interface WorkspaceCardSectionProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  afterHeader?: boolean;
}

export default function WorkspaceCard({ title, actions, children, className = "", bodyPadding = "inset" }: WorkspaceCardProps): ReactElement {
  const hasHeader = Boolean(title || actions);
  return <section aria-label={title} className={"tw:min-w-0 tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) " + className}>
    {hasHeader && <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:p-(--layout-card-inset)">
      {title && <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">{title}</h2>}{actions}
    </header>}
    <div className={"tw:flex tw:min-w-0 tw:flex-col tw:[&>p]:m-0 " + (bodyPadding === "flush" ? "tw:p-0" :
      "tw:gap-(--layout-section-gap) tw:p-(--layout-card-inset)" + (hasHeader ? " tw:pt-0" : ""))}>{children}</div>
  </section>;
}

export function WorkspaceCardSection({ children, className = "", afterHeader = false }: WorkspaceCardSectionProps): ReactElement {
  return <div className={"tw:flex tw:min-w-0 tw:flex-col tw:[&>p]:m-0 tw:gap-(--layout-section-gap) tw:p-(--layout-card-inset)" +
    (afterHeader ? " tw:pt-0" : "") + " " + className}>{children}</div>;
}
