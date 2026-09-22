# Task: T03 Route Shell Header

## Status: pending

## Goal
`daruda_app`과 같은 authenticated route/layout 경계를 적용하고 원본 Header의 56px geometry, branding, GNB, profile dropdown을 현재 auth session과 안전하게 연결해 동일하게 렌더링한다.

## Decision Summary
- Root layout은 global provider, authenticated layout은 AppHeader와 업무 frame을 소유한다.
- Header DOM/className/text/icon 배치는 source `Header.tsx`를 그대로 사용하고 router/session 연결만 adapter로 교체한다.
- 다른 GNB category는 label과 active affordance만 유지하며 content는 만들지 않는다.

## Implementation

### I01. Authenticated route group과 provider 경계

- Related Files:
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout`; new
  - `app/(authenticated)/page.tsx` :: `DashboardPage`; move from `app/page.tsx`
  - `app/(authenticated)/proposals/page.tsx` :: `ProposalPage`; move from `app/proposals/page.tsx`
  - `app/(authenticated)/admin/layout.tsx`, `page.tsx` :: existing admin guard/page; move
  - `app/layout.tsx` :: `RootLayout` — Providers/Toaster만 유지; modify
  - `components/providers.tsx` :: `Providers`, `AuthRuntimeContext`, `useAuthRuntime`; modify
  - `components/layout/AppShell.tsx` :: pathname 분기 없는 authenticated frame; modify
  - `proxy.ts`, `config/app.ts` :: URL/auth policy; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  export interface AuthRuntimeContextValue {
    authEnabled: boolean;
    session: Session | null;
  }
  export function useAuthRuntime(): AuthRuntimeContextValue;
  export default function AuthenticatedLayout(
    props: Readonly<{ children: React.ReactNode }>,
  ): React.ReactElement;
  ```
- Root에서 `AuthService.getSession()`을 한 번만 호출하고 context와 `SessionProvider`가 같은 값을 공유한다.
- route group은 URL을 바꾸지 않는다. `/auth`와 `/api`는 group 밖에 유지한다.
- `AppShell`은 56px fixed Header 아래 children을 렌더링하고 `/auth` pathname 조건을 제거한다.

### I02. Source Header 동일 이식

- Related Files:
  - `components/layout/AppHeader.tsx` :: `AppHeader`; replace markup/styles with source-equivalent Header
  - `components/common/Toast.tsx` :: `Toast`, `ToastContainer`; new
  - `config/app.ts` :: Header navigation IDs/labels/order; modify
  - `app/globals.css` :: Pretendard-compatible font stack, source scrollbar/animation classes; modify
  - External `KPC_AI/src/components/common/Header.tsx`, `Toast.tsx`, `index.css`; read-only

#### Details
- **Props Contract**:
  ```typescript
  interface AppHeaderProps {
    activeTab: "proposals";
    onUnavailableTab(tab: Exclude<GnbTab, "proposals">): void;
    onShowToast(message: string): void;
  }
  ```
- Header는 logo 32x32, `KPC AI`, `Enterprise`, subtitle, 6개 GNB 순서와 2.5px active underline을 source className 그대로 유지한다.
- `/proposals`에서 `제안서 AI`만 active다. 다른 GNB click은 같은 URL을 유지하고 “현재 범위에 포함되지 않은 화면” toast만 표시한다.
- profile dropdown의 geometry, token usage, notification/settings tabs, notification fixture를 보존한다.
- identity text/image와 logout은 session을 사용한다. auth-disabled에서는 screenshot baseline과 같은 정소담/admin fixture를 사용한다.
- 원본 role switch는 local visual state만 바꾸며 `canReview`와 server role에는 영향을 주지 않는다.
- source의 outside-click listener를 동일 cleanup과 함께 유지한다.

## Acceptance Criteria
- [ ] `/`, `/admin`, `/proposals`, `/auth/*`, `/api/*` URL과 server authorization이 유지된다.
- [ ] `/proposals` Header의 크기, 문구, nav 간격, active underline, profile dropdown이 source screenshot과 일치한다.
- [ ] 다른 GNB category component는 추가되지 않는다.
- [ ] role switch가 server authorization을 상승시키지 않는다.
- [ ] auth 화면에는 Header가 없고 업무 화면에는 한 번만 렌더링된다.
- [ ] 1280px 이상에서 source와 동일하며 원본에 없는 mobile hamburger를 추가하지 않는다.

## Validation
- `npm.cmd run test -- tests/config/app.test.ts tests/lib/auth/roles.test.ts tests/lib/auth/guards.test.ts tests/lib/auth/proxy-policy.test.ts` — auth/navigation 회귀 통과
- `npm.cmd run typecheck` — route와 context type error 0
- `npm.cmd run lint -- app components/layout components/common components/providers.tsx config/app.ts` — lint error/warning 0
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — production build 성공
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "header"` — Header screenshot parity 통과

## Commit Message
```text
refactor(layout): 원본 KPC 헤더와 인증 셸 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P01-parity-foundation
Task: T03-route-shell-header

- authenticated route group과 provider 경계 정리
- 원본 Header와 profile dropdown 시각 구조 보존
- 기존 session과 server authorization 연결 유지
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending