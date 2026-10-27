# Task: T03 Fluent UI 사이드바·셸·헤더 통합

## Status: done

## Goal

HTML의 최종 사이드바를 Fluent UI로 재현하고 15개 메뉴를 선행 Task의 안내 화면에 연결한다. 펼침/접힘·모바일·키보드·현재 메뉴 표시가 동작하고, 하단 프로필을 눌러도 모달은 열리지 않아야 한다.

## Decision Summary

- T01에서 Fluent/Griffel 공급자를 `(authenticated)` 레이아웃에 추가했고, T02에서 `config/sidebar.ts`와 `/workspace/[screen]` 서버 페이지를 완성했다. 인증 비활성은 15개 모두 미리보기, 활성 User는 7개, 활성 Admin은 15개다.
- 수정하는 UI의 구조·동작·스타일은 같은 TSX에서 `makeStyles`·`useStyles`로 관리한다. Next.js Link는 URL 이동, Fluent 컴포넌트는 조작·표시·아이콘을 담당한다. 프로필 모달과 실제 업무 기능은 제외한다.

## Implementation

### I01. 최종 메뉴 데이터 소비와 화면 구성

- Related Files:
  - `components/layout/NavSidebar.tsx` :: `NavSidebar`, `NavSidebarProps`, `useStyles`, 아이콘 매핑 — 사이드바 UI 교체; modify
  - `config/sidebar.ts` :: `sidebarGroups`, `getVisibleSidebarGroups`, `getSidebarItemByPathname` — 단일 메뉴 원본; read-only
  - `components/providers.tsx` :: `useAuthRuntime` — authEnabled/session 조회; read-only
  - `lib/auth/roles.ts` :: `hasRole`, `APP_ROLES` — 프로필 배지 판정; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface NavSidebarProps {
    id: string;
    isOpen: boolean;
    isCollapsed: boolean;
    onNavigate(): void;
    onCollapseToggle(): void;
    onClose(): void;
  }

  export default function NavSidebar(
    props: NavSidebarProps,
  ): React.ReactElement;

  const useStyles = makeStyles({ /* 같은 TSX의 스타일 객체 */ });
  ```

  선행 `config/sidebar.ts`의 계약:

  ```typescript
  interface SidebarNavigationItem {
    id: SidebarScreen;
    label: string;
    href: `/workspace/${SidebarScreen}`;
    icon: SidebarIcon;
    requiredRole?: AppRole;
  }
  interface SidebarNavigationGroup {
    id: "proposal" | "project" | "admin";
    items: readonly SidebarNavigationItem[];
  }
  interface SidebarNavigationContext {
    authEnabled: boolean;
    authenticated: boolean;
    roles?: readonly string[];
  }
  function getVisibleSidebarGroups(context: SidebarNavigationContext): SidebarNavigationGroup[];
  function getSidebarItemByPathname(pathname: string): SidebarNavigationItem | undefined;
  ```

- **Data & Schema Fields**:
  - 세션 입력: `session.user.name?: string | null`, `email?: string | null`, `roles: AppRole[]`. 부서 필드는 없다. 타입 확장·Graph 조회를 하지 않는다.
  - UI 입력 상태: `isOpen`은 모바일 overlay, `isCollapsed`는 데스크톱 축소 상태다. 서로 다른 boolean이다.
  - 최종 메뉴 계약(임의 추가·누락 금지):

    | group | id: label → href |
    | :--- | :--- |
    | proposal | register: RFP 등록 → `/workspace/register` |
    | proposal | pipeline: 검토 목록 → `/workspace/pipeline` |
    | project | analysis: AI 분석 → `/workspace/analysis` |
    | project | files: 파일 업로드 → `/workspace/files` |
    | project | toc: 목차 → `/workspace/toc` |
    | project | setup: 제작 설정 → `/workspace/setup` |
    | project | write: 제작 → `/workspace/write` |
    | admin | prompt-sets: 프롬프트 세트 → `/workspace/prompt-sets` |
    | admin | skills: Skill → `/workspace/skills` |
    | admin | templates: Template → `/workspace/templates` |
    | admin | policy: 운영 정책 → `/workspace/policy` |
    | admin | tokens: 토큰·비용 관리 → `/workspace/tokens` |
    | admin | users: 사용자 설정 → `/workspace/users` |
    | admin | dashboard: 대시보드 → `/workspace/dashboard` |
    | admin | audit: 활동 로그 → `/workspace/audit` |

  - `icon` 키 → `@fluentui/react-icons` 컴포넌트:

    | icon | 컴포넌트 |
    | :--- | :--- |
    | document-add | DocumentAddRegular |
    | clipboard | ClipboardBulletListLtrRegular |
    | analysis | SearchRegular |
    | upload | ArrowUploadRegular |
    | list | TextBulletListLtrRegular |
    | settings | SettingsRegular |
    | edit | EditRegular |
    | prompts | SparkleRegular |
    | skills | AppsRegular |
    | template | SlideLayoutRegular |
    | policy | ShieldRegular |
    | tokens | MoneyRegular |
    | users | PeopleRegular |
    | dashboard | DataBarVerticalRegular |
    | history | HistoryRegular |

  아이콘 매핑은 `Record<SidebarIcon, ...>`로 전체 키를 보장하되 컴포넌트에 `any`를 쓰지 않는다. 라이브러리의 실제 export/type에 맞는 React 컴포넌트 타입을 사용한다. 좌우 토글은 `ChevronLeftRegular` / `ChevronRightRegular`, 프로필 화살표는 `ChevronUpRegular`, 로그아웃은 `SignOutRegular`로 표현할 수 있다.

- **Execution Flow / Logic**:
  1. `useAuthRuntime()`의 `authEnabled`, `session`으로 context `{ authEnabled, authenticated: session !== null, roles: session?.user.roles }`를 만든다. `getVisibleSidebarGroups`의 결과만 렌더링한다.
  2. 상단 제목은 일반 텍스트 `KPC | 제안서 AI`로 표시한다. 기존 브랜드의 홈 이동 기능은 Next.js Link `href="/"`로 유지할 수 있다. 전체 앱 환경변수·npm 패키지명·캐시 네임스페이스는 바꾸지 않는다.
  3. 상단 접기 버튼은 Fluent `Button`의 `appearance="subtle"`을 사용한다. 펼친 상태는 `왼쪽 메뉴 접기`, 접힌 상태는 `왼쪽 메뉴 펼치기` 접근성 이름을 주고 `aria-expanded={!isCollapsed}` 및 연결된 nav의 고유 id를 사용한다.
  4. 메뉴는 실제 Next.js `Link`로 만들고 `href`는 카탈로그 값을 그대로 사용한다. Fluent Button 안에 Link를 중첩하거나 Link 안에 button을 넣지 않는다. 각 Link에는 메뉴명 접근성 이름을 제공한다.
  5. `usePathname()`과 정확한 href 비교로 활성 항목을 정하고 해당 Link에만 `aria-current="page"`를 준다. CSS 클래스는 `mergeClasses(styles.link, active && styles.active)`로 결합한다.
  6. 각 group은 의미 있는 접근성 이름을 가질 수 있으나 화면에 `제안 관리`·`관리자` 같은 제목을 표시하지 않는다. 보이는 그룹 사이에만 Fluent `Divider`를 넣는다.
  7. 접힌 상태에서는 15개 동일 항목의 아이콘을 보여주고 Fluent `Tooltip`으로 메뉴명을 우측에 표시한다. 키보드 focus에서도 이름을 확인할 수 있어야 한다. 확장/축소용 메뉴 목록을 별도로 복제하지 않는다.
  8. 메뉴 선택 시 `onNavigate()`로 모바일 overlay를 닫는다. URL과 중앙 화면은 Next.js 라우터가 바꾸고 데스크톱 접힘 상태는 유지한다.
  9. 소스의 프로젝트 잠금·업무 수·권한 전환·원본 DOM 변조 이벤트를 복사하지 않는다. 안내 화면으로 연결되는 메뉴를 프로젝트 부재 때문에 비활성화하지 않는다.

### I02. 원본 스타일을 Fluent 객체 스타일로 재현

- Related Files:
  - `components/layout/NavSidebar.tsx` :: `useStyles`, JSX 클래스 — 스타일 통합; modify
  - `components/providers/FluentUiProvider.tsx` :: 작업 영역 theme — T01 공급자; read-only

#### Details

- `makeStyles`, `mergeClasses`, `tokens`, `Button`, `Avatar`, `Badge`, `Divider`, `Tooltip`은 `@fluentui/react-components`에서 가져온다. 각 TSX에서 `const useStyles = makeStyles({ ... })`를 모듈 범위에 정의하고 컴포넌트 안에서 호출한다. 동적 boolean을 `makeStyles` 인자로 넘기지 않는다.
- 긴 CSS 문자열과 `<style>{componentStyles}</style>`은 이 파일에서 제거한다. `.module.css`는 만들지 않는다. 전역 reset과 reduced-motion은 `app/globals.css`에 유지한다.
- 다음은 원본 최종 결과를 판독한 시각 기준이다. 원본의 수천 개 computed style·고정 1000px 높이·좌표를 그대로 붙여 넣지 않는다.

  | 부분 | 구현 기준 |
  | :--- | :--- |
  | aside | 고정 좌측, 높이 `100svh`, flex column, 기본 220px, 접힘 54px, 배경 `#fafafa`, 오른쪽 1px `#e6e7eb` |
  | 상단 | 높이 58px, 경계 `#e9eaef`, 제목 13px/850, 좌우 17px, 색 `#18191e`, 토글 34×36px |
  | 메뉴 영역 | `flex: 1`, `minHeight: 0`, `overflowY: auto`, 펼침 좌우 11px, 상단 약 7px |
  | 펼친 메뉴 | 높이 약 34.5px, padding 9px, 아래 간격 2px, radius 9px, 11px/650, 색 `#626670` |
  | 선택 메뉴 | 배경 `#fff0f2`, 글자 `#cc1930`, weight 800, `inset 3px 0 0 #dc2036`; hover에도 선택색 유지 |
  | 비선택 hover | 중립 밝은 회색, 선택 메뉴와 혼동하지 않는 강조 |
  | 구분선 | `#e6e8ec`, 상하 8px/좌우 6px |
  | 접힌 메뉴 | 38×38px, radius 9px, 항목 간 4px, 일반 아이콘 `#777d89`, 선택 `#c8253b`/`#fff0f2` |
  | 프로필 영역 | 하단 예약 영역, 카드 높이 49px, 배경 흰색, 1px `#e3e5e9`, radius 10px, padding 7px 9px, gap 8px |
  | 프로필 아바타 | Fluent Avatar 28px, 일반은 짙은 회색, 관리자·개발 미리보기는 빨강; 장식 점 10px |
  | 프로필 문자 | 이름 12px/700, 배지 9px, 소속 10px; 긴 이름은 ellipsis |
  | 접힌 프로필 | 카드 폭 48px, 아바타만 표시; 장식 화살표·이름 줄은 숨김 |

