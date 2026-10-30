"use client";
import { ADMIN_ROLE_LABELS } from "@/config/admin-permissions";

import {
  Avatar, Badge, Button, makeStyles, tokens, mergeClasses, shorthands, tabClassNames,
  Popover, PopoverSurface, PopoverTrigger, Tab, TabList,
} from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { ChevronDownRegular, ChevronUpRegular, DismissRegular } from "@fluentui/react-icons";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { useAuthRuntime } from "@/components/providers";
import type { ProfileTab } from "@/config/profile-preview";
import type { TokenDialogView } from "@/config/token-preview";
import { getUnreadNotificationCount } from "@/lib/profile-preview";

import ProfileGeneralTab from "./ProfileGeneralTab";
import ProfileNotificationsTab from "./ProfileNotificationsTab";
import ProfilePreferencesTab from "./ProfilePreferencesTab";
import { useProfilePreview } from "./ProfilePreviewProvider";

export interface ProfileMenuProps {
  isCollapsed: boolean;
  onNavigate(): void;
}

export interface ProfileActionPanelProps {
  onNavigate(): void;
  onNotice(message: string): void;
  onOpenTokenDialog(view: TokenDialogView): void;
}

const tabs: readonly { value: ProfileTab; label: string }[] = [
  { value: "general", label: "일반" },
  { value: "notifications", label: "업무 알림" },
  { value: "preferences", label: "환경 설정" },
];

