# Task: T03 Auth Routes Proxy And Popup Security

## Status: done

## Goal
선택형 인증을 API·프록시·로그인 UI 전반에 연결하고, 권한 부족 사용자의 계정 전환 및 iframe 팝업 로그인을 무한 리다이렉트·오픈 리다이렉트·위조 `postMessage` 없이 동작하게 한다.

## Decision Summary
- auth disabled에서는 NextAuth/profile/admin 진입점을 404로 닫고 일반 대시보드는 통과시킨다.
- 일반 사용자의 `/admin` 접근은 로그인 화면에서 권한 부족을 설명하고 다른 계정 로그인을 제공한다.
- 팝업 완료 메시지는 동일 origin과 실제로 연 popup window 참조가 모두 일치할 때만 수락한다.

## Implementation

### I01. callback URL 및 팝업 메시지 순수 정책

- Related Files:
  - `lib/auth/callback-url.ts` :: `sanitizeCallbackUrl` — same-origin relative callback 검증; new
  - `lib/auth/login-message.ts` :: `LOGIN_SUCCESS_MESSAGE`, `isTrustedLoginSuccessMessage` — popup message contract; new
  - `lib/auth/proxy-policy.ts` :: public/auth path 및 CSP source helpers — 프록시에서 분리된 순수 정책; new
  - `tests/lib/auth/callback-url.test.ts` :: redirect sanitization — 단위 테스트; new
  - `tests/lib/auth/login-message.test.ts` :: origin/source/data matrix — 단위 테스트; new
  - `tests/lib/auth/proxy-policy.test.ts` :: auth/CSP path policy — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export function sanitizeCallbackUrl(value?: string | null): string;

  export const LOGIN_SUCCESS_MESSAGE = 'LOGIN_SUCCESS' as const;
  export interface LoginSuccessMessage {
    type: typeof LOGIN_SUCCESS_MESSAGE;
  }

  export function isTrustedLoginSuccessMessage(
    event: Pick<MessageEvent, 'origin' | 'source' | 'data'>,
    expected: { origin: string; source: Window | null },
  ): event is MessageEvent<LoginSuccessMessage>;

  export function isAuthPath(pathname: string): boolean;
  export function shouldApplyAuthentication(input: {
    authEnabled: boolean;
    pathname: string;
  }): boolean;
  export function buildFrameAncestors(input: {
    embeddedMode: boolean;
    additionalDomains: readonly string[];
  }): string;
  ```
- **Callback Rules**:
  - 허용: `/`, `/admin`, `/path?query=value`처럼 정확히 `/` 하나로 시작하는 내부 경로.
  - 거부 후 `/` 반환: `https://...`, `http://...`, `//host`, `javascript:...`, 역슬래시 시작, 빈/whitespace 값.
- **Message Rules**:
  - `event.origin === window.location.origin`.
  - `expected.source !== null && event.source === expected.source`.
  - `event.data`가 null 아닌 object이고 정확한 `type` 값을 가진다.
  - 세 조건 중 하나라도 틀리면 navigation/session 변경을 하지 않는다.
- **CSP Rules**:
  - 기본은 `frame-ancestors 'self'`.
  - embedded mode에서만 Microsoft 기본 source와 검증된 `IFRAME_ALLOWED_DOMAINS`를 덧붙인다.
  - 기본 Microsoft source는 scheme을 포함한 `https://login.microsoftonline.com`, `https://*.cloud.microsoft`, `https://teams.microsoft.com`, `https://*.teams.microsoft.com`, `https://*.microsoft365.com`, `https://*.office.com`, `https://outlook.office.com`, `https://outlook.office365.com`이다.
  - semicolon/공백으로 CSP directive를 삽입할 수 있는 값은 P01 환경 스키마 또는 helper에서 거부한다.

### I02. 인증·프로필 API의 feature gate

