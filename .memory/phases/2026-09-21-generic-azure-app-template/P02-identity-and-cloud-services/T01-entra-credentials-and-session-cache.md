# Task: T01 Entra Credentials And Session Cache

## Status: pending

## Goal
인증서 또는 클라이언트 시크릿을 한 경계에서 선택하고, 로컬에서는 만료 가능한 메모리 캐시·운영에서는 Redis를 사용하는 MSAL 토큰 캐시를 제공해 Daruda 이름과 직접 `process.env` 접근을 인증 기반 계층에서 제거한다.

## Decision Summary
- P01-T02의 `serverEnv` 계약을 유일한 설정 입력으로 사용한다.
- Entra 인증서는 우선 방식이지만 환경 검증상 인증서와 시크릿은 상호 배타적이다.
- 인증을 켠 development에서 `REDIS_URL`이 없으면 메모리 캐시, production에서는 Redis만 사용한다.

## Implementation

### I01. Entra 자격 증명 팩토리

- Related Files:
  - `lib/auth/credentials.ts` :: `getEntraCredentialConfig`, `createMsalClient`, `createGraphTokenCredential` — MSAL/Graph 공용 자격 증명 경계; new
  - `utils/cert.ts` :: `parsePfx` — PFX password와 명시적 오류 타입 지원; modify
  - `utils/envCert.ts` :: `getEnvCert` — 직접 env 접근을 새 팩토리로 대체하므로 제거; delete
  - `tests/lib/auth/credentials.test.ts` :: credential selection cases — SDK 생성자를 mock한 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  import type { ICachePlugin } from '@azure/msal-node';
  import type { TokenCredential } from '@azure/core-auth';
  import type { ServerEnv } from '@/config/env.schema';

  export interface CertificateMaterial {
    certificatePem: string;
    privateKeyPem: string;
    thumbprint: string;
    combinedPem: string;
  }

  export type EntraCredentialConfig =
    | {
        mode: 'certificate';
        tenantId: string;
        clientId: string;
        certificate: CertificateMaterial;
      }
    | {
        mode: 'client-secret';
        tenantId: string;
        clientId: string;
        clientSecret: string;
      };

  export function parsePfx(
    base64EncodedPfx: string,
    password?: string,
  ): CertificateMaterial;

  export function getEntraCredentialConfig(
    env?: ServerEnv,
  ): EntraCredentialConfig;

  export function createMsalClient(options?: {
    env?: ServerEnv;
    cachePlugin?: ICachePlugin;
  }): import('@azure/msal-node').ConfidentialClientApplication;

  export function createGraphTokenCredential(
    env?: ServerEnv,
  ): TokenCredential;
  ```
- **Execution Flow / Logic**:
  1. `getEntraCredentialConfig`는 이미 검증된 `ServerEnv`를 받아 certificate 또는 secret discriminated union을 반환한다.
  2. certificate mode는 `MSAL_CERT_PFX`와 선택적 `MSAL_CERT_PASSWORD`를 `parsePfx`에 전달한다.
  3. `createMsalClient`는 certificate mode에서 MSAL `clientCertificate.thumbprint/privateKey`, secret mode에서 `clientSecret`을 설정하며 둘을 함께 전달하지 않는다.
  4. `createGraphTokenCredential`는 같은 선택 결과로 `ClientCertificateCredential` 또는 `ClientSecretCredential`을 생성한다. 인증서 방식은 `combinedPem`을 `{ certificate }` 구성으로 전달한다.
  5. authority는 `https://login.microsoftonline.com/{tenantId}`로 고정하고 입력된 secret/PFX를 로그로 남기지 않는다.
- **Error & Exception Handling**:
  - 잘못된 PFX, key bag 없음, certificate bag 없음은 원래 값 없이 `CertificateConfigurationError`로 래핑한다.
  - 선택 불가능한 자격 증명 조합은 P01 스키마에서 차단하지만 팩토리도 방어적으로 `AppConfigurationError`를 던진다.

### I02. 환경별 세션 캐시 및 MSAL cache plugin

