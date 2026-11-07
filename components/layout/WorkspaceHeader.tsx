"use client";

import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
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
  /** 왼쪽 영역은 가변 너비, 액션은 공간 부족 시 다음 줄로 배치한다. */
  fluidLeading?: boolean;
}

const useStyles = makeStyles({
  menu: {
    display: "none", flexShrink: 0, width: "40px", minWidth: "40px", height: "40px", padding: 0,
    backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.controlRadius,
    ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "2px" },
    "@media (max-width: 760px)": { display: "inline-flex" },
  },
  fluidLeadingGroup: {
    display: "flex", alignItems: "center", flexWrap: "nowrap", gap: "var(--layout-control-gap)",
    // 필드 너비가 아니라 액션을 다음 줄로 보낼 때의 왼쪽 묶음 선호 너비다.
    flex: "1 1 20rem", minWidth: 0, maxWidth: "100%",
  },
  fluidActions: { flex: "0 0 auto", maxWidth: "100%" },
});

export default function WorkspaceHeader({
  title, showTitle = false, leading, actions,
  headingId, headingRef, headerRef, sticky = false, className, fluidLeading = false,
}: WorkspaceHeaderProps): React.ReactElement {
  const styles = useStyles();
  const navigation = useWorkspaceNavigation();
  const id = useId();
  const hasToolbar = Boolean(showTitle || leading || actions);
  const heading = <h1 id={headingId ?? id + "-title"} ref={headingRef} tabIndex={headingRef ? -1 : undefined}
    className={showTitle ? "tw:m-0 tw:min-w-0 tw:break-words tw:text-[16px] tw:leading-6 tw:font-bold" : "tw:sr-only"}>{title}</h1>;
  const leadingContent = <>
    {navigation && <DadamThemeScope><Button type="button" className={styles.menu}
      id={navigation.triggerId} icon={<NavigationRegular />}
      aria-label={navigation.menuOpen ? "메뉴 닫기" : "메뉴 열기"}
      aria-controls={navigation.sidebarId} aria-expanded={navigation.menuOpen}
      onClick={navigation.toggleMenu} /></DadamThemeScope>}
    {leading}
    {showTitle && heading}
  </>;

  return <>
    {!showTitle && heading}
    {(hasToolbar || navigation) && <header ref={headerRef} data-workspace-header className={
      "tw:min-w-0 tw:flex-col tw:gap-(--layout-control-gap) " +
      (hasToolbar ? "tw:flex" : "tw:hidden tw:[@media(max-width:760px)]:flex") +
      (sticky ? " tw:sticky tw:top-0 tw:z-10 tw:bg-(--kpc-bg)" : "") +
      (className ? " " + className : "")
    }>
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
        {fluidLeading ? <div className={styles.fluidLeadingGroup}>{leadingContent}</div> : leadingContent}
        {actions && <div className={mergeClasses("tw:ml-auto tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)", fluidLeading && styles.fluidActions)}>{actions}</div>}
      </div>
    </header>}
  </>;
}
