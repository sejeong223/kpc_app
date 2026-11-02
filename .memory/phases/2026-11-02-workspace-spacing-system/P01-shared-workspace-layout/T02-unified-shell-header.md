# Task: T02 셸과 모든 업무 페이지 헤더 동시 전환

## Status: done

## Goal

홈·관리자·업무 메뉴를 이동해도 같은 바깥 12px와 작은 제목 줄을 사용하고, 모바일 메뉴가 로딩/오류/편집 상태에서도 사라지지 않게 한다. 본문 푸터·1320px 중앙 정렬·모바일 64px 빈 영역을 제거한다.

## Decision Summary

- `/`, `/admin`도 사용자 확정 범위다. 모바일 메뉴 버튼 이동과 페이지별 헤더 연결은 원자적으로 완료한다. AppShell만 외곽 패딩을 소유한다.
- 권한/메뉴/Query/미저장 경고/캔버스 좌표 동작 유지. 기존 고정 버튼과 새 버튼을 동시에 남기지 않는다.

## Implementation

### I01. 선행 API 계약과 AppShell 연결

- Related Files:
  - `components/layout/AppShell.tsx` :: `AppShell`, `useStyles`, `closeMenu`, `onNavigate` — 셸 전환; modify
  - `components/layout/WorkspaceNavigation.tsx` :: Provider/value — T01 계약; read-only
  - `components/layout/WorkspaceHeader.tsx`, `components/layout/WorkspacePage.tsx` — T01 계약; read-only (연결 결함 수정만 허용)
  - `components/layout/NavSidebar.tsx`, `components/providers/DadamThemeScope.tsx`, `app/(authenticated)/layout.tsx` — 기존 Provider/포커스/권한 배치; read-only

#### Details

- **Signatures & Types**: 선행 컴포넌트 계약을 여기서 재명시한다.

```typescript
interface WorkspaceNavigationValue {
  sidebarId: string; triggerId: string; menuOpen: boolean;
  toggleMenu(): void;
}
interface WorkspacePageProps {
  title: string; description?: string; dataNotice?: string | null;
  dataNoticeSummary?: string; leading?: React.ReactNode; actions?: React.ReactNode;
  headingId?: string; headingRef?: React.Ref<HTMLHeadingElement>;
  stickyHeader?: boolean; className?: string; children: React.ReactNode;
}
interface WorkspaceHeaderProps extends Pick<WorkspacePageProps,
  "title" | "description" | "dataNotice" | "dataNoticeSummary" |
  "leading" | "actions" | "headingId" | "headingRef"> {
  headerRef?: React.Ref<HTMLElement>; sticky?: boolean;
}
function AppShell(props: { children: React.ReactNode }): React.ReactElement;
```

- **Data & Schema Fields**: `menuOpen:boolean`, `sidebarCollapsed:boolean`, `previousPathname`, `mainRef`는 기존 상태를 사용한다. context는 상태 복사본이 아니라 동일 state와 callback의 전달이다. 서버/DB 스키마 없음.
- **Execution Flow / Logic**:
  1. AppShell 렌더를 `WorkspaceNavigationProvider`로 감싼다. value의 `sidebarId="workspace-sidebar"`, `triggerId="workspace-sidebar-trigger"`, menuOpen=기존 state. toggle은 기존과 같이 `controller?.suspendUi()` 후 menuOpen을 반전한다.
  2. useStyles.content의 maxWidth를 none, margin0, padding=`var(--layout-page-inset)`, width100%/minWidth0/flex1로 통일한다. 모바일에서도 같은 padding이다. adminContent의 별도 패딩만 제거하고 기존 해당 route 배경색 지정은 유지한다.
  3. `/workspace/write`의 productionContent는 padding0/width100%/min-height100svh/flex column을 유지한다. 일반 외곽값이 media rule에서 다시 덮어쓰지 않도록 한다.
  4. 본문 열의 고정 메뉴 Button 및 그 전용 theme wrapper/style/import를 삭제한다. 헤더가 새 위치를 소유한다. 본문 footer와 appConfig의 미사용 import/style도 삭제한다. 사이드바 프로필/모달 footer는 수정하지 않는다.
  5. `<main id="main-content" ref={mainRef} tabIndex={-1}>`를 그대로 남기고 mainColumn의 직계 자식 관계 및 inert를 보존한다. ThemeProvider로 mainColumn/main을 다시 감싸지 않는다. UI-only context는 DOM을 추가하지 않는다.
  6. 기존 사이드바 200/64px, 760/761px 경계, 메뉴 닫기 rAF 후 trigger 포커스, 경로 이동 후 main 포커스, body overflow 저장/복원, Escape/Tab trap, 프로필/모달 우선 처리, onNavigate를 그대로 둔다.
  7. 메뉴가 열렸을 때 새 헤더 버튼은 main과 함께 inert가 된다. 닫기 동작은 기존 sidebar close/backdrop/Escape가 수행하고 닫힌 뒤 헤더 버튼으로 포커스가 돌아온다.
  8. 새로 발생할 HTTP/서비스 예외 없음. mount/unmount/route 변경으로 기존 listener/overflow cleanup이 누락되지 않게 유지한다.

