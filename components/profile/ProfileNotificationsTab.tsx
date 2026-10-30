"use client";

import { Button, makeStyles, tokens, mergeClasses, shorthands } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { HistoryRegular, MoneyRegular, SparkleRegular, TextBulletListLtrRegular } from "@fluentui/react-icons";
import Link from "next/link";
import { useId } from "react";

import SegmentedControl from "@/components/ui/SegmentedControl";
import type { NotificationFilter } from "@/config/profile-preview";
import { getSidebarItemByScreen } from "@/config/sidebar";
import { getUnreadNotificationCount, getVisibleProfileNotifications } from "@/lib/profile-preview";

import type { ProfileActionPanelProps } from "./ProfileMenu";
import { useProfilePreview } from "./ProfilePreviewProvider";

const icons = { ai: SparkleRegular, comment: TextBulletListLtrRegular, deadline: HistoryRegular, token: MoneyRegular };

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "12px" },
  toolbar: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "6px" },
  readAll: { minHeight: dadamUi.smallControlHeight, height: "auto", minWidth: 0, padding: "0 7px", borderRadius: dadamUi.controlRadius, color: tokens.colorNeutralForeground2, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500 },
  card: {
    position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "flex-start", gap: "10px", width: "100%", minWidth: 0,
    padding: dadamUi.cardPadding, textAlign: "left", whiteSpace: "normal", border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, textDecorationLine: "none", fontFamily: tokens.fontFamilyBase,
    ":hover": { ...shorthands.borderColor(tokens.colorNeutralStroke1), backgroundColor: tokens.colorNeutralBackground2Hover },
  },
  unread: {
    ...shorthands.borderColor(tokens.colorBrandStroke1), backgroundColor: tokens.colorBrandBackground2,
    "::after": { content: '""', position: "absolute", top: "10px", right: "10px", width: "7px", height: "7px", borderRadius: "50%", backgroundColor: tokens.colorBrandBackground },
  },
  icon: { display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: dadamUi.cardRadius, flexShrink: 0 },
  ai: { backgroundColor: tokens.colorPalettePurpleBackground2, color: tokens.colorPalettePurpleForeground2 },
  comment: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
  deadline: { backgroundColor: tokens.colorStatusDangerBackground1, color: tokens.colorStatusDangerForeground1 },
  token: { backgroundColor: tokens.colorStatusWarningBackground1, color: tokens.colorStatusWarningForeground1 },
  glyph: { width: "14px", height: "14px" },
  body: { display: "flex", flex: 1, minWidth: 0, flexDirection: "column", gap: "3px" },
  titleRow: { display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: "6px", paddingRight: "12px" },
  title: { flex: 1, minWidth: 0, overflowWrap: "anywhere", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 700 },
  time: { flexShrink: 0, color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 400 },
  description: { color: tokens.colorNeutralForeground2, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 400 },
  empty: { padding: "28px 12px", color: tokens.colorNeutralForeground3, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, textAlign: "center" },
});

export default function ProfileNotificationsTab({ onNavigate, onNotice, onOpenTokenDialog }: ProfileActionPanelProps): React.ReactElement {
  const styles = useStyles();
  const { state, dispatch } = useProfilePreview();
  const id = useId();
  const unread = getUnreadNotificationCount(state.notifications);
  const notifications = getVisibleProfileNotifications(state.notifications, state.notificationFilter);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <SegmentedControl<NotificationFilter>
          ariaLabel="알림 필터" value={state.notificationFilter}
          options={[{ value: "all", label: "전체" }, { value: "unread", label: "안 읽음" }]}
          onChange={(filter) => dispatch({ type: "set-notification-filter", filter })}
        />
        {unread > 0 && <Button appearance="subtle" className={styles.readAll} onClick={() => {
          dispatch({ type: "mark-all-notifications-read" });
          onNotice("알림을 모두 읽음으로 표시했습니다. (시연)");
        }}>모두 읽음</Button>}
      </div>
      {notifications.map((notification) => {
        const Icon = icons[notification.kind];
        const target = notification.targetScreen ? getSidebarItemByScreen(notification.targetScreen) : undefined;
        const className = mergeClasses(styles.card, notification.unread && styles.unread);
        const label = `${notification.title}${notification.unread ? " · 안 읽음" : ""}`;
        const descriptionId = `${id}-${notification.id}`;
        const content = <>
          <span className={mergeClasses(styles.icon, styles[notification.kind])}><Icon className={styles.glyph} aria-hidden="true" /></span>
          <span className={styles.body}>
            <span className={styles.titleRow}><b className={styles.title}>{notification.title}</b><span className={styles.time}>{notification.timeLabel}</span></span>
            <span className={styles.description} id={descriptionId}>{notification.description}</span>
          </span>
        </>;
        return target ? (
          <Link key={notification.id} href={target.href} className={className} aria-label={label} aria-describedby={descriptionId} onClick={() => {
            dispatch({ type: "mark-notification-read", id: notification.id });
            onNavigate();
          }}>{content}</Link>
        ) : (
          <Button key={notification.id} appearance="transparent" className={className} aria-label={label} aria-describedby={descriptionId} onClick={() => {
            dispatch({ type: "mark-notification-read", id: notification.id });
            if (notification.kind === "token") onOpenTokenDialog("usage");
            else onNotice("사용량 상세 분석은 준비 중입니다.");
          }}>{content}</Button>
        );
      })}
      {notifications.length === 0 && <p className={styles.empty} role="status">{state.notificationFilter === "unread" ? "안 읽은 알림이 없습니다" : "알림이 없습니다"}</p>}
    </div>
  );
}
