"use client";

import { makeStyles, tokens } from "@fluentui/react-components";
import { DadamButton as Button } from "@/components/ui/DadamControls";
import { NavigationRegular } from "@fluentui/react-icons";
import { useId } from "react";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { useWorkspaceNavigation } from "./WorkspaceNavigation";
import type { WorkspacePageProps } from "./WorkspacePage";

export interface WorkspaceHeaderProps extends Pick<WorkspacePageProps,
  "title" | "showTitle" | "leading" | "actions" | "headingId" | "headingRef"> {
  headerRef?: React.Ref<HTMLElement>;
  sticky?: boolean;
  className?: string;
}

const useStyles = makeStyles({
  menu: {
    display: "none", flexShrink: 0, width: "40px", minWidth: "40px", height: "40px", padding: 0,
    backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.controlRadius,
    ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "2px" },
    "@media (max-width: 760px)": { display: "inline-flex" },
  },
});

export default function WorkspaceHeader({
  title, showTitle = false, leading, actions,
  headingId, headingRef, headerRef, sticky = false, className,
}: WorkspaceHeaderProps): React.ReactElement {
  const styles = useStyles();
  const navigation = useWorkspaceNavigation();
  const id = useId();
  const hasToolbar = Boolean(showTitle || leading || actions);
  const heading = <h1 id={headingId ?? id + "-title"} ref={headingRef} tabIndex={headingRef ? -1 : undefined}
    className={showTitle ? "tw:m-0 tw:min-w-0 tw:break-words tw:text-[16px] tw:leading-6 tw:font-bold" : "tw:sr-only"}>{title}</h1>;

  return <>
    {!showTitle && heading}
    {(hasToolbar || navigation) && <header ref={headerRef} data-workspace-header className={
      "tw:min-w-0 tw:flex-col tw:gap-(--layout-control-gap) " +
      (hasToolbar ? "tw:flex" : "tw:hidden tw:[@media(max-width:760px)]:flex") +
      (sticky ? " tw:sticky tw:top-0 tw:z-10 tw:bg-(--kpc-bg)" : "") +
      (className ? " " + className : "")
    }>
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
        {navigation && <DadamThemeScope><Button type="button" className={styles.menu}
          id={navigation.triggerId} icon={<NavigationRegular />}
          aria-label={navigation.menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-controls={navigation.sidebarId} aria-expanded={navigation.menuOpen}
          onClick={navigation.toggleMenu} /></DadamThemeScope>}
        {leading}
        {showTitle && heading}
        {actions && <div className="tw:ml-auto tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">{actions}</div>}
      </div>
    </header>}
  </>;
}