- Fluent 토큰으로 의미가 같은 색·간격을 재사용하되 원본 선택 상태와 치수는 해당 `useStyles`에서 명시한다. 원본 빨간 선택 상태를 Fluent 기본 파란 상태로 대체하지 않는다.
- 펼친 상태의 메뉴는 원본처럼 텍스트 중심으로 보이고 아이콘은 접힌 상태에서 보인다. 레이아웃 전환 때문에 Link의 접근성 이름을 잃지 않게 한다.
- 메뉴 영역만 스크롤되고 프로필·접기 버튼은 접근 가능하게 남긴다. 높이가 낮을 때 15개 메뉴의 하단이 프로필 뒤로 가려지면 안 된다.

### I03. 하단 프로필 표시만 구현

- Related Files:
  - `components/layout/NavSidebar.tsx` :: 프로필 JSX·표시명 계산 — 모달 없는 표시 영역; modify
  - `app/auth/logout/page.tsx` :: 기존 로그아웃 route; read-only

#### Details

- 실제 세션: `name.trim()` → `email` → `사용자` 순서로 표시명을 정한다. Admin 역할이면 `관리자`, 아니면 `일반`. 부서 정보는 스키마에 없으므로 소속은 `KPC`로 표시한다.
- 인증 비활성: 표시용 샘플 `정소담` / `미리보기` / `AI사업본부`. 이 값을 session이나 roles에 쓰지 않는다.
- 이름 첫 글자와 원본의 원형 아바타·배지·장식 점·화살표를 표시한다. `Avatar`와 `Badge`를 실제 사용한다. 장식 아이콘과 점은 `aria-hidden` 처리한다.
- 프로필 카드는 `<div role="group" aria-label="사용자 프로필">`처럼 비대화형으로 구성한다. Button·MenuTrigger·DialogTrigger·`aria-haspopup`·열림 상태를 추가하지 않는다. 클릭·Enter로 모달/팝오버가 열리지 않는다.
- `authEnabled && session`인 경우 기존 `/auth/logout` 링크를 프로필 옆 또는 아래에 작은 조작으로 유지한다. 접힌 상태에도 접근성 이름 `로그아웃`을 가진 링크와 아이콘으로 접근 가능하게 한다. 개발 샘플에는 로그아웃·로그인 버튼을 표시하지 않는다.

