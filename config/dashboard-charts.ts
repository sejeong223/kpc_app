export const DASHBOARD_CHART_COLORS = {
  registrations: "var(--chart-blue)", activities: "var(--chart-teal)", tokens: "var(--chart-violet)",
  activeUsers: "var(--chart-amber)", rose: "var(--chart-rose)", other: "var(--chart-slate)",
} as const;

const categoricalColors = Object.values(DASHBOARD_CHART_COLORS);
const categoryColors = new Map<string, string>([
  ["generate", DASHBOARD_CHART_COLORS.tokens], ["usage", DASHBOARD_CHART_COLORS.tokens],
  ["create", DASHBOARD_CHART_COLORS.registrations], ["rfp", DASHBOARD_CHART_COLORS.registrations],
  ["update", DASHBOARD_CHART_COLORS.activeUsers], ["document", DASHBOARD_CHART_COLORS.activities],
  ["export", DASHBOARD_CHART_COLORS.activities], ["read", DASHBOARD_CHART_COLORS.rose],
  ["chart:other", DASHBOARD_CHART_COLORS.other],
]);

// 순위나 페이지가 바뀌어도 동일 분류는 같은 색상을 유지한다.
export function dashboardCategoryColor(id: string): string {
  const known = categoryColors.get(id);
  if (known) return known;
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return categoricalColors[hash % categoricalColors.length];
}
