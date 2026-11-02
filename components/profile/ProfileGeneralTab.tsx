"use client";

import { Button, makeStyles, tokens, mergeClasses, ProgressBar, shorthands } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { AddRegular, ChevronRightRegular, ClockRegular, DataBarVerticalRegular, MoneyRegular, PeopleRegular, ShieldRegular, TextBulletListLtrRegular } from "@fluentui/react-icons";
import Link from "next/link";

import SegmentedControl from "@/components/ui/SegmentedControl";
import { PROFILE_WORK_COUNTS, type PreviewRole } from "@/config/profile-preview";
import { formatTokenCount, getProfileTokenSummary, getUnreadNotificationCount } from "@/lib/profile-preview";
import { getLatestPendingTokenRequest, toTokenRequestPreview } from "@/lib/token-preview";
import { useAdminAccess, useAdminSelf } from "@/hooks/admin/use-admin-data";

import type { ProfileActionPanelProps } from "./ProfileMenu";
import { useProfilePreview } from "./ProfilePreviewProvider";

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: dadamUi.sectionGap },
  card: { backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, padding: dadamUi.cardPadding },
  heading: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--layout-control-gap)", margin: "0 0 8px", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 700, color: tokens.colorNeutralForeground1 },
  title: { display: "inline-flex", alignItems: "center", gap: "var(--layout-inline-gap)" },
  icon: { width: "14px", height: "14px", flexShrink: 0 },
  percent: { color: tokens.colorStatusSuccessForeground1, fontSize: dadamUi.titleSize, lineHeight: dadamUi.titleLineHeight, fontWeight: 700 },
  warning: { color: tokens.colorStatusWarningForeground1 },
  over: { color: tokens.colorStatusDangerForeground1 },
  progress: { height: "7px", backgroundColor: tokens.colorNeutralBackground5 },
  progressBar: { height: "7px", backgroundColor: tokens.colorStatusSuccessBackground3 },
  warningBar: { backgroundColor: tokens.colorStatusWarningBackground3 },
  overBar: { backgroundColor: tokens.colorStatusDangerBackground3 },
  stats: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--layout-control-gap)", margin: "8px 0 10px" },
  stat: { backgroundColor: tokens.colorNeutralBackground3, borderRadius: dadamUi.controlRadius, padding: "6px 8px" },
  statLabel: { display: "block", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: 500 },
  statValue: { fontSize: dadamUi.bodySize, lineHeight: "20px", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  actions: { display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: "var(--layout-control-gap)" },
  pending: { display: "flex", alignItems: "center", gap: "var(--layout-control-gap)", marginBottom: "8px", padding: "6px 9px", borderRadius: dadamUi.cardRadius, lineHeight: dadamUi.metaLineHeight, backgroundColor: tokens.colorStatusWarningBackground1, color: tokens.colorStatusWarningForeground1, fontSize: dadamUi.metaSize, fontWeight: 700, overflowWrap: "anywhere" },
  action: { minWidth: 0, minHeight: dadamUi.controlHeight, height: "auto", padding: "6px 10px", gap: "var(--layout-inline-gap)", borderRadius: dadamUi.controlRadius, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 500, whiteSpace: "normal" },
  primary: { backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand, ...shorthands.borderColor(tokens.colorBrandStroke1), ":enabled:hover": { backgroundColor: tokens.colorBrandBackgroundHover, color: tokens.colorNeutralForegroundOnBrand }, ":enabled:active": { backgroundColor: tokens.colorBrandBackgroundPressed, color: tokens.colorNeutralForegroundOnBrand }, ":disabled": { backgroundColor: tokens.colorNeutralBackgroundDisabled, color: tokens.colorNeutralForegroundDisabled, ...shorthands.borderColor(tokens.colorNeutralStrokeDisabled) } },
  adminLink: { display: "flex", alignItems: "center", gap: "var(--layout-control-gap)", marginTop: "8px", padding: "8px 2px 0", borderTop: `1px dashed ${tokens.colorNeutralStroke2}`, color: tokens.colorNeutralForeground2, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 500, textDecorationLine: "none", ":hover": { color: tokens.colorBrandForeground1 } },
  arrow: { marginLeft: "auto", width: "14px", height: "14px" },
  quick: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--layout-control-gap)" },
  quickButton: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--layout-inline-gap)", minWidth: 0, padding: "8px 8px", fontFamily: tokens.fontFamilyBase, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, textAlign: "left", textDecorationLine: "none", ":hover": { ...shorthands.borderColor(tokens.colorBrandStroke1), backgroundColor: tokens.colorBrandBackground2 } },
  quickValue: { fontSize: "16px", lineHeight: "24px", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  accent: { color: tokens.colorBrandForeground1 },
  quickLabel: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: 500, whiteSpace: "normal", minHeight: "32px" },
  meta: { color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, fontWeight: 400, lineHeight: "16px" },
  help: { margin: "6px 0 0", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3 },
});