- Related Files:
  - `app/api/auth/[...nextauth]/route.ts` :: `GET`, `POST`, `nextHandler` — auth disabled 404 처리; modify
  - `app/api/profile-images/[oid]/route.ts` :: obsolete dynamic route — 실제 param을 사용하지 않으므로 제거; delete
  - `app/api/profile-image/route.ts` :: `GET` — 현재 사용자 Graph photo 전용 endpoint; new
  - `tests/app/api/profile-image.test.ts` :: disabled/anonymous/not-found/error cases — 단위 테스트; new

#### Details
- **Route Contracts**:
  ```typescript
  export async function GET(request: NextRequest): Promise<Response>;
  export async function POST(request: NextRequest): Promise<Response>;
  ```
- **Execution Flow / Logic**:
  - NextAuth API는 `serverEnv.authEnabled=false`이면 GET/POST 모두 body 없는 404를 반환하고 `AuthService.getNextAuthOptions`를 호출하지 않는다.
  - auth enabled일 때만 기존 NextAuth v4 `NextAuth(req, context, options)` handler를 실행한다.
  - profile route는 auth disabled 또는 session OID 없음이면 404, Graph photo 없음(status 404)이면 404를 반환한다.
  - Graph의 그 외 오류는 원문/토큰을 client에 보내지 않고 generic 502 response로 변환하며 server error에는 request context만 남긴다.
  - profile photo URL은 `/api/profile-image` 하나로 고정하며 임의 OID 조회를 허용하지 않는다.

### I03. 로그인·로그아웃·팝업 UX 일반화

- Related Files:
  - `components/auth/LoginComponent.tsx` :: `LoginComponent` — 일반 로그인/권한 부족/계정 전환/popup ref 관리; modify
  - `app/auth/login/page.tsx` :: `LoginPage` — reason과 session에 따른 redirect 방지; modify
  - `app/auth/login/popup/PopupLoginPage.tsx` :: `PopupLoginPage` — explicit targetOrigin과 opener null 처리; modify
  - `app/auth/login/popup/page.tsx` :: popup search params adapter — typed params 전달; modify
  - `app/auth/logout/page.tsx` :: logout callback sanitization — generic logout 화면; modify
  - `utils/popup.ts` :: `openCenteredPopup` — `Window | null` 반환을 호출자가 보존; modify
  - `utils/frameCheck.ts` :: `isPopupOrIframe` — 현재 순수 frame detection 유지; modify only if lint/format requires

#### Details
- **Signatures & Types**:
  ```typescript
  export interface LoginComponentProps {
    callbackUrl: string;
    embeddedMode: boolean;
    reason?: 'forbidden';
  }

  export default function LoginComponent(
    props: LoginComponentProps,
  ): React.ReactElement;

  export function openCenteredPopup(
    url: string,
    target: string,
    width: number,
    height: number,
  ): Window | null;
  ```
- **Login Page Flow**:
  1. auth disabled이면 `notFound()`.
  2. search param callback은 `sanitizeCallbackUrl`을 거친다.
  3. session이 있고 reason이 없으면 callback으로 redirect한다.
  4. session이 있어도 `reason=forbidden`이면 redirect하지 않고 “관리자 권한이 없습니다” 및 “다른 계정으로 로그인” 버튼을 보여준다.
  5. 계정 전환 버튼은 `signOut({ redirect: false })` 성공 후 새 로그인을 시작하며 authorization param `prompt=select_account`를 전달한다.
- **Popup Flow**:
  1. embedded mode이거나 실제 iframe/popup이면 `openCenteredPopup`으로 `/auth/login/popup`을 열고 반환된 window를 ref에 저장한다.
  2. popup 차단으로 `null`이면 사용자에게 브라우저 팝업 허용 안내를 표시하고 listener가 임의 메시지를 받지 않게 한다.
  3. opener는 `message` event에서 `isTrustedLoginSuccessMessage(event, { origin: window.location.origin, source: popupRef.current })`가 true일 때만 callback으로 이동한다.
  4. popup 성공 page는 `window.opener`가 존재할 때 `window.opener.postMessage({ type: 'LOGIN_SUCCESS' }, window.location.origin)`을 호출한 후 닫는다.
  5. opener가 없으면 성공으로 가장하지 않고 복구 안내를 렌더링한다.
