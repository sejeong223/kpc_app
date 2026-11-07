"use client";

import { makeStyles, shorthands, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";

/** 파일 메뉴의 HTML 기준. 공용 컨트롤과 다른 작업 화면에는 적용하지 않는다. */
export const useFileListStyles = makeStyles({
  workspace: {
    display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, width: "100%",
    fontFamily: tokens.fontFamilyBase, fontSize: "14px", lineHeight: "20px", fontWeight: 400,
  },
  usage: {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", minWidth: 0,
    margin: "-2px 0 8px", fontSize: "11px", color: "var(--kpc-muted)",
  },
  usageCount: { color: "var(--kpc-ink)" },
  usageBar: { flex: "1 1 0", minWidth: 0, height: "5px", borderRadius: "3px", backgroundColor: "#eef0f2", overflow: "hidden" },
  usageFill: { display: "block", height: "100%", backgroundColor: "var(--chart-blue)" },
  note: { margin: 0, fontSize: "12px", lineHeight: "16px", color: "var(--kpc-muted)" },
  round: { minWidth: 0 },
  roundSummary: { marginBottom: "12px", minHeight: "20px", cursor: "pointer", fontSize: "14px", lineHeight: "20px", fontWeight: 600, listStylePosition: "inside" },
  roundMeta: { marginLeft: "8px", fontSize: "12px", fontWeight: 400, color: "var(--kpc-secondary)" },
  grid: {
    display: "grid", minWidth: 0, gap: "12px", gridTemplateColumns: "minmax(0, 1fr)",
    "@media (min-width: 768px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
    "@media (min-width: 1280px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
  },
  panelHost: { minWidth: 0 },
  panel: {
    display: "flex", flexDirection: "column", height: "100%", minWidth: 0,
    backgroundColor: "#fff", border: "1px solid var(--kpc-line)", borderRadius: "12px",
    "& > header": { padding: "12px", gap: "8px", flexWrap: "wrap", "& h2": { fontSize: "13px", fontWeight: 700 } },
    "& > div": { flex: 1, gap: "12px", padding: "0 12px 12px" },
  },
  panelOver: { outline: "2px dashed var(--dadam-accent)", outlineOffset: "2px" },
  actions: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" },
  smallButton: {
    minHeight: "32px", height: "32px", padding: "0 12px", borderRadius: "8px",
    fontFamily: tokens.fontFamilyBase, fontSize: "12px", lineHeight: "20px", fontWeight: 400, color: "#242424",
    "&:disabled, &:disabled:hover, &[aria-disabled='true']": { backgroundColor: "#f0f0f0", color: "#bdbdbd", ...shorthands.borderColor("#e0e0e0") },
  },
  empty: {
    display: "flex", minHeight: "128px", alignItems: "center", justifyContent: "center", padding: "12px",
    border: "1px dashed var(--kpc-line)", borderRadius: "8px", textAlign: "center", fontSize: "14px", color: "var(--kpc-secondary)",
  },
  card: { minWidth: 0, border: "1px solid var(--kpc-line)", borderRadius: "8px", backgroundColor: "#fff", padding: "12px" },
  excluded: { opacity: 0.65 },
  cardHeader: { display: "flex", minWidth: 0, alignItems: "flex-start", gap: "8px" },
  icon: { display: "inline-flex", width: "14px", height: "14px", marginTop: "4px", flexShrink: 0, color: "var(--dadam-accent-ink)", "& > svg": { width: "14px", height: "14px" } },
  cardText: { minWidth: 0, flex: 1 },
  name: {
    display: "block", width: "100%", border: 0, backgroundColor: "transparent", padding: 0,
    textAlign: "left", fontFamily: tokens.fontFamilyBase, fontSize: "14px", lineHeight: "20px", fontWeight: 500, color: "inherit", overflowWrap: "anywhere", cursor: "pointer",
    ":hover": { textDecorationLine: "underline" }, ":focus-visible": { outline: dadamUi.focusRing, outlineOffset: "2px" },
  },
  meta: { margin: "4px 0", fontSize: "12px", lineHeight: "16px", color: "var(--kpc-secondary)", overflowWrap: "anywhere" },
  tags: { display: "flex", flexWrap: "wrap", gap: "4px", margin: "8px 0", fontSize: "12px" },
  badge: { borderRadius: "4px", padding: "4px 8px", fontSize: "12px", lineHeight: "16px" },
  required: { backgroundColor: "#fff9f5", color: "#bc4b09" },
  preferred: { backgroundColor: "var(--dadam-accent-soft)", color: "var(--dadam-accent-ink)" },
  normal: { backgroundColor: tokens.colorNeutralBackground3, color: tokens.colorNeutralForeground2 },
  excludedBadge: { backgroundColor: tokens.colorNeutralBackground2, color: tokens.colorNeutralForeground3 },
  instruction: { margin: "8px 0", fontSize: "12px", color: "var(--kpc-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" },
  undo: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", borderRadius: "8px", backgroundColor: "var(--dadam-accent-soft)", padding: "12px", fontSize: "14px" },
});