### I04. 셸의 접힘 상태와 모바일 동작

- Related Files:
  - `components/layout/AppShell.tsx` :: `AppShell`, `useStyles` — 상태 소유·너비·모바일 overlay; modify
  - `components/layout/AppHeader.tsx` :: `AppHeader`, `AppHeaderProps`, `useStyles` — 모바일 메뉴·현재 화면명; modify

#### Details

- **Signatures & Types**:

  ```typescript
  interface AppShellProps { children: React.ReactNode }
  export default function AppShell(props: AppShellProps): React.ReactElement;

  interface AppHeaderProps {
    sidebarId: string;
    isMenuOpen: boolean;
    onMenuToggle(): void;
  }
  export default function AppHeader(props: AppHeaderProps): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - `menuOpen: boolean`, 기본값 `false` — 모바일 sidebar 열기.
  - `sidebarCollapsed: boolean`, 기본값 `false` — 데스크톱 54px 축소.
  - `SIDEBAR_ID = "workspace-sidebar"` 유지. 메뉴 nav id는 여기서 파생해 문서 내 중복을 피한다.
  - localStorage·쿠키·서버 상태·부서/프로젝트 상태는 추가하지 않는다.

- **Execution Flow / Logic**:
  1. AppShell이 두 상태를 소유하고 새 NavSidebarProps에 값을 전달한다. 토글은 각각 자기 상태만 변경한다.
  2. AppShell·AppHeader의 기존 문자열 CSS를 각 파일의 `makeStyles`로 변환한다. `mergeClasses`로 root variant를 적용한다.
  3. 셸 root에 기본 CSS 사용자 정의 속성 `--nav-sidebar-width: 220px`를 두고, 축소 variant의 데스크톱 `@media (min-width: 761px)`에서 `54px`로 바꾼다. aside 너비와 main-column margin-left가 같은 값을 소비하게 한다. `any` 타입 우회는 쓰지 않는다.
  4. `max-width: 760px`에서는 기존 overlay 패턴을 유지한다. main margin-left는 0, overlay sidebar는 220px이며 desktop의 축소 여부와 무관하게 텍스트 메뉴를 표시한다. 모바일에서만 바탕을 덮는 backdrop, 헤더 메뉴 버튼, 메뉴 선택 시 닫기를 제공한다.
  5. 메뉴 텍스트·아이콘·프로필 문자의 숨김은 CSS media 규칙과 variant로 처리한다. desktop 축소를 그대로 모바일에 적용해 텍스트가 사라지는 회귀를 피한다. DOM에 같은 nav를 두 개 렌더링하지 않는다.
  6. backdrop 클릭 및 모바일 Escape 키로 닫을 수 있게 한다. overlay가 열릴 때 첫 메뉴/닫기 조작으로 focus를 옮기고, 닫을 때 열기 버튼으로 focus를 돌린다. 메뉴 Link를 클릭해 이동했다면 새 콘텐츠로 focus가 자연스럽게 이동하도록 하며 닫힌 sidebar 내부에 focus를 남기지 않는다. 동적 keydown listener는 cleanup한다.
  7. 기존 skip link, `main#main-content`, footer와 홈 내용을 유지한다. 사이드바 변경을 이유로 중앙 내용을 다시 목업 전체로 만들지 않는다.
  8. AppHeader는 `getSidebarItemByPathname(usePathname())?.label`을 우선 사용한다. `/`은 `홈`, 기존 `/admin` 및 하위 경로는 `관리자`, 다른 경로는 `워크스페이스`로 fallback한다. 우측 상단 로그인 버튼을 추가하지 않는다.

