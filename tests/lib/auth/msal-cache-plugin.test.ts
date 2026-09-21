import type { TokenCacheContext } from "@azure/msal-node";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MsalCachePlugin } from "@/lib/auth/msal-cache-plugin";
import type { SessionCache } from "@/lib/auth/session-cache";

describe("MsalCachePlugin", () => {
  const cache = {
    get: vi.fn(),
    set: vi.fn(),
  } satisfies SessionCache;
  const tokenCache = {
    deserialize: vi.fn(),
    serialize: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
    tokenCache.serialize.mockReturnValue("serialized-cache");
  });

  it("deserializes only when a cache value exists", async () => {
    const plugin = new MsalCachePlugin({ cache, cacheKey: "session-key" });
    const context = {
      tokenCache,
      cacheHasChanged: false,
    } as unknown as TokenCacheContext;

    await plugin.beforeCacheAccess(context);
    expect(tokenCache.deserialize).not.toHaveBeenCalled();

    cache.get.mockResolvedValue("stored-cache");
    await plugin.beforeCacheAccess(context);
    expect(tokenCache.deserialize).toHaveBeenCalledWith("stored-cache");
  });

  it("writes only when MSAL marks the cache as changed", async () => {
    const plugin = new MsalCachePlugin({ cache, cacheKey: "session-key" });

    await plugin.afterCacheAccess({
      tokenCache,
      cacheHasChanged: false,
    } as unknown as TokenCacheContext);
    expect(cache.set).not.toHaveBeenCalled();

    await plugin.afterCacheAccess({
      tokenCache,
      cacheHasChanged: true,
    } as unknown as TokenCacheContext);
    expect(cache.set).toHaveBeenCalledWith(
      "session-key",
      "serialized-cache",
      60 * 60 * 24 * 90,
    );
  });

  it("supports an explicit cache TTL", async () => {
    const plugin = new MsalCachePlugin({
      cache,
      cacheKey: "session-key",
      ttlSeconds: 120,
    });

    await plugin.afterCacheAccess({
      tokenCache,
      cacheHasChanged: true,
    } as unknown as TokenCacheContext);

    expect(cache.set).toHaveBeenCalledWith(
      "session-key",
      "serialized-cache",
      120,
    );
  });
});
