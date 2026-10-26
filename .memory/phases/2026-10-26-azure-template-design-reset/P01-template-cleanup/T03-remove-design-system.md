# Task: T03 디자인 시스템 제거와 인증 화면 최소화

## Status: pending

## Goal

앱 고유 CSS·UI 라이브러리·이미지와 디자인 컴포넌트를 제거하면서 홈, 관리자, 로그인·로그아웃·팝업 라우트의 기능을 기본 HTML로 유지한다.

## Decision Summary

- 최종 템플릿은 별도 디자인 시스템을 내장하지 않는다. 화면의 버튼·링크·상태 안내는 브라우저 기본 HTML 요소로 제공한다.
- Entra 로그인, 팝업 메시지 검증, 서버 역할 검사는 UI 삭제와 무관하게 보존한다. 관리자 로그인 콜백은 실제로 존재하는 `/admin`을 가리켜야 한다.

## Implementation

### I01. 남길 라우트를 시맨틱 HTML로 교체

- Related Files:
  - `app/layout.tsx` :: `metadata`, `RootLayout` — 외부 폰트·CSS·토스터 제거, 인증 provider 보존; modify
  - `app/(authenticated)/page.tsx` :: `DashboardPage` — 카드형 대시보드를 짧은 템플릿 시작 안내로 교체; modify
  - `app/(authenticated)/admin/page.tsx` :: `AdminPage` — 카드·페이지 레이아웃을 기본 HTML로 교체; modify
  - `app/(authenticated)/admin/layout.tsx` :: `AdminLayout` — 권한 검사 콜백을 `/admin`으로 바로잡음; modify
  - `app/auth/login/page.tsx` :: `LoginPage` — 기능 분기·redirect를 보존하고 스타일 클래스 제거; modify
  - `components/auth/LoginComponent.tsx` :: `LoginComponent`, `LoginComponentProps`, `startLogin` — 기본 버튼·안내 문구로 교체; modify
  - `app/auth/logout/page.tsx` :: `LogoutEffect`, `LogoutPage` — Spinner 대신 텍스트 상태를 표시; modify
  - `app/auth/login/popup/PopupLoginPage.tsx` :: `PopupLoginPage`, `PopupLoginPageProps` — Spinner 대신 텍스트 상태를 표시; modify
  - `app/auth/login/popup/page.tsx` :: `Page` — 팝업 URL 검증·전달 보존; read-only
  - `components/providers.tsx` :: `Providers`, `useAuthRuntime` — 세션 공급 보존; read-only

#### Details

- **Signatures & Types**:
  ```typescript
  function RootLayout(props: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement>;
  function DashboardPage(): React.ReactElement;
  function AdminPage(): Promise<React.ReactElement>;
  function AdminLayout(props: Readonly<{ children: React.ReactNode }>): Promise<React.ReactNode>;
  interface LoginComponentProps {
    callbackUrl: string;
    embeddedMode: boolean;
    reason?: "forbidden";
  }
  function LoginComponent(props: LoginComponentProps): React.ReactElement;
  ```
- **Data & Schema Fields**:
  - 새 데이터 모델 없음. `callbackUrl: string`, `embeddedMode: boolean`, `reason?: "forbidden"`, `session: Session | null` 계약과 `metadata.title/description = appConfig.name/description`은 유지한다.
- **Execution Flow / Logic**:
  1. `RootLayout`은 `serverEnv.authEnabled`일 때만 `AuthService.getSession()`을 호출하고 `<html lang="ko"><body><Providers authEnabled={...} session={...}>{children}</Providers></body></html>` 구조를 유지한다. Pretendard CDN `<head>`, `Toaster`, `globals.css` import, `body`의 디자인 class를 제거한다.
  2. `DashboardPage`는 `appConfig.name` 제목과 프로젝트 시작 안내 텍스트만 표시한다. Azure 연결 성공을 가정하거나 목업 통계를 보여주지 않는다.
  3. `AdminLayout`의 `requireRole(APP_ROLES.ADMIN, "/admin/general")`을 실제 경로 `"/admin"`으로 수정한다. `AdminPage` 자체의 `requireRole(APP_ROLES.ADMIN, "/admin")`도 유지하고 간단한 안내만 반환한다. 권한 없는 접근 시 기존 forbidden 로그인 흐름을 유지한다.
  4. `LoginPage`의 `!serverEnv.authEnabled -> notFound()`, 안전한 `sanitizeCallbackUrl`, 세션 존재 시 redirect, `reason=forbidden` 분기는 유지한다. `<main>`의 클래스만 제거한다.
  5. `LoginComponent`에서 `next/image`, `Languages`, shadcn `Button`, `/microsoft.svg`를 제거하고 텍스트 제목·설명·기본 `<button type="button">`·`role="alert"` 오류 문구만 남긴다. `startLogin`의 `reason === "forbidden"`일 때 `signOut({ redirect: false })`, iframe/popup 분기, popup 차단 오류, 일반 `signIn("azure-ad", ...)`, `isTrustedLoginSuccessMessage`의 origin/source 확인은 보존한다.
  6. 로그아웃은 기존 `useSearchParams`/`sanitizeCallbackUrl`/`signOut({ callbackUrl })`/`Suspense`를 유지한다. 팝업은 `window.opener.postMessage(..., window.location.origin)`와 `window.close()` 및 opener 부재 복구 문구를 유지한다. 양쪽 로딩 상태를 `<p role="status">` 텍스트로 대체한다.
  7. 모든 변경 라우트에서 Tailwind class, inline 브랜드 색상, 로고·아이콘 참조를 제거한다. 표준 HTML의 기본 시각 표현은 허용한다.

### I02. 디자인 파일·보안 예외·패키지 삭제

