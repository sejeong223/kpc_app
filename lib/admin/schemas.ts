import { z } from "zod";
const IdSchema = z.string().trim().min(1).max(120);
const NameSchema = z.string().trim().min(1).max(80);
const EmailSchema = z.string().trim().toLowerCase().max(254).email();
const IsoSchema = z.iso.datetime();
const MoneySchema = z.string().regex(/^(0|[1-9][0-9]*)$/);
const TokenSchema = z.number().int().min(0).max(1_000_000_000);
const RateSchema = z.number().int().min(0).max(1_000_000_000);
const FxSchema = z.number().int().min(1).max(10_000_000_000);
const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const DaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(s + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "존재하지 않는 날짜입니다.");
const WarningSchema = z.tuple([z.number().int().min(1).max(99), z.number().int().min(1).max(99)])
  .refine(([a, b]) => a < b, "경고 기준은 오름차순이어야 합니다.");
function PageResultSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({ items: z.array(item), total: z.number().int().nonnegative(), page: z.number().int().min(1),
    pageSize: z.number().int().positive(), totalPages: z.number().int().min(1) });
}
export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number; totalPages: number }
export const AdminRoleSchema = z.union([z.literal("super_admin"), z.literal("department_admin"), z.literal("user")]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const CrudActionSchema = z.union([z.literal("create"), z.literal("read"), z.literal("update"), z.literal("delete")]);
export type CrudAction = z.infer<typeof CrudActionSchema>;

export const AdminResourceSchema = z.union([z.literal("users"), z.literal("groups"), z.literal("modelSettings"), z.literal("pricing"), z.literal("tokenPolicies"), z.literal("tokenRequests"), z.literal("dashboard"), z.literal("audit"), z.literal("permissions")]);
export type AdminResource = z.infer<typeof AdminResourceSchema>;

export const UserStatusSchema = z.union([z.literal("active"), z.literal("invited"), z.literal("locked")]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const RequestStatusSchema = z.union([z.literal("pending"), z.literal("approved"), z.literal("rejected")]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const JobKindSchema = z.union([z.literal("analysis"), z.literal("checklist"), z.literal("search"), z.literal("slides"), z.literal("quality")]);
export type JobKind = z.infer<typeof JobKindSchema>;

export const UsageFeatureSchema = z.union([z.literal("rfp"), z.literal("draft"), z.literal("polish"), z.literal("slides"), z.literal("review")]);
export type UsageFeature = z.infer<typeof UsageFeatureSchema>;

export const RfpStatusSchema = z.union([z.literal("review"), z.literal("writing"), z.literal("submitted"), z.literal("won"), z.literal("lost"), z.literal("dropped")]);
export type RfpStatus = z.infer<typeof RfpStatusSchema>;

export const AuditActionSchema = z.union([z.literal("create"), z.literal("read"), z.literal("update"), z.literal("delete"), z.literal("approve"), z.literal("reject"), z.literal("export"), z.literal("generate"), z.literal("restore")]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditResourceSchema = z.union([AdminResourceSchema, z.literal("rfp"), z.literal("document"), z.literal("usage")]);
export type AuditResource = z.infer<typeof AuditResourceSchema>;

export const AdminRecordSchema = z.strictObject({
  id: IdSchema,
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  createdAt: IsoSchema,
  updatedAt: IsoSchema,
});
export type AdminRecord = z.infer<typeof AdminRecordSchema>;

export const AdminDepartmentSchema = z.strictObject({
  id: IdSchema,
  name: NameSchema,
});
export type AdminDepartment = z.infer<typeof AdminDepartmentSchema>;

export const AdminUserSchema = AdminRecordSchema.safeExtend(z.strictObject({
  name: NameSchema,
  email: EmailSchema,
  departmentId: IdSchema.nullable(),
  title: z.string().trim().min(1).max(40),
  role: AdminRoleSchema,
  status: UserStatusSchema,
  lastSeenAt: IsoSchema.nullable(),
  deletedAt: IsoSchema.nullable(),
}).shape);
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const AdminDirectoryEntrySchema = AdminUserSchema.pick({"id": true, "name": true, "email": true, "departmentId": true, "title": true}).safeExtend(z.strictObject({
  registeredUserId: IdSchema.nullable(),
}).shape);
export type AdminDirectoryEntry = z.infer<typeof AdminDirectoryEntrySchema>;

export const AdminGroupSchema = AdminRecordSchema.safeExtend(z.strictObject({
  name: NameSchema,
  memberIds: z.array(IdSchema).max(500).refine((ids) => new Set(ids).size === ids.length, "중복된 사용자입니다."),
  ownerId: IdSchema,
  deletedAt: IsoSchema.nullable(),
}).shape);
export type AdminGroup = z.infer<typeof AdminGroupSchema>;

export const AdminGroupRowSchema = AdminGroupSchema.safeExtend(z.strictObject({
  ownerName: z.string(),
  members: z.array(z.strictObject({
  id: IdSchema,
  name: NameSchema,
  departmentName: z.string(),
})),
}).shape);
export type AdminGroupRow = z.infer<typeof AdminGroupRowSchema>;

export const AdminModelSchema = z.strictObject({
  id: IdSchema,
  name: NameSchema,
  provider: z.string(),
});
export type AdminModel = z.infer<typeof AdminModelSchema>;

export const AdminPriceSchema = AdminRecordSchema.safeExtend(z.strictObject({
  modelId: IdSchema,
  inputUsdMicrosPerMillion: RateSchema,
  outputUsdMicrosPerMillion: RateSchema,
}).shape);
export type AdminPrice = z.infer<typeof AdminPriceSchema>;

export const CostSnapshotSchema = z.strictObject({
  priceId: IdSchema,
  priceVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  inputUsdMicrosPerMillion: RateSchema,
  outputUsdMicrosPerMillion: RateSchema,
  krwMicrosPerUsd: FxSchema,
  capturedAt: IsoSchema,
  amountUsdMicros: MoneySchema,
  amountKrwMicros: MoneySchema,
});
export type CostSnapshot = z.infer<typeof CostSnapshotSchema>;

export const AdminUsageSchema = z.strictObject({
  id: IdSchema,
  userId: IdSchema,
  userName: NameSchema,
  departmentId: IdSchema.nullable(),
  modelId: IdSchema,
  projectId: IdSchema.nullable(),
  feature: UsageFeatureSchema,
  occurredAt: IsoSchema,
  inputTokens: TokenSchema,
  outputTokens: TokenSchema,
  cost: CostSnapshotSchema,
});
export type AdminUsage = z.infer<typeof AdminUsageSchema>;

export const AdminTokenAccountSchema = AdminRecordSchema.safeExtend(z.strictObject({
  userId: IdSchema,
  month: MonthSchema,
  limitTokens: TokenSchema.min(1000),
  paused: z.boolean(),
}).shape);
export type AdminTokenAccount = z.infer<typeof AdminTokenAccountSchema>;

export const AdminTokenRequestSchema = AdminRecordSchema.safeExtend(z.strictObject({
  requesterId: IdSchema,
  requesterName: NameSchema,
  departmentId: IdSchema.nullable(),
  month: MonthSchema,
  projectId: IdSchema.nullable(),
  amountTokens: TokenSchema.min(1000).multipleOf(1000),
  reason: z.string().trim().min(2).max(1000),
  status: RequestStatusSchema,
  processedBy: IdSchema.nullable(),
  processedAt: IsoSchema.nullable(),
}).shape).refine((r) => r.status === "pending" ? r.processedAt === null && r.processedBy === null : r.processedAt !== null && r.processedBy !== null, "처리 상태가 일치하지 않습니다.");
export type AdminTokenRequest = z.infer<typeof AdminTokenRequestSchema>;

export const AdminAuditEventSchema = z.strictObject({
  id: IdSchema,
  occurredAt: IsoSchema,
  actorId: IdSchema,
  actorName: NameSchema,
  actorEmail: EmailSchema,
  departmentId: IdSchema.nullable(),
  action: AuditActionSchema,
  resource: AuditResourceSchema,
  detail: z.string(),
  targetId: IdSchema,
  targetLabel: z.string(),
  outcome: z.union([z.literal("success"), z.literal("failure")]),
  failureReason: z.union([z.string(), z.null()]),
  requestId: z.string(),
  usageId: IdSchema.nullable(),
  tokens: TokenSchema,
  ip: z.string(),
  userAgent: z.string(),
});
export type AdminAuditEvent = z.infer<typeof AdminAuditEventSchema>;

export const AdminRfpSchema = z.strictObject({
  id: IdSchema,
  number: z.string(),
  name: NameSchema,
  departmentId: IdSchema.nullable(),
  pmId: IdSchema,
  registeredAt: IsoSchema,
  budgetKrw: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  status: RfpStatusSchema,
});
export type AdminRfp = z.infer<typeof AdminRfpSchema>;

export const AdminRfpRowSchema = AdminRfpSchema.safeExtend(z.strictObject({
  pmName: z.string(),
  departmentName: z.string(),
}).shape);
export type AdminRfpRow = z.infer<typeof AdminRfpRowSchema>;

export const RoleGrantsSchema = z.strictObject({
  role: AdminRoleSchema,
  grants: z.record(AdminResourceSchema, z.record(CrudActionSchema, z.boolean())),
});
export type RoleGrants = z.infer<typeof RoleGrantsSchema>;

export const AdminSettingsSchema = z.strictObject({
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  updatedAt: IsoSchema,
  modelByJob: z.record(JobKindSchema, z.string()),
  krwMicrosPerUsd: FxSchema,
  monthlyTokenLimit: TokenSchema.min(1000),
  defaultPersonalLimit: TokenSchema.min(1000),
  warningPercents: WarningSchema,
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

export const AdminActorSchema = z.strictObject({
  userId: IdSchema,
  name: NameSchema,
  email: EmailSchema,
  role: AdminRoleSchema,
  departmentId: IdSchema.nullable(),
});
export type AdminActor = z.infer<typeof AdminActorSchema>;

export const AdminStoreStateSchema = z.strictObject({
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  permissionRevision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  logicalNow: IsoSchema,
  departments: z.array(AdminDepartmentSchema),
  users: z.array(AdminUserSchema),
  groups: z.array(AdminGroupSchema),
  models: z.array(AdminModelSchema),
  prices: z.array(AdminPriceSchema),
  settings: AdminSettingsSchema,
  accounts: z.array(AdminTokenAccountSchema),
  requests: z.array(AdminTokenRequestSchema),
  usages: z.array(AdminUsageSchema),
  audits: z.array(AdminAuditEventSchema),
  rfps: z.array(AdminRfpSchema),
  roleGrants: z.array(RoleGrantsSchema),
});
export type AdminStoreState = z.infer<typeof AdminStoreStateSchema>;

export const NewAdminUserSchema = AdminUserSchema.pick({"name": true, "email": true, "departmentId": true, "title": true, "role": true}).extend(z.strictObject({
  invite: z.boolean(),
}).shape).extend({ invite: z.boolean().default(true), role: AdminRoleSchema.default("user") });
export type NewAdminUser = z.infer<typeof NewAdminUserSchema>;

export const EditAdminUserSchema = AdminUserSchema.pick({"name": true, "departmentId": true, "title": true, "role": true});
export type EditAdminUser = z.infer<typeof EditAdminUserSchema>;

export const GroupDraftSchema = AdminGroupSchema.pick({"name": true, "memberIds": true});
export type GroupDraft = z.infer<typeof GroupDraftSchema>;

export const VersionedRefSchema = z.strictObject({
  id: IdSchema,
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});
export type VersionedRef = z.infer<typeof VersionedRefSchema>;

export const PeriodSchema = z.strictObject({
  from: DaySchema,
  to: DaySchema,
}).refine((p) => p.from <= p.to && p.to <= "2026-10-20", "조회 기간이 올바르지 않습니다.");
export type Period = z.infer<typeof PeriodSchema>;

export const PageInputSchema = z.strictObject({
  page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
});
export type PageInput = z.infer<typeof PageInputSchema>;

export const MoneyTotalSchema = z.strictObject({
  usdMicros: MoneySchema,
  krwMicros: MoneySchema,
});
export type MoneyTotal = z.infer<typeof MoneyTotalSchema>;

export const UserQuerySchema = PageInputSchema.safeExtend(z.strictObject({
  search: z.string().trim().max(254),
  departmentId: IdSchema.nullable(),
  role: z.union([AdminRoleSchema, z.literal("all")]),
  status: z.union([UserStatusSchema, z.literal("all")]),
}).shape);
export type UserQuery = z.infer<typeof UserQuerySchema>;

export const GroupQuerySchema = PageInputSchema.safeExtend(z.strictObject({
  search: z.string().trim().max(254),
}).shape);
export type GroupQuery = z.infer<typeof GroupQuerySchema>;

export const AuditSortKeySchema = z.union([z.literal("occurredAt"), z.literal("actorName"), z.literal("action"), z.literal("resource"), z.literal("tokens"), z.literal("outcome")]);
export type AuditSortKey = z.infer<typeof AuditSortKeySchema>;

export const AuditQuerySchema = PeriodSchema.safeExtend(PageInputSchema.safeExtend(z.strictObject({
  userSearch: z.string().trim().max(254),
  targetSearch: z.string().trim().max(254),
  action: z.union([AuditActionSchema, z.literal("all")]),
  resource: z.union([AuditResourceSchema, z.literal("all")]),
  outcome: z.union([z.literal("all"), z.literal("success"), z.literal("failure")]),
  sortKey: AuditSortKeySchema,
  direction: z.union([z.literal("asc"), z.literal("desc")]),
}).shape).shape).refine((p) => p.from <= p.to && p.to <= "2026-10-20", "조회 기간이 올바르지 않습니다.");
export type AuditQuery = z.infer<typeof AuditQuerySchema>;

export const TokenQuerySchema = PeriodSchema.safeExtend(z.strictObject({
  month: MonthSchema,
  search: z.string().trim().max(254),
  departmentId: IdSchema.nullable(),
  status: z.union([z.literal("all"), z.literal("normal"), z.literal("warning"), z.literal("over"), z.literal("paused")]),
}).shape).refine((p) => p.from <= p.to && p.to <= "2026-10-20", "조회 기간이 올바르지 않습니다.");
export type TokenQuery = z.infer<typeof TokenQuerySchema>;

export const DashboardQuerySchema = PeriodSchema.safeExtend(z.strictObject({
  rfpStatus: z.union([RfpStatusSchema, z.literal("all"), z.literal("progress")]),
  bucketStart: z.union([z.string(), z.null()]),
  userSearch: z.string().trim().max(254),
  rfpPage: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
}).shape).refine((p) => p.from <= p.to && p.to <= "2026-10-20", "조회 기간이 올바르지 않습니다.");
export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

export const UserListSchema = z.strictObject({
  rows: PageResultSchema(AdminUserSchema),
  departments: z.array(AdminDepartmentSchema),
  roleCounts: z.record(z.union([AdminRoleSchema, z.literal("all")]), z.number().finite()),
  statusCounts: z.record(UserStatusSchema, z.number().finite()),
});
export type UserList = z.infer<typeof UserListSchema>;

export const TokenAccountRowSchema = z.strictObject({
  id: IdSchema,
  userId: IdSchema,
  name: NameSchema,
  departmentId: IdSchema.nullable(),
  departmentName: z.string(),
  title: z.string().trim().min(1).max(40),
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  usedTokens: TokenSchema,
  limitTokens: TokenSchema.min(1000),
  paused: z.boolean(),
  status: z.union([z.literal("normal"), z.literal("warning"), z.literal("over"), z.literal("paused")]),
});
export type TokenAccountRow = z.infer<typeof TokenAccountRowSchema>;

export const ModelCostRowSchema = MoneyTotalSchema.safeExtend(z.strictObject({
  id: IdSchema,
  modelName: z.string(),
  inputTokens: TokenSchema,
  outputTokens: TokenSchema,
}).shape);
export type ModelCostRow = z.infer<typeof ModelCostRowSchema>;

export const TokenPolicyViewSchema = AdminSettingsSchema.pick({"version": true, "updatedAt": true, "monthlyTokenLimit": true, "defaultPersonalLimit": true, "warningPercents": true});
export type TokenPolicyView = z.infer<typeof TokenPolicyViewSchema>;

export const TokenOverviewSchema = z.strictObject({
  rows: z.array(TokenAccountRowSchema),
  departments: z.array(AdminDepartmentSchema),
  byDepartment: z.array(z.strictObject({
  id: IdSchema,
  name: NameSchema,
  usedTokens: TokenSchema,
  userCount: z.number().finite(),
})),
  usedTokens: TokenSchema,
  personalLimitsTotal: z.number().finite(),
  models: z.array(ModelCostRowSchema),
  cost: MoneyTotalSchema,
  settings: z.union([TokenPolicyViewSchema, z.null()]),
});
export type TokenOverview = z.infer<typeof TokenOverviewSchema>;

export const ModelSettingsViewSchema = AdminSettingsSchema.pick({"version": true, "updatedAt": true, "modelByJob": true}).safeExtend(z.strictObject({
  models: z.array(AdminModelSchema),
}).shape);
export type ModelSettingsView = z.infer<typeof ModelSettingsViewSchema>;

export const PricingViewSchema = AdminSettingsSchema.pick({"version": true, "updatedAt": true, "krwMicrosPerUsd": true}).safeExtend(z.strictObject({
  models: z.array(AdminModelSchema),
  prices: z.array(AdminPriceSchema),
}).shape);
export type PricingView = z.infer<typeof PricingViewSchema>;

export const SelfUsageViewSchema = z.strictObject({
  usedTokens: TokenSchema,
  limitTokens: TokenSchema.min(1000),
  paused: z.boolean(),
  warningPercent: z.number().finite(),
  requests: z.array(AdminTokenRequestSchema),
  usage: z.array(AdminUsageSchema),
  month: MonthSchema,
  from: DaySchema,
  to: DaySchema,
  elapsedDays: z.number().finite(),
  daysInMonth: z.number().finite(),
});
export type SelfUsageView = z.infer<typeof SelfUsageViewSchema>;

export const AuditListSchema = z.strictObject({
  rows: PageResultSchema(AdminAuditEventSchema),
  successCount: z.number().finite(),
  failureCount: z.number().finite(),
  actions: z.array(AuditActionSchema),
  resources: z.array(AuditResourceSchema),
});
export type AuditList = z.infer<typeof AuditListSchema>;

export const TrendPointSchema = z.strictObject({
  id: IdSchema,
  label: z.string(),
  activities: z.number().finite(),
  activeUsers: z.number().finite(),
  generations: z.number().finite(),
  downloads: z.number().finite(),
  tokens: TokenSchema,
  cost: MoneyTotalSchema,
});
export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const NamedCountSchema = z.strictObject({
  id: IdSchema,
  label: z.string(),
  count: z.number().finite(),
  failures: z.number().finite(),
});
export type NamedCount = z.infer<typeof NamedCountSchema>;

export const DashboardViewSchema = z.strictObject({
  period: PeriodSchema,
  activityPeriod: z.union([PeriodSchema, z.null()]),
  activityCapped: z.boolean(),
  rfpCounts: z.record(RfpStatusSchema, z.number().finite()),
  totalRfps: z.number().finite(),
  activities: z.number().finite(),
  activeUsers: z.number().finite(),
  generations: z.number().finite(),
  downloads: z.number().finite(),
  tokens: TokenSchema,
  cost: MoneyTotalSchema,
  registrations: z.array(z.strictObject({
  id: IdSchema,
  label: z.string(),
  from: DaySchema,
  to: DaySchema,
  count: z.number().finite(),
})),
  distribution: z.record(RfpStatusSchema, z.number().finite()),
  selectedRfpCount: z.number().finite(),
  wonBudgetKrw: z.number().finite(),
  departments: z.array(z.strictObject({
  id: IdSchema,
  name: NameSchema,
  counts: z.record(RfpStatusSchema, z.number().finite()),
  total: z.number().finite(),
  wonBudgetKrw: z.number().finite(),
})),
  rfps: PageResultSchema(AdminRfpRowSchema),
  trends: z.array(TrendPointSchema),
  actions: z.array(NamedCountSchema),
  resources: z.array(NamedCountSchema),
  details: z.array(NamedCountSchema),
  users: z.array(z.strictObject({
  id: IdSchema,
  name: NameSchema,
  departmentName: z.string(),
  activities: z.number().finite(),
  rfpCreates: z.number().finite(),
  sectionWrites: z.number().finite(),
  generations: z.number().finite(),
  downloads: z.number().finite(),
  failures: z.number().finite(),
  tokens: TokenSchema,
  cost: MoneyTotalSchema,
})),
});
export type DashboardView = z.infer<typeof DashboardViewSchema>;

export const AdminAccessViewSchema = z.strictObject({
  actor: AdminActorSchema,
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  permissionRevision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  grants: z.record(AdminResourceSchema, z.record(CrudActionSchema, z.boolean())),
  departments: z.array(AdminDepartmentSchema),
  logicalNow: IsoSchema,
});
export type AdminAccessView = z.infer<typeof AdminAccessViewSchema>;

export const AdminErrorCodeSchema = z.union([z.literal("FORBIDDEN"), z.literal("NOT_FOUND"), z.literal("VALIDATION"), z.literal("CONFLICT"), z.literal("INACTIVE_USER")]);
export type AdminErrorCode = z.infer<typeof AdminErrorCodeSchema>;

export const AdminCommandSchema = z.union([z.strictObject({
  type: z.literal("create-user"),
  value: NewAdminUserSchema,
}), z.strictObject({
  type: z.literal("add-directory-users"),
  ids: z.array(z.string()),
  role: AdminRoleSchema,
  invite: z.boolean(),
}), z.strictObject({
  type: z.literal("update-user"),
  target: VersionedRefSchema,
  value: EditAdminUserSchema,
}), z.strictObject({
  type: z.literal("change-user-role"),
  targets: z.array(VersionedRefSchema),
  role: AdminRoleSchema,
}), z.strictObject({
  type: z.literal("set-user-status"),
  targets: z.array(VersionedRefSchema),
  status: z.union([z.literal("active"), z.literal("locked")]),
}), z.strictObject({
  type: z.literal("delete-users"),
  targets: z.array(VersionedRefSchema),
}), z.strictObject({
  type: z.literal("resend-invite"),
  target: VersionedRefSchema,
}), z.strictObject({
  type: z.literal("create-group"),
  value: GroupDraftSchema,
}), z.strictObject({
  type: z.literal("update-group"),
  target: VersionedRefSchema,
  value: GroupDraftSchema,
}), z.strictObject({
  type: z.literal("delete-group"),
  target: VersionedRefSchema,
}), z.strictObject({
  type: z.literal("undo-delete"),
  undoToken: IdSchema,
}), z.strictObject({
  type: z.literal("save-grants"),
  permissionRevision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  rows: z.array(RoleGrantsSchema),
}), z.strictObject({
  type: z.literal("save-model-defaults"),
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  value: z.record(JobKindSchema, z.string()),
}), z.strictObject({
  type: z.literal("save-price"),
  target: VersionedRefSchema,
  inputUsdMicrosPerMillion: RateSchema,
  outputUsdMicrosPerMillion: RateSchema,
}), z.strictObject({
  type: z.literal("save-fx"),
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  krwMicrosPerUsd: FxSchema,
}), z.strictObject({
  type: z.literal("save-token-policy"),
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  monthlyTokenLimit: TokenSchema.min(1000),
  defaultPersonalLimit: TokenSchema.min(1000),
  warningPercents: WarningSchema,
}), z.strictObject({
  type: z.literal("set-token-limit"),
  target: VersionedRefSchema,
  limitTokens: TokenSchema.min(1000),
}), z.strictObject({
  type: z.literal("set-token-paused"),
  target: VersionedRefSchema,
  paused: z.boolean(),
}), z.strictObject({
  type: z.literal("submit-token-request"),
  submissionId: IdSchema,
  projectId: IdSchema.nullable(),
  amountTokens: TokenSchema.min(1000).multipleOf(1000),
  reason: z.string().trim().min(2).max(1000),
}), z.strictObject({
  type: z.literal("process-token-request"),
  target: VersionedRefSchema,
  status: z.union([z.literal("approved"), z.literal("rejected")]),
})]);
export type AdminCommand = z.infer<typeof AdminCommandSchema>;

export const CommandReceiptSchema = z.strictObject({
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  changedIds: z.array(z.string()),
  createdRequest: z.union([AdminTokenRequestSchema, z.null()]),
  undoToken: z.union([z.string(), z.null()]),
});
export type CommandReceipt = z.infer<typeof CommandReceiptSchema>;
