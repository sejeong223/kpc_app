import { createAdminSeed } from "@/config/admin-seed";
import { DEFAULT_SKILL_RULES } from "@/config/skill-options";
import { MockAdminDataService } from "@/services/admin/MockAdminDataService";
import { TemplateFileStore } from "@/services/admin/TemplateFileStore";
import type { AdminActor } from "@/types/admin";
import type { AssetQuery, AssetVisibility, StagedTemplateSource, TemplateDraft } from "@/types/admin-assets";

export const assetQuery: AssetQuery = { kind: "skill", search: "검증", visibility: "all", status: "all", page: 1, pageSize: 20, sort: "updatedAt", direction: "desc" };
export function assetHarness() {
  const seed = createAdminSeed(), files = new TemplateFileStore();
  const actor = (departmentId: string, role: AdminActor["role"]): AdminActor => {
    const user = seed.users.find(user => user.departmentId === departmentId && user.status === "active")!;
    return { userId: user.id, name: user.name, email: user.email, departmentId, role };
  };
  return { seed, files, service: new MockAdminDataService({ seed, files }), superActor: actor("d-ai", "super_admin"), departmentActor: actor("d-ai", "department_admin"), otherActor: actor("d-industry", "department_admin"), thirdActor: actor("d-product", "department_admin") };
}
export function createSkill(service: MockAdminDataService, actor: AdminActor, visibility: AssetVisibility = { all: true, targets: [] }) {
  return service.executeAsset(actor, { type: "create-skill", ownerDepartmentId: actor.departmentId, status: "active", visibility, value: { name: "검증 서식", short: "검증", description: "검증용", rules: structuredClone(DEFAULT_SKILL_RULES) } });
}
export function templateDraft(source: StagedTemplateSource): TemplateDraft {
  return { name: "검증 템플릿", short: "검증", description: "실제 합성 파일", fileRefId: source.id, pageTypes: Object.fromEntries(source.extraction.slides.map(slide => [String(slide.index), slide.type])), roles: {}, excluded: [] };
}
