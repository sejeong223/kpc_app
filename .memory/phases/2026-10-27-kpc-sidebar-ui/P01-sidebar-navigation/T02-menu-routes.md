# Task: T02 최종 메뉴 카탈로그·안내 라우트·서버 인가

## Status: done

## Goal

목업 최종 메뉴 15개를 한 카탈로그로 정의하고 각기 다른 URL에서 `<메뉴명> 화면입니다.`를 표시한다. 인증 비활성 미리보기는 모두 허용하고 인증 활성 환경의 관리자 화면은 서버에서 보호한다.

## Decision Summary

- 선행 T01은 `components/providers/FluentUiProvider.tsx`와 `(authenticated)` 레이아웃 공급자를 추가했다. 이 Task는 아직 기존 사이드바 표현을 교체하지 않고 새 메뉴 데이터·라우트를 완결한다.
- 사용자가 관리자 8개까지 개발 미리보기하는 방식을 선택했다. 이 예외는 신규 정적 안내 화면에만 적용하며 기존 `/admin`과 `requireRole`은 수정하지 않는다.

## Implementation

### I01. 순수 TypeScript 메뉴 카탈로그

- Related Files:
  - `config/sidebar.ts` :: 메뉴 타입·`sidebarGroups`·조회 및 노출 helper — 모든 신규 메뉴의 단일 원본; new
  - `lib/auth/roles.ts` :: `APP_ROLES`, `hasRole`, `AppRole` — 역할 판정 재사용; read-only
  - `config/app.ts` :: 기존 템플릿 메뉴 설정 — T03 전까지 기존 UI 호환 유지; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export type SidebarScreen =
    | "register" | "pipeline" | "analysis" | "files" | "toc"
    | "setup" | "write" | "prompt-sets" | "skills" | "templates"
    | "policy" | "tokens" | "users" | "dashboard" | "audit";

  export type SidebarIcon =
    | "document-add" | "clipboard" | "analysis" | "upload" | "list"
    | "settings" | "edit" | "prompts" | "skills" | "template"
    | "policy" | "tokens" | "users" | "dashboard" | "history";

  export interface SidebarNavigationItem {
    id: SidebarScreen;
    label: string;
    href: `/workspace/${SidebarScreen}`;
    icon: SidebarIcon;
    requiredRole?: AppRole;
  }

  export interface SidebarNavigationGroup {
    id: "proposal" | "project" | "admin";
    items: readonly SidebarNavigationItem[];
  }

  export interface SidebarNavigationContext {
    authEnabled: boolean;
    authenticated: boolean;
    roles?: readonly string[];
  }

  export const sidebarGroups: readonly SidebarNavigationGroup[];

  export function getVisibleSidebarGroups(
    context: SidebarNavigationContext,
  ): SidebarNavigationGroup[];

  export function getSidebarItemByScreen(
    screen: string,
  ): SidebarNavigationItem | undefined;

  export function getSidebarItemByPathname(
    pathname: string,
  ): SidebarNavigationItem | undefined;
  ```

- **Data & Schema Fields**:

  | group | id | label | href | icon | requiredRole |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | proposal | register | RFP 등록 | `/workspace/register` | document-add | 없음 |
  | proposal | pipeline | 검토 목록 | `/workspace/pipeline` | clipboard | 없음 |
  | project | analysis | AI 분석 | `/workspace/analysis` | analysis | 없음 |
  | project | files | 파일 업로드 | `/workspace/files` | upload | 없음 |
  | project | toc | 목차 | `/workspace/toc` | list | 없음 |
  | project | setup | 제작 설정 | `/workspace/setup` | settings | 없음 |
  | project | write | 제작 | `/workspace/write` | edit | 없음 |
  | admin | prompt-sets | 프롬프트 세트 | `/workspace/prompt-sets` | prompts | Admin |
  | admin | skills | Skill | `/workspace/skills` | skills | Admin |
  | admin | templates | Template | `/workspace/templates` | template | Admin |
  | admin | policy | 운영 정책 | `/workspace/policy` | policy | Admin |
  | admin | tokens | 토큰·비용 관리 | `/workspace/tokens` | tokens | Admin |
  | admin | users | 사용자 설정 | `/workspace/users` | users | Admin |
  | admin | dashboard | 대시보드 | `/workspace/dashboard` | dashboard | Admin |
  | admin | audit | 활동 로그 | `/workspace/audit` | history | Admin |

  `requiredRole`은 일반 항목에서는 생략하고 관리자 항목에 `APP_ROLES.ADMIN`을 사용한다. group 순서는 proposal → project → admin, 각 item 순서는 표와 같다. 필드에 null·DB ID·프로젝트 ID·상태·미확인 건수·함수·JSX를 넣지 않는다. 아이콘은 문자열 키이고 실제 Fluent 컴포넌트는 T03에서 매핑한다.

- **Execution Flow / Logic**:
  1. `sidebarGroups`를 모듈 범위의 readonly 데이터로 정의한다. `server-only`, 서버 환경변수, React, Graph 클라이언트 import가 없어야 클라이언트·서버에서 같이 사용할 수 있다.
  2. `getVisibleSidebarGroups`: `authEnabled=false`면 전체 3개 그룹·15개 항목을 반환한다. 이는 정적 UI 미리보기 결정이며 실제 사용자 역할을 변경하지 않는다.
  3. `authEnabled=true && authenticated=false`면 빈 배열을 반환한다. 앱 진입의 역할 검사 자체는 서버 레이아웃이 책임진다.
  4. 활성·인증됨이면 일반 항목을 유지하고 `requiredRole` 항목을 `hasRole(context.roles, requiredRole)`로 거른다. User는 7개, Admin은 15개이며 빈 그룹은 제거한다.
  5. `getSidebarItemByScreen`은 정확한 `id` 일치만 찾는다. `getSidebarItemByPathname`은 정확한 `href` 일치만 찾는다. 알 수 없는 값·다른 대소문자·비슷한 접두 경로는 undefined다. query를 임의로 파싱하거나 접두사 일치로 다른 화면을 활성화하지 않는다.
  6. 노출 helper는 원본 배열을 변경하지 않는다. 이 결과를 서버 인가로 사용하지 않는다.

### I02. 허용된 메뉴의 서버 안내 페이지

- Related Files:
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: `WorkspaceScreenPage` — 15개 URL의 안내 화면·관리자 검사; new
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` — 기존 `requireAppAccess`와 Fluent 공급자; read-only
  - `lib/auth/guards.ts` :: `requireRole` — 기존 서버 관리자 검사; read-only
  - `config/env.ts` :: `serverEnv.authEnabled` — 서버 설정 판단; read-only
  - `app/(authenticated)/admin/layout.tsx`, `app/(authenticated)/admin/page.tsx` :: 기존 관리자 예시; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface WorkspaceScreenPageProps {
    params: Promise<{ screen: string }>;
  }

  export default async function WorkspaceScreenPage(
    props: WorkspaceScreenPageProps,
  ): Promise<React.ReactElement>;
  ```

  Next.js 16의 비동기 params를 `await`해서 사용한다. 이 파일에는 `"use client"`를 붙이지 않는다.

- **Data & Schema Fields**:
  - 입력: `{ screen: string }`, 신뢰하지 않는 URL 값.
  - 허용값: I01의 15개 id만 허용한다.
  - 출력: 카탈로그의 `label`을 h1과 본문 `<label> 화면입니다.`에 사용한다. 실제 데이터 모델·API 응답·DB 스키마 추가 없음.

- **Execution Flow / Logic**:
  1. `await params` 후 `getSidebarItemByScreen(screen)`을 조회한다.
  2. 항목이 없으면 `next/navigation`의 `notFound()`를 호출한다. 임의 screen을 그대로 제목에 출력하거나 동적 import 경로로 사용하지 않는다.
  3. 항목에 `requiredRole`이 있고 `serverEnv.authEnabled=true`면 `await requireRole(item.requiredRole, item.href)`를 실행한다. 해당 검사는 UI를 반환하기 전에 완료한다.
  4. 인증 비활성이면 이 신규 페이지에서만 역할 검사를 생략한다. 기존 `requireRole`의 동작·관리자 API·기존 `/admin`은 바꾸지 않는다.
  5. 가드 예외·redirect/notFound를 catch하여 성공 화면으로 바꾸지 않는다.
  6. `<section aria-labelledby="workspace-screen-title"><h1 id="workspace-screen-title">메뉴명</h1><p>메뉴명 화면입니다.</p></section>` 구조의 간단한 안내를 반환한다. 스타일 훅이 필요 없는 서버 페이지로 유지한다.
  7. 메뉴 이동은 T03에서 Next.js Link로 연결한다. 상태값만 바꿔서 같은 URL에 다른 텍스트를 출력하는 구조를 만들지 않는다.

### I03. 카탈로그·권한·페이지 회귀 테스트

- Related Files:
  - `tests/config/sidebar.test.ts` :: 카탈로그·노출·경로 조회 검증; new
  - `tests/app/workspace/screen.test.ts` :: 서버 안내 페이지 검증; new
  - `tests/lib/auth/guards.test.ts` :: 기존 실제 가드 분기; read-only
  - `vitest.config.ts` :: node 환경·`tests/**/*.test.ts` 패턴; read-only

#### Details

- 테스트는 현재 Vitest node 환경의 `.test.ts` 파일로 작성한다. UI 이벤트 검사만을 위해 jsdom·Testing Library·Playwright를 설치하지 않는다.
- 카탈로그 테스트:
  - 최종 순서·라벨·15개 고유 id/href, 7개 일반/8개 관리자 계약 검증.
  - 인증 비활성 null session 상황에 상응하는 context → 전체 15개.
  - 인증 활성 anonymous → 0개, User → 일반 7개, Admin → 15개, 정상화되지 않은 역할 문자열이 Admin 권한을 만들지 않음.
  - 필터 후 원본 카탈로그 불변, 비어 있는 admin 그룹 제거.
  - 정확한 screen/path 조회 및 `missing`, `/workspace/register-extra`, `/workspace/analysis/nested` 거부.
- 서버 페이지 테스트는 `@/config/env`의 `serverEnv`와 `@/lib/auth/guards`의 `requireRole`을 `vi.hoisted` 기반 mock으로 제어한다. `notFound`는 예외를 던지도록 mock하여 실행 중단을 검증한다.
  - 인증 비활성 모든 15개 screen에서 맞는 h1/안내 문구가 나오고 역할 가드는 호출되지 않음.
  - 활성 일반 screen에서는 관리자 가드 호출 없음.
  - 활성 관리자 screen 8개 각각에서 `requireRole("Admin", item.href)` 호출 및 완료 후 렌더.
  - 관리자 가드가 login/forbidden 예외를 던지면 그대로 전파되고 성공 안내를 반환하지 않음.
  - 미등록 screen은 인증 설정과 관계없이 notFound.
- 페이지는 async 함수를 직접 호출한 후 반환된 React element를 `react-dom/server`의 `renderToStaticMarkup`으로 확인할 수 있다. 기존 실제 `requireRole` 테스트를 함께 실행하여 mock이 실제 정책을 대체했다는 착각을 막는다.

## Acceptance Criteria

- [x] 최종 15개 메뉴·URL·순서가 단일 카탈로그에 있고 원본에서 제거된 메뉴를 추가하지 않는다.
- [x] 각 URL의 본문이 해당 메뉴명과 일치하며 알 수 없는 URL은 404다.
- [x] 인증 비활성에서 관리자 안내 화면까지 자격 증명 없이 확인할 수 있다.
- [x] 인증 활성 관리자 화면은 서버 가드 완료 전 본문을 반환하지 않는다.
- [x] 기존 홈·관리자 예시·로그인·Azure 서비스의 구현은 그대로다.
- [x] 메뉴·권한·서버 라우트 테스트가 통과하고 패키지 추가가 없다.

## Validation

- `npm.cmd run test -- tests/config/sidebar.test.ts tests/app/workspace/screen.test.ts tests/lib/auth/guards.test.ts` — 카탈로그·신규 가드와 기존 가드 정책 통과.
- `npm.cmd run typecheck` — 비동기 params·readonly 배열·역할 타입 검증 통과.
- `npm.cmd run lint` — 오류 없음.
- 인증 비활성 개발 서버에서 `/workspace/register`, `/workspace/audit` 직접 접속 시 각각 안내 화면, `/workspace/missing`은 404 확인.
- 이 Task는 기존 NavSidebar를 교체하기 전이므로 화면에 아직 15개 메뉴가 보이지 않는 것이 정상이다. 새 URL의 직접 접근과 단위 검증을 완료한 후 T03으로 전진한다.

## Commit Message

```text
feat(navigation): 사이드바 메뉴별 안내 화면과 권한 검사 추가

Plan: 2026-10-27-kpc-sidebar-ui
Phase: P01-sidebar-navigation
Task: T02-menu-routes

- 최종 15개 메뉴와 URL을 단일 카탈로그로 정의
- 개발 미리보기와 인증 활성 관리자 서버 가드 검증
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `a45d839` — `feat(navigation): 사이드바 메뉴별 안내 화면과 권한 검사 추가`

## Execution Result

- 2026-10-27: 최종 15개 메뉴 카탈로그와 공유 서버 안내 페이지 구현.
- 신규 메뉴·페이지와 기존 가드 검증 53개, TypeScript, ESLint, 프로덕션 빌드 통과.
- 분리된 프로덕션 서버 HTTP: `/workspace/register` 200, `/workspace/audit` 200, 미등록 `/workspace/missing` 404.
- 관리자 가드 완료 대기 및 거부 전파를 테스트하고 기존 `requireRole`/`/admin` 구현 보존.
- 요청 밖 추가 수정 사항: 특이사항 없음.
