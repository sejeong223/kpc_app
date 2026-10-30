# Task: T01 dadam 사이드바 크기·정렬·서체 적용

## Status: done

## Goal

KPC 사이드바를 dadam의 200px 펼침/64px 접힘/280px 모바일 크기와 14px Spoqa 메뉴로 구성한다. 헤더·본문 offset·아이콘·텍스트·구분선·하단 프로필까지 하나의 배치로 맞추어 글자 확대와 너비 축소가 서로 충돌하지 않게 한다.

## Decision Summary

- Plan: 2026-10-30-dadam-sidebar-layout-typography / Phase: P01-sidebar. dadam의 공통 치수와 서체를 따르며 KPC의 메뉴·브랜드 문자열·760px 반응형 경계·인증·프로필 기능을 유지한다. 활성 메뉴 전용 디자인은 수정하지 않는다.
- 2026-10-30 사용자 지시에 따라 모든 Task에서 브라우저 검증을 제외한다. 이 Task는 기존 자동 테스트·typecheck·lint·build·코드 검토로 완료하며 브라우저 확인, E2E, 스크린샷, dev server 실행을 요구하지 않는다.

## Implementation

### I01. 로컬 폰트 자산과 적용 범위

- Related Files:
  - `app/globals.css` :: `@font-face`, `:root --sidebar-font-family` — 폰트 등록과 변수만 추가; modify
  - `public/fonts/spoqa-han-sans-neo/SpoqaHanSansNeo-Regular.woff2` — 400 원본; new
  - `public/fonts/spoqa-han-sans-neo/SpoqaHanSansNeo-Medium.woff2` — 500 원본; new
  - `public/fonts/spoqa-han-sans-neo/SpoqaHanSansNeo-Bold.woff2` — 700 원본; new
  - `public/fonts/spoqa-han-sans-neo/LICENSE` — 공식 저작권/라이선스 원문; new
  - `C:/Users/김세정/Documents/GitHub/dadam_app/dadam_app/app/_styles/fonts.ts` 및 `fonts/*.woff2` — 원본 경로·weight; read-only
  - `components/providers/FluentUiProvider.tsx` :: `workspaceTheme`, `FluentUiProvider` — 전역 테마 보존; read-only
  - `proxy.ts`, `lib/auth/proxy-policy.ts` :: `matcher`, `shouldApplyAuthentication` — 기존 동일 출처 자산 요청의 인증 조건 확인; read-only

#### Details

**Signatures & Types**

CSS font family 식별자는 `"Spoqa Han Sans Neo"`다. 별도 함수·새 Provider·패키지·next/font 모듈은 만들지 않는다. `@font-face` 등록은 전역 CSS에서 하고 실제 요소의 스타일은 기존 TSX `makeStyles`에 둔다.

**Data & Schema Fields**

| face | font-weight | font-style | font-display | src URL | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| Regular | 400 | normal | swap | /fonts/spoqa-han-sans-neo/SpoqaHanSansNeo-Regular.woff2 | 4249BAFC6673772EDD9F3ED64589496FFBBD084A81DD85D6E170058FAD86D117 |
| Medium | 500 | normal | swap | /fonts/spoqa-han-sans-neo/SpoqaHanSansNeo-Medium.woff2 | 7F98C688A6A270CCBC2B1DBF96BD89F40174C4B859EDD8AA6D3C885D8346AD12 |
| Bold | 700 | normal | swap | /fonts/spoqa-han-sans-neo/SpoqaHanSansNeo-Bold.woff2 | C85FAA3FA812CAE9FAD6EADC662B0E68C84F010B61C5C0EBC769A7B43E0FCD4D |

