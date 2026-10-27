# Task: T01 패널 토글 아이콘과 관리자 기준 프로필 보정

## Status: done

## Goal

`components/layout/NavSidebar.tsx`의 데스크톱 토글을 Fluent 패널 아이콘으로 교체하고, 사용자 프로필을 원본 HTML의 관리자 카드 크기·위치로 고정한다. 짧은 역할명 때문에 카드가 줄어드는 문제와 실제 세션 로그아웃 링크 때문에 카드가 위로 이동하는 문제를 함께 해결한다.

## Decision Summary

- 사용자 요청은 접기 아이콘과 프로필 크기·배치 두 항목이다. 같은 TSX의 Fluent `makeStyles` 방식을 유지하며 다른 UI·인증 정책으로 범위를 넓히지 않는다.
- 원본 관리자 카드는 역할명이 `관리자`로 바뀌어도 computed width `181.141px`를 유지한다. 이 외곽 크기를 일반/관리자/개발 미리보기 모두에 적용하고 실제 역할 데이터는 바꾸지 않는다.

## Implementation

### I01. 패널 윤곽이 있는 Microsoft Fluent 토글 아이콘

- Related Files:
  - `components/layout/NavSidebar.tsx` :: icon import, `NavSidebar`의 첫 번째 Button, `useStyles.toggle`, 새 `useStyles.toggleIcon` — 아이콘 교체; modify
  - `node_modules/@fluentui/react-icons/lib/atoms/svg/panel-left-contract.js`, `panel-left-expand.js` :: export와 glyph — 설치된 패키지 확인용; read-only
  - `components/layout/AppShell.tsx` :: `sidebarCollapsed`, `onCollapseToggle` — 기존 토글 상태; read-only
  - `package.json`, `package-lock.json` :: 현재 Fluent 버전 — 변경하지 않음; read-only

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

  // @fluentui/react-icons@2.0.344의 기존 공개 export 사용
  // PanelLeftContract20Regular: FluentIcon
  // PanelLeftExpand20Regular: FluentIcon
  ```

  props·반환 타입은 바꾸지 않는다. 새 공용 함수나 별도 아이콘 컴포넌트 파일도 필요 없다.

- **Data & Schema Fields**:
  - `isCollapsed: boolean`: AppShell 소유 상태, 기존 기본값 false 유지.
  - `isCollapsed=false`: 현재 열린 메뉴를 접는 조작이므로 `PanelLeftContract20Regular`.
  - `isCollapsed=true`: 접힌 메뉴를 여는 조작이므로 `PanelLeftExpand20Regular`.
  - `useStyles.toggleIcon`: `width: "19px"`, `height: "19px"`, `flexShrink: 0`; 색은 Button의 `#616773` 상속.
  - DB·세션·환경변수·패키지 스키마 변경 없음.

- **Execution Flow / Logic**:
  1. 변경 전 작업 트리와 NavSidebar의 현재 import·Button·media 규칙을 확인한다. 사용자 변경을 되돌리지 않는다.
  2. `ChevronLeftRegular`, `ChevronRightRegular` import를 제거하고 같은 패키지에서 `PanelLeftContract20Regular`, `PanelLeftExpand20Regular`를 가져온다.
  3. 데스크톱 Button의 `icon`에서 기존 boolean 분기를 유지한 채 위 두 glyph로 교체한다. 각 glyph에 `className={styles.toggleIcon}`, `aria-hidden="true"`를 지정한다.
  4. Fluent의 기본 icon slot 때문에 19px 지정이 덮이지 않는지 확인한다. Fluent glyph는 자체 fill path를 쓰므로 원본 inline SVG의 `strokeWidth: 1.75`·`fill: none`을 강제로 적용하지 않는다.
  5. 기존 Button의 `appearance="subtle"`, 34×36px 영역, `aria-controls={navId}`, `aria-expanded={!isCollapsed}`, 한국어 접근성 이름, `onCollapseToggle`을 유지한다. 이 아이콘은 데스크톱 접기 조작이며 모바일 overlay의 `DismissRegular`를 바꾸지 않는다.
  6. 원본은 패널 경계·왼쪽 구획·방향 표시를 가진 inline SVG다. 선택한 Microsoft Fluent glyph는 같은 기능·형태의 공식 Regular 아이콘이지만 원본 SVG와 모든 path가 같다고 보고하지 않는다.

### I02. 관리자 기준 프로필 카드의 고정 외곽과 내부 공간

