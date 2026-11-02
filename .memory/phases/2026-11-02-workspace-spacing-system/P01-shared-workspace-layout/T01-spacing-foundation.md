# Task: T01 공통 간격 원본과 레이아웃 컴포넌트

## Status: done

## Goal

Tailwind와 Fluent/Griffel이 같은 CSS 간격 원본을 사용하고, 모든 업무 화면에서 재사용할 페이지·헤더·카드·메뉴 계약을 제공한다. 기존 화면의 헤더 전환은 T02에서 한 번에 진행하므로 이 Task에서는 신규 컴포넌트와 기반만 추가한다.

## Decision Summary

- 대상은 `/`, `/admin`, `/workspace/*`. 바깥/영역/카드 간격은 각각 12px, 작은 조작 간격은 8px/4px다. 바깥 패딩은 AppShell만 소유한다.
- 기존 Query/인증/코멘트 Provider를 늘리지 않는다. DB/서비스 스키마 및 문서 서식값 변경 없음. 새 라이브러리·내부 any/unknown 금지.

## Implementation

### I01. CSS 원본과 기존 테마 연결

- Related Files:
  - `app/layout-tokens.css` :: `:root` — 간격 원본; new
  - `app/globals.css` :: 스타일 import — 원본 한 번 연결; modify
  - `app/admin-utilities.css` :: `@source` — Tailwind layout 경로 포함; modify
  - `lib/ui/dadam-theme.ts` :: `dadamUi` — 기존 속성값을 CSS 변수 참조로 변경; modify
  - `app/admin-theme.css`, `components/providers/FluentUiProvider.tsx`, `components/providers/DadamThemeScope.tsx` — 기존 색상/서체/포털 범위 참고; read-only

#### Details

- **Signatures & Types**: `dadamUi`의 기존 export/속성명/`as const`를 유지한다. `cardPadding`은 `"var(--layout-card-inset)"`, `sectionGap`은 `"var(--layout-section-gap)"` 문자열로 변경한다. 새 TS 숫자 설정 객체를 만들지 않는다.
- **Data & Schema Fields**: 업무 DTO 추가 없음. CSS 계약은 아래와 같으며 모든 변수는 non-null이다.

| CSS 변수 | 기본값 | 소유 역할 |
| --- | --- | --- |
| `--layout-page-inset` | `12px` | AppShell 일반 본문 네 면 |
| `--layout-section-gap` | `12px` | 페이지/영역/폼 그룹 간격 |
| `--layout-card-inset` | `12px` | 일반 카드 안쪽 |
| `--layout-control-gap` | `8px` | 버튼/필터 묶음 |
| `--layout-inline-gap` | `4px` | 아이콘/짧은 메타 정보 |
| `--layout-table-cell-inset` | `var(--layout-card-inset)` | 일반 관리자 표 셀 |
| `--layout-empty-min-height` | `160px` | 일반 빈/조회 상태의 의도된 최소 높이 |
| `--layout-canvas-tools-inset` | `var(--layout-page-inset)` | 제작 표면 안의 도구/안내 래퍼 |
| `--layout-overlay-safe-inset` | `16px` | ModalFrame 화면 가장자리 안전 간격 |
| `--layout-dialog-inline-inset` | `18px` | 모달 헤더/본문/푸터 좌우 |
| `--layout-dialog-block-inset` | `16px` | 모달 상단·본문 하단 |
| `--layout-dialog-header-gap` | `10px` | 모달 제목/닫기 버튼 사이 |
| `--layout-popover-inset` | `16px` | 코멘트 팝업 본문 좌우·확인 영역 |
| `--layout-popover-compact-inset` | `var(--layout-card-inset)` | 코멘트 미리보기 |
| `--layout-comment-footer-end-inset` | `20px` | 기존 코멘트 작성 푸터 오른쪽·하단 |
| `--layout-profile-header-padding` | `16px 14px 12px 16px` | 기존 프로필 팝업 헤더 |
| `--layout-profile-header-gap` | `11px` | 프로필 팝업 헤더 아이템 |