- 각 src는 `url(...) format("woff2")`. 원본 파일 바이트를 그대로 복사한다. 총 544,268 bytes. 100/300 weight와 woff/ttf는 사용하지 않으므로 추가하지 않는다.
- `:root`에 `--sidebar-font-family: "Spoqa Han Sans Neo", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", sans-serif`만 추가한다. 기존 root `font-family`, `font-synthesis: none`, 색상 및 리셋은 유지한다.
- 공식 라이선스 확인 위치: https://github.com/spoqa/spoqa-han-sans/blob/main/LICENSE ; 원문 다운로드: https://raw.githubusercontent.com/spoqa/spoqa-han-sans/main/LICENSE . 원문의 저작권 문구와 OFL을 폰트와 함께 보관한다.
- DB/DTO/세션 필드 변경은 없다. CSS 변수는 비어 있지 않은 font-family 목록이며 nullable 상태가 아니다.

**Execution Flow / Logic**

1. Precondition & Validation: 위 원본 세 파일의 존재·해시를 확인한다. 다른 저장소의 파일은 읽기/복사만 한다. 원본이 달라졌다면 무작정 다른 서체로 대체하지 않고 차이를 기록한다.
2. Core Processing: 해당 세 파일·LICENSE를 KPC public 경로에 두고 세 개의 font-face와 변수를 등록한다. 런타임 CDN 호출이나 외부 절대 파일 경로를 CSS에 넣지 않는다.
3. Error & Exception Handling: 폰트 다운로드 실패 시 CSS의 fallback 목록을 사용한다. 현재 proxy는 `/fonts/`에도 기존 인증을 적용한다. 사이드바는 인증 레이아웃 안에서만 서체를 사용하고 자산은 같은 출처로 요청하므로 현재 세션을 그대로 사용한다. 인증 비활성 미리보기는 기존 설정대로 접근한다. 폰트 등록을 위해 인증·CSP·네트워크 정책을 넓히지 않는다. 자산/라이선스 확보 실패는 해당 검증 실패로 기록한다.
4. State Transition & Return: 아래 I03의 브랜드·메뉴와 I04의 프로필 트리거만 `fontFamily: "var(--sidebar-font-family)"`를 사용한다. `<aside>`, body, FluentProvider 전체에는 적용하지 않는다. `ProfileMenu`는 inline popover이므로 aside 전체 상속을 바꾸면 범위 밖 팝오버 내부도 바뀐다.

### I02. 셸 너비와 사이드바 영역 분할

- Related Files:
  - `components/layout/AppShell.tsx` :: `useStyles.root`, `useStyles.collapsed`, `useStyles.mainColumn` — 폭과 본문 offset; modify
  - `components/layout/NavSidebar.tsx` :: `NavSidebarProps`, `NavSidebar`, `useStyles.root/open/collapsed/header/navigation/group/divider/footer` — 배치; modify
  - `components/comments/CommentsWorkspace.tsx` :: `boundsOf`, measurement effect — 상대좌표/ResizeObserver 유지 확인; read-only

#### Details

**Signatures & Types**

```typescript
interface AppShellProps { children: React.ReactNode }
function AppShell(props: AppShellProps): React.ReactElement;
interface NavSidebarProps {
  id: string;
  isOpen: boolean;
  isCollapsed: boolean;
  onNavigate(): void;
  onCollapseToggle(): void;
  onClose(): void;
}
function NavSidebar(props: NavSidebarProps): React.ReactElement;
```

기존 default export와 props 계약을 유지한다. 새 state·storage·API는 추가하지 않는다.

**Data & Schema Fields**

- `menuOpen:boolean=false`, `sidebarCollapsed:boolean=false`는 기존 AppShell state 그대로다. `SIDEBAR_ID="workspace-sidebar"`, trigger ID `workspace-sidebar-trigger` 유지.
- `--nav-sidebar-width`: root `"200px"`, `@media (min-width: 761px)` collapsed `"64px"`. `mainColumn.marginLeft="var(--nav-sidebar-width)"`, max-width760에서 0 유지.
- NavSidebar root fallback도 `var(--nav-sidebar-width, 200px)`로 갱신한다. 모바일 width는 `280px`, maxWidth는 `calc(100vw - 32px)`로 한다.
- 고정 aside의 `position:fixed`, top/bottom/left0, zIndex30, flex column, 기존 배경/오른쪽 border를 유지한다. height는 `100dvh`, boxSizing border-box, paddingTop16px로 명시한다. 좌우 root padding은 0으로 두고 각 영역이 다음 inset을 갖게 한다.

