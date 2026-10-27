# Task: T01 사용량 데이터와 로컬 토큰 신청 상태

## Status: done

## Goal

72.4K로 일치하는 분석 데이터와 검증 가능한 토큰 신청 상태를 만들고 기존 프로필 Provider에 연결한다. UI 없이도 신청 검증·초안 초기화·대기 내역 보존을 단위 테스트할 수 있어야 한다.

## Decision Summary

- Plan: 2026-10-27-token-usage-request-modals / Phase: P01-token-modals. 기존 프로필 기능은 완료되어 있다. 이번 Task에서는 아직 기존 버튼의 안내 동작을 교체하지 않는다.
- 메모리 상태만 사용한다. 신청은 pending이며 실제 한도·서버 권한·인증·DB를 변경하지 않는다. 일별 값은 사용자 승인에 따라 원본 비율을 유지해 72.4K로 보정한다.

## Implementation

### I01. 고정 사용량과 신청 데이터 계약

- Related Files:
  - `config/token-preview.ts` :: 아래 타입·상수 — 토큰 화면의 데이터 계약; new
  - `config/profile-preview.ts` :: `PROFILE_TOKEN_USAGE`, `ProfilePreviewState`, `ProfilePreviewAction` — 기존 기준값 및 상태 통합; modify
  - `C:/Users/김세정/Downloads/KPC_제안서작성AI_mock-up.html` :: `USAGE`, `TR` — 참고 자료; read-only

#### Details

**Signatures & Types**:

```typescript
export type TokenDialogView = "usage" | "request";
export type TokenAmountChoice = "30" | "50" | "100" | "custom";
export type TokenProjectId = "mois" | "edu" | "sample" | "outside";
export interface TokenProjectOption { id: TokenProjectId; name: string }
export interface TokenDailyUsage { day: number; tokens: number }
export interface TokenProjectUsage { id: TokenProjectId; name: string; tokens: number }
export interface TokenFeatureUsage { id: string; name: string; percent: number }
export interface TokenRecentUsage {
  id: string; timeLabel: string; projectName: string; operation: string; tokens: number;
}
export interface TokenUsageSnapshot {
  periodLabel: string; elapsedDays: number; daysInMonth: number;
  daily: readonly Readonly<TokenDailyUsage>[];
  byProject: readonly Readonly<TokenProjectUsage>[];
  byFeature: readonly Readonly<TokenFeatureUsage>[];
  recent: readonly Readonly<TokenRecentUsage>[];
}
export interface TokenRequestDraft {
  amountChoice: TokenAmountChoice; customAmountK: string;
  projectId: TokenProjectId; reason: string;
}
export interface ValidatedTokenRequest {
  amountK: number; amountTokens: number;
  projectId: TokenProjectId; projectName: string; reason: string;
}
export interface TokenRequestPreview extends ValidatedTokenRequest {
  id: string; requesterName: string; department: string | null;
  status: "pending"; createdAt: string;
}
export interface TokenRequestErrors {
  amount?: string; project?: string; reason?: string; form?: string;
}
export type TokenRequestValidation =
  | { ok: true; value: ValidatedTokenRequest }
  | { ok: false; errors: TokenRequestErrors };
export type TokenSubmitResult =
  | { ok: true; request: TokenRequestPreview }
  | { ok: false; errors: TokenRequestErrors };
export interface TokenPreviewState {
  dialogView: TokenDialogView | null;
  requestDraft: TokenRequestDraft;
  requests: TokenRequestPreview[];
}
export type TokenPreviewAction =
  | { type: "open"; view: TokenDialogView }
  | { type: "close" }
  | { type: "set-amount"; choice: TokenAmountChoice }
  | { type: "set-custom-amount"; value: string }
  | { type: "set-project"; projectId: TokenProjectId }
  | { type: "set-reason"; value: string }
  | { type: "submit"; requestId: string; submittedAt: string;
      requesterName: string; department: string | null };
```

**Data & Schema Fields**:

- `TOKEN_USAGE_SNAPSHOT: Readonly<TokenUsageSnapshot>` 상수에 아래 고정값을 정의한다. 모든 필드는 필수이고 `department`와 `dialogView` 이외에는 null을 사용하지 않는다.
- 기간 `2026.10.01 ~ 10.20`, elapsedDays20, daysInMonth31. daily는 day1~20에 `[2500,4000,1400,0,0,5600,6500,4500,4900,3100,0,0,7100,8600,6100,5700,4400,0,0,8000]`을 대응한다. 총72,400이며 런타임에 정규화하지 않는다.
- `TOKEN_PROJECT_OPTIONS: readonly Readonly<TokenProjectOption>[]`: mois=`초거대 AI 기반 맞춤형 지능 행정업무 에이전트 구축`, edu=`지능형 디지털 인재양성 AI 교육 통합 플랫폼`, sample=`[테스트용] 전 과정 샘플`, outside=`프로젝트 외 사용`. 모두 미리보기 선택지이며 실제 멤버십을 뜻하지 않는다.
- byProject는 위 ID 순서로 41,200/18,500/8,100/4,600. outside의 분석용 이름은 HTML처럼 `기타 · 프로젝트 외 질문`으로 별도 표시한다. 합계72,400.
- byFeature의 ID/name/percent: rfp/`RFP 분석`/22, draft/`초안 생성 · 재작성`/32, polish/`문장 다듬기`/18, slides/`슬라이드 생성`/16, review/`검수 · 누락 점검`/12. 합계100.
- recent id r1~r6: `10.20 08:52`/`초거대 AI 행정 에이전트`/`3.3 초안 재작성`/3120; `10.20 08:40`/같은 프로젝트/`문장 다듬기`/840; `10.19 17:12`/`AI 교육 통합 플랫폼`/`슬라이드 생성`/2260; `10.19 16:30`/같은 프로젝트/`요구사항 누락 점검`/1180; `10.19 11:05`/`초거대 AI 행정 에이전트`/`RFP 분석`/5400; `10.18 15:44`/`[테스트용] 전 과정 샘플`/`초안 생성`/1960. 일부 내역이므로 합계72,400을 강제하지 않는다.
- `TOKEN_REASON_PRESETS: readonly string[]`: `검수 의견 반영 재작성`, `RFP 변경 · 재분석`, `마감 전 슬라이드 재생성`.
- 초기 tokens: dialogView null; requestDraft `{amountChoice:"50",customAmountK:"",projectId:"mois",reason:""}`; requests 새 빈 배열. 기본값을 공유 mutable 객체로 재사용하지 않는다.
- amount는 K 단위 정수, amountTokens는 amountK×1000 정수. createdAt은 ISO8601 UTC 문자열. department만 null 허용. status는 pending만 허용하며 승인 상태를 미리 추가하지 않는다. projectId는 예시 선택지 ID에 연결한다.
- `ProfilePreviewState`에 필수 `tokens: TokenPreviewState` 추가. `ProfilePreviewAction`에 `{type:"token";action:TokenPreviewAction}` 추가. 토큰 타입은 `import type`만 사용한다. 기존 PROFILE_TOKEN_USAGE `{used:72400,limit:100000,warningThreshold:70}`는 기준값으로 유지하고 이 Task에서 바꾸지 않는다.

**Execution Flow / Logic**:

1. 원본 HTML의 일별62.2K 불일치는 사용자 승인에 따라 비율724/622를 적용하고 100토큰 단위 최대 나머지 배분(동률은 앞 날짜 우선)한 위 배열로 확정한다. 이 계산 코드는 앱에 추가하지 않는다.
2. 데이터는 화면용 상수로 내보내며 실제 Cosmos 모델이나 서버 DTO로 취급하지 않는다.
3. 정적 상수에는 HTTP/외부 예외 경로가 없다. 일관성은 I04의 합계 테스트로 보장한다.

### I02. 순수 검증·계산·신청 리듀서

- Related Files:
  - `lib/token-preview.ts` :: 아래 함수 — 입력 검증·상태 전환·계산; new
  - `lib/profile-preview.ts` :: `createInitialProfilePreviewState`, `profilePreviewReducer` — 하위 상태 위임; modify
  - `lib/profile-preview.ts` :: `formatTokenCount`, `getProfileTokenSummary` — T02 표시용으로 재사용; read-only symbols

#### Details

**Signatures & Types**:

```typescript
export function createInitialTokenPreviewState(): TokenPreviewState;
export function getRequestedTokenAmountK(draft: TokenRequestDraft): number | null;
export function validateTokenRequestDraft(
  draft: TokenRequestDraft, currentLimit: number,
): TokenRequestValidation;
export function tokenPreviewReducer(
  state: TokenPreviewState, action: TokenPreviewAction,
): TokenPreviewState;
export function getLatestPendingTokenRequest(
  requests: readonly TokenRequestPreview[],
): TokenRequestPreview | null;
export function estimateMonthEndUsage(
  used: number, elapsedDays: number, daysInMonth: number,
): number;
export function getUsageBarPercent(value: number, maximum: number): number;
```

