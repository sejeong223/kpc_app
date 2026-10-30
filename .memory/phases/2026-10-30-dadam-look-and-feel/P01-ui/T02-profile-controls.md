# Task: T02 프로필 전체 탭과 공통 컨트롤 정비

## Status: done

## Goal

사이드바 하단 프로필 버튼에서 열리는 일반·업무 알림·환경 설정 탭까지 같은 Spoqa 서체, dadam 중립 표면과 파란 강조색으로 표시한다. 기존 탭·역할·알림·환경 설정 상태 흐름을 보존한다.

## Decision Summary

- Plan: 2026-10-30-dadam-look-and-feel / Phase: P01-ui. T01 완료 후 실행한다. 사용자는 프로필과 토큰 창까지 사이드바 완료 범위에 포함했다. 토큰 모달은 T03에서 완성하며 코멘트는 그 이후다.
- 기본형 dadam, 강조 #0f6cbd, 기능 보존. 브라우저/E2E/스크린샷·육안 확인·검증용 dev server 제외. 기존 state/auth/fixture/schema를 UI에 맞춰 바꾸지 않는다.

## Implementation

### I01. 프로필 진입 버튼·팝오버·탭

- Related Files:
  - `components/profile/ProfileMenu.tsx` :: `useStyles`, `ProfileMenu`, `ProfileActionPanelProps` — 진입/팝오버 스타일; modify
  - `components/profile/ProfilePreviewProvider.tsx` :: `useProfilePreview`, open/close token focus — 보존; read-only
  - `lib/ui/dadam-theme.ts` :: `dadamUi`, `DADAM_FONT_FAMILY` — T01 공통 계약; read-only
  - `components/providers/DadamThemeScope.tsx`, `components/layout/AppShell.tsx` — 이미 sidebar를 감싸는 테마; read-only

#### Details

**Signatures & Types**

```typescript
export interface ProfileMenuProps { isCollapsed: boolean; onNavigate(): void }
export interface ProfileActionPanelProps {
  onNavigate(): void; onNotice(message: string): void;
  onOpenTokenDialog(view: "usage" | "request"): void;
}
export default function ProfileMenu(props: ProfileMenuProps): React.ReactElement;
```

**Data & Schema Fields**

- T01 계약: `DADAM_FONT_FAMILY="var(--dadam-font-family)"`, `dadamTheme`는 전체 webLightTheme와 Spoqa base/numeric, semibold500. `DadamThemeScope({children})`가 AppShell의 sidebar를 감싸므로 inline Popover도 같은 범위다. 새 scope/state Provider를 ProfileMenu 안에 중복 생성하지 않는다.
- `dadamUi`의 string 필드: bodySize/bodyLineHeight=14px/20px, metaSize/metaLineHeight=12px/16px, titleSize/titleLineHeight=16px/24px, controlRadius4/cardRadius6/surfaceRadius8px, controlHeight32/smallControlHeight28px, cardPadding/sectionGap12px, popoverShadow=tokens.shadow8, dialogShadow=tokens.shadow16, focusRing=2px solid BrandStroke1. 색은 `tokens`를 사용한다.
- 상태는 기존 `open:boolean=false`, `notice:string|null=null`, `selectedTab:"general"|"notifications"|"preferences"`, triggerRef, modalFrame을 보존한다. role은 user/admin. profile의 email/department는 null 가능하여 기존 조건부 표시를 유지한다.