- Related Files:
  - `components/layout/NavSidebar.tsx` :: `useStyles.profile`, `useStyles.account`, `useStyles.name`, `useStyles.collapsed` — 고정 폭과 텍스트 공간; modify
  - `components/providers.tsx` :: `useAuthRuntime` — 실제 세션 데이터; read-only
  - `lib/auth/roles.ts` :: `hasRole`, `APP_ROLES` — 권한 판정; read-only

#### Details

- **Signatures & Types**: 새로운 props·모델·컴포넌트 타입을 추가하지 않는다. 기존 `const useStyles = makeStyles({ ... })` 안의 객체 슬롯만 수정한다.
- **Data & Schema Fields**:

  | 슬롯/필드 | 변경 목표 |
  | :--- | :--- |
  | profile.width | `181.141px` |
  | profile.minWidth | `181.141px` |
  | profile.maxWidth | `181.141px` |
  | profile.height | `49px` 유지 |
  | profile.boxSizing | `border-box` 명시 |
  | profile.flexShrink | `0` 명시 |
  | profile.padding | `7px 9px` 유지 |
  | profile.columnGap | `8px` 유지 |
  | profile.border | `1px solid #e3e5e9` 유지 |
  | profile.borderRadius | `10px` 유지 |
  | account.flex | `1` 추가 |
  | account.minWidth | `0` 유지 |
  | name | overflow hidden / textOverflow ellipsis / nowrap 유지 |
  | badge | flexShrink 0 유지 |
  | avatar | 28px 유지 |

  현 `profile.width: "fit-content"`, `minWidth: "152px"`, `maxWidth: "calc(100% - 24px)"`를 위 고정 외곽으로 대체한다.

  참조 HTML: `GNB.badge_admin`은 카드 폭 181.141px, 아바타 28px, 정보 영역 103.141px, 화살표 14px, 요소 사이 8px, 좌우 패딩 각 9px, 좌우 테두리 각 1px이다. 정보 영역의 남은 폭은 `flex: 1`로 확보하고 내용 길이에 따른 외곽 자동 축소를 제거한다.

- **Execution Flow / Logic**:
  1. 펼친 카드에 위 고정 크기를 적용한다. 글자 크기·아바타·장식 점·프로필 화살표 종류와 계정 데이터는 재디자인하지 않는다.
  2. `account`를 남은 공간을 차지하는 flex item으로 만들고 긴 표시명만 말줄임한다. Badge·avatar·화살표는 찌그러지지 않게 기존 shrink 규칙을 유지한다.
  3. 데스크톱 접힘 media `@media (min-width: 761px)` 안의 `[data-sidebar-profile]` 너비/최소/최대 `48px` override와 라벨 숨김을 유지한다. 새 181px 최소 폭 때문에 54px 셸 밖으로 넘치지 않아야 한다.
  4. 모바일에서 열린 사이드바는 desktop의 `isCollapsed` 값과 무관하게 기존 media 분리로 181.141×49px 전체 프로필을 보여준다.
  5. `displayName`, `roleLabel`, `isAdmin`, `session`, `authEnabled` 계산을 바꾸지 않는다. `AUTH_ENABLED=false`일 때의 `정소담`/`미리보기`/`AI사업본부`도 유지한다. 위치 기준이 관리자라는 이유로 역할·세션을 생성하지 않는다.
  6. 잘못된/빈 이름에 대한 기존 fallback을 유지한다. 실제 부서 조회·Graph 호출·API·예외 경로를 추가하지 않는다.

### I03. 하단 고정 배치와 로그아웃의 영향 제거

- Related Files:
  - `components/layout/NavSidebar.tsx` :: `useStyles.footer`, footer JSX 자식 순서 — 프로필 하단 anchor; modify
  - `components/layout/AppShell.tsx` :: 고정 aside와 콘텐츠 배치 — 기존 구조 보존; read-only
  - `app/auth/logout/page.tsx` :: 로그아웃 처리 — 동작 보존; read-only

#### Details

- **Signatures & Types**: 변경 없음. footer는 새 상태·이벤트를 가지지 않는다.
- **Data & Schema Fields**:
  - footer: `display: flex`, `flexDirection: column`, `alignItems: center`, `flexShrink: 0`, `rowGap: 8px`, `padding: 12.5px 0` 유지. `width: "100%"`를 명시해 수평 중앙 기준을 안정화한다.
  - 실제 세션용 로그아웃 조건: `authEnabled && session`, href `/auth/logout`, 접근성 이름 `로그아웃` 유지.
  - 프로필 조건: 모든 정상 작업 영역 상태에서 표시하며 footer의 **마지막 자식**으로 둔다.

