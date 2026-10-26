# Task: T01 범용 최소 셸과 내비게이션

## Status: done

## Goal

제안서 탭과 목업 프로필에 결합된 전역 셸을 기본 HTML 내비게이션으로 교체하여 다음 Task에서 제안서 도메인을 안전하게 삭제할 수 있게 한다.

## Decision Summary

- 앱의 표시 이름·설명은 범용 기본값으로 바꾸되 환경변수 재정의는 유지한다. 패키지명과 캐시 네임스페이스 변경은 T04에서 함께 처리한다.
- 로그인 여부와 `Admin` 역할은 실제 세션 값으로 판정한다. 목업 역할 토글, 알림, 사용량, 비활성 탭 메시지는 제거한다.

## Implementation

### I01. 앱 설정을 실제 라우트만 나타내도록 축소

- Related Files:
  - `config/app.ts` :: `HeaderNavigationItem`, `AppConfig`, `appConfig`, `getVisibleNavigation` — 기존 설정을 유지·축소; modify
  - `tests/config/app.test.ts` :: `appConfig`, `getVisibleNavigation` 테스트 — 새 기본값과 역할 필터 검증; modify
  - `.env.example` :: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_DESCRIPTION` — 표시용 중립 기본값; modify

#### Details

- **Signatures & Types**:
  ```typescript
  interface HeaderNavigationItem {
    id: string;
    label: string;
    href: `/${string}` | "/";
    requiresAuth?: boolean;
    requiredRole?: AppRole;
  }
  interface AppConfig {
    name: string;
    description: string;
    headerNavigation: readonly HeaderNavigationItem[];
    profileNavigation: readonly HeaderNavigationItem[];
  }
  function getVisibleNavigation(
    items: readonly HeaderNavigationItem[],
    context: { authEnabled: boolean; authenticated: boolean; roles?: readonly string[] },
  ): HeaderNavigationItem[];
  ```
- **Data & Schema Fields**:
  - `appConfig.name`: `process.env.NEXT_PUBLIC_APP_NAME ?? "Azure App Template"`.
  - `appConfig.description`: `process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Azure 기반 업무 애플리케이션 템플릿"`.
  - `headerNavigation`: 정확히 `{ id: "home", label: "홈", href: "/" }` 한 항목.
  - `profileNavigation`: 정확히 `{ id: "admin", label: "관리자", href: "/admin", requiresAuth: true, requiredRole: "Admin" }` 한 항목.
  - `isMock` 필드는 타입과 데이터에서 삭제한다. `.env.example`의 두 표시값도 위 기본값과 일치시킨다. `AUTH_CACHE_NAMESPACE`는 T04에서 갱신한다.
- **Execution Flow / Logic**:
  1. 기존 `getVisibleNavigation`의 인증 비활성, 미로그인, 역할 부족 필터를 그대로 보존한다.
  2. `tests/config/app.test.ts`의 KPC·제안서 기대값을 홈 1개와 Admin 필터 기대값으로 교체한다. 기존 네 가지 역할 필터 시나리오는 유지한다.
  3. `href`를 필수 필드로 만들고 목업 메뉴를 새 데이터에 넣지 않는다.

### I02. 앱 셸의 제안서·디자인 종속 제거

- Related Files:
  - `components/layout/AppShell.tsx` :: `AppShell`, `AppShellProps` — 최소 시맨틱 셸로 전면 교체; modify
  - `components/layout/AppHeader.tsx` :: `AppHeader`, `ProfileAvatar`, `TokenUsage`, `RoleButton` 등 파일 내 전용 심볼 — 삭제; delete
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` — `AppShell` 연결 유지 여부 확인; read-only
  - `components/providers.tsx` :: `useAuthRuntime` — 인증 상태 공급 계약 확인; read-only

#### Details

- **Signatures & Types**:
  ```typescript
  interface AppShellProps { children: React.ReactNode }
  function AppShell({ children }: AppShellProps): React.ReactElement;
  ```
- **Data & Schema Fields**:
  - 새 상태·DTO·DB 필드 없음. `useAuthRuntime()`의 `{ authEnabled: boolean, session: Session | null }`만 사용한다.
- **Execution Flow / Logic**:
  1. `AppShell`은 클라이언트 컴포넌트로 유지하고 `useAuthRuntime`, `appConfig`, `getVisibleNavigation`만 import한다. `GnbTab`, 제안서 타입, `AppHeader`, `Toast`, 아이콘, 목업 상태·effect를 제거한다.
  2. `<header>`에 설정의 앱 이름을 텍스트로, `<nav aria-label="주 메뉴">`에 필터된 `headerNavigation`과 `profileNavigation`을 실제 `href`를 가진 `<a>`로 렌더링한다. 두 목록 모두 `authEnabled`, `session !== null`, `session?.user.roles`를 전달해 필터한다.
  3. `authEnabled && session`이면 `/auth/logout` 링크를, `authEnabled && !session`이면 `/auth/login` 링크를 표시한다. 인증이 꺼진 경우 인증 링크를 표시하지 않는다. `<main>`에 `children`을 렌더링한다.
  4. 사용자 이름의 fixture 대체값, 가짜 관리자 모드, 시각 클래스·inline style·토스트를 넣지 않는다. `components/common/Toast.tsx`는 아직 제안서 작업공간에서 사용하므로 T02까지 보존한다.
  5. 세션 로드 오류를 목업 세션으로 숨기지 않는다. 접근 차단은 기존 `proxy.ts`와 `requireRole`이 맡는다.

## Acceptance Criteria

- [ ] 홈과 `Admin` 권한자용 관리자 링크만 실제 세션 상태에 맞게 나타난다.
- [ ] `AppShell`과 활성 전역 설정에 제안서 타입·탭·목업 역할·시각 클래스 의존성이 없다.
- [ ] 제안서 라우트가 아직 존재하는 중간 상태에서도 타입 검사와 앱 설정 테스트가 통과한다.

## Validation

- `npm.cmd run test -- tests/config/app.test.ts` — 기본 이름·홈 메뉴·관리자 역할 필터 통과.
- `npm.cmd run typecheck` — 셸 교체 후 제안서 라우트를 포함한 타입 검사 통과.
- `npm.cmd run lint` — 미사용 import와 hook 오류 없음.

## Commit Message

```text
refactor(shell): 제안서 결합 셸을 범용 최소 내비게이션으로 교체

Plan: 2026-10-26-azure-template-design-reset
Phase: P01-template-cleanup
Task: T01-neutral-shell

- 앱 기본 표시값과 메뉴를 실제 라우트로 축소
- 목업 헤더를 제거하고 세션 기반 링크만 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 완료 (Git 로그 참조)
