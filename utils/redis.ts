import Redis from 'ioredis';
import type { Cluster } from 'ioredis';
import parseUrl from 'parse-url';
import { Redlock } from "@sesamecare-oss/redlock";

let redisClient: Redis | null | Cluster = null;
let redlock: Redlock | null = null;

export function getRedisClient(forceNewInstance = false) {
  if (redisClient && !forceNewInstance) {
    return redisClient;
  }

  const url = process.env.REDIS_URL ?? '';

  const clusterMode = process.env.REDIS_CLUSTER_MODE ?? false;

  if (clusterMode) {
    // parse host, port from url
    const redisUrl = parseUrl(url);

    let redisPort = 6379;

    if (redisUrl.port) {
      redisPort = parseInt(redisUrl.port, 10);
    }

    redisClient = new Redis.Cluster(
      [
        {
          port: redisPort,
          host: redisUrl.host,
        },
      ],
      {
        slotsRefreshTimeout: 2000,
      },
    );
  } else {
    redisClient = new Redis(url);
  }

  return redisClient;
}

export function getRedlock() {
  if (!redlock) {
    redlock = new Redlock(
      // You should have one client for each independent redis node
      // or cluster.
      [getRedisClient()],
      {
        // The expected clock drift; for more details see:
        // http://redis.io/topics/distlock
        driftFactor: 0.01, // multiplied by lock ttl to determine drift time

        // The max number of times Redlock will attempt to lock a resource
        // before erroring.
        retryCount: 10,

        // the time in ms between attempts
        retryDelay: 200, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        retryJitter: 200, // time in ms

        // The minimum remaining time on a lock before an extension is automatically
        // attempted with the `using` API.
        automaticExtensionThreshold: 500, // time in ms
      }
    );
  }

  return redlock;
}
