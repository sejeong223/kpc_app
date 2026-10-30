import { AdminDataError } from "@/lib/admin/errors";
import { assertPermission } from "@/lib/admin/permissions";
import { requireVersion, validDepartment } from "@/lib/admin/command-validation";
import { assetResource, assertAssetRead, assertAssetWrite, validateAssetVisibility } from "./permissions";
import { currentAssetRevision } from "./selectors";
import { AssetRevisionSchema } from "./schemas";
import type { AdminActor, AdminStoreState } from "@/types/admin";
import type { AssetCommand, AssetRecord, AssetRevision, TemplateExtraction, TemplateDraft } from "@/types/admin-assets";

interface CommandContext { createId: () => string; templateSources: ReadonlyMap<string, TemplateExtraction> }
interface AssetCommandResult { assetId: string; retainedFiles: { fileRefId: string; revisionId: string }[]; action: "create" | "update" | "delete"; detail: string; changed: boolean }

function assertOwnerDepartment(state: AdminStoreState, actor: AdminActor, departmentId: string | null): void {
  validDepartment(state, departmentId);
  if (actor.role !== "super_admin" && (!actor.departmentId || actor.departmentId !== departmentId)) throw new AdminDataError("FORBIDDEN", "자기 부서에만 자산을 등록할 수 있습니다.");
}
function templateDefinition(value: TemplateDraft, context: CommandContext) {
  const extraction = context.templateSources.get(value.fileRefId);
  if (!extraction) throw new AdminDataError("NOT_FOUND", "분석 완료된 파일이 필요합니다.");
  return { fileRefId: value.fileRefId, extraction: structuredClone(extraction), pageTypes: value.pageTypes, roles: value.roles, excluded: value.excluded };
}
export function applyAssetCommand(state: AdminStoreState, actor: AdminActor, command: AssetCommand, context: CommandContext): AssetCommandResult {
  const now = state.logicalNow, retainedFiles: AssetCommandResult["retainedFiles"] = [];
  const append = (revision: AssetRevision) => {
    if (revision.kind === "skill") state.assets.skillRevisions.push(revision);
    else { state.assets.templateRevisions.push(revision); retainedFiles.push({ fileRefId: revision.definition.fileRefId, revisionId: revision.id }); }
  };
  const creation = command.type === "create-skill" || command.type === "create-template";
  if (creation) {
    const kind = command.type === "create-skill" ? "skill" : "template";
    assertPermission(actor, state.roleGrants, assetResource(kind), "create");
    assertOwnerDepartment(state, actor, command.ownerDepartmentId);
    validateAssetVisibility(state, actor, command.visibility);
    const id = context.createId(), value = command.value;
    const asset: AssetRecord = { id, kind, version: 1, currentRevision: 1, createdBy: actor.userId, ownerDepartmentId: command.ownerDepartmentId, createdAt: now, updatedAt: now, deletedAt: null, status: command.status, visibility: command.visibility };
    const common = { id: context.createId(), assetId: id, revision: 1, createdAt: now, createdBy: actor.userId, name: value.name, short: value.short, description: value.description };
    append(command.type === "create-skill" ? { ...common, kind: "skill", rules: command.value.rules } : { ...common, kind: "template", definition: templateDefinition(command.value, context) });
    state.assets.records.push(asset);
    return { assetId: id, retainedFiles, action: "create", detail: command.type, changed: true };
  }
  const asset = state.assets.records.find(row => row.id === command.target.id);
  if (!asset || (asset.deletedAt && command.type !== "set-asset-visibility")) throw new AdminDataError("NOT_FOUND", "자산을 찾을 수 없습니다.");
  assertAssetRead(state, actor, asset);
  requireVersion([asset], command.target);
  const previous = currentAssetRevision(state, asset);
  if (command.type === "duplicate-asset") {
    assertPermission(actor, state.roleGrants, assetResource(asset.kind), "create");
    assertOwnerDepartment(state, actor, actor.departmentId);
    const id = context.createId();
    state.assets.records.push({ ...asset, id, version: 1, currentRevision: 1, ownerDepartmentId: actor.departmentId, createdBy: actor.userId, createdAt: now, updatedAt: now, deletedAt: null, status: "inactive", visibility: { all: false, targets: [] } });
    append({ ...structuredClone(previous), id: context.createId(), assetId: id, revision: 1, name: previous.name.slice(0, 76) + " 복사본", createdAt: now, createdBy: actor.userId });
    return { assetId: id, retainedFiles, action: "create", detail: "duplicate-asset:" + asset.id, changed: true };
  }
  assertAssetWrite(state, actor, asset, command.type === "delete-asset" ? "delete" : "update");
  let changed = false;
  if (command.type === "delete-asset") { asset.deletedAt = now; changed = true; }
  if (command.type === "set-asset-status") { changed = asset.status !== command.status; asset.status = command.status; }
  if (command.type === "set-asset-visibility") {
    validateAssetVisibility(state, actor, command.visibility, asset.visibility);
    changed = JSON.stringify(asset.visibility) !== JSON.stringify(command.visibility); asset.visibility = command.visibility;
  }
  if (command.type === "update-skill" || command.type === "update-template") {
    if ((command.type === "update-skill") !== (asset.kind === "skill")) throw new AdminDataError("VALIDATION", "자산 종류가 일치하지 않습니다.");
    validateAssetVisibility(state, actor, command.visibility, asset.visibility);
    const value = command.value;
    const common = { id: previous.id, assetId: asset.id, revision: previous.revision, name: value.name, short: value.short, description: value.description, createdAt: previous.createdAt, createdBy: previous.createdBy };
    const revision: AssetRevision = command.type === "update-skill" ? { ...common, kind: "skill", rules: command.value.rules } : { ...common, kind: "template", definition: templateDefinition(command.value, context) };
    if (JSON.stringify(AssetRevisionSchema.parse(previous)) !== JSON.stringify(AssetRevisionSchema.parse(revision))) {
      asset.currentRevision++;
      append({ ...revision, id: context.createId(), revision: asset.currentRevision, createdAt: now, createdBy: actor.userId }); changed = true;
    }
    changed ||= asset.status !== command.status || JSON.stringify(asset.visibility) !== JSON.stringify(command.visibility);
    asset.status = command.status; asset.visibility = command.visibility;
  }
  if (changed) { asset.version++; asset.updatedAt = now; }
  return { assetId: asset.id, retainedFiles, action: command.type === "delete-asset" ? "delete" : "update", detail: command.type, changed };
}
