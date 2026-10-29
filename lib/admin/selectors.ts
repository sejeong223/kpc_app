import { sumMoney } from "@/lib/admin/cost";
import { clampActivityPeriod, toKoreanDay } from "@/lib/admin/dates";
import type { AdminActor, AdminAuditEvent, AdminDepartment, AdminStoreState, AdminUsage, AuditList, AuditQuery, DashboardQuery, DashboardView, MoneyTotal, NamedCount, PageInput, PageResult, Period, RfpStatus, SelfUsageView, TokenOverview, TokenQuery, UserList, UserQuery } from "@/types/admin";

export const inScope = (actor: AdminActor, departmentId: string | null): boolean => actor.role === "super_admin" || (actor.role === "department_admin" && actor.departmentId !== null && actor.departmentId === departmentId);
export const matches = (text: string, search: string): boolean => text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
export const inPeriod = (iso: string, period: Period): boolean => { const day = toKoreanDay(iso); return day >= period.from && day <= period.to; };
export const tokenTotal = (rows: readonly AdminUsage[]): number => rows.reduce((n, r) => n + r.inputTokens + r.outputTokens, 0);
export const costTotal = (rows: readonly AdminUsage[]): MoneyTotal => sumMoney(rows.map((r) => ({ usdMicros: r.cost.amountUsdMicros, krwMicros: r.cost.amountKrwMicros })));
export const visibleDepartments = (state: AdminStoreState, actor: AdminActor): AdminDepartment[] => state.departments.filter((d) => inScope(actor, d.id));
export function paginate<T>(items: readonly T[], query: PageInput): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / query.pageSize)), page = Math.min(query.page, totalPages);
  return { items: items.slice((page - 1) * query.pageSize, page * query.pageSize), total: items.length, page, pageSize: query.pageSize, totalPages };
}
export function userRows(state: AdminStoreState, actor: AdminActor, query: UserQuery) {
  return state.users.filter((u) => !u.deletedAt && inScope(actor, u.departmentId))
    .filter((u) => matches(u.name + " " + u.email, query.search) && (!query.departmentId || u.departmentId === query.departmentId) && (query.role === "all" || u.role === query.role) && (query.status === "all" || u.status === query.status))
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
}
export function selectUsers(state: AdminStoreState, actor: AdminActor, query: UserQuery): UserList {
  const scoped = state.users.filter((u) => !u.deletedAt && inScope(actor, u.departmentId));
  return { rows: paginate(userRows(state, actor, query), query), departments: visibleDepartments(state, actor),
    roleCounts: { all: scoped.length, super_admin: scoped.filter((u) => u.role === "super_admin").length, department_admin: scoped.filter((u) => u.role === "department_admin").length, user: scoped.filter((u) => u.role === "user").length },
    statusCounts: { active: scoped.filter((u) => u.status === "active").length, invited: scoped.filter((u) => u.status === "invited").length, locked: scoped.filter((u) => u.status === "locked").length } };
}
export function buildSelfUsage(state: AdminStoreState, actor: AdminActor): SelfUsageView {
  const month = toKoreanDay(state.logicalNow).slice(0, 7), usage = state.usages.filter((u) => u.userId === actor.userId && toKoreanDay(u.occurredAt).startsWith(month));
  const account = state.accounts.find((a) => a.userId === actor.userId && a.month === month);
  return { usedTokens: tokenTotal(usage), limitTokens: account?.limitTokens ?? state.settings.defaultPersonalLimit, paused: account?.paused ?? false,
    warningPercent: state.settings.warningPercents[0], requests: state.requests.filter((r) => r.requesterId === actor.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)),
    usage, month, from: month + "-01", to: toKoreanDay(state.logicalNow), elapsedDays: 20, daysInMonth: 31 };
}
export function selectTokens(state: AdminStoreState, actor: AdminActor, query: TokenQuery): TokenOverview {
  const scope = (departmentId: string | null) => inScope(actor, departmentId) && (!query.departmentId || query.departmentId === departmentId);
  const periodUsage = state.usages.filter((u) => scope(u.departmentId) && inPeriod(u.occurredAt, query));
  const rows = state.accounts.filter((a) => a.month === query.month).flatMap((a) => {
    const user = state.users.find((u) => u.id === a.userId && !u.deletedAt && scope(u.departmentId));
    if (!user) return [];
    const usedTokens = tokenTotal(state.usages.filter((u) => u.userId === a.userId && scope(u.departmentId) && toKoreanDay(u.occurredAt).startsWith(query.month)));
    const status: TokenOverview["rows"][number]["status"] = a.paused ? "paused" : usedTokens >= a.limitTokens ? "over" : usedTokens / a.limitTokens * 100 >= state.settings.warningPercents[0] ? "warning" : "normal";
    return [{ id: a.id, userId: user.id, name: user.name, departmentId: user.departmentId, departmentName: state.departments.find((d) => d.id === user.departmentId)?.name ?? "미지정", title: user.title, version: a.version, usedTokens, limitTokens: a.limitTokens, paused: a.paused, status }];
  });
  return { rows: rows.filter((r) => matches(r.name + " " + r.departmentName, query.search) && (query.status === "all" || r.status === query.status)).sort((a, b) => a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id)),
    departments: visibleDepartments(state, actor), byDepartment: visibleDepartments(state, actor).filter((d) => !query.departmentId || d.id === query.departmentId).map((d) => ({ id: d.id, name: d.name, usedTokens: tokenTotal(periodUsage.filter((u) => u.departmentId === d.id)), userCount: rows.filter((r) => r.departmentId === d.id).length })),
    usedTokens: tokenTotal(periodUsage), personalLimitsTotal: rows.reduce((n, r) => n + r.limitTokens, 0), cost: costTotal(periodUsage),
    models: state.models.map((m) => { const usage = periodUsage.filter((u) => u.modelId === m.id); return { id: m.id, modelName: m.name, inputTokens: usage.reduce((n, u) => n + u.inputTokens, 0), outputTokens: usage.reduce((n, u) => n + u.outputTokens, 0), ...costTotal(usage) }; }),
    settings: actor.role === "super_admin" ? { version: state.settings.version, updatedAt: state.settings.updatedAt, monthlyTokenLimit: state.settings.monthlyTokenLimit, defaultPersonalLimit: state.settings.defaultPersonalLimit, warningPercents: state.settings.warningPercents } : null };
}
export function auditRows(state: AdminStoreState, actor: AdminActor, query: AuditQuery, ignoreOutcome = false): AdminAuditEvent[] {
  return state.audits.filter((a) => inScope(actor, a.departmentId) && inPeriod(a.occurredAt, query)
    && matches(a.actorName + " " + a.actorEmail, query.userSearch) && matches(a.targetLabel + " " + a.targetId + " " + a.detail, query.targetSearch)
    && (query.action === "all" || a.action === query.action) && (query.resource === "all" || a.resource === query.resource)
    && (ignoreOutcome || query.outcome === "all" || a.outcome === query.outcome))
    .sort((a, b) => { const av = a[query.sortKey], bv = b[query.sortKey]; const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ko"); return cmp * (query.direction === "asc" ? 1 : -1) || b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id); });
}
export function selectAudit(state: AdminStoreState, actor: AdminActor, query: AuditQuery): AuditList {
  const all = auditRows(state, actor, query, true), scoped = state.audits.filter((a) => inScope(actor, a.departmentId));
  return { rows: paginate(auditRows(state, actor, query), query), successCount: all.filter((a) => a.outcome === "success").length, failureCount: all.filter((a) => a.outcome === "failure").length,
    actions: [...new Set(scoped.map((a) => a.action))].sort(), resources: [...new Set(scoped.map((a) => a.resource))].sort() };
}
const emptyCounts = (): Record<RfpStatus, number> => ({ review: 0, writing: 0, submitted: 0, won: 0, lost: 0, dropped: 0 });
const rfpCounts = (rows: AdminStoreState["rfps"]): Record<RfpStatus, number> => rows.reduce((counts, row) => { counts[row.status]++; return counts; }, emptyCounts());
const nextDay = (day: string, count = 1): string => new Date(Date.parse(day + "T00:00:00Z") + count * 86400000).toISOString().slice(0, 10);
function breakdown(audits: readonly AdminAuditEvent[], key: "action" | "resource" | "detail"): NamedCount[] {
  return [...new Set(audits.map((a) => a[key]))].map((id) => ({ id, label: id, count: audits.filter((a) => a[key] === id).length, failures: audits.filter((a) => a[key] === id && a.outcome === "failure").length })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
export function buildDashboard(state: AdminStoreState, actor: AdminActor, query: DashboardQuery): DashboardView {
  const period = { from: query.from, to: query.to }, activityPeriod = clampActivityPeriod(period);
  const audits = state.audits.filter((a) => inScope(actor, a.departmentId) && activityPeriod && inPeriod(a.occurredAt, activityPeriod));
  const usage = state.usages.filter((u) => inScope(actor, u.departmentId) && activityPeriod && inPeriod(u.occurredAt, activityPeriod));
  const rfps = state.rfps.filter((r) => inScope(actor, r.departmentId) && inPeriod(r.registeredAt, period));
  const registrations: DashboardView["registrations"] = [];
  const weekly = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1 <= 120;
  for (let start = query.from; start <= query.to;) {
    const end = weekly ? nextDay(start, 7) : new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 1)).toISOString().slice(0, 10);
    const to = end > nextDay(query.to) ? nextDay(query.to) : end;
    registrations.push({ id: start, label: weekly ? start.slice(5) : start.slice(0, 7), from: start, to, count: rfps.filter((r) => { const day = toKoreanDay(r.registeredAt); return day >= start && day < to; }).length });
    start = to;
  }
  const bucket = registrations.find((r) => r.id === query.bucketStart);
  const selected = bucket ? rfps.filter((r) => { const day = toKoreanDay(r.registeredAt); return day >= bucket.from && day < bucket.to; }) : rfps;
  const filtered = selected.filter((r) => query.rfpStatus === "all" || (query.rfpStatus === "progress" ? ["review", "writing"].includes(r.status) : r.status === query.rfpStatus))
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt) || a.id.localeCompare(b.id));
  const trends: DashboardView["trends"] = [];
  if (activityPeriod) for (let day = activityPeriod.from; day <= activityPeriod.to; day = nextDay(day)) {
    const events = audits.filter((a) => toKoreanDay(a.occurredAt) === day), dailyUsage = usage.filter((u) => toKoreanDay(u.occurredAt) === day);
    trends.push({ id: day, label: day.slice(5), activities: events.length, activeUsers: new Set(events.map((a) => a.actorId)).size, generations: events.filter((a) => a.action === "generate").length,
      downloads: events.filter((a) => a.action === "export").length, tokens: tokenTotal(dailyUsage), cost: costTotal(dailyUsage) });
  }
  const userIds = new Set([...state.users.filter((u) => !u.deletedAt && inScope(actor, u.departmentId)).map((u) => u.id), ...audits.map((a) => a.actorId), ...usage.map((u) => u.userId)]);
  return { period, activityPeriod, activityCapped: !activityPeriod || activityPeriod.from !== period.from, rfpCounts: rfpCounts(rfps), totalRfps: rfps.length,
    activities: audits.length, activeUsers: new Set(audits.map((a) => a.actorId)).size, generations: audits.filter((a) => a.action === "generate").length, downloads: audits.filter((a) => a.action === "export").length,
    tokens: tokenTotal(usage), cost: costTotal(usage), registrations, distribution: rfpCounts(selected), selectedRfpCount: selected.length, wonBudgetKrw: selected.filter((r) => r.status === "won").reduce((n, r) => n + r.budgetKrw, 0),
    departments: visibleDepartments(state, actor).map((d) => { const rows = rfps.filter((r) => r.departmentId === d.id); return { id: d.id, name: d.name, counts: rfpCounts(rows), total: rows.length, wonBudgetKrw: rows.filter((r) => r.status === "won").reduce((n, r) => n + r.budgetKrw, 0) }; }),
    rfps: paginate(filtered.map((r) => ({ ...r, pmName: state.users.find((u) => u.id === r.pmId)?.name ?? "삭제된 사용자", departmentName: state.departments.find((d) => d.id === r.departmentId)?.name ?? "미지정" })), { page: query.rfpPage, pageSize: 10 }),
    trends, actions: breakdown(audits, "action"), resources: breakdown(audits, "resource"), details: breakdown(audits, "detail"),
    users: [...userIds].map((id) => {
      const events = audits.filter((a) => a.actorId === id), userUsage = usage.filter((u) => u.userId === id), current = state.users.find((u) => u.id === id);
      const snapshot = [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
      const name = snapshot?.actorName ?? userUsage[0]?.userName ?? current?.name ?? "삭제된 사용자";
      const departmentId = snapshot ? snapshot.departmentId : userUsage[0] ? userUsage[0].departmentId : current?.departmentId;
      return { id, name, departmentName: state.departments.find((d) => d.id === departmentId)?.name ?? "미지정", activities: events.length,
        rfpCreates: events.filter((a) => a.resource === "rfp" && a.action === "create").length, sectionWrites: events.filter((a) => a.resource === "document" && a.action === "update").length,
        generations: events.filter((a) => a.action === "generate").length, downloads: events.filter((a) => a.action === "export").length, failures: events.filter((a) => a.outcome === "failure").length, tokens: tokenTotal(userUsage), cost: costTotal(userUsage) };
    }).filter((u) => matches(u.name + " " + u.departmentName, query.userSearch)).sort((a, b) => b.activities - a.activities || a.id.localeCompare(b.id)) };
}