| 영역 | 펼침·모바일 | 접힘(761px 이상만) |
| --- | --- | --- |
| header | padding `8px 12px 16px 22px`, flex/center/space-between, gap4px, height auto, minHeight52px, flexShrink0, 기존 borderBottom 제거 | padding `8px 8px 16px`, justifyContent center, gap0 |
| navigation | marginTop12px, padding `0 12px 8px`, flex1, minHeight0, overflowY auto, overflowX hidden | padding `0 8px 8px`, marginTop12px 유지 |
| group | flex column, rowGap4px, padding `0 6px`, alignItems stretch | padding0, alignItems stretch, rowGap4px |
| divider | margin `10px 6px`, paddingRight0, width auto, minHeight1px, 기존 색 유지 | margin `10px 0`, paddingRight0 |
| footer | flex column, alignItems stretch, width100%, flexShrink0, padding12px, rowGap0, borderTop `1px solid tokens.colorNeutralStroke2` | padding `12px 8px`, alignItems stretch |

dadam은 root padding과 절대 footer/하단112px 예약을 사용한다. KPC는 같은 좌우 inset을 각 영역에 배분하고 기존 flex footer를 유지한다. 15개 메뉴와 높이가 달라질 수 있는 프로필을 지원하기 위해 절대 footer/112px spacer를 복사하지 않는다. root 전체에 overflow hidden을 추가하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: AppShell의 기존 matchMedia `(max-width: 760px)`와 두 파일의 CSS 경계가 일치하는지 확인한다. dadam의 1024px 또는 md 조건을 이식하지 않는다.
2. Core Processing: CSS 변수와 aside fallback을 함께 갱신하고 위 영역별 레이아웃을 적용한다. 기존 collapsed의 header padding10px, nav padding8px0, link 38px 정사각형, group paddingRight, divider6px override를 새 값으로 교체한다. 원래의 더 구체적인 중첩 선택자가 새 기본값을 덮지 않게 한다.
3. Error & Exception Handling: 좁거나 낮은 가용 영역에서도 nav의 flex1/minHeight0/scroll을 남긴다. 프로필 팝오버가 잘리는 root overflow나 nav 안으로 footer를 옮기는 변경을 하지 않는다.
4. State Transition & Return: onCollapseToggle·onNavigate·onClose와 경로 변경 포커스·body 잠금·inert·Escape/Tab·controller.suspendUi는 그대로다. 모바일에서는 이전 데스크톱 collapsed=true여도 글자와 프로필 라벨이 보이도록 접힘 규칙을 min-width761 안에만 둔다. width 애니메이션이나 저장소 영속화를 새로 추가하지 않는다.

### I03. 헤더·메뉴 타이포그래피와 정렬

- Related Files:
  - `components/layout/NavSidebar.tsx` :: `useStyles.brand/toggle/mobileClose/link/active/icon`, 신규 `label`, JSX 브랜드·메뉴 span — modify
  - `config/sidebar.ts` :: `SidebarNavigationItem`, `SidebarNavigationGroup`, `getVisibleSidebarGroups` — 데이터·권한 보존; read-only
  - `C:/Users/김세정/Documents/GitHub/dadam_app/dadam_app/app/_components/layout/NavSidebar.tsx` :: `item`, `nav`, `NavItem` — 비교 자료; read-only

#### Details

**Signatures & Types**

```typescript
function CollapseIcon(props: { size?: number }): React.ReactElement;
function ExpandIcon(props: { size?: number }): React.ReactElement;
// 기존 함수 모두 default size=18, SVG 경로 유지.
```

