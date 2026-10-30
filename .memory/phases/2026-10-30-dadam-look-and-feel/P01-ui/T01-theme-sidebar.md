# Task: T01 공통 테마 범위와 사이드바 상태 디자인

## Status: done

## Goal

KPC 일반 본문 테마를 유지하면서 사이드바와 탐색 버튼에 기본형 dadam 테마를 적용한다. 펼침·접힘·모바일의 기존 치수와 시작점을 보존하고 활성 메뉴까지 파란색 상태 디자인으로 완성한다.

## Decision Summary

- Plan: 2026-10-30-dadam-look-and-feel / Phase: P01-ui. 기본형 dadam, 활성 상태 포함, 파란 강조색, 대상 화면에만 순차 적용. 이 Task 다음은 T02 프로필, T03 토큰, 마지막 T04 코멘트다.
- 기존 미커밋 NavSidebar 보정을 이어받는다. 브라우저/E2E/스크린샷·육안 확인·검증용 dev server는 모두 제외한다. 인증·권한·상태 Provider·전체 body 서체는 바꾸지 않는다.

## Implementation

### I01. 공통 스타일 계약

- Related Files:
  - `lib/ui/dadam-theme.ts` :: `DADAM_FONT_FAMILY`, `dadamTheme`, `dadamUi` — 후속 Task 공통 계약; new
  - `app/globals.css` :: `:root`의 폰트 변수 — 새 공통 별칭과 기존 별칭 연결만; modify
  - `components/providers/FluentUiProvider.tsx` :: `workspaceTheme`, 렌더러/SSR 처리 — 외부 테마 보존; read-only
  - `public/fonts/spoqa-han-sans-neo/*` — 기존 400/500/700 및 LICENSE; read-only

#### Details

**Signatures & Types**

```typescript
import type { Theme } from "@fluentui/react-components";
export const DADAM_FONT_FAMILY: string;
export const dadamTheme: Theme;
export const dadamUi: Readonly<{
  bodySize: string; bodyLineHeight: string;
  metaSize: string; metaLineHeight: string;
  titleSize: string; titleLineHeight: string;
  controlRadius: string; cardRadius: string; surfaceRadius: string;
  controlHeight: string; smallControlHeight: string;
  cardPadding: string; sectionGap: string;
  popoverShadow: string; dialogShadow: string;
  pinShadow: string; pinSelectedRing: string; focusRing: string;
}>;
```

**Data & Schema Fields**

- 전부 불변 스타일 값이며 nullable/DB/API 필드가 아니다. `dadamTheme`는 **전체** `webLightTheme`를 spread한 뒤 `fontFamilyBase`, `fontFamilyNumeric`를 `DADAM_FONT_FAMILY`, `fontWeightSemibold`를 500으로 지정한다. 나머지는 원본 값. 기본형의 400/700과 실제 보유 폰트 500을 사용하며 600/800 등을 합성하지 않는다.
- `DADAM_FONT_FAMILY = "var(--dadam-font-family)"`. `globals.css`의 `:root`에 `--dadam-font-family: "Spoqa Han Sans Neo", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", sans-serif` 추가, 기존 `--sidebar-font-family` 값은 `var(--dadam-font-family)`로 연결한다. 기존 @font-face, body/root font-family, color/background/focus/reduced-motion 규칙은 보존한다.

| dadamUi 필드 | 값 / 의미 |
| --- | --- |
| bodySize / bodyLineHeight | tokens.fontSizeBase300 / tokens.lineHeightBase300 = 14px / 20px |
| metaSize / metaLineHeight | tokens.fontSizeBase200 / tokens.lineHeightBase200 = 12px / 16px |
| titleSize / titleLineHeight | tokens.fontSizeBase400(16px) / `"24px"` |
| controlRadius / cardRadius / surfaceRadius | tokens.borderRadiusMedium(4px) / tokens.borderRadiusLarge(6px) / `"8px"` |
| controlHeight / smallControlHeight | `"32px"` / `"28px"` |
| cardPadding / sectionGap | `"12px"` / `"12px"` |
| popoverShadow / dialogShadow | tokens.shadow8 / tokens.shadow16 |
| pinShadow | `"0 2px 6px rgba(15,108,189,.35)"` |
| pinSelectedRing | `"0 0 0 4px rgba(15,108,189,.18)"` |
| focusRing | `2px solid ${tokens.colorBrandStroke1}` |

