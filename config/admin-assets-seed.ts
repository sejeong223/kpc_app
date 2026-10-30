import { DEFAULT_SKILL_RULES } from "@/config/skill-options";
import type { AdminStoreState } from "@/types/admin";
import type { AssetStore } from "@/types/admin-assets";

export function createAssetSeed(state: Pick<AdminStoreState, "users" | "groups" | "departments" | "logicalNow">): AssetStore {
  const assets: AssetStore = { records: [], skillRevisions: [], templateRevisions: [] };
  const names = ["KPC 표준 제안서", "우리 부서 기본 서식", "공유 제안서 서식", "검토 중인 서식"];
  for (const [index, name] of names.entries()) {
    const department = state.departments[index === 2 ? 1 : 0];
    const creator = state.users.find(user => user.status === "active" && !user.deletedAt && user.departmentId === department?.id) ?? state.users.find(user => user.status === "active" && !user.deletedAt);
    if (!creator) continue;
    const id = "skill-example-" + (index + 1);
    assets.records.push({ id, kind: "skill", ownerDepartmentId: department?.id ?? null, createdBy: creator.id, version: 1, currentRevision: 1, status: index === 3 ? "inactive" : "active", visibility: { all: index === 0 || index === 2, targets: [] }, createdAt: state.logicalNow, updatedAt: state.logicalNow, deletedAt: null });
    assets.skillRevisions.push({ id: id + "-v1", assetId: id, kind: "skill", revision: 1, name, short: ["표준", "부서", "공유", "검토"][index], description: "관리 흐름 검토를 위한 예시 서식입니다.", createdAt: state.logicalNow, createdBy: creator.id, rules: structuredClone(DEFAULT_SKILL_RULES) });
  }
  return assets;
}
