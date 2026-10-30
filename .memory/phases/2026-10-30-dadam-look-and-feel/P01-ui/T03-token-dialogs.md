# Task: T03 토큰 모달·폼·알림과 사이드바 계열 완료

## Status: done

## Goal

프로필에서 여는 토큰 사용량 상세·추가 신청 창 및 성공 알림까지 같은 dadam 테마로 연결한다. 기존 입력 검증·미리보기 신청·포커스 복귀를 보존하고, 사이드바 계열 T01~T03 검증을 마친 뒤 코멘트 단계로 전환한다.

## Decision Summary

- Plan: 2026-10-30-dadam-look-and-feel / Phase: P01-ui. T01 공통 테마·사이드바와 T02 프로필 완료가 선행 조건이다. 이 Task 통과 전 T04에 착수하지 않는다.
- 실제 승인 API 구현이 아닌 디자인 변경이다. 브라우저/E2E/스크린샷·육안 검증과 dev server 검증 제외, DOM/타입/lint/build 검증 유지.

## Implementation

### I01. 형제 위치의 토큰 화면과 포털 테마

- Related Files:
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` 반환 JSX의 TokenDialogs — scope 적용; modify
  - `components/profile/token/TokenDialogs.tsx` :: `TokenDialogs`, `TokenRequestForm`, `useStyles` — 모달 액션·Toaster; modify
  - `components/providers/DadamThemeScope.tsx`, `lib/ui/dadam-theme.ts` — T01 공통 계약; read-only
  - `components/profile/ProfilePreviewProvider.tsx` :: `openTokenDialog/closeTokenDialog/submitTokenRequest/restoreTokenFocus` — 기존 상태/포커스; read-only

#### Details

**Signatures & Types**

```typescript
// 기존 레이아웃 export/서버 인증은 유지한다. JSX에 scope 한 곳만 추가한다.
export default async function AuthenticatedLayout(props: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement>;
export default function TokenDialogs(): React.ReactElement;
function TokenRequestForm(props: {
  formId: string; onSubmitted(request: TokenRequestPreview): void;
}): React.ReactElement;
// T01 제공 계약
interface DadamThemeScopeProps { children: React.ReactNode }
```

**Data & Schema Fields**

- `DadamThemeScope`는 전체 `webLightTheme` + Spoqa base/numeric + semibold500을 제공하는 FluentProvider다. `applyStylesToPortals=true`, inline display:contents, 클래스에는 transparent 배경과 body font만 있으며 위치/크기/display는 없다. 기존 renderer/state Provider를 재사용한다.
- theme 기본 brand #0f6cbd/hover #115ea3/pressed #0c3b5e, brand tint #ebf3fc/#115ea3, 기본 표면 #fff/보조 #fafafa, 글자 #242424/#424242/#616161, Stroke2 #e0e0e0. 경고/위험/성공은 `tokens.colorStatusWarning* / Danger* / Success*`.
- `dadamUi`: body14/20, meta12/16, title16/24, control/card/surface radius4/6/8, controlHeight32/small28, cardPadding/sectionGap12, popoverShadow8/dialogShadow16, focusRing 2px solid BrandStroke1. 문자열 필드명은 bodySize,bodyLineHeight,metaSize,metaLineHeight,titleSize,titleLineHeight,controlRadius,cardRadius,surfaceRadius,controlHeight,smallControlHeight,cardPadding,sectionGap,popoverShadow,dialogShadow,focusRing이다.
- 현재 authenticated layout은 FluentUiProvider > ProfilePreviewProvider > CommentsProvider 안에 AppShell과 TokenDialogs를 형제로 둔다. **TokenDialogs만** `<DadamThemeScope>`로 감싼다. AppShell 전체를 감싸지 않는다. 기존 requireAppAccess 호출 위치·서버 컴포넌트 성격을 유지한다.
- scope는 modal view가 null일 때도 유지한다. 성공 시 dialog가 닫혀도 Toaster는 살아 있어야 한다. `useToastController`와 Toaster는 같은 scope 자손이다.
- TokenDialogs의 formId/toasterId, view:usage|request|null, previousPathname, requestValid, TokenRequestForm의 touched={amount:false,project:false,reason:false}, submitErrors={}는 그대로 둔다.

**Execution Flow / Logic**

1. Precondition & Validation: T01/T02가 done이고 공통 계약이 존재해야 한다. 기존 미리보기 ProfilePreviewProvider를 중복 mount하지 않는다.
2. Core Processing: 위 위치에 scope 추가. TokenDialogs.button은 minHeight32/height auto,padding6px12px,body14/20/500,controlRadius4. cancelButton Stroke1. primary는 Fluent appearance=primary의 scoped theme를 사용한다. submitButton의 기존 red disabled/disabled:hover override를 제거하고 비활성 BackgroundDisabled/ForegroundDisabled/StrokeDisabled,opacity1로 명시한다. 동일 비활성 값이 hover/pressed에서도 유지되도록 selector 우선순위를 맞춘다.
3. Error & Exception Handling: 신청 검증 실패는 기존 touched/errors/첫 오류 focus로 처리한다. 성공 알림은 기존 `intent="success"`와 문구를 유지하며 toast fontFamilyBase/body14/20, maxWidth와 zIndex4400을 보존한다. 토큰 실제 승인 성공으로 문구를 바꾸지 않는다.
4. State Transition & Return: usage→request→submit→view null, 새 신청 pending, Toaster success, 원 trigger 포커스 흐름 유지. 경로 변경 시 close({restoreFocus:false}), requestForm 재마운트는 기존대로다.

### I02. 공통 모달 프레임

- Related Files:
  - `components/ui/ModalFrame.tsx` :: `ModalFrameProps`, `useStyles`, `ModalFrame` — token 전용 현재 사용처; modify

#### Details

**Signatures & Types**

```typescript
export interface ModalFrameProps {
  open: boolean; title: string; subtitle?: string; width?: number;
  contentKey: string; children: React.ReactNode; footer: React.ReactNode;
  onClose(): void;
}
export default function ModalFrame(props: ModalFrameProps): React.ReactElement;
```

**Data & Schema Fields**

- width default560, 실제 usage760/request560; contentKey usage|request|closed, 기존 controlled open 유지. 필드/반환 타입 변경 없음.

| slot | 확정 스타일 |
| --- | --- |
| surface | width prop/기존 maxWidth calc(100vw - 32px), maxHeight min(88vh,100svh-32px), flex column/overflow hidden/padding0/minWidth0/zIndex4300 유지; Background1/Foreground1/Stroke2 1px/surfaceRadius8/dialogShadow/fontFamilyBase/body14/20/400 |
| backdrop | 기존 rgba(17,18,22,.28),zIndex4000 유지 |
| header/title | 기존 padding16px18px12px/gap10/flexShrink0 유지; title16/24/700,Foreground1,letterSpacing0; heading minWidth0 |
| subtitle | meta12/16/400,Foreground3,overflowWrap anywhere |
| close |32px/controlRadius4/Foreground2,기존12px icon·aria 유지 |
| body | 기존 flex1/minHeight0/minWidth0/내부 overflowY auto 및padding4px18px16px 유지. 명시 fontFamilyBase/14/20/400,focusRing offset-2px |
| footer | 기존 wrap/gap8/padding12px18px/flexShrink0,Background2/Stroke2. 긴 버튼은 wrap으로 수용 |

**Execution Flow / Logic**

1. Precondition & Validation: 현재 ModalFrame 사용처는 TokenDialogs 하나다. 실제 Dialog/Surface와 포털 구조를 그대로 사용한다.
2. Core Processing: style slot만 교체하며 surface와 title/body에 명시 서체를 적용한다. 작은 높이 max-height359의 기존 padding0/border1/overflow 규칙을 유지한다.
3. Error & Exception Handling: 서체가 커져 생긴 내용 overflow는 기존 body 스크롤/줄바꿈으로 수용한다. 모달 전체를 overflow visible로 바꾸거나 focus trap을 해제하지 않는다.
4. State Transition & Return: open/contentKey 변경 시 body.scrollTop=0와 title focus, Escape 캡처→onClose, modalType=modal, 제목/설명 ID 연결을 보존한다.

### I03. 사용량·신청 패널의 데이터와 시각 상태

- Related Files:
  - `components/profile/token/TokenUsagePanel.tsx` :: `TokenUsagePanelProps`, `useStyles` — 사용량 카드/차트/표; modify
  - `components/profile/token/TokenRequestPanel.tsx` :: `TokenRequestPanelProps`, `useStyles` — 신청 폼; modify
  - `components/ui/SegmentedControl.tsx` — T02 chips 계약; read-only
  - `config/token-preview.ts`, `config/profile-preview.ts`, `lib/token-preview.ts`, `lib/profile-preview.ts` — 계산/스키마/검증; read-only

#### Details

**Signatures & Types**

```typescript
export interface TokenUsagePanelProps {
  snapshot: Readonly<TokenUsageSnapshot>; used: number; limit: number;
}
export default function TokenUsagePanel(props: TokenUsagePanelProps): React.ReactElement;
type TokenDraftAction = Extract<TokenPreviewAction, {
  type: "set-amount" | "set-custom-amount" | "set-project" | "set-reason";
}>;
export interface TokenRequestPanelProps {
  formId: string; draft: TokenRequestDraft; latestPending: TokenRequestPreview | null;
  used: number; limit: number; errors: TokenRequestErrors;
  onDraftAction(action: TokenDraftAction): void;
  onFieldBlur(field: "amount" | "project" | "reason"): void;
  onSubmit(event: React.FormEvent<HTMLFormElement>): void;
}
export default function TokenRequestPanel(props: TokenRequestPanelProps): React.ReactElement;
```

**Data & Schema Fields**

- 기존 데이터 모델을 변경하지 않는다. `TokenUsageSnapshot`: periodLabel:string, elapsedDays/daysInMonth:number, daily:readonly {day:number;tokens:number}[], byProject:readonly {id:TokenProjectId;name:string;tokens:number}[], byFeature:readonly {id:string;name:string;percent:number}[], recent:readonly {id:string;timeLabel:string;projectName:string;operation:string;tokens:number}[].
- `TokenRequestDraft`: amountChoice는 문자열 30|50|100|custom, customAmountK:string, projectId:mois|edu|sample|outside, reason:string. 초기값은 50/빈 문자열/mois/빈 문자열이다.
- `TokenRequestPreview`: amountK/amountTokens:number, projectId:TokenProjectId, projectName/reason/id/requesterName/createdAt:string, department:string|null, status:pending.
- `TokenRequestErrors`: amount/project/reason/form은 optional string. 양의 안전한 정수K, *1000과 현재 limit 합산이 안전 범위인지, 존재하는 project인지, trim한 이유가 2자 이상인지 확인하는 기존 검증을 보존한다.
- `TokenPreviewState`: dialogView:usage|request|null, requestDraft, requests:TokenRequestPreview[]. request를 열면 amount50/custom빈값/reason빈값으로 초기화하고 project는 유지한다. submit은 dialog를 닫고 requests 앞에 추가한다. 새 API/HTTP 상태/DB 변경 없음.

| 파일/slot | 정확한 스타일 |
| --- | --- |
| 공통 card/kpi/heading | Stroke2/cardRadius6,카드padding12,heading14/20/700/Foreground1,본문14/20/400,meta12/16/Foreground3 |
| Usage KPI | 4열,max-width600에서2열 유지. value20px/28px/700,tabular-nums,label12/16/500. warning StatusWarningBackground1/Border1/Foreground1 |
| Usage chart | 높이110·날짜별 막대 계산 유지. dayBar BrandBackground,dayLabel10px/12px/400/Foreground3,width/maxWidth/opacity는 기존값. 수치 툴팁 의미 유지 |
| Usage projectBar/featureBar | projectBar StatusSuccessBackground3,featureBar Foreground2,track Background5. 다른 계열을 모두 파란색으로 바꾸지 않는다. 비율 계산 유지 |
| Usage table | table-layout fixed,sticky th,caption,ellipsis/title,first110/last80 폭 유지. th12/16/500/Foreground3/Background2,td14/20,time td12/16. 600 이하에서padding8px4px,th/td12/16,first70/last50 폭 유지 |
| Request now/count/meta | now Background3/cardRadius6,본문14/20,gap10/padding10px12px,count tabular-nums,meta12/16 |
| Request progress | track Background5,일반StatusSuccessBackground3,warning StatusWarningBackground3,over StatusDangerBackground3. 높이7·비율 유지 |
| Request pending | StatusWarningBackground1/Foreground1,12/16/500,cardRadius6,기존Clock icon/문구 유지 |
| Request field/label | 기존label slot선택자에fontFamilyBase/12px16px/500/Foreground2. Field validationState/validationMessage 유지 |
| Request custom/select/textarea | Stroke1/controlRadius4,Background1/Foreground1,입력14/20/fontFamilyBase. custom폭110/minHeight32,select minHeight32,textarea padding8px10px/rows3/vertical resize. root와input/select/textarea slot 모두 갱신 |
| Request reasons/reason | wrap/gap6 유지,minHeight28/height auto/padding4px9px,meta12/16/500,pill14,neutral border/hover,문자wrap 허용 |
| Request approver/error | approver14/20,Foreground2,bold700/Foreground1. error12/16/StatusDangerForeground1. 기존Field 자동 오류 표시 유지 |

**Execution Flow / Logic**

1. Precondition & Validation: fixture값·함수 호출·props는 기존을 사용한다. 색/문자/여백 때문에 계산식을 바꾸지 않는다.
2. Core Processing: 위 style 적용. KPI/table/폼의 responsive·minWidth0·overflowWrap을 유지한다. input 외곽뿐 아니라 slot의 글자도 통일한다.
3. Error & Exception Handling: unavailable은 `—`, 빈 배열은 기존 empty, invalid draft는 기존 errors와 disabled submit을 표시한다. 일반 조작의 파랑과 경고/초과/오류 의미색을 구분한다.
4. State Transition & Return: props/context의 기존 dispatch만 사용한다. custom 전환 focus, 프로젝트 선택, 이유 preset, submit, pending 표시 동작을 보존한다.

### I04. 프로필부터 신청까지 검증과 완료 관문

- Related Files:
  - `tests/components/token-dialog-ui.test.ts` :: 프로필→modal→submit/Toast→focus; new
  - `tests/lib/comments/shell-ui.test.ts` :: 테스트 render의 TokenDialogs를 scope로 감싸기; modify
  - 기존 `tests/lib/profile-preview.test.ts`, `tests/lib/token-preview.test.ts`, `tests/components/dadam-theme-scope.test.ts` — reuse

#### Details

- jsdom/.test.ts,createElement/act/createRoot,shell-ui와 같은 auth/next mock·rAF/ResizeObserver/matchMedia stub 사용. 실제 ProfilePreviewProvider, scope 안의 ProfileMenu와 별도 scope 안의 TokenDialogs를 형제로 렌더링한다. 일반 sibling도 두어 scope 밖을 검증한다.
- 프로필→사용량 상세→신청: dialog title/760→560의 props상 width, 돌아가기/닫기, 키보드 Escape와 원래 프로필 trigger 포커스 복귀를 확인한다. DOM 측정을 실제 브라우저 검증으로 취급하지 않는다.
- 초기 빈 이유에서 submit disabled. preset 선택→유효→submit에서 pending 추가, dialog 닫힘, success Toast 문구, focus 복귀 확인. 새 request의 요청량/이유 초기화·project 유지, 연속 클릭 중복 방지도 기존 상태 테스트와 함께 확인한다.
- custom 입력 invalid→disabled→양의 정수+이유로 유효 전환. 내부 project 검증은 기존 unit test 유지. native input setter+input/change 이벤트로 React 제어 값을 갱신한다.
- DialogSurface와 Toast의 portal ancestor가 같은 TokenDialogs 테마 클래스를 받고, 외부 sibling은 외부 테마인지를 검증한다. 고정 CSS 값 목록 snapshot을 만들지 않는다.
- 이 검증 및 T01/T02 기존 테스트, typecheck/lint/build가 통과해야 sidebar/profile/token milestone 완료. 실패는 해당 Task 범위에서 수정하고 T04로 미루지 않는다.

## Acceptance Criteria

- [x] 사용량·신청·성공 Toast까지 Spoqa/dadam theme가 전달되고 일반 본문은 기존 테마를 유지한다.
- [x] 기본 버튼/폼은 공통14/20,modal/title/보조 문자는 정의대로 적용된다. disabled hover도 중립 상태다.
- [x] usage760/request560·작은 화면/낮은 높이·내부 스크롤·focus/aria가 유지된다.
- [x] 입력 검증·pending·fixture 계산·초기화/유지 규칙·원 trigger 복귀가 유지된다.
- [x] T01~T03 검증 성공 후 사이드바 계열 milestone을 완료하고 T04로 진행한다.

## Validation

- `npm.cmd run test -- tests/components/dadam-theme-scope.test.ts tests/components/token-dialog-ui.test.ts tests/config/sidebar.test.ts tests/lib/profile-preview.test.ts tests/lib/token-preview.test.ts tests/components/preview-role-boundary.test.ts tests/lib/comments/shell-ui.test.ts` — scope/상태/폼/권한/포커스 관련 회귀 모두 통과.
- `npm.cmd run typecheck` — 전체 타입 검사 통과.
- `npm.cmd run lint` — 사이드바 계열 전체 파일 변경을 포함한 전체 lint 통과.
- `npm.cmd run build` — Server layout에서 client scope를 사용하는 프로덕션 build 통과.
- `git diff --check`,style diff 검토 — 외부 Provider 보존,포털에 위치 class 혼입 없음,data-modal-frame/Toaster 유지.
- 브라우저/E2E/스크린샷/육안 비교/dev server 없음. 실제 실행한 명령과 결과만 기록한다.

## Commit Message

```text
feat(tokens): dadam 테마로 사용량과 신청 모달 정비

Plan: 2026-10-30-dadam-look-and-feel
Phase: P01-ui
Task: T03-token-dialogs

- 사용량과 신청 폼 및 알림을 공통 테마로 연결
- 기존 검증과 포커스 흐름을 보존하고 사이드바 계열 검증 완료
```

- 구현파일5개(layout,TokenDialogs,UsagePanel,RequestPanel,ModalFrame)·새테스트·shell-ui 수정·진행문서를 명시 stage한다. 다른 미커밋 문서를 포함하지 않는다.
- 완료 시 이 Task done, phase done3/4/sidebar milestone done, current T04-comment-design. 실제 검증과 한국어 커밋을 기록한다.

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `git log -1 --format=%h --grep='Task: T03-token-dialogs'`

## Execution Result

- authenticated layout의 TokenDialogs에 지속적인 DadamThemeScope를 연결하고 모달·폼·차트·Toast 스타일을 통일했다. disabled 제출 버튼은 hover에서도 중립색을 유지한다.
- 회귀 7개 파일 117개 테스트, 전체 typecheck/lint/build, git diff --check 통과. 프로필 진입→사용량/신청 전환→유효성 검사→중복 제출 방지→pending/Toast→포커스 복귀를 실제 컴포넌트 DOM으로 확인했다. 브라우저 검증 제외.
- 학습: 모달이 닫힌 뒤에도 Toast를 표시하려면 scope와 Toaster를 계속 mount해야 한다. 포털에는 부모 범위의 CSS 클래스가 전달되며 layout용 display:contents는 inline에 한정한다.
- 상태·fixture·서버 API는 변경하지 않았다. 범위 밖 인접 문제: 특이사항 없음. T01~T03 사이드바 계열 완료.