### I02. AdminPage 호환과 모든 상태 헤더

- Related Files:
  - `components/admin/ui/AdminPrimitives.tsx` :: `AdminPage`, `AdminPageProps` — 공통 페이지 어댑터; modify
  - `components/admin/AdminScreenRouter.tsx` :: `ScreenContent` — 접근 조회 상태; modify
  - `components/admin/users/UsersPage.tsx` :: `UsersPage` — early returns; modify
  - `components/admin/policy/ModelTokenPage.tsx` :: `ModelTokenPage` — early returns; modify
  - `components/admin/audit/AuditPage.tsx` :: `AuditPage` — early returns; modify
  - `components/admin/dashboard/DashboardPage.tsx` :: `DashboardPage` — early returns; modify
  - `components/admin/skills/SkillsPage.tsx` :: `SkillsPage` — 목록/에디터 분기와 notice; modify
  - `components/admin/templates/TemplatesPage.tsx` :: `TemplatesPage` — 목록/작업 분기와 notice; modify
  - `components/admin/templates/workbench/TemplateWorkbench.tsx` :: `TemplateWorkbench` — notice와 모든 상태; modify
  - `config/sidebar.ts` :: `getSidebarItemByScreen` — 같은 메뉴 제목 재사용; read-only
  - `components/profile/PreviewRoleBoundary.tsx`, `components/admin/AdminRuntimeProvider.tsx`, `hooks/admin/use-admin-data.ts` — 보존할 계약; read-only

#### Details

- **Signatures & Types**: `AdminPageProps extends WorkspacePageProps`; 함수는 기존 named `AdminPage(props):React.ReactElement`를 유지한다. 추가 필드는 모두 optional이다. `AdminCard/AdminMetric`는 이번 Task에서 재구현하지 않는다.
- **Data & Schema Fields**:
  - 기존 title/description/actions/children 소비자 수정 없이 위임한다. `dataNotice===undefined`이면 기존 전체 문구 `예시 데이터 · 기준일 2026.10.20`, summary `예시 데이터`를 사용한다.
  - dataNotice가 명시된 custom 값이면 전달된 summary만 사용하고 없으면 전체 문구를 항상 표시한다. null은 완전히 숨긴다.
  - SkillsPage/TemplatesPage/TemplateWorkbench의 기존 전체 ASSET notice는 유지하고 summary를 명시적으로 `예시 데이터 · 새로고침 시 초기화`로 전달한다. 서비스 저장 기간을 새로 추론하지 않는다.