### I05. 중복 메뉴 설정 정리와 사용자 문서

- Related Files:
  - `config/app.ts` :: `AppConfig`, `appConfig` — 앱 이름·설명만 유지; modify
  - `tests/config/app.test.ts` :: `appConfig` 검증 — 메타데이터 검증만 남김; modify
  - `tests/config/sidebar.test.ts` :: 신규 노출 정책 테스트 — T02의 정책 원본; read-only
  - `README.md` :: 프로젝트 구조·UI 미리보기·메뉴 수정법 — 현재 기능 설명; modify
  - `next.config.ts` :: `experimental.optimizePackageImports` — Fluent 컴포넌트·아이콘 barrel 탐색 최적화; modify

#### Details

- NavSidebar·AppHeader를 신규 카탈로그로 옮긴 다음 기존 `HeaderNavigationItem`, `headerNavigation`, `profileNavigation`, `getVisibleNavigation` 소비자가 없는지 검색하고 제거한다. 옛 홈/관리자 배열을 새 메뉴의 두 번째 원본으로 남기지 않는다.
- `AppConfig`는 `name: string`, `description: string`만 남긴다. `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_DESCRIPTION`의 기본값·의미, npm 패키지명·캐시 네임스페이스는 유지한다.
- 기존 app 테스트의 1개 홈·프로필 관리자 메뉴 고정 assertion과 옛 filter 테스트는 제거하고 메타데이터 기본값 검증을 유지한다. 신규 노출 정책의 전체 미리보기·User/Admin 차이는 T02의 `tests/config/sidebar.test.ts`가 검증한다. 실제 `/admin` 가드 테스트는 삭제하지 않는다.
- README에 Fluent v9 공급자 위치, UI와 스타일이 같은 TSX에 있다는 정책, `config/sidebar.ts` 메뉴 원본, `/workspace/[screen]` 안내 페이지, 로컬 15개 미리보기와 활성 인가 차이, 프로필 모달·업무 기능 제외 범위를 설명한다.
- 기존 `/admin`은 auth 비활성 404라는 설명을 보존한다. 신규 관리자 **안내** 화면 미리보기와 기존 관리자 예시를 혼동하지 않도록 쓴다.
- 실행 중 개발 서버의 Fluent barrel 전체 탐색 지연을 확인하여 `experimental.optimizePackageImports`에 `@fluentui/react-components`, `@fluentui/react-icons`를 추가한다. Next.js 16.0.10 설정 타입과 [공식 지침](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)을 확인한 적용이며, 별도 변환 플러그인·버전 업그레이드는 하지 않는다. 변경 후 개발 HTTP와 프로덕션 빌드를 다시 확인한다.

