# Task: T02 공용 모달과 사용량·토큰 신청 화면

## Status: pending

## Goal

프로필에서 사용량 상세 분석과 토큰 추가 신청을 열고, 두 화면을 전환하며 검증된 신청을 로컬 승인 대기로 등록할 수 있게 한다. HTML의 구성과 스타일을 재현하고 접힌 사이드바·모바일·키보드 동작까지 완성한다.

## Decision Summary

- Plan: 2026-10-27-token-usage-request-modals / Phase: P01-token-modals. 선행 T01 완료가 전제다. 한 개 Fluent UI Dialog의 내용을 바꾸며 사용량760px/신청560px을 적용한다.
- 설치된 `@fluentui/react-components` 9.74.11, icons 2.0.344, Griffel 1.7.8과 TSX 내부 makeStyles를 사용한다. 새 의존성·CSS Modules·API·DB·Azure 작업은 없다.
- HTML: `C:/Users/김세정/Downloads/KPC_제안서작성AI_mock-up.html`, SHA256 `1476c88df1ec5263f91a5549039f4c9804b044861ea5147461b544ca819841db`. `openUsage/drawUsage/openTokReq/drawTokReq`, 공통 modal/us-/tr- CSS를 기준으로 한다. 원본 스크립트를 앱에 삽입하지 않는다.

## Prerequisite Contract

T01에서 제공하는 다음 계약을 사용한다. 이 Task만 읽어도 데이터 흐름을 알 수 있도록 필요한 필드를 명시한다.

```typescript
// config/token-preview.ts
type TokenDialogView = "usage" | "request";
type TokenAmountChoice = "30" | "50" | "100" | "custom";
type TokenProjectId = "mois" | "edu" | "sample" | "outside";
interface TokenRequestDraft {
  amountChoice: TokenAmountChoice; customAmountK: string;
  projectId: TokenProjectId; reason: string;
}
interface TokenRequestErrors { amount?: string; project?: string; reason?: string; form?: string }
interface TokenRequestPreview {
  id: string; requesterName: string; department: string | null;
  amountK: number; amountTokens: number; projectId: TokenProjectId;
  projectName: string; reason: string; status: "pending"; createdAt: string;
}
// TOKEN_USAGE_SNAPSHOT: periodLabel,elapsedDays,daysInMonth;
// daily[{day,tokens}],byProject[{id,name,tokens}],byFeature[{id,name,percent}],
// recent[{id,timeLabel,projectName,operation,tokens}] — 모두 readonly 배열.
// TOKEN_PROJECT_OPTIONS[{id,name}], TOKEN_REASON_PRESETS 문자열 배열.
// ProfilePreviewState.tokens = {dialogView,requestDraft,requests}.
// ProfilePreviewAction에 {type:"token",action:TokenPreviewAction} 포함.
// TokenPreviewAction: open(view),close,set-amount(choice),set-custom-amount(value),
// set-project(projectId),set-reason(value),submit(requestId,submittedAt,requesterName,department).
// useProfilePreview()의 기존 필드에 추가된 API 계약:
interface ProfileTokenDialogApi {
  openTokenDialog(view: TokenDialogView, returnFocusTo?: HTMLElement | null): void;
  closeTokenDialog(options?: { restoreFocus?: boolean }): void;
  submitTokenRequest():
    | { ok: true; request: TokenRequestPreview }
    | { ok: false; errors: TokenRequestErrors };
}
```

`lib/token-preview.ts`의 validateTokenRequestDraft(draft,currentLimit), getRequestedTokenAmountK(draft), getLatestPendingTokenRequest(requests), estimateMonthEndUsage(used,elapsedDays,daysInMonth), getUsageBarPercent(value,maximum)을 사용한다. `lib/profile-preview.ts`의 formatTokenCount와 getProfileTokenSummary도 재사용한다. 프로필 이름·부서는 Provider의 profile.name/department를 사용하며 null 부서는 subtitle에서 생략한다.

기준값은 `config/profile-preview.ts`의 PROFILE_TOKEN_USAGE: used72400,limit100000,warningThreshold70. T01 snapshot의 고정 기간은 `2026.10.01 ~ 10.20`, 경과20일/31일, 일별20개 합계72400, 프로젝트4개 합계72400, 기능5개 합계100%, 최근6행이다. 요청 초기50K·사유빈값·프로젝트mois, 재진입 때 프로젝트만 유지한다. 유효한 K 정수/허용 프로젝트/trim2자 이상 사유만 제출되며 새로고침 시 초기화한다.

