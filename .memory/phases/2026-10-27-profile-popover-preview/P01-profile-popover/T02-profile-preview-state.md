# Task: T02 프로필 시연 상태와 역할별 메뉴·화면 연동

## Status: done

## Goal

인증 비활성 앱에서 프로필 역할·알림·환경 설정을 한 곳에서 관리하고, 일반/관리자 미리보기 역할에 따라 사이드바와 관리자 안내 화면이 일관되게 반응하는 기반을 만든다.

## Decision Summary

- T01 공용 컨트롤이 추가된 상태에서 진행한다. 프로필 UI 연결은 T03이며, 이 Task는 Provider·순수 상태 함수·메뉴/안내 화면 경계를 독립 검증한다.
- 초기 역할 admin, 메모리 저장, 새로고침 초기화다. AuthRuntime/Session/서버 인가는 수정하지 않는다. AUTH_ENABLED=true에서는 실제 세션만 역할 표시와 메뉴 판정에 사용한다.

## Implementation

### I01. 타입·시연 fixture

- Related Files:
  - `config/profile-preview.ts` :: 아래 타입, `PROFILE_PREVIEW_USER`, `PROFILE_TOKEN_USAGE`, `PROFILE_WORK_COUNTS`, `PROFILE_NOTIFICATION_SEED`, `PROFILE_PREFERENCE_DEFAULTS` — client-safe 모델·fixture; new
  - `lib/auth/roles.ts` :: `APP_ROLES`, `AppRole`, `hasRole` — 기존 역할 상수; read-only
  - `config/sidebar.ts` :: `SidebarScreen`, `SidebarNavigationContext` — 기존 URL·역할 카탈로그; modify

#### Details

- **Signatures & Types**:

  ```typescript
  export type PreviewRole = "user" | "admin";
  export type ProfileTab = "general" | "notifications" | "preferences";
  export type NotificationFilter = "all" | "unread";
  export type NotificationKind = "ai" | "comment" | "deadline" | "token";
  export type DigestSchedule = "off" | "daily" | "weekly";
  export interface ProfilePreferences {
    comments: boolean;
    reviews: boolean;
    deadlines: boolean;
    aiJobs: boolean;
    tokenWarnings: boolean;
    email: boolean;
    digest: DigestSchedule;
    startScreen: "pipeline" | "write";
    editorView: "doc" | "slide";
    listView: "table" | "board";
  }
  export interface ProfileNotification {
    id: string;
    kind: NotificationKind;
    title: string;
    description: string;
    timeLabel: string;
    unread: boolean;
    targetScreen: SidebarScreen | null;
  }
  export interface ProfileDisplay {
    name: string;
    email: string | null;
    department: string | null;
    organization: string;
    role: PreviewRole;
    isPreview: boolean;
  }
  export interface ProfilePreviewState {
    previewRole: PreviewRole;
    selectedTab: ProfileTab;
    notificationFilter: NotificationFilter;
    notifications: ProfileNotification[];
    preferences: ProfilePreferences;
  }
  export type ProfilePreferenceAction = {
    [K in keyof ProfilePreferences]: {
      type: "set-preference";
      key: K;
      value: ProfilePreferences[K];
    }
  }[keyof ProfilePreferences];
  export type ProfilePreviewAction =
    | { type: "set-role"; role: PreviewRole }
    | { type: "set-tab"; tab: ProfileTab }
    | { type: "set-notification-filter"; filter: NotificationFilter }
    | { type: "mark-notification-read"; id: string }
    | { type: "mark-all-notifications-read" }
    | ProfilePreferenceAction;
  ```

