import { createAssetSeed } from "@/config/admin-assets-seed";
import { DEFAULT_ROLE_GRANTS } from "@/config/admin-permissions";
import { TOKEN_PROJECT_OPTIONS, TOKEN_USAGE_SNAPSHOT } from "@/config/token-preview";
import { calculateCost } from "@/lib/admin/cost";
import { allocateSelfUsage } from "@/lib/admin/seed-allocation";
import { AdminStoreStateSchema } from "@/lib/admin/schemas";
import type { AdminDirectoryEntry, AdminStoreState, AdminUser, UsageFeature, RfpStatus } from "@/types/admin";

export const ADMIN_DEMO_TIME = "2026-10-20T00:00:00.000Z";
const createdAt = "2026-01-01T00:00:00.000Z";
const record = (id: string) => ({ id, version: 1, createdAt, updatedAt: createdAt });
const departments = [
  { id: "d-ai", name: "AI사업본부" }, { id: "d-industry", name: "AI산업본부" },
  { id: "d-product", name: "생산성본부" }, { id: "d-consult", name: "컨설팅본부" },
  { id: "d-cx", name: "CX본부" }, { id: "d-edu", name: "교육사업본부" },
];
const names = ["정소담", "김민수", "박성훈", "이서연", "최지훈", "한지우", "장민재", "김서현", "박준영", "이하은", "정도윤", "강민지", "윤서준", "오수빈", "임지호", "이예진", "신현우", "배유진"];
function users(): AdminUser[] {
  return names.map((name, i) => ({ ...record(i === 0 ? "u-self" : "u-" + String(i + 1).padStart(2, "0")), name,
    email: i === 0 ? "sodam.jeong@example.invalid" : "user" + (i + 1) + "@example.invalid",
    departmentId: departments[Math.floor(i / 3)].id, title: i % 3 === 0 ? "수석" : "선임",
    role: i === 0 || i === 15 ? "super_admin" : i === 1 || i % 3 === 0 ? "department_admin" : "user",
    status: i === 16 ? "invited" : i === 17 ? "locked" : "active", lastSeenAt: i === 16 ? null : ADMIN_DEMO_TIME, deletedAt: null }));
}
export const ADMIN_DIRECTORY: readonly AdminDirectoryEntry[] = [
  ...users().map(({ id, name, email, departmentId, title }) => ({ id, name, email, departmentId, title, registeredUserId: id })),
  ...departments.map((department, i) => ({ id: "dir-0" + (i + 1), name: "신규 구성원 " + (i + 1), email: "new" + (i + 1) + "@example.invalid", departmentId: department.id, title: "연구원", registeredUserId: null })),
];
type SeedSelf = Pick<AdminUser, "name" | "email" | "departmentId" | "role">;