## Implementation

### I01. 공용 ModalFrame과 요청량 선택 UI

- Related Files:
  - `components/ui/ModalFrame.tsx` :: `ModalFrame`, `ModalFrameProps` — 범용 Dialog 틀; new
  - `components/ui/SegmentedControl.tsx` :: `SegmentedControlProps`, `SegmentedControl`, `useStyles` — chips 변형; modify
  - `components/providers/FluentUiProvider.tsx` :: 기존 테마/SSR renderer — 그대로 재사용; read-only

#### Details

**Signatures & Types**:

```typescript
export interface ModalFrameProps {
  open: boolean;
  title: string;
  subtitle?: string;
  width?: number; // 기본560, 토큰 화면은560 또는760
  contentKey: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose(): void;
}
export default function ModalFrame(props: ModalFrameProps): React.ReactElement;
// 기존 generic props 모두 유지하고 선택 속성만 추가
export interface SegmentedControlProps<T extends string> {
  ariaLabel: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  variant?: "segmented" | "chips"; // 기본segmented
}
```

**Data & Schema Fields**:

- ModalFrame은 Token/프로필 상태를 모르는 controlled UI다. 열림·제목·본문·푸터는 호출자가 소유한다. width 기본560, subtitle 미지정 시 subtitle DOM과 aria-describedby를 생략한다. contentKey는 내용 전환 시 포커스/스크롤 초기화 키다.
- React useId()로 heading/description ID를 만들며 인자를 넘기지 않는다. 제목 ref는 HTMLHeadingElement, 본문 ref는 HTMLDivElement. 새로고침 후에도 ID를 임의 난수로 만들지 않는다.

**Execution Flow / Logic**:

1. `<Dialog open={open} modalType="modal" onOpenChange=...>` 안의 단일 DialogSurface를 사용한다. 외부에서 열기 때문에 DialogTrigger는 필요 없다. openChange의 open=false만 onClose에 위임한다. Surface는 기본 Portal을 사용한다. 배경 클릭·닫기 버튼·Escape는 모두 같은 onClose로 수렴한다.
2. Surface에 열린 동안만 `data-modal-frame`을 두어 모바일 사이드바가 찾을 수 있게 한다. DialogTitle로 제목, 별도 subtitle, 닫기 Button(DismissRegular, aria-label=`모달 닫기`), DialogContent 본문, footer를 배치한다. ARIA title/description 연결과 modal 포커스 트랩은 Fluent Dialog를 사용한다.
3. 기본 Surface의 maxWidth600/padding24를 덮어쓴다. width는 props의 px값, maxWidth=`calc(100vw - 32px)`, maxHeight=`min(88vh, calc(100svh - 32px))`, padding0, boxSizing border-box, display flex/column, overflow hidden, 흰 배경, 1px #e6e7eb border, radius16. Fluent의 기본 fixed/inset/margin 중앙 배치를 유지하며 transform을 중복 추가하지 않는다. 작은 화면의 Fluent 기본 maxWidth/padding도 같은 제한으로 재정의한다.
4. 그림자 `0 18px 48px rgba(16,17,20,.16),0 2px 6px rgba(16,17,20,.06)`. backdrop 배경rgba(17,18,22,.28), z4000/Surface4300. 헤더 padding16px18px12px, gap10, title14px800/letterSpacing-.01em, subtitle11px #74747d. 닫기32×32, title 영역flex1/minWidth0. 긴 subtitle은 줄바꿈한다.
5. 본문 padding4px18px16px, flex1/minHeight0/displayflex/column/gap12, overflowYauto/overflowXhidden. scrollbarWidthnone와 ::-webkit-scrollbar displaynone로 바를 숨기되 휠·터치·키보드 스크롤을 보존한다. footer padding12px18px/gap8/borderTop1px#eff0f3/bg#fcfcfd/flexShrink0, 좁을 때 버튼이 잘리지 않게 flexWrap 허용.
6. open 또는 contentKey 변경 시 다음 RAF에서 제목(tabIndex=-1)에 포커스하고 본문 scrollTop=0. cleanup 때 RAF 취소. Tab/Shift+Tab 트랩은 Fluent에 맡긴다. Surface onKeyDownCapture에서 Escape만 preventDefault/stopPropagation 후 onClose를 호출해 바깥 모바일 메뉴를 함께 닫지 않는다. 그 외 키를 차단하지 않는다. textarea Enter는 줄바꿈이다.
7. 수동 body.style.overflow 변경은 추가하지 않는다. 설치된 Fluent Dialog의 body 잠금은 클래스 방식이며 기존 AppShell의 inline overflow 잠금과 함께 동작하게 한다. 모달이 닫힌 뒤 메뉴가 열려 있으면 body는 계속 잠겨 있어야 한다.
8. SegmentedControl의 기본 variant는 기존 gray rail·white 선택·높이26px을 그대로 유지한다. chips는 root 투명배경/padding0/gap6/flexWrap, option·label 높이28px/radius14/padding0 10px/font11.5px650/border1px#dddde2/글자#55585f, 선택 시 border#d7192f/bg#fff8f9/글자#c91c2b/weight800/그림자없음. input의 checked/unchecked→label 색상 selector도 chips용으로 분리하여 기존 기본 selector가 빨간 글자를 덮지 않게 한다.
9. 두 variant 모두 실제 Radio input/RadioGroup을 남겨 화살표·Space·이름·checked 상태를 보존한다. 장식 indicator만 숨긴다. disabled·focus outline·forced-colors·fullWidth 기존 계약도 유지한다. 전용 토큰 선택 컴포넌트를 중복 추가하지 않는다.