- **Execution Flow / Logic**:
  1. AdminPage의 자체 header/h1을 삭제하고 WorkspacePage에 위임한다. 기존 관리자 글자 색/본문12px class를 className으로 유지한다. 페이지 패딩을 추가하지 않는다.
  2. ScreenContent의 access error/loading/forbidden 경로만 제목이 있는 AdminPage로 감싼다. title은 기존 `getSidebarItemByScreen(screen)?.label`을 쓰고 union상 알려진 여섯 screen에 대한 타입을 보존한다. success에서 자식 페이지를 다시 감싸지 않는다.
  3. 실제 Users/ModelToken/Audit/Dashboard/Skills/Templates의 자체 early return들도 제목/공통 헤더를 갖춘 상태 페이지로 바꾼다. router에서 먼저 검사하더라도 독립 렌더 시 메뉴를 잃지 않게 한다.
  4. 접근 권한이 없는 create/update/delete 버튼은 기존 조건부 렌더를 그대로 둔다. readonly를 CSS 숨김으로 바꾸지 않는다. 상태 화면에는 성공 화면의 액션을 복제하지 않는다.
  5. ModelToken requestedTab/URL replace, Skills editor 상태·복귀 포커스, Templates workId/대화상자 상태를 그대로 유지한다. 공통 헤더 변화 때문에 QueryClient/identity key를 재생성하지 않는다.
  6. 에러 재시도/조회 전용/상태 안내는 children 본문에 남겨 항상 보이게 한다. description으로 옮기는 것은 정적 화면 소개뿐이다.

### I03. 홈·관리자 진입·일반 메뉴

- Related Files:
  - `app/(authenticated)/page.tsx` :: `DashboardPage`, `componentStyles` — 홈 제목; modify
  - `app/(authenticated)/admin/page.tsx` :: `AdminPage`, `componentStyles` — 관리자 제목; modify
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: `WorkspaceScreenPage` — 빈 메뉴 페이지; modify
  - `lib/auth/guards.ts`, `config/sidebar.ts` — 기존 가드/제목; read-only

#### Details

- **Signatures & Types**: 홈 함수 `():React.ReactElement`, 관리자/동적 route `():Promise<React.ReactElement>`의 기존 server component 형태를 보존한다. server에서 Client WorkspacePage를 children과 문자열 props로 사용할 뿐 page 전체를 `use client`로 바꾸지 않는다.
- **Data & Schema Fields**: 기존 screen params/searchParams와 requiredRole 그대로. 새로운 query/domain 모델 없음.
- 홈 WorkspacePage title=`홈`, description=`필요한 업무와 자료를 한곳에서 관리하는 공간입니다.`. 큰 WORKSPACE eyebrow/h1/description header를 교체한다. 정적 설명을 안내로 모으되 업무 기능을 삭제/추가하지 않는다.
- 관리자 title=`관리자`, description=`워크스페이스를 관리하는 공간입니다.`. **렌더 전에** 기존 `await requireRole(APP_ROLES.ADMIN, "/admin")` 호출을 유지한다.
- 빈 메뉴는 title=item.label, headingId=`workspace-screen-title`, description=`${item.label} 화면입니다.`인 WorkspacePage로 바꾼다. 빈 설명 전용 본문을 중복해서 추가하지 않는다. notFound/권한 await/tokens redirect/PreviewRoleBoundary 분기 순서를 유지한다.
- 두 진입 화면의 자체 heading용 CSS만 이번 Task에서 제거하고 패널 내부 교체는 T03에서 한다. 제목이 한 화면에 두 개 남지 않게 한다.
- `/workspace/tokens`는 UI를 새로 만들지 않고 기존 서버 권한 검사 후 `/workspace/policy?tab=tokens` redirect를 유지한다. PreviewRoleBoundary의 잠깐 null/redirect는 임의 loading 화면으로 교체하지 않는다.

### I04. Skill의 고정 헤더와 폼 상태

- Related Files:
  - `components/admin/skills/SkillEditorPage.tsx` :: `SkillEditorPage`, `heading`, `formId`, `close`, `save` — 헤더 전환; modify
  - `components/admin/skills/SkillStylePreview.tsx` — preview 도형/문서 좌표; read-only

#### Details

