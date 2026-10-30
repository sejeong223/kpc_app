# Task: T04 코멘트 디자인과 화면 폭별 좌표 회귀

## Status: pending

## Goal

핀 생성 버튼부터 핀·미리보기·대화·입력·오류 상태까지 dadam 서체와 파란 강조색을 적용한다. 기존 코멘트 기능과 저장 데이터를 보존하고 펼침 200px·접힘 64px·모바일 0px의 작업 영역 변화에도 좌표와 팝업이 올바르게 재측정되는지 검증한다.

## Decision Summary

- Plan: 2026-10-30-dadam-look-and-feel / Phase: P01-ui. T01~T03 검증·커밋과 sidebar/profile/token milestone 완료가 선행 조건이다. 디자인만 정비하며 새 사용 흐름·목록/패널·API를 만들지 않는다.
- 사용자는 테스트의 예전 220px 가정을 현재 200/64/0으로 보완하도록 승인했다. 모든 Task의 브라우저/E2E/스크린샷·육안 검증·dev server 제외 정책을 유지한다.

## Implementation

### I01. 코멘트 전용 테마와 시각 상수

- Related Files:
  - `components/comments/CommentsWorkspace.tsx` :: 반환 section 및 `useStyles` — 범위 테마/작업 영역; modify
  - `config/comments.ts` :: `COMMENT_VISUALS`만 — 색상과 기하 상수 분리; modify
  - `components/providers/DadamThemeScope.tsx`, `lib/ui/dadam-theme.ts` — T01 제공 계약; read-only
  - `components/comments/CommentsProvider.tsx`, `lib/comments/controller.ts`, `lib/comments/repository.ts`, `lib/comments/geometry.ts`, `lib/comments/domain.ts`, `lib/comments/mentions.ts`, `lib/comments/format.ts`, `lib/comments/seed.ts` — 기능/저장/좌표; read-only

#### Details

**Signatures & Types**

```typescript
export default function CommentsWorkspace(): React.ReactElement;
interface Measurement { surface: CommentBounds; viewport: CommentBounds }
interface PinGesture {
  id: string; pointerId: number; origin: PixelPoint; offset: PixelPoint;
  point: CommentPoint; moved: boolean; element: HTMLButtonElement;
}
// 기존 공통 좌표 타입
interface PixelPoint { x: number; y: number }
interface CommentBounds { left: number; top: number; right: number; bottom: number }
interface PopupLimits { bounds: CommentBounds; minWidth: number; minHeight: number; maxWidth: number; maxHeight: number }
interface PopupRect extends PixelPoint { width: number; height: number }
type ResizeEdge = "e" | "s" | "se";
```

**Data & Schema Fields**