`SidebarNavigationItem`은 기존 `id:SidebarScreen`, `label:string`, `href:/workspace/${SidebarScreen}`, `icon:SidebarIcon`, `requiredRole?:AppRole` 그대로다. group은 proposal/project/admin, 일반7개·관리자15개 및 previewRole 분기를 변경하지 않는다.

**Data & Schema Fields**

| 스타일 | 목표 |
| --- | --- |
| brand | 기존 `KPC \| 제안서 AI`, href `/`; family var, size16px, lineHeight24px, weight500, letterSpacing0.04em, minWidth0, whiteSpace nowrap, overflow hidden, textOverflow ellipsis, 기존 색 유지 |
| toggle/mobileClose | width/minWidth/height28px, padding0, flexShrink0, 아이콘18px; desktop toggle·mobile close 표시 조건 유지 |
| link | flex/alignItems center, width100%, minWidth0, minHeight40px, height auto, padding10px12px, columnGap10px, flexShrink0; family var, size14px, lineHeight20px, weight400, letterSpacing0, textAlign left, whiteSpace nowrap |
| icon | display block, width/height20px, flexShrink0; 펼침·접힘·모바일 모두 표시 |
| label(새 스타일) | flex1, minWidth0, overflow hidden, textOverflow ellipsis, whiteSpace nowrap, fontSize/lineHeight/fontWeight/fontFamily inherit |
| collapsed link | justifyContent center, width100%, minHeight40px, height auto, padding10px0, columnGap0; 기존 접힘 색 유지 |

- link의 기존 radius9px, 일반 색, hover, focus-visible outline을 유지한다. 원본 dadam의 활성용 투명3px border·활성 테두리·scale을 추가하지 않는다. 따라서 원본과 text 시작점에 3px 차이가 있을 수 있으며 KPC 목표는 펼침 기준 아이콘 x30px/텍스트 x60px다(외곽12+group6+link12, icon20+gap10).
- header는 원본의 짧은 DADAM/이미지 대신 긴 KPC 문구이므로 24px fallback을 16px로 조정한다. 기존 문구 전체를 `title`로 제공하며 링크의 접근성 이름을 잘린 문자열로 바꾸지 않는다.
- menu label span에 새 label 스타일을 붙이되 기존 `data-sidebar-label`을 유지한다. 데이터에 없는 새 그룹 제목은 만들지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: 기존 루프의 pathname===item.href, aria-current, aria-label, Tooltip 분기를 유지한다. 새 폰트로 활성 상태 전용 굵기를 덮지 않도록 label의 굵기는 inherit만 쓴다.
2. Core Processing: brand·link에만 font-family 변수를 적용하고 모든 아이콘의 20px 칸을 드러낸다. label이 남은 폭을 사용하며 긴 텍스트는 한 줄 말줄임한다. 일반 메뉴 굵기를650에서400으로 바꾸고 34.5px 고정 높이를 제거한다.
3. Error & Exception Handling: 긴 문자열에도 아이콘·접기·닫기 버튼은 줄어들지 않는다. 접힘에서는 기존 `data-sidebar-label` CSS만 숨기고 Tooltip·link aria-label은 유지한다. 원본의 `brandCollapsed`에는 padding 값이5개인 유효하지 않은 shorthand가 있으므로 복사하지 않는다.
4. State Transition & Return: `styles.active`의 background tokens.colorBrandBackground2, color tokens.colorBrandForeground1, fontWeight800, boxShadow `inset 3px 0 0 #dc2036`, hover 및 접힘 `[aria-current="page"]`의 `#c8253b`를 그대로 둔다. 공통 size/family/행간·배치 변화만 활성 행에도 적용된다. 800용 폰트를 따로 생성하거나 활성용 glyph weight를 재디자인하지 않는다.