- 기존 root div/header를 WorkspacePage로 바꾸고 stickyHeader=true, title=기존 등록/수정/상세 문구, headingRef=기존 heading ref를 전달한다. 뒤로 버튼은 leading, 취소/닫기 및 form={formId} 제출 버튼은 actions에 그대로 넣는다.
- form id/submit handler/Zod validation/첫 오류 포커스/dirty baseline/latest reload/권한 유실/저장 완료 callback을 수정하지 않는다. 버튼 이동 후 `type=submit`과 외부 form 속성을 보존한다.
- beforeunload와 document capture click의 미저장 확인, 목적지 저장, requestAnimationFrame 후 확인 대화상자, 모바일 메뉴 이동 후 guard를 유지한다. 메뉴나 안내 토글은 route 이동이 아니므로 dirty state를 초기화하거나 확인 대화상자를 띄우지 않는다.
- old header top-16/md:top-0을 제거한다. preview aside의 xl sticky top-24는 `calc(var(--layout-sticky-header-height, 0px) + var(--layout-section-gap))`로 바꾼다. 높이는 WorkspacePage의 ResizeObserver가 갱신한다. narrow layout에서 기존 비sticky preview 흐름을 유지한다.
- 헤더 외 폼 카드 gap20/p16 등의 정규화는 T03이다. SkillStylePreview 내부 cm/pt/좌표 계산에는 UI 토큰을 넣지 않는다.

### I05. 제작 표면 안의 헤더·도구 통합

- Related Files:
  - `components/comments/CommentsWorkspace.tsx` :: `CommentsWorkspace`, surface/intro — 공통 헤더 연결; modify
  - `components/comments/CommentCreateButton.tsx` :: `useStyles.root`, `CommentCreateButton` — fixed 도구를 헤더 액션으로 이동; modify
  - `lib/comments/geometry.ts`, `components/comments/CommentPin.tsx`, `components/comments/CommentPopover.tsx` — 좌표/핀 동작; read-only

#### Details

- **Data & Schema Fields**: thread 위치 ratios/rect/viewport와 controller 상태는 변경 없음. `data-comment-surface`, `data-comment-control`, `data-comment-create` 유지.
- 같은 surface section(상대 위치, width100%, min-height100svh, ref, tabindex, aria-labelledby)을 남긴다. 외부에 공통 Page padding wrapper를 씌우지 않는다.
- surface 안의 기존 intro를 도구 래퍼 `data-comment-control` + padding=`var(--layout-canvas-tools-inset)`로 바꾸고 WorkspaceHeader를 넣는다. title=`제작`, headingId=`workspace-screen-title`, actions에 CommentCreateButton. 일반 화면 설명만 description에 넣는다.
- pinMode/로딩/오류 등의 동적 안내는 헤더 아래 항상 보이는 별도 문단으로 유지한다. 헤더가 스크린 전체를 덮는 fixed overlay가 되지 않게 일반 흐름을 사용한다.
- CommentCreateButton의 fixed/top16/right20만 제거한다. 눌림/disabled/controller.togglePinMode/표면 포커스/aria 속성은 그대로 유지한다. 버튼은 계속 surface의 후손이어야 close/focus 조회가 작동한다.
- surface click은 기존 `closest('[data-comment-control], [data-comment-pin], button, a, input, textarea, select')` 제외 조건을 유지한다. 헤더 빈 영역/안내 클릭에도 새 핀이 생기지 않게 wrapper에 control 표시를 둔다.
- surface getBoundingClientRect/ResizeObserver/핀 저장 수식은 수정하지 않는다. header 높이를 저장 좌표에서 더하거나 빼지 않고 데이터 마이그레이션도 하지 않는다. 기존 pin layer/드래그/팝업 위치 계산을 보존한다.

### I06. DOM 통합 회귀

- Related Files:
  - `tests/lib/comments/shell-ui.test.ts` — 새 헤더 아래 메뉴/모달 포커스; modify
  - `tests/lib/comments/workspace-ui.test.ts` — 헤더 클릭 배제/핀 동작; modify
  - `tests/app/workspace/screen.test.ts` — 공통 페이지와 가드; modify
  - `tests/components/layout/workspace-routes.test.ts` — 홈/관리자/관리자 상태 헤더; new
  - `tests/components/admin/skill-editor-layout.test.ts` — 폼 헤더/dirty 보호; new
  - `tests/components/preview-role-boundary.test.ts`, `tests/components/admin/skill-access.test.ts`, `tests/components/admin/template-access.test.ts`, `tests/app/authenticated-layout.test.ts` — 보존 검사; read-only (필요한 mock 경계만 조정)

#### Details

