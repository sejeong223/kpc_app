# Task: T03 HTML 기준 프로필 팝오버와 3개 탭 구현

## Status: done

## Goal

하단 사용자 프로필을 클릭하면 기준 HTML처럼 작은 팝오버가 열리고, 일반·업무 알림·환경 설정 탭과 로컬 역할/알림/설정 컨트롤을 펼침·접힘·모바일에서 사용할 수 있게 한다.

## Decision Summary

- T01의 공용 컨트롤과 T02의 ProfilePreviewProvider·상태 모델·역할 경계가 완료된 상태에서 구현한다. 로그인과 백엔드는 연결하지 않는다.
- 사용자 선택에 따라 상세 분석·토큰 신청은 준비 중 안내까지만 구현한다. UI와 로컬 상태 동작을 포함하고 추가 상세 팝업·신청 폼은 만들지 않는다.

## Implementation

### I01. 프로필 트리거와 앵커 팝오버

- Related Files:
  - `components/profile/ProfileMenu.tsx` :: `ProfileMenu`, `ProfileMenuProps`, `useStyles` — 프로필 버튼·Popover·헤더·탭·footer·안내문; new
  - `components/layout/NavSidebar.tsx` :: `NavSidebar`, `useStyles.footer`, 현재 profile/account/avatar/badge 관련 스타일 — 트리거 교체·프로필 UI 이동; modify
  - `components/profile/ProfilePreviewProvider.tsx` :: `useProfilePreview` — 완료된 T02 상태 계약; read-only
  - `components/providers.tsx` :: `useAuthRuntime` — 실세션 로그아웃 여부 확인; read-only
  - `node_modules/@fluentui/react-popover/dist/index.d.ts` :: `PopoverProps`, `PopoverSurfaceProps` — inline·trapFocus·positioning API; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProfileMenuProps {
    isCollapsed: boolean;
    onNavigate(): void;
  }
  export default function ProfileMenu(props: ProfileMenuProps): React.ReactElement;
  // 이 Task의 하위 패널 callback 계약
  export interface ProfileActionPanelProps {
    onNavigate(): void;
    onNotice(message: string): void;
  }
  ```

  하위 패널에서 ProfileActionPanelProps를 참조할 때는 `import type`을 사용해 ProfileMenu↔패널 사이 runtime 순환 import를 만들지 않는다.

- **Data & Schema Fields**:
  - Provider 계약: `{ authEnabled, rolePreviewEnabled, profile, state, dispatch }`.
  - profile: `{ name, email: string|null, department: string|null, organization, role: 'user'|'admin', isPreview }`.
  - state.selectedTab: `general | notifications | preferences`; dispatch는 T02의 typed action을 받는다.
  - 열림 `open=false`, 안내 `notice: string|null=null`, triggerRef `HTMLButtonElement|null`은 ProfileMenu의 로컬 상태다. 역할·설정·알림은 새 상태를 만들지 않고 Provider를 사용한다.
  - notice는 API 성공 메시지가 아니라 준비 중·시연 설정 변경을 알리는 문자열이다. 열기/닫기·탭 전환 시 이전 안내를 정리한다. 새 타이머·전역 토스트 Provider는 추가하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: `"use client"`와 기존 Fluent `Avatar`, `Badge`, `Button`, `Popover`, `PopoverTrigger`, `PopoverSurface`, `TabList`, `Tab`, `makeStyles`, `mergeClasses`를 사용한다. 아이콘은 Fluent `DismissRegular`, `ChevronUpRegular`, `ChevronDownRegular`를 사용한다. 사이드바 상단의 사용자 제공 CollapseIcon/ExpandIcon은 변경하지 않는다.
  2. NavSidebar footer의 비대화형 profile div를 `<ProfileMenu isCollapsed={isCollapsed} onNavigate={onNavigate} />`로 교체한다. 프로필 전용 스타일은 이 새 TSX로 옮겨 중복 정의를 남기지 않는다. Avatar/Badge/Chevron 관련 import가 NavSidebar에서 불필요해지면 제거한다. 기존 NavSidebar footer의 별도 logout 링크는 팝오버 footer로 옮겨 중복 표시하지 않는다.
  3. NavSidebar의 ProfileMenu key를 `${pathname}:${isOpen}:${isCollapsed}`에서 파생한다. URL·모바일 열림·접힘 상태가 바뀌면 팝오버 로컬 open/notice만 초기화하고 상위 Provider의 선택 탭·설정·알림·역할은 유지한다. 같은 URL의 링크를 눌러도 패널 onNavigate에서 open=false를 명시한다.
  4. 트리거는 Fluent Button `appearance="transparent"`로 실제 button을 렌더링하고 PopoverTrigger의 자식으로 둔다. Avatar와 이름·배지·소속·아래 화살표는 button 안의 span들로 구성한다. 중첩 button/Link를 만들지 않는다. `aria-label="사용자 프로필"`과 Fluent의 aria-haspopup/expanded 연결을 유지한다.
  5. 펼침 버튼의 기존 수치 보존: width/minWidth/maxWidth `181.141px`, height `49px`, padding `7px 9px`, gap `8px`, border `1px solid #e3e5e9`, radius `10px`, 흰 배경. Avatar `28px`, 일반 `#414141`, 관리자 `#e60012`; 장식 점 `10px`·빨간색·흰 2px 테두리 그림자. 이름 `12px/700`, 소속 `10px`, 역할 배지 `9px`·일반/관리자 문구. 표시명/역할/소속은 profile에서 읽는다.
  6. 접힘 스타일은 `@media (min-width:761px)`에서만 적용한다. 버튼 width/min/max `48px`, columnGap 0, 이름·배지·소속·화살표는 숨기고 Avatar만 보인다. isCollapsed 조건으로 라벨 DOM을 없애 모바일에서도 사라지는 문제를 만들지 않는다. 트리거의 기존 `[data-sidebar-profile]`/`[data-sidebar-label]`를 유지하거나 새 내부 class로 대체하되, **팝오버 본문에는 data-sidebar-label을 붙이지 않는다**.
  7. Popover는 controlled open/onOpenChange, `inline`, `trapFocus`, `withArrow={false}`, `positioning={{position:'above', align:'start', offset:8}}`를 사용한다. inline은 팝오버를 sidebar DOM 안에 두어 모바일 메뉴의 inert·포커스 범위와 충돌하지 않게 한다. 기본 viewport 충돌 조정을 유지하며 body 전체에 모달 backdrop을 추가하지 않는다.
  8. PopoverSurface는 `role="dialog"`, `aria-label="프로필 메뉴"`, `data-profile-popover`를 갖는다. 팝오버 기본 padding을 0으로 덮어쓴다. width `min(348px, calc(100vw - 16px))`, height/maxHeight `min(620px, calc(100svh - 86px))`, minWidth 0, display flex·column, overflow hidden, border `1px solid #e6e7eb`, radius `14px`, background white, shadow `0 12px 40px rgba(15,23,42,.16),0 2px 6px rgba(15,23,42,.06)`, zIndex `50`이다. border-box를 사용한다.
  9. desktop에서 trigger top보다 8px 위가 popup bottom이 되므로 기존 footer 위치에서 bottom 약69.5px가 된다. 왼쪽은 트리거와 정렬한다. 좁은 viewport에서 오른쪽 잘림이 없도록 Fluent 충돌 조정을 실제 확인한다. SSR 중 window/document로 좌표를 읽거나 전체 화면 좌표를 하드코딩하지 않는다.
  10. 헤더: padding `16px 14px 12px 16px`, gap11, align start. Avatar40·배경 `#303238`·흰 글자. 이름14px/850, 배지19px 높이·padding0 7·radius5·10px/800, 관리자 `#fff0f2/#c91c2b`, 일반 `#f2f3f5/#55585f`. 소속은 `[department, organization].filter(Boolean).join(' · ')`, 이메일 없으면 줄을 생략한다. 샘플은 `정소담 / AI사업본부 · KPC / sodam.jeong@example.invalid`다. 닫기 버튼은 32px·aria-label `프로필 메뉴 닫기`다.
  11. 탭은 일반/업무 알림/환경 설정 순서. TabList padding 0 8px·bottom border `#eff0f3`, Tab은 flex1·height38px·12px/750·비활성 `#74747d`, 활성 `#c91c2b`·2px 아래 선 `#d7192f`. 기본 Fluent 선택 장식의 중복 선·파란색이 남지 않게 슬롯/가상요소를 조정한다. 각 Tab id와 해당 role=tabpanel의 aria-labelledby/aria-controls를 연결한다. 활성 패널 하나만 렌더링한다.
  12. 업무 알림 탭에는 전체 notifications 중 unread count를 파생해 표시한다. 0이면 badge를 생략한다. 전체/안 읽음 필터에 따라 탭 badge가 달라지지 않는다.
  13. 본문은 flex1·minHeight0·overflowY auto·padding12px 14px·gap12px·background `#fafbfc`. 헤더/탭/footer는 flexShrink0으로 두어 본문만 스크롤한다. 안내문은 본문 안 또는 본문 바로 아래에 `role="status"`, aria-live polite로 보여주며 실제 API 저장/발송 성공을 주장하지 않는다.
  14. Footer는 padding `8px 10px 8px 16px`, top border `#eff0f3`, 배경 white, 버전 문구 `KPC 제안서 작성 AI v2.4`, 오른쪽 로그아웃이다. 이 버전은 참고 화면 문구이며 package.json 버전을 바꾸지 않는다.
  15. authEnabled=true이고 session이 있으면 logout은 기존 `/auth/logout` Link로 연결한다. authEnabled=false면 같은 모양의 Button이 `로그아웃 기능은 로그인 연결 후 사용할 수 있습니다.` 안내만 표시한다. notice가 보이도록 시연 버튼에서는 팝오버를 닫지 않는다. signOut·인증 URL로 호출하지 않는다.
  16. Error & Exception Handling: 팝오버 상태 변경에 HTTP·DB 오류는 없다. 실제 로그아웃 라우트는 기존 처리를 재사용하고 이 UI에서 예외를 삼키지 않는다. 탭의 data.value는 3개 allowlist로 좁혀서 dispatch한다.
  17. State Transition & Return: 프로필 클릭/Enter/Space로 열고 닫는다. 닫기 버튼과 Escape는 닫고 triggerRef에 포커스를 돌려준다. 외부 클릭은 닫되 클릭한 대상의 포커스를 강제로 빼앗지 않는다. URL 이동 시 닫고 AppShell의 기존 main focus 처리를 유지한다.