- **Data & Schema Fields**:
  - 위 모델은 브라우저 메모리 상태이며 DB 테이블이 아니다. 필드는 위 계약으로 한정하고 Azure endpoint·키·인증 token을 포함하지 않는다.
  - `PROFILE_PREVIEW_USER`: name `정소담`, email `sodam.jeong@example.invalid`, department `AI사업본부`, organization `KPC`. readonly fixture.
  - `PROFILE_TOKEN_USAGE`: used `72400`, limit `100000`, warningThreshold `70`. readonly fixture. 실제 계량·승인·추가 신청 데이터는 없다.
  - `PROFILE_WORK_COUNTS`: assignedProjects `3`, openComments `2`. 두 숫자는 명시적 시연값이다.
  - `PROFILE_NOTIFICATION_SEED`: readonly 알림 4개. 수정은 복사본에서만 한다.

    | id | kind | title | description | timeLabel | unread | targetScreen |
    | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
    | n1 | ai | 분석 결과 예시 생성 | RFP 분석 시연 결과가 준비되었습니다. 실제 AI 분석 결과가 아닙니다. | 10분 전 | true | analysis |
    | n2 | comment | 댓글 알림 | 김민수 님이 [3.3 보안 체계] 섹션에 새로운 댓글을 남겼습니다. | 35분 전 | true | write |
    | n3 | deadline | 제안서 마감 임박 | 한국교육진흥원 컨설팅 사업 제안서 마감이 24일 남았습니다. | 2시간 전 | false | pipeline |
    | n4 | token | AI Token 70% 사용 | 이번 달 개인 한도의 70%를 넘었습니다. 필요하면 추가 신청하세요. | 어제 | false | null |

  - preferences 기본값: comments/reviews/deadlines/aiJobs/tokenWarnings `true`, email `false`, digest `daily`, startScreen `pipeline`, editorView `doc`, listView `table`.
  - selectedTab `general`, notificationFilter `all`, previewRole `admin`. 생성 함수는 notifications 각 객체와 preferences를 새로 복사한다. seed를 직접 mutate하지 않는다.
  - Nullable: ProfileDisplay.email/department와 notification.targetScreen만 null 허용. 실제 세션의 department 정보는 추가 조회하지 않고 null, organization은 KPC다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기존 `config/sidebar.ts`의 15개 id/label/href/requiredRole을 보존한다. `import type`만으로 SidebarScreen을 참조해 config 모듈 사이 runtime 순환 import를 만들지 않는다.
  2. Core Processing: 위 모델과 fixture를 새 파일로 export한다. 환경 변수나 server-only 모듈을 import하지 않아 클라이언트 번들에서 사용할 수 있게 한다.
  3. Error & Exception Handling: 외부 JSON 입력이나 HTTP가 없다. 선택 값은 enum allowlist로만 받는다. 원본의 `start:'my'`는 현재 최종 선택지와 맞지 않으므로 pipeline으로 정규화한 기본값을 사용한다.
  4. State Transition & Return: fixture는 상수이며 createInitialProfilePreviewState가 각 Provider의 독립 상태를 만든다. localStorage/cookie/DB 저장 코드를 넣지 않는다.

### I02. 순수 상태 함수와 표시 데이터 계산