**Data & Schema Fields**:

- 순수 함수는 인자로 받은 객체/배열을 변경하지 않는다. DOM·Date.now·randomUUID·fetch·스토리지 사용을 금지한다. 제출 시각/ID는 Provider에서 주입한다.
- `lib/token-preview.ts`는 config/token-preview와 config/profile-preview의 PROFILE_TOKEN_USAGE를 읽을 수 있지만 `lib/profile-preview.ts`를 import하지 않는다. 역방향 import로 리듀서 순환 의존성을 만들지 않는다.

**Execution Flow / Logic**:

1. `getRequestedTokenAmountK`: preset은 문자열30/50/100을 수치로 매핑한다. custom은 trim 후 `/^\d+$/`만 통과. 빈값·0·음수·소수·지수 표기·Infinity/NaN·안전 정수 초과 또는 ×1000이 안전 정수가 아니면 null. 앞뒤 공백·선행0은 허용하고 입력 원문은 변형하지 않는다. 업무상 상한값을 임의로 추가하지 않는다.
2. `validateTokenRequestDraft`: 위 수치와 currentLimit≥0 안전 정수, currentLimit+amountTokens 안전 정수 여부를 확인한다. 실패 amount=`신청량은 안전한 양의 정수(K)로 입력하세요.`; 잘못된 기준 한도는 form=`현재 한도를 확인할 수 없습니다.`. 프로젝트는 TOKEN_PROJECT_OPTIONS에서 ID를 찾고 없으면 project=`프로젝트를 선택하세요.`. reason.trim().length<2이면 reason=`신청 사유를 2자 이상 입력하세요.`. 모든 필드 오류를 모아 반환한다. 성공하면 프로젝트 이름·trim 사유·환산량을 포함한 value를 반환한다.
3. 초기화는 I01 기본값을 매 호출 새 객체로 반환한다. open usage는 view만 변경한다. open request는 amountChoice50/customAmountK빈값/reason빈값으로 초기화하되 projectId와 요청 목록은 유지한다. close는 dialogView만 null로 바꾼다. 취소 후 다시 열어도 동일한 초기화 규칙이다.
4. set-amount는 choice만 변경하고 custom 원문은 같은 열림 안에서는 보존한다. set-custom-amount는 custom 원문만 변경. set-project는 허용 ID만 수용하며 잘못된 런타임 값이면 원상태 반환. set-reason은 원문을 보관한다. 닫힌 상태의 필드 액션은 원상태 반환한다.
5. submit은 dialogView=request인 경우에만 수행한다. 기준 한도 PROFILE_TOKEN_USAGE.limit로 재검증한다. requestId/requesterName은 trim 후 비어 있으면 실패, submittedAt은 Date로 파싱 가능하며 new Date(submittedAt).toISOString()과 같은 ISO UTC 문자열이어야 한다. 유효성 확인 전에 toISOString을 호출해 예외를 만들지 않는다. 잘못된 payload·검증 실패·이미 있는 requestId면 원상태를 반환한다. 예외를 던지거나 요청 목록을 일부 변경하지 않는다.
6. 정상 submit은 value와 주입된 ID/신청자/부서/시각, status pending으로 요청을 만들어 requests의 앞에 추가하고 view=null로 닫는다. 초안의 프로젝트를 유지한다. used/limit 등 고정 상수를 변경하지 않는다. 최신 pending selector는 배열 앞에서 첫 pending을 반환하며 없으면 null.
7. estimate는 유한한 used≥0, 경과일>0, 전체일≥경과일인 정수일 때 round(used/elapsedDays*daysInMonth). 잘못된 입력/비유한 결과는0. 고정 예시는112220. bar percent는 maximum>0인 유한값에서 value/maximum×100을0~100으로 clamp하고 나머지는0. 최소 막대 높이 처리는 UI가 담당한다.
8. 기존 profile 초기 상태에 `tokens:createInitialTokenPreviewState()`를 넣고 type token이면 하위 리듀서에 위임한다. 하위 상태가 동일하면 기존 상위 state를 그대로 반환한다. 다른 action은 기존 notifications/preferences/previewRole 동작을 보존하고 tokens를 지우지 않는다.

