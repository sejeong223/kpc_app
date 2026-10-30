import { AdminDataError } from "@/lib/admin/errors";
import { canPerform } from "@/lib/admin/permissions";
import { paginate } from "@/lib/admin/selectors";
import { assetResource, canReadAsset, ownsAsset } from "./permissions";
import type { AdminActor, AdminStoreState } from "@/types/admin";
import type { AssetDetail, AssetList, AssetQuery, AssetRecord, AssetRevision, AssetRow } from "@/types/admin-assets";

export function assetRevisions(state: AdminStoreState, asset: AssetRecord): AssetRevision[] {
  return (asset.kind === "skill" ? state.assets.skillRevisions : state.assets.templateRevisions).filter(row => row.assetId === asset.id);
}
export function currentAssetRevision(state: AdminStoreState, asset: AssetRecord): AssetRevision {
  const revision = assetRevisions(state, asset).find(row => row.revision === asset.currentRevision);
  if (!revision) throw new AdminDataError("NOT_FOUND", "자산 버전이 없습니다.");
  return revision;
}
export function assetRow(state: AdminStoreState, actor: AdminActor, asset: AssetRecord): AssetRow {
  const revision = currentAssetRevision(state, asset), resource = assetResource(asset.kind);
  const read = canReadAsset(state, actor, asset), owner = ownsAsset(actor, asset);
  return { ...asset, name: revision.name, short: revision.short, description: revision.description,
    ownerDepartmentName: state.departments.find(row => row.id === asset.ownerDepartmentId)?.name ?? "전사 소유",
    capabilities: { read, update: !asset.deletedAt && read && owner && canPerform(actor, state.roleGrants, resource, "update"),
      delete: !asset.deletedAt && read && owner && canPerform(actor, state.roleGrants, resource, "delete"),
      duplicate: !asset.deletedAt && read && canPerform(actor, state.roleGrants, resource, "create"), apply: !asset.deletedAt && read && asset.status === "active" } };
}
export function assetDetail(state: AdminStoreState, actor: AdminActor, asset: AssetRecord): AssetDetail {
  return { asset: assetRow(state, actor, asset), revision: currentAssetRevision(state, asset), history: assetRevisions(state, asset).sort((a, b) => b.revision - a.revision).map(({ id, revision, createdAt, createdBy }) => ({ id, revision, createdAt, createdBy })) };
}
export function selectAssets(state: AdminStoreState, actor: AdminActor, query: AssetQuery): AssetList {
  const search = query.search.toLocaleLowerCase("ko");
  const visible = state.assets.records.filter(asset => asset.kind === query.kind && !asset.deletedAt && canReadAsset(state, actor, asset)).map(asset => assetRow(state, actor, asset))
    .filter(row => [row.name, row.short, row.description].some(value => value.toLocaleLowerCase("ko").includes(search)))
    .filter(row => query.visibility === "all" || (query.visibility === "organization" ? row.visibility.all : !row.visibility.all && row.visibility.targets.some(target => target.type === query.visibility)));
  const filtered = visible.filter(row => query.status === "all" || row.status === query.status).sort((a, b) => {
    const comparison = query.sort === "name" ? a.name.localeCompare(b.name, "ko") : a.updatedAt.localeCompare(b.updatedAt);
    return (query.direction === "asc" ? comparison : -comparison) || a.id.localeCompare(b.id);
  });
  return { rows: paginate(filtered, query), activeCount: visible.filter(row => row.status === "active").length, inactiveCount: visible.filter(row => row.status === "inactive").length };
}