- 폰트 굵기는 각 컴포넌트에서 400/500/700만 사용한다. 색상은 중복 팔레트를 만들지 않고 `tokens.*`를 쓴다.
- 브랜드: Background/Foreground1/Stroke1 #0f6cbd, hover #115ea3, pressed #0c3b5e, Foreground2 #115ea3, Background2 #ebf3fc, Background2Hover #cfe4fa.
- 중립: Background1 #fff, 2 #fafafa, 2Hover #f0f0f0, 3 #f5f5f5; Foreground1 #242424, 2 #424242, 3 #616161; Stroke1 #d1d1d1, Stroke2/Subtle #e0e0e0.
- 의미색은 `colorStatusDanger*`, `colorStatusWarning*`, `colorStatusSuccess*`; 비활성은 `colorNeutralBackgroundDisabled`, `colorNeutralForegroundDisabled`, `colorNeutralStrokeDisabled`. 색상이 빨갛다고 모두 브랜드로 바꾸지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: 기존 `@fluentui/react-components` 9.74.11 및 로컬 폰트를 사용한다. 새로운 의존성·폰트 다운로드는 없다.
2. Core Processing: 위 export만 있는 공통 모듈을 만들고 CSS 변수 별칭을 연결한다. 전체 Theme를 제공해야 외부 Provider의 빨간색 재정의가 섞이지 않는다.
3. Error & Exception Handling: 폰트 로딩 실패는 기존 CSS fallback으로 처리한다. 스타일 모듈에 브라우저 전역·세션·스토리지 접근을 넣지 않는다.
4. State Transition & Return: 순수 상수 export만 제공하며 비즈니스 상태 변화는 없다.

### I02. 포털까지 전달되는 선택적 테마 범위

- Related Files:
  - `components/providers/DadamThemeScope.tsx` :: `DadamThemeScope` — 테마 경계; new
  - `components/layout/AppShell.tsx` :: 반환 JSX, `useStyles.menuButton/skipLink/backdrop` — 탐색 UI만 감싸기; modify
  - `node_modules/@fluentui/react-provider/lib-commonjs/components/FluentProvider/useFluentProviderContextValues.cjs` :: `themeClassName` — 확인한 포털 동작; read-only

#### Details

**Signatures & Types**

```typescript
export interface DadamThemeScopeProps { children: React.ReactNode }
export default function DadamThemeScope(props: DadamThemeScopeProps): React.ReactElement;
interface AppShellProps { children: React.ReactNode }
export default function AppShell(props: AppShellProps): React.ReactElement;
```

**Data & Schema Fields**

- `DadamThemeScope`는 client component. `FluentProvider theme={dadamTheme} applyStylesToPortals`를 반환하고 root에 `data-dadam-theme="basic"`을 둔다.
- Provider **inline style**에만 `display: "contents"`를 둔다. `className`의 makeStyles root는 배경 transparent, colorNeutralForeground1, fontFamilyBase, bodySize/bodyLineHeight, weight 400. width/height/minHeight/position/overflow/transform/contain/display는 클래스에 넣지 않는다.
- 확인 근거: 설치된 FluentProvider는 applyStylesToPortals=true일 때 **root.className 전체**를 포털에 전달한다. display:contents를 클래스에 넣으면 Dialog/Toast의 포털 레이아웃까지 오염될 수 있다. inline style은 전달 대상이 아니다.
- RendererProvider·createDOMRenderer·useServerInsertedHTML은 기존 전역 Provider가 소유한다. 새 scope에서 재생성하지 않는다. 인증·프로필·코멘트 Context도 감싸거나 새로 생성하지 않는다.
- AppShell `SIDEBAR_ID="workspace-sidebar"`, mainColumn의 직접 `<main id="main-content">`, inert 적용 위치를 그대로 보존한다.

