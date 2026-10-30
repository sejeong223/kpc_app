"use client";

import { makeStyles, tokens, mergeClasses, shorthands } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";

import type { TokenUsageSnapshot } from "@/config/token-preview";
import { formatTokenCount, getProfileTokenSummary } from "@/lib/profile-preview";
import { estimateMonthEndUsage, getUsageBarPercent } from "@/lib/token-preview";

export interface TokenUsagePanelProps {
  snapshot: Readonly<TokenUsageSnapshot>;
  used: number;
  limit: number;
}

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, flexShrink: 0 },
  kpis: {
    display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px",
    "@media (max-width: 600px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  },
  kpi: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: dadamUi.cardPadding, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, minWidth: 0,
  },
  kpiLabel: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500, color: tokens.colorNeutralForeground3 },
  kpiValue: { fontSize: "20px", fontWeight: 700, lineHeight: "28px", fontVariantNumeric: "tabular-nums", color: tokens.colorNeutralForeground1 },
  meta: { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, color: tokens.colorNeutralForeground3, fontWeight: 400 },
  warning: {
    ...shorthands.borderColor(tokens.colorStatusWarningBorder1), backgroundColor: tokens.colorStatusWarningBackground1,
  },
  warningText: { color: tokens.colorStatusWarningForeground1, fontWeight: 700 },
  chartUnit: { fontWeight: 700 },
  card: { minWidth: 0, border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: dadamUi.cardRadius, padding: dadamUi.cardPadding },
  heading: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", margin: "0 0 10px", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 700 },
  chart: { display: "flex", alignItems: "flex-end", gap: "4px", height: "110px" },
  day: {
    display: "flex", flex: 1, minWidth: 0, height: "100%", flexDirection: "column", alignItems: "center", gap: "4px",
    ":hover span": { opacity: 1 },
  },
  barArea: { flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" },
  dayBar: { width: "100%", maxWidth: "18px", borderRadius: "3px 3px 0 0", backgroundColor: tokens.colorBrandBackground, opacity: 0.85 },
  dayLabel: { height: "12px", fontSize: "10px", fontWeight: 400, lineHeight: "12px", color: tokens.colorNeutralForeground3 },
  two: {
    display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px",
    "@media (max-width: 600px)": { gridTemplateColumns: "minmax(0, 1fr)" },
  },
  item: { marginBottom: "8px", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, ":last-child": { marginBottom: 0 } },
  itemRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", minWidth: 0 },
  itemName: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  number: { flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  track: { height: "7px", borderRadius: "4px", overflow: "hidden", backgroundColor: tokens.colorNeutralBackground5 },
  projectBar: { display: "block", height: "100%", backgroundColor: tokens.colorStatusSuccessBackground3, borderRadius: "inherit" },
  featureBar: { display: "block", height: "100%", backgroundColor: tokens.colorNeutralForeground2, borderRadius: "inherit" },
  table: {
    width: "100%", tableLayout: "fixed", borderCollapse: "collapse",
    "& th": {
      position: "sticky", top: 0, zIndex: 1, textAlign: "left", backgroundColor: tokens.colorNeutralBackground2,
      padding: "9px 12px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500, color: tokens.colorNeutralForeground3,
    },
    "& td": { padding: "11px 12px", borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, verticalAlign: "middle" },
    "& th, & td": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
    "& th:first-child": { width: "110px" },
    "& th:last-child": { width: "80px" },
    "& th:last-child, & td:last-child": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
    "& td:first-child": { color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontVariantNumeric: "tabular-nums" },
    "@media (max-width: 600px)": {
      "& th, & td": { padding: "8px 4px", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
      "& td:first-child": { fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
      "& th:first-child": { width: "70px" },
      "& th:last-child": { width: "50px" },
    },
  },
  hidden: { position: "absolute", width: "1px", height: "1px", padding: 0, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" },
  empty: { margin: 0, color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight },
});

export default function TokenUsagePanel({ snapshot, used, limit }: TokenUsagePanelProps): React.ReactElement {
  const styles = useStyles();
  const summary = getProfileTokenSummary(used, limit);
  const available = summary.status !== "unavailable";
  const estimate = estimateMonthEndUsage(used, snapshot.elapsedDays, snapshot.daysInMonth);
  const overEstimate = available && estimate > limit;
  const dailyMax = Math.max(0, ...snapshot.daily.map((item) => item.tokens));
  const projectTotal = snapshot.byProject.reduce((sum, item) => sum + item.tokens, 0);
  const featureMax = Math.max(0, ...snapshot.byFeature.map((item) => item.percent));
  const displayCount = (value: number) => available ? formatTokenCount(value) : "—";

  return (
    <div className={styles.root}>
      <div className={styles.kpis} aria-label="사용량 요약">
        <div className={styles.kpi}><span className={styles.kpiLabel}>사용</span><b className={styles.kpiValue}>{displayCount(summary.used)}</b><span className={styles.meta}>{available ? summary.percent + "%" : "—"}</span></div>
        <div className={styles.kpi}><span className={styles.kpiLabel}>잔여</span><b className={styles.kpiValue}>{displayCount(summary.remaining)}</b></div>
        <div className={styles.kpi}><span className={styles.kpiLabel}>개인 한도</span><b className={styles.kpiValue}>{displayCount(summary.limit)}</b></div>
        <div className={mergeClasses(styles.kpi, overEstimate && styles.warning)}><span className={styles.kpiLabel}>월말 예상</span><b className={styles.kpiValue}>{displayCount(estimate)}</b><span className={mergeClasses(styles.meta, overEstimate && styles.warningText)}>{available ? overEstimate ? "한도 초과 예상" : "한도 내" : "—"}</span></div>
      </div>
      <section className={styles.card} aria-label="일별 사용량">
        <h3 className={styles.heading}>일별 사용량 <span className={mergeClasses(styles.meta, styles.chartUnit)}>단위 K Token</span></h3>
        {snapshot.daily.length ? <div className={styles.chart} role="list" aria-label="10월 일별 Token 사용량">
          {snapshot.daily.map(({ day, tokens }) => {
            const label = "10." + String(day).padStart(2, "0") + " · " + (tokens / 1000) + "K";
            return <div key={day} className={styles.day} title={label} role="listitem" aria-label={label}>
              <div className={styles.barArea} aria-hidden="true"><span className={styles.dayBar} style={{ height: (tokens > 0 ? Math.max(4, getUsageBarPercent(tokens, dailyMax)) : 0) + "%" }} /></div>
              <small className={styles.dayLabel} aria-hidden="true">{day === 1 || day % 5 === 0 ? day : ""}</small>
            </div>;
          })}
        </div> : <p className={styles.empty}>내역이 없습니다</p>}
      </section>
      <div className={styles.two}>
        <section className={styles.card} aria-label="프로젝트별 사용량">
          <h3 className={styles.heading}>프로젝트별</h3>
          {snapshot.byProject.map((item) => <div key={item.id} className={styles.item}>
            <div className={styles.itemRow}><span className={styles.itemName} title={item.name}>{item.name}</span><b className={styles.number}>{formatTokenCount(item.tokens)}</b></div>
            <div className={styles.track} aria-hidden="true"><span className={styles.projectBar} style={{ width: getUsageBarPercent(item.tokens, projectTotal) + "%" }} /></div>
          </div>)}
          {!snapshot.byProject.length && <p className={styles.empty}>내역이 없습니다</p>}
        </section>
        <section className={styles.card} aria-label="기능별 사용량">
          <h3 className={styles.heading}>기능별</h3>
          {snapshot.byFeature.map((item) => <div key={item.id} className={styles.item}>
            <div className={styles.itemRow}><span className={styles.itemName} title={item.name}>{item.name}</span><b className={styles.number}>{item.percent}%</b></div>
            <div className={styles.track} aria-hidden="true"><span className={styles.featureBar} style={{ width: getUsageBarPercent(item.percent, featureMax) + "%" }} /></div>
          </div>)}
          {!snapshot.byFeature.length && <p className={styles.empty}>내역이 없습니다</p>}
        </section>
      </div>
      <section className={styles.card} aria-label="최근 사용 내역">
        <h3 className={styles.heading}>최근 사용 내역</h3>
        {snapshot.recent.length ? <table className={styles.table}>
          <caption className={styles.hidden}>최근 Token 사용 내역</caption>
          <thead><tr>{["일시", "프로젝트", "작업", "Token"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{snapshot.recent.map((item) => <tr key={item.id}>
            <td title={item.timeLabel}>{item.timeLabel}</td><td title={item.projectName}>{item.projectName}</td>
            <td title={item.operation}>{item.operation}</td><td>{new Intl.NumberFormat("ko-KR").format(item.tokens)}</td>
          </tr>)}</tbody>
        </table> : <p className={styles.empty}>내역이 없습니다</p>}
      </section>
    </div>
  );
}