- Related Files:
  - `lib/profile-preview.ts` :: 아래 함수·타입 — React 외부에서 테스트 가능한 상태/표시 규칙; new
  - `types/next-auth.d.ts` :: Session.user 확장 — 실제 session 모델 확인; read-only
  - `lib/auth/roles.ts` :: `hasRole` — Admin 판정 재사용; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export function createInitialProfilePreviewState(): ProfilePreviewState;
  export function profilePreviewReducer(
    state: ProfilePreviewState, action: ProfilePreviewAction,
  ): ProfilePreviewState;
  export function getUnreadNotificationCount(
    notifications: readonly ProfileNotification[],
  ): number;
  export function getVisibleProfileNotifications(
    notifications: readonly ProfileNotification[], filter: NotificationFilter,
  ): ProfileNotification[];
  export function formatTokenCount(value: number): string;
  export interface ProfileTokenSummary {
    used: number;
    limit: number;
    remaining: number;
    percent: number;
    progressPercent: number;
    status: "normal" | "warning" | "over" | "unavailable";
  }
  export function getProfileTokenSummary(
    used: number, limit: number, warningThreshold?: number,
  ): ProfileTokenSummary;
  export function resolveProfileDisplay(input: {
    authEnabled: boolean;
    session: Session | null;
    previewRole: PreviewRole;
  }): ProfileDisplay;
  export function shouldHidePreviewScreen(
    authEnabled: boolean, previewRole: PreviewRole, requiredRole?: AppRole,
  ): boolean;
  ```

- **Data & Schema Fields**:
  - Session은 `next-auth`의 type-only import다. lib는 browser-safe하며 AuthService·config/env·Azure SDK를 import하지 않는다.
  - getProfileTokenSummary의 warningThreshold 기본 70. percent는 `Math.round(used / limit * 100)`, progressPercent는 0~100 범위, remaining은 `Math.max(0, limit - used)`다. status는 percent >=100이면 over, >=70이면 warning, 그 미만 normal이다.
  - limit<=0 또는 비유한 수 등 유효하지 않은 사용량은 summary의 수치들을 0으로 정규화하고 status unavailable로 반환한다. UI는 `—`와 비활성 progress를 사용해 NaN/Infinity를 노출하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: reducer와 selector는 전달받은 state/fixture를 mutate하지 않는다. 알림 id는 배열 내부의 exact match만 사용하며 HTML/JS 실행에 사용하지 않는다.
  2. Core Processing: set-role/set-tab/filter는 대응 필드만 바꾼다. mark-read는 해당 알림의 unread만 false, mark-all은 전체 false로 바꾼다. 알 수 없는 알림 id와 이미 읽은 알림은 원래 state를 반환해도 된다. 반복 실행으로 건수가 음수가 되지 않는다.
  3. preferences는 해당 키 한 개만 바꾸고 다른 필드를 보존한다. typed action union을 사용해 boolean 필드에 문자열, digest에 잘못된 값을 전달하지 못하게 한다. native select의 문자열은 T03에서 allowlist로 변환한다.
  4. formatTokenCount: 1000 미만은 정수 문자열, 1000 이상·100000 미만은 /1000 소수 한 자리 뒤 `.0` 제거, 100000 이상은 /1000 정수 반올림 + K. 예: 72400 → 72.4K, 27600 → 27.6K, 100000 → 100K.
  5. resolveProfileDisplay: authEnabled=false면 fixture + previewRole + isPreview true. true면 trimmed session name → trimmed email → `사용자`, email은 없으면 null, department null·organization KPC·isPreview false. Admin 역할이 있으면 admin, 나머지는 user다. session/roles를 덮어쓰지 않는다.
  6. shouldHidePreviewScreen은 **인증 비활성 AND previewRole=user AND requiredRole=APP_ROLES.ADMIN**일 때만 true다. 인증 활성에 대해 false를 반환하는 것은 서버 검사를 대체하는 허용 결정이 아니라 미리보기 UI 개입이 없다는 뜻이다.
  7. Error & Exception Handling: 네트워크·HTTP·롤백이 없다. selector는 빈 알림 배열을 정상 처리한다. null session을 미리보기 관리자 session으로 만들지 않는다.
  8. State Transition & Return: 역할 변경 후 알림/설정/선택 탭은 유지된다. 전체 새로고침 또는 Provider 재마운트 시에만 초기 상태로 돌아간다.

### I03. 레이아웃 Provider와 사이드바 연결

- Related Files:
  - `components/profile/ProfilePreviewProvider.tsx` :: `ProfilePreviewProvider`, `useProfilePreview`, `ProfilePreviewContextValue` — 로컬 상태와 실제 역할 표시의 분리; new
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` — FluentUiProvider 안, AppShell 밖에 ProfilePreviewProvider 연결; modify
  - `components/layout/NavSidebar.tsx` :: `NavSidebar` — previewRole 전달·배지·아바타 색·표시 이름; modify
  - `components/providers.tsx` :: `useAuthRuntime`, `AuthRuntimeContextValue` — 실제 인증 상태를 읽는 기존 경로; read-only
  - `config/sidebar.ts` :: `SidebarNavigationContext`, `getVisibleSidebarGroups` — 미리보기 역할 필터; modify

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProfilePreviewContextValue {
    authEnabled: boolean;
    rolePreviewEnabled: boolean;
    profile: ProfileDisplay;
    state: ProfilePreviewState;
    dispatch: React.Dispatch<ProfilePreviewAction>;
  }
  export default function ProfilePreviewProvider(
    props: { children: React.ReactNode },
  ): React.ReactElement;
  export function useProfilePreview(): ProfilePreviewContextValue;
  // 기존 인터페이스의 다른 필드는 그대로 두고 이 optional 필드만 추가한다.
  interface SidebarNavigationContext {
    authEnabled: boolean;
    authenticated: boolean;
    roles?: readonly string[];
    previewRole?: PreviewRole;
  }
  ```

- **Data & Schema Fields**:
  - Provider는 useAuthRuntime에서 authEnabled/session을 읽고 useReducer의 initializer로 상태를 만든다. dispatch는 실제 reducer dispatch를 감싼 callback이다.
  - `rolePreviewEnabled = !authEnabled`. authEnabled=true일 때 `set-role` action은 무시한다. 그 외 action은 화면 시연 상태에만 적용한다.
  - profile은 resolveProfileDisplay로 파생하며 previewRole을 실제 Session.roles에 쓰지 않는다. context 바깥 useProfilePreview는 설명 가능한 Error를 throw한다.
  - SidebarNavigationContext.previewRole의 생략 기본값은 admin으로 두어 기존 미리보기 호출자의 15개 메뉴 계약을 유지한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: AuthenticatedLayout의 `requireAppAccess()`와 `dynamic = force-dynamic`를 유지한다. 배치는 `<FluentUiProvider><ProfilePreviewProvider><AppShell>...</AppShell></ProfilePreviewProvider></FluentUiProvider>`다.
  2. Core Processing: NavSidebar는 실제 authEnabled/session으로 기존 authenticated/roles를 전달하고, 별도로 state.previewRole을 getVisibleSidebarGroups에 전달한다. auth 비활성 user는 requiredRole 없는 7개만, admin/생략은 15개다. auth 활성 분기는 현재 hasRole 검사 그대로이며 previewRole을 무시한다.
  3. NavSidebar 표시 이름은 profile.name, 역할은 admin `관리자`/user `일반 사용자`, 소속은 department 없으면 organization이다. 기존 `(isAdmin || !authEnabled)` 아바타 조건은 profile.role 기준으로 바꿔 일반 미리보기가 항상 빨간 아바타가 되는 문제를 막는다.
  4. 이 Task에서는 기존 비대화형 프로필 마크업을 유지한다. 클릭 트리거·팝오버는 T03에서 연결한다. logout은 기존 실세션 링크를 유지한다.
  5. Error & Exception Handling: 미인증인 auth 활성 사용자에게 previewRole로 메뉴를 보여주지 않는다. 서버가 셸을 허용하는 정책을 바꾸지 않는다. 필터링 후 빈 그룹은 기존대로 제거한다.
  6. State Transition & Return: Provider는 페이지 하위가 아니라 레이아웃 상위에 있으므로 메뉴 이동으로 상태를 잃지 않는다. localStorage·서버 요청을 추가하지 않는다.

### I04. 관리자 안내 화면의 클라이언트 미리보기 경계

- Related Files:
  - `components/profile/PreviewRoleBoundary.tsx` :: `PreviewRoleBoundary` — 로컬 user가 관리자 안내 화면을 계속 보지 않게 함; new
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: `WorkspaceScreenPage` — 가드 이후 경계로 기존 section 감싸기; modify
  - `lib/auth/guards.ts`, `app/(authenticated)/admin` — 실제 가드·기존 관리자 예시; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface PreviewRoleBoundaryProps {
    requiredRole?: AppRole;
    children: React.ReactNode;
  }
  export default function PreviewRoleBoundary(
    props: PreviewRoleBoundaryProps,
  ): React.ReactElement | null;
  ```

