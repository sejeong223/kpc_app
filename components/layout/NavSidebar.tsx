"use client";

import {
  Button,
  Divider,
  makeStyles,
  mergeClasses,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  AppsRegular,
  ArrowUploadRegular,
  ClipboardBulletListLtrRegular,
  DataBarVerticalRegular,
  DismissRegular,
  DocumentAddRegular,
  DocumentCheckmarkRegular,
  EditRegular,
  EyeRegular,
  HistoryRegular,
  MoneyRegular,
  PeopleRegular,
  SearchRegular,
  SettingsRegular,
  ShieldRegular,
  SlideLayoutRegular,
  SparkleRegular,
  TextBulletListLtrRegular,
} from "@fluentui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { useAuthRuntime } from "@/components/providers";
import { useProjectHeader } from "@/components/common/ProjectHeaderProvider";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import ProfileMenu from "@/components/profile/ProfileMenu";
import { getVisibleSidebarGroups, type SidebarIcon } from "@/config/sidebar";
import { dadamUi } from "@/lib/ui/dadam-theme";

const icons = {
  "document-add": DocumentAddRegular,
  clipboard: ClipboardBulletListLtrRegular,
  analysis: SearchRegular,
  upload: ArrowUploadRegular,
  list: TextBulletListLtrRegular,
  settings: SettingsRegular,
  edit: EditRegular,
  review: EyeRegular,
  completed: DocumentCheckmarkRegular,
  prompts: SparkleRegular,
  skills: AppsRegular,
  template: SlideLayoutRegular,
  policy: ShieldRegular,
  tokens: MoneyRegular,
  users: PeopleRegular,
  dashboard: DataBarVerticalRegular,
  history: HistoryRegular,
} satisfies Record<SidebarIcon, typeof DocumentAddRegular>;

const groupLabels = {
  proposal: "제안 메뉴",
  project: "프로젝트 메뉴",
  admin: "관리자 메뉴",
};

