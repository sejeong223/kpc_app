import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type AuthService from "@/services/AuthService";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => navigation);

import { requireAppAccess, requireRole } from "@/lib/auth/guards";
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

beforeEach(() => {
    vi.clearAllMocks();
    navigation.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    navigation.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
});

describe("requireRole", () => {

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

describe("requireAppAccess", () => {
  it("allows local development without asking the auth service for a session", async () => {
    const authService = createAuthService({ enabled: false, session: null });
    await expect(requireAppAccess("/", { authService })).resolves.toBeNull();
    expect(authService.getSession).not.toHaveBeenCalled();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  it("stops anonymous users before the app shell is returned", async () => {
    await expect(requireAppAccess("/", {
      authService: createAuthService({ enabled: true, session: null }),
    })).rejects.toThrow("NEXT_REDIRECT:/auth/login?callbackUrl=%2F");
  });

  it("blocks a signed-in session without an allowed app role", async () => {
    await expect(requireAppAccess("/", {
      authService: createAuthService({ enabled: true, session: createSession([]) }),
    })).rejects.toThrow("NEXT_REDIRECT:/auth/login?reason=forbidden&callbackUrl=%2F");
  });

  it.each([APP_ROLES.USER, APP_ROLES.ADMIN])("returns the session for %s", async (role) => {
    const session = createSession([role]);
    await expect(requireAppAccess("/", {
      authService: createAuthService({ enabled: true, session }),
    })).resolves.toBe(session);
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  it("clears a failed token-refresh session before app access", async () => {
    const session = createSession([APP_ROLES.USER]);
    session.error = "RefreshAccessTokenError";
    await expect(requireAppAccess("/", {
      authService: createAuthService({ enabled: true, session }),
    })).rejects.toThrow("NEXT_REDIRECT:/auth/logout");
  });
});
