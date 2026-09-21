# Task: T01 Configurable Neutral Dashboard Shell

## Status: done

## Goal
Daruda 이름·번역 메뉴·하늘색 스타일 대신 중앙 설정에서 이름과 메뉴를 읽는 중립적 대시보드 셸을 제공하고, 인증 상태와 `Admin` 역할에 맞춰 사용자 프로필 및 관리자 예시 메뉴를 노출한다.

## Decision Summary
- 앱 기본 이름은 `KPC App`이며 공개 환경변수로 이름·설명만 재정의한다.
- dashboard는 `/`, 관리자 예시는 `/admin`; 관리자 route는 server guard를 반드시 호출한다.
- 범용 shadcn/ui 컴포넌트는 유지하며 직접 `sky-*` 색상 대신 semantic CSS token을 사용한다.

## Implementation

### I01. 중앙 앱 설정과 navigation filtering

- Related Files:
  - `config/app.ts` :: `appConfig`, `AppConfig`, `NavigationItem`, `getVisibleNavigation` — public branding/navigation source; new
  - `tests/config/app.test.ts` :: branding defaults and role-aware menu filtering — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  import type { AppRole } from '@/lib/auth/roles';

  export type NavigationIcon = 'dashboard' | 'admin';

  export interface NavigationItem {
    id: string;
    label: string;
    href: `/${string}` | '/';
    icon: NavigationIcon;
    requiresAuth?: boolean;
    requiredRole?: AppRole;
  }

  export interface AppConfig {
    name: string;
    description: string;
    navigation: readonly NavigationItem[];
  }

  export const appConfig: AppConfig;

  export function getVisibleNavigation(
    items: readonly NavigationItem[],
    context: {
      authEnabled: boolean;
      authenticated: boolean;
      roles?: readonly string[];
    },
  ): NavigationItem[];
  ```
- **Default Data**:
  - `name`: `process.env.NEXT_PUBLIC_APP_NAME ?? 'KPC App'`.
  - `description`: `process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? '사내 업무 애플리케이션'`.
  - navigation item 1: `{ id:'dashboard', label:'대시보드', href:'/', icon:'dashboard' }`.
  - navigation item 2: `{ id:'admin', label:'관리자', href:'/admin', icon:'admin', requiresAuth:true, requiredRole:'Admin' }`.
- **Execution Flow / Logic**:
  - `NEXT_PUBLIC_*`는 Next client bundling이 정적으로 인식할 수 있도록 computed property가 아닌 직접 property access로 읽는다.
  - auth disabled이면 `requiresAuth` 또는 `requiredRole`이 있는 item을 숨긴다.
  - auth enabled이지만 session이 없으면 auth-required item을 숨긴다.
  - role item은 `hasRole`이 true일 때만 반환한다.
  - filtering은 UX일 뿐이며 server authorization을 대체하지 않는다는 주석과 테스트를 둔다.

### I02. 서버 root layout과 provider/app shell 분리

- Related Files:
  - `app/layout.tsx` :: `metadata`, `RootLayout` — 선택적 session 조회 및 generic metadata; modify
  - `components/providers.tsx` :: `Providers` — auth disabled에서 `SessionProvider` 미생성; modify
  - `components/layout/AppShell.tsx` :: `AppShell` — auth route와 app route layout 분리; new
  - `components/layout/AppSidebar.tsx` :: `AppSidebar` — config-driven neutral sidebar; modify

#### Details
- **Signatures & Types**:
  ```typescript
  interface ProvidersProps {
    children: React.ReactNode;
    authEnabled: boolean;
    session: import('next-auth').Session | null;
  }

  interface AppShellProps extends ProvidersProps {}

  interface AppSidebarProps {
    authEnabled: boolean;
    session: import('next-auth').Session | null;
  }
  ```
- **Root Layout Flow**:
  1. `serverEnv.authEnabled`을 읽는다.
  2. enabled일 때만 `new AuthService().getSession()`, disabled이면 session은 `null`로 둔다.
  3. metadata title/description은 `appConfig`에서 가져오고 `<html lang="ko">`를 사용한다.
  4. `Providers`와 `AppShell`에 boolean/session을 명시적으로 전달한다.
- **Provider Flow**:
  - auth enabled: 기존 15분 refetch와 focus refetch를 가진 `SessionProvider`로 감싼다.
  - auth disabled: children만 반환해 `/api/auth/session` fetch를 발생시키지 않는다.
  - `NuqsAdapter`는 로그인 refactor 후 사용처가 없으므로 제거한다.
- **App Shell Flow**:
  - `usePathname()`이 `/auth`로 시작하면 sidebar 없이 full-page children만 렌더링한다.
  - 그 외에는 collapsible sidebar와 scrollable main 영역을 렌더링한다.
- **Sidebar Flow**:
  - `useSession`을 호출하지 않고 전달받은 session을 사용한다.
  - `getVisibleNavigation` 결과를 렌더링하고 icon key를 `LayoutDashboard`, `ShieldCheck`에 명시적으로 mapping한다.
  - active rule: `/`는 pathname 정확 일치, 그 외 route는 exact 또는 `href/` prefix 일치.
  - brand text는 `appConfig.name`, brand icon은 domain-neutral `PanelsTopLeft`.
  - auth enabled + session일 때만 avatar/name/upn/logout을 표시한다. photo URL은 `/api/profile-image`.
  - auth disabled에서는 빈 사용자 placeholder나 logout button을 렌더링하지 않는다.
- **Accessibility**:
  - sidebar collapse/logout icon button에 `aria-label`을 제공한다.
  - tooltip은 collapsed 상태에서만 보조 label로 사용하고 keyboard focus가 유지된다.

### I03. 대시보드와 보호된 관리자 예시

- Related Files:
  - `app/page.tsx` :: `DashboardPage` — redirect 없는 generic 시작 화면; modify
  - `app/admin/page.tsx` :: `AdminPage` — `requireRole(Admin, '/admin')`을 호출하는 예시; new
  - `components/layout/PageHeader.tsx` :: `PageHeader` — semantic foreground/muted colors; modify
  - `components/layout/PageContainer.tsx` :: `PageContainer` — neutral background and typed max width; modify

#### Details
- **Page Contracts**:
  ```typescript
  export default function DashboardPage(): React.ReactElement;
  export default async function AdminPage(): Promise<React.ReactElement>;
  ```
- **Dashboard Content**:
  - `PageHeader`에 app name과 “새 기능을 추가할 수 있는 기본 대시보드입니다” 설명.
  - mock 통계/차트/번역 데이터 없이 `Card` 하나에 중앙 설정·공통 UI·선택형 Azure integration의 시작 지점을 간단히 안내한다.
  - 인증 off에서도 동일 화면이 렌더링된다.
- **Admin Content**:
  - 첫 문장에서 `await requireRole(APP_ROLES.ADMIN, '/admin')` 실행.
  - 허용된 경우에만 `PageHeader`와 “보호된 관리자 예시” Card를 렌더링한다.
  - auth disabled 404, anonymous login, non-admin forbidden login 동작은 P02 policy를 그대로 사용한다.

### I04. 중립 디자인 토큰과 범용 Pagination 완성

- Related Files:
  - `app/globals.css` :: theme variables and base layer — Daruda animation 제거·neutral semantic token 정리; modify
  - `components/ui/pagination.tsx` :: `Pagination` — 고정 1/2/3 mock을 실제 계산으로 교체; modify
  - `lib/pagination.ts` :: `getPaginationItems` — 테스트 가능한 page range helper; new
  - `tests/lib/pagination.test.ts` :: small/large/boundary ranges — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

  export function getPaginationItems(input: {
    totalPages: number;
    currentPage: number;
    siblingCount?: number;
  }): PaginationItem[];

  interface PaginationProps {
    totalItems: number;
    currentPage?: number;
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
    className?: string;
  }
  ```
