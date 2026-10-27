"use client";

import { Button, makeStyles, mergeClasses, ProgressBar, shorthands } from "@fluentui/react-components";
import { AddRegular, ChevronRightRegular, DataBarVerticalRegular, MoneyRegular, PeopleRegular, ShieldRegular, TextBulletListLtrRegular } from "@fluentui/react-icons";
import Link from "next/link";

import SegmentedControl from "@/components/ui/SegmentedControl";
import { PROFILE_TOKEN_USAGE, PROFILE_WORK_COUNTS, type PreviewRole } from "@/config/profile-preview";
import { formatTokenCount, getProfileTokenSummary, getUnreadNotificationCount } from "@/lib/profile-preview";

import type { ProfileActionPanelProps } from "./ProfileMenu";
import { useProfilePreview } from "./ProfilePreviewProvider";

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "12px" },
  card: { backgroundColor: "#fff", border: "1px solid #e6e7eb", borderRadius: "12px", padding: "12px" },
  heading: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", margin: "0 0 8px", fontSize: "12px", lineHeight: "18px", fontWeight: 800 },
  title: { display: "inline-flex", alignItems: "center", gap: "5px" },
  icon: { width: "14px", height: "14px", flexShrink: 0 },
  percent: { color: "#15985a", fontSize: "15px", fontWeight: 900 },
  warning: { color: "#c26a12" },
  over: { color: "#d7192f" },
  progress: { height: "7px", backgroundColor: "#eff0f3" },
  progressBar: { height: "7px", backgroundColor: "#15985a" },
  warningBar: { backgroundColor: "#c26a12" },
  overBar: { backgroundColor: "#d7192f" },
  stats: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", margin: "8px 0 10px" },
  stat: { backgroundColor: "#f7f8fa", borderRadius: "8px", padding: "6px 8px" },
  statLabel: { display: "block", fontSize: "10px", lineHeight: "15px", color: "#74747d", fontWeight: 700 },
  statValue: { fontSize: "13px", lineHeight: "20px", fontWeight: 850, fontVariantNumeric: "tabular-nums" },
  actions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" },
  action: { minWidth: 0, height: "26px", padding: "0 9px", gap: "5px", borderRadius: "7px", fontFamily: "inherit", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" },
  primary: { backgroundColor: "#d7192f", color: "#fff", ...shorthands.borderColor("#d7192f"), ":hover": { backgroundColor: "#c31429", color: "#fff" }, ":hover:active": { backgroundColor: "#b01225", color: "#fff" } },
  adminLink: { display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "8px 2px 0", borderTop: "1px dashed #e6e7eb", color: "#34363c", fontSize: "11.5px", fontWeight: 750, textDecorationLine: "none", ":hover": { color: "#c91c2b" } },
  arrow: { marginLeft: "auto", width: "14px", height: "14px" },
  quick: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px" },
  quickButton: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px", minWidth: 0, padding: "8px 10px", border: "1px solid #e6e7eb", borderRadius: "9px", backgroundColor: "#fff", color: "#161616", textAlign: "left", textDecorationLine: "none", ":hover": { ...shorthands.borderColor("#d7192f"), backgroundColor: "#fff8f9" } },
  quickValue: { fontSize: "16px", lineHeight: "24px", fontWeight: 900, fontVariantNumeric: "tabular-nums" },
  red: { color: "#d7192f" },
  quickLabel: { fontSize: "10.5px", lineHeight: "16px", color: "#74747d", fontWeight: 700, whiteSpace: "nowrap" },
  meta: { color: "#74747d", fontSize: "10.5px", fontWeight: 400, lineHeight: "16px" },
  help: { margin: "6px 0 0", fontSize: "11px", lineHeight: "17px", color: "#74747d" },
  sample: { margin: "-5px 0 0", textAlign: "right", fontSize: "10px", color: "#74747d" },
});