### I03. Provider의 공용 모달 API와 제출/포커스 경계

- Related Files:
  - `components/profile/ProfilePreviewProvider.tsx` :: `ProfilePreviewContextValue`, `ProfilePreviewProvider` — 화면에서 사용하는 API; modify
  - `components/providers.tsx` :: `useAuthRuntime` — 기존 인증 정보; read-only

#### Details

**Signatures & Types**:

```typescript
export interface ProfilePreviewContextValue {
  authEnabled: boolean;
  rolePreviewEnabled: boolean;
  profile: ProfileDisplay;
  state: ProfilePreviewState;
  dispatch: Dispatch<ProfilePreviewAction>;
  openTokenDialog(view: TokenDialogView, returnFocusTo?: HTMLElement | null): void;
  closeTokenDialog(options?: { restoreFocus?: boolean }): void;
  submitTokenRequest(): TokenSubmitResult;
}
```

**Data & Schema Fields**:

- DOM 복귀 대상은 Provider의 `useRef<HTMLElement|null>(null)`에만 보관한다. 직렬화할 상태에 DOM을 넣지 않는다. 중복 제출 방지용 `useRef<boolean>(false)`도 Provider 내부에 둔다.
- 기존 guarded dispatch는 authEnabled일 때 set-role을 막는 동작만 유지한다. token 액션은 서버 권한을 부여하지 않으며 실제 API를 호출하지 않는다. context의 profile은 기존 resolveProfileDisplay 결과를 그대로 사용한다.

**Execution Flow / Logic**:

1. open은 returnFocusTo 인자가 제공되었을 때만 복귀 ref를 갱신한다. 인자 생략은 사용량↔신청 전환이므로 원래 프로필 버튼을 유지한다. request를 열면 제출 잠금을 해제하고 open 액션을 dispatch한다. 호출자는 T02에서 팝오버를 먼저 닫는다.
2. close는 close 액션을 dispatch하고 restoreFocus 기본true일 때 다음 requestAnimationFrame에 복귀시킨다. 대상은 connected·실제 표시됨·비활성/inert 조상 없음일 때만 focus({preventScroll:true}). 유효 대상이 없으면 표시된 `[data-sidebar-close]`, `#workspace-sidebar-trigger`, `#main-content` 순서로 같은 조건을 통과하는 첫 대상을 사용한다. restoreFocus=false는 경로 변경용이며 RAF도 만들지 않는다.
3. submit은 request 모드/미잠금 여부를 먼저 확인한다. 아니면 `{ok:false,errors:{form:"신청 화면을 다시 열어 주세요."}}`. draft를 현재 고정 한도로 검증하고 실패 결과를 그대로 반환한다. 이때 잠금/목록/열림을 변경하지 않는다.
4. 정상 입력이면 즉시 잠근 다음 `crypto.randomUUID()`, `new Date().toISOString()`, 현재 profile.name/department로 request를 만들고 submit 액션을 dispatch한다. reducer와 동일한 trim·값을 사용한다. 성공 결과 request를 반환하고 close의 focus 복귀 절차만 수행한다. 닫기 dispatch를 중복할 필요는 없다. 연속 두 번째 호출은 잠금으로 차단된다. 브라우저 기본 Web Crypto 외 의존성은 추가하지 않는다.
5. 이 Task에서 Toast나 Dialog를 마운트하지 않는다. 콜백은 useCallback, context는 useMemo에 통합하고 해당 state/profile 의존성을 정확히 포함해 오래된 초안을 제출하지 않도록 한다. 인증 가드·로그아웃·rolePreviewEnabled 규칙은 변경하지 않는다.
6. API 오류/HTTP 롤백은 없다. 전체 새로고침 시 초기화, 레이아웃 내 경로 이동 시 요청 목록 유지. 열림 모달의 경로 변경 닫기는 T02가 호출한다.

### I04. 도메인 회귀 검증

- Related Files:
  - `tests/lib/token-preview.test.ts` :: 토큰 계산·검증·리듀서 테스트; new
  - `tests/lib/profile-preview.test.ts` :: 하위 토큰 상태의 독립성·기존 상태 보존; modify
  - `tests/components/preview-role-boundary.test.ts` :: 기존 역할 경계 회귀 검증; read-only
  - `vitest.config.ts` :: node 환경·tests/**/*.test.ts 사용; read-only

#### Details

