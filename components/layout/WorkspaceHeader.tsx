"use client";

import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { NavigationRegular } from "@fluentui/react-icons";
import { useId, useState } from "react";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { useWorkspaceNavigation } from "./WorkspaceNavigation";
import type { WorkspacePageProps } from "./WorkspacePage";

export interface WorkspaceHeaderProps extends Pick<WorkspacePageProps,
  "title" | "description" | "dataNotice" | "dataNoticeSummary" |
  "leading" | "actions" | "headingId" | "headingRef"> {
  headerRef?: React.Ref<HTMLElement>;
  sticky?: boolean;
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
  title, description, dataNotice, dataNoticeSummary, leading, actions,
  headingId, headingRef, headerRef, sticky = false,
}: WorkspaceHeaderProps): React.ReactElement {
  const styles = useStyles();
  const navigation = useWorkspaceNavigation();
  const id = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  const extendedNotice = dataNotice && dataNoticeSummary && dataNotice !== dataNoticeSummary ? dataNotice : null;
  const hasHelp = Boolean(description || extendedNotice);

  return <header ref={headerRef} data-workspace-header className={
    "tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-control-gap)" +
    (sticky ? " tw:sticky tw:top-0 tw:z-10 tw:bg-(--kpc-bg)" : "")
  }>
    <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
      {navigation && <DadamThemeScope><Button type="button" className={styles.menu}
        id={navigation.triggerId} icon={<NavigationRegular />}
        aria-label={navigation.menuOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-controls={navigation.sidebarId} aria-expanded={navigation.menuOpen}
        onClick={navigation.toggleMenu} /></DadamThemeScope>}
      {leading}
      <h1 id={headingId ?? id + "-title"} ref={headingRef} tabIndex={headingRef ? -1 : undefined}
        className="tw:m-0 tw:min-w-0 tw:break-words tw:text-[16px] tw:leading-6 tw:font-bold">{title}</h1>
      {dataNotice && <span className="tw:text-[11px] tw:text-(--kpc-muted)">{dataNoticeSummary || dataNotice}</span>}
      {hasHelp && <Button type="button" size="small" appearance="subtle"
        aria-expanded={helpOpen} aria-controls={id + "-help"}
        onClick={() => setHelpOpen(open => !open)}>화면 안내</Button>}
      {actions && <div className="tw:ml-auto tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">{actions}</div>}
    </div>
    {hasHelp && helpOpen && <div id={id + "-help"} className="tw:flex tw:flex-col tw:gap-(--layout-inline-gap) tw:text-[12px] tw:text-(--kpc-secondary)">
      {description && <p className="tw:m-0">{description}</p>}
      {extendedNotice && <p className="tw:m-0">{extendedNotice}</p>}
    </div>}
  </header>;
}