- 이후 T04에서 실제 프로필 팝업 body/tabs의 기존 값을 별도 역할로 연결한다. 페이지 12px와 팝업 16/18px를 한 변수로 합치지 않는다.
- **Execution Flow / Logic**:
  1. 기존 `globals.css` import들과 CSS layer 순서를 유지하고 새 파일을 한 번 import한다. 변수는 `:root`에만 정의한다. `.workspace` 아래에만 두면 Fluent 포털에서 사라진다.
  2. `admin-utilities.css`의 기존 `source(none)`, `tw` prefix, 기존 경로를 유지하고 `@source "../components/layout"`를 추가한다.
  3. 레이아웃 Tailwind 예: `tw:gap-(--layout-section-gap)`, `tw:p-(--layout-card-inset)`. 동적으로 문자열을 조립해 클래스 이름을 생성하지 않는다.
  4. 외부 응답/예외/영속 상태 없음. 미정의 변수를 임의의 페이지별 숫자로 보완하지 않는다. 새 변수의 실제 사용은 T02~T04에서 완료한다.

### I02. 페이지·헤더와 모바일 메뉴 전달

- Related Files:
  - `components/layout/WorkspaceNavigation.tsx` :: `WorkspaceNavigationProvider`, `useWorkspaceNavigation` — UI 전용 context; new
  - `components/layout/WorkspaceHeader.tsx` :: `WorkspaceHeader` — 공통 제목/메뉴/액션/안내; new
  - `components/layout/WorkspacePage.tsx` :: `WorkspacePage` — 간격과 sticky 높이 소유; new
  - `components/layout/AppShell.tsx` :: `SIDEBAR_ID`, `menuOpen`, `closeMenu` — 다음 Task에서 연결할 기존 계약; read-only

#### Details

- **Signatures & Types** (기본 export는 각 파일명과 동일, context의 Provider/hook은 named export):

```typescript
interface WorkspaceNavigationValue {
  sidebarId: string;
  triggerId: string;
  menuOpen: boolean;
  toggleMenu(): void;
}
interface WorkspaceNavigationProviderProps {
  value: WorkspaceNavigationValue;
  children: React.ReactNode;
}
function WorkspaceNavigationProvider(props: WorkspaceNavigationProviderProps): React.ReactElement;
function useWorkspaceNavigation(): WorkspaceNavigationValue | null;

interface WorkspacePageProps {
  title: string;
  description?: string;
  dataNotice?: string | null;
  dataNoticeSummary?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  headingId?: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  stickyHeader?: boolean;
  className?: string;
  children: React.ReactNode;
}
interface WorkspaceHeaderProps extends Pick<WorkspacePageProps,
  "title" | "description" | "dataNotice" | "dataNoticeSummary" |
  "leading" | "actions" | "headingId" | "headingRef"> {
  headerRef?: React.Ref<HTMLElement>;
  sticky?: boolean;
}
function WorkspacePage(props: WorkspacePageProps): React.ReactElement;
function WorkspaceHeader(props: WorkspaceHeaderProps): React.ReactElement;
```

- **Data & Schema Fields**:
  - context 기본값 `null`. Provider 없는 단독 렌더에서는 메뉴 버튼만 생략하며 예외를 던지지 않는다. title/children 외 페이지 속성은 optional, sticky 기본 false, dataNotice 기본 없음이다.
  - 헤더 로컬 `helpOpen:boolean=false`. `useId()`로 안내 panel ID를 만들고 `headingId` 미지정 시에도 고유 ID를 제공한다. DOM ID를 업무 자산 ID로 만들지 않는다.
  - `--layout-sticky-header-height`는 페이지 DOM에만 두는 **실측 px 값**이다. 사용자 설정·DB 모델이 아니며 CSS root의 고정 간격 토큰과 구분한다.