const useStyles = makeStyles({
  trigger: {
    display: "flex", alignItems: "center", columnGap: "8px",
    width: "100%", minWidth: 0, maxWidth: "100%", minHeight: "49px", height: "auto",
    boxSizing: "border-box", flexShrink: 0, padding: "7px 9px",
    border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.controlRadius, backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1, textAlign: "left", fontFamily: tokens.fontFamilyBase,
    ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover, ...shorthands.borderColor(tokens.colorNeutralStroke1) },
    ":hover:active": { backgroundColor: tokens.colorNeutralBackground3 },
    ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "2px" },
  },
  collapsed: {
    "@media (min-width: 761px)": {
      width: "100%", minWidth: 0, maxWidth: "100%", columnGap: 0,
      justifyContent: "center", padding: "7px 0",
      "& [data-profile-trigger-label]": { display: "none" },
    },
  },
  avatarWrap: { position: "relative", display: "flex", flexShrink: 0 },
  avatar: { backgroundColor: tokens.colorNeutralForeground2, color: tokens.colorNeutralForegroundOnBrand, fontFamily: tokens.fontFamilyBase, fontSize: "12px", fontWeight: 700 },
  adminAvatar: { backgroundColor: tokens.colorBrandBackground },
  avatarFace: { backgroundColor: "inherit", color: "inherit", border: 0, fontSize: "inherit", fontWeight: "inherit" },
  dot: {
    position: "absolute", top: "-2px", right: "-2px", width: "10px", height: "10px",
    borderRadius: "50%", backgroundColor: tokens.colorBrandBackground, boxShadow: `0 0 0 2px ${tokens.colorNeutralBackground1}`,
  },
  account: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", rowGap: "3px" },
  accountLine: { display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: "6px", rowGap: "2px", minWidth: 0 },
  name: {
    minWidth: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    color: tokens.colorNeutralForeground1, fontSize: "12px", lineHeight: "16px", fontWeight: 400,
  },
  badge: {
    flexShrink: 0, height: "16px", minWidth: 0, padding: "0 4px", borderRadius: "3px",
    fontFamily: tokens.fontFamilyBase, fontSize: "10px", lineHeight: "12px", fontWeight: 500,
    backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground2,
  },
  adminBadge: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2, ...shorthands.borderColor(tokens.colorBrandStroke1) },
  department: {
    color: tokens.colorNeutralForeground3, fontSize: "11px", lineHeight: "14px", fontWeight: 400,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  chevron: { width: "14px", height: "14px", marginLeft: "auto", flexShrink: 0 },
  surface: {
    width: "min(348px, calc(100vw - 16px))", minWidth: 0,
    height: "min(620px, calc(100svh - 86px))", maxHeight: "min(620px, calc(100svh - 86px))",
    boxSizing: "border-box", padding: 0, display: "flex", flexDirection: "column", overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.surfaceRadius,
    boxShadow: dadamUi.popoverShadow,
    fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 400, textAlign: "left", zIndex: 50,
  },
  header: { display: "flex", alignItems: "flex-start", gap: "11px", padding: "16px 14px 12px 16px", flexShrink: 0 },
  headerAvatar: { backgroundColor: tokens.colorNeutralForeground2, color: tokens.colorNeutralForegroundOnBrand, fontFamily: tokens.fontFamilyBase, fontSize: "15px", fontWeight: 700 },
  identity: { flex: 1, minWidth: 0 },
  identityLine: { display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: "6px", rowGap: "4px", minWidth: 0 },
  headerName: { fontSize: dadamUi.titleSize, lineHeight: dadamUi.titleLineHeight, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  role: {
    display: "inline-flex", alignItems: "center", height: "19px", flexShrink: 0,
    padding: "0 7px", borderRadius: dadamUi.controlRadius, fontSize: "10px", lineHeight: "12px", fontWeight: 500,
    backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground2, whiteSpace: "nowrap",
  },
  adminRole: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
  meta: { margin: 0, fontSize: dadamUi.metaSize, lineHeight: "16px", color: tokens.colorNeutralForeground3 },
  mail: { marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  close: { width: "32px", minWidth: "32px", height: "32px", padding: 0, color: tokens.colorNeutralForeground2, borderRadius: dadamUi.controlRadius },
  tabs: { display: "flex", padding: "0 8px", flexShrink: 0, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  tab: {
    // Fluent overlays visible and reserved label slots in the same grid cell.
    display: "grid", flex: 1, gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "center", justifyContent: "center", justifyItems: "center", minWidth: 0,
    height: "38px", padding: "0 4px", borderRadius: 0, borderBottom: "2px solid transparent",
    color: tokens.colorNeutralForeground3, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 500,
    [`& .${tabClassNames.content}`]: { color: tokens.colorNeutralForeground3 },
    [`:enabled:hover .${tabClassNames.content}`]: { color: tokens.colorNeutralForeground1 },
    [`:enabled:active .${tabClassNames.content}`]: { color: tokens.colorNeutralForeground1 },
    "::before": { display: "none" }, "::after": { display: "none" },
    ":hover": { color: tokens.colorNeutralForeground1 },
  },
  activeTab: {
    color: tokens.colorBrandForeground1, fontWeight: 700, borderBottomColor: tokens.colorBrandStroke1, ":hover": { color: tokens.colorBrandForeground1, fontWeight: 700 },
    [`& .${tabClassNames.content}`]: { color: tokens.colorBrandForeground1, fontWeight: 700 },
    [`:enabled:hover .${tabClassNames.content}`]: { color: tokens.colorBrandForeground1, fontWeight: 700 },
    [`:enabled:active .${tabClassNames.content}`]: { color: tokens.colorBrandForeground1, fontWeight: 700 },
  },
  tabContent: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", gap: "5px", color: "inherit", fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: "inherit", whiteSpace: "nowrap" },
  count: { minWidth: "17px", height: "17px", padding: "0 5px", borderRadius: "9px", backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, fontSize: "10px", lineHeight: "12px", fontWeight: 700 },
  body: {
    flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 14px", backgroundColor: tokens.colorNeutralBackground2,
    scrollbarWidth: "none",
    "::-webkit-scrollbar": { display: "none" },
  },
  notice: { marginTop: "12px", padding: "8px 10px", border: `1px solid ${tokens.colorBrandStroke1}`, borderRadius: dadamUi.cardRadius, color: tokens.colorBrandForeground2, backgroundColor: tokens.colorBrandBackground2, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexShrink: 0, padding: "8px 10px 8px 16px", borderTop: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1 },
  version: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3 },
  logout: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 0, minHeight: dadamUi.smallControlHeight, height: "auto", padding: "0 7px", border: 0, borderRadius: dadamUi.controlRadius, backgroundColor: "transparent", color: tokens.colorNeutralForeground2, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500, textDecorationLine: "none", ":hover": { backgroundColor: tokens.colorNeutralBackground2Hover } },
});

