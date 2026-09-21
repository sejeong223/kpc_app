# Task: T02 Optional Auth Service And RBAC

## Status: done

## Goal
`AUTH_ENABLED`에 따라 안전하게 비활성화할 수 있는 NextAuth/MSAL 서비스를 만들고, Entra ID App Roles의 `User`·`Admin` 값을 서버와 UI가 공유하는 단일 역할 모델 및 관리자 접근 가드로 제공한다.

## Decision Summary
- 인증이 꺼져 있으면 session 조회가 Azure·Redis를 초기화하지 않고 `null`을 반환한다.
- 역할은 Entra token의 `roles` claim만 신뢰하며 이메일·UPN allowlist나 Cosmos 권한 DB를 만들지 않는다.
- 관리자 접근 결정은 UI 숨김과 별개로 서버에서 다시 검사한다.

## Implementation

### I01. 역할 타입과 순수 접근 정책

- Related Files:
  - `lib/auth/roles.ts` :: `APP_ROLES`, `AppRole`, `normalizeRoles`, `hasRole` — client/server 공용 역할 모델; new
  - `lib/auth/access-policy.ts` :: `evaluateAccess`, `buildLoginUrl`, `AccessDecision` — side-effect 없는 접근 정책; new
  - `tests/lib/auth/roles.test.ts` :: role normalization cases — 단위 테스트; new
  - `tests/lib/auth/access-policy.test.ts` :: auth-disabled/anonymous/user/admin matrix — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export const APP_ROLES = {
    USER: 'User',
    ADMIN: 'Admin',
  } as const;

  export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

  export function normalizeRoles(value: unknown): AppRole[];
  export function hasRole(
    roles: readonly string[] | null | undefined,
    requiredRole: AppRole,
  ): boolean;

  export type AccessDecision =
    | { kind: 'allow' }
    | { kind: 'not-found' }
    | { kind: 'login'; callbackUrl: string }
    | { kind: 'forbidden'; callbackUrl: string };

  export function evaluateAccess(input: {
    authEnabled: boolean;
    authenticated: boolean;
    roles?: readonly string[];
    requiredRole: AppRole;
    callbackUrl: string;
  }): AccessDecision;

  export function buildLoginUrl(input: {
    callbackUrl: string;
    reason?: 'forbidden';
  }): string;
  ```
- **Execution Flow / Logic**:
  1. `normalizeRoles`는 정확히 `User` 또는 `Admin`인 고유 문자열만 보존한다. unknown/string 아닌 값은 버린다.
  2. `authEnabled=false`이면 관리자 기능은 `not-found`다.
  3. 인증 활성 + 세션 없음은 `login`, 세션 있음 + 역할 없음은 `forbidden`, 역할 있음은 `allow`다.
  4. `buildLoginUrl`은 callback을 `URLSearchParams`로 인코딩하고 reason이 있을 때만 추가한다.
- **Test Matrix**:
  - 인증 off는 session/role과 관계없이 `not-found`.
  - 인증 on + anonymous는 `login`.
  - `User`만 있는 session은 Admin 요구 시 `forbidden`.
  - `Admin`은 `allow`; 중복/unknown roles는 정규화된다.

### I02. 선택형 AuthService 일반화

- Related Files:
  - `services/AuthService.ts` :: `AuthService`, `EntraIDProfile`, `CurrentUser` — env·credential·cache abstraction 기반으로 전면 수정; modify
  - `const/auth.ts` :: `AUTH_TOKEN_VERSION` — 기존 Daruda session을 무효화할 template version으로 변경; modify
  - `types/next-auth.d.ts` :: Session/Profile/JWT augmentation — `AppRole`과 refresh error 반영; modify
  - `tests/services/AuthService.test.ts` :: disabled mode, callbacks, refresh behavior — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  import type { Session } from 'next-auth';
  import type { NextAuthOptions } from 'next-auth';

  export interface EntraIDProfile extends Record<string, unknown> {
    sub: string;
    oid?: string;
    name?: string;
    email?: string;
    roles?: unknown;
  }

  export interface CurrentUser {
    name: string | null;
    oid: string;
    upn: string;
    roles: AppRole[];
  }

  export default class AuthService {
    constructor(options?: {
      env?: ServerEnv;
      graphService?: MSGraphService;
      sessionCache?: SessionCache;
    });
    isEnabled(): boolean;
    getNextAuthOptions(): Promise<NextAuthOptions>;
    getSession(): Promise<Session | null>;
    getCurrentUser(): Promise<CurrentUser | null>;
    getAuthScopes(extraScopes?: readonly string[]): string[];
  }
  ```
- **NextAuth/JWT Fields**:
  - `Session.user`: `oid?: string`, `upn?: string`, `access_token?: string`, `roles: AppRole[]`, 기존 `DefaultSession['user']`.
  - `Session.error?: 'RefreshAccessTokenError'`.
  - `JWT`: `oid`, `upn`, `access_token`, `expires_at`, `version`, `roles`, `error`.
  - `Profile.roles?: unknown`로 받은 뒤 `normalizeRoles`를 적용한다.