| slot | 정확한 스타일 변경 |
| --- | --- |
| trigger | width100%,minHeight49px,padding7px9px 유지; Stroke2 1px, controlRadius4px, Background1/Foreground1, fontFamilyBase. enabled hover Background2Hover/Stroke1, pressed Background3, focusRing 명시 |
| collapsed | min-width761 안의 padding7px0/center/label 숨김 유지. 모바일에서는 isCollapsed=true여도 이름 표시 |
| avatar/adminAvatar/face | 일반 avatar Foreground2 배경/ForegroundOnBrand 글자, adminAvatar BrandBackground. 기존 size28/40 및 initials 슬롯 보존, weight700 |
| dot / badge | dot BrandBackground, 흰 외곽2px 유지. 일반 역할 badge Background3/Foreground2, 관리자 badge BrandBackground2/BrandForeground2와 BrandStroke1. 배지10px/12px/500·높이16 유지 |
| name/department | 기존12px/16px/400 및11px/14px/400 유지. 각각 Foreground1/Foreground3. minWidth0/ellipsis와 이름·배지 wrap 유지 |
| surface | width min(348px,100vw-16px), height/maxHeight min(620px,100svh-86px), overflow hidden/flex column/zIndex50 유지. Background1/Foreground1/Stroke2, surfaceRadius8, popoverShadow, fontFamilyBase/body14/20/400 |
| headerName/headerAvatar/role | 이름16/24/700, avatar15/700. role 배지10/12/500, neutral 또는 brand tint. identityLine에 flexWrap wrap/rowGap4px, minWidth0 유지 |
| meta/mail | 12/16/400, Foreground3, 이메일 ellipsis 유지 |
| close |32px,controlRadius4,Foreground2,기존 aria/클릭 유지 |
| tabs/tab/tabContent | grid 겹침 구조와 tabClassNames.content 슬롯 선택자 보존; 높이38px,14/20/500. 일반 Foreground3, hover Foreground1, active BrandForeground1/하단 BrandStroke1 2px/700. content 슬롯의 기본·enabled:hover·enabled:active와 active 클래스 모두 같은 토큰으로 변경 |
| count | BrandBackground/ForegroundOnBrand,10/12/700,기존17px 배지 |
| body | flex1/minHeight0/overflowY auto,기존padding12px14px 유지. Background2 |
| notice | 정보 안내이므로 BrandBackground2/BrandForeground2/BrandStroke1,cardRadius6,meta12/16 |
| footer/version/logout | Background1/Stroke2,version12/16/Foreground3. logout minHeight28px,height auto,meta12/16/500,controlRadius4,중립 hover |

**Execution Flow / Logic**

1. Precondition & Validation: T01 theme scope가 sidebar에 적용되어 있어야 한다. 이전 red 재정의가 보이면 전역 Provider를 수정하지 말고 scope 위치를 확인한다.
2. Core Processing: 위 표대로 style slot을 바꾸고 direct hex를 의미 토큰으로 교체한다. fontFamily는 root/Fluent 슬롯까지 명시하여 button 기본 서체가 섞이지 않게 한다.
3. Error & Exception Handling: 긴 이름·메일·부서와 좁은 창은 minWidth0/ellipsis/wrap, 긴 본문은 body 스크롤로 처리한다. Popup의 inline/trapFocus/above positioning·overflow 경계를 바꾸지 않는다.
4. State Transition & Return: closeAndFocus, navigate, openTokenModal의 requestAnimationFrame, profile key, TabList value, aria-labelledby/controls, token 반환 포커스는 그대로다. 로그아웃 링크와 미리보기 안내를 유지한다.

### I02. 일반·알림·환경 설정 탭

- Related Files:
  - `components/profile/ProfileGeneralTab.tsx` :: `useStyles`, `ProfileGeneralTab` — 일반 카드; modify
  - `components/profile/ProfileNotificationsTab.tsx` :: `useStyles`, `ProfileNotificationsTab` — 알림; modify
  - `components/profile/ProfilePreferencesTab.tsx` :: `useStyles`, `ProfilePreferencesTab` — 환경설정; modify
  - `config/profile-preview.ts`, `lib/profile-preview.ts`, `lib/token-preview.ts` — 상태/계산/fixture 계약; read-only

#### Details

**Signatures & Types**

```typescript
export default function ProfileGeneralTab(props: ProfileActionPanelProps): React.ReactElement;
export default function ProfileNotificationsTab(props: ProfileActionPanelProps): React.ReactElement;
export interface ProfilePreferencesTabProps { onNotice(message: string): void }
export default function ProfilePreferencesTab(props: ProfilePreferencesTabProps): React.ReactElement;
```

**Data & Schema Fields**