### I04. 하단 프로필 트리거의 폭·글자 정렬

- Related Files:
  - `components/profile/ProfileMenu.tsx` :: `useStyles.trigger/collapsed/avatar/name/accountLine/badge/department`, 필요 시 trigger의 명시적 font-family — modify
  - `components/profile/ProfileMenu.tsx` :: `surface`, Popover/TabList/내부 panels 및 handlers — read-only
  - `components/profile/ProfilePreviewProvider.tsx` :: 상태·역할·토큰 모달 포커스 — read-only

#### Details

**Signatures & Types**

```typescript
export interface ProfileMenuProps {
  isCollapsed: boolean;
  onNavigate(): void;
}
function ProfileMenu(props: ProfileMenuProps): React.ReactElement;
```

**Data & Schema Fields**

- profile.name/role/department/organization, state.selectedTab, unread, session의 스키마·기본값·nullable 처리 모두 기존 값 유지. 새 프로필 필드를 만들지 않는다.
- trigger: width100%, minWidth0, maxWidth100%, minHeight49px, height auto, padding7px9px, gap8px, border-box. 기존 고정181.141px 세 속성을 모두 제거한다. 기존 배경·border·radius·hover는 유지한다.
- footer가 padding12px이므로 펼침 카드 폭은 오른쪽 border를 제외하면 약175px, 모바일 약255px이다. 접힘 footer padding8px에서는 약47px이며 특정48px 값을 강제하지 않는다.
- collapsed: min-width761에서 width100%/minWidth0/maxWidth100%, justifyContent center, padding7px0, columnGap0, 기존 trigger label 숨김. 아이콘 카드 최소높이49px 유지.
- trigger와 trigger 전용 avatar/badge에 fontFamily var. name12px/16px/400, department11px/14px/400, badge10px/12px/500·height16px·padding0 4px. name은 maxWidth100%/minWidth0/기존ellipsis, department도 nowrap/overflow hidden/ellipsis 추가. avatar28px와 dot·chevron14px 유지.
- account flex1/minWidth0/column/rowGap3px 유지. accountLine은 flexWrap wrap, columnGap6px, rowGap2px로 하여 긴 이름과 역할 배지가 카드 밖으로 밀리지 않게 한다. 카드 height auto가 추가 줄을 수용한다.

**Execution Flow / Logic**

1. Precondition & Validation: `Popover inline`과 surface.fontFamily inherit를 확인한다. root/aside에 폰트를 적용하지 않았으므로 surface는 이전 앱 폰트를 상속한다.
2. Core Processing: 표시용 trigger에만 위 크기·서체·정렬을 적용한다. footer는 nav와 분리된 flex item이므로 카드 높이가 바뀌면 nav가 남은 높이를 사용한다.
3. Error & Exception Handling: 이름·소속이 길어져도 버튼 폭을 넘지 않는다. 관리자/일반 사용자 badge 길이가 다르므로 accountLine wrap으로 처리한다. source dadam의 단순 로그아웃 footer로 기능을 치환하지 않는다.
4. State Transition & Return: ProfileMenu key(`${pathname}:${isOpen}:${isCollapsed}`), open 상태, aria-haspopup/controls, data-sidebar-profile, onNavigate, Esc, token dialog 전달·포커스 흐름 그대로다. popover surface·내부 탭·headerName·avatarFace(공유 스타일)·토큰 모달은 수정하지 않는다.

### I05. 정적·자동 검증과 결과 기록

- Related Files:
  - `tests/config/sidebar.test.ts` — 메뉴/권한; read-only
  - `tests/lib/profile-preview.test.ts`, `tests/lib/token-preview.test.ts` — 기존 상태; read-only
  - `tests/lib/comments/shell-ui.test.ts`, `geometry.test.ts`, `workspace-ui.test.ts` — 셸/포커스/상대좌표; read-only
  - 현재 Task/상위 phase/current — 실행 결과·진행률; modify during execution