### I02. 일반 탭의 카드·역할 전환

- Related Files:
  - `components/profile/ProfileGeneralTab.tsx` :: `ProfileGeneralTab`, `useStyles` — 토큰·작업·역할 카드; new
  - `components/ui/SegmentedControl.tsx` :: T01 공용 선택 UI; read-only
  - `config/profile-preview.ts` :: token/work fixture — T02; read-only
  - `lib/profile-preview.ts` :: `formatTokenCount`, `getProfileTokenSummary`, `getUnreadNotificationCount` — T02; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export default function ProfileGeneralTab(
    props: ProfileActionPanelProps,
  ): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - 사용량 fixture `used72400/limit100000/warningThreshold70` → `72%`, `72.4K / 27.6K / 100K`, 경고 상태.
  - 작업 카드 fixture assignedProjects3/openComments2, 미확인 알림 수는 state.notifications에서 매번 계산한다.
  - role 선택값은 profile.role, options `user:일반 사용자`, `admin:관리자`, fullWidth true, disabled `!rolePreviewEnabled`다. 실제 session role은 여기서 수정하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: useProfilePreview에서 state/profile/dispatch/rolePreviewEnabled를 가져온다. 숫자를 UI 안에서 별도로 집계하거나 실제 프로젝트 서비스에 요청하지 않는다.
  2. 첫 카드: white·border#e6e7eb·radius12·padding12. 제목 `이번 달 AI Token` 12px/800, 우측 percent 15px/900. Fluent ProgressBar를 높이7px로 맞추고 progressPercent/100을 value로 전달한다. normal `#15985a`, warning `#c26a12`, over `#d7192f`; unavailable은 `—`와 비활성 상태다.
  3. 통계는 사용/잔여/한도 3열·gap6·각 배경#f7f8fa·radius8·padding6px 8px·label10px·숫자13px/850이다. limit초과는 remaining0/progress100을 표시한다. 최초 추가 신청 배너는 없다. 원본에 현재 사용자 신청 건이 없고 이번에 신청 기능도 만들지 않기 때문이다.
  4. 2열 버튼: `사용량 상세 분석` → onNotice(`사용량 상세 분석은 준비 중입니다.`), `토큰 추가 신청` → onNotice(`토큰 추가 신청은 준비 중입니다.`). 높이26px·font11px·radius7, 두 번째는 빨간 primary다. 정상 신청·한도 반영 메시지를 만들지 않는다.
  5. profile.role=admin일 때만 dashed top border의 `전사 토큰 · 비용 관리` Link를 보여준다. href `/workspace/tokens`, 클릭 시 onNavigate를 호출해 팝오버·모바일 메뉴를 닫는다. 별도 관리자 폼을 만들지 않는다.
  6. 내 작업 카드: 제목 `내 작업`, 3열 quick 버튼·gap6·border/radius9·padding8px 10px. 담당 프로젝트3/반영할 의견2는 `/workspace/pipeline` Link로, 안 읽은 알림은 `set-tab:notifications` action으로 연결한다. 뒤의 동작은 팝오버를 유지한다.
  7. 권한 테스트 카드: 제목 `권한 테스트 모드`, 보조 `시연용`, 공용 SegmentedControl로 role 선택. onChange는 `dispatch({type:'set-role',role})`. admin이면 `작성 자산 관리 · 운영 정책 메뉴가 열립니다`, user면 `관리자로 바꾸면 작성 자산 관리 · 운영 정책 메뉴가 열립니다` 설명을 표시한다. auth 활성에서는 disabled와 `현재 로그인 권한을 사용합니다.` 설명으로 대체한다.
  8. 시연 데이터라는 작은 표시를 카드 영역에 둔다. 업무 수·토큰이 현재 로그인 사용자의 실데이터라는 인상을 주지 않는다.
  9. Error & Exception Handling: role 변경의 no-op/실제 인증 차단은 Provider에서도 보장한다. API를 호출하거나 성공 응답을 꾸미지 않는다.
  10. State Transition & Return: 일반 화면에서 role 변경 시 팝오버는 열린 채로 badge/메뉴/role 선택만 갱신한다. 관리자 안내 화면에서 user 변경 시 T02 boundary가 pipeline으로 이동하고 URL key 변경으로 팝오버가 닫힌다.