### I02. 사용량 분석 패널

- Related Files:
  - `components/profile/token/TokenUsagePanel.tsx` :: `TokenUsagePanel`, `useStyles` — 사용량 본문; new
  - `config/token-preview.ts` :: `TokenUsageSnapshot`, `TOKEN_USAGE_SNAPSHOT` — 데이터; read-only
  - `lib/token-preview.ts` :: 예측/막대 계산 — 재사용; read-only
  - `lib/profile-preview.ts` :: 표시 포맷/사용량 요약 — 재사용; read-only

#### Details

**Signatures & Types**:

```typescript
export interface TokenUsagePanelProps {
  snapshot: Readonly<TokenUsageSnapshot>;
  used: number;
  limit: number;
}
export default function TokenUsagePanel(props: TokenUsagePanelProps): React.ReactElement;
```

**Data & Schema Fields**:

- 네트워크/로컬 상태가 없는 표시 컴포넌트다. recent의 tokens는 Intl.NumberFormat("ko-KR")로3120→3,120. KPI·프로젝트 합계는 formatTokenCount 사용. chart 접근성 레이블과 tooltip은 실제 토큰을 K로 나타낸다.

**Execution Flow / Logic**:

1. KPI 순서: 사용72.4K·72%, 잔여27.6K, 개인 한도100K, 월말 예상112K·한도 초과 예상. estimate112220>limit인 마지막 카드는 border#f3d19c/bg#fffaf0/글자#b0620a. 4열 gap8, 카드border#e6e7eb/radius10/padding10px12px, label10.5px700/value18px900. max-width600px에서는2열.
2. 일별 사용량 카드: 제목12px850, `단위 K Token` 보조문구. chart 높이110px/gap4/20열flex1/minWidth0, 막대maxWidth18px/상단반경3/bg#d7192f/opacity.85 hover1. 최대 일별값8600을 기준으로 비율 계산, 양수는 최소4%,0은0. label 영역12px·font9.5px,1·5·10·15·20일만 표시한다. 각 일자의10.dd·K값을 title/aria-label로 제공하고 색상만으로 정보를 전달하지 않는다. 그래프는 CSS로 만들고 canvas/외부 차트 패키지를 추가하지 않는다.
3. 프로젝트별/기능별 두 카드는2열 gap12, max-width600px에서1열. 카드border1#e6e7eb/radius12/padding12px14px/minWidth0. rowfont11.5, rowgap8/marginBottom3, 항목간marginBottom8. 긴 이름은 minWidth0/ellipsis/title.
4. 프로젝트 막대는72,400 합계 대비 비율로 초록#15985a. 기능 막대는 최대32 대비 비율로 #303238. 표시 텍스트는22/32/18/16/12% 그대로다. 기능 막대를100 기준으로 바꾸면 원본 길이와 달라지므로 구분한다. 막대 트랙 높이7/bg#eff0f3/radius4, 폭은0~100 clamp.
5. 최근 사용 내역은 시맨틱 table/caption(시각 숨김 허용), th scope col: 일시·프로젝트·작업·Token, 6행. table width100%/tableLayoutfixed/borderCollapsecollapse, 헤더10px800/padding9px12px/bg#fafafa/borderBottom#e6e7eb, 셀12px/padding11px12px/borderBottom#eff0f3. 첫열110px/마지막80px, 마지막오른쪽정렬·숫자tabular-nums. max-width600px에서는첫열70px/마지막50px/padding8px4px/font10px, 중간 두 열은 남은 폭을 나눈다. 모든 셀 minWidth0/overflowhidden/ellipsis/nowrap, 전체 문자열은 title 및 DOM 텍스트로 유지한다. 표 전체에 가로 스크롤을 만들지 않는다.
6. 잘못된 데이터에서 비율 NaN/Infinity를 CSS에 넣지 않는다. 계산 helper의0 반환과 기존 summary unavailable 표시 `—`를 사용한다. 배열이 비어 있으면 해당 카드에 `내역이 없습니다`를 표시하고 max 계산은0을 포함해 수행한다. 정적 예시이므로 별도 로딩/재시도 UI는 만들지 않는다.

