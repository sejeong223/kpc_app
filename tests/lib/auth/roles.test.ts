import { describe, expect, it } from "vitest";

import {
  APP_ROLES,
  hasRole,
  normalizeRoles,
} from "@/lib/auth/roles";

describe("roles", () => {
  it("keeps only unique supported Entra app roles", () => {
    expect(
      normalizeRoles([
        "User",
        "Admin",
        "User",
        "Unknown",
        null,
        7,
      ]),
    ).toEqual([APP_ROLES.USER, APP_ROLES.ADMIN]);
  });

  it.each([undefined, null, "Admin", { role: "Admin" }])(
    "normalizes non-array input to an empty list",
    (value) => {
      expect(normalizeRoles(value)).toEqual([]);
    },
  );

  it("checks only normalized role values", () => {
    expect(hasRole(["Admin"], APP_ROLES.ADMIN)).toBe(true);
    expect(hasRole(["admin", "User.Basic"], APP_ROLES.ADMIN)).toBe(false);
  });
});
