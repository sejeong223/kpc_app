import { expect, it } from "vitest";
import type { Session } from "next-auth";
import { adminIdentityKey, resolveAdminActor } from "@/lib/admin/runtime-actor";
import { resolveProfileDisplay } from "@/lib/profile-preview";

it("시연 역할은 같은 사용자이고 실제 인증의 역할·부서는 추정하지 않는다", () => {
  const profile = resolveProfileDisplay({ authEnabled: false, session: null, previewRole: "super_admin" });
  const first = resolveAdminActor({ authEnabled: false, session: null, profile, previewRole: "user" });
  expect(resolveAdminActor({ authEnabled: false, session: null, profile, previewRole: "department_admin" })).toEqual({ ...first, role: "department_admin" });
  const session: Session = { expires: "2099-01-01", user: { oid: "one", roles: ["User"] } };
  expect(resolveAdminActor({ authEnabled: true, session, profile, previewRole: "super_admin" })).toMatchObject({ role: "user", departmentId: null });
  expect(resolveAdminActor({ authEnabled: true, session: { ...session, user: { roles: ["Admin"] } }, profile, previewRole: "user" }).role).toBe("super_admin");
  expect(adminIdentityKey(true, session)).not.toBe(adminIdentityKey(true, { ...session, user: { ...session.user, oid: "two" } }));
  expect(adminIdentityKey(false, session)).toBe(adminIdentityKey(false, null));
});