- **Data & Schema Fields**:
  - boundary는 Provider의 authEnabled/state.previewRole을 읽고 shouldHidePreviewScreen을 사용한다. fallback URL은 상수 `/workspace/pipeline`이다. 서버로 previewRole을 전송하지 않는다.
  - 기존 page는 allowlist 조회·알 수 없는 screen의 notFound·authEnabled일 때 item.requiredRole의 requireRole을 그대로 실행한다. 그 다음 기존 section을 `<PreviewRoleBoundary requiredRole={item.requiredRole}>`로 감싼다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: Hooks는 조건부 호출하지 않는다. useRouter는 `next/navigation`에서 가져온다.
  2. Core Processing: hide=true일 때 같은 렌더에서 null을 반환해 관리자 내용을 즉시 감춘다. effect에서 `router.replace('/workspace/pipeline')`를 실행한다. 렌더 중 router.replace를 호출하지 않는다.
  3. Error & Exception Handling: 서버 notFound/requireRole의 예외·redirect를 catch해 우회하지 않는다. 실제 auth 활성에서는 이 boundary가 아무 권한도 부여하지 않는다.
  4. State Transition & Return: ordinary 화면은 역할 전환 후 유지한다. admin 안내 화면에서 user로 바꾸거나 user 상태로 admin URL을 열면 pipeline으로 이동한다. 전체 새로고침은 Provider 기본 admin이므로 현재 설계의 미리보기 예외가 적용된다.