- **Execution Flow / Logic**:
  1. footer JSX의 기존 조건부 로그아웃 Link 블록을 프로필 카드 앞쪽으로 이동한다. 새 Link를 만들거나 기존 Link를 삭제하지 않는다.
  2. 프로필을 footer 마지막 요소로 두면 링크가 있어도 카드 아래에는 기존 padding 12.5px만 남는다. 링크는 카드 위에 놓이고 footer 높이 증가는 nav의 가용 높이에서 처리한다.
  3. aside의 `position: fixed`, `height: 100svh`, nav의 `flex: 1`/`minHeight: 0`/`overflowY: auto`, footer의 `flexShrink: 0`을 보존한다. 카드가 문서 콘텐츠나 메뉴 스크롤을 따라 움직이지 않게 한다.
  4. 원본 wrapper는 폭 220px 내 중앙 정렬이므로 카드 왼쪽은 약 `(220 - 181.141) / 2 = 19.4295px`다. 현재 aside 오른쪽 1px 테두리로 인한 0.5px 중심 차이는 허용하며 절대 좌표를 문서 전체 기준으로 하드코딩하지 않는다.
  5. 실제 화면에서 `aside.bottom - profile.bottom = 12.5px ± 1px`, 카드 중심과 aside 중심의 차이 `≤ 1px`로 확인한다. 현재 48px 접힌 카드에도 하단 12.5px 여백을 유지한다.
  6. 프로필은 기존 `<div role="group" aria-label="사용자 프로필">`로 유지한다. 모달·팝업·권한 전환·프로필 click handler를 붙이지 않는다. 기존 로그아웃만 별도 Link로 남긴다.

## Acceptance Criteria

- [x] PanelLeftContract20Regular/PanelLeftExpand20Regular 분기로 교체했다. 펼친 SVG는 SSR의 실제 path로 확인했고 접힌 분기는 코드로 확인했다. 화면 조작 확인은 아래 제한을 따른다.
- [x] 아이콘 19px CSS와 기존 버튼·접근성·callback·모바일 DismissRegular를 보존했다. 실제 화면 치수 측정은 미실시다.
- [ ] 펼친 카드의 bounding box가 181.141×49px(각 ±1px), 수평 중앙과 아래 12.5px(각 ±1px)에 맞는다.
- [x] 로그아웃 블록을 프로필 앞에 옮겨 카드를 footer 마지막 자식으로 유지했다. 실제 세션에서의 화면 위치 확인은 미실시다.
- [x] 고정 폭·account flex·기존 이름 말줄임을 구성했고 실제 역할·세션 계산은 변경하지 않았다. 긴 이름과 역할별 실화면 확인은 미실시다.
- [ ] 접힌 카드는 48×49px로 유지되고 390px 모바일에서 열린 카드가 전체 크기를 사용한다.
- [x] 메뉴·URL·권한 관련 기존 검증 43개와 SSR 확인이 통과했고 프로필은 비대화형 표시 영역으로 유지했다.
- [x] 실제 화면 확인과 SSR/코드 확인을 구별하고 미실시 항목을 아래에 기록했다.

## Validation

