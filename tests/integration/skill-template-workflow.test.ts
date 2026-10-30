import JSZip from "jszip";
import { expect, it } from "vitest";
import { readTemplate } from "@/lib/pptx/template-read";
import { getAuditOperation } from "@/lib/admin/audit-operation";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { setupXmlDom } from "../lib/pptx/fixture";
import { auditQuery, reviseSkill, target, workHarness } from "../services/admin/work-fixture";

setupXmlDom();

it("실제 파일 등록부터 적용·재분석·최신 전환까지 원문과 사용량을 보존한다", async () => {
  const h = await workHarness();
  const usageBefore = await h.service.getSelf(h.otherActor);
  const source = h.files.getSource(h.source.id).document;
  const done = (await h.works.execute(h.otherActor, { type: "apply-work", target: target(h.view), mode: "pinned" }))!;
  const output = await h.works.download(h.otherActor, done.work.id, done.work.result!.id);
  const parsed = await readTemplate(output.bytes, output.filename, await loadZipLibrary());
  expect(parsed.slides).toHaveLength(source.slides.length);
  expect(parsed.slides.flatMap(slide => slide.objects.map(object => object.text))).toEqual(source.slides.flatMap(slide => slide.objects.map(object => object.text)));
  const before = await JSZip.loadAsync(source.bytes), after = await JSZip.loadAsync(output.bytes);
  const preserved = Object.keys(before.files).filter(path => !before.files[path].dir && (path.endsWith(".rels") || path.startsWith("ppt/media/") || path.startsWith("ppt/charts/") || path === "[Content_Types].xml"));
  expect(preserved.length).toBeGreaterThan(5);
  for (const path of preserved) expect(await after.file(path)!.async("uint8array"), path).toEqual(await before.file(path)!.async("uint8array"));
  const audit = await h.service.getAudit(h.superActor, { ...auditQuery, action: "apply" });
  expect(audit.rows.total).toBe(1);
  expect(audit.rows.items[0]).toMatchObject({ tokens: 0, usageId: null, outcome: "success" });
  expect(getAuditOperation(audit.rows.items[0]).label).toBe("PPT 서식 적용");
  expect(audit.rows.items[0].detail).toContain(done.work.template.revisionId);
  expect(await h.service.getSelf(h.otherActor)).toEqual(usageBefore);
  await reviseSkill(h);
  const newer = await h.works.getWork(h.otherActor, done.work.id);
  expect(newer.newer.skill).toBe(true);
  expect(newer.work.skill.revision).toBe(1);
  expect((await h.works.download(h.otherActor, done.work.id, done.work.result!.id)).bytes).toEqual(output.bytes);
  const updated = (await h.works.execute(h.otherActor, { type: "apply-work", target: target(newer), mode: "latest" }))!;
  expect(updated.work.skill.revision).toBe(2);
  expect(updated.canDownload).toBe(true);
  expect(await h.service.getSelf(h.otherActor)).toEqual(usageBefore);
  h.works.dispose(); h.files.dispose();
}, 15_000);

it("타 부서 공개 자산은 복제 후 관리하고 원본 삭제와 현재 권한 회수를 구별한다", async () => {
  const h = await workHarness();
  const detail = await h.service.getAsset(h.otherActor, h.skill.assetId);
  expect(detail.asset.capabilities).toMatchObject({ read: true, apply: true, update: false, delete: false, duplicate: true });
  await expect(h.service.executeAsset(h.otherActor, { type: "delete-asset", target: { id: detail.asset.id, version: detail.asset.version } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  const copy = await h.service.executeAsset(h.otherActor, { type: "duplicate-asset", target: { id: detail.asset.id, version: detail.asset.version } });
  const own = await h.service.getAsset(h.otherActor, copy.assetId);
  expect(own.asset).toMatchObject({ ownerDepartmentId: h.otherActor.departmentId, status: "inactive", visibility: { all: false, targets: [] }, currentRevision: 1 });
  expect(own.asset.capabilities.update).toBe(true);
  await h.service.executeAsset(h.departmentActor, { type: "delete-asset", target: { id: h.template.assetId, version: 1 } });
  const done = (await h.works.execute(h.otherActor, { type: "apply-work", target: target(h.view), mode: "pinned" }))!;
  expect(done.canDownload).toBe(true); expect(done.canApplyLatest).toBe(false);
  await h.service.executeAsset(h.departmentActor, { type: "set-asset-visibility", target: { id: h.template.assetId, version: 2 }, visibility: { all: false, targets: [] } });
  expect(h.works.canAccess(h.otherActor, done.work.id)).toBe(false);
  expect(() => h.works.getPreview(h.otherActor, done.work.id, "after")).toThrow();
  await expect(h.works.download(h.otherActor, done.work.id, done.work.result!.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  h.works.dispose(); h.files.dispose();
});