- `ProfilePreviewState`: previewRole:user|admin, selectedTab:general|notifications|preferences, notificationFilter:all|unread, notifications:ProfileNotification[], preferences:ProfilePreferences, tokens:TokenPreviewState. 모두 기존 reducer에서 관리하고 UI는 dispatch만 한다.
- `ProfileNotification`: id/kind/title/description/timeLabel:string( kind는 ai|comment|deadline|token ), unread:boolean, targetScreen:SidebarScreen|null. null이면 기존 token 모달/notice 분기 유지.
- `ProfilePreferences`: comments/reviews/deadlines/aiJobs/tokenWarnings/email:boolean; digest:off|daily|weekly; startScreen:pipeline|write; editorView:doc|slide; listView:table|board. 실제 서버 알림 설정이 아닌 미리보기 상태다.
- `PROFILE_TOKEN_USAGE={used:72400,limit:100000,warningThreshold:70}`, workCounts와 최초 seed는 수정하지 않는다. 상태 unavailable일 때 `—` 표시도 보존한다.

| 파일/slot | 정확한 변경 |
| --- | --- |
| 공통 root/card/heading | gap12, padding12, Background1/Stroke2/cardRadius6; heading14/20/700, Foreground1; 본문14/20/400, meta/help/note12/16/Foreground3 |
| General percent/progress | 일반은 StatusSuccessForeground1/Background3, warning은 StatusWarningForeground1/Background3, over는 StatusDangerForeground1/Background3. track Background5, 기존height7·비율 계산 유지 |
| General stats/stat | 3열 유지, stat Background3/controlRadius4; label12/16/500, value14/20/700, tabular-nums |
| General actions/action/primary | actions를 1열 minmax(0,1fr)로 명시: 좁은 카드에서 14px 버튼 문구와 아이콘이 잘리지 않게 한다. action minHeight32/height auto/padding6px10px/body14/20/500/whiteSpace normal, icon14/gap5 유지. primary BrandBackground/hover/pressed 및 ForegroundOnBrand, disabled 중립 |
| General quick | 3열 유지, minWidth0. quickValue16/24/700, quickLabel12/16/500/whiteSpace normal/minHeight32, padding8px8px. Border2/hover BrandStroke1+BrandBackground2. red slot을 accent로 이름 변경, 값 BrandForeground1 |
| General adminLink/pending | adminLink14/20/500,중립 글자→hover brand, dashed Stroke2 유지. pending StatusWarningBackground1/Foreground1,meta12/16,cardRadius6 |
| Notifications toolbar/readAll | flexWrap wrap 추가,readAll minHeight28/height auto,meta12/16/500 |
| Notifications card/unread | card Background1/Stroke2/cardRadius6,padding12; hover Background2Hover/Stroke1. unread BrandBackground2/BrandStroke1,표시 점 BrandBackground. 기존 aria-label의 안 읽음 표시 유지 |
| Notifications icon kind | ai PurpleBackground2/PurpleForeground2, comment BrandBackground2/BrandForeground2, deadline StatusDangerBackground1/Foreground1, token StatusWarningBackground1/Foreground1; 기존 kind와 glyph14/box28 유지 |
| Notifications title/time/description/empty | title14/20/700,description14/20/400/Foreground2,time12/16/Foreground3,empty14/20/Foreground3. titleRow align-start, 필요 wrap, title minWidth0/overflowWrap anywhere |
| Preferences heading/label/rowLabel | heading14/20/700,label14/20/500,rowLabel12/16/500,width62 유지 |
| Preferences Select | root minHeight32,height auto,maxWidth150 유지; selectInput14/20/fontFamilyBase,기존 label/value/옵션 보존 |
| Preferences rows/note | 분리선 Stroke2, switchRow/digest 기존padding7px0; digest flexWrap wrap, row flexWrap wrap로 좁은 폭 지원, note12/16 |

**Execution Flow / Logic**