- **UI Constraints**:
  - Daruda/번역 아이콘과 문구는 사용하지 않는다.
  - Microsoft `M365.png` 자산과 “Microsoft 계정으로 로그인” 동작은 유지한다.
  - forbidden message는 원인을 설명하되 role 목록·token 세부정보를 노출하지 않는다.

### I04. 선택형 proxy와 세션 무효화

- Related Files:
  - `proxy.ts` :: default proxy, `authMiddleware` — feature gate, session version/error, CSP 적용; modify
  - `tests/proxy-policy.test.ts` :: policy helpers — I01 테스트에 포함하거나 별도 경로로 작성; new

#### Details
- **Execution Flow / Logic**:
  1. 모든 matched request에 CSP header를 추가하되 embedded mode가 아니면 외부 frame ancestor를 허용하지 않는다.
  2. auth disabled이면 `withAuth`를 호출하지 않고 `NextResponse.next()`를 반환한다.
  3. `/auth/*`는 인증 middleware를 통과시키고, 나머지 page request는 auth enabled일 때 보호한다.
  4. token version 불일치 또는 `RefreshAccessTokenError`는 `/auth/logout`으로 보낸다.
  5. 기존 `/` → `/document-translation` redirect를 삭제하고 `/` dashboard를 그대로 제공한다.
  6. 기존 non-GET 무조건 우회와 모든 요청의 console logging을 제거한다. API는 matcher에서 제외하고 각 route가 자체 인증한다.
  7. matcher는 `_next/static`, `_next/image`, favicon과 API를 제외하는 일반 규칙으로 단순화하고 삭제 예정 Daruda asset 이름을 열거하지 않는다.
- **Error & Exception Handling**:
  - CSP는 기존 header가 있으면 덮어쓰지 않고 template 정책과 충돌 여부를 명확히 처리한다. 중복 directive를 append하지 않는다.
  - callback 및 CSP source에 사용자 입력을 그대로 문자열 보간하지 않는다.

## Acceptance Criteria
- [x] auth disabled 상태에서 일반 `/`은 허용되고 NextAuth/profile endpoint는 404다.
- [x] anonymous 관리자는 login, 일반 사용자는 forbidden login, Admin은 page 접근으로 분기된다.
- [x] forbidden session은 로그인↔관리자 무한 redirect를 만들지 않는다.
- [x] popup success는 동일 origin과 저장된 popup source가 모두 맞아야 수락된다.
- [x] 외부/프로토콜 상대 callback URL은 `/`로 정규화된다.
- [x] proxy에 Daruda route/asset 이름과 무조건 non-GET 우회가 남지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/auth/callback-url.test.ts tests/lib/auth/login-message.test.ts tests/lib/auth/proxy-policy.test.ts tests/app/api/profile-image.test.ts` — 보안 정책 테스트 통과
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- app/api app/auth components/auth lib/auth utils/popup.ts utils/frameCheck.ts proxy.ts tests` — 수정 범위 error/warning 0
- `rg -n "document-translation|raccoon\.png|DARUDA_ENABLE_CROSS_SITE_COOKIE" proxy.ts app/auth components/auth` — 결과 없음

## Commit Message
```text
feat(auth): secure optional popup login flow

Plan: 2026-09-21-generic-azure-app-template
Phase: P02-identity-and-cloud-services
Task: T03-auth-routes-proxy-and-popup-security

- gate auth routes and middleware behind AUTH_ENABLED
- prevent forbidden redirect loops and unsafe callback URLs
- validate popup message origin and source before navigation
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: bb9da5f
