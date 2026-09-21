import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type AuthService from "@/services/AuthService";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => navigation);

import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

function createSession(roles: Array<"User" | "Admin">): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      name: "Template User",
      email: "user@example.com",
      image: null,
      oid: "oid",
      upn: "user@example.com",
      roles,
    },
  };
}

function createAuthService(input: {
  enabled: boolean;
  session: Session | null;
}): AuthService {
  return {
    isEnabled: vi.fn(() => input.enabled),
    getSession: vi.fn().mockResolvedValue(input.session),
  } as unknown as AuthService;
}

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    navigation.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
  });

  it("returns not found when authentication is disabled", async () => {
    await expect(
      requireRole(APP_ROLES.ADMIN, "/admin", {
        authService: createAuthService({ enabled: false, session: null }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalledOnce();
  });

  it("redirects an anonymous user to login", async () => {
    await expect(
      requireRole(APP_ROLES.ADMIN, "/admin/permissions", {
        authService: createAuthService({ enabled: true, session: null }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/auth/login?callbackUrl=%2Fadmin%2Fpermissions",
    );
  });

  it("redirects a non-admin with a forbidden reason", async () => {
    await expect(
      requireRole(APP_ROLES.ADMIN, "/admin", {
        authService: createAuthService({
          enabled: true,
          session: createSession([APP_ROLES.USER]),
        }),
      }),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/auth/login?reason=forbidden&callbackUrl=%2Fadmin",
    );
  });

  it("returns the session for an administrator", async () => {
    const session = createSession([APP_ROLES.ADMIN]);

    await expect(
      requireRole(APP_ROLES.ADMIN, "/admin", {
        authService: createAuthService({ enabled: true, session }),
      }),
    ).resolves.toBe(session);
    expect(navigation.redirect).not.toHaveBeenCalled();
    expect(navigation.notFound).not.toHaveBeenCalled();
  });
});