1. Precondition & Validation: 모든 탭은 같은 profile Context에 연결한다. 새로운 탭·메뉴·네트워크 동작을 만들지 않는다.
2. Core Processing: 스타일만 변경한다. 읽지 않음/역할/사용량 의미색을 표에 따라 구분한다. 일반/토큰 버튼의 로컬 red primary를 공유 토큰으로 대체한다.
3. Error & Exception Handling: 긴 label은 지정된 wrap/1열, 알림 empty는 기존 role=status 유지. 설정 변경 안내와 연결 전 기능 안내 문구를 지우지 않는다.
4. State Transition & Return: set-role, set-tab, set-notification-filter, mark-notification-read, mark-all-notifications-read, set-preference action과 기존 callback/권한 조건을 보존한다.

### I03. 공통 선택·스위치 컨트롤

- Related Files:
  - `components/ui/SegmentedControl.tsx` :: `useStyles`, `SegmentedControl` — segmented/chips; modify
  - `components/ui/ToggleSwitch.tsx` :: `useStyles`, `ToggleSwitch` — 알림 토글; modify

#### Details

**Signatures & Types**

```typescript
export interface SegmentedOption<T extends string> { value: T; label: string; disabled?: boolean }
export interface SegmentedControlProps<T extends string> {
  ariaLabel: string; options: readonly SegmentedOption<T>[]; value: T;
  onChange(value: T): void; disabled?: boolean; fullWidth?: boolean;
  className?: string; variant?: "segmented" | "chips";
}
export default function SegmentedControl<T extends string>(props: SegmentedControlProps<T>): React.ReactElement;
export interface ToggleSwitchProps {
  label: string; description?: string; checked: boolean;
  onChange(checked: boolean): void; disabled?: boolean; className?: string;
}
export default function ToggleSwitch(props: ToggleSwitchProps): React.ReactElement;
```

**Data & Schema Fields**

- 기존 default disabled=false/fullWidth=false/variant=segmented 및 state 없는 controlled 계약 유지. 사용처는 현재 프로필과 토큰 신청뿐이다. 토큰 chips는 T03에서 같은 범위 테마를 받는다.
- Segmented root Background3/cardRadius6/padding3/gap2. option/label controlRadius4, label minHeight28/height auto,padding4px8px,meta12/16/500,whiteSpace normal,textAlign center. selected Background1/Foreground1/weight700와 tokens.shadow2, 미선택 Foreground3.
- chips root padding0/gap6/wrap 유지. pill 반경14px 유지, minHeight28/height auto,12/16/500; selected BrandBackground2/BrandForeground2/BrandStroke1/700. 일반 border Stroke1/background1/Foreground2. 기존 `radioClassNames.label`의 checked+enabled 선택자와 disabled 확인을 보존한다.
- ToggleSwitch label14/20/500,description12/16/400/Foreground3. 기존 34×20 track,16px thumb,translateX14px,투명input hit/위치 유지. unchecked Background5, checked BrandBackground/hover/pressed,thumb ForegroundOnBrand, shadow2. disabled branch가 활성색 hover를 받지 않도록 현재 enabled 선택자를 보존한다.
- 키보드 포커스는 dadamUi.focusRing, forced-colors의 Highlight/CanvasText와 reduced-motion0ms 규칙은 보존한다. 색상만 바꾸고 Radio/Switch를 div로 재작성하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: generic T와 optional props 계약을 유지한다. radius는 pill/switch 예외와 일반 control을 구분한다.
2. Core Processing: UI 슬롯 선택자와 동작은 그대로 두고 토큰/글자/height를 위 규칙으로 변경한다.
3. Error & Exception Handling: disabled 선택/알 수 없는 옵션 value는 기존 guard가 막는다. 긴 label은 wrap, fullWidth의 flex1/minWidth0 유지.
4. State Transition & Return: 값 변경은 부모 callback으로만 전달하고 별도 로컬 상태나 저장소를 추가하지 않는다.

### I04. 기존 프로필 상태·탐색 회귀

- Related Files:
  - `tests/lib/profile-preview.test.ts`, `tests/lib/token-preview.test.ts`, `tests/components/preview-role-boundary.test.ts`, `tests/lib/comments/shell-ui.test.ts`, `tests/components/dadam-theme-scope.test.ts` — 기존 상태·역할·폼·포커스 회귀; read-only

#### Details