export default function ProfileMenu({ isCollapsed, onNavigate }: ProfileMenuProps): React.ReactElement {
  const styles = useStyles();
  const { authEnabled, session } = useAuthRuntime();
  const { profile, state, dispatch, openTokenDialog } = useProfilePreview();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalFrame = useRef<number | null>(null);
  useEffect(() => () => {
    if (modalFrame.current !== null) cancelAnimationFrame(modalFrame.current);
  }, []);
  const id = useId();
  const unread = getUnreadNotificationCount(state.notifications);
  const isAdmin = profile.role !== "user";
  const roleLabel = ADMIN_ROLE_LABELS[profile.role];
  const activeTab = state.selectedTab;

  const closeAndFocus = () => {
    setOpen(false);
    setNotice(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const navigate = () => { setOpen(false); setNotice(null); onNavigate(); };
  const onNotice = (message: string) => setNotice(message || null);
  const openTokenModal = (view: TokenDialogView) => {
    setOpen(false);
    setNotice(null);
    const trigger = triggerRef.current;
    if (modalFrame.current !== null) cancelAnimationFrame(modalFrame.current);
    modalFrame.current = requestAnimationFrame(() => {
      modalFrame.current = null;
      openTokenDialog(view, trigger);
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(_, data) => { setOpen(data.open); setNotice(null); }}
      inline
      trapFocus
      withArrow={false}
      positioning={{ position: "above", align: "start", offset: 8 }}
    >
      <PopoverTrigger disableButtonEnhancement>
        <Button
          ref={triggerRef}
          appearance="transparent"
          className={mergeClasses(styles.trigger, isCollapsed && styles.collapsed)}
          aria-label="사용자 프로필"
          aria-haspopup="dialog"
          aria-controls={open ? `${id}-popover` : undefined}
          data-sidebar-profile
        >
          <span className={styles.avatarWrap}>
            <Avatar name={profile.name} initials={{ children: profile.name.slice(0, 1), className: styles.avatarFace }} size={28} className={mergeClasses(styles.avatar, isAdmin && styles.adminAvatar)} aria-hidden="true" />
            <span className={styles.dot} aria-hidden="true" />
          </span>
          <span className={styles.account} data-profile-trigger-label>
            <span className={styles.accountLine}>
              <strong className={styles.name} title={profile.name}>{profile.name}</strong>
              <Badge className={mergeClasses(styles.badge, isAdmin && styles.adminBadge)} appearance="tint" size="small">{roleLabel}</Badge>
            </span>
            <span className={styles.department}>{profile.department ?? profile.organization}</span>
          </span>
          {open ? <ChevronDownRegular className={styles.chevron} aria-hidden="true" data-profile-trigger-label /> : <ChevronUpRegular className={styles.chevron} aria-hidden="true" data-profile-trigger-label />}
        </Button>
      </PopoverTrigger>
      <PopoverSurface
        className={styles.surface}
        id={`${id}-popover`}
        role="dialog"
        aria-label="프로필 메뉴"
        data-profile-popover={open ? "" : undefined}
        onKeyDownCapture={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          closeAndFocus();
        }}
      >
        <header className={styles.header}>
          <Avatar name={profile.name} initials={{ children: profile.name.slice(0, 1), className: styles.avatarFace }} size={40} className={styles.headerAvatar} aria-hidden="true" />
          <div className={styles.identity}>
            <div className={styles.identityLine}>
              <strong className={styles.headerName} title={profile.name}>{profile.name}</strong>
              <span className={mergeClasses(styles.role, isAdmin && styles.adminRole)}>{roleLabel}</span>
            </div>
            <p className={styles.meta}>{[profile.department, profile.organization].filter(Boolean).join(" · ")}</p>
            {profile.email && <p className={mergeClasses(styles.meta, styles.mail)} title={profile.email}>{profile.email}</p>}
          </div>
          <Button appearance="subtle" className={styles.close} icon={<DismissRegular />} aria-label="프로필 메뉴 닫기" onClick={closeAndFocus} />
        </header>
        <TabList
          aria-label="프로필 메뉴 탭"
          appearance="transparent"
          selectedValue={activeTab}
          className={styles.tabs}
          onTabSelect={(_, data) => {
            const tab = tabs.find((item) => item.value === data.value);
            if (tab) { dispatch({ type: "set-tab", tab: tab.value }); setNotice(null); }
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value} value={tab.value} id={`${id}-tab-${tab.value}`} aria-controls={`${id}-panel-${tab.value}`}
              className={mergeClasses(styles.tab, activeTab === tab.value && styles.activeTab)} content={{ className: styles.tabContent }}
            >
              {tab.label}
              {tab.value === "notifications" && unread > 0 && <Badge className={styles.count} aria-label={`안 읽은 알림 ${unread}개`}>{unread}</Badge>}
            </Tab>
          ))}
        </TabList>
        <div className={styles.body} role="tabpanel" id={`${id}-panel-${activeTab}`} aria-labelledby={`${id}-tab-${activeTab}`}>
          {activeTab === "general" && <ProfileGeneralTab onNavigate={navigate} onNotice={onNotice} onOpenTokenDialog={openTokenModal} />}
          {activeTab === "notifications" && <ProfileNotificationsTab onNavigate={navigate} onNotice={onNotice} onOpenTokenDialog={openTokenModal} />}
          {activeTab === "preferences" && <ProfilePreferencesTab onNotice={onNotice} />}
          {notice && <div className={styles.notice} role="status" aria-live="polite">{notice}</div>}
        </div>
        <footer className={styles.footer}>
          <span className={styles.version}>KPC 제안서 작성 AI v2.4</span>
          {authEnabled ? session && <Link href="/auth/logout" className={styles.logout} onClick={navigate}>로그아웃</Link> : (
            <Button appearance="subtle" className={styles.logout} onClick={() => onNotice("로그아웃 기능은 로그인 연결 후 사용할 수 있습니다.")}>로그아웃</Button>
          )}
        </footer>
      </PopoverSurface>
    </Popover>
  );
}