- 테스트는 `.test.ts` + createElement/createRoot/act, jsdom directive. 기존 typed fixture와 실제 runtime/mock을 재사용한다. 새 테스트 패키지 설치 없음.
- shell-ui의 가짜 ‘제작 본문’ child를 WorkspacePage(title 제작)로 바꾼다. ‘header가 없어야 함’ assertion을 main 아래 `data-workspace-header` 하나/h1 하나/trigger 하나로 바꾼다. suspendUi, main 부모 inert, Escape 복귀, body scroll 복원, 토큰 모달 포커스 검사는 유지한다.
- loading/error/forbidden 관리자 화면을 Provider 안에서 렌더해 제목/trigger/재시도 동작 및 불허 액션 미렌더를 검사한다. success는 한 번만 wrapper가 생기는지 검사한다.
- route 테스트의 완전한 h1 HTML 문자열 일치는 DOM/element 속성 기반으로 바꾼다. 설명은 접힌 안내이므로 처음부터 p 텍스트가 보여야 한다는 기대를 바꾸되 별도의 공통 헤더 테스트로 펼침을 검증한다. 권한 await/reject/redirect 테스트는 삭제하지 않는다.
- 홈과 `/admin`의 h1, 서버 guard 성공/실패 전파를 검사한다. auth 로직을 mock 없이 우회해 테스트를 통과시키지 않는다.
- Skill은 필드 변경 → 안내 토글 → 값/dirty 유지, header form submit → 동일 저장 payload, 이탈 시 계속 편집/변경사항 버리기 및 focus 복귀를 검사한다. HTML 63개 필드 계약은 기존 테스트로 유지한다.
- comments workspace의 기존 200/64/mobile0 surfaceRect 테스트 유지. pinMode에서 헤더/안내 클릭 시 create 없음, 표면 클릭/Enter 생성은 기존대로, 팝업 닫기 후 creation/pin focus 복귀 확인. 실제 픽셀 배치를 jsdom이 검증한 것처럼 기록하지 않는다.

## Acceptance Criteria

- [x] 모든 대상 route의 정상/조회 상태에 공통 헤더 하나, main 하나, 메뉴 trigger 하나다.
- [x] 일반 셸은 full width/공통 패딩, 제작은 padding0이고 standalone 메뉴/본문 footer가 없다.
- [x] 모바일 메뉴 상태·inert·포커스·스크롤 잠금·모달 우선순위가 보존된다.
- [x] 홈과 관리자 진입에도 공통 헤더가 있고 서버 role guard가 그대로다.
- [x] Skill form/dirty/저장/취소/조회 전용 동작과 preview sticky 높이 연결이 유지된다.
- [x] 제작 surface 원점·핀 저장 모델·생성/드래그/팝업 기능은 변경하지 않았다.

## Validation

- `npm.cmd test -- tests/components/layout tests/lib/comments/shell-ui.test.ts tests/lib/comments/workspace-ui.test.ts tests/app/workspace/screen.test.ts tests/app/authenticated-layout.test.ts tests/components/preview-role-boundary.test.ts tests/components/admin/skill-editor-layout.test.ts tests/components/admin/skill-access.test.ts tests/components/admin/template-access.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- [지속 정책](../../../decisions/2026-10-30-task-validation-policy.md): 브라우저/E2E/스크린샷/native IME/터치/dev server 검증 제외. DOM 상호작용과 정적 구조 검토 범위만 기록한다.

## Commit Message

```text
refactor(layout): 업무 셸과 모바일 페이지 헤더 통합

Plan: 2026-11-02-workspace-spacing-system
Phase: P01-shared-workspace-layout
Task: T02-unified-shell-header

- 홈·관리자·업무 화면의 공통 헤더와 상태 화면 연결
- 별도 메뉴 여백과 본문 푸터 제거 및 Skill·캔버스 동작 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: batch (Plan 헤더로 git log 조회)
- 다음 Task: `T03-screen-spacing-migration.md`. 통과 후 Status/Phase/current 갱신.

## 실행 기록

- 2026-11-02: 지정 10개 파일 78개 테스트, typecheck/lint/build/diff 검사 통과. lint의 createElement props 경고 수정 후 shell 3개 테스트 재통과.
- 청사진 보정: sticky aside가 SkillStylePreview.tsx 안에 있어 해당 외곽 class만 변경했다. SVG/문서 규칙 계산은 그대로다.