## Acceptance Criteria

- [ ] 최종 7+8개 메뉴, 두 구분선, 상단 제목과 하단 프로필이 원본 최종 UI에 맞는다.
- [ ] 펼침 220px/접힘 54px에서 중앙 콘텐츠 위치가 함께 바뀌고 선택 상태·툴팁·접근성 이름이 유지된다.
- [x] 메뉴 15개의 URL·안내 문구·선택 상태·헤더명 연결을 HTTP로 확인했다. 클라이언트 이동 후 접힘 유지는 구현했으며 실제 조작 검증은 아래 제한에 따른다.
- [x] 인증 활성 User의 메뉴 노출과 관리자 안내 URL의 서버 가드를 단위 테스트로 검증했다.
- [ ] 모바일 메뉴·뒤로/앞으로·직접 진입·새로고침·작은 화면 높이·키보드 조작이 동작한다.
- [x] 프로필을 비대화형 표시 영역으로 구성하고 실제 세션의 기존 로그아웃을 유지했다. 모달 이벤트·트리거가 없음을 코드·SSR HTML로 확인했다.
- [x] 수정한 3개 layout TSX가 Fluent 객체 스타일을 쓰고 CSS module·중복 메뉴 설정이 없다.
- [x] 기존 인증·Azure 테스트와 전체 품질 게이트, 홈·로그인·기존 `/admin` HTTP 검증을 통과했다.