- T01 `DadamThemeScope({children})`는 전체 webLightTheme + Spoqa base/numeric + semibold500, applyStylesToPortals=true, inline display:contents인 client FluentProvider다. 위치·transform·contain·overflow·display를 클래스에 넣지 않고 기존 renderer/Context를 재사용한다.
- `dadamUi` string 계약: bodySize/bodyLineHeight14/20,metaSize/metaLineHeight12/16,titleSize/titleLineHeight16/24,controlRadius4/cardRadius6/surfaceRadius8,controlHeight32/smallControlHeight28,cardPadding/sectionGap12,popoverShadow=tokens.shadow8,dialogShadow=tokens.shadow16,focusRing=2px solid BrandStroke1,pinShadow=`0 2px 6px rgba(15,108,189,.35)`,pinSelectedRing=`0 0 0 4px rgba(15,108,189,.18)`.
- 실제 기본 색은 brand #0f6cbd,hover #115ea3,pressed #0c3b5e,tint #ebf3fc,보조brand글자 #115ea3. Background1/2/3는 #fff/#fafafa/#f5f5f5, Foreground1/2/3는 #242424/#424242/#616161, Stroke1/2는 #d1d1d1/#e0e0e0. 위험/주의는 colorStatusDanger/Warning 토큰 계열.
- `COMMENT_VISUALS`에서 red/gray/white만 제거한다. UI는 scoped `tokens`를 직접 사용하고 config에 Fluent 런타임을 import하지 않는다. `pinFontWeight`만 850→700. 나머지 readonly 숫자 유지: pinSize24,pinFontSize10.5,popupDefaultWidth360,popupDefaultHeight360,popupMinWidth320,popupMinHeight240,popupLabelWidth420,mobileBreakpoint760.
- 불변 저장 계약: DB명 `kpc-pin-comments`, version1, surfaceId `production-preview`, placeholder 문자열 유지. 코드의 기존 스키마를 복사/교체하거나 마이그레이션하지 않는다.
- `CommentScope`: namespace:string,surfaceId:production-preview. `CommentPoint`: xRatio/yRatio:number(0~1). `CommentMention`: userId/name:string,start/end:number. `CommentDraft`: text:string,mentions:CommentMention[]. `CommentUser`: id/name:string,isMock:boolean.
- `CommentThread`는 Scope/Point + id/rootMessageId/authorId:string,number:number,status:open|resolved,createdAt/updatedAt:string,resolvedAt/resolvedBy:string|null,revision:number,isSeed:boolean.
- `CommentMessage`는 Scope/Draft + id/threadId/authorId/authorName:string,kind:root|reply,createdAt:string,updatedAt:string|null,revision:number,isSeed:boolean. parent threadId/rootMessageId 관계와 메시지 순서는 기존 repository/controller 소유다.

**Execution Flow / Logic**

1. Precondition & Validation: T03 완료 확인. 함수와 effect는 기존 CommentsWorkspace에 그대로 둔다. comment Context를 재생성하지 않는다.
2. Core Processing: 반환하는 `<section ref={surface} data-comment-surface ...>` 바깥만 DadamThemeScope로 감싼다. surface ref/이벤트/측정 대상은 section 그대로다. surface 배경 Background2,기본fontFamilyBase/body14/20/Foreground1; intro Foreground3, title20px/28px/700,설명14/20. 기존 position relative/flex1/minHeight100svh/overflow visible와 intro padding은 유지한다.
3. Error & Exception Handling: 바깥 alert는 StatusDangerBackground1/Foreground1/Border1,cardRadius6,body14/20. 기존 role=alert/다시 불러오기와 disabled 조건을 보존한다. style 때문에 데이터 로딩 실패를 숨기지 않는다.
4. State Transition & Return: surface 측정, ResizeObserver, visualViewport/scroll listeners, pointer capture·5px threshold·offset, 외부 클릭, Escape 우선순위, draft·hover timer·controller 호출은 변경하지 않는다. scope에 transform을 추가하면 fixed popup 좌표가 달라지므로 금지한다.

### I02. 생성 버튼·핀·미리보기

- Related Files:
  - `components/comments/CommentCreateButton.tsx` :: `useStyles`, `CommentCreateButton`; modify
  - `components/comments/CommentPin.tsx` :: `useStyles`, `CommentPinProps`, `CommentPin`; modify
  - `components/comments/CommentPreview.tsx` :: `useStyles`, `CommentPreview`; modify

#### Details

**Signatures & Types**

```typescript
export default function CommentCreateButton(): React.ReactElement;
export interface CommentPinProps {
  pinId: string; number: number; status: "draft" | "open" | "resolved";
  position: PixelPoint; selected: boolean; disabled: boolean; previewId?: string;
  onActivate(): void; onPreview(visible: boolean): void;
  onPointerDown: React.PointerEventHandler<HTMLButtonElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLButtonElement>;
}
export default function CommentPin(props: CommentPinProps): React.ReactElement;
export default function CommentPreview(props: {
  message: CommentMessage; position: PixelPoint; now: number; width: number;
}): React.ReactElement;
```

**Data & Schema Fields**

