import type { AdminActor, AdminRole, AuditQuery, DashboardQuery, GroupQuery, TokenQuery, UserQuery } from "@/types/admin";
import type { Query, QueryClient } from "@tanstack/react-query";
import type { AssetQuery } from "@/types/admin-assets";
export type AdminQueryFilter = UserQuery | GroupQuery | TokenQuery | AuditQuery | DashboardQuery | AssetQuery | {assetId:string} | {workId:string;workRevision:number} | {fileRefId:string;assetId:string|null};
export function adminQueryKey(input: { actor: AdminActor; revision: number; kind: string; filter?: AdminQueryFilter }): readonly ["admin-mock", string, AdminRole, string | null, number, string, AdminQueryFilter | null] {
  return ["admin-mock", input.actor.userId, input.actor.role, input.actor.departmentId, input.revision, input.kind, input.filter ?? null];
}
export async function retireAdminQueries(client: QueryClient, actor: AdminActor, revision: number): Promise<void> {
  const filter = { predicate: (query: Query) => query.queryKey[0] === "admin-mock" && (query.queryKey[1] !== actor.userId || query.queryKey[2] !== actor.role || query.queryKey[3] !== actor.departmentId || query.queryKey[4] !== revision) };
  // 취소를 기다리는 동안 생성된 새 쿼리나 다시 관찰 중인 쿼리는 제거하지 않는다.
  const retired = new Set(client.getQueryCache().findAll(filter));
  await client.cancelQueries(filter);
  client.removeQueries({ predicate: (query) => retired.has(query) && !query.isActive() });
}