function CollapseIcon({ size = 18 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="4" x2="8" y2="20" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.5 8.5l-4 3.5 4 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandIcon({ size = 18 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="16" y1="4" x2="16" y2="20" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 8.5l4 3.5-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const useStyles = makeStyles({
  root: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    width: "var(--nav-sidebar-width, 200px)",
    height: "100dvh",
    boxSizing: "border-box",
    paddingTop: "16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStrokeSubtle}`,
    color: tokens.colorNeutralForeground1,
    "@media (max-width: 760px)": {
      width: "280px",
      maxWidth: "calc(100vw - 32px)",
      transform: "translateX(-100%)",
      visibility: "hidden",
      transitionProperty: "transform, visibility",
      transitionDuration: "180ms",
      transitionTimingFunction: "ease",
    },
  },
  open: {
    "@media (max-width: 760px)": {
      transform: "translateX(0)",
      visibility: "visible",
    },
  },
  collapsed: {
    "@media (min-width: 761px)": {
      "& [data-sidebar-label]": { display: "none" },
      // Dadam's collapsed header occupies only the 28px toggle row.
      "& [data-sidebar-header]": {
        height: "28px",
        minHeight: "28px",
        padding: "0 8px",
        justifyContent: "center",
        gap: 0,
      },
      "& nav": { padding: "0 8px 8px" },
      "& [data-sidebar-group]": { alignItems: "stretch", rowGap: "4px", padding: 0 },
      "& [data-sidebar-link]": {
        justifyContent: "center",
        width: "100%",
        minHeight: "40px",
        height: "auto",
        padding: "10px 0",
        borderLeftWidth: 0,
        columnGap: 0,
      },
      '& [data-sidebar-link][aria-current="page"]': {
        padding: "10px",
        borderLeftWidth: 0,
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorBrandForeground1,
        boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}`,
        transform: "scale(1.06)",
        ":hover": { backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorBrandForeground1 },
      },
      "& [data-sidebar-divider]": { margin: "10px 0", paddingRight: 0 },
      "& [data-sidebar-footer]": { padding: "12px 8px" },
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4px",
    flexShrink: 0,
    height: "auto",
    minHeight: "52px",
    padding: "8px 12px 16px 22px",
  },
  brand: {
    minWidth: 0,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 500,
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textDecorationLine: "none",
  },
  toggle: {
    width: "28px",
    minWidth: "28px",
    height: "28px",
    padding: 0,
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
    "@media (max-width: 760px)": { display: "none" },
  },
  mobileClose: {
    display: "none",
    width: "28px",
    minWidth: "28px",
    height: "28px",
    padding: 0,
    flexShrink: 0,
    "& svg": { width: "18px", height: "18px" },
    color: tokens.colorNeutralForeground2,
    "@media (max-width: 760px)": { display: "inline-flex" },
  },
  navigation: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    marginTop: "12px",
    padding: "0 12px 8px",
    scrollbarWidth: "thin",
    scrollbarColor: `${tokens.colorNeutralStroke1} ${tokens.colorNeutralBackground2}`,
  },
  group: { display: "flex", flexDirection: "column", alignItems: "stretch", rowGap: "4px", padding: "0 6px" },
  link: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    width: "100%",
    minWidth: 0,
    minHeight: "40px",
    height: "auto",
    padding: "10px 12px",
    columnGap: "10px",
    borderRadius: dadamUi.controlRadius,
    borderLeft: "3px solid transparent",
    boxSizing: "border-box",
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyBase,
    fontSize: dadamUi.bodySize,
    lineHeight: dadamUi.bodyLineHeight,
    fontWeight: 400,
    letterSpacing: 0,
    textAlign: "left",
    textDecorationLine: "none",
    whiteSpace: "nowrap",
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover, color: tokens.colorNeutralForeground1 },
    ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "-2px" },
    "@media (forced-colors: active)": { ":focus-visible": { outlineColor: "Highlight" } },
  },
  active: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorBrandForeground1,
    fontWeight: 700,
    borderLeftColor: tokens.colorBrandStroke1,
    boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}`,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground3,
      color: tokens.colorBrandForeground1,
    },
  },
  icon: { display: "block", width: "20px", height: "20px", flexShrink: 0 },
  label: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    fontWeight: "inherit",
  },
  divider: {
    flexGrow: 0,
    width: "auto",
    minHeight: "1px",
    margin: "10px 6px",
    paddingRight: 0,
    "::before": { borderTopColor: tokens.colorNeutralStroke2 },
    "::after": { borderTopColor: tokens.colorNeutralStroke2 },
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    flexShrink: 0,
    width: "100%",
    rowGap: 0,
    padding: "12px",
    borderTop: `1px solid ${tokens.colorNeutralStrokeSubtle}`,
  },
});

interface NavSidebarProps {
  id: string;
  isOpen: boolean;
  isCollapsed: boolean;
  onNavigate(): void;
  onCollapseToggle(): void;
  onClose(): void;
}

export default function NavSidebar({
  id,
  isOpen,
  isCollapsed,
  onNavigate,
  onCollapseToggle,
  onClose,
}: NavSidebarProps): React.ReactElement {
  const styles = useStyles();
  const { authEnabled, session } = useAuthRuntime();
  const { state } = useProfilePreview();
  const { isPm } = useProjectHeader();
  const pathname = usePathname();
  const groups = getVisibleSidebarGroups({
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
    previewRole: state.previewRole,
    isProjectPm: isPm,
  });
  const navId = `${id}-navigation`;

  return (
    <aside
      id={id}
      aria-label="제안서 메뉴"
      role={isOpen ? "dialog" : undefined}
      aria-modal={isOpen || undefined}
      className={mergeClasses(styles.root, isOpen && styles.open, isCollapsed && styles.collapsed)}
    >
      <div className={styles.header} data-sidebar-header>
        <Link href="/" className={styles.brand} title="KPC | 제안서 AI" data-sidebar-label onClick={onNavigate}>
          KPC | 제안서 AI
        </Link>
        <Button
          className={styles.toggle}
          appearance="subtle"
          icon={isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
          aria-label={isCollapsed ? "왼쪽 메뉴 펼치기" : "왼쪽 메뉴 접기"}
          aria-expanded={!isCollapsed}
          aria-controls={navId}
          onClick={onCollapseToggle}
        />
        <Button
          className={styles.mobileClose}
          appearance="subtle"
          icon={<DismissRegular />}
          aria-label="메뉴 닫기"
          onClick={onClose}
          data-sidebar-close
        />
      </div>
      <nav id={navId} className={styles.navigation} aria-label="주 메뉴">
        {groups.map((group, index) => (
          <Fragment key={group.id}>
            {index > 0 && <Divider className={styles.divider} data-sidebar-divider />}
            <div className={styles.group} role="group" aria-label={groupLabels[group.id]} data-sidebar-group>
              {group.items.map((item) => {
                const Icon = icons[item.icon];
                const active = pathname === item.href;
                const link = (
                  <Link
                    href={item.href}
                    className={mergeClasses(styles.link, active && styles.active)}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    data-sidebar-link
                  >
                    <Icon className={styles.icon} aria-hidden="true" data-sidebar-icon />
                    <span className={styles.label} data-sidebar-label>{item.label}</span>
                  </Link>
                );
                return isCollapsed ? (
                  <Tooltip key={item.id} content={item.label} relationship="description" positioning="after" withArrow>
                    {link}
                  </Tooltip>
                ) : <Fragment key={item.id}>{link}</Fragment>;
              })}
            </div>
          </Fragment>
        ))}
      </nav>
      <div className={styles.footer} data-sidebar-footer>
        <ProfileMenu key={`${pathname}:${isOpen}:${isCollapsed}`} isCollapsed={isCollapsed} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}