- Related Files:
  - `components/layout/PageContainer.tsx` :: `PageContainer`; delete
  - `components/layout/PageHeader.tsx` :: `PageHeader`; delete
  - `components/ui/avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `pagination.tsx`, `progress.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sonner.tsx`, `spinner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx` :: 각 파일의 UI primitive export; delete
  - `lib/utils.ts` :: `cn` — Tailwind 전용 class 병합; delete
  - `app/globals.css` :: Tailwind import, 토큰, KPC 색상, 제안서 print 규칙; delete
  - `app/favicon.ico`, `public/microsoft.svg` :: 현재 시각 자산; delete
  - `components.json`, `postcss.config.mjs` :: shadcn·Tailwind 빌드 설정; delete
  - `services/AuthService.ts` :: `getNextAuthEntraIdProvider`의 `style` 속성 — 삭제된 로고 참조만 제거; modify
  - `lib/auth/proxy-policy.ts` :: `PUBLIC_AUTH_ASSET_PATHS`, `isPublicAuthAssetPath`, `shouldApplyAuthentication` — 로고 공개 예외 제거; modify
  - `tests/lib/auth/proxy-policy.test.ts` :: 공개 자산 예외 테스트 — 삭제된 자산이 인증 예외가 아님을 검증; modify
  - `package.json`, `package-lock.json` :: 디자인 패키지 제거 및 잠금 파일 동기화; modify
  - `lib/pagination.ts`, `tests/lib/pagination.test.ts` :: `getPaginationItems` — 범용 계산 유틸리티 보존; read-only
  - `app/api/profile-image/route.ts` :: `GET` — 범용 Graph 예시 API 보존; read-only

#### Details

- **Signatures & Types**:
  ```typescript
  function shouldApplyAuthentication(input: {
    authEnabled: boolean;
    pathname: string;
  }): boolean;
  // isAuthPath(pathname: string): boolean 및 buildFrameAncestors(...)는 유지.
  // isPublicAuthAssetPath(pathname: string): boolean는 삭제.
  ```
- **Data & Schema Fields**:
  - `PUBLIC_AUTH_ASSET_PATHS`의 `"/microsoft.svg"` 항목과 Set 전체를 삭제한다.
  - `package.json`의 runtime dependencies에서 `@radix-ui/react-avatar`, `@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-progress`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `class-variance-authority`, `clsx`, `lucide-react`, `next-themes`, `sonner`, `tailwind-merge`를 제거한다.
  - devDependencies에서 `@tailwindcss/postcss`, `tailwindcss`, `tw-animate-css`를 제거한다. Azure·NextAuth·React·Zod·Vitest·TypeScript·ESLint 관련 의존성과 script는 유지한다.
- **Execution Flow / Logic**:
  1. I01에서 소비자를 모두 없앤 뒤 `components/ui` 19개 및 레이아웃 파일을 삭제한다. `components/providers.tsx`는 UI 패키지가 아니라 인증 provider이므로 보존한다.
  2. `AuthService`의 Azure AD provider 객체에서 `style: { logo: "/microsoft.svg", text: "#fff", bg: "#0072c6" }`만 제거한다. scope, credential, callback, 쿠키 설정은 변경하지 않는다.
  3. `shouldApplyAuthentication`을 `input.authEnabled && !isAuthPath(input.pathname)`로 축소하고 `isPublicAuthAssetPath` export를 삭제한다. 테스트는 `/auth/login` 예외와 `/microsoft.svg`, `/reports/export.csv`가 모두 일반 비인증 경로로 처리됨을 검증한다. `buildFrameAncestors`의 CSP 검증은 유지한다.
  4. `package.json`을 변경한 뒤 `npm.cmd install --package-lock-only --ignore-scripts`를 실행해 lockfile을 갱신한다. 패키지명과 인증 캐시 네임스페이스 변경은 다음 T04에서 수행한다.
  5. CSS import와 PostCSS 설정 삭제 후 `next build`가 CSS 처리기를 요구하지 않는지 확인한다. 남은 활성 JSX에서 `@/components/ui`, `className`, 로고 참조가 없어야 한다.

## Acceptance Criteria

- [ ] 남은 페이지는 기본 HTML만으로 접근 가능하며 로그인·로그아웃·팝업·Admin 검사 흐름을 유지한다.
- [ ] `components/ui`, 디자인 CSS·설정·자산, 시각 전용 직접 의존성이 없다.
- [ ] 관리자 로그인 콜백이 존재하지 않는 `/admin/general` 대신 `/admin`이다.
- [ ] 삭제된 Microsoft 로고를 공개 경로로 취급하는 인증 예외가 없다.

## Validation

- `npm.cmd run test -- tests/lib/auth/proxy-policy.test.ts tests/lib/auth/access-policy.test.ts tests/lib/auth/login-message.test.ts tests/services/AuthService.test.ts` — 로그인·보안 회귀 없음.
- `npm.cmd run lint` — UI import·미사용 심볼 없음.
- `$env:AUTH_ENABLED = 'false'; $env:EMBEDDED_MODE = 'false'; npm.cmd run build` — 스타일 빌드 설정 없이 템플릿 빌드 성공.
- `npm.cmd run typecheck` — 남은 라우트 타입 검사 통과.
- `rg -n 'components/ui|microsoft\.svg|tailwindcss|#[A-Fa-f0-9]{6}' app components lib services package.json` — 디자인 참조가 없어서 매치 없음(종료 코드 1이 기대값).

## Commit Message

```text
refactor(template): 디자인 시스템을 걷고 인증 화면 기능 유지

Plan: 2026-10-26-azure-template-design-reset
Phase: P01-template-cleanup
Task: T03-remove-design-system

- UI 컴포넌트와 스타일 자산·패키지 제거
- 기본 HTML 로그인 화면과 인증 보안 경계 보존
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
