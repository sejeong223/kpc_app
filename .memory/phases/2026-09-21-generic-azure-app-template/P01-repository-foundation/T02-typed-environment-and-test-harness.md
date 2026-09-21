# Task: T02 Typed Environment And Test Harness

## Status: pending

## Goal
선택형 인증과 Azure 서비스가 빈 문자열로 실행되지 않도록 Zod 기반 환경설정 경계를 만들고, 이후 Task가 외부 서비스 없이도 계약을 검증할 수 있는 Vitest·typecheck 실행 기반을 제공한다.

## Decision Summary
- 인증이 꺼진 로컬 템플릿은 Azure·Redis 값 없이 유효해야 한다.
- 인증을 켠 경우 인증서 또는 클라이언트 시크릿 중 정확히 하나만 허용하고, 운영에서는 Redis를 필수로 한다.
- 실제 값은 `.env.development`에만 두고 `.env.example`에는 빈 placeholder와 안전한 기본값만 기록한다.

## Implementation

### I01. 직접 의존성과 검증 스크립트 정리

- Related Files:
  - `package.json` :: dependencies/scripts — 직접 import 누락을 보완하고 검증 명령 추가; modify
  - `package-lock.json` :: resolved dependency graph — npm으로 동기화; modify
  - `vitest.config.ts` :: Vitest node test configuration — 신규 생성; new
  - `eslint.config.mjs` :: generated test artifact ignores — `coverage/**` 유지·확인; modify if needed

#### Details
- **Dependency Changes**:
  - runtime direct dependencies에 `@azure/core-auth`, `@azure/msal-node`, `server-only`, `zod`를 추가한다.
  - dev dependencies에 `vitest`, `tsx`를 추가한다. `tsx`는 P02-T04의 명시적 Cosmos provisioning CLI에서 사용한다.
  - Next.js, React, NextAuth major version은 변경하지 않는다.
- **Package Scripts**:
  ```json
  {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "azure:cosmos:provision": "tsx scripts/provision-cosmos.ts"
  }
  ```
  - 기존 `dev`, `build`, `start`, `lint`는 유지한다.
  - provisioning 스크립트 파일은 P02-T04에서 추가하므로 이 Task에서는 해당 명령을 실행하지 않는다.
- **Vitest Configuration**:
  - `test.environment`: `node`.
  - `test.include`: `tests/**/*.test.ts`.
  - `resolve.alias['@']`: 저장소 루트 절대 경로.
  - 외부 Azure·Redis 네트워크 연결은 테스트 초기화에서 만들지 않는다.

### I02. 순수 환경 파서와 서버 전용 접근점 구현

- Related Files:
  - `config/env.schema.ts` :: `parseServerEnv`, `ServerEnv` — 테스트 가능한 Zod 파서; new
  - `config/env.ts` :: `serverEnv` — `server-only`가 적용된 프로덕션 접근점; new
  - `.env.example` :: public configuration contract — 비밀값 없는 예제; new

#### Details
- **Signatures & Types**:
  ```typescript
  export type NodeEnvironment = 'development' | 'test' | 'production';

  export interface ServerEnv {
    nodeEnv: NodeEnvironment;
    appEnv: string;
    authEnabled: boolean;
    embeddedMode: boolean;
    authCacheNamespace: string;
    nextAuthUrl?: string;
    nextAuthSecret?: string;
    msalTenantId?: string;
    msalClientId?: string;
    msalClientSecret?: string;
    msalCertPfx?: string;
    msalCertPassword?: string;
    redisUrl?: string;
    redisClusterMode: boolean;
    azureUseManagedIdentity: boolean;
    cosmosDbEndpoint?: string;
    cosmosDbKey?: string;
    cosmosDbName?: string;
    blobAccountName?: string;
    blobAccountKey?: string;
    iframeAllowedDomains: string[];
  }

  export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv;
  export const serverEnv: ServerEnv;
  ```
- **Raw Environment Fields**:
  - 기본값: `NODE_ENV=development`, `APP_ENV=local`, `AUTH_ENABLED=false`, `EMBEDDED_MODE=false`, `AUTH_CACHE_NAMESPACE=kpc_app`, `REDIS_CLUSTER_MODE=false`, `AZURE_USE_MANAGED_IDENTITY=false`.
  - 인증: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `MSAL_TENANT_ID`, `MSAL_CLIENT_ID`, `MSAL_CLIENT_SECRET`, `MSAL_CERT_PFX`, `MSAL_CERT_PASSWORD`.
  - 캐시: `REDIS_URL`, `REDIS_CLUSTER_MODE`.
  - 데이터 서비스: `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_NAME`, `BLOB_ACCOUNT_NAME`, `BLOB_ACCOUNT_KEY`, `AZURE_USE_MANAGED_IDENTITY`.
  - 임베드: `IFRAME_ALLOWED_DOMAINS`를 쉼표로 나눠 trim하고 빈 항목을 제거한다.
  - 공개 브랜딩 placeholder: `NEXT_PUBLIC_APP_NAME=KPC App`, `NEXT_PUBLIC_APP_DESCRIPTION=사내 업무 애플리케이션`은 `.env.example`에 문서화하되 서버 비밀 스키마에는 넣지 않는다.