- 이 Task는 스타일과 wrap/height만 바꾸고 state reducer와 callback을 변경하지 않는다. 새 테스트 파일을 만들지 않고 기존 프로필 상태·역할·알림·설정·토큰 검증과 실제 AppShell/모달 포커스 테스트를 재사용한다.
- 정적 diff에서 Tab value/aria 연결, onOpenTokenDialog와 requestAnimationFrame, Switch/Radio의 enabled·disabled·checked 슬롯 선택자, 알림 읽음 callback, digest enum guard가 유지되는지 확인한다.
- style 수치를 복제하는 테스트는 만들지 않는다. 실제 프로필→토큰 modal→신청/Toast의 테마·포커스 연결은 구조가 바뀌는 T03에서 새 통합 사례로 검증한다.

## Acceptance Criteria

- [x] 진입 버튼부터 세 탭까지 같은 서체·neutral/brand 스타일이며 의미색은 경고/위험/성공으로 구분된다.
- [x] 긴 버튼 문구는 1열·wrap 규칙을 사용하며 348px 팝오버와 모바일 최대 크기/스크롤을 유지한다.
- [x] 탭·역할·알림·환경설정·기존 token 진입 및 포커스 계약이 보존된다.
- [x] 공통 Radio/Switch의 disabled·keyboard·forced-colors 동작을 보존하고 CSS 슬롯까지 토큰을 적용한다.
- [x] 아래 검증 통과. 다음은 T03이며 코멘트는 아직 수정하지 않는다.

## Validation

- `npm.cmd run test -- tests/lib/profile-preview.test.ts tests/lib/token-preview.test.ts tests/components/preview-role-boundary.test.ts tests/lib/comments/shell-ui.test.ts tests/components/dadam-theme-scope.test.ts` — 기존 상태·권한·DOM 연결/포커스 통과.
- `npm.cmd run typecheck` — 전체 타입 통과.
- `npx.cmd eslint components/profile/ProfileMenu.tsx components/profile/ProfileGeneralTab.tsx components/profile/ProfileNotificationsTab.tsx components/profile/ProfilePreferencesTab.tsx components/ui/SegmentedControl.tsx components/ui/ToggleSwitch.tsx` — 오류 없음.
- `git diff --check`, style diff 검토 — 400/500/700, font slots, 겹치는 Tab content grid 유지, 색상별 의미 검토.
- T01 이후 SSR/provider 변경이 없는 UI Task이므로 build는 T03 완료 관문에서 묶어 수행한다. 새 문제가 나오면 필요한 검증만 추가한다. 브라우저 검증은 제외한다.

## Commit Message

```text
feat(profile): dadam 스타일로 프로필과 공통 컨트롤 정비

Plan: 2026-10-30-dadam-look-and-feel
Phase: P01-ui
Task: T02-profile-controls

- 프로필 진입 버튼과 전체 탭의 서체 및 상태 표현 통일
- 공통 선택 컨트롤과 스위치를 정비하고 기존 상태 흐름 검증
```

- 이 Task의 UI 6개·진행 문서만 명시 stage. 이전 미커밋 문서를 일괄 포함하지 않는다.
- 완료 시 이 Task done, phase done2/4, current T03-token-dialogs. 실제 검증 결과와 한국어 커밋 해시를 기록한다.

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `git log -1 --format=%h --grep='Task: T02-profile-controls'`

## Execution Result

- 프로필 전체 탭과 Radio/Switch의 neutral·brand·상태색, 서체, 줄바꿈과 최소 높이를 적용했다. 상태/권한/콜백은 보존했다.
- 기존 회귀 5개 파일 100개 테스트, typecheck, 대상 6개 파일 ESLint, git diff --check 통과. 브라우저 검증 제외.
- 학습: Fluent Tab의 content 슬롯은 겹치는 grid 구조와 함께 색/굵기를 지정해야 한다. Switch의 enabled 선택자와 forced-colors 규칙을 유지하여 비활성 상태에 활성 hover가 적용되지 않게 했다.
- 범위 밖 인접 문제: 특이사항 없음. 다음 T03에서 포털 모달과 Toast를 같은 테마 범위에 연결한다.
