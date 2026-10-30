import { expect, it } from "vitest";
import { DEFAULT_ROLE_GRANTS } from "@/config/admin-permissions";
import { canPerform } from "@/lib/admin/permissions";
import { assetResource } from "@/lib/admin/assets/permissions";
import { createAdminSeed } from "@/config/admin-seed";
import type { AdminActor } from "@/types/admin";

it("자산 CRUD만 부서 관리자 상한에 추가한다", () => {
  const actor: AdminActor = { userId: "u-self", name: "관리자", email: "a@example.invalid", role: "department_admin", departmentId: "d-ai" };
  for (const resource of [assetResource("skill"), assetResource("template")]) {
    for (const action of ["create", "read", "update", "delete"] as const) expect(canPerform(actor, DEFAULT_ROLE_GRANTS, resource, action)).toBe(true);
    expect(canPerform({ ...actor, role: "user" }, DEFAULT_ROLE_GRANTS, resource, "read")).toBe(false);
    expect(canPerform({ ...actor, departmentId: null }, DEFAULT_ROLE_GRANTS, resource, "read")).toBe(false);
  }
  expect(canPerform(actor, DEFAULT_ROLE_GRANTS, "groups", "read")).toBe(false);
  expect(canPerform(actor, DEFAULT_ROLE_GRANTS, "users", "update")).toBe(false);
  expect(createAdminSeed().assets.templateRevisions).toEqual([]);
});