- **Execution Flow / Logic**:
  1. `WorkspacePage`는 `<div data-workspace-page>`에 flex column/min-width:0/gap section을 적용한다. 패딩/max-width/main 태그를 추가하지 않는다. 첫 자식이 공통 헤더다.
  2. `WorkspaceHeader`는 `<header data-workspace-header>`; 제목과 leading/menu/짧은 notice/actions/help 버튼을 flex-wrap 한 영역에 배치한다. h1 하나, margin0, 16px/24px/700. actions도 wrap하고 min-width:0으로 긴 제목/버튼을 수용한다. 제목·버튼을 잘라서 한 줄로 강제하지 않는다.
  3. 메뉴 버튼은 context가 있을 때만 렌더한다. `id=triggerId`, `aria-controls=sidebarId`, `aria-expanded=menuOpen`, `type=button`, 열린 상태에 따라 ‘메뉴 닫기’/‘메뉴 열기’. 40px 조작 크기를 유지하고 미디어 쿼리 760px 이하에서만 표시한다. Tailwind 기본 md=768 경계로 바꾸지 않는다. 아이콘/버튼에 필요한 기존 DadamThemeScope만 좁게 재사용하고 본문 테마는 감싸지 않는다.
  4. `description` 또는 전체 notice가 summary와 다른 경우 ‘화면 안내’ 버튼을 표시한다. `aria-expanded`, `aria-controls` 제공, 클릭/기본 키보드 동작으로 panel을 조건부 렌더한다. 없는 안내로 빈 버튼을 만들지 않는다. 접힘 기본 false, 텍스트는 React 문자열로 렌더한다.
  5. dataNotice가 없거나 null/빈 문자열이면 안내 배지 없음. summary가 있으면 짧은 summary를 항상 표시하고 전체 notice는 안내 panel에서 읽을 수 있다. summary가 없으면 전체 notice 자체를 항상 표시한다. 문자열 내용을 분석해 mock/임시 저장 의미를 추측하지 않는다.
  6. headingRef를 h1에 전달하고 제공된 경우 `tabIndex=-1`로 프로그램 포커스를 지원한다. actions의 Button/form/onClick 속성을 clone하거나 재작성하지 않는다. 헤더를 새 form으로 감싸지 않는다.
  7. sticky=true일 때 헤더 top0/z-index10, 불투명한 기존 페이지 배경을 유지한다. Page는 headerRef와 rootRef로 최초 높이를 측정하고 ResizeObserver에서 높이가 바뀌면 root.style의 `--layout-sticky-header-height`를 갱신한다. 단순 help/menu 토글로 children을 key 변경/재마운트하지 않는다.
  8. ResizeObserver가 없는 환경은 초기 측정+window resize listener로 갱신한다. unmount 시 observer/listener 정리. sticky=false면 측정하지 않고 local 변수 제거. getBoundingClientRect의 유한한 nonnegative 높이만 저장한다. SSR에서 window/DOM 접근을 실행하지 않는다.

### I03. 공통 카드와 툴바

- Related Files:
  - `components/layout/WorkspaceCard.tsx` :: `WorkspaceCard`, `WorkspaceCardSection` — 일반/표 카드; new
  - `components/layout/WorkspaceToolbar.tsx` :: `WorkspaceToolbar` — 필터/액션 묶음; new
  - `components/admin/ui/AdminPrimitives.tsx` :: `AdminCard` — 시각 속성 참고, 어댑터 연결은 T03; read-only

#### Details

```typescript
interface WorkspaceCardProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyPadding?: "inset" | "flush";
}
interface WorkspaceCardSectionProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  afterHeader?: boolean;
}
interface WorkspaceToolbarProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  align?: "center" | "end";
}
function WorkspaceCard(props: WorkspaceCardProps): React.ReactElement;
function WorkspaceCardSection(props: WorkspaceCardSectionProps): React.ReactElement;
function WorkspaceToolbar(props: WorkspaceToolbarProps): React.ReactElement;
```

- 전체 Container에서 Pick으로 부분 props를 정의한다. DTO/nullable 데이터 없음; bodyPadding=inset, afterHeader=false, align=end가 기본값이다.
- Card: section aria-label=title, 기존 AdminCard의 border/radius/background 색상 token 재사용. section 자체 패딩0. title/actions가 있으면 h2와 액션이 있는 header를 만들고 padding=card-inset, flex-wrap/gap=control.
- inset body: flex column/gap section, padding=card-inset. header가 있으면 body의 padding-top만 0으로 해 header 하단 패딩과 중복하지 않는다. header가 없으면 네 면 모두 padding 적용.
- flush body: padding0, flex column/gap0. 표는 여기에 직접 놓는다. 필터/상태/페이지 이동은 `WorkspaceCardSection`으로 감싼다. Section은 p=card-inset/gap=section, `afterHeader=true`이면 첫 영역의 padding-top만0이다. header 다음 **첫 Section에만** 사용하고 표 뒤 pager에는 사용하지 않는다.
- overflow-hidden을 카드 전체에 걸어 메뉴/포커스 링을 자르지 않는다. 표의 가로 스크롤은 기존 AdminTable이 소유한다.
- Toolbar: flex-wrap, align end/center, gap control, margin/padding 없음. 부모가 영역 간격을 관리한다. children의 권한 조건/disabled/이벤트를 그대로 전달한다.
- 네 개 구성요소는 새로운 업무 상태나 원격 요청을 만들지 않는다. DOM 이동 후 아이템 key/폼 소속 유지가 후속 Task의 책임이다.