### I03. 업무 알림 탭

- Related Files:
  - `components/profile/ProfileNotificationsTab.tsx` :: `ProfileNotificationsTab`, `useStyles` — 필터·읽음·안내 URL 연결; new
  - `components/ui/SegmentedControl.tsx` :: 전체/안 읽음 선택; read-only
  - `lib/profile-preview.ts` :: 미확인 count·필터 selector — T02; read-only
  - `config/sidebar.ts` :: `getSidebarItemByScreen` — 고정 targetScreen의 href 확인; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export default function ProfileNotificationsTab(
    props: ProfileActionPanelProps,
  ): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - state.notificationFilter `all|unread`, notifications의 id/kind/title/description/timeLabel/unread/targetScreen을 사용한다.
  - seed: n1 AI 결과예시→analysis·미확인, n2 댓글→write·미확인, n3 마감→pipeline·읽음, n4 토큰70%→targetScreen null·읽음. 텍스트 원문은 완료된 config/profile-preview.ts의 fixture를 읽으며 새로 중복 선언하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 전체/안 읽음 세그먼트는 공용 SegmentedControl의 ariaLabel `알림 필터`, fullWidth false다. 전체 미확인 수가 0보다 클 때만 우측 `모두 읽음` 버튼을 보인다.
  2. Core Processing: 선택 시 set-notification-filter를 dispatch한다. 모두 읽음은 mark-all-notifications-read를 dispatch하고 `알림을 모두 읽음으로 표시했습니다. (시연)` 안내를 표시한다. 필터 상태를 강제로 전체로 바꾸지 않는다.
  3. 카드는 padding10·gap10·border1px#e6e7eb·radius11·배경white·textAlign left. unread는 border#f3c7cd·배경#fffafa·우상단 빨간7px 점이다. title12px/700, description11px·lineHeight1.45, 시간11px gray. kind 아이콘 상자는28px·radius8이며 AI보라/댓글파랑/마감빨강/토큰주황 배경을 사용한다. 아이콘은 Fluent SparkleRegular/TextBulletListLtrRegular/HistoryRegular/MoneyRegular로 고정 매핑한다.
  4. targetScreen이 있으면 카드는 Link로 렌더링한다. getSidebarItemByScreen의 허용 URL을 사용하고 클릭에서 해당 id를 읽음 처리한 뒤 onNavigate를 호출한다. 분석/제작/검토 목록의 기존 안내 화면만 연다. 원본 HTML의 프로젝트 상세를 새로 구현하지 않는다.
  5. targetScreen=null인 토큰 알림은 Button으로 렌더링해 읽음 처리 후 `사용량 상세 분석은 준비 중입니다.` 안내를 보인다. 별도 사용량 팝업·관리자용 URL을 일반 사용자에게 열지 않는다.
  6. Error & Exception Handling: 알려지지 않은 id는 reducer에서 no-op, 알려지지 않은 targetScreen은 링크를 만들지 않고 준비 중 안내로 처리한다. 문자열 URL을 외부 입력으로 직접 만들지 않는다.
  7. State Transition & Return: 알림 읽음 변경은 탭 badge·일반 탭 미확인 카드·필터 목록에 즉시 반영한다. 안 읽음 필터의 마지막 알림을 처리하면 `안 읽은 알림이 없습니다` 빈 상태가 나온다. 전체 seed는 삭제하지 않는다.

