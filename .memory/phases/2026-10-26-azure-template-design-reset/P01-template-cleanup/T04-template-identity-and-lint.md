# Task: T04 템플릿 식별자와 ESLint 정책 정리

## Status: done

## Goal

`kpc_app` 패키지·인증 캐시 식별자를 범용 이름으로 바꾸고 명시적 `any`를 ESLint 오류로 만들어 새 프로젝트가 중립적인 기본값과 타입 검사 기준에서 시작하도록 한다.

## Decision Summary

- npm 패키지명과 `AUTH_CACHE_NAMESPACE` 기본값은 정확히 `azure-app-template`을 사용한다. 배포 환경이 기존 `kpc_app` 네임스페이스를 명시적으로 설정했다면 그 환경값은 코드가 임의로 바꾸지 않는다.
- 현재 명시적 `any` 사용은 T02에서 삭제할 제안서 파일에만 있다. T02·T03 완료 후 규칙을 켜고 활성 TypeScript 소스·테스트 전체에 적용한다.

## Implementation

### I01. 패키지와 인증 캐시 기본 식별자를 통일

- Related Files:
  - `package.json` :: 최상위 `name` — `azure-app-template`로 변경; modify
  - `package-lock.json` :: 최상위 `name`, `packages[""].name` — npm 잠금 파일 동기화; modify
  - `.env.example` :: `AUTH_CACHE_NAMESPACE` — 공개 예시 기본값을 변경; modify
  - `config/env.schema.ts` :: `rawServerEnvSchema.AUTH_CACHE_NAMESPACE`, `parseServerEnv`, `ServerEnv.authCacheNamespace` — 누락 시 기본값만 변경; modify
  - `tests/config/env.schema.test.ts` :: `parseServerEnv` 기본값 테스트 — 새 기본값 및 환경 override 검증; modify
  - `tests/config/azure.test.ts` :: `createEnv` fixture — 중립 식별자로 변경; modify
  - `tests/lib/auth/credentials.test.ts` :: `createEnv` fixture — 중립 식별자로 변경; modify
  - `tests/lib/auth/session-cache.test.ts` :: `createEnv`, `buildSessionCacheKey` 테스트 — 새 기본 키 및 override 검증; modify
  - `tests/services/AuthService.test.ts` :: `createEnv`, embedded `state` cookie 테스트 — 새 이름 검증; modify
  - `lib/auth/session-cache.ts` :: `SessionCacheKeyInput`, `buildSessionCacheKey` — 호출자 네임스페이스를 사용하는 로직 보존; read-only
  - `services/AuthService.ts` :: `getNextAuthEntraIdProvider`, `getEmbeddedCookies` — `this.env.authCacheNamespace` 사용 보존; read-only
  - `components/auth/LoginComponent.tsx` :: `startLogin`의 `openCenteredPopup` 창 이름 — 남은 KPC 전용 식별자를 중립화; modify

#### Details

- **Signatures & Types**:
  ```typescript
  interface ServerEnv { authCacheNamespace: string /* 기존 나머지 필드 유지 */ }
  function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv;
  interface SessionCacheKeyInput {
    namespace: string;
    appEnv: string;
    accountId: string;
  }
  function buildSessionCacheKey(input: SessionCacheKeyInput): string;
  ```
- **Data & Schema Fields**:
  - `package.json.name = "azure-app-template"`.
  - `package-lock.json.name = "azure-app-template"`, `package-lock.json.packages[""].name = "azure-app-template"`.
  - `.env.example`: `AUTH_CACHE_NAMESPACE=azure-app-template`. T01에서 설정한 `NEXT_PUBLIC_APP_NAME=Azure App Template`과 `NEXT_PUBLIC_APP_DESCRIPTION=Azure 기반 업무 애플리케이션 템플릿`은 유지한다.
  - `rawServerEnvSchema.AUTH_CACHE_NAMESPACE`는 변수 누락 시 `"azure-app-template"`을 사용한다. 기존 `nonBlankString` 검사와 사용자 지정 문자열 허용은 유지한다.
  - 기대 키: `azure-app-template/staging/session-cache/account-id`. Embedded state cookie 기대 이름: `azure-app-template-next-auth.state`.
  - 팝업 창 이름: `azure-app-template-login`.
- **Execution Flow / Logic**:
  1. 패키지 최상위 이름만 바꾸고 T02·T03에서 정리한 Azure·인증·Next.js 의존성·script는 유지한다. `npm.cmd install --package-lock-only --ignore-scripts`로 lockfile을 갱신한다.
  2. `parseServerEnv({})`의 캐시 네임스페이스는 새 기본값으로, `parseServerEnv({ AUTH_CACHE_NAMESPACE: "my-app" })`은 명시값 `"my-app"`으로 남는지 테스트한다. 빈 문자열은 기존 `nonBlankString` 규칙에 따라 거부한다.
  3. `tests/config/azure.test.ts`, `tests/lib/auth/credentials.test.ts`의 `ServerEnv` fixture와 AuthService·세션 캐시 fixture의 `kpc_app` 문자열을 교체한다. `buildSessionCacheKey({ namespace: "custom-app", appEnv: "staging", accountId: "account-id" })`가 `"custom-app/staging/session-cache/account-id"`를 반환하는 시나리오도 검증한다. 경로 조합 로직은 변경하지 않는다.
  4. `LoginComponent.startLogin`의 팝업 창 이름 `kpc-app-login`을 `azure-app-template-login`으로 바꾼다. 창의 크기·URL·차단 처리·메시지 검증은 그대로 둔다.
  5. 기존 네임스페이스로 발급된 Redis 키와 embedded state cookie는 새 기본값에서 재사용되지 않는다. 기존 배포에서 로그인 세션이 재인증될 수 있음을 T05 README에 명시한다. 추적되지 않는 실제 `.env.local`/`.env.development`와 배포 비밀 설정은 수정하지 않는다.