### I03. 신청 폼과 제출 검증

- Related Files:
  - `components/profile/token/TokenRequestPanel.tsx` :: `TokenRequestPanel`, `TokenRequestPanelProps` — 신청 본문 폼; new
  - `components/ui/SegmentedControl.tsx` :: chips — 요청량 선택; read-only after I01
  - `config/token-preview.ts` :: 선택지·예시·초안 타입 — 재사용; read-only

#### Details

**Signatures & Types**:

```typescript
type TokenDraftAction = Extract<TokenPreviewAction, {
  type: "set-amount" | "set-custom-amount" | "set-project" | "set-reason";
}>;
export interface TokenRequestPanelProps {
  formId: string;
  draft: TokenRequestDraft;
  latestPending: TokenRequestPreview | null;
  used: number; limit: number;
  errors: TokenRequestErrors;
  onDraftAction(action: TokenDraftAction): void;
  onFieldBlur(field: "amount" | "project" | "reason"): void;
  onSubmit(event: React.FormEvent<HTMLFormElement>): void;
}
export default function TokenRequestPanel(props: TokenRequestPanelProps): React.ReactElement;
```

**Data & Schema Fields**:

- 폼 입력은 draft를 controlled로 사용하며 DOM 자체에 별도 초안을 저장하지 않는다. errors는 컨트롤러가 touched 검증 결과를 전달한다. formId는 컨트롤러 useId에서 생성한다.
- 초안 기본값50/빈custom/빈사유/직전프로젝트, null 허용은 latestPending뿐. K단위 입력은 type=text/inputMode=numeric를 사용해 지수/소수/음수를 검증 규칙으로 일관되게 거절한다.

**Execution Flow / Logic**:

1. form id=formId, noValidate, onSubmit 위임, displayflex/column/gap12/minWidth0. Field/Input/Select/Textarea/Button/ProgressBar는 Fluent UI를 사용한다. 필드 label/aria-invalid/에러연결을 갖춘다. 주요 입력 높이32/border#dddde2/radius8/font12, Textarea rows3/padding9px10px/lineHeight1.6/resizevertical/minWidth0/maxWidth100%.
2. 현재 사용 줄: bg#f7f8fa/radius10/padding10px12px/font12/gap10; 현재 사용72.4K/100K와 진행바(임계70%부터warning), 신청 후 한도 표시. 요청량50이면150K. 직접 입력이 무효이거나 합산이 안전하지 않으면 예상한도 `—`. 이 표시는 **실제 한도 증가가 아니라 예상치**이며 대기 신청을 합산하지 않는다. 좁은 화면에서는 flexWrap해 줄을 나눈다.
3. latestPending이 있으면 `이미 {amountK}K 신청이 승인 대기 중입니다. 새로 신청하면 함께 검토됩니다.`를 clock아이콘과 함께 bg#fff7e8/글자#9a5b00/radius8/padding6px9px/font11px700로 표시한다. 길면 줄바꿈하고 가로폭을 늘리지 않는다. 없어도 고정 빈 공간을 만들지 않는다.
4. 추가 요청량: SegmentedControl<TokenAmountChoice> variant chips/ariaLabel `추가 요청량`, options30/+30K,50/+50K,100/+100K,custom/직접 입력. custom을 선택하면 input width110/height30/placeholder `예: 70`과 `K Token`을 표시하고 다음 RAF에 input으로 포커스한다. 입력 중 전체 패널을 key로 재마운트하지 않는다. custom 원문은 같은 열림에서 preset을 오가도 유지한다.
5. 사용할 프로젝트: Select value=projectId, 옵션은 TOKEN_PROJECT_OPTIONS의 3개+프로젝트 외 사용. controlled change는 목록에서 유효 ID인지 확인한 뒤 set-project한다. 실제 멤버십/API 조회를 흉내 내지 않는다.
6. 신청 사유 required: placeholder `예) 2차 검수 의견 반영으로 3장 기술 부문 전체 재작성이 필요합니다`. 아래 예시3개는 type=button의 chips 스타일 버튼(font11)이며 클릭하면 set-reason으로 현재 문장을 교체한다. append하지 않는다. 같은 줄에 들어가지 않으면 wrap한다.
7. 승인자 줄: PeopleRegular/`승인자`/굵은`운영 정책 관리자`/보조`· 운영 정책 › 토큰·비용 관리에서 처리`. flexWrap으로 모바일 대응. 아직 승인 링크/버튼으로 만들지 않는다.
8. 오류는 Field validationMessage로 표시하고 form 오류는 role=alert로 표시한다. 이 컴포넌트는 제출 결과 Toast/닫기/요청 추가를 직접 수행하지 않는다. 서버 오류 경로는 없다.