**Execution Flow / Logic**

1. Precondition & Validation: 루트의 `--nav-sidebar-width`는 200px, desktop collapsed는 64px, main margin은 해당 변수, mobile 760px 이하는 0이다.
2. Core Processing: 첫 번째 scope는 기존 skipLink + 조건부 backdrop + NavSidebar를 함께 감싼다. 두 번째 scope는 mainColumn 안의 독립 모바일 메뉴 Button만 감싼다. main과 본문 footer는 두 scope 밖에 둔다. scope의 display:contents 덕분에 기존 레이아웃 box를 추가하지 않는다.
3. Error & Exception Handling: 포털 색상/폰트가 누락되어도 전역 테마나 body를 바꾸는 방식으로 해결하지 않는다. scope 클래스의 fontFamily와 applyStylesToPortals를 확인한다. 모바일 토글의 ID·aria-controls·onClick·suspendUi·포커스 복귀를 보존한다.
4. State Transition & Return: menuOpen/sidebarCollapsed, 경로 변경, document keydown, body overflow, main inert는 그대로다. 탐색 버튼은 controlRadius, 중립 표면/글자/Stroke2, brand 포커스를 적용한다. skipLink는 BrandBackground/ForegroundOnBrand. backdrop은 기존 투명도와 z-index를 유지한다.

### I03. 사이드바 일반·활성·접힘 스타일

- Related Files:
  - `components/layout/NavSidebar.tsx` :: `useStyles`, `NavSidebar`, 링크/Tooltip — 상태 스타일; modify
  - `config/sidebar.ts` :: `getVisibleSidebarGroups` — 권한 필터 유지; read-only
  - `components/profile/ProfileMenu.tsx` — 다음 T02에서 상세 변경; read-only

#### Details

**Signatures & Types**

```typescript
interface NavSidebarProps {
  id: string; isOpen: boolean; isCollapsed: boolean;
  onNavigate(): void; onCollapseToggle(): void; onClose(): void;
}
export default function NavSidebar(props: NavSidebarProps): React.ReactElement;
```

**Data & Schema Fields**

| 영역/상태 | 정확한 계약 |
| --- | --- |
| root | fixed top/bottom/left0, zIndex30, flex column, 100dvh, border-box, paddingTop16, width var(--nav-sidebar-width,200px), Background2, StrokeSubtle 오른쪽1px, Foreground1 |
| mobile | max-width760: width280px/maxWidth calc(100vw - 32px), 기존 transform/visibility/180ms 유지 |
| header | 펼침 padding8px12px16px22px/minHeight52; 접힘 min-width761에서 height/minHeight28px,padding0 8px,center,gap0 |
| navigation/group | marginTop12, padding0 12px 8px, group padding0 6px/gap4; 접힘 nav0 8px 8px/group0; 기존 flex1/minHeight0/스크롤 유지 |
| link | minHeight40, height auto, padding10px12px, gap10, icon20, body14/20/400, controlRadius4, Foreground2, borderLeft3px solid transparent, border-box |
| hover | Background2Hover/Foreground1; disabled 메뉴 추가 없음 |
| active | Background3, BrandForeground1, weight700, borderLeftColor BrandStroke1, inset0 0 0 1px BrandStroke1; hover에서도 같은 활성색 |
| collapsed link | min-width761 규칙 안에서 padding10px0, borderLeftWidth0, center, gap0, 동일40px 행 |
| collapsed active | `& [data-sidebar-link][aria-current="page"]`: padding10px, borderLeftWidth0, Background3/BrandForeground1, inset1px, transform scale(1.06), 중심 기준; hover 동일 |
| focus | link outline dadamUi.focusRing, offset -2px; 기존 전역 focus가 두께/색을 덮지 않게 class 규칙 명시; forced-colors는 Highlight 사용 |
| brand/toggle | brand16/24/500, 기존 문자열·ellipsis 유지, Foreground1; toggle/close28px, Foreground2, Fluent subtle 상태 유지 |
| divider/footer | 기존 margin10px6px·접힘10px0, 선 Stroke2. footer12px/접힘12px8px, 상단 StrokeSubtle |