### I02. 명시적 any 금지를 품질 게이트로 활성화

- Related Files:
  - `eslint.config.mjs` :: `eslintConfig` — 전역 `@typescript-eslint/no-explicit-any: off` 재정의를 제거하고 TS 파일에 `error` 적용; modify
  - `components/proposals/**`, `data/proposals/**` :: 기존 명시적 `any`가 T02에서 삭제되는 파일군; read-only (T04 시작 전 부재 확인)
  - `app/**/*.ts`, `app/**/*.tsx`, `components/**/*.ts`, `components/**/*.tsx`, `config/**/*.ts`, `lib/**/*.ts`, `scripts/**/*.ts`, `services/**/*.ts`, `tests/**/*.ts`, `types/**/*.ts`, `utils/**/*.ts` :: 남은 활성 TypeScript 검사 범위; read-only

#### Details

- **Signatures & Types**:
  ```javascript
  // eslint.config.mjs의 TypeScript 설정 범위
  files: ["**/*.ts", "**/*.tsx", "**/*.mts"]
  rules: { "@typescript-eslint/no-explicit-any": "error" }
  ```
- **Data & Schema Fields**:
  - ESLint 규칙은 `off`에서 `error`로 바뀐다. 예외 파일·`eslint-disable` 주석은 추가하지 않는다.
- **Execution Flow / Logic**:
  1. 기존 `globalIgnores`와 Next.js `core-web-vitals`/`typescript` 설정은 유지한다. `// 전역적으로 any 허용` 주석과 `off` override를 제거한다.
  2. TypeScript 소스와 테스트에 위 규칙을 적용한다. T02가 제거한 `as any`, `useState<any>`가 활성 파일에 남지 않았는지 확인한다.
  3. `npm.cmd run lint`에서 위반이 발견되면 해당 심볼의 실제 union/interface 또는 `unknown`과 좁히기를 사용하도록 청사진의 수정 대상에 기록해 해결한다. 규칙을 다시 끄거나 파일별 예외를 만들지 않는다.
  4. lint 성공 후 `npm.cmd run typecheck`와 범용 단위 테스트를 실행해 타입 좁히기 변경이 동작을 깨지 않았는지 확인한다.

## Acceptance Criteria

- [ ] 추적되는 활성 코드·설정·테스트·패키지 잠금 파일에 `kpc_app` 문자열이 없고 npm 이름·캐시 기본값이 `azure-app-template`로 일치한다.
- [ ] 팝업 창 이름에도 KPC 전용 식별자가 남지 않는다.
- [ ] 사용자 지정 `AUTH_CACHE_NAMESPACE`는 여전히 적용되며 기본 Redis 키와 embedded state cookie 테스트가 새 값으로 통과한다.
- [ ] TypeScript 파일의 명시적 `any`는 ESLint 오류이고 전체 lint·typecheck·단위 테스트가 통과한다.

## Validation

- `npm.cmd run test -- tests/config/env.schema.test.ts tests/config/azure.test.ts tests/lib/auth/credentials.test.ts tests/lib/auth/session-cache.test.ts tests/services/AuthService.test.ts` — 기본값·override·캐시 키·쿠키 및 관련 인증 테스트 통과.
- `npm.cmd run lint` — `@typescript-eslint/no-explicit-any` 오류 포함 전체 ESLint 통과.
- `npx.cmd eslint --print-config config/env.schema.ts | node -e "const fs=require('node:fs'); const config=JSON.parse(fs.readFileSync(0,'utf8')); if(config.rules['@typescript-eslint/no-explicit-any'][0]!==2) process.exit(1);"` — 실제 ESLint 병합 설정에서 해당 규칙 severity가 `error`(2)인지 확인.
- `npm.cmd run typecheck` — 타입 검사 통과.
- `rg -n 'kpc_app' .env.example config tests package.json package-lock.json` — 매치 없음(종료 코드 1이 기대값).
- `rg -n 'kpc-app|KPC' app components config lib services tests package.json` — 매치 없음(종료 코드 1이 기대값).
- `rg -n 'no-explicit-any.*off' eslint.config.mjs` — 매치 없음(종료 코드 1이 기대값).

## Commit Message

```text
chore(template): 패키지와 캐시 이름을 중립화하고 any 금지

Plan: 2026-10-26-azure-template-design-reset
Phase: P01-template-cleanup
Task: T04-template-identity-and-lint

- npm·인증 캐시 기본 식별자를 azure-app-template로 통일
- 명시적 any를 ESLint 오류로 적용하고 관련 테스트 갱신
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 완료 (Git 로그 참조)