### I04. 단일 모달 컨트롤러와 프로필 진입 연결

- Related Files:
  - `components/profile/token/TokenDialogs.tsx` :: `TokenDialogs` — 화면/제출/Toast 제어; new
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` — 컨트롤러 단일 마운트; modify
  - `components/profile/ProfileMenu.tsx` :: `ProfileActionPanelProps`, `ProfileMenu` — 팝오버→모달 전환; modify
  - `components/profile/ProfileGeneralTab.tsx` :: `ProfileGeneralTab`, `useStyles` — 두 버튼·대기 안내; modify
  - `components/profile/ProfileNotificationsTab.tsx` :: `ProfileNotificationsTab` — token 알림 연결; modify
  - `components/profile/ProfilePreviewProvider.tsx` :: T01 API — 재사용; read-only
  - `components/layout/AppShell.tsx` :: `menuOpen` effect의 `onKeyDown` — 모달에 키보드 입력 양보; modify

#### Details

**Signatures & Types**:

```typescript
export default function TokenDialogs(): React.ReactElement;
export interface ProfileActionPanelProps {
  onNavigate(): void;
  onNotice(message: string): void;
  onOpenTokenDialog(view: TokenDialogView): void;
}
```

**Data & Schema Fields**:

- 컨트롤러는 `state.tokens.dialogView/requestDraft/requests`, profile, T01 Provider API를 읽는다. 모달 데이터를 별도 useState로 복제하지 않는다. local state는 touched `{amount:false,project:false,reason:false}`와 formError(string|null)만 둔다. form/toaster ID는 React useId()를 사용한다.
- 동일 사용자이므로 일반/관리자 역할 전환 시 tokens 목록을 그대로 유지한다. previewRole은 실제 승인 권한이 아니다.
- 기존 `ProfileActionPanelProps`는 General/Notifications가 사용하고 Preferences는 onNotice만 받는다. 두 기존 패널 호출부에 콜백을 모두 전달한다.

**Execution Flow / Logic**:

1. 인증 레이아웃의 requireAppAccess 호출을 보존한다. 구조를 FluentUiProvider → ProfilePreviewProvider → (AppShell, TokenDialogs 형제)로 만든다. 컨트롤러를 NavSidebar/ProfileMenu 안에 넣지 않는다. ProfileMenu는 pathname/isOpen/isCollapsed key에 따라 재마운트되므로 모달까지 하위에 두면 사라지거나 포커스 복귀 대상이 끊긴다.
2. ProfileMenu의 모달 열기 콜백은 setOpen(false)/setNotice(null), triggerRef.current를 캡처한 다음 RAF에서 openTokenDialog(view,target)를 호출한다. 기존 closeAndFocus를 호출하면 새 모달 포커스를 프로필로 빼앗을 수 있으므로 이 경로는 분리한다. 예약 RAF ID는 ref로 보관하고 재요청/컴포넌트 unmount 시 취소한다. 여기서는 onNavigate를 부르지 않아 모바일 메뉴도 유지한다.
3. General의 사용량 상세 분석→usage, 토큰 추가 신청→request. 기존 준비 중 notice만 교체한다. 내 작업/역할전환/관리자 링크는 그대로 유지한다. 최신 pending이 있으면 stats와 버튼 사이에 `추가 신청 {amountK}K · 관리자 승인 대기`를 HTML pf-req.wait 스타일로 넣는다. 이전에 삭제한 `사용량·작업 수는 시연 데이터입니다.` 문구나 이를 대체하는 상시 설명을 추가하지 않는다.
4. Notifications의 token 종류·targetScreen=null인 항목은 읽음 처리 후 usage를 연다. 기존 targetScreen 링크와 모두 읽음 동작은 유지한다. token 외 target 없는 항목은 기존 안내 경로를 보존한다.
5. TokenDialogs는 ModalFrame을 한 번 렌더한다. open=view!==null, width=view usage?760:560, contentKey=view 또는 closed. usage 제목 `내 AI Token 사용량`, subtitle `[기간,profile.name,profile.department].filter(Boolean).join(" · ")`. request 제목 `토큰 추가 신청`, subtitle `운영 정책 관리자가 승인하면 이번 달 개인 한도에 바로 더해집니다`.
6. usage 본문TokenUsagePanel, footer 오른쪽닫기/primary토큰 추가 신청(AddRegular). 닫기 closeTokenDialog(), 신청 openTokenDialog("request") 인자 생략으로 원래 복귀 대상을 유지한다. request 본문TokenRequestPanel, footer 왼쪽사용량 보기(ChevronLeftRegular)·spacer·취소·primary신청하기. 보기 openTokenDialog("usage"), 취소 closeTokenDialog(). 좁은 화면에서도 footer 모든 버튼 접근 가능하게 wrap한다.
7. request 진입 시 touched/formError 초기화. 필드 blur 시 touched 설정. validateTokenRequestDraft(draft,limit)의 오류 중 touched인 항목만 표시하며, onDraftAction에서 formError를 비우고 dispatch({type:"token",action})한다. submit button은 validation.ok일 때만 활성화. 버튼을 form 밖 footer에 둘 때 `form={formId}`와 type=submit을 반드시 설정해 input Enter 제출이 작동하게 한다. reason의 Enter는 줄바꿈이다.
8. form submit은 preventDefault 후 재검증한다. 오류면 모든 필드 touched=true/오류표시·첫 오류 입력으로 포커스. 성공 조건이면 Provider submitTokenRequest() 호출. 실패 결과는 formError/필드오류로 전달하며 모달을 닫거나 Toast를 띄우지 않는다. Provider의 동기 ref 잠금이 더블클릭/연속 Enter를 막는다. 성공일 때만 모달이 닫히고 `토큰 +{amountK}K 신청을 미리보기로 등록했습니다 · 관리자 승인 대기` Toast를 보여준다. used/limit는 그대로다.
9. 컨트롤러에 Fluent Toaster/useToastController(toasterId)/Toast/ToastTitle를 둔다. position bottom-end, timeout3500, 성공intent success. 팝업이 이미 닫혀 기존 onNotice는 보이지 않으므로 사용하지 않는다. 모바일 Toast maxWidth=`calc(100vw - 32px)`/줄바꿈으로 가로 스크롤을 방지한다. 글로벌 Toast Provider를 새로 만들지 않는다.
10. usePathname과 previousPathname ref로 실제 경로 변경을 감지하면 열린 모달에 closeTokenDialog({restoreFocus:false})를 호출한다. 최초 mount에서는 닫지 않는다. 이는 요청 목록을 지우지 않고 AppShell의 새 본문 포커스 이동을 보존한다.
11. AppShell의 기존 document keydown 첫 가드에 `document.querySelector("[data-modal-frame]")`를 추가한다. defaultPrevented 또는 기존 sidebar 내부 data-profile-popover 또는 열린 모달이면 return. Tab/Escape의 나머지 알고리즘·menuOpen effect·body inline overflow 복원은 변경하지 않는다. 실제 모달 Portal은 사이드바 밖이므로 sidebar.querySelector로 찾으면 실패한다.
12. 이전 미커밋 스타일을 보존한다. NavSidebar 구분선 변경을 이 Task에서 만지지 않는다. ProfileMenu의 탭 root grid/숨은 Fluent 예약 label 배치, 탭 선택글자#c91c2b/밑줄#d7192f, 관리자 avatar/badge#e60012, 팝업 avatar#303238/흰글자, initials 슬롯 상속, scrollbar 숨김을 유지한다. .module.css를 되살리거나 Fluent 내부 label을 display:flex로 단순 변경하지 않는다.

### I05. 사용자 문서와 검증

- Related Files:
  - `README.md` :: 사이드바 UI와 메뉴 미리보기 — 실제 제공 범위 갱신; modify
  - `tests/lib/token-preview.test.ts` :: T01의 도메인 계약 — 회귀 실행; read-only unless actual defect fixed
  - `tests/lib/profile-preview.test.ts`, `tests/components/preview-role-boundary.test.ts` :: 기존 프로필 경계 — 회귀 실행; read-only
  - `components/ui/ToggleSwitch.tsx`, `components/profile/ProfilePreferencesTab.tsx` :: 기존 공유 컨트롤 소비자 — 회귀 확인; read-only

#### Details

- README의 `사용량 상세 분석·토큰 신청은 준비 중 안내만 표시`를 새 동작으로 교체한다. 고정 예시 분석·로컬 pending·새로고침 초기화·실제 승인/DB 미연결·실제 한도 미증가를 명확히 적는다. 기존 인증 안내와 화면 기본값 미연결 설명은 유지한다. 예시 데이터 설명은 문서에 두고 삭제한 팝업 문구를 재도입하지 않는다.
- 이 UI 연결은 실제 브라우저 검증으로 확인한다. DOM 트랩·Portal·Fluent 슬롯 색상·레이아웃은 node SSR만으로 입증할 수 없다. 새 테스트 라이브러리/브라우저 패키지를 설치하거나 CSS 구현값을 그대로 복제한 테스트를 추가하지 않는다.
- 브라우저는 설치된 Chrome/Edge의 별도 임시 프로필을 이용한다. 자동화가 필요하면 기존 도구/CDP를 사용하고 사용자 프로필·탭을 건드리지 않는다. 임시 스크립트/스크린샷은 저장소 밖에 둔다. 확인에 사용한 뷰포트와 캡처/콘솔 오류 여부를 이 Task의 실행 기록에 남긴다.

## Acceptance Criteria

- [ ] 일반 두 버튼과 token 업무 알림에서 올바른 모달을 열며 팝오버는 닫힌다.
- [ ] 사용량 화면은 KPI4·일별20·프로젝트4·기능5·최근6행이며 일별/프로젝트합계72.4K·예상112K가 일치한다.
- [ ] 760px/560px 폭의 단일 Dialog가 전환되고 헤더/푸터 접근성·포커스가 유지된다.
- [ ] 요청량 선택·직접입력·프로젝트·사유예시·검증·Enter/취소가 명세대로 작동한다.
- [ ] 정상 제출 한 번당 pending 한 건만 추가되고 프로필/재진입에 표시되며 실제 한도는100K다.
- [ ] 320px/390px/짧은 높이에서도 가로 스크롤·보이는 스크롤바 없이 본문/푸터에 접근한다.
- [ ] 모달 Escape는 모달만 닫고, 모바일 메뉴 잠금·포커스 복귀·경로 이동이 정상이다.
- [ ] 기존 프로필 색상·탭 중앙정렬·스크롤바 숨김·공용 컨트롤 기본모양·서버 가드와 사용자 미커밋 변경을 보존한다.

## Validation

저장소 루트 PowerShell, 실행 단계에서만 실행한다. 새 의존성 설치와 Azure 연결은 필요 없다.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
$tokenPlanPreviousAuth = [Environment]::GetEnvironmentVariable('AUTH_ENABLED', 'Process')
try {
  $env:AUTH_ENABLED = 'false'
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw '토큰 모달 production build 실패' }
} finally {
  if ($null -eq $tokenPlanPreviousAuth) {
    Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue
  } else {
    $env:AUTH_ENABLED = $tokenPlanPreviousAuth
  }
}
git diff --check
```