export default function ProfileGeneralTab({ onNavigate, onNotice, onOpenTokenDialog }: ProfileActionPanelProps): React.ReactElement {
  const styles = useStyles();
  const { state, profile, rolePreviewEnabled, dispatch } = useProfilePreview();
  const self = useAdminSelf(), access = useAdminAccess();
  const summary = getProfileTokenSummary(self.data?.usedTokens ?? NaN, self.data?.limitTokens ?? NaN, self.data?.warningPercent);
  const unread = getUnreadNotificationCount(state.notifications);
  const isAdmin = profile.role !== "user";
  const available = summary.status !== "unavailable";
  const pending = getLatestPendingTokenRequest((self.data?.requests ?? []).map((r) => toTokenRequestPreview(r, access.data?.departments ?? [])));

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-label="AI Token 사용량">
        <h3 className={styles.heading}>
          <span className={styles.title}><MoneyRegular className={styles.icon} aria-hidden="true" />이번 달 AI Token</span>
          <b className={mergeClasses(styles.percent, summary.status === "warning" && styles.warning, summary.status === "over" && styles.over)}>{available ? `${summary.percent}%` : "—"}</b>
        </h3>
        {!self.data && <p role="status">{self.isError ? "사용량을 불러오지 못했습니다." : "사용량을 불러오는 중입니다."}{self.isError && <Button size="small" onClick={() => void self.refetch()}>다시 시도</Button>}</p>}
        <ProgressBar
          aria-label="이번 달 AI Token 사용률" value={summary.progressPercent / 100}
          className={styles.progress} bar={{ className: mergeClasses(styles.progressBar, summary.status === "warning" && styles.warningBar, summary.status === "over" && styles.overBar) }}
        />
        <div className={styles.stats}>
          {[["사용", summary.used], ["잔여", summary.remaining], ["한도", summary.limit]].map(([label, value]) => (
            <div className={styles.stat} key={label}><span className={styles.statLabel}>{label}</span><b className={styles.statValue}>{available ? formatTokenCount(Number(value)) : "—"}</b></div>
          ))}
        </div>
        {pending && <div className={styles.pending} role="status"><ClockRegular className={styles.icon} aria-hidden="true" /><span>추가 신청 {pending.amountK}K · 관리자 승인 대기</span></div>}
        {self.data?.requests[0] && self.data.requests[0].status !== "pending" && <p role="status">최근 신청 · {self.data.requests[0].status === "approved" ? "승인 완료" : "반려"}</p>}
        <div className={styles.actions}>
          <Button className={styles.action} icon={<DataBarVerticalRegular className={styles.icon} />} onClick={() => onOpenTokenDialog("usage")}>사용량 상세 분석</Button>
          <Button className={mergeClasses(styles.action, styles.primary)} icon={<AddRegular className={styles.icon} />} disabled={!self.data} onClick={() => onOpenTokenDialog("request")}>토큰 추가 신청</Button>
        </div>
        {isAdmin && <Link href="/workspace/policy?tab=tokens" className={styles.adminLink} onClick={onNavigate}><PeopleRegular className={styles.icon} aria-hidden="true" />{profile.role === "super_admin" ? "전사" : "부서"} 토큰 · 비용 관리<ChevronRightRegular className={styles.arrow} aria-hidden="true" /></Link>}
      </section>
      <section className={styles.card} aria-label="내 작업">
        <h3 className={styles.heading}><span className={styles.title}><TextBulletListLtrRegular className={styles.icon} aria-hidden="true" />내 작업</span></h3>
        <div className={styles.quick}>
          <Link href="/workspace/pipeline" className={styles.quickButton} onClick={onNavigate}><b className={styles.quickValue}>{PROFILE_WORK_COUNTS.assignedProjects}</b><span className={styles.quickLabel}>담당 프로젝트</span></Link>
          <Link href="/workspace/pipeline" className={styles.quickButton} onClick={onNavigate}><b className={mergeClasses(styles.quickValue, styles.accent)}>{PROFILE_WORK_COUNTS.openComments}</b><span className={styles.quickLabel}>반영할 의견</span></Link>
          <button type="button" className={styles.quickButton} onClick={() => { onNotice(""); dispatch({ type: "set-tab", tab: "notifications" }); }}><b className={mergeClasses(styles.quickValue, unread > 0 && styles.accent)}>{unread}</b><span className={styles.quickLabel}>안 읽은 알림</span></button>
        </div>
      </section>
      <section className={styles.card} aria-label="권한 테스트 모드">
        <h3 className={styles.heading}><span className={styles.title}><ShieldRegular className={styles.icon} aria-hidden="true" />권한 테스트 모드</span><span className={styles.meta}>시연용</span></h3>
        <SegmentedControl<PreviewRole>
          ariaLabel="미리보기 권한" fullWidth disabled={!rolePreviewEnabled} value={profile.role}
          options={[{ value: "user", label: "일반 사용자" }, { value: "department_admin", label: "관리자" }, { value: "super_admin", label: "슈퍼 관리자" }]}
          onChange={(role) => dispatch({ type: "set-role", role })}
        />
        <p className={styles.help}>{!rolePreviewEnabled ? "현재 로그인 권한을 사용합니다." : isAdmin ? "작성 자산 관리 · 운영 정책 메뉴가 열립니다" : "관리자로 바꾸면 작성 자산 관리 · 운영 정책 메뉴가 열립니다"}</p>
      </section>
    </div>
  );
}