#### Details

- 자동 테스트는 기존 의미 있는 행위 검증을 재사용한다. CSS 선언이나 예상 픽셀값을 다시 작성하는 테스트·신규 E2E 도구는 만들지 않는다.
- 기존 geometry 테스트의220/54 숫자는 순수 좌표 함수의 대표 입력이며 runtime sidebar 설정이 아니다. 불필요하게 모든 fixture를 새 디자인 숫자로 치환하지 않는다. production 좌표는 실제 surface bounds+ResizeObserver를 사용하며220/54 하드코딩이 아님을 코드로 확인한다.
- 정적 검토: mainColumn/aside 너비 변수 일치,760/761 조건 일치, 접힘 라벨 규칙이 모바일에 새지 않음, root overflow 없음, nav scroll+footer 분리, active 규칙 diff 없음, popup 내부 font 경로 변화 없음.
- `font-family`는 변수 정의만으로 다운로드를 보장하지 않으므로 local 자산 존재·SHA-256·CSS src 경로/weight를 각각 검토한다. 실제 glyph 렌더링을 확인했다고 보고하지 않는다.
- 브라우저 실행·수동 클릭·실제 IME/터치·스크린샷 검증은 제외한다. 완료 보고는 자동 검증 범위와 시각 검증 미실시를 구분하고, 이를 대기 Task로 남기지 않는다.

## Acceptance Criteria

- [x] AppShell과 sidebar가 펼침200px/접힘64px를 공유하고, 모바일은280px(최대 viewport-32px) 및 본문 margin0이다.
- [x] 헤더·메뉴·구분선·footer는 I02의 inset/spacing이며, 일반 메뉴는14px/20px/400 및20px 아이콘·10px gap이다.
- [x] Spoqa400/500/700 원본과 LICENSE가 저장소 내부에 있고, 사용 범위가 sidebar의 brand/link/profile trigger로 제한된다.
- [x] profile trigger 고정181.141px 및 접힘48px 강제를 제거하고 새로운 내부 폭에 맞춘다. 메뉴 scroll과 하단 profile 영역은 분리한다.
- [x] 활성 전용 규칙·선택 판정·15개 메뉴·역할·URL·모바일 포커스·프로필 기능의 기존 계약을 유지한다.
- [x] 아래 자동 검증 및 정적 검토를 통과하고, 브라우저 검증 없이 결과와 범위를 기록한다.

## Validation

프로젝트 root PowerShell에서 실행한다. 아래 명령은 구현 단계에서 실행하며 이번 계획 작성 시 통과했다고 기록하지 않는다.

- `Get-FileHash -Algorithm SHA256 public/fonts/spoqa-han-sans-neo/*.woff2` — I01의 해시3개와 일치.
- `npm.cmd test -- tests/config/sidebar.test.ts tests/lib/profile-preview.test.ts tests/lib/token-preview.test.ts tests/lib/comments/shell-ui.test.ts tests/lib/comments/geometry.test.ts tests/lib/comments/workspace-ui.test.ts` — 관련 기존 회귀 통과.
- `npm.cmd run typecheck` — 타입 오류 없음.
- `npm.cmd run lint` — lint 오류 없음.
- `npm.cmd run build` — Next 프로덕션 빌드 성공.
- `git diff --check` — 공백 오류 없음.
- `git diff -- components/layout/AppShell.tsx components/layout/NavSidebar.tsx components/profile/ProfileMenu.tsx app/globals.css` — I05 정적 계약 검토. 활성 전용 스타일·상태 로직·팝오버 내부·전역 본문 서체 변경 없음.
- 통과 후 관련 코드를 바꾸면 영향받는 검증만 다시 실행한다. 브라우저·E2E·dev server 명령은 없다.

## Commit Message

