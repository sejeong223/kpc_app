# Task: T01 Restore Login Presentation

## Status: done

## Goal
`610711a` 기준 메인 로그인 화면의 인디고 아이콘·영문 문구·Microsoft button 배치를 복원하고, 현재 인증·권한·popup 보안 동작이 변하지 않았음을 검증한다.

## Decision Summary
- 시각 디자인만 복원하고 `LoginComponentProps`, `startLogin`, trusted popup message 처리는 유지한다.
- 일반 상태는 원본 영문 문구를, 권한 부족·popup 오류는 현재 한국어 문구를 사용한다.
- `nuqs`, Radix `Label`, `useQueryState`를 재도입하지 않고 semantic HTML과 현재 props를 사용한다.

## Implementation

### I01. 기존 로그인 표현 복원

- Related Files:
  - `components/auth/LoginComponent.tsx` :: `LoginComponent`, `LoginComponentProps`, `startLogin`, `handleMessage` — 원본 표현을 복원하되 현재 인증 동작을 그대로 유지; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export interface LoginComponentProps {
    callbackUrl: string;
    embeddedMode: boolean;
    reason?: "forbidden";
  }

  export default function LoginComponent(
    props: LoginComponentProps,
  ): React.ReactElement;
  ```
- **Presentation Contract**:
  1. 최상단에 `lucide-react` `Languages`를 `w-20 h-20 text-indigo-600 shrink-0`로 렌더링한다. 장식 아이콘이므로 `aria-hidden="true"`를 적용한다.
  2. 아이콘 아래에 `mb-3 mt-10`의 세로 중앙 정렬 문구 영역을 둔다.
  3. 제목은 semantic `<h1>`으로 `Sign In`, `text-[32px] font-semibold`을 사용한다.
  4. 일반 상태는 `Access your account using your` / `company Microsoft login.`을 각각 `text-[14px] font-normal` paragraph로 렌더링한다.
  5. `reason === "forbidden"`이면 일반 설명 대신 `관리자 권한이 없습니다. 권한이 있는 다른 계정으로 로그인해 주세요.`를 한개의 중앙 정렬 paragraph로 표시한다.
  6. button은 `variant="outline"`, `size="lg"`, `m-1 p-6 font-semibold`를 사용한다. 내부에 고해상도에서도 선명한 `/microsoft.svg`를 `20x20`, `mr-5`, alt `Microsoft Logo`로 표시한다.
  7. 일반 button 문구는 `Sign in with Microsoft`, forbidden은 `다른 계정으로 로그인`을 유지한다.
  8. `popupError`는 button 아래에 `role="alert"`와 destructive semantic color로 표시한다.
- **Execution Flow / Logic (must remain unchanged)**:
  1. `isTrustedLoginSuccessMessage` 검증이 성공할 때만 `window.location.replace(callbackUrl)`를 호출한다.
  2. forbidden은 새 로그인 전 `signOut({ redirect: false })`를 수행하고 `prompt=select_account`를 전달한다.
  3. `embeddedMode || isPopupOrIframe()`일 때만 popup을 열고 반환된 `Window | null`을 `popupRef`에 보존한다.
  4. popup이 `null`이면 현재 한국어 차단 안내를 표시한다.
  5. 일반 redirect login은 sanitized `callbackUrl`을 `signIn` options에 전달한다.
- **Dependency Boundary**:
  - `nuqs`, `useQueryState`, `@radix-ui/react-label`을 import하지 않는다.
  - query string을 component에서 다시 읽지 않고 `callbackUrl`, `embeddedMode`, `reason`을 props로만 받는다.

### I02. 로그인 page 배치 복원

- Related Files:
  - `app/auth/login/page.tsx` :: `LoginPage` — 흰 배경의 전체 화면 중앙 배치를 복원하되 서버 guard를 유지; modify
  - `app/auth/login/popup/PopupLoginPage.tsx` :: `PopupLoginPage` — 현재 trusted opener message 구조 유지; read-only
  - `app/auth/logout/page.tsx` :: `LogoutPage`, `LogoutEffect` — 현재 sanitized callback 구조 유지; read-only

#### Details
- **Page Contract**:
  ```typescript
  export default async function LoginPage(input: {
    searchParams: Promise<{
      callbackUrl?: string;
      reason?: string;
    }>;
  }): Promise<React.ReactElement>;
  ```
- **Presentation Contract**:
  - `LoginComponent`를 `flex min-h-screen flex-col items-center justify-center bg-white`인 `<main>` 안에 배치한다.
  - 현재의 muted background, bordered card, card shadow/max-width는 제거한다.
- **Execution Flow / Logic (must remain unchanged)**:
  1. `serverEnv.authEnabled=false`면 `notFound()`를 호출한다.
  2. `callbackUrl`은 `sanitizeCallbackUrl`을 거쳐 component에 전달한다.
  3. query `reason`이 정확히 `forbidden`일 때만 union 값으로 인정한다.
  4. session이 있고 forbidden이 아니면 sanitized callback으로 redirect한다.
  5. `embeddedMode`와 `reason`을 `LoginComponent`에 계속 전달한다.

### I03. 보안 회귀와 시각 계약 검증

- Related Files:
  - `tests/lib/auth/callback-url.test.ts` :: `sanitizeCallbackUrl` 허용/거부 matrix — 외부 callback 차단 회귀 검증; read-only
  - `tests/lib/auth/login-message.test.ts` :: `isTrustedLoginSuccessMessage` origin/source/data matrix — popup spoofing 차단 회귀 검증; read-only
  - `tests/lib/auth/access-policy.test.ts` :: anonymous/forbidden/Admin access policy — 권한 분기 회귀 검증; read-only

#### Details
- **Security Regression Scenarios**:
  - external/protocol-relative/backslash callback은 `/`로 정규화된다.
  - popup success는 origin과 source window가 모두 일치할 때만 수락된다.
  - anonymous, non-admin, Admin이 각각 login, forbidden account-switch, allow로 분기된다.
- **Static Presentation Checks**:
  - `LoginComponent.tsx`에 `Languages`, `text-indigo-600`, `Sign In`, 두 줄 영문 설명, `Sign in with Microsoft`가 모두 존재해야 한다.
  - `LoginComponent.tsx`, `app/auth/login` 하위에 `nuqs`, `useQueryState`가 없어야 한다.

### I04. 로그인 로고 공개 경로 보정
- Related Files:
  - `lib/auth/proxy-policy.ts` :: `isPublicAuthAssetPath`, `shouldApplyAuthentication` — 로그인 전 SVG 요청만 인증 예외 처리; modify
  - `services/AuthService.ts` :: `getNextAuthEntraIdProvider` — 공급자 logo를 `/microsoft.svg`로 통일; modify
  - `tests/lib/auth/proxy-policy.test.ts` :: 공개 logo와 보호 route 회귀 검증; modify
  - `public/microsoft.svg` :: 고해상도 Microsoft vector logo; create
  - `public/M365.png` :: 더 이상 참조하지 않는 20x20 raster logo; delete

#### Details
- 인증 proxy가 `/microsoft.svg`를 `/auth/login`으로 redirect하지 않도록 해당 경로만 공개한다.
- `/reports/export.csv`처럼 확장자가 있는 일반 app route는 계속 인증 보호 대상임을 test로 고정한다.
- 로그인 button과 NextAuth provider metadata가 동일한 SVG를 참조하게 한다.

## Acceptance Criteria
- [x] 일반 로그인 화면이 인디고 `Languages` 아이콘과 원본 영문 문구를 표시한다.
- [x] Microsoft button이 20x20 vector logo와 원본 간격·outline style을 사용한다.
- [x] 권한 부족은 현재 한국어 안내와 계정 전환 동작을 유지한다.
- [x] popup 차단 안내와 trusted message origin/source 검증을 유지한다.
- [x] callback sanitization, auth-disabled 404, session redirect 동작을 변경하지 않는다.
- [x] `nuqs`, `useQueryState`, 예전의 무검증 `postMessage`를 다시 도입하지 않는다.
- [x] 로그인 전 `/microsoft.svg` 요청이 `200 image/svg+xml`로 응답한다.
- [x] 실행 코드에 삭제된 `/M365.png` 참조가 남지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/auth/callback-url.test.ts tests/lib/auth/login-message.test.ts tests/lib/auth/access-policy.test.ts tests/lib/auth/proxy-policy.test.ts` — callback, popup message, role access, 공개 logo 정책 회귀 테스트 통과
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- components/auth/LoginComponent.tsx app/auth/login tests/lib/auth/callback-url.test.ts tests/lib/auth/login-message.test.ts tests/lib/auth/access-policy.test.ts` — error/warning 0
- `@('Languages','text-indigo-600','Sign In','Access your account using your','company Microsoft login.','Sign in with Microsoft') | ForEach-Object { if (-not (Select-String -LiteralPath 'components/auth/LoginComponent.tsx' -SimpleMatch $_)) { throw "missing original login UI marker: $_" } }` — 원본 표현 marker 모두 존재
- `rg -n "nuqs|useQueryState" components/auth/LoginComponent.tsx app/auth/login` — 결과 없음
- `rg -n "M365\.png" components app lib services` — 실행 코드 검색 결과 없음
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — 인증 credential 없이 production build 성공

## Commit Message
```text
style(auth): 기존 로그인 화면 표현 복원

Plan: 2026-09-21-login-ui-restore
Phase: P01-login-ui-restore
Task: T01-restore-login-presentation

- 인디고 로그인 레이아웃과 선명한 Microsoft 로고 복원
- 안전한 callback, popup, 계정 전환 동작 유지
- 로그인 전 로고 공개 경로를 제한적으로 허용
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