| slot/상태 | 정확한 스타일 계약 |
| --- | --- |
| Create button | fixed top16/right20/zIndex5,minHeight40,padding8px14px 유지. controlRadius4,fontFamilyBase/body14/20/500,Background1/Foreground2/Stroke2,shadow2 |
| Create enabled hover/active | hover BrandBackground2/BrandForeground2/BrandStroke1; pinMode active도 같은 tint. disabled와 disabled:hover는 BackgroundDisabled/ForegroundDisabled/StrokeDisabled,opacity1로 활성색을 덮음 |
| Pin hit |44×44,absolute,translate(-22px,-22px),zIndex2,cursor grab,touchAction none 유지. focusRing/offset2,forced-colors Highlight |
| Pin body |24×24,border-box,꼬리 반경50%50%50%2px,2px ForegroundOnBrand border,BrandBackground/ForegroundOnBrand,fontFamilyBase/10.5px/700,lineHeight14px,pinShadow |
| Pin 좌표 | hit 기준 span left22/top22, transform translate(-2px,-22px), origin2px22px,pointerEvents none 유지 |
| Pin draft | Background1/BrandForeground1, border BrandStroke1 |
| Pin resolved | Foreground3(#616161) 배경/ForegroundOnBrand,shadow none. aria-label 반영 완료 유지 |
| Pin selected | translate(-2px,-22px) scale(1.25), pinSelectedRing. draft/resolved 기본색은 그대로 두고 선택 링만 추가 |
| Preview root | fixed/zIndex9/pointerEvents none/padding12,width/left/top inline 유지. Background1/Foreground1/Stroke2/surfaceRadius8/popoverShadow/fontFamilyBase/body14/20 |
| Preview meta/time/body | author14/20/700, time12/16/400/Foreground3. 기존 WebkitLineClamp3/overflow hidden과 최대280×140 배치 규칙 유지 |

- pinSize/fontSize/fontWeight는 COMMENT_VISUALS에 남긴 값을 사용하거나 같은 상수로 연결하며, DOM 타입·aria·data attribute는 유지한다. 생성 버튼에서 더 이상 쓰지 않는 COMMENT_VISUALS import는 제거한다.

**Execution Flow / Logic**

1. Precondition & Validation: 상태별 우선순위는 body→draft/resolved→selected다. 완료된 핀도 선택/포커스가 가능하다.
2. Core Processing: 색·서체·그림자만 위 계약으로 교체. 절대/fixed 위치와 transform 기준점은 그대로 둔다.
3. Error & Exception Handling: state.status가 ready가 아니거나 busy일 때 생성 버튼 비활성, controller 없음도 기존대로 막는다. disabled를 흐린 파란색으로만 표현하지 않는다.
4. State Transition & Return: togglePinMode, focus surface, hover200ms, onActivate/onPreview, Alt+방향키 이동은 그대로다. 저장 상태를 CSS 상태와 혼동하지 않는다.

### I03. 대화·본문·입력·메뉴 스타일

- Related Files:
  - `components/comments/CommentPopover.tsx` :: `useStyles`, `CommentPopover` — 대화/확인/오류; modify
  - `components/comments/CommentMessage.tsx` :: `CommentBody`, `CommentMessageView`, `useStyles`; modify
  - `components/comments/CommentComposer.tsx` :: `CommentComposerProps`, `useStyles`, 입력 JSX 슬롯; modify
  - `components/comments/CommentActionsMenu.tsx` :: `Props`, `useStyles`, 메뉴 버튼; modify

#### Details

**Signatures & Types**

```typescript
// CommentPopover.tsx
interface Props { anchor: PixelPoint; limits: PopupLimits; now: number; onClose(): void }
export default function CommentPopover(props: Props): React.ReactElement | null;
type Confirmation = { kind: "thread" | "reply"; id: string } | null;
// CommentMessage.tsx
export function CommentBody(props: { draft: CommentDraft }): React.ReactElement;
export interface CommentMessageViewProps {
  message: CommentMessage; now: number; showActions: boolean; disabled: boolean;
  onEdit(): void; onDelete(): void; children?: React.ReactNode;
}
export default function CommentMessageView(props: CommentMessageViewProps): React.ReactElement;
// CommentComposer.tsx
export interface CommentComposerProps {
  mode: "new" | "reply" | "edit"; draft: CommentDraft; users: CommentUser[];
  disabled: boolean; submitDisabled: boolean; autoFocus?: boolean;
  onChange(draft: CommentDraft): void; onSubmit(): void; onCancel?: () => void;
}
export default function CommentComposer(props: CommentComposerProps): React.ReactElement;
// CommentActionsMenu.tsx의 기존 로컬 Props
interface Props { label: string; disabled: boolean; deleteLabel: string; onEdit(): void; onDelete(): void }
export default function CommentActionsMenu(props: Props): React.ReactElement;
```

**Data & Schema Fields**

- 각 파일의 Props는 별개 로컬 타입이다. 위 시그니처를 한 파일로 합치지 않는다. 기존 사용처·data-comment-*·aria 연결을 보존한다.
- popup manual={signature:string,rect:PopupRect}|null, confirmation=null, gesture, body/composer refs, computed view/locked/resolved는 기존대로다. Composer query:MentionQuery|null,active0,menuHeight160,composing/dismissed/selection refs도 그대로다.

| 파일/slot | 스타일 계약 |
| --- | --- |
| Popover root | fixed/zIndex10/flex column/overflow hidden/inline rect 유지. Background1/Foreground1/Stroke2/surfaceRadius8/dialogShadow,fontFamilyBase/body14/20/400 |
| Popover header/title/action | minHeight48,padding8px16px,gap4 유지,Stroke2. title16/24/700,ellipsis. action minWidth30/height30/padding0 6px/meta12/16,controlRadius4; 420px 이상에서 기존 완료 label 표시 |
| Popover body/footer | body flex1/minHeight0/overflowY auto/padding0 16px, footer padding12px20px20px16px/Stroke2/maxHeight65%/overflowY auto와 rect.height>=240 예외 유지 |
| Popover note/error/conflict/confirm | note14/20/Foreground3; error14/20/StatusDangerForeground1/Background1; conflict14/20/StatusWarningBorder1/Background1/cardRadius6; confirm14/20. 삭제 확인의 최종 삭제 버튼만 danger 전경·border·hover로 표시하고 일반 취소는 neutral |
| Popover resize/grip | e/s/se hit 위치·크기·cursor 유지. focusRing offset-2px. grip repeating-linear-gradient의 #b3b3bc만 NeutralStroke1 토큰으로 대체 |
| Message | padding12px0/Stroke2 bottom, author14/20/700, time12/16/Foreground3,body14/20/Foreground1/pre-wrap/overflowWrap anywhere. meta flexWrap wrap,rowGap4,minWidth0으로 긴 이름 지원 |
| mention | BrandForeground2/BrandBackground2,borderRadius3px; splitCommentText의 안전한 text 렌더링 유지 |
| Composer input | 기존textarea/combobox 유지. Background1/Foreground1/Stroke1/controlRadius4,fontFamilyBase/body14/20,기존padding10,minHeight56/max120/resize none. focusRing과BrandStroke1,disabled BackgroundDisabled/ForegroundDisabled. max-height500의40/64 제한 유지 |
| Composer controls/hint/send | controls gap8/marginTop8,flexWrap wrap. hint12/16/Foreground3. send32×32/controlRadius4,BrandBackground/ForegroundOnBrand,enabled hover/pressed 각각BrandBackgroundHover/Pressed; disabled 및disabled:hover는 중립 토큰 |
| Composer suggestions/option | 위치bottom100%/zIndex4/동적maxHeight/scroll 유지. Background1/Stroke2/cardRadius6/popoverShadow,padding4. option14/20/400,padding8/controlRadius4,선택 BrandBackground2/BrandForeground2. empty14/20/Foreground3 |
| Actions menu | trigger30×30 유지; menu absolute right0/top32/zIndex3/minWidth144/padding4,Background1/Stroke2/cardRadius6/popoverShadow. item14/20/minHeight32,수정 neutral/삭제 StatusDangerForeground1,삭제hover StatusDangerBackground1 |

**Execution Flow / Logic**

1. Precondition & Validation: 정규화·권한·저장 함수와 callback을 보존한다. data-comment-popup/data-comment-control/textarea aria 속성은 입력·외부 클릭 로직이 참조한다.
2. Core Processing: 표의 style slot과 필요한 danger class만 변경한다. 반복된 hardcoded red를 브랜드와 의미 오류로 구분한다. 별도 앱 테마 변경으로 해결하지 않는다.
3. Error & Exception Handling: 저장 오류는 초안을 보존하고 기존 alert/재시도, revision conflict는 최신 내용 확인 후 rebase, 본인 글 수정/삭제 제한은 그대로다. textarea가 커져도 popup footer와 body의 overflow 규칙을 제거하지 않는다. suggestion 선택에서 preventDefault와 focus/caret 복귀를 유지한다.
4. State Transition & Return: Enter/Shift+Enter/한글 조합/멘션 선택/Escape, 삭제 확인,완료·다시열기,크기조절과focus복귀는 기존대로다. 데이터 스키마/HTTP 상태/DB 버전 변경 없음.

### I04. 펼침·접힘·모바일 측정 조건과 좌표 회귀

- Related Files:
  - `tests/lib/comments/workspace-ui.test.ts` :: getBoundingClientRect stub, ResizeObserver stub, drag/bounds 사례, 새 전환 사례; modify
  - `tests/lib/comments/geometry.test.ts`, `tests/lib/comments/controller.test.ts`, `tests/lib/comments/repository.test.ts`, `tests/lib/comments/mentions.test.ts`, `tests/lib/comments/domain.test.ts`, `tests/lib/comments/format.test.ts` — 기존 회귀; read-only

#### Details

**Signatures & Types**

```typescript
// 테스트 파일 안에만 추가할 가상 레이아웃 상태와 보조 함수
type SidebarWidth = 200 | 64;
let sidebarWidth: SidebarWidth; // beforeEach 200으로 reset
function surfaceLeft(): number; // window.innerWidth <= 760 ? 0 : sidebarWidth
async function changeSidebarWidth(width: SidebarWidth): Promise<void>;
```

**Data & Schema Fields**

- 기존 테스트는 viewport1440×900, left220으로 가정했다. left200/width1240을 기본으로 바꾸고 collapsed는 left64/width1376, mobile390은 left0/width390으로 한다.
- `getBoundingClientRect`에서 data-comment-surface는 x=surfaceLeft(),y0,width=innerWidth-left,height=innerHeight. popup은 기존 inline left/top/width/height를 읽는다. 테스트만의 상태이며 production 코드에 export하지 않는다.
- ResizeObserver stub은 생성 callback을 저장하고 disconnect 시 해제한다. changeSidebarWidth는 상태를 바꾸고 현재 surface observer callback을 act 안에서 실행한 뒤 기존 rAF/tick을 기다린다. 창 크기가 그대로인 접힘도 측정되도록 window.resize에만 의존하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: 기존 fake-indexeddb의 매 테스트 새 IDBFactory·실제 controller/repository와 기존 mocks·cleanup을 유지한다. CommentsWorkspace가 실제 scope를 렌더링하게 하며 Fluent를 통째로 mock하지 않는다.
2. Core Processing: 220 가정과 그로 파생된 1220·232 및 drag 시작525를 함께 교체한다. hover 대기 `tick(220)`은 시간값이므로 바꾸지 않는다. 수치 검색/일괄 치환으로 의미를 혼동하지 않는다.
3. Error & Exception Handling: drag 시작점은 surfaceLeft()+pin.style.left / pin.style.top로 실제 가상 위치를 구해 pointerdown한다. 시작offset을0으로 만든 뒤 최종clientX650이면 기대 xRatio=(650-surfaceLeft())/(innerWidth-surfaceLeft()). 기존 생산 geometry 함수를 호출해 기대값을 만들지 않는다. pointermove 여러 번→저장1회,Escape취소→추가저장0을 유지한다.
4. State Transition & Return: 아래 새 사례 후에도 controller snapshot과 repository 재로드의 동일 id/number/revision/xRatio/yRatio를 비교한다. 측정만으로 move-thread를 호출해서는 안 된다.

- 새 회귀 사례 A: viewport1440, 같은 저장 핀의 상대 좌표를 잡고 left200→64→200으로 전환한다. 각 단계에서 `pin.style.left`가 xRatio*(1440-left)이며 client 위치는 left+해당값인지 확인한다(22px 가장자리 clamp가 없는 내부 핀 사용). 저장좌표·revision·thread번호 불변, moveThread 호출0.
- 사례 B: 대화 열기→답글 초안 입력→200→64 전환 후 view.threadId와 초안 유지, popup left>=left+12 및 right<=viewport-12,기존최대너비/높이 규칙 유지.
- 사례 C: viewport390×844로 바꾸고 resize 이벤트→surfaceLeft0,같은상대좌표 반영 및 popup 좌우12px 경계. 모바일에서 sidebarWidth64여도 left0이다. 320×568·1024×500 기존 bounds 사례도 `surfaceLeft()+12`를 사용해 유지한다.
- 기존 작성/저장/멘션/IME/미리보기/완료/권한/수정/삭제/충돌/리사이즈 테스트를 모두 보존한다. 스타일값 복제 테스트·브라우저 실행은 추가하지 않는다.

## Acceptance Criteria

- [ ] 생성·핀 4상태·미리보기·대화·입력·멘션·메뉴가 공통 dadam 서체/색상을 사용한다. 오류/삭제/경고는 의미색을 유지한다.
- [ ] 핀 크기/꼬리/기준좌표·hit영역, popup 크기/경계/resize 및 모든 기존 동작이 보존된다.
- [ ] config에는 CSS 토큰 의존성을 넣지 않고 데이터·DB schema/version·기존 저장 레코드를 보존한다.
- [ ] 승인된 테스트 조건200/64/0과 ResizeObserver 재측정·좌표/초안/저장 보존 회귀가 통과한다.
- [ ] 아래 최종 검증 통과 후 Plan/P01/Task를 완료하고 current에 남은 Task 없음으로 기록한다.

## Validation

- `npm.cmd run test -- tests/lib/comments` — 기존 전체 코멘트 unit/DOM/저장소 회귀 및 새 200/64/0 사례 통과.
- `npm.cmd run typecheck` — 전체 타입 통과.
- `npm.cmd run lint` — 전체 lint 통과.
- `npm.cmd run test` — 최종 전체 회귀 통과. 앞선 targeted 실행으로 문제가 밝혀졌으면 수정 후 필요한 범위를 다시 실행한다.
- `npm.cmd run build` — 최종 프로덕션 build 통과.
- `git diff --check`, config/controller/repository/geometry diff 검토 — 비즈니스·좌표 알고리즘/DB 버전 유지, 시각 상수만 변경.
- 브라우저/E2E/스크린샷·육안·dev server 검증 미실시를 명시한다. 테스트 속 가상 측정은 실제 브라우저 픽셀 측정이 아니다.

## Commit Message

```text
feat(comments): dadam 코멘트 스타일과 화면 폭 회귀 검증 적용

Plan: 2026-10-30-dadam-look-and-feel
Phase: P01-ui
Task: T04-comment-design

- 기존 코멘트 동작과 저장을 보존하며 핀과 대화 UI 통일
- 펼침 접힘 모바일 작업 영역의 좌표와 팝업 회귀 검증 보완
```

- UI8개/config/comments.ts/기존 workspace-ui 테스트와 진행 문서만 명시 stage한다. T01~T03 파일의 보완이 필요하면 관련 검증 결과와 이유도 기록한다. 기존 무관한 미커밋 문서를 포함하지 않는다.
- 완료 시 T04 done, phase done4/4·두 milestone done, Plan done, current Active Task 없음/Last Completed T04. 실제 실행 결과와 한국어 커밋 해시를 기록한다.

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
