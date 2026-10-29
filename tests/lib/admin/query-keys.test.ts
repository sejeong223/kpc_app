import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { adminQueryKey } from "@/lib/admin/query-keys";
import type { AdminActor } from "@/types/admin";

it("역할·부서·revision 캐시를 분리하고 다른 공급자에 공유하지 않는다", async () => {
  const actor: AdminActor = { userId: "u-self", name: "정소담", email: "self@example.invalid", role: "super_admin", departmentId: "d-ai" };
  const client = new QueryClient(), key = adminQueryKey({ actor, revision: 1, kind: "users" });
  await client.prefetchQuery({ queryKey: key, queryFn: async () => ["전사"] });
  expect(client.getQueryData(key)).toEqual(["전사"]);
  expect(client.getQueryData(adminQueryKey({ actor: { ...actor, role: "department_admin" }, revision: 1, kind: "users" }))).toBeUndefined();
  expect(client.getQueryData(adminQueryKey({ actor: { ...actor, departmentId: null }, revision: 1, kind: "users" }))).toBeUndefined();
  expect(client.getQueryData(adminQueryKey({ actor, revision: 2, kind: "users" }))).toBeUndefined();
  expect(new QueryClient().getQueryData(key)).toBeUndefined(); client.clear();
});