export function createAdminSeed(self?: SeedSelf): AdminStoreState {
  const userRows = users();
  if (self) userRows[0] = { ...userRows[0], ...self };
  const state: AdminStoreState = {
    assets: { records: [], skillRevisions: [], templateRevisions: [] },
    revision: 1, permissionRevision: 1, logicalNow: ADMIN_DEMO_TIME, departments: structuredClone(departments), users: userRows,
    groups: [
      { ...record("g-ai"), name: "AI 제안팀", memberIds: userRows.slice(0, 3).filter((u) => u.departmentId !== null).map((u) => u.id), ownerId: "u-self", deletedAt: null },
      { ...record("g-review"), name: "통합 검토팀", memberIds: userRows.filter((u, i) => i % 3 === 0 && u.departmentId !== null).map((u) => u.id), ownerId: "u-self", deletedAt: null },
      { ...record("g-edu"), name: "교육 제안팀", memberIds: userRows.slice(15).map((u) => u.id), ownerId: "u-self", deletedAt: null },
    ],
    models: [
      { id: "m-reason", name: "Gemini 2.5 Pro (예시)", provider: "Google" },
      { id: "m-write", name: "Claude 3.7 Sonnet (예시)", provider: "Anthropic" },
      { id: "m-light", name: "GPT-4o (예시)", provider: "OpenAI" },
    ],
    prices: [
      { ...record("p-reason"), modelId: "m-reason", inputUsdMicrosPerMillion: 2_000_000, outputUsdMicrosPerMillion: 8_000_000 },
      { ...record("p-write"), modelId: "m-write", inputUsdMicrosPerMillion: 3_000_000, outputUsdMicrosPerMillion: 12_000_000 },
      { ...record("p-light"), modelId: "m-light", inputUsdMicrosPerMillion: 500_000, outputUsdMicrosPerMillion: 2_000_000 },
    ],
    settings: { version: 1, updatedAt: createdAt, modelByJob: { analysis: "m-reason", checklist: "m-reason", quality: "m-reason", search: "m-light", slides: "m-write" },
      krwMicrosPerUsd: 1_400_000_000, monthlyTokenLimit: 2_000_000, defaultPersonalLimit: 100_000, warningPercents: [70, 90] },
    accounts: userRows.map((user, i) => ({ ...record("account-" + user.id), userId: user.id, month: "2026-10",
      limitTokens: i === 0 ? 100000 : [15000, 30000, 100000][(i + 1) % 3] + (i === 4 ? 20000 : 0), paused: i === 9 })),
    requests: [], usages: [], audits: [], rfps: [], roleGrants: structuredClone([...DEFAULT_ROLE_GRANTS]),
  };
  function addUsage(user: AdminUser, tokens: number, occurredAt: string, feature: UsageFeature, modelIndex: number, projectId: string | null) {
    const id = "usage-" + (state.usages.length + 1), inputTokens = Math.floor(tokens * 0.7), outputTokens = tokens - inputTokens;
    state.usages.push({ id, userId: user.id, userName: user.name, departmentId: user.departmentId, modelId: state.models[modelIndex].id,
      projectId, feature, occurredAt, inputTokens, outputTokens,
      cost: calculateCost({ inputTokens, outputTokens, price: state.prices[modelIndex], krwMicrosPerUsd: state.settings.krwMicrosPerUsd, capturedAt: occurredAt }) });
    state.audits.push({ id: "audit-" + id, occurredAt, actorId: user.id, actorName: user.name, actorEmail: user.email, departmentId: user.departmentId,
      action: "generate", resource: "usage", detail: feature, targetId: projectId ?? "outside", targetLabel: TOKEN_PROJECT_OPTIONS.find((p) => p.id === projectId)?.name ?? "프로젝트 외 사용",
      outcome: "success", failureReason: null, requestId: "req-" + id, usageId: id, tokens, ip: "192.0.2.1", userAgent: "예시 브라우저" });
  }
  const allocation = allocateSelfUsage({ dailyTokens: TOKEN_USAGE_SNAPSHOT.daily.map((day) => day.tokens),
    projects: TOKEN_USAGE_SNAPSHOT.byProject.map((p) => ({ id: p.id === "outside" ? null : p.id, tokens: p.tokens })),
    features: [{ id: "rfp", tokens: 15928 }, { id: "draft", tokens: 23168 }, { id: "polish", tokens: 13032 }, { id: "slides", tokens: 11584 }, { id: "review", tokens: 8688 }] });
  allocation.forEach((piece, i) => addUsage(userRows[0], piece.tokens,
    new Date(Date.parse("2026-10-" + String(piece.day).padStart(2, "0") + "T08:00:00+09:00") + i * 1000).toISOString(),
    piece.feature, ["rfp", "review"].includes(piece.feature) ? 0 : piece.feature === "polish" ? 2 : 1, piece.projectId));
  const features: UsageFeature[] = ["rfp", "draft", "polish", "slides", "review"];
  userRows.slice(1).forEach((user, index) => {
    if (user.status === "invited") return;
    for (let j = 0; j < 30; j++) addUsage(user, ((index + 2 + j) % 9 + 1) * 700,
      new Date(Date.parse(ADMIN_DEMO_TIME) - j * 3 * 86400000 - 2 * 3600000 + index * 1000).toISOString(), features[j % 5], j % 3, ["mois", "edu", "sample"][j % 3]);
  });
  [1, 7, 10, 4].forEach((index, i) => {
    const user = userRows[index];
    state.requests.push({ ...record("request-" + (i + 1)), createdAt: "2026-10-18T00:00:00.000Z", updatedAt: "2026-10-19T00:00:00.000Z",
      requesterId: user.id, requesterName: user.name, departmentId: user.departmentId, month: "2026-10", projectId: "mois",
      amountTokens: [50000, 30000, 20000, 20000][i], reason: "제안서 검토와 재작성", status: i === 3 ? "approved" : "pending",
      processedBy: i === 3 ? "u-self" : null, processedAt: i === 3 ? "2026-10-19T00:00:00.000Z" : null });
  });
  const statuses: RfpStatus[] = ["review", "writing", "submitted", "won", "lost", "dropped"];
  for (let i = 0; i < 36; i++) {
    const department = departments[i % 6];
    state.rfps.push({ id: i < 3 ? ["mois", "edu", "sample"][i] : "rfp-" + String(i + 1).padStart(2, "0"), number: "KPC-2026-" + String(i + 1).padStart(3, "0"),
      name: i < 3 ? TOKEN_PROJECT_OPTIONS[i].name : department.name + " 디지털 전환 사업 " + (i + 1), departmentId: department.id,
      pmId: userRows.find((u) => u.departmentId === department.id && u.status === "active")?.id ?? "u-self",
      registeredAt: new Date(Date.parse("2026-04-01T00:00:00.000Z") + Math.floor(i * 202 / 35) * 86400000).toISOString(),
      budgetKrw: 100000000 + (i % 9) * 25000000, status: statuses[Math.floor(i / 6) % 6] });
  }
  for (let i = 0; i < 20; i++) {
    const user = userRows[i % 16], failure = i % 5 === 0;
    state.audits.push({ id: "audit-manual-" + i, occurredAt: new Date(Date.parse(ADMIN_DEMO_TIME) - (i + 1) * 86400000).toISOString(),
      actorId: user.id, actorName: user.name, actorEmail: user.email, departmentId: i % 7 === 0 ? null : user.departmentId,
      action: i % 3 === 0 ? "create" : i % 3 === 1 ? "update" : "export", resource: i % 7 === 0 ? "modelSettings" : i % 2 === 0 ? "rfp" : "document",
      detail: "예시 작업 이력", targetId: "mois", targetLabel: "AI 행정 에이전트", outcome: failure ? "failure" : "success", failureReason: failure ? "예시 처리 시간 초과" : null,
      requestId: "req-manual-" + i, usageId: null, tokens: 0, ip: "192.0.2.1", userAgent: "예시 브라우저" });
  }
  state.assets = createAssetSeed(state);
  return AdminStoreStateSchema.parse(state);
}