### I04. 새 상호작용 경계 검사

- Related Files:
  - `tests/components/layout/workspace-primitives.test.ts` — 공통 계약; new
  - `tests/components/dadam-theme-scope.test.ts`, `vitest.config.ts` — 테스트 방식; read-only

#### Details

- 새 파일 첫 줄 `// @vitest-environment jsdom`. 기존 React `createElement`, `createRoot`, `act`, Vitest 사용. `.test.ts`만 수집하므로 테스트용 JSX/.tsx나 Testing Library를 추가하지 않는다.
- 안내 없음/펼침/접힘의 버튼과 panel, aria 참조가 정확하고 주된 children/입력값이 유지되는지 검사한다.
- Provider 없는 헤더에 메뉴가 없고, Provider가 있으면 지정 ID/expanded/toggle 호출이 연결되는지 검사한다. CSS 미디어 픽셀 계산을 jsdom 결과로 주장하지 않는다.
- actions의 외부 form submit 연결 및 h1 ref 포커스가 유지되는지 검사한다. 카드 제목 h2/section 이름과 toolbar 안 버튼 이벤트가 유지되는지 검사한다.
- ResizeObserver stub으로 헤더 높이 변경 알림과 unmount 정리를 검사한다. 임의의 관측값(예: 51→89)을 전달하여 고정 오프셋으로 굳지 않았음을 확인하되 12/8/4 값의 CSS 복사 테스트는 만들지 않는다.

## Acceptance Criteria

- [x] 위 CSS 계약이 한 파일에 있고 globals에서 한 번 불러온다. layout Tailwind 경로가 탐색된다.
- [x] 기존 dadamUi 소비자는 API 변경 없이 같은 기본 12px를 참조한다.
- [x] 페이지/헤더/카드/툴바/context API가 독립적으로 사용 가능하고 업무 데이터와 분리된다.
- [x] 안내 접근성·외부 form·헤더 높이 변화·context 부재/존재 동작 검사가 통과한다.
- [x] AppShell과 기존 페이지를 아직 전환하지 않아 중간 상태에서도 기존 메뉴가 사라지지 않는다.

## Validation

- `npm.cmd test -- tests/components/layout/workspace-primitives.test.ts tests/components/dadam-theme-scope.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build` — CSS import/Tailwind compile/SSR 경계까지 확인한다.
- `git diff --check`
- 브라우저 검증은 [지속 정책](../../../decisions/2026-10-30-task-validation-policy.md)에 따라 제외. build 성공을 화면 육안 검증으로 표현하지 않는다.

## Commit Message

```text
refactor(layout): 공통 간격과 페이지 컴포넌트 기반 추가

Plan: 2026-11-02-workspace-spacing-system
Phase: P01-shared-workspace-layout
Task: T01-spacing-foundation

- CSS 간격 원본과 기존 dadamUi 참조 연결
- 공통 헤더·페이지·카드와 모바일 메뉴 context 제공
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: batch (Plan 헤더로 git log 조회)
- 다음 Task: `T02-unified-shell-header.md`. 통과 후 이 파일 Status/Phase 표/current를 갱신한다.

## 실행 기록

- 2026-11-02: 지정 단위/jsdom 2개 파일 5개 테스트, typecheck, lint, build, diff 검사 통과.
- Vite 설정 형식/오래된 baseline-browser-mapping 경고는 기존 도구 경고로 별도 기록. 의존성 변경 없음.
