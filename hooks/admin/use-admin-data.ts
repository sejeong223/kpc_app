"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { AdminDataError } from "@/lib/admin/errors";
import { adminQueryKey, type AdminQueryFilter } from "@/lib/admin/query-keys";
import type { AdminAccessView, AdminCommand, AdminResource, AuditQuery, CommandReceipt, DashboardQuery, GroupQuery, TokenQuery, UserQuery } from "@/types/admin";

export function useAdminAccess() {
  const { actor, service, revision, access } = useAdminRuntime();
  return useQuery<AdminAccessView, AdminDataError>({ queryKey: adminQueryKey({ actor, revision, kind: "access" }), queryFn: () => service.getAccess(actor), initialData: access ?? undefined, enabled: typeof window !== "undefined" });
}
function useAdminQuery<T>(kind: string, queryFn: () => Promise<T>, resource?: AdminResource, filter?: AdminQueryFilter) {
  const { actor, revision } = useAdminRuntime(), access = useAdminAccess();
  const allowed = Boolean(access.data && (!resource || access.data.grants[resource].read));
  return useQuery<T, AdminDataError>({ queryKey: adminQueryKey({ actor, revision, kind, filter }), queryFn,
    enabled: typeof window !== "undefined" && allowed,
    meta: { permissionRevision: access.data?.permissionRevision },
    // 동일한 조회만 갱신 중 표시를 유지한다. 역할·부서·권한·필터가 달라지면 즉시 폐기한다.
    placeholderData: (previous, previousQuery) => allowed && previousQuery?.meta?.permissionRevision === access.data?.permissionRevision && previousQuery?.queryKey[1] === actor.userId
      && previousQuery.queryKey[2] === actor.role && previousQuery.queryKey[3] === actor.departmentId
      && previousQuery.queryKey[5] === kind && JSON.stringify(previousQuery.queryKey[6]) === JSON.stringify(filter ?? null) ? previous : undefined,
  });
}
export function useAdminUsers(q: UserQuery) { const { actor, service } = useAdminRuntime(); return useAdminQuery("users", () => service.getUsers(actor, q), "users", q); }
export function useAdminGroups(q: GroupQuery) { const { actor, service } = useAdminRuntime(); return useAdminQuery("groups", () => service.getGroups(actor, q), "groups", q); }
export function useAdminDirectory() { const { actor, service } = useAdminRuntime(); return useAdminQuery("directory", () => service.getDirectory(actor), actor.role === "super_admin" ? "users" : "permissions"); }
export function useAdminGrants() { const { actor, service } = useAdminRuntime(); return useAdminQuery("grants", () => service.getRoleGrants(actor), "permissions"); }
export function useAdminModels() { const { actor, service } = useAdminRuntime(); return useAdminQuery("models", () => service.getModels(actor), "modelSettings"); }
export function useAdminPricing() { const { actor, service } = useAdminRuntime(); return useAdminQuery("pricing", () => service.getPricing(actor), "pricing"); }
export function useAdminRequests() { const { actor, service } = useAdminRuntime(); return useAdminQuery("requests", () => service.getTokenRequests(actor), "tokenRequests"); }
export function useAdminTokens(q: TokenQuery) { const { actor, service } = useAdminRuntime(); return useAdminQuery("tokens", () => service.getTokens(actor, q), "tokenPolicies", q); }
export function useAdminSelf() { const { actor, service } = useAdminRuntime(); return useAdminQuery("self", () => service.getSelf(actor)); }
export function useAdminAudit(q: AuditQuery) { const { actor, service } = useAdminRuntime(); return useAdminQuery("audit", () => service.getAudit(actor, q), "audit", q); }
export function useAdminDashboard(q: DashboardQuery) { const { actor, service } = useAdminRuntime(); return useAdminQuery("dashboard", () => service.getDashboard(actor, q), "dashboard", q); }
export function useAdminCommand() { const { actor, service } = useAdminRuntime(); return useMutation<CommandReceipt, AdminDataError, AdminCommand>({ mutationFn: (command) => service.execute(actor, command) }); }
export function useExportUsers() { const { actor, service } = useAdminRuntime(); return useMutation<string, AdminDataError, UserQuery>({ mutationFn: (q) => service.exportUsers(actor, q) }); }
export function useExportAudit() { const { actor, service } = useAdminRuntime(); return useMutation<string, AdminDataError, AuditQuery>({ mutationFn: (q) => service.exportAudit(actor, q) }); }
