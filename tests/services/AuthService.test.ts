import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/config/env.schema";
import type { SessionCache } from "@/lib/auth/session-cache";
import type MSGraphService from "@/services/MSGraphService";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  createGraphTokenCredential: vi.fn(),
  createMsalClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({ serverEnv: {} }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth/credentials", () => ({
  createGraphTokenCredential: mocks.createGraphTokenCredential,
  createMsalClient: mocks.createMsalClient,
}));

import { APP_ROLES } from "@/lib/auth/roles";
import AuthService from "@/services/AuthService";

function createEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    nodeEnv: "development",
    appEnv: "local",
    authEnabled: true,
    embeddedMode: false,
    authCacheNamespace: "kpc_app",
    nextAuthUrl: "https://app.example.com",
    nextAuthSecret: "next-auth-secret",
    msalTenantId: "tenant-id",
    msalClientId: "client-id",
    msalClientSecret: "client-secret",
    redisClusterMode: false,
    azureUseManagedIdentity: false,
    iframeAllowedDomains: [],
    ...overrides,
  };
}

function createDependencies() {
  const graphGet = vi.fn().mockResolvedValue({
    userPrincipalName: "user@example.com",
  });
  const graphApi = vi.fn(() => ({ get: graphGet }));
  const graphService = {
    getMSGraphClient: vi.fn(() => ({ api: graphApi })),
  } as unknown as MSGraphService;
  const sessionCache = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  } satisfies SessionCache;

  return { graphGet, graphApi, graphService, sessionCache };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null without initializing external auth when disabled", async () => {
    const dependencies = createDependencies();
    const service = new AuthService({
      env: createEnv({ authEnabled: false }),
      graphService: dependencies.graphService,
      sessionCache: dependencies.sessionCache,
    });

    await expect(service.getSession()).resolves.toBeNull();
    await expect(service.getNextAuthOptions()).rejects.toThrow("AUTH_ENABLED");
    expect(mocks.getServerSession).not.toHaveBeenCalled();
    expect(
      dependencies.graphService.getMSGraphClient,
    ).not.toHaveBeenCalled();
    expect(mocks.createMsalClient).not.toHaveBeenCalled();
    expect(dependencies.sessionCache.get).not.toHaveBeenCalled();
  });

  it("deduplicates standard and extra scopes", () => {
    const service = new AuthService({ env: createEnv() });

    expect(service.getAuthScopes(["User.Read", "email", "User.Read"])).toEqual(
      ["offline_access", "openid", "profile", "email", "User.Read"],
    );
  });

  it("uses namespace cookies only in embedded mode", async () => {
    const dependencies = createDependencies();
    const normal = await new AuthService({
      env: createEnv(),
      graphService: dependencies.graphService,
    }).getNextAuthOptions();
    const embedded = await new AuthService({
      env: createEnv({ embeddedMode: true }),
      graphService: dependencies.graphService,
    }).getNextAuthOptions();

    expect(normal.cookies).toBeUndefined();
    expect(embedded.cookies?.state?.name).toBe("kpc_app-next-auth.state");
    expect(embedded.cookies?.state?.options).toMatchObject({
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
  });

  it("normalizes profile roles and maps Graph UPN into the session", async () => {
    const dependencies = createDependencies();
    const service = new AuthService({
      env: createEnv(),
      graphService: dependencies.graphService,
      sessionCache: dependencies.sessionCache,
    });
    const options = await service.getNextAuthOptions();
    const jwt = options.callbacks?.jwt;
    const sessionCallback = options.callbacks?.session;

    if (!jwt || !sessionCallback) {
      throw new Error("Expected NextAuth callbacks");
    }

    const token = await jwt({
      token: {},
      account: {
        access_token: "access-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
      profile: {
        oid: "oid-1",
        roles: ["User", "Admin", "Unknown", "Admin"],
      },
    } as never);

    expect(token).toMatchObject({
      oid: "oid-1",
      upn: "user@example.com",
      access_token: "access-token",
      roles: [APP_ROLES.USER, APP_ROLES.ADMIN],
      version: "1.0.0",
    });
    expect(dependencies.graphApi).toHaveBeenCalledWith("/users/oid-1");

    const session = await sessionCallback({
      session: {
        expires: "2099-01-01T00:00:00.000Z",
        user: { name: "User", email: null, image: null, roles: [] },
      },
      token,
    } as never);

    expect(session.user).toMatchObject({
      oid: "oid-1",
      upn: "user@example.com",
      access_token: "access-token",
      roles: [APP_ROLES.USER, APP_ROLES.ADMIN],
    });
  });

  it("marks refresh failures without exposing the underlying error", async () => {
    const dependencies = createDependencies();
    const account = { localAccountId: "oid-1" };
    const msalClient = {
      getTokenCache: vi.fn(() => ({
        getAccountByLocalId: vi.fn().mockResolvedValue(account),
      })),
      acquireTokenSilent: vi
        .fn()
        .mockRejectedValue(new Error("fake-secret-must-not-leak")),
    };
    mocks.createMsalClient.mockReturnValue(msalClient);
    const service = new AuthService({
      env: createEnv(),
      graphService: dependencies.graphService,
      sessionCache: dependencies.sessionCache,
    });
    const options = await service.getNextAuthOptions();
    const jwt = options.callbacks?.jwt;
    const sessionCallback = options.callbacks?.session;

    if (!jwt || !sessionCallback) {
      throw new Error("Expected NextAuth callbacks");
    }

    const token = await jwt({
      token: {
        oid: "oid-1",
        roles: [APP_ROLES.USER],
        expires_at: Math.floor(Date.now() / 1000),
      },
      account: null,
      profile: undefined,
    } as never);

    expect(token.error).toBe("RefreshAccessTokenError");
    expect(JSON.stringify(token)).not.toContain("fake-secret-must-not-leak");

    const session = await sessionCallback({
      session: {
        expires: "2099-01-01T00:00:00.000Z",
        user: { name: "User", email: null, image: null, roles: [] },
      },
      token,
    } as never);
    expect((session as Session).error).toBe("RefreshAccessTokenError");
  });

  it("uses getServerSession only when enabled", async () => {
    const dependencies = createDependencies();
    const expectedSession = {
      expires: "2099-01-01T00:00:00.000Z",
      user: { name: "User", email: null, image: null, roles: [] },
    } as Session;
    mocks.getServerSession.mockResolvedValue(expectedSession);
    const service = new AuthService({
      env: createEnv(),
      graphService: dependencies.graphService,
    });

    await expect(service.getSession()).resolves.toBe(expectedSession);
    expect(mocks.getServerSession).toHaveBeenCalledOnce();
  });
});