build와 typecheck를 병렬 실행하지 않는다. Next 생성 타입이 사용 중일 수 있다. .env 파일은 수정하지 않는다. 실제 브라우저 검증용 서버가 없으면 별도 프로세스 터미널에서 다음으로 실행하고, 종료 후 이 작업이 띄운 서버만 종료한다.

```powershell
$tokenPreviewPreviousAuth = [Environment]::GetEnvironmentVariable('AUTH_ENABLED', 'Process')
try {
  $env:AUTH_ENABLED = 'false'
  npm.cmd run start -- --hostname 127.0.0.1 --port 3100
} finally {
  if ($null -eq $tokenPreviewPreviousAuth) {
    Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue
  } else {
    $env:AUTH_ENABLED = $tokenPreviewPreviousAuth
  }
}
```

브라우저는 `http://127.0.0.1:3100`을 사용한다. 이미 작업용 서버가 같은 주소에서 실행 중이면 재사용하고 중복 시작하지 않는다. 포트 충돌 시 프로세스를 임의 종료하지 말고 비어 있는 포트를 정해 기록한다.

| 검증 | 조작과 기대 결과 |
| :--- | :--- |
| 데스크톱 1440×900 | 펼침/접힘의 프로필에서 각각 진입, Surface 1개, 실제 폭760/560, 원본 색/간격 일치, 콘솔/hydration 오류 없음 |
| 전환/기본값 | 사용량→신청은 50K/빈 사유. 프로젝트 변경·사유 입력→사용량→신청은 프로젝트만 유지. 제목으로 포커스 |
| 입력 검증 | 30/50/100/직접70, 0/-1/1.5/1e3/빈칸/과대값, 사유1자/공백/2자, 프로젝트 외 사용, 예시 교체, disabled 상태와 오류/ARIA 확인 |
| 제출/대기 | 기본50K+사유로 제출, 연속 클릭/Enter에도 1건, 토스트에 미리보기 표시, 프로필에 `추가 신청 50K · 관리자 승인 대기`, used72.4K/limit100K 유지 |
| 후속 신청 | 재진입에 기존 대기 안내, 두 번째 정상 신청 허용, 최신 배너, 경로 이동 후 목록 유지/전체 새로고침 시 대기 없음 |
| 키보드 | 열면 제목 포커스, Tab/Shift+Tab 모달 내 순환, custom 선택 시 입력 포커스, input Enter 제출/textarea Enter 줄바꿈, Escape/취소/X/배경 클릭 후 프로필로 복귀 |
| 모바일 390×844·320×568 | 메뉴→팝오버→모달, 모달 하나만 열림, 가로 넘침0/스크롤바 숨김, 표 ellipsis/폼 wrap/푸터 접근 가능 |
| 짧은 높이 1024×500 | 본문 세로 스크롤로 모든 내역/사유 접근, 헤더/푸터 남음, 휠/터치/PageDown 등 스크롤 가능 |
| 모바일 중첩 | 모달의 Tab이 사이드바로 튀지 않음, 첫 Escape는 모달만 닫음, 메뉴 열림 동안 body 잠금 유지, 다음 Escape는 메뉴 닫기/잠금 복원 |
| 경로/역할/회귀 | 열린 모달에서 경로가 바뀌면 모달 닫힘/새 본문 포커스, 일반/관리자 전환 시 요청 보존, 기존 탭 중앙·빨간 선/글자·아바타색·환경 설정 선택/스위치 유지 |