## Validation

- `npm.cmd run test` — 신규 메뉴/서버 화면 및 기존 인증·Azure 테스트 전체 통과.
- `npm.cmd run typecheck` — Fluent 스타일·아이콘·props 타입 검증 통과.
- `npm.cmd run lint` — 오류 없음.
- PowerShell: `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; npm.cmd run build` — 자격 증명 없이 프로덕션 빌드 성공.
- `rg -n 'componentStyles|<style>|module\.css' components/layout` — 결과 없음. `rg -n 'headerNavigation|profileNavigation|getVisibleNavigation|HeaderNavigationItem' config components tests` — 옛 설정 소비자 없음.
- 프로덕션 검증 서버: `npm.cmd run start -- --port 3100`을 별도 프로세스로 실행하고 다음 HTTP 상태를 확인한다. 종료 후 검증 서버를 정리한다.

  ```powershell
  $sidebarScreens = 'register','pipeline','analysis','files','toc','setup','write','prompt-sets','skills','templates','policy','tokens','users','dashboard','audit'
  foreach ($sidebarScreen in $sidebarScreens) {
    $sidebarResponse = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3100/workspace/$sidebarScreen"
    if ($sidebarResponse.StatusCode -ne 200) { throw "안내 화면 실패: $sidebarScreen" }
  }
  ```

- `/workspace/missing`은 404, 기존 `/admin`은 인증 비활성에서 404, `/`와 `/auth/login`은 기존 화면인지 확인한다.
- 실제 브라우저에서 너비 1440px(펼침/접힘), 390px(모바일), 높이 600px(메뉴 스크롤)을 확인한다. 원본 HTML은 읽기 전용으로 비교한다. 프로필 클릭·Enter로 팝업이 생기지 않는지, 접힌 아이콘의 hover/focus 툴팁, 키보드 메뉴 이동과 overlay Escape/닫기 focus를 확인한다.
- 메뉴 전환 → 뒤로 → 앞으로 → 새로고침에서 URL/헤더/본문/활성 메뉴를 확인한다. Fluent 스타일이 최초 SSR·클라이언트 이동 모두 유지되고 hydration 오류가 없는지 확인한다.
- 초기 HTML의 Griffel 재수화 스타일 표식이 `<head>`에만 있는지, 메뉴 전환 뒤 `<body>`에 이전 전체 스타일이 반복 남지 않는지 확인한다.
- Azure 실계정 인증은 자격 증명이 없으므로 단위 테스트로 분기 검증한다. 이 제한을 기록하며 실제 로그인을 성공했다고 보고하지 않는다. UI 검증을 수행할 수 없는 환경이면 미검증 항목을 분명히 기록하고 모든 시각 확인을 완료했다고 표시하지 않는다.

