import { expect, it } from "vitest";
import { assetHarness, createSkill, templateDraft } from "./asset-fixture";
import { fixtureFile, setupXmlDom } from "../../lib/pptx/fixture";

setupXmlDom();
it("상태/공개 변경과 내용 버전을 분리하고 stale 입력을 원자적으로 거절한다", async () => {
  const h = assetHarness(), receipt = await createSkill(h.service, h.departmentActor), first = await h.service.getAsset(h.departmentActor, receipt.assetId);
  if (first.revision.kind !== "skill") throw new Error("잘못된 fixture");
  const command = { type: "update-skill" as const, target: { id: receipt.assetId, version: first.asset.version }, status: first.asset.status, visibility: first.asset.visibility, value: { name: first.revision.name, short: first.revision.short, description: first.revision.description, rules: first.revision.rules } };
  const revision = h.service.getRevision();
  await h.service.executeAsset(h.departmentActor, command);
  expect(h.service.getRevision()).toBe(revision);
  const metadata = await h.service.executeAsset(h.departmentActor, { ...command, status: "inactive" });
  expect(metadata.contentRevision).toBe(1);
  const change = await h.service.executeAsset(h.departmentActor, { ...command, target: { id: receipt.assetId, version: metadata.assetVersion }, value: { ...command.value, name: "수정된 이름" } });
  expect(change.contentRevision).toBe(2);
  const fixed = { assetId: receipt.assetId, revisionId: first.revision.id, revision: 1 };
  expect(h.service.resolveAsset(h.departmentActor, fixed, "existing").revision.name).toBe(first.revision.name);
  const beforeFailure = h.service.getRevision();
  await expect(h.service.executeAsset(h.departmentActor, command)).rejects.toMatchObject({ code: "CONFLICT" });
  expect(h.service.getRevision()).toBe(beforeFailure);
  expect((await h.service.getAsset(h.departmentActor, receipt.assetId)).history).toHaveLength(2);
});
it("삭제된 원본의 고정 버전은 남기고 현재 권한은 다시 검사한다", async () => {
  const h = assetHarness(), receipt = await createSkill(h.service, h.departmentActor), detail = await h.service.getAsset(h.otherActor, receipt.assetId);
  const fixed = { assetId: receipt.assetId, revisionId: detail.revision.id, revision: detail.revision.revision };
  const deleted = await h.service.executeAsset(h.departmentActor, { type: "delete-asset", target: { id: receipt.assetId, version: detail.asset.version } });
  expect(h.service.resolveAsset(h.otherActor, fixed, "existing").revision.id).toBe(detail.revision.id);
  expect(() => h.service.resolveAsset(h.otherActor, { assetId: receipt.assetId }, "new")).toThrow();
  await h.service.executeAsset(h.departmentActor, { type: "set-asset-visibility", target: { id: receipt.assetId, version: deleted.assetVersion }, visibility: { all: false, targets: [] } });
  expect(() => h.service.resolveAsset(h.otherActor, fixed, "existing")).toThrow();
  expect(() => h.service.resolveAsset(h.departmentActor, { ...fixed, revisionId: "위조" }, "existing")).toThrow();
});
it("파일 교체 후 이전 버전과 복제본의 원본 파일을 보유한다", async () => {
  const h = assetHarness(), source = await h.service.importTemplate(h.departmentActor, await fixtureFile());
  const one = await h.service.executeAsset(h.departmentActor, { type: "create-template", ownerDepartmentId: h.departmentActor.departmentId, status: "active", visibility: { all: true, targets: [] }, value: templateDraft(source) });
  const copy = await h.service.executeAsset(h.otherActor, { type: "duplicate-asset", target: { id: one.assetId, version: one.assetVersion } });
  const replacement = await h.service.importTemplate(h.departmentActor, await fixtureFile());
  await h.service.executeAsset(h.departmentActor, { type: "update-template", target: { id: one.assetId, version: one.assetVersion }, status: "active", visibility: { all: true, targets: [] }, value: templateDraft(replacement) });
  expect(h.files.getSource(source.id).document.slides).toHaveLength(4);
  const copied = await h.service.getAsset(h.otherActor, copy.assetId);
  expect(copied.revision.kind === "template" && copied.revision.definition.fileRefId).toBe(source.id);
  const own = await h.service.getAsset(h.departmentActor, one.assetId);
  own.asset.visibility.all = false;
  expect((await h.service.getAsset(h.departmentActor, one.assetId)).asset.visibility.all).toBe(true);
});