### I05. 의미 있는 회귀 테스트

- Related Files:
  - `tests/lib/profile-preview.test.ts` :: reducer·selector·표시 데이터·역할 경계; new
  - `tests/components/preview-role-boundary.test.ts` :: 차단 상태의 SSR 내용 노출 방지; new
  - `tests/config/sidebar.test.ts` :: 미리보기 user/admin·실역할 우선; modify
  - `tests/app/workspace/screen.test.ts` :: 기존 서버 가드 회귀; modify

#### Details

- 기존 Vitest는 node 환경이고 `tests/**/*.test.ts`만 포함한다. 새 테스트는 `.test.ts`로 만들고 React.createElement/renderToStaticMarkup을 쓴다. jsdom·Testing Library·새 패키지를 추가하지 않는다.
- reducer: 독립 초기 상태 두 개가 배열·객체를 공유하지 않음, 한 알림/모두 읽음, 이미 읽음·잘못된 id의 멱등성, 필터가 source를 mutate하지 않음, 역할 바꿔도 설정/알림/탭 유지, boolean·enum 설정 변경 시 인접 필드 보존.
- tokens: 72400/100000 → percent72·remaining27600·warning, 0 사용·70% 경계·100% 경계·초과 시 bar100·remaining0, limit0·비유한 값의 unavailable, format 0/999/1000/72400/100000.
- 표시: auth=false user/admin 샘플, auth=true name→email→사용자 fallback, 실제 User+preview admin은 user, 실제 Admin+preview user는 admin, department 추가 조회 없음.
- 메뉴: previewRole 생략/admin 15, user 7. 실제 auth 활성 User+preview admin 7, Admin+preview user 15, anonymous 0, unknown role 7. 원본 sidebarGroups 불변.
- boundary SSR: useProfilePreview와 next/navigation router만 mock하고 실제 boundary를 render한다. auth=false/user/Admin-required면 sentinel children이 없음, ordinary면 있음, preview admin이면 있음, auth=true에서는 있음. useEffect의 실제 이동은 SSR로 확인했다고 주장하지 않고 T03 브라우저 항목에 남긴다.
- 기존 server screen 테스트에는 boundary를 children 그대로 반환하는 컴포넌트로 mock해 서버 가드 테스트 책임을 유지한다. 관리자 8개 requireRole 호출·인가 완료 전 미반환·거부 예외 전파·unknown screen404 테스트는 삭제하거나 완화하지 않는다.
- ProfilePreviewProvider의 set-role 차단은 dispatch wrapper의 명시적 조건으로 구현하고, 실세션 우선 순수 함수 테스트와 T03 실인증 모드 격리 확인을 함께 사용한다. 테스트를 위해 인증 플래그를 제품 UI에서 바꾸는 기능은 만들지 않는다.

