# Task: T01 Fluent UI 의존성·테마·SSR 설정

## Status: done

## Goal

현재 Next.js 16 App Router의 인증된 작업 영역에서 Fluent UI v9 컴포넌트와 객체형 스타일을 안전하게 사용할 수 있게 한다. 사이드바를 만들기 전에 최초 서버 응답의 스타일 누락과 클라이언트 이동 후 스타일 충돌을 방지한다.

## Decision Summary

- 사용자는 Fluent UI 사용을 명시했으며 구현은 후속 실행 단계에서 한다. 현재 React `19.2.1`, Next.js `16.0.10`은 유지한다.
- 새 공급자는 `(authenticated)` 작업 영역에만 적용한다. 로그인 화면 및 인증 가드는 유지한다. 스타일용 CSS module은 만들지 않는다.

## Implementation

### I01. 의존성 고정 추가

- Related Files:
  - `package.json` :: `dependencies` — Fluent 컴포넌트·아이콘·SSR renderer 추가; modify
  - `package-lock.json` :: npm dependency graph — 동일 설치 결과 고정; modify

#### Details

- **Signatures & Types**: 공개 함수 변경 없음. npm 런타임 의존성만 추가한다.
- **Data & Schema Fields**:
  - `@fluentui/react-components`: `9.74.11`
  - `@fluentui/react-icons`: `2.0.344`
  - `@griffel/react`: `1.7.8`
  - 모두 `dependencies`의 정확한 버전 문자열로 저장한다. `devDependencies`나 `^` 범위로 넣지 않는다.
- **Execution Flow / Logic**:
  1. 시작 시 `git status --short`로 사용자 변경을 확인한다. 기존 변경을 되돌리지 않는다.
  2. `npm.cmd install --save-exact @fluentui/react-components@9.74.11 @fluentui/react-icons@2.0.344 @griffel/react@1.7.8`을 실행한다.
  3. Next.js·React·인증·Azure 패키지의 직접 버전은 변경하지 않는다. `npm audit fix`, `--force`, 패키지 전체 업그레이드는 실행하지 않는다.
  4. 잠금 파일에서 호환 Griffel 중복 설치를 확인한다. 충돌 시 직접/전이 버전 원인을 해결하며 강제 peer 우회를 하지 않는다.

### I02. 요청별 renderer와 작업 영역 테마

- Related Files:
  - `components/providers/FluentUiProvider.tsx` :: `FluentUiProvider`, `workspaceTheme` — Fluent 테마와 SSR 공급자; new
  - `components/providers.tsx` :: `Providers`, `useAuthRuntime` — 기존 세션·실행 컨텍스트; read-only
  - `app/globals.css` :: 전역 초기화 — 기존 글꼴·focus·reduced-motion 유지; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface FluentUiProviderProps {
    children: React.ReactNode;
  }

  const workspaceTheme: Theme;

  export default function FluentUiProvider(
    props: FluentUiProviderProps,
  ): React.ReactElement;
  ```

  `Theme`, `FluentProvider`, `webLightTheme`은 `@fluentui/react-components`, `createDOMRenderer`, `RendererProvider`, `renderToStyleElements`는 `@griffel/react`, `useServerInsertedHTML`은 `next/navigation`에서 가져온다. 파일 첫 줄은 `"use client"`다.

- **Data & Schema Fields**:
  - `workspaceTheme: Theme`: `webLightTheme`을 기반으로 다음 값을 override한다.

    | token | 값 |
    | :--- | :--- |
    | colorBrandBackground | `#d7192f` |
    | colorBrandBackgroundHover | `#c31429` |
    | colorBrandBackgroundPressed | `#b01225` |
    | colorBrandForeground1 | `#cc1930` |
    | colorBrandForeground2 | `#c91c2b` |
    | colorBrandBackground2 | `#fff0f2` |
    | colorBrandBackground2Hover | `#ffe5e9` |
    | colorBrandStroke1 | `#d7192f` |
    | colorNeutralBackground2 | `#fafafa` |
    | colorNeutralStroke2 | `#e6e7eb` |

  - `renderer`: `createDOMRenderer`의 반환 타입. `useState`의 lazy initializer로 생성해 같은 마운트에서 유지한다. 모듈 전역 singleton은 금지한다.
  - `didFlush: MutableRefObject<boolean>` 상당의 `useRef(false)`: 동일 SSR 요청의 스타일 중복 출력을 막는다.
  - DB 모델·환경변수·세션 필드 추가 없음.