export default function ProfileGeneralTab({ onNavigate, onNotice }: ProfileActionPanelProps): React.ReactElement {
  const styles = useStyles();
  const { state, profile, rolePreviewEnabled, dispatch } = useProfilePreview();
  const summary = getProfileTokenSummary(PROFILE_TOKEN_USAGE.used, PROFILE_TOKEN_USAGE.limit, PROFILE_TOKEN_USAGE.warningThreshold);
  const unread = getUnreadNotificationCount(state.notifications);
  const isAdmin = profile.role === "admin";
  const available = summary.status !== "unavailable";

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-label="AI Token 사용량">
        <h3 className={styles.heading}>
          <span className={styles.title}><MoneyRegular className={styles.icon} aria-hidden="true" />이번 달 AI Token</span>
          <b className={mergeClasses(styles.percent, summary.status === "warning" && styles.warning, summary.status === "over" && styles.over)}>{available ? `${summary.percent}%` : "—"}</b>
        </h3>
        <ProgressBar
          aria-label="이번 달 AI Token 사용률" value={summary.progressPercent / 100}
          className={styles.progress} bar={{ className: mergeClasses(styles.progressBar, summary.status === "warning" && styles.warningBar, summary.status === "over" && styles.overBar) }}
        />
        <div className={styles.stats}>
          {[["사용", summary.used], ["잔여", summary.remaining], ["한도", summary.limit]].map(([label, value]) => (
            <div className={styles.stat} key={label}><span className={styles.statLabel}>{label}</span><b className={styles.statValue}>{available ? formatTokenCount(Number(value)) : "—"}</b></div>
          ))}
        </div>
        <div className={styles.actions}>
          <Button className={styles.action} icon={<DataBarVerticalRegular className={styles.icon} />} onClick={() => onNotice("사용량 상세 분석은 준비 중입니다.")}>사용량 상세 분석</Button>
          <Button className={mergeClasses(styles.action, styles.primary)} icon={<AddRegular className={styles.icon} />} onClick={() => onNotice("토큰 추가 신청은 준비 중입니다.")}>토큰 추가 신청</Button>
        </div>
        {isAdmin && <Link href="/workspace/tokens" className={styles.adminLink} onClick={onNavigate}><PeopleRegular className={styles.icon} aria-hidden="true" />전사 토큰 · 비용 관리<ChevronRightRegular className={styles.arrow} aria-hidden="true" /></Link>}
      </section>
      <section className={styles.card} aria-label="내 작업">
        <h3 className={styles.heading}><span className={styles.title}><TextBulletListLtrRegular className={styles.icon} aria-hidden="true" />내 작업</span></h3>
        <div className={styles.quick}>
          <Link href="/workspace/pipeline" className={styles.quickButton} onClick={onNavigate}><b className={styles.quickValue}>{PROFILE_WORK_COUNTS.assignedProjects}</b><span className={styles.quickLabel}>담당 프로젝트</span></Link>
          <Link href="/workspace/pipeline" className={styles.quickButton} onClick={onNavigate}><b className={mergeClasses(styles.quickValue, styles.red)}>{PROFILE_WORK_COUNTS.openComments}</b><span className={styles.quickLabel}>반영할 의견</span></Link>
          <button type="button" className={styles.quickButton} onClick={() => { onNotice(""); dispatch({ type: "set-tab", tab: "notifications" }); }}><b className={mergeClasses(styles.quickValue, unread > 0 && styles.red)}>{unread}</b><span className={styles.quickLabel}>안 읽은 알림</span></button>
        </div>
      </section>
      <section className={styles.card} aria-label="권한 테스트 모드">
        <h3 className={styles.heading}><span className={styles.title}><ShieldRegular className={styles.icon} aria-hidden="true" />권한 테스트 모드</span><span className={styles.meta}>시연용</span></h3>
        <SegmentedControl<PreviewRole>
          ariaLabel="미리보기 권한" fullWidth disabled={!rolePreviewEnabled} value={profile.role}
          options={[{ value: "user", label: "일반 사용자" }, { value: "admin", label: "관리자" }]}
          onChange={(role) => dispatch({ type: "set-role", role })}
        />
        <p className={styles.help}>{!rolePreviewEnabled ? "현재 로그인 권한을 사용합니다." : isAdmin ? "작성 자산 관리 · 운영 정책 메뉴가 열립니다" : "관리자로 바꾸면 작성 자산 관리 · 운영 정책 메뉴가 열립니다"}</p>
      </section>
      <p className={styles.sample}>사용량·작업 수는 시연 데이터입니다.</p>
    </div>
  );
}
