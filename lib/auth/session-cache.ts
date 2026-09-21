import type { Cluster, Redis } from "ioredis";

import { serverEnv } from "@/config/env";
import type { ServerEnv } from "@/config/env.schema";
import { getRedisClient } from "@/utils/redis";

import { AppConfigurationError } from "./errors";

export interface SessionCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

export class MemorySessionCache implements SessionCache {
  private readonly entries = new Map<string, MemoryCacheEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.entries.clear();
  }
}

export class RedisSessionCache implements SessionCache {
  constructor(private readonly client: Redis | Cluster) {}

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }
}

export interface SessionCacheKeyInput {
  namespace: string;
  appEnv: string;
  accountId: string;
}

export function buildSessionCacheKey(input: SessionCacheKeyInput): string {
  return `${input.namespace}/${input.appEnv}/session-cache/${input.accountId}`;
}

const memorySessionCache = new MemorySessionCache();
let redisSessionCache:
  | { client: Redis | Cluster; cache: RedisSessionCache }
  | undefined;

export function getSessionCache(env: ServerEnv = serverEnv): SessionCache {
  if (env.redisUrl) {
    const client = getRedisClient(env);

    if (!redisSessionCache || redisSessionCache.client !== client) {
      redisSessionCache = {
        client,
        cache: new RedisSessionCache(client),
      };
    }

    return redisSessionCache.cache;
  }

  if (env.nodeEnv === "production" && env.authEnabled) {
    throw new AppConfigurationError(
      "REDIS_URL is required for production authentication",
    );
  }

  return memorySessionCache;
}