## Commit Message

```text
feat(layout): Fluent UI로 KPC 사이드바와 화면 이동 구현

Plan: 2026-10-27-kpc-sidebar-ui
Phase: P01-sidebar-navigation
Task: T03-sidebar-ui

- 최종 메뉴와 프로필 표시를 접기 가능한 사이드바로 구현
- 모바일과 헤더를 연결하고 메뉴 이동 및 권한 회귀 검증
```

## Progress

- [x] 구현 완료
- [x] 자동 검증 통과
- [ ] 실제 브라우저에서 시각·클라이언트 조작 확인 — Computer Use 자동 검토 제한으로 미실시
- commit: 본 Task 완료 커밋에 포함 (`feat(layout): Fluent UI로 KPC 사이드바와 화면 이동 구현`)

## Execution Result

- 2026-10-27: Fluent `makeStyles` 방식의 사이드바·셸·헤더 구현. 메뉴 15개, 220/54px 너비, 모바일 열림/닫힘·focus 처리, 프로필 표시 및 로그인 상태의 로그아웃 링크 포함.
- 테스트 202개/22개 파일, TypeScript, ESLint, 인증 비활성 프로덕션 빌드 통과.
- 최종 프로덕션 HTTP에서 15개 안내 URL 모두 200, 메뉴 순서·활성 Link·안내 문구 확인. `/workspace/missing`, 중첩 미등록 URL 및 기존 `/admin`은 404, 홈·Microsoft 로그인은 200.
- 모든 안내 URL에서 SSR Griffel 스타일이 head에 있고 body에는 없는 것을 확인. 220/54px variant와 선택 색·inset 선이 SSR CSS에 포함됨을 확인했다.
- Fluent import 최적화 설정 후 개발 서버 `/workspace/register` HTTP 200과 새 사이드바 존재 확인. 별도 테스트 서버는 종료했다.
- 동반 처리: Fluent 컴포넌트·아이콘의 큰 barrel을 필요한 모듈 중심으로 처리하도록 Next 설정을 추가했다. 별도 패키지·Next/React 버전 변경은 없다. 모바일 닫기의 focus 복귀를 위해 `onClose()` callback을 분리했다.
- 요청 밖 미처리 결함: 새로 발견한 사항 없음.

## Validation Limitations

Windows Computer Use의 자동 검토가 Chrome의 현재 URL을 정책 적용에 필요한 신뢰도로 확인하지 못해 UI 자동화를 중단했다. 이후 브라우저 조작이나 다른 UI 자동화 경로로 재시도하지 않았다.

따라서 실제 렌더링 모양 비교, 1440px/390px/높이 600px에서의 시각 확인, 버튼·툴팁·모바일 focus와 Escape·프로필 클릭, 뒤로/앞으로·새로고침을 포함한 클라이언트 조작 검증은 **미실시**다. 위 Acceptance Criteria의 시각·조작 항목을 확인 완료로 표시하지 않는다. 서버·정적 CSS 검증 결과만으로 이 항목들이 검증됐다고 주장하지 않는다.

실제 Entra ID 로그인도 자격 증명이 없어 수행하지 않았다. 관련 분기는 기존·신규 단위 테스트로 검증했다. 구현과 자동 품질 게이트는 완료했고 남은 항목은 환경이 허용할 때의 수동 화면 확인이다.
