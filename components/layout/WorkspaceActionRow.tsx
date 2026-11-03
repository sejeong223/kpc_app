import type { ReactElement } from "react";
import type { WorkspaceCardProps } from "./WorkspaceCard";

type WorkspaceActionRowProps = Pick<WorkspaceCardProps, "children" | "actions" | "className">;

export default function WorkspaceActionRow({ children, actions, className = "" }: WorkspaceActionRowProps): ReactElement {
  return <div className={"tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap) " + className}>
    <div className="tw:min-w-0 tw:flex-[1_1_16rem]">{children}</div>
    {actions && <div className="tw:ml-auto tw:flex tw:min-w-0 tw:max-w-full tw:flex-wrap tw:items-center tw:justify-end tw:gap-(--layout-control-gap)">{actions}</div>}
  </div>;
}
