import type { ReactElement } from "react";
import type { WorkspaceCardProps } from "./WorkspaceCard";

interface WorkspaceToolbarProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  align?: "center" | "end";
}

export default function WorkspaceToolbar({ children, className = "", align = "end" }: WorkspaceToolbarProps): ReactElement {
  return <div className={"tw:flex tw:min-w-0 tw:flex-wrap tw:gap-(--layout-control-gap) " +
    (align === "center" ? "tw:items-center " : "tw:items-end ") + className}>{children}</div>;
}
