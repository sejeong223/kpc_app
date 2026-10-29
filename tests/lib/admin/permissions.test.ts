import { expect, it } from "vitest";
import { DEFAULT_ROLE_GRANTS } from "@/config/admin-permissions";
import { assertDepartmentScope, canPerform } from "@/lib/admin/permissions";
import type { AdminActor } from "@/types/admin";

const actor: AdminActor = { userId: "u-self", name: "정소담", email: "sodam@example.invalid", role: "department_admin", departmentId: "d-ai" };
it("역할별 상한과 부서 범위를 함께 적용한다", () => {
  expect(canPerform(actor, DEFAULT_ROLE_GRANTS, "users", "read")).toBe(true);
  expect(canPerform(actor, DEFAULT_ROLE_GRANTS, "users", "update")).toBe(false);
  expect(canPerform({ ...actor, role: "user" }, DEFAULT_ROLE_GRANTS, "audit", "read")).toBe(false);
  expect(canPerform({ ...actor, departmentId: null }, DEFAULT_ROLE_GRANTS, "audit", "read")).toBe(false);
  expect(() => assertDepartmentScope(actor, "d-cx")).toThrow();
  expect(() => assertDepartmentScope({ ...actor, departmentId: null }, null)).toThrow();
  const grants = structuredClone([...DEFAULT_ROLE_GRANTS]);
  grants[0].grants.users.read = false;
  expect(canPerform({ ...actor, role: "super_admin" }, grants, "users", "update")).toBe(false);
  grants[1].grants.users.update = true;
  expect(canPerform(actor, grants, "users", "update")).toBe(false);
});