- **Execution Flow / Logic**:
  1. `getSession`은 auth disabled일 때 `getServerSession`, Graph, MSAL, Redis를 호출하지 않고 `null`을 반환한다.
  2. `getNextAuthOptions`는 auth disabled 호출을 구성 오류로 거부한다.
  3. provider scopes는 `offline_access`, `openid`, `profile`, `email`, `User.Read`를 중복 없이 구성한다.
  4. authorization code 교환은 T01의 `createMsalClient`; account cache 저장은 `MsalCachePlugin`과 `{ namespace, appEnv, accountId }` key를 사용한다.
  5. 최초 JWT에서 `access_token`, `expires_at`, `oid`, 정규화된 roles를 저장하고 Graph `/users/{oid}` 결과의 `userPrincipalName`을 `upn`으로 사용한다.
  6. 만료 15분 전부터 account cache로 `acquireTokenSilent({ forceRefresh: true })`를 수행한다.
  7. refresh 실패는 secret/cache 내용을 로그로 남기지 않고 `token.error='RefreshAccessTokenError'`로 표시한다. session callback이 `session.error`에 전달해 route/proxy가 재로그인을 결정할 수 있게 한다.
  8. `AUTH_TOKEN_VERSION`은 `1.0.0`으로 올려 기존 Daruda JWT가 새 template session으로 통과하지 않게 한다.
  9. embedded cookie name은 앱 namespace를 사용하고 `DARUDA_ENABLE_CROSS_SITE_COOKIE`, `daruda-next-auth.state`를 제거한다.
  10. OAuth provider의 현재 `style.logo='/azure.svg'`는 실제 public asset이 없으므로 제거하거나 존재하는 `/M365.png`로 교체한다. 존재하지 않는 asset 경로를 새 template에 남기지 않는다.
- **Cookie Policy**:
  - `embeddedMode=false`: NextAuth 기본 cookie 설정 사용.
  - `embeddedMode=true`: session/callback/csrf/state cookie에 `secure=true`, 필요한 항목에 `httpOnly=true`, `sameSite='none'`, `path='/'`; state cookie name은 `${authCacheNamespace}-next-auth.state`.
- **Error & Exception Handling**:
  - Graph의 UPN 조회가 실패하면 인증 전체를 익명 성공으로 처리하지 않는다. 명확한 auth callback 오류로 종료한다.
  - refresh error session은 보호된 경로에서 `/auth/logout` 또는 login flow로 전환되게 T03에서 처리한다.

### I03. 서버 역할 가드

- Related Files:
  - `lib/auth/guards.ts` :: `requireRole` — Next server redirect/notFound adapter; new
  - `tests/lib/auth/guards.test.ts` :: policy delegation with mocked Next navigation — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export async function requireRole(
    requiredRole: AppRole,
    callbackUrl: string,
    options?: { authService?: AuthService },
  ): Promise<import('next-auth').Session>;
  ```
- **Execution Flow / Logic**:
  1. injected/default `AuthService`에서 enabled 상태와 session을 얻는다.
  2. `evaluateAccess`에 전달한다.
  3. `not-found`는 Next `notFound()`.
  4. `login`은 `/auth/login?callbackUrl=...`로 redirect.
  5. `forbidden`은 `/auth/login?reason=forbidden&callbackUrl=...`로 redirect.
  6. `allow`만 session을 반환한다.
- **Security Constraint**:
  - 메뉴 숨김 여부를 신뢰하지 않으며 관리자 page server component가 항상 이 함수를 호출해야 한다.

## Acceptance Criteria
- [x] role source는 Entra `roles` claim 하나이며 `User`·`Admin` 외 값은 권한으로 인정하지 않는다.
- [x] auth disabled session 조회는 MSAL·Graph·Redis를 호출하지 않는다.
- [x] 기존 `User.Basic`, `DARUDA_ENABLE_CROSS_SITE_COOKIE`, `daruda-next-auth.state`, `@daruda_app` 참조가 제거된다.
- [x] refresh 실패가 session error로 전달되고 비밀값이 오류에 포함되지 않는다.
- [x] 인증 off/anonymous/User/Admin의 관리자 접근 matrix가 단위 테스트로 고정된다.

## Validation
- `npm.cmd run test -- tests/lib/auth/roles.test.ts tests/lib/auth/access-policy.test.ts tests/lib/auth/guards.test.ts tests/services/AuthService.test.ts` — 역할·AuthService 테스트 통과
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- lib/auth services/AuthService.ts types/next-auth.d.ts const/auth.ts tests/lib/auth tests/services/AuthService.test.ts` — error/warning 0
- `rg -n "User\.Basic|DARUDA_ENABLE_CROSS_SITE_COOKIE|daruda-next-auth|@daruda_app" services lib types const` — 결과 없음

## Commit Message
```text
feat(auth): add optional Entra auth and role guards

Plan: 2026-09-21-generic-azure-app-template
Phase: P02-identity-and-cloud-services
Task: T02-optional-auth-service-and-rbac

- bypass external auth dependencies when authentication is disabled
- normalize Entra User and Admin app roles
- enforce server-side administrator access decisions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 610711a
