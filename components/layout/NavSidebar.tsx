"use client";

import {
  Avatar,
  Badge,
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
  ChevronUpRegular,
  ClipboardBulletListLtrRegular,
  DataBarVerticalRegular,
  DismissRegular,
  DocumentAddRegular,
  EditRegular,
  HistoryRegular,
  MoneyRegular,
  PeopleRegular,
  SearchRegular,
  SettingsRegular,
  ShieldRegular,
  SignOutRegular,
  SlideLayoutRegular,
  SparkleRegular,
  TextBulletListLtrRegular,
} from "@fluentui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { useAuthRuntime } from "@/components/providers";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import { getVisibleSidebarGroups, type SidebarIcon } from "@/config/sidebar";

const icons = {
  "document-add": DocumentAddRegular,
  clipboard: ClipboardBulletListLtrRegular,
  analysis: SearchRegular,
  upload: ArrowUploadRegular,
  list: TextBulletListLtrRegular,
  settings: SettingsRegular,
  edit: EditRegular,
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
    width: "var(--nav-sidebar-width, 220px)",
    height: "100svh",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    color: "#25272d",
    "@media (max-width: 760px)": {
      width: "220px",
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
      "& [data-sidebar-icon]": { display: "block" },
      "& [data-sidebar-header]": { paddingLeft: "10px", paddingRight: "10px" },
      "& nav": { padding: "8px 0" },
      "& [data-sidebar-group]": { alignItems: "center", rowGap: "4px", paddingRight: 0 },
      "& [data-sidebar-link]": {
        justifyContent: "center",
        width: "38px",
        height: "38px",
        padding: 0,
        color: "#777d89",
      },
      '& [aria-current="page"]': { color: "#c8253b" },
      "& [data-sidebar-divider]": { width: "24px", margin: "6px auto", paddingRight: 0 },
      "& [data-sidebar-profile]": {
        width: "48px",
        minWidth: "48px",
        maxWidth: "48px",
        columnGap: 0,
      },
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    height: "58px",
    padding: "0 10px 0 17px",
    borderBottom: "1px solid #e9eaef",
  },
  brand: {
    minWidth: 0,
    color: "#18191e",
    fontSize: "13px",
    fontWeight: 850,
    letterSpacing: "-0.26px",
    whiteSpace: "nowrap",
    textDecorationLine: "none",
  },
  toggle: {
    width: "34px",
    minWidth: "34px",
    height: "36px",
    padding: 0,
    flexShrink: 0,
    color: "#616773",
    "@media (max-width: 760px)": { display: "none" },
  },
  mobileClose: {
    display: "none",
    minWidth: "30px",
    padding: 0,
    "@media (max-width: 760px)": { display: "inline-flex" },
  },
  navigation: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "7px 11px 8px",
    scrollbarWidth: "thin",
    scrollbarColor: "#d6d9df #fafafa",
  },
  group: { display: "flex", flexDirection: "column", rowGap: "2px", paddingRight: "12px" },
  link: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    height: "34.5px",
    padding: "9px",
    borderRadius: "9px",
    color: "#626670",
    fontSize: "11px",
    lineHeight: "16.5px",
    fontWeight: 650,
    textDecorationLine: "none",
    whiteSpace: "nowrap",
    ":hover": { backgroundColor: "#eff0f3", color: "#34363c" },
    ":focus-visible": { outlineColor: tokens.colorBrandStroke1, outlineOffset: "-2px" },
  },
  active: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: 800,
    boxShadow: "inset 3px 0 0 #dc2036",
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2,
      color: tokens.colorBrandForeground1,
    },
  },
  icon: { display: "none", width: "18px", height: "18px", flexShrink: 0 },
  divider: {
    flexGrow: 0,
    minHeight: "1px",
    margin: "8px 0",
    paddingRight: "12px",
    "::before": { borderTopColor: "#e6e8ec" },
    "::after": { borderTopColor: "#e6e8ec" },
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    width: "100%",
    rowGap: "8px",
    padding: "12.5px 0",
  },
  profile: {
    display: "flex",
    alignItems: "center",
    columnGap: "8px",
    width: "181.141px",
    minWidth: "181.141px",
    maxWidth: "181.141px",
    height: "49px",
    boxSizing: "border-box",
    flexShrink: 0,
    padding: "7px 9px",
    border: "1px solid #e3e5e9",
    borderRadius: "10px",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  avatarWrap: { position: "relative", display: "flex", flexShrink: 0 },
  avatar: { backgroundColor: "#414141", color: "#fff" },
  adminAvatar: { backgroundColor: "#e60012" },
  dot: {
    position: "absolute",
    top: "-2px",
    right: "-2px",
    width: "10px",
    height: "10px",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: "#e60012",
    boxShadow: "0 0 0 2px #fff",
  },
  account: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", rowGap: "3px" },
  accountLine: { display: "flex", alignItems: "center", columnGap: "6px", minWidth: 0 },
  name: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#22252b",
    fontSize: "12px",
    lineHeight: "15px",
    fontWeight: 700,
  },
  badge: {
    flexShrink: 0,
    height: "11px",
    minWidth: 0,
    padding: "1px 6px",
    borderRadius: "3px",
    fontSize: "9px",
    lineHeight: "9px",
    fontWeight: 700,
    backgroundColor: "#faf0f1",
    color: "#9b3a46",
  },
  department: { color: "#22252b", fontSize: "10px", lineHeight: "10px" },
  profileChevron: { width: "14px", height: "14px", marginLeft: "auto", flexShrink: 0 },
  logout: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: "#626670",
    fontSize: "10px",
    textUnderlineOffset: "3px",
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
  const { state, profile } = useProfilePreview();
  const pathname = usePathname();
  const groups = getVisibleSidebarGroups({
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
    previewRole: state.previewRole,
  });
  const isAdmin = profile.role === "admin";
  const displayName = profile.name;
  const roleLabel = isAdmin ? "관리자" : "일반 사용자";
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
        <Link href="/" className={styles.brand} data-sidebar-label onClick={onNavigate}>
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
                    <span data-sidebar-label>{item.label}</span>
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
      <div className={styles.footer}>
        {authEnabled && session && (
          <Link href="/auth/logout" className={styles.logout} aria-label="로그아웃">
            <SignOutRegular aria-hidden="true" />
            <span data-sidebar-label>로그아웃</span>
          </Link>
        )}
        <div className={styles.profile} role="group" aria-label="사용자 프로필" data-sidebar-profile>
          <span className={styles.avatarWrap}>
            <Avatar
              name={displayName}
              initials={displayName.slice(0, 1)}
              size={28}
              className={mergeClasses(styles.avatar, isAdmin && styles.adminAvatar)}
              aria-hidden="true"
            />
            <span className={styles.dot} aria-hidden="true" />
          </span>
          <div className={styles.account} data-sidebar-label>
            <div className={styles.accountLine}>
              <strong className={styles.name} title={displayName}>{displayName}</strong>
              <Badge className={styles.badge} appearance="tint" size="small">{roleLabel}</Badge>
            </div>
            <span className={styles.department}>{profile.department ?? profile.organization}</span>
          </div>
          <ChevronUpRegular className={styles.profileChevron} aria-hidden="true" data-sidebar-label />
        </div>
      </div>
    </aside>
  );
}
