import { describe, expect, it } from "vitest";
import { assetHarness, assetQuery, createSkill, templateDraft } from "./asset-fixture";
import { fixtureFile, setupXmlDom } from "../../lib/pptx/fixture";

setupXmlDom();
describe("부서별 자산 관리", () => {
  it("부서 관리자가 전사 공개해도 편집 권한은 소유 부서에 남는다", async () => {
    const h = assetHarness(), receipt = await createSkill(h.service, h.departmentActor);
    const detail = await h.service.getAsset(h.otherActor, receipt.assetId);
    expect(detail.asset.capabilities).toMatchObject({ read: true, apply: true, duplicate: true, update: false, delete: false });
    await expect(h.service.executeAsset(h.otherActor, { type: "set-asset-status", target: { id: receipt.assetId, version: receipt.assetVersion }, status: "inactive" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await h.service.getAsset(h.departmentActor, receipt.assetId)).asset.capabilities.update).toBe(true);
  });
  it("다른 부서의 공개 자산을 독립적인 비공개 사본으로 만든다", async () => {
    const h = assetHarness(), original = await createSkill(h.service, h.departmentActor);
    const copy = await h.service.executeAsset(h.otherActor, { type: "duplicate-asset", target: { id: original.assetId, version: original.assetVersion } });
    const detail = await h.service.getAsset(h.otherActor, copy.assetId);
    expect(detail.asset).toMatchObject({ ownerDepartmentId: "d-industry", currentRevision: 1, status: "inactive", visibility: { all: false, targets: [] } });
    await expect(h.service.getAsset(h.departmentActor, copy.assetId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await h.service.executeAsset(h.departmentActor, { type: "set-asset-status", target: { id: original.assetId, version: original.assetVersion }, status: "inactive" });
    expect((await h.service.getAsset(h.otherActor, copy.assetId)).revision).toEqual(detail.revision);
  });
  it("일반 사용자·미확인 부서·등록 소유권 위조를 거절한다", async () => {
    const h = assetHarness();
    await expect(h.service.getAssets({ ...h.departmentActor, role: "user" }, assetQuery)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(h.service.getAssets({ ...h.departmentActor, departmentId: null }, assetQuery)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const base = await createSkill(h.service, h.departmentActor);
    const detail = await h.service.getAsset(h.departmentActor, base.assetId);
    if (detail.revision.kind !== "skill") throw new Error("잘못된 fixture");
    await expect(h.service.executeAsset(h.departmentActor, { type: "create-skill", ownerDepartmentId: "d-industry", status: "active", visibility: { all: true, targets: [] }, value: { name: "위조", short: "위조", description: "", rules: detail.revision.rules } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("그룹 구성과 개인·부서 공개를 현재 데이터에서 검사한다", async () => {
    const h = assetHarness();
    const receipt = await createSkill(h.service, h.departmentActor, { all: false, targets: [{ type: "group", id: "g-review" }] });
    await expect(h.service.getAsset(h.otherActor, receipt.assetId)).resolves.toBeDefined();
    const group = (await h.service.getGroups(h.superActor, { search: "", page: 1, pageSize: 20 })).items.find(row => row.id === "g-review")!;
    await h.service.execute(h.superActor, { type: "update-group", target: { id: group.id, version: group.version }, value: { name: group.name, memberIds: group.memberIds.filter(id => id !== h.otherActor.userId) } });
    await expect(h.service.getAsset(h.otherActor, receipt.assetId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await h.service.executeAsset(h.superActor, { type: "set-asset-visibility", target: { id: receipt.assetId, version: receipt.assetVersion }, visibility: { all: false, targets: [{ type: "user", id: h.otherActor.userId }] } });
    await expect(h.service.getAsset(h.otherActor, receipt.assetId)).resolves.toBeDefined();
    await expect(h.service.getAsset(h.thirdActor, receipt.assetId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("다른 사람 staged 파일과 조작한 추출 정보/요소 ID를 거절한다", async () => {
    const h = assetHarness(), source = await h.service.importTemplate(h.departmentActor, await fixtureFile());
    const command = { type: "create-template" as const, ownerDepartmentId: h.otherActor.departmentId, status: "active" as const, visibility: { all: true, targets: [] }, value: templateDraft(source) };
    await expect(h.service.executeAsset(h.otherActor, command)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(h.service.executeAsset(h.departmentActor, { ...command, ownerDepartmentId: h.departmentActor.departmentId, value: { ...command.value, excluded: ["가짜 요소"] } })).rejects.toMatchObject({ code: "VALIDATION" });
    const injected = { ...command, ownerDepartmentId: h.departmentActor.departmentId, value: Object.assign({}, command.value, { extraction: { slideCount: 999 } }) };
    await expect(h.service.executeAsset(h.departmentActor, injected)).rejects.toMatchObject({ code: "VALIDATION" });
    const saved = await h.service.executeAsset(h.departmentActor, { ...command, ownerDepartmentId: h.departmentActor.departmentId });
    const detail = await h.service.getAsset(h.departmentActor, saved.assetId);
    expect(detail.revision.kind === "template" && detail.revision.definition.extraction.slideCount).toBe(4);
  });
});