- **Pagination Logic**:
  - `totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))`.
  - `itemsPerPage <= 0`, `totalItems < 0`은 개발 오류로 거부하거나 안전한 명시적 fallback을 사용하며 테스트로 고정한다.
  - current page는 `[1,totalPages]`로 clamp한다.
  - 첫/마지막 page, current 주변 sibling, 필요한 ellipsis를 중복 없이 반환한다.
  - 이전/다음은 경계에서 disabled이며 다음 button도 마지막 page에서 disabled한다.
  - “검색 결과”와 `sky-*`를 “총 N개” 및 semantic `primary/muted` token으로 바꾼다.
- **Theme Cleanup**:
  - `bounce-slow`, `float-1/2/3` custom animation과 관련 `@keyframes` 삭제.
  - layout/page/auth에서 `sky-*`, 번역 accent를 사용하지 않고 `background`, `foreground`, `muted`, `border`, `primary` CSS variable utility를 사용한다.
  - shadcn dark token은 유지하되 이번 Task에서 별도 theme switch를 추가하지 않는다.

## Acceptance Criteria
- [x] `/`는 더 이상 번역 route로 redirect하지 않고 generic dashboard를 렌더링한다.
- [x] app name/description/menu가 중앙 config에 있고 sidebar에 Daruda/번역 문자열이 없다.
- [x] auth disabled에서는 SessionProvider 요청과 관리자 메뉴/사용자 footer가 없다.
- [x] Admin page는 server `requireRole`을 호출하며 단순 메뉴 숨김에 의존하지 않는다.
- [x] layout과 Pagination에서 고정 `sky-*`, 고정 1/2/3 page mock, 번역 문구가 제거된다.
- [x] Pagination boundary와 navigation visibility가 단위 테스트로 검증된다.

## Validation
- `npm.cmd run test -- tests/config/app.test.ts tests/lib/pagination.test.ts` — config/navigation/pagination 테스트 통과
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- config/app.ts app/layout.tsx app/page.tsx app/admin/page.tsx components/providers.tsx components/layout components/ui/pagination.tsx lib/pagination.ts tests/config/app.test.ts tests/lib/pagination.test.ts` — 수정 범위 error/warning 0
- `rg -n -i "daruda|다루다|translation|번역|sky-" app/layout.tsx app/page.tsx app/admin/page.tsx components/layout components/ui/pagination.tsx config/app.ts` — 결과 없음

## Commit Message
```text
feat(ui): add configurable neutral dashboard shell

Plan: 2026-09-21-generic-azure-app-template
Phase: P03-generic-application-shell
Task: T01-configurable-neutral-dashboard-shell

- drive branding and navigation from central app config
- render auth-aware sidebar and protected admin example
- replace Daruda styling and mock pagination with neutral reusable UI
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