## Acceptance Criteria

- [x] 프로필 상태가 client-safe 모델·순수 함수·전용 Provider로 분리되어 있다.
- [x] 기본 admin/선택 user의 메뉴가 15/7개이며 상태가 시연 데이터에만 영향을 준다.
- [x] auth 활성 역할·서버 가드·기존 관리자 예시 정책은 유지된다.
- [x] user 미리보기에서는 관리자 안내 내용이 렌더되지 않고 pipeline으로 이동할 수 있는 경계가 있다.
- [x] 기존 구분선 미커밋 변경과 T01 공용 컨트롤을 보존한다.
- [x] 관련 신규 테스트와 기존 서버 인가 회귀 테스트가 통과한다.

## Validation

- `npm run test -- tests/lib/profile-preview.test.ts tests/components/preview-role-boundary.test.ts tests/config/sidebar.test.ts tests/app/workspace/screen.test.ts tests/lib/auth/guards.test.ts` — 상태·역할·기존 가드 회귀 통과.
- `npm run typecheck` — Provider·generic action union·서버/클라이언트 경계 타입 통과.
- `npx --no-install eslint config/profile-preview.ts lib/profile-preview.ts config/sidebar.ts components/profile/ProfilePreviewProvider.tsx components/profile/PreviewRoleBoundary.tsx components/layout/NavSidebar.tsx "app/(authenticated)/layout.tsx" "app/(authenticated)/workspace/[screen]/page.tsx" tests/lib/profile-preview.test.ts tests/components/preview-role-boundary.test.ts tests/config/sidebar.test.ts tests/app/workspace/screen.test.ts` — 지정 파일 lint 통과.
- `git diff --check` — 변경 공백 오류 없음. Task 이전 divider hunk를 자동 stage하지 않는다.
- Provider 동작과 실제 replace·뒤로 가기·새로고침의 브라우저 확인은 T03에서 수행한다.

## Commit Message

```text
feat(profile): 로컬 프로필 상태와 역할별 미리보기 연결

Plan: 2026-10-27-profile-popover-preview
Phase: P01-profile-popover
Task: T02-profile-preview-state

- 프로필 알림과 환경 설정을 메모리 상태로 관리
- 일반 사용자와 관리자 메뉴를 분리하고 안내 화면 이동 경계 추가
- 실제 인증 가드와 세션 역할 우선 정책을 회귀 검증
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task의 변경·완료 기록을 포함한 동일 커밋(Plan/Phase/Task 식별자로 조회)

## Execution Result — 2026-10-27

- client-safe 프로필 fixture·순수 reducer·토큰/역할 selector와 레이아웃 Provider를 추가했다. 상태는 메모리에만 유지한다.
- 실제 Session은 변경하지 않으며, 인증 활성일 때 역할 변경 dispatch를 차단하고 실제 역할이 표시/메뉴를 결정한다.
- 미리보기 일반7/관리자15 메뉴와 관리자 안내 화면의 즉시 가림·pipeline replace 경계를 구현했다.
- 관련5개 테스트 파일91개 통과, 타입 검사·대상 ESLint·공백 검사 통과. 이후 변경된 테스트2개 파일도 재검증했다.
- SSR의 내용 가림과 실제 브라우저 redirect 검증을 구분한다. 클릭/뒤로 가기/모바일 확인은 T03에서 진행한다.
- 기존 divider 좌우6px·width auto는 working tree에 보존하고 이번 Task index에는 포함하지 않았다. 추가 범위 밖 결함은 확인하지 않았다.
