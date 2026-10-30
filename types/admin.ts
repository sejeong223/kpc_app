import type { AssetDataService } from "@/types/admin-assets";
export type { AdminRole, CrudAction, AdminResource, UserStatus, RequestStatus, JobKind, UsageFeature, RfpStatus, AuditAction, AuditResource, AdminRecord, AdminDepartment, AdminUser, AdminDirectoryEntry, AdminGroup, AdminGroupRow, AdminModel, AdminPrice, CostSnapshot, AdminUsage, AdminTokenAccount, AdminTokenRequest, AdminAuditEvent, AdminRfp, AdminRfpRow, RoleGrants, AdminSettings, AdminActor, AdminStoreState, NewAdminUser, EditAdminUser, GroupDraft, VersionedRef, Period, PageInput, MoneyTotal, UserQuery, GroupQuery, AuditSortKey, AuditQuery, TokenQuery, DashboardQuery, UserList, TokenAccountRow, ModelCostRow, TokenOverview, TokenPolicyView, ModelSettingsView, PricingView, SelfUsageView, AuditList, TrendPoint, NamedCount, DashboardView, AdminAccessView, AdminErrorCode, AdminCommand, CommandReceipt, PageResult } from "@/lib/admin/schemas";
import type { AdminDirectoryEntry, AdminGroupRow, AdminTokenRequest, RoleGrants, AdminActor, UserQuery, GroupQuery, AuditQuery, TokenQuery, DashboardQuery, UserList, TokenOverview, ModelSettingsView, PricingView, SelfUsageView, AuditList, DashboardView, AdminAccessView, AdminCommand, CommandReceipt, PageResult } from "@/lib/admin/schemas";

export interface AdminDataService extends AssetDataService {
  getAccess(actor: AdminActor): Promise<AdminAccessView>;
  getUsers(actor: AdminActor, query: UserQuery): Promise<UserList>;
  getGroups(actor: AdminActor, query: GroupQuery): Promise<PageResult<AdminGroupRow>>;
  getDirectory(actor: AdminActor): Promise<AdminDirectoryEntry[]>;
  getRoleGrants(actor: AdminActor): Promise<RoleGrants[]>;
  getModels(actor: AdminActor): Promise<ModelSettingsView>;
  getPricing(actor: AdminActor): Promise<PricingView>;
  getTokenRequests(actor: AdminActor): Promise<AdminTokenRequest[]>;
  getTokens(actor: AdminActor, query: TokenQuery): Promise<TokenOverview>;
  getSelf(actor: AdminActor): Promise<SelfUsageView>;
  getAudit(actor: AdminActor, query: AuditQuery): Promise<AuditList>;
  getDashboard(actor: AdminActor, query: DashboardQuery): Promise<DashboardView>;
  exportUsers(actor: AdminActor, query: UserQuery): Promise<string>;
  exportAudit(actor: AdminActor, query: AuditQuery): Promise<string>;
  execute(actor: AdminActor, command: AdminCommand): Promise<CommandReceipt>;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