```text
feat(sidebar): dadam 기준 사이드바 배치와 서체 적용

Plan: 2026-10-30-dadam-sidebar-layout-typography
Phase: P01-sidebar
Task: T01-sidebar-layout-typography

- 펼침과 접힘 및 모바일 너비에 본문과 프로필 배치 동기화
- 로컬 Spoqa 서체와 메뉴 아이콘 및 글자 정렬 적용
- 활성 전용 스타일과 기존 탐색 및 프로필 동작 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `git log -1 --format=%h --grep='Task: T01-sidebar-layout-typography'`


## Execution Result (2026-10-30)

- AppShell의 공유 너비 변수를200/64px로 바꾸고 NavSidebar의280px 모바일 drawer, 헤더·메뉴·구분선·하단 inset을 청사진대로 적용했다. 기존760/761px 경계와 상태/포커스 흐름을 유지했다.
- 메뉴에20px 아이콘·10px gap과14px/20px/400 서체를 적용했다. 라벨은 남은 폭에서 말줄임하고 접힌 상태에서만 숨긴다. 헤더는16px/24px/500과28px 버튼을 사용한다.
- 프로필 trigger를 `width: "100%"`, `minWidth: 0`으로 바꾸고 이름·배지의 줄바꿈 및 소속 말줄임을 적용했다. 가변 카드 높이는 nav의 flex/minHeight0 스크롤 영역이 수용한다.
- 로컬 Spoqa400/500/700 세 파일(544,268bytes)을 원본 그대로 복사했다. 세 SHA-256 모두 I01과 일치한다. 공식 LICENSE를 함께 저장했으며 SHA-256은279753543734E7A1846E3CB3F80D4DCDCC91F49C436411ADABA82E3913C61CDE다.
- `@font-face`는 로컬 URL로 등록하고 `fontFamily: "var(--sidebar-font-family)"`는 브랜드·메뉴·프로필 trigger 및 전용 avatar/badge에만 적용했다. aside/전역 본문/FluentProvider 서체는 유지했다.

### Validation results

| 검증 | 결과 |
| --- | --- |
| 지정 Vitest 명령 | 6개 파일 / 138개 테스트 통과 |
| npm.cmd run typecheck | 통과 |
| npm.cmd run lint | 통과 |
| npm.cmd run build | Next16 프로덕션 빌드 통과 |
| 폰트 SHA-256 및 CSS src 매핑 | 세 파일 일치, 로컬 자산 연결 확인 |
| git diff --check | 통과 |
| 정적 보존 검토 | active 전체 규칙·접힘 선택 색, ProfileMenu surface 이후 스타일/동작, AppShell mainColumn 이후 로직, 기존 전역 스타일 동일 |

브라우저 검증·E2E·스크린샷·dev server 실행은 사용자 지시대로 수행하지 않았다. 자동 검증이 실제 glyph 렌더링·시각 배치를 검증한 것으로 표현하지 않는다. 신규 테스트·의존성·인증/DB 변경은 없다.

### Learning notes and adjacent findings

- AppShell과 NavSidebar가 `--nav-sidebar-width`를 공유해야 본문 시작점과 사이드바 오른쪽 끝이 일치한다. 너비만 각각 하드코딩하면 접기 시 본문이 겹칠 수 있다.
- ProfileMenu는 inline popover이므로 aside 전체에 새 폰트를 상속시키지 않는다. 메뉴 라벨의 `fontWeight: "inherit"`도 활성 전용800 굵기를 유지하기 위한 경계다.
- 기존 Vite의 향후 native config loader 경고와 baseline-browser-mapping 데이터 갱신 경고가 남아 있다. 자동 검증은 모두 성공했다. 설정/의존성 유지보수는 이 Task 범위 밖이므로 수정하지 않았고 별도 정리 대상으로 남긴다.
- 시작 전부터 있던 이전 핀 코멘트 계획/검증 문서 변경은 이번 sidebar 구현 커밋에 포함하지 않는다. 새 sidebar 계획·정책·포인터/이력과 구현만 기록한다.
