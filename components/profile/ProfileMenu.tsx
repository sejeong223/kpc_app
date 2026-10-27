"use client";

import {
  Avatar, Badge, Button, makeStyles, mergeClasses, shorthands,
  Popover, PopoverSurface, PopoverTrigger, Tab, TabList,
} from "@fluentui/react-components";
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
    width: "181.141px", minWidth: "181.141px", maxWidth: "181.141px", height: "49px",
    boxSizing: "border-box", flexShrink: 0, padding: "7px 9px",
    border: "1px solid #e3e5e9", borderRadius: "10px", backgroundColor: "#fff",
    color: "#22252b", textAlign: "left", fontFamily: "inherit",
    ":hover": { backgroundColor: "#fff", ...shorthands.borderColor("#cfd0d6") },
    ":hover:active": { backgroundColor: "#f7f8fa" },
  },
  collapsed: {
    "@media (min-width: 761px)": {
      width: "48px", minWidth: "48px", maxWidth: "48px", columnGap: 0,
      "& [data-profile-trigger-label]": { display: "none" },
    },
  },
  avatarWrap: { position: "relative", display: "flex", flexShrink: 0 },
  avatar: { backgroundColor: "#414141", color: "#fff" },
  adminAvatar: { backgroundColor: "#e60012" },
  dot: {
    position: "absolute", top: "-2px", right: "-2px", width: "10px", height: "10px",
    borderRadius: "50%", backgroundColor: "#e60012", boxShadow: "0 0 0 2px #fff",
  },
  account: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", rowGap: "3px" },
  accountLine: { display: "flex", alignItems: "center", columnGap: "6px", minWidth: 0 },
  name: {
    minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    color: "#22252b", fontSize: "12px", lineHeight: "15px", fontWeight: 700,
  },
  badge: {
    flexShrink: 0, height: "11px", minWidth: 0, padding: "1px 6px", borderRadius: "3px",
    fontSize: "9px", lineHeight: "9px", fontWeight: 700, backgroundColor: "#faf0f1", color: "#9b3a46",
  },
  department: { color: "#22252b", fontSize: "10px", lineHeight: "10px" },
  chevron: { width: "14px", height: "14px", marginLeft: "auto", flexShrink: 0 },
  surface: {
    width: "min(348px, calc(100vw - 16px))", minWidth: 0,
    height: "min(620px, calc(100svh - 86px))", maxHeight: "min(620px, calc(100svh - 86px))",
    boxSizing: "border-box", padding: 0, display: "flex", flexDirection: "column", overflow: "hidden",
    backgroundColor: "#fff", color: "#161616", border: "1px solid #e6e7eb", borderRadius: "14px",
    boxShadow: "0 12px 40px rgba(15,23,42,.16),0 2px 6px rgba(15,23,42,.06)",
    fontFamily: "inherit", textAlign: "left", zIndex: 50,
  },
  header: { display: "flex", alignItems: "flex-start", gap: "11px", padding: "16px 14px 12px 16px", flexShrink: 0 },
  headerAvatar: { backgroundColor: "#303238", color: "#fff", fontSize: "15px", fontWeight: 850 },
  identity: { flex: 1, minWidth: 0 },
  identityLine: { display: "flex", alignItems: "center", gap: "6px", minWidth: 0 },
  headerName: { fontSize: "14px", lineHeight: "21px", fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  role: {
    display: "inline-flex", alignItems: "center", height: "19px", flexShrink: 0,
    padding: "0 7px", borderRadius: "5px", fontSize: "10px", fontWeight: 800,
    backgroundColor: "#f2f3f5", color: "#55585f", whiteSpace: "nowrap",
  },
  adminRole: { backgroundColor: "#fff0f2", color: "#c91c2b" },
  meta: { margin: 0, fontSize: "11px", lineHeight: "16px", color: "#74747d" },
  mail: { fontSize: "10.5px", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  close: { width: "32px", minWidth: "32px", height: "32px", padding: 0, color: "#55585f", borderRadius: "8px" },
  tabs: { display: "flex", padding: "0 8px", flexShrink: 0, borderBottom: "1px solid #eff0f3" },
  tab: {
    display: "inline-flex", flex: 1, justifyContent: "center", minWidth: 0,
    height: "38px", padding: "0 4px", borderRadius: 0, borderBottom: "2px solid transparent",
    color: "#74747d", fontFamily: "inherit",
    "::before": { display: "none" }, "::after": { display: "none" },
    ":hover": { color: "#34363c" },
  },
  activeTab: { color: "#c91c2b", borderBottomColor: "#d7192f", ":hover": { color: "#c91c2b" } },
  tabContent: { display: "inline-flex", alignItems: "center", gap: "5px", color: "inherit", fontSize: "12px", fontWeight: 750, whiteSpace: "nowrap" },
  count: { minWidth: "17px", height: "17px", padding: "0 5px", borderRadius: "9px", backgroundColor: "#d7192f", color: "#fff", fontSize: "10px", fontWeight: 800 },
  body: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 14px", backgroundColor: "#fafbfc" },
  notice: { marginTop: "12px", padding: "8px 10px", border: "1px solid #f3c7cd", borderRadius: "8px", color: "#9b3a46", backgroundColor: "#fff8f9", fontSize: "11px", lineHeight: "16px" },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexShrink: 0, padding: "8px 10px 8px 16px", borderTop: "1px solid #eff0f3", backgroundColor: "#fff" },
  version: { fontSize: "10px", color: "#74747d" },
  logout: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 0, height: "22px", padding: "0 7px", border: 0, borderRadius: "6px", backgroundColor: "transparent", color: "#34363c", fontSize: "10.5px", fontWeight: 700, textDecorationLine: "none", ":hover": { backgroundColor: "#f0f1f3" } },
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
  const isAdmin = profile.role === "admin";
  const roleLabel = isAdmin ? "관리자" : "일반 사용자";
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
            <Avatar name={profile.name} initials={profile.name.slice(0, 1)} size={28} className={mergeClasses(styles.avatar, isAdmin && styles.adminAvatar)} aria-hidden="true" />
            <span className={styles.dot} aria-hidden="true" />
          </span>
          <span className={styles.account} data-profile-trigger-label>
            <span className={styles.accountLine}>
              <strong className={styles.name} title={profile.name}>{profile.name}</strong>
              <Badge className={styles.badge} appearance="tint" size="small">{roleLabel}</Badge>
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
          <Avatar name={profile.name} initials={profile.name.slice(0, 1)} size={40} className={styles.headerAvatar} aria-hidden="true" />
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
