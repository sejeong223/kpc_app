import { expect, it } from "vitest";
import { assetHarness, assetQuery, createSkill } from "../../../services/admin/asset-fixture";

it("공개 범위를 먼저 적용하여 목록·집계·공개 후보에 다른 부서가 섞이지 않는다", async () => {
  const h = assetHarness();
  await createSkill(h.service, h.departmentActor, { all: false, targets: [] });
  const publicAsset = await createSkill(h.service, h.departmentActor);
  const rows = await h.service.getAssets(h.otherActor, assetQuery);
  expect(rows.rows.items.map(row => row.id)).toEqual([publicAsset.assetId]);
  expect(rows.activeCount).toBe(1);
  const candidates = await h.service.getAssetAudience(h.otherActor, "skill");
  expect(candidates.departments.map(row => row.id)).toEqual(["d-industry"]);
  expect(candidates.users.every(row => h.seed.users.find(user => user.id === row.id)?.departmentId === "d-industry")).toBe(true);
  expect(candidates.groups.some(row => row.id === "g-ai")).toBe(false);
  await expect(h.service.getDirectory(h.otherActor)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(h.service.getGroups(h.otherActor, { search: "", page: 1, pageSize: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