가로 넘침은 `document.documentElement.scrollWidth <= innerWidth`와 Surface/본문의 scrollWidth<=clientWidth로 확인한다. 스크롤바 숨김은 scrollHeight가 큰 경우에도 본문을 실제로 스크롤해 내용 접근을 확인한다. 배경 잠금은 최종 메뉴 닫기 뒤 원래 inline overflow와 Dialog 잠금 클래스가 모두 복원되는지 확인한다.

## Commit Message

```text
feat(profile): 사용량 분석과 토큰 추가 신청 모달 구현

Plan: 2026-10-27-token-usage-request-modals
Phase: P01-token-modals
Task: T02-token-modal-ui

- 공용 Fluent 모달과 요청량 선택 UI로 두 화면 구성
- 프로필과 알림에서 모달을 열고 로컬 승인 대기 내역 표시
- 모바일 포커스와 제출 검증 및 기존 프로필 스타일 확인
```

Task/phase/current를 실행 workflow대로 갱신하고 이번 기능 변경만 검토해 커밋한다. 기존 미커밋 NavSidebar 3삽입/2삭제, General 0삽입/2삭제, Menu 25삽입/9삭제는 보존하며 자동 포함하지 않는다. T02가 수정하는 General/Menu는 기능 추가분을 분리해 stage하고 기존 사용자 수정의 색/정렬/문구삭제를 되돌리지 않는다. 완료 시 phase done2/2, current Active Task 없음으로 정리하고 실제 검증 결과를 기록한다.

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