- **Conditional Validation**:
  1. `AUTH_ENABLED=true`이면 `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `MSAL_TENANT_ID`, `MSAL_CLIENT_ID`가 필수다.
  2. 인증 활성 시 `MSAL_CERT_PFX`와 `MSAL_CLIENT_SECRET` 중 정확히 하나만 존재해야 한다. 인증서 비밀번호는 선택이다.
  3. `NODE_ENV=production`이면서 인증 활성 시 `REDIS_URL`이 필수다.
  4. `EMBEDDED_MODE=true`인데 인증이 꺼져 있으면 구성 오류다.
  5. Boolean 값은 대소문자를 정규화한 `true` 또는 `false`만 허용하고 `"0"`, 빈 문자열, 임의 문자열을 묵시적으로 참/거짓 처리하지 않는다.
  6. 오류 메시지는 누락·충돌한 키 이름만 포함하고 입력된 secret/PFX/key 값은 포함하지 않는다.
- **Execution Flow / Logic**:
  - `config/env.schema.ts`에는 `server-only`를 import하지 않아 Vitest가 `parseServerEnv`를 직접 테스트할 수 있게 한다.
  - `config/env.ts`만 `import 'server-only'` 후 `parseServerEnv(process.env)` 결과를 export한다.

### I03. 환경 계약 단위 테스트

- Related Files:
  - `tests/config/env.schema.test.ts` :: `parseServerEnv` cases — 조건부 검증 회귀 테스트; new

#### Details
- **Required Test Cases**:
  1. 최소 입력과 `AUTH_ENABLED=false`가 Azure·Redis 값 없이 성공하고 안전한 기본값을 반환한다.
  2. 인증서 방식(`MSAL_CERT_PFX`만 존재)과 시크릿 방식(`MSAL_CLIENT_SECRET`만 존재)이 각각 성공한다.
  3. 두 인증 자격 증명이 동시에 있거나 둘 다 없으면 실패한다.
  4. 인증 활성 상태에서 tenant/client/NextAuth 값 중 하나가 없으면 해당 키를 지목한다.
  5. production 인증에서 `REDIS_URL` 누락은 실패하지만 development에서는 성공한다.
  6. 인증 비활성 + embedded 활성 조합은 실패한다.
  7. 쉼표 구분 iframe 도메인이 trim·빈 항목 제거된 배열이 된다.
  8. iframe source는 `https://host` 또는 `https://*.host` 형식만 허용하고 whitespace, semicolon, path/query/fragment가 있는 값은 CSP 삽입 방지를 위해 실패한다.
  9. 잘못된 Boolean과 URL 형식은 실패한다.
  10. validation error 문자열에 제공한 가짜 secret 값이 포함되지 않는다.
- **Mocking Boundary**:
  - 테스트는 `process.env` 전역을 직접 변경하지 않고 각 case마다 독립 객체를 `parseServerEnv`에 전달한다.

## Acceptance Criteria
- [ ] 직접 import하는 MSAL·core-auth·server-only와 새 Zod/Vitest/tsx 패키지가 `package.json`에 직접 선언된다.
- [ ] 인증 비활성 최소 환경과 두 인증 자격 증명 방식의 유효/무효 조합이 테스트로 고정된다.
- [ ] 운영 인증은 Redis 없이 유효하지 않다.
- [ ] `.env.example`에 실제 비밀값이 없고 `.env.development`는 계속 ignore된다.
- [ ] `test`, `typecheck`, `test:watch`, Cosmos provisioning 스크립트가 package scripts에 존재한다.

## Validation
- `npm.cmd run test -- tests/config/env.schema.test.ts` — 모든 환경 스키마 테스트 통과
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- config tests vitest.config.ts` — 새 기반 파일에서 error/warning 0
- `git check-ignore .env.development` — 실제 환경파일이 계속 제외됨
- `git check-ignore -q .env.example; if ($LASTEXITCODE -eq 0) { throw '.env.example must be trackable' }` — `.env.example`은 추적 가능

## Commit Message
```text
feat(config): add typed environment validation

Plan: 2026-09-21-generic-azure-app-template
Phase: P01-repository-foundation
Task: T02-typed-environment-and-test-harness

- validate optional auth and production Redis requirements with Zod
- add a secret-free environment example and Vitest harness
- declare direct runtime dependencies and quality scripts
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