- `webLightTheme` 직접 import/고정 divider 색은 이제 scope의 `tokens.colorNeutralStroke2`로 대체한다. 과거 collapsed aria-current #c8253b override를 반드시 제거한다.
- 펼침 링크 좌측3px 공간은 항상 예약하므로 선택 때 텍스트가 밀리지 않는다. borderLeft는 가로만 추가되어 40px 세로 규격에 영향을 주지 않는다.
- `isCollapsed=true`인 모바일에서도 모든 축약 스타일은 min-width761 안에서만 적용한다. 별도 activeCollapsed 클래스를 조건부로 모바일까지 적용하지 않는다.
- `active = pathname === item.href`, aria-current, 권한 필터, isCollapsed Tooltip, profile key를 바꾸지 않는다. 새로운 역할·메뉴·state·storage 없음.

**Execution Flow / Logic**

1. Precondition & Validation: 작업트리의 접힘 헤더 28px·글자색·divider 보정을 기준으로 작업한다. HEAD로 되돌리지 않는다.
2. Core Processing: 위 표대로 기존 style slot을 수정한다. 모든 메뉴에 transparent border 공간을 먼저 적용한 후 활성 색만 변경한다. 실제 글자는 label의 fontWeight inherit로 700을 받는다.
3. Error & Exception Handling: 긴 이름은 기존 minWidth0/ellipsis, 긴 메뉴는 nav 스크롤. 포커스·팝오버가 잘리도록 root overflow hidden이나 transform을 추가하지 않는다.
4. State Transition & Return: 열기/접기/이동은 이전과 동일. 소스 산술 기준 첫 접힘 메뉴 top=16+28+12=56px, 아이콘 top66px, 같은 그룹 중심 간격44px. 실제 브라우저 측정이라고 보고하지 않는다.

### I04. 테마 격리와 탐색 회귀 검증

- Related Files:
  - `tests/components/dadam-theme-scope.test.ts` :: 테마 경계/포털 통합 — new
  - `tests/lib/comments/shell-ui.test.ts` :: 실제 AppShell/프로필 모달 포커스 — existing, 필요한 기대 조건만 modify
  - `tests/config/sidebar.test.ts` — existing, read-only

#### Details

- 새 테스트는 `// @vitest-environment jsdom`, React `act/createElement`, `createRoot`, Vitest를 사용한다. 현재 include는 `tests/**/*.test.ts`이므로 .tsx 확장자를 만들지 않는다. 테스트 라이브러리 설치 없음.
- 외부 FluentProvider에 `{...webLightTheme,colorBrandBackground:"#d7192f"}`를 주고 일반 sibling Probe, scope 안 Probe, scope 안 실제 Fluent `Portal`의 Probe를 렌더링한다. 공개 `useThemeClassName`으로 받은 클래스 집합을 DOM에 기록한다. scope와 그 portal이 동일 테마 클래스를 공유하고 외부 sibling은 별도 클래스인지를 확인한다.
- Context 값 비교에만 그치지 않고 portal Probe의 실제 DOM 상위 mount가 scope root의 테마·서체 클래스 집합을 포함하는지도 확인한다. 포털 대상이 scope root 바깥에 존재하는 조건에서 검사해 단순 DOM 상속으로 우연히 통과하지 않게 한다.
- 외부 테마 객체와 webLightTheme가 변조되지 않는지, Provider root의 inline display=contents가 portal mount에 복제되지 않는지 검증한다. CSS 값을 반복 snapshot하는 테스트나 jsdom의 CSS var 색 해석에 의존하지 않는다.
- AppShell 통합에서는 `.mainColumn > #main-content` 구조와 본문이 data-dadam-theme 아래에 있지 않음을 확인한다. 모바일 메뉴 열기→댓글 UI suspend→body 잠금→Escape→trigger 포커스, 토큰 모달 Escape 복귀는 기존 테스트를 유지한다.
- 타이머·matchMedia·ResizeObserver는 기존 shell-ui의 stub 패턴을 이용하고 unmount·restoreAllMocks·unstubAllGlobals로 정리한다. 렌더링 스크린샷은 만들지 않는다.