- `npm.cmd run test -- tests/config/sidebar.test.ts tests/app/workspace/screen.test.ts` — 메뉴·URL·역할 분기 회귀 없음.
- `npm.cmd run typecheck` — Fluent icon export·makeStyles 타입·props 검증 통과.
- `npm.cmd run lint` — 미사용 Chevron import 등 오류 없음.
- PowerShell: `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; npm.cmd run build` — 패키지 버전 변경 없이 빌드 성공.
- `rg -n 'PanelLeftContract20Regular|PanelLeftExpand20Regular|toggleIcon|181\.141' components/layout/NavSidebar.tsx` — 새 아이콘·치수 정의 확인.
- `rg -n 'ChevronLeftRegular|ChevronRightRegular|fit-content|152px|module\.css' components/layout/NavSidebar.tsx` — 대상의 옛 아이콘·가변 폭 정의 없음. 아이콘은 정상 패키지 root export로 import하며 private chunk 경로를 사용하지 않는다.
- 분리된 검증 서버를 같은 환경의 `npm.cmd run start -- --port 3100`으로 실행하고 `Invoke-WebRequest -UseBasicParsing http://localhost:3100/workspace/register` 및 `/workspace/audit`에서 200·정상 SSR을 확인한다. 15개 메뉴, 선택 항목, 프로필 표시 영역·새 SVG와 고정 폭 CSS가 있고 Griffel SSR 스타일이 body에 반복 출력되지 않는지 확인한다. 검증용 서버만 종료한다.
- 실제 브라우저에서 원본 HTML의 **관리자** 펼침 상태와 비교한다. 토글 glyph와 프로필 카드의 크기·좌표는 이미지 눈대중만이 아니라 가능한 경우 관찰된 DOM bounding box/개발자 도구로 확인한다. 이를 위해 사용자 인증·권한 정책을 바꾸거나 콘솔에 실행 코드를 입력하지 않는다.
- 확인 경우: 데스크톱 펼침/접힘, 390px 모바일 overlay, 낮은 높이의 nav 스크롤, 짧은/긴 이름, 미리보기/실제 관리자 및 로그아웃 링크 존재 여부. 자격 증명이 없는 상태는 확인 가능한 범위와 코드 검토 범위를 분리해 기록한다.
- 이전 Task의 Windows Computer Use URL 확인 차단은 당시의 제한 기록이다. 실행 시 도구가 허용되는 경우에만 시각 검증하고, 다시 자동 검토로 차단되면 UI 조작을 중단한다. 다른 자동화 경로로 우회하거나 정적 CSS 확인을 실제 조작 결과로 보고하지 않는다.
- 작은 UI 보정이므로 스타일 상수·SVG path를 그대로 복제하는 새 단위 테스트나 테스트 의존성을 추가하지 않는다. 시각 확인이 불가능하면 미실시 항목을 실행 기록에 남긴다.

## Commit Message

```text
fix(sidebar): 패널 아이콘과 관리자 기준 프로필 배치 보정

Plan: 2026-10-27-sidebar-controls-profile
Phase: P01-sidebar-refinement
Task: T01-toggle-and-profile

- Fluent 패널 아이콘으로 사이드바 접기와 펼치기 표시
- 프로필을 관리자 원본 크기와 하단 위치로 고정하고 로그아웃 유지
```

## Progress

- [x] 구현 완료
- [x] 자동 검증 통과
- [ ] 실제 화면의 bounding box·모바일·역할별 시각 확인 — 브라우저 자동화 연결 없음
- commit: 본 Task 완료 커밋에 포함 (`fix(sidebar): 패널 아이콘과 관리자 기준 프로필 배치 보정`)

## Execution Result

- 2026-10-27: NavSidebar 한 파일의 코드만 수정했다. Fluent 패널 토글 아이콘, 19px glyph 스타일, 프로필 width/minWidth/maxWidth 181.141px, 높이 49px, account flex 1을 적용했다.
- 로그아웃 Link의 조건·href·동작을 유지하며 프로필 위로 이동했다. footer 폭 100%와 기존 하단 padding 12.5px를 유지하고 데스크톱 접힘의 48px override를 보존했다.
- 관련 기존 테스트 43개/2개 파일, TypeScript, ESLint, 인증 비활성 프로덕션 빌드 통과.
- 별도 프로덕션 서버에서 `/workspace/register`, `/workspace/audit` 각각 200. 메뉴 15개·활성 항목, 새 패널 SVG의 path/viewBox, 접근성 속성, footer 마지막 프로필, 181.141px/48px/19px CSS를 확인했다. Griffel SSR 스타일은 head에만 존재했다.
- 접힌 아이콘 분기·로그아웃 순서는 코드 검토로 확인했다. 시각·상호작용 결과로 대체 보고하지 않는다. 검증용 서버는 종료했다.
- 요청 밖 추가 수정 사항: 특이사항 없음. 패키지·권한·로그인·셸·메뉴 데이터는 변경하지 않았다.

## Validation Limitations

이번 실행에서 확인한 Computer Use inventory의 연결된 브라우저 목록은 비어 있었다. 이전 실행에는 Windows의 현재 Chrome URL 확인에 따른 자동 검토 제한도 기록되어 있다. 이번에는 브라우저/Windows 화면 입력을 진행하거나 다른 UI 자동화 경로로 우회하지 않았다.

실제 카드 bounding box·아래 여백·수평 좌표, 토글 조작·접힌 화면·390px 모바일·낮은 높이·긴 이름 및 실제 세션에서의 로그아웃 배치는 **미검증**이다. 고정 CSS·SSR·코드 검토와 자동 품질 게이트는 확인했지만 이를 화면 비교 완료로 취급하지 않는다. 위 시각 확인 항목은 체크하지 않고 남긴다.
