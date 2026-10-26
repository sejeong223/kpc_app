import type { Cluster, Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/config/env.schema";

const redisMocks = vi.hoisted(() => {
  const client = {
    get: vi.fn(),
    set: vi.fn(),
  };
  const standaloneConstructor = vi.fn(function RedisMock() {
    return client;
  });
  const clusterConstructor = vi.fn(function RedisClusterMock() {
    return client;
  });

  Object.assign(standaloneConstructor, { Cluster: clusterConstructor });

  return {
    client,
    standaloneConstructor,
    clusterConstructor,
  };
});

vi.mock("@/config/env", () => ({ serverEnv: {} }));
vi.mock("ioredis", () => ({ default: redisMocks.standaloneConstructor }));
vi.mock("@sesamecare-oss/redlock", () => ({ Redlock: vi.fn() }));

import { AppConfigurationError } from "@/lib/auth/errors";
import {
  buildSessionCacheKey,
  getSessionCache,
  MemorySessionCache,
  RedisSessionCache,
} from "@/lib/auth/session-cache";
import { getRedisClient } from "@/utils/redis";

function createEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    nodeEnv: "development",
    appEnv: "local",
    authEnabled: true,
    embeddedMode: false,
    authCacheNamespace: "azure-app-template",
    redisClusterMode: false,
    azureUseManagedIdentity: false,
    iframeAllowedDomains: [],
    ...overrides,
  };
}

describe("session cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.client.get.mockResolvedValue(null);
    redisMocks.client.set.mockResolvedValue("OK");
  });

  it("expires memory entries and deletes them on access", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T00:00:00Z"));
    const cache = new MemorySessionCache();

    await cache.set("session", "serialized", 10);
    expect(await cache.get("session")).toBe("serialized");

    vi.advanceTimersByTime(10_000);
    expect(await cache.get("session")).toBeNull();
    vi.useRealTimers();
  });

  it("uses a process singleton memory cache without Redis", () => {
    const first = getSessionCache(createEnv());
    const second = getSessionCache(createEnv());

    expect(first).toBeInstanceOf(MemorySessionCache);
    expect(second).toBe(first);
  });

  it("requires Redis for production authentication", () => {
    expect(() =>
      getSessionCache(createEnv({ nodeEnv: "production" })),
    ).toThrow(AppConfigurationError);
  });

  it("uses Redis when a URL is configured", () => {
    const cache = getSessionCache(
      createEnv({ redisUrl: "redis://cache.example.com:6379" }),
    );

    expect(cache).toBeInstanceOf(RedisSessionCache);
    expect(redisMocks.standaloneConstructor).toHaveBeenCalledWith(
      "redis://cache.example.com:6379",
    );
  });

  it("delegates Redis reads and expiring writes", async () => {
    const cache = new RedisSessionCache(
      redisMocks.client as unknown as Redis | Cluster,
    );
    redisMocks.client.get.mockResolvedValue("serialized");

    expect(await cache.get("key")).toBe("serialized");
    await cache.set("key", "next", 60);

    expect(redisMocks.client.set).toHaveBeenCalledWith(
      "key",
      "next",
      "EX",
      60,
    );
  });

  it("preserves cluster username, password, and TLS settings", () => {
    getRedisClient(
      createEnv({
        redisUrl: "rediss://cache-user:p%40ss@cache.example.com:6380",
        redisClusterMode: true,
      }),
      true,
    );

    expect(redisMocks.clusterConstructor).toHaveBeenCalledWith(
      [{ host: "cache.example.com", port: 6380 }],
      {
        slotsRefreshTimeout: 2000,
        redisOptions: {
          username: "cache-user",
          password: "p@ss",
          tls: {},
        },
      },
    );
  });

  it("builds a neutral namespaced cache key", () => {
    expect(
      buildSessionCacheKey({
        namespace: "azure-app-template",
        appEnv: "staging",
        accountId: "account-id",
      }),
    ).toBe("azure-app-template/staging/session-cache/account-id");
    expect(
      buildSessionCacheKey({
        namespace: "custom-app",
        appEnv: "staging",
        accountId: "account-id",
      }),
    ).toBe("custom-app/staging/session-cache/account-id");
  });
});
