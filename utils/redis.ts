import { Redlock } from "@sesamecare-oss/redlock";
import Redis, { type Cluster, type RedisOptions } from "ioredis";

import { serverEnv } from "@/config/env";
import type { ServerEnv } from "@/config/env.schema";
import { AppConfigurationError } from "@/lib/auth/errors";

let redisClient: Redis | Cluster | null = null;
let redisClientKey: string | null = null;
let redlock: Redlock | null = null;
let redlockClient: Redis | Cluster | null = null;

function decodeUrlComponent(value: string): string | undefined {
  return value ? decodeURIComponent(value) : undefined;
}

function getClusterConfiguration(redisUrl: string): {
  node: { host: string; port: number };
  redisOptions: RedisOptions;
} {
  try {
    const parsed = new URL(redisUrl);

    if (!(["redis:", "rediss:"] as string[]).includes(parsed.protocol)) {
      throw new Error("unsupported protocol");
    }

    if (!parsed.hostname) {
      throw new Error("missing host");
    }

    const port = parsed.port ? Number.parseInt(parsed.port, 10) : 6379;

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error("invalid port");
    }

    return {
      node: {
        host: parsed.hostname,
        port,
      },
      redisOptions: {
        username: decodeUrlComponent(parsed.username),
        password: decodeUrlComponent(parsed.password),
        tls: parsed.protocol === "rediss:" ? {} : undefined,
      },
    };
  } catch {
    throw new AppConfigurationError("REDIS_URL is invalid");
  }
}

export function getRedisClient(
  env: ServerEnv = serverEnv,
  forceNewInstance = false,
): Redis | Cluster {
  if (!env.redisUrl) {
    throw new AppConfigurationError("REDIS_URL is required");
  }

  const clientKey = `${env.redisClusterMode}:${env.redisUrl}`;

  if (redisClient && redisClientKey === clientKey && !forceNewInstance) {
    return redisClient;
  }

  if (env.redisClusterMode) {
    const { node, redisOptions } = getClusterConfiguration(env.redisUrl);
    redisClient = new Redis.Cluster([node], {
      slotsRefreshTimeout: 2000,
      redisOptions,
    });
  } else {
    redisClient = new Redis(env.redisUrl);
  }

  redisClientKey = clientKey;
  return redisClient;
}

export function getRedlock(env: ServerEnv = serverEnv): Redlock {
  const client = getRedisClient(env);

  if (!redlock || redlockClient !== client) {
    redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });
    redlockClient = client;
  }

  return redlock;
}