## Acceptance Criteria

- [x] scope 밖 일반 본문과 전역 테마가 유지되고 사이드바·모바일 열기 버튼·포털에만 dadam 테마가 적용된다.
- [x] 활성 메뉴는 파란색/중립 배경/700/좌측선+inset, 접힘 활성은 inset+1.06으로 구분된다. 접힘 red override 없음.
- [x] 200/64/280, 760/761 경계, 접힘 top56, 행40/gap4, 메뉴·권한·포커스 동작이 보존된다.
- [x] 로컬 폰트와 기존 렌더러를 재사용하고 공통 모듈 export가 아래 Task들의 계약과 일치한다.
- [x] 기존 미커밋 보정을 보존하고 아래 검증이 통과한다. 브라우저 검증을 요구하지 않는다.

## Validation

- `npm.cmd run test -- tests/components/dadam-theme-scope.test.ts tests/config/sidebar.test.ts tests/lib/comments/shell-ui.test.ts` — 테마 경계/탐색/포커스 통과.
- `npm.cmd run typecheck` — 전체 타입 오류 없음.
- `npx.cmd eslint lib/ui/dadam-theme.ts components/providers/DadamThemeScope.tsx components/layout/AppShell.tsx components/layout/NavSidebar.tsx tests/components/dadam-theme-scope.test.ts tests/lib/comments/shell-ui.test.ts` — 오류 없음.
- `npm.cmd run build` — 기존 SSR/테마 처리 포함 프로덕션 빌드 통과.
- `git diff --check` 및 변경 diff 검토 — 코드 정렬, 범위 밖 테마/기능 보존, mobile media 우선순위 확인.
- 브라우저/E2E/스크린샷·육안 확인·dev server 검증은 미실시로 기록. 기존 이전 테스트 수치를 새 실행 결과로 재사용하지 않는다.

## Commit Message

```text
feat(sidebar): dadam 공통 테마와 사이드바 상태 디자인 적용

Plan: 2026-10-30-dadam-look-and-feel
Phase: P01-ui
Task: T01-theme-sidebar

- 포털까지 전달되는 범위별 dadam 테마와 공통 스타일 정의
- 기존 규격과 접힘 보정을 유지하며 활성 메뉴와 탐색 버튼 정비
```

- 구현/테스트 파일과 새 Plan/decision/Task/phase/current/history만 명시 stage한다. 기존 NavSidebar 미커밋 보정은 같은 파일의 출발점으로 포함한다. 이전 핀 코멘트/사이드바 계획의 미커밋 문서를 무관하게 포함하지 않는다.
- 완료 후 이 Task done, phase done1/4, current T02-profile-controls로 전진한다. 한국어 커밋 하나를 만들고 실제 검증 결과·해시를 기록한다.

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `git log -1 --format=%h --grep='Task: T01-theme-sidebar'`

## Execution Result (2026-10-30)

- 공통 테마/폰트 별칭과 portal 스타일 전달을 구현하고 일반 본문 범위를 보존했다. sidebar 활성/접힘 스타일과 기존 미커밋 보정을 함께 반영했다.
- sidebar/shell 기존 17개 및 테마 경계 1개 테스트 통과(총 18개). 전체 typecheck, 대상 ESLint, Next 프로덕션 build, diff check 통과. 테스트 포털 검증은 실제 CSS 클래스 전파를 확인하며 Griffel 병합용 식별 클래스는 비교 대상에서 제외한다.
- 브라우저 검증 미실시. 범위 밖 기능 결함은 발견하지 않았다.