### I04. 환경 설정 탭과 공용 컨트롤 재사용

- Related Files:
  - `components/profile/ProfilePreferencesTab.tsx` :: `ProfilePreferencesTab`, `useStyles` — 3개 설정 카드; new
  - `components/ui/ToggleSwitch.tsx`, `components/ui/SegmentedControl.tsx` — T01 공용 UI; read-only
  - `config/profile-preview.ts` :: `ProfilePreferences`, `DigestSchedule` — T02; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProfilePreferencesTabProps {
    onNotice(message: string): void;
  }
  export default function ProfilePreferencesTab(
    props: ProfilePreferencesTabProps,
  ): React.ReactElement;
  ```

- **Data & Schema Fields**:

  | 카드 | 필드 | 화면 문구·선택지 | 기본값 |
  | :--- | :--- | :--- | :--- |
  | 알림 받기 | comments | 의견 · 멘션 / 내 섹션에 달린 의견, @멘션 | true |
  | 알림 받기 | reviews | 검수 요청 · 완료 | true |
  | 알림 받기 | deadlines | 마감 임박 / D-7 · D-3 · D-1 | true |
  | 알림 받기 | aiJobs | AI 작업 완료 / 분석 · 초안 · 슬라이드 생성 | true |
  | 알림 받기 | tokenWarnings | 토큰 사용량 경고 / 한도의 70% · 100% 도달 시 | true |
  | 알림 방식 | email | 이메일로도 받기 | false |
  | 알림 방식 | digest | off:받지 않음, daily:매일 오전 9시, weekly:매주 월요일 | daily |
  | 화면 기본값 | startScreen | pipeline:검토 목록, write:제작 | pipeline |
  | 화면 기본값 | editorView | doc:본문, slide:슬라이드 | doc |
  | 화면 기본값 | listView | table:목록, board:보드 | table |

- **Execution Flow / Logic**:
  1. Precondition & Validation: settings는 Provider state.preferences 한 곳에서 읽는다. 토글마다 복사한 로컬 useState·스타일·저장 handler를 만들지 않는다.
  2. Core Processing: 알림 받기5개·이메일1개는 모두 ToggleSwitch를 사용한다. checked/onChange로 해당 boolean의 set-preference action만 전달한다. 각 행 padding7px 0·top border#eff0f3, 첫 행은 top border없음·paddingTop0이다.
  3. 카드 스타일은 white·border1px#e6e7eb·radius12·padding12, 제목11.5px/850·marginBottom8. 라벨12px/700·설명10.5px gray. T01의 트랙은34×20·손잡이16·ON14px 이동을 그대로 사용한다.
  4. 요약 메일은 Fluent Field/Select의 native select를 사용해 추가 포털 드롭다운과 모바일 포커스 충돌을 만들지 않는다. label을 select id에 연결하고 height28·font11.5px로 맞춘다. data.value 또는 event.target.value는 off/daily/weekly allowlist로 확인해 DigestSchedule로 좁힌다.
  5. 화면 기본값 3행은 왼쪽 label width62px·gap10·padding5px 0, 오른쪽 SegmentedControl fullWidth=true다. 각각의 union과 options를 구분하며 `doc/slide`를 시작 화면 값으로 혼용하지 않는다.
  6. 변경 시 `이번 미리보기에 설정을 적용했습니다.` 안내를 표시한다. 닫았다 열거나 다른 화면으로 이동해도 선택값을 유지한다. 새로고침하면 위 기본값으로 초기화된다.
  7. Error & Exception Handling: allowlist 밖 select 값은 무시한다. 서버에 저장됨·이메일 전송됨·실제 화면 기본값이 배포됨 같은 성공 메시지는 표시하지 않는다. 실제 editor/list/start routing은 현재 안내 화면 범위에서 구현하지 않는다.
  8. State Transition & Return: 필드 한 개만 바뀌며 선택한 역할/알림 읽음/다른 설정은 유지된다. 배지·미확인 알림을 설정 변경으로 임의 삭제하지 않는다.

### I05. 모바일 포커스·닫힘 통합과 문서

- Related Files:
  - `components/layout/AppShell.tsx` :: menuOpen effect의 `onKeyDown`·포커스 대상 selector — 팝오버와 기존 모바일 메뉴의 키 처리 조정; modify
  - `components/profile/ProfileMenu.tsx` :: PopoverSurface 키 처리·닫기·포커스 복귀; modify within this Task
  - `README.md` :: 프로필 UI 미리보기 사용법·저장 범위 — 짧은 설명; modify
  - `components/layout/AppHeader.tsx`, `components/providers/FluentUiProvider.tsx`, `app/auth/logout/page.tsx` — 기존 연결·테마·실로그아웃 유지; read-only

#### Details

- **Signatures & Types**:
  - AppShellProps/NavSidebarProps의 기존 외부 계약은 유지한다. ProfileMenu는 NavSidebar 안에서만 새로 조합한다.
  - ProfileMenu의 `onNavigate` wrapper는 setOpen(false) 후 전달받은 onNavigate를 호출한다. 역할 상태는 Provider에서 유지한다.

- **Data & Schema Fields**:
  - 기존 mainColumn inert·body overflow 잠금은 모바일 메뉴가 열린 동안 유지한다.
  - `data-profile-popover`는 열려 있는 팝오버 Surface에만 표시한다. 로컬 open=false가 되면 marker를 제거해 바깥 키 처리가 영구 중지되지 않게 한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 현재 AppShell은 document keydown에서 Escape 시 모바일 메뉴를 닫고, `a[href], button:not([disabled])`만 순회한다. 팝오버 기본 portal과 별도 input을 그대로 추가하면 이 처리와 충돌한다.
  2. Core Processing: Popover를 inline으로 두고, AppShell onKeyDown은 `event.defaultPrevented`이면 즉시 return한다. sidebar 안에 열린 `[data-profile-popover]`가 있으면 외부 Tab/Escape 처리를 중단해 Fluent 팝오버의 focus trap이 입력을 관리하게 한다.
  3. Surface의 `onKeyDownCapture`에서 Escape는 preventDefault·stopPropagation하고 open=false로 닫은 뒤 requestAnimationFrame으로 triggerRef에 포커스를 돌린다. document의 모바일 Escape handler까지 같은 이벤트가 도달해 메뉴가 함께 닫히지 않게 한다. 나머지 Tab/방향키/Space는 공용 native/Fluent 컨트롤에 위임한다.
  4. 팝오버가 닫혀 있을 때의 모바일 순회 대상에는 기존 링크/버튼 외 input/select/textarea 및 tabindex 요소를 포함하고, disabled·tabindex=-1·보이지 않는 대상을 제외한다. 팝오버가 열린 동안은 이 바깥 순회가 실행되지 않아 Switch/Radio/Select의 native 키 처리를 침범하지 않는다.
  5. 닫기 버튼/Escape는 프로필 trigger로, 메뉴 이동은 기존 main focus로 복귀한다. 외부 클릭으로 닫을 때 클릭 대상의 포커스를 강제로 trigger로 빼앗지 않는다. 모바일 메뉴 닫기·사이드바 접기·뒤로/앞으로 이동 시 popup은 key 변경으로 닫힌다.
  6. README에는 프로필 위치·3탭·초기 관리자·일반7/관리자15메뉴·메모리 저장/새로고침 초기화·상세/신청 준비 중·인증 활성 시 실역할 우선을 설명한다. 실제 설정 저장/알림 서비스가 연결됐다고 쓰지 않는다.
  7. Error & Exception Handling: 브라우저 focus 대상이 사라졌으면 optional ref로 안전하게 종료한다. UI 확인 도구가 제한되면 우회하지 않고 실제 브라우저 확인 제한을 기록한다.
  8. State Transition & Return: 모바일 첫 Escape는 프로필만 닫고 모바일 메뉴는 유지, 두 번째 Escape는 모바일 메뉴를 닫는다. 트리거·header·menu nav의 기존 닫기 동작이 유지된다.

### I06. 검증 및 변경 보존

- Related Files:
  - `tests/lib/profile-preview.test.ts`, `tests/components/preview-role-boundary.test.ts`, `tests/config/sidebar.test.ts`, `tests/app/workspace/screen.test.ts` — T02의 상태·서버 가드 테스트; run/read-only unless integration changes require a targeted correction
  - `components/layout/NavSidebar.tsx` :: 기존 divider `margin 8px 6px / collapsed 6px / width auto`, group paddingRight12 — 변경하지 않음
  - `package.json`, `package-lock.json`, `config/env*`, `lib/auth`, `services`, `scripts/provision-cosmos.ts`, `.agents/skills` — 구현 범위 밖; read-only

#### Details

- 표/보드·본문/슬라이드 편집기·실사용량·실알림 API를 새로 만들지 않는다. 기존 divider 미커밋 변경은 유지하고 Task hunk만 선별 stage한다. 브라우저 검증을 위해 임시 제품 라우트·권한 우회·패키지를 추가하지 않는다.
- CSS 색/px를 그대로 복제하는 테스트를 추가하지 않는다. T02의 순수 상태·역할 가드 회귀 테스트와 아래 실제 UI 검증을 조합한다.
- 기존 실인증은 Azure 설정이 없는 상태에서 실계정 로그인 통과로 주장하지 않는다. 실역할 우선과 인가 유지의 자동 테스트 결과를 보고하고, 실제 로그인 통합 확인은 미수행으로 구별한다.

## Acceptance Criteria

- [x] 프로필 버튼에서 HTML의 3개 탭 팝오버가 열리고 닫힌다.
- [x] 기준 크기·색·앵커·본문 스크롤과 펼침/접힘 프로필 위치가 유지된다.
- [x] 공용 세그먼트/스위치를 복제 없이 재사용하며 라벨·키보드·disabled가 정상 동작한다.
- [x] 일반/관리자 선택이 배지·아바타·메뉴15/7·관리자 안내 화면 이동에 일관되게 반영된다.
- [x] 알림 읽음과 환경 설정이 메모리 범위에서 동작하고 준비 중 버튼이 허위 저장/신청을 하지 않는다.
- [x] 모바일 입력·첫/두 번째 Escape·포커스 복귀·외부 클릭이 정상 동작한다.
- [x] 실제 로그인·로그아웃 경로·서버 역할 가드와 기존 divider 변경을 보존한다.
- [x] 자동 검사와 실제 브라우저 검증 결과를 구분해 실행 기록에 남긴다.

## Validation

- `npm run typecheck` — TSX/슬롯/상태 타입 오류 없음.
- `npm run test` — 기존 전체 회귀 테스트 및 T02 테스트 통과.
- `npm run lint` — 전체 lint 통과. 관련 수정의 실패는 원인을 해결한 뒤 해당 검사를 재실행한다.
- `npm run build` — 인증 비활성 개발/미리보기 환경에서 production build 통과. 실제 Azure 요청·리소스 생성으로 build를 해결하지 않는다. 필요하면 프로세스의 AUTH_ENABLED만 false로 임시 지정하고 원래 값을 복원하며 `.env`는 수정하지 않는다.
- `git diff --check` 및 `git diff --name-only` — 관련 파일만 변경, 기존 divider hunk 보존.
- 기존 개발 서버 또는 `npm run dev`로 아래 실제 브라우저 동작을 확인한다. 서버가 이미 실행 중이면 중복 실행하지 않는다.

  1. 데스크톱 펼침: 프로필 위치/크기 유지, 클릭·Enter·Space 열기, 348px 폭·프로필 위8px, 헤더/탭/footer 고정·본문 스크롤.
  2. 세 탭: 일반→업무 알림→환경 설정 이동, 활성 빨간 선·접근성 tab/tabpanel 연결, 닫았다 열어도 선택 탭 유지.
  3. 역할: 최초 관리자15개·user선택7개·admin복원15개, 각 badge/avatar/선택 동기화. 일반 화면에서는 popup 유지.
  4. 관리자 안내 화면에서 user로 전환: 즉시 내용 가림→pipeline replace→popup 닫힘. user 상태의 관리자 직접 URL/뒤로 가기도 가림. 전체 새로고침은 초기 admin 복귀.
  5. 알림: 미확인2→한 건 읽음1, 모두 읽음0, 안 읽음 필터 빈 상태, 탭/일반 카드 건수 동기화. 기존 안내 URL 이동과 token 알림 준비 중 안내.
  6. 환경 설정: 스위치6개·요약 메일·세그먼트3개 선택, label 클릭/Space·방향키, 34×20 트랙·흰16px 손잡이14px 이동, 탭/라우트 이동 후 값 유지·새로고침 기본값 복귀.
  7. 준비 중: 사용량 상세·토큰 신청·시연 로그아웃은 보이는 안내만 표시. 네트워크 패널에서 신규 설정/알림/Azure 요청 없음.
  8. 접힘54px: 아바타 버튼과 popup 모두 사용 가능, popup 본문 라벨이 숨지 않음, 메뉴 아이콘·tooltip·divider 여백 유지.
  9. 모바일390px/320px: menu open→profile open, 폭/높이 viewport 안, Switch/Radio/Select에 키보드 접근 가능. 첫 Escape는profile만·두 번째는menu 닫힘. main inert와 스크롤 잠금·복원 유지.
  10. 낮은 화면 높이500px: 전체 팝오버가 잘리지 않고 내부 스크롤. 긴 이름·이메일 줄임표, close/logout 접근 가능.
  11. 키보드와 이동: 닫기/Escape 후 trigger 포커스, 외부 클릭 대상 포커스 유지, 라우트·접힘·모바일 메뉴 닫기 시 popup 정리. 배경에 클릭을 막는 불필요한 backdrop 없음.

- 브라우저 도구가 실제 화면을 확인하지 못하면 해당 항목을 미확인으로 기록한다. 자동 검사 통과를 시각/상호작용 검증 완료로 대신하지 않으며, 실제 로그인 통합 확인도 별도로 남긴다.

## Commit Message

```text
feat(profile): 사용자 프로필 팝오버와 세 개 탭 구현