- 배열20일 합계72,400, 프로젝트 합계72,400, 기능 합계100, 최근6행 부분 집계, 기본값/서로 다른 초기 상태의 배열 독립성을 검증한다.
- 계산:112220 예측,0·유효하지 않은 경과일·비유한값, bar0/음수/최대초과/maximum0/NaN. 기존 formatTokenCount(112220)=112K 및 summary 잔여27600/72%는 기존 테스트를 보존한다.
- 입력:30/50/100, custom70/공백/선행0 정상; 빈값/0/음수/소수/1e3/Infinity/NaN/안전 정수 초과 실패. K×1000 및 한도 합산 정수 범위 경계도 검증한다. 사유 공백/1자 실패·trim2자 성공, 잘못된 프로젝트 실패, 모든 오류 동시 반환.
- 상태: request open 기본50·사유초기화·프로젝트보존, usage→request 재초기화, cancel/reopen, preset/custom 전환 중 원문보존, 사유 예시 교체에 해당하는 set-reason, 닫힌 상태 필드 액션 무시.
- 제출: pending 앞에 추가·기존 요청보존·latest선택·view닫힘; 같은ID 중복/잘못된metadata/유효하지 않은 초안은 원상태; 이미 pending이 있어도 다음 정상 요청 허용; 한도·사용량 상수 불변.
- 상위 상태: token 액션 후 role/tab/notifications/preferences 보존, 역할 전환 후 tokens 보존, 하위 no-op 시 동일 참조, 이전 알림/설정 테스트 전체 유지. DOM/네트워크 없이 순수 함수 위주로 검증한다. 렌더링 CSS를 복제하는 테스트나 새 jsdom 패키지는 추가하지 않는다.

## Acceptance Criteria

- [x] 기준 상단·프로젝트·일별 합계72,400과 고정 예측112220이 일치한다.
- [x] 양의 정수 K·사유·프로젝트 검증 및 초안 초기화 규칙을 테스트로 입증한다.
- [x] 로컬 pending 요청을 추가하며 used72400/limit100000을 바꾸지 않는다.
- [x] Provider API가 타입 검사되고 기존 프로필 역할/알림/설정 동작을 보존한다.
- [x] 의존성·인증·Azure·구분선·프로필 스타일·삭제한 문구를 변경하지 않는다.

## Validation

모든 명령은 저장소 루트 PowerShell에서 실행한다. 계획 작성 중에는 실행하지 않는다.

```powershell
npm.cmd run typecheck
npm.cmd test -- tests/lib/token-preview.test.ts tests/lib/profile-preview.test.ts
npm.cmd run lint
git diff --check
```

타입/대상 도메인 테스트/lint 성공. `npm.cmd test -- tests/components/preview-role-boundary.test.ts`로 기존 역할 경계도 확인한다. 이 테스트의 mock은 사용하는 authEnabled/previewRole만 제공하므로 새 context 전체를 임의로 복제하지 않는다. UI는 기존 안내 상태가 유지되는 것이 이 Task의 중간 결과다.

## Commit Message

```text
feat(profile): 사용량 데이터와 토큰 신청 미리보기 상태 추가

Plan: 2026-10-27-token-usage-request-modals
Phase: P01-token-modals
Task: T01-token-preview-model

- 일별 합계를 72.4K로 맞추고 분석용 고정 데이터를 정의
- 신청 검증과 승인 대기 상태 및 Provider API 추가
- 입력 경계와 기존 프로필 상태 보존 검증
```

커밋 전 diff를 확인하고 Task 파일·phase.md·current.md를 실행 workflow대로 갱신한다. 계획 시작부터 있던 NavSidebar/ProfileGeneralTab/ProfileMenu의 사용자 변경을 자동 스테이징하지 않는다. 기능 변경과 겹치는 경우에도 기존 변경을 되돌리지 않는다. T01 완료 후 Active Task는 T02로 이동한다.

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 완료 기록과 같은 커밋

## Execution Notes

- typecheck/lint/diff check 통과. 토큰·프로필·역할 경계 3개 파일 96개 테스트 통과.
- 분석 데이터 합계72,400, 예상112220, 입력 범위·재진입·중복ID·pending 보존을 검증했다.
- Provider는 모달 API만 추가했고 화면 진입은 기존 안내 상태다. 사용자 UI 변경 3개는 보존하고 커밋에서 제외했다.
- 요청 밖 추가 수정: 특이사항 없음. 실제 DOM 포커스·제출 연타는 T02 브라우저 검증 대상이다.
