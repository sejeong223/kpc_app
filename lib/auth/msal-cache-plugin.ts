import type { ICachePlugin, TokenCacheContext } from "@azure/msal-node";

import type { SessionCache } from "./session-cache";

const DEFAULT_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;

export class MsalCachePlugin implements ICachePlugin {
  private readonly cache: SessionCache;
  private readonly cacheKey: string;
  private readonly ttlSeconds: number;

  constructor(options: {
    cache: SessionCache;
    cacheKey: string;
    ttlSeconds?: number;
  }) {
    this.cache = options.cache;
    this.cacheKey = options.cacheKey;
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  }

  async beforeCacheAccess(context: TokenCacheContext): Promise<void> {
    const serializedCache = await this.cache.get(this.cacheKey);

    if (serializedCache !== null) {
      context.tokenCache.deserialize(serializedCache);
    }
  }

  async afterCacheAccess(context: TokenCacheContext): Promise<void> {
    if (!context.cacheHasChanged) {
      return;
    }

    await this.cache.set(
      this.cacheKey,
      context.tokenCache.serialize(),
      this.ttlSeconds,
    );
  }
}