Plan: 2026-10-27-profile-popover-preview
Phase: P01-profile-popover
Task: T03-profile-popover-ui

- 목업 기준 프로필 팝오버와 일반 알림 환경 설정 화면 구현
- 공용 컨트롤로 역할 전환과 알림 설정 시연 연결
- 모바일 포커스와 닫기 동작을 통합하고 검증 범위 문서화
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task의 변경·완료 기록을 포함한 동일 커밋(Plan/Phase/Task 식별자로 조회)

## Execution Result — 2026-10-27

- ProfileMenu와 일반/업무 알림/환경 설정 패널3개를 추가하고 NavSidebar의 프로필 표시를 실제 버튼+Fluent Popover로 교체했다. 프로필 스타일도 해당 TSX로 옮겼다. 공용 SegmentedControl과 ToggleSwitch를 모든 해당 설정에서 재사용한다.
- Popover inline/trapFocus, trigger의 aria-haspopup=dialog와 aria-controls 연결, 탭/tabpanel 연결을 구현했다. AppShell은 열린 내부 팝오버의 키 입력을 가로채지 않으며 Escape capture로 안쪽 팝오버만 먼저 닫는다.
- 일반 탭의 토큰·작업 수는 시연 표시를 유지한다. 상세 분석/토큰 신청/비인증 로그아웃은 안내만 표시한다. 실제 인증 모드의 기존 /auth/logout 링크는 보존했다.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test`(24개 파일·240개 테스트), AUTH_ENABLED=false의 `npm.cmd run build`, 공백 검사를 통과했다. build의 프로세스 환경변수는 원래 값으로 복원했다. 의존성과 .env는 수정하지 않았다.

### 실제 브라우저 검증

기존 설치된 Chrome을 별도 임시 프로필의 headless 모드로 실행해 localhost:3000의 실제 앱을 확인했다. Node 내장 WebSocket/CDP를 사용했으며 새 npm 패키지·프로젝트 테스트 의존성을 설치하지 않았다. 사용자 브라우저 프로필이나 탭은 조작하지 않았다. 검증 후 테스트 Chrome 프로세스를 종료했다.

| 항목 | 관찰 결과 |
| :--- | :--- |
| 펼침 desktop1280×900 | 팝오버348×620px, 트리거181.140625×49px. CSS 간격8px·실측7.5px로 Floating positioning의 픽셀 반올림 허용1px 이내 |
| 공용 스위치 | 실제 트랙34×20px·손잡이16px, OFF translateX0/ON14px, OFF rgb(212,214,219)/ON rgb(215,25,47) |
| 조작 | 클릭·프로필 Enter/Space, 스위치 Space·label 클릭, radio ArrowRight, 요약메일 End 선택 정상 |
| 역할 | 일반 사용자7개↔관리자15개, 프로필 배지 동기화, 일반 화면에서 팝오버 유지 |
| 안내 화면 경계 | 관리자 화면에서 user선택 시 pipeline replace. 관리자 URL이 history에 남은 상태의 뒤로 가기도 user로는 가림/이동 |
| 알림 | 한 건 읽음2→1, 모두 읽음0, 안 읽음 빈 상태와 badge/일반 카드 동기화, 기존 안내 URL 이동 |
| 저장 범위 | 팝오버 닫기/열기·클라이언트 라우트 이동 후 설정 유지, 전체 새로고침 후 초기 관리자·기본 설정 복귀 |
| 접힘54px | 프로필 트리거48px, 팝오버348px, 팝오버의 숨겨진 data-sidebar-label 없음 |
| 낮은 높이500px | 팝오버 top17/bottom431/height414px, 본문 내부 스크롤 |
| 모바일390px·320px | 동작·키보드 접근 확인. 320px에서 팝오버 x16/right320/width304/top17/bottom571로 viewport 내부 |
| 모바일 포커스 | Tab14회가 내부에 유지됨. 첫 Escape는 프로필만 닫고 트리거로 복귀, 두 번째는 모바일 메뉴 닫기·body 스크롤 복원 |
| 닫기와 이동 | Escape 포커스 복귀, 외부 메뉴 링크 클릭 시 팝오버 닫기·main-content 포커스 정상 |
| 긴 표시 데이터 | 테스트 브라우저 DOM의 이름/메일을 일시적으로 길게 넣어 ellipsis를 확인하고 원문을 복원. 실세션은 변경하지 않음 |
| 오류/요청 | Runtime exception0, 관찰한 신규 API/외부 서비스 요청0 |

- desktop-general, desktop-preferences, collapsed-profile-final, mobile-preferences, notifications-empty 스크린샷을 실제로 캡처·확인했다. 임시 산출물은 시스템 temp의 kpc-profile-execute-_b3wvv0c 아래에 있으며 저장소에 포함하지 않는다.
- 실계정 Microsoft 로그인과 실로그아웃·설정 저장/메일 발송·Azure 연동은 이번 UI 범위 밖으로 실행하지 않았다. 서버 권한 가드는 기존/신규 자동 테스트로 검증했으며 실인증 통합 검증과 구분한다.
- 기존 NavSidebar 구분선 좌우6px·width auto는 working tree에 그대로 보존하고, Task 커밋 index에는 포함하지 않았다. 기능 외 새로 발견한 결함은 없다. 기존 도구의 메타데이터 갱신 안내 때문에 의존성을 임의 갱신하지 않았다.