- Related Files:
  - `lib/auth/session-cache.ts` :: `SessionCache`, `MemorySessionCache`, `RedisSessionCache`, `getSessionCache`, `buildSessionCacheKey` — 캐시 추상화; new
  - `lib/auth/msal-cache-plugin.ts` :: `MsalCachePlugin` — MSAL `ICachePlugin` adapter; new
  - `utils/redis.ts` :: `getRedisClient`, `getRedlock` — 검증된 env와 native URL parser 사용; modify
  - `tests/lib/auth/session-cache.test.ts` :: memory expiry, backend choice, key namespace — 단위 테스트; new
  - `tests/lib/auth/msal-cache-plugin.test.ts` :: before/after cache behavior — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export interface SessionCache {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
  }

  export class MemorySessionCache implements SessionCache {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    clear(): void;
  }

  export class RedisSessionCache implements SessionCache {
    constructor(client: import('ioredis').Redis | import('ioredis').Cluster);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
  }

  export interface SessionCacheKeyInput {
    namespace: string;
    appEnv: string;
    accountId: string;
  }

  export function buildSessionCacheKey(input: SessionCacheKeyInput): string;
  export function getSessionCache(env?: ServerEnv): SessionCache;

  export class MsalCachePlugin implements import('@azure/msal-node').ICachePlugin {
    constructor(options: {
      cache: SessionCache;
      cacheKey: string;
      ttlSeconds?: number;
    });
    beforeCacheAccess(context: import('@azure/msal-node').TokenCacheContext): Promise<void>;
    afterCacheAccess(context: import('@azure/msal-node').TokenCacheContext): Promise<void>;
  }
  ```
- **Data & Schema Fields**:
  - 메모리 entry: `{ value: string; expiresAt: number }`, `expiresAt = Date.now() + ttlSeconds * 1000`.
  - cache key: `${namespace}/${appEnv}/session-cache/${accountId}`; 기존 `@daruda_app` 문자열을 완전히 제거한다.
  - 기본 MSAL cache TTL: 90일(`60 * 60 * 24 * 90`).
- **Execution Flow / Logic**:
  1. development/test에서 `redisUrl`이 없으면 process 단위 singleton `MemorySessionCache`를 반환한다.
  2. `redisUrl`이 있으면 singleton `RedisSessionCache`를 반환한다.
  3. production + auth enabled + Redis 누락은 환경 스키마가 먼저 차단한다. 방어적으로 cache factory도 오류를 낸다.
  4. Redis standalone은 `new Redis(url)`, cluster는 native `URL`로 host/port/username/password와 `rediss:` TLS 여부를 분리해 `Redis.Cluster`의 `redisOptions`로 전달한다.
  5. `MsalCachePlugin.beforeCacheAccess`는 값이 있을 때만 deserialize하고, `afterCacheAccess`는 `cacheHasChanged`일 때만 serialize/set한다.
  6. `getRedlock`은 Redis 설정이 있을 때만 생성하며 메모리 캐시로 분산 락을 흉내 내지 않는다.
- **Error & Exception Handling**:
  - 만료된 메모리 entry는 즉시 삭제하고 `null`을 반환한다.
  - Redis URL parsing 오류에는 URL 자체나 password를 포함하지 않는다.
  - cache backend 오류를 성공으로 삼키지 않고 인증 호출자에게 전달한다.

### I03. Microsoft Graph 클라이언트 연결

- Related Files:
  - `services/MSGraphService.ts` :: `MSGraphService` — credential injection이 가능한 Graph factory; modify
  - `tests/services/MSGraphService.test.ts` :: middleware initialization — 네트워크 없는 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export default class MSGraphService {
    constructor(credential?: import('@azure/core-auth').TokenCredential);
    getMSGraphClient(): import('@microsoft/microsoft-graph-client').Client;
  }
  ```
- **Execution Flow / Logic**:
  - 기본 credential은 `createGraphTokenCredential()` 결과다.
  - scope는 `https://graph.microsoft.com/.default` 하나만 사용한다.
  - constructor injection으로 테스트가 실제 Entra endpoint에 접속하지 않게 한다.
  - `getMSGraphClient`는 동기 factory여도 되며 네트워크 호출은 반환된 client의 `.api(...).get()` 시점에만 발생한다.

## Acceptance Criteria
- [ ] certificate/secret 방식이 MSAL과 Graph 모두 동일한 env 선택 규칙을 사용한다.
- [ ] 인증 관련 소스에 `process.env` 직접 접근과 `daruda` cache namespace가 남지 않는다.
- [ ] development에서 Redis 없이 memory cache가 선택되고 TTL 만료가 검증된다.
- [ ] production 인증에서 cache factory가 Redis 없는 구성을 허용하지 않는다.
- [ ] Redis cluster URL의 사용자명·비밀번호·TLS가 유실되지 않는다.
- [ ] Graph 서비스 테스트가 외부 네트워크 없이 통과한다.

## Validation
- `npm.cmd run test -- tests/lib/auth/credentials.test.ts tests/lib/auth/session-cache.test.ts tests/lib/auth/msal-cache-plugin.test.ts tests/services/MSGraphService.test.ts` — 관련 테스트 전체 통과
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- lib/auth utils services/MSGraphService.ts tests/lib/auth tests/services/MSGraphService.test.ts` — error/warning 0
- `rg -n -i "daruda|process\.env" lib/auth utils/redis.ts services/MSGraphService.ts` — 결과 없음

## Commit Message
```text
feat(auth): generalize credentials and token cache

Plan: 2026-09-21-generic-azure-app-template
Phase: P02-identity-and-cloud-services
Task: T01-entra-credentials-and-session-cache

- support certificate and client-secret Entra credentials
- use memory cache in development and Redis in production
- remove Daruda-specific Graph and cache configuration
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