- **Execution Flow / Logic**:
  1. 공급자 렌더링 시 요청별 renderer를 생성한다. React 재렌더 때 새 renderer를 만들지 않는다.
  2. `useServerInsertedHTML` callback은 첫 호출에서 `renderToStyleElements(renderer)`를 반환하고 flush 여부를 기록한다. 이후 호출은 아무 스타일도 반환하지 않는다. App Router 스트리밍마다 전체 CSS를 반복 출력하지 않는다.
  3. 트리는 `RendererProvider → FluentProvider(theme=workspaceTheme) → children` 순서다. Fluent 컴포넌트가 동일 renderer를 소비하도록 한다.
  4. FluentProvider의 루트에 필요한 단순 배치 값은 같은 TSX의 `style` 속성으로 `minHeight: "100svh"`, `backgroundColor: "transparent"`, `fontFamily: "inherit"`, `fontSize: "inherit"`, `lineHeight: "inherit"`, `color: "inherit"`를 지정한다. 공급자 자체를 꾸미려고 renderer 바깥에서 `useStyles()`를 호출하지 않는다.
  5. 새 UI 컴포넌트는 이후 Task에서 `makeStyles`를 모듈 범위에 정의하고 `useStyles`를 공급자 자손에서 호출한다. 동적 스타일은 정적 variant 및 `mergeClasses`로 조합한다.
  6. 인증을 비활성화한 미리보기에서도 Fluent 공급자는 사용하지만 `AuthService`·Graph·Azure 클라이언트를 새로 호출하지 않는다.

참고: [Griffel App Router SSR 공식 지침](https://griffel.js.org/react/guides/ssr-usage/). 최초 스타일 출력 및 중복 방지에 필요한 부분만 적용하고 Pages Router `_document`는 추가하지 않는다.

### I03. 인증된 레이아웃에 공급자 연결

- Related Files:
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` — 가드 이후 공급자 삽입; modify
  - `app/layout.tsx` :: `RootLayout` — 기존 최상위 세션 공급자; read-only
  - `lib/auth/guards.ts` :: `requireAppAccess`, `requireRole` — 기존 접근 정책; read-only
  - `app/auth/login/page.tsx` :: `LoginPage` — 로그인 UI 보존; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export const dynamic = "force-dynamic";

  export default async function AuthenticatedLayout(
    props: Readonly<{ children: React.ReactNode }>,
  ): Promise<React.ReactElement>;
  ```

- **Data & Schema Fields**: props·세션·역할 스키마 변경 없음.
- **Execution Flow / Logic**:
  1. 기존 `await requireAppAccess()`와 `dynamic = "force-dynamic"`를 유지한다.
  2. 가드 통과 후 `FluentUiProvider`로 `AppShell`을 감싼다. `AppShell`과 공급자는 각각 한 번만 렌더링한다.
  3. `RootLayout`의 기존 `Providers`와 NextAuth `SessionProvider`를 대체하거나 중복 생성하지 않는다.
  4. 인증 실패 redirect/notFound는 기존 함수가 처리한다. 이를 잡아서 셸을 반환하지 않는다.

## Acceptance Criteria

- [x] 정확한 버전의 Fluent/Griffel 3개 의존성이 추가되고 기존 직접 의존성 버전이 유지된다.
- [x] 작업 영역에서 FluentProvider와 요청별 renderer가 적용되고 SSR 스타일이 최초 HTML에 포함된다.
- [x] 서버 스타일이 스트리밍 flush마다 중복 삽입되지 않는다.
- [x] 로그인 UI·세션 공급자·앱 진입 가드와 기존 `/admin` 정책이 유지된다.
- [x] 새 CSS module·Pages Router 파일·Fluent 빌드 변환 플러그인이 없다.

## Validation

- `npm.cmd ls @fluentui/react-components @fluentui/react-icons @griffel/react` — 설치 버전 및 peer 오류 없음.
- `npm.cmd run test -- tests/lib/auth/guards.test.ts tests/app/auth/login.test.ts` — 기존 진입·관리자·로그인 회귀 없음.
- `npm.cmd run typecheck` — 타입 오류 없음.
- `npm.cmd run lint` — 오류 없음.
- PowerShell: `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; npm.cmd run build` — 자격 증명 없이 빌드 성공.
- 별도 프로세스에서 같은 환경으로 `npm.cmd run start -- --port 3100` 실행 후 `/` 응답 200 확인. HTML의 `data-make-styles-rehydration` 표식이 `<head>`에 존재하고 `<body>`에는 중복되지 않는지 확인한다. `/auth/login`은 기존 로그인 UI를 유지한다. 검증 서버는 종료한다.
- 이 Task는 공급자 도입이므로 의미 없는 공급자 구조 스냅샷 테스트를 추가하지 않는다. 화면 이동 이후 스타일 검증은 UI가 연결되는 T03에서 수행한다.

## Commit Message

```text
feat(ui): Fluent UI 테마와 서버 렌더링 기반 추가

Plan: 2026-10-27-kpc-sidebar-ui
Phase: P01-sidebar-navigation
Task: T01-fluent-foundation

- 작업 영역에 Fluent UI와 요청별 Griffel 공급자 연결
- 로그인과 서버 인증 가드를 유지하며 빨간 강조 테마 준비
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 본 Task 완료 커밋에 포함 (`feat(ui): Fluent UI 테마와 서버 렌더링 기반 추가`)

## Execution Result

- 2026-10-27: 지정한 3개 패키지 설치, 기존 잠금 버전 변경 0개. Griffel renderer 중복 없이 dedupe 확인.
- 인증 회귀 15개, TypeScript, ESLint, 인증 비활성 프로덕션 빌드 통과.
- 프로덕션 HTTP: `/` 200, SSR Griffel 스타일 head 1개/body 0개. `/auth/login` 200 및 기존 Sign In/Microsoft UI 유지.
- 요청 밖 추가 수정 사항: 특이사항 없음.
