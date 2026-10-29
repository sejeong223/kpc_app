# Task: T04 3단계 메뉴·공유 상태·프로필 연결

## Status: done

## Goal
일반/부서/슈퍼 역할의 메뉴와 공유 저장소를 연결하고 기존 토큰 신청·개인 한도가 새 관리자 데이터와 함께 동작하도록 전환한다.

## Decision Summary
- 프로필 reducer는 UI 상태만 보관하고 신청·한도는 서비스로 이동한다. 실제 인증 User/Admin 검사는 유지하며 AUTH_ENABLED=false에서만 역할을 전환한다.
- 선행: T01~T03 완료. 계획 2026-10-29-admin-mock-ui, Phase P01-admin-mock-ui. 청사진 지정 파일만 변경한다.

## Implementation

### I01. Provider 순서와 Query 훅
- Related Files:
  - `components/admin/AdminRuntimeProvider.tsx` :: AdminRuntimeProvider/useAdminRuntime — new
  - `hooks/admin/use-admin-data.ts` :: 부록의 조회/변경 훅 — new
  - `lib/admin/query-keys.ts` :: adminQueryKey — new
  - `lib/admin/runtime-actor.ts` :: resolveAdminActor — new
  - `app/(authenticated)/layout.tsx` :: AuthenticatedLayout — modify
  - `components/providers.tsx` :: useAuthRuntime — read-only
#### Details
- **Signatures & Types**:
~~~typescript
declare function resolveAdminActor(input: {
  authEnabled: boolean; session: import("next-auth").Session | null;
  previewRole: AdminRole; profile: ProfileDisplay;
}): AdminActor;
declare function adminQueryKey(input: {
  actor: AdminActor; revision: number; kind: string;
  filter?: UserQuery | GroupQuery | TokenQuery | AuditQuery | DashboardQuery;
}): readonly ["admin-mock", string, AdminRole, string | null, number, string, UserQuery | GroupQuery | TokenQuery | AuditQuery | DashboardQuery | null];
~~~
runtime/훅의 나머지 시그니처는 자체 포함 UI 계약을 따른다.
- **Data & Schema Fields**:
  - Provider 순서: 기존 AuthRuntime/SessionProvider → FluentUiProvider → ProfilePreviewProvider → AdminRuntimeProvider → AppShell 및 형제 TokenDialogs.
  - AdminRuntimeProvider의 내부 인스턴스에서 QueryClient와 MockAdminDataService를 useState lazy initializer로 각각1개 생성한다. seedSelf는 profile.name/email, authDisabled이면 d-ai, authEnabled이면 departmentId=null을 사용한다.
  - 동일 예시 사용자 ID=u-self를 세 역할에서 유지한다. authDisabled role은 previewRole, authEnabled role은 실제 세션 Admin이 있으면super_admin, 그 외 정상User는user. 이 매핑은 기존 Admin의 전사 접근 의미를 mock표현에 대응시키며 세션 claim 자체는 수정하지 않는다.
  - 실제 로그인 identity가 달라질 때 내부 Provider key(authEnabled+oid/email+정규화된실제roles)를 변경하여 store/cache를 폐기한다. 미리보기 역할 변경은 store를 재생성하지 않는다.
- **Execution Flow / Logic**:
  1. 서버 requireAppAccess와 dynamic=force-dynamic을 보존한다. 클라이언트 Provider에서 서버환경모듈·AuthService를 import하지 않는다.
  2. service.subscribe/getRevision을 useSyncExternalStore에 연결한다. server snapshot도 초기 revision1로 안정적이다. 구독 콜백의 this 바인딩을 보존한다.
  3. 각 Query는 부록의 actor/role/department/revision/filter 키를 사용한다. SSR에서 실제 데이터 요청/전역 저장소를 생성하지 않으며 서버 prefetch는 추가하지 않는다.
  4. read 권한은 getAccess를 먼저 읽어 enabled를 제한한다. 비허용 리소스에서 서비스 호출 자체를 하지 않고 forbidden 상태를 표시한다. 서비스 역시 권한을 재검사한다.
  5. mutation은 useMutation으로 execute/export를 호출한다. export도 감사 기록 때문에 mutation이다. retry=false, optimistic update 없음. 저장 후 새 revision으로 재조회하며 이전revision 쿼리는 취소/제거한다.
  6. 같은 render에서 seed 전체를 캐시에 넣지 않는다. getAccess 응답에는 개인 grant만 있고 리소스별 데이터는 별도키다. 역할 전환 중 이전 캐시를 placeholder로 쓰지 않는다.
  7. 실패는 AdminDataError.code에 따라 필드오류/권한 변경/충돌 메시지를 반환한다. CONFLICT에서는 입력을 보존하고 새로 불러오기 동작을 제공한다. 실제 데이터 권한을 부여하는 코드로 설명하지 않는다.

### I02. 메뉴 통합과 서버 라우트
- Related Files:
  - `config/sidebar.ts` :: SidebarScreen, getVisibleSidebarGroups, getSidebarItemByScreen/Pathname — modify
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: WorkspaceScreenPage — modify
  - `components/admin/AdminScreenRouter.tsx` :: 정적 화면 dispatch — new
  - `components/profile/PreviewRoleBoundary.tsx` :: 미리보기 role 경계 — modify
  - `components/layout/NavSidebar.tsx`, `AppHeader.tsx`, `AppShell.tsx` :: 노출·제목·본문여백 — modify
  - `lib/auth/guards.ts`, `lib/auth/roles.ts`, `lib/auth/access-policy.ts`, `app/(authenticated)/admin/layout.tsx` :: 실제 인가 — read-only
#### Details
- **Signatures & Types**:
~~~typescript
interface WorkspaceScreenPageProps {
  params: Promise<{ screen: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}
interface AdminScreenRouterProps {
  screen: "users" | "policy" | "audit" | "dashboard";
  requestedTab: "models" | "tokens" | null;
}
~~~
- **Data & Schema Fields**: sidebarGroups 일반7개와 관리자7개로14개 항목. policy 라벨=모델·토큰 관리, tokens 항목은 삭제하되 legacy URL 허용 목록에는 tokens를 유지한다. getSidebarItemByScreen("tokens")는 policy메타데이터를 반환하고 getSidebarItemByPathname은 exact pathname만 처리한다.
- **Execution Flow / Logic**:
  1. screen 허용목록 검사→authEnabled이면 기존 Admin 가드 await→legacy tokens이면 redirect("/workspace/policy?tab=tokens")→정상화된 탭을 router에 전달한다. legacy 콜백URL은 /workspace/tokens를 사용한다.
  2. 일반7개와 prompt-sets/skills/templates는 기존 안내 화면을 유지한다. 4개 대상만 정적 import된 AdminScreenRouter로 보낸다. 사용자 입력 경로로 동적 import하지 않는다.
  3. 이 Task의 router에는 정상 제목/예시데이터/안내 상태를 반환하는 4개 분기만 먼저 만들고 T05~T08에서 해당 실화면 import로 한 분기씩 교체한다. 미완성 파일을 미리 import하지 않는다.
  4. AUTH_ENABLED=false: 기본super_admin, department_admin도 아래쪽7개 노출, user는 위쪽7개만 노출. AUTH_ENABLED=true: session Admin은14개, User는7개, 미로그인0개. 클라이언트 previewRole은 실제 권한에 영향없음.
  5. user로 전환해 관리자 URL에 남아 있으면 PreviewRoleBoundary가 즉시 null 반환하고 /workspace/pipeline으로 replace한다. 일반화면까지 숨기지 않는다.
  6. AppShell 관리자4개 화면에서만 padding22px28px/모바일20px16px를 적용하고 min-width:0을 유지한다. 나머지홈/일반화면의1320px/40px38px 디자인을 바꾸지 않는다.
  7. 헤더는 통합 메뉴명을 표시하고 쿼리탭에 따라 메뉴 항목이 두 개 생기지 않게 한다. 사이드바 구분선·접힘220/54px·하단181px프로필 크기는 유지한다.

### I03. 프로필 상태와 신청 UI 이관
- Related Files:
  - `config/profile-preview.ts` :: PreviewRole/ProfileDisplay/ProfilePreviewState — modify
  - `config/token-preview.ts` :: TokenPreviewState/Action/RequestPreview — modify
  - `lib/profile-preview.ts` :: initial/reducer/resolveProfileDisplay/shouldHidePreviewScreen — modify
  - `lib/token-preview.ts` :: UI reducer/검증/어댑터 — modify
  - `components/profile/ProfilePreviewProvider.tsx` :: UI 상태 공급 — modify
  - `components/profile/ProfileGeneralTab.tsx`, `ProfileMenu.tsx` :: 역할·사용량 표시 — modify
  - `components/profile/token/TokenDialogs.tsx`, `TokenRequestPanel.tsx`, `TokenUsagePanel.tsx` :: 서비스 데이터 연결 — modify
#### Details
- **Signatures & Types**:
~~~typescript
type PreviewRole = AdminRole;
type TokenPreviewState = { dialogView: TokenDialogView | null; requestDraft: TokenRequestDraft };
type TokenPreviewAction =
  | { type: "open"; view: TokenDialogView } | { type: "close" }
  | { type: "set-amount"; choice: TokenAmountChoice }
  | { type: "set-custom-amount"; value: string }
  | { type: "set-project"; projectId: TokenProjectId }
  | { type: "set-reason"; value: string };
interface TokenRequestPreview extends ValidatedTokenRequest {
  id: string; requesterName: string; department: string | null;
  status: RequestStatus; createdAt: string;
}
declare function toTokenUsageSnapshot(view: SelfUsageView): TokenUsageSnapshot;
declare function toTokenRequestPreview(request: AdminTokenRequest, departments: readonly AdminDepartment[]): TokenRequestPreview;
~~~
- **Data & Schema Fields**: 기존 draft 기본50K/사유빈값/project=mois, 재진입시금액·사유리셋/프로젝트유지, notification/preferences 구조 유지. requests 배열과 submit reducer 액션은 제거한다. static TOKEN_USAGE_SNAPSHOT/PROFILE_TOKEN_USAGE는 seed용으로 남길 수 있지만 runtime UI에서 직접 읽지 않는다.
- **Execution Flow / Logic**:
  1. PreviewRole 초기값super_admin, 토글3항목 라벨은슈퍼 관리자/관리자/일반 사용자. ProfileMenu의 배지/아이콘관리색은 role!=user, 라벨은명시맵으로 표시한다. role별표현을 삼항admin/user로 남기지 않는다.
  2. ProfilePreviewProvider의 submitTokenRequest 메서드·submissionLocked·원장쓰기를 제거한다. Provider는 모달열기/닫기/복귀포커스와 UI reducer만 담당하므로 하위 AdminRuntimeProvider를 역참조하지 않는다.
  3. ProfileGeneralTab와 TokenDialogs는 useAdminSelf를 읽어 used/limit/requests를 표시한다. 초기 로딩/오류에는 가짜0 한도 대신 로딩/재시도와 신청disabled를 제공한다. 최신pending뿐 아니라 가장최근처리 결과도 승인/반려로 표시한다.
  4. TokenRequestForm은 useAdminCommand.mutateAsync submit-token-request를 호출한다. 제출 전 validateTokenRequestDraft(draft,currentLimit), 제출중은 동기 ref잠금과 isPending을 같이 적용한다. async 이전에 form element를 지역변수로 잡아 오류후포커스가 가능한 상태로 보관한다.
  5. submissionId는 폼 진입시1회 생성하고 실패 재시도에 재사용한다. 제출값을 수정하면 새ID를 발급한다. 같은값 중복전송은 서비스가중복방지한다.
  6. 성공 receipt.createdRequest가 있는지 확인한 뒤 closeTokenDialog 및 성공토스트를 표시한다. 실패/권한없음/버전충돌에서 폼을 닫거나 신청값을 삭제하지 않는다.
  7. onSubmit 폼 props는 React.FormEvent<HTMLFormElement> 반환void를 유지하고 내부 async 함수를 void 호출하며 에러를 내부에서 처리한다. 기존 TokenRequestErrors의 amount/project/reason/form 매핑을 보존한다.
  8. limit이100K→150K로 바뀌면 모든 개인 사용량/예상한도/잔여값이 같은 Query 데이터로 갱신된다. 신청만으로 limit이바뀌면 안 된다.
  9. snapshot 변환은 날짜별0일채움, 프로젝트합계,기능별비율(정수퍼센트는 최대나머지배분),최근6행을 동일 usage에서 계산한다. 요청projectId outside는 service의null로 변환한다.
  10. 프로필 링크는 슈퍼일 때 '전사 토큰·비용 관리', 부서 관리자일 때 '부서 토큰·비용 관리', 일반은 미표시. href는 /workspace/policy?tab=tokens.
  11. TokenUsagePanel의 시각 구조/기존 모달560·760 폭은 유지한다. TokenDialogs의 단일 Dialog, 이동시닫기, Escape, 모바일사이드바와포커스 충돌방지 로직을 보존한다.
  12. 실제 로그인 모드에서는 role전환을disabled하고 dispatch set-role도무시한다. session의 roles 타입/normalizeRoles를확장하지 않는다.

### I04. 연결·경계 회귀 검증
- Related Files:
  - `tests/config/sidebar.test.ts`, `tests/app/workspace/screen.test.ts`, `tests/components/preview-role-boundary.test.ts` :: 기존14/7개·가드·redirect 계약으로 갱신; modify
  - `tests/lib/profile-preview.test.ts`, `tests/lib/token-preview.test.ts` :: UI reducer와기존검증 유지/원장시나리오 서비스로 이동; modify
  - `tests/lib/admin/runtime.test.ts`, `tests/lib/admin/query-keys.test.ts` :: actor/캐시분리; new
#### Details
- 기존 route 테스트는 모든15개가안내문구라고assert한다. 일반/비대상10개는기존검증 유지, 대상4개는 router를mock하여dispatch 검증, tokens는redirect별도검증으로 바꾼다.
- 가드가 resolve되기전 관리자 JSX 반환금지, 인증실패전파, 알수없는screen404, legacytokens가드후redirect를 유지한다.
- profile reducer의 requests/submit 검증은 제거한설계에 맞춰 서비스테스트로 이전하되 초안리셋/프로젝트유지/알림·환경설정보존 테스트는 남긴다.
- QueryClient의 prefetchQuery로 전사키/부서키에다른DTO를넣고 서로조회되지않음, revision변경/로그인identity변경 재사용없음, 잘못된부서null확대를 검증한다.
- 정적SSR는 useEffect를 실행하지 않으므로 리다이렉트·포커스는 실제브라우저에서 검증한다. node환경에 임의 DOM을 가정한 테스트를 쓰지 않는다.



## 자체 포함 계약 부록: 도메인과 서비스
이 부록은 선행/후속 Task와 공유하는 최종 계약이다. 이 Task의 Related Files에 지정된 부분만 구현한다. 모든 ID는 비어 있지 않은 문자열이고 날짜는 ISO UTC 문자열이다. DTO에 Date/BigInt 인스턴스를 넣지 않는다. 선언은 청사진이며 구현 코드가 아니다.

### 도메인 타입 — types/admin.ts, lib/admin/schemas.ts
전체 객체를 Zod strictObject 스키마로 정의하고 z.infer로 타입을 추론한다. 아래 선언은 정확한 결과 형태다. 입력/목록 하위 타입은 Pick/Omit 또는 스키마 pick/omit으로 만든다.

~~~typescript
type AdminRole = "super_admin" | "department_admin" | "user";
type CrudAction = "create" | "read" | "update" | "delete";
type AdminResource = "users" | "groups" | "modelSettings" | "pricing"
  | "tokenPolicies" | "tokenRequests" | "dashboard" | "audit" | "permissions";
type UserStatus = "active" | "invited" | "locked";
type RequestStatus = "pending" | "approved" | "rejected";
type JobKind = "analysis" | "checklist" | "search" | "slides" | "quality";
type UsageFeature = "rfp" | "draft" | "polish" | "slides" | "review";
type RfpStatus = "review" | "writing" | "submitted" | "won" | "lost" | "dropped";
type AuditAction = "create" | "read" | "update" | "delete" | "approve"
  | "reject" | "export" | "generate" | "restore";
type AuditResource = AdminResource | "rfp" | "document" | "usage";
interface AdminRecord { id: string; version: number; createdAt: string; updatedAt: string }
interface AdminDepartment { id: string; name: string }
interface AdminUser extends AdminRecord {
  name: string; email: string; departmentId: string | null; title: string;
  role: AdminRole; status: UserStatus; lastSeenAt: string | null; deletedAt: string | null;
}
interface AdminDirectoryEntry extends Pick<AdminUser, "id" | "name" | "email" | "departmentId" | "title"> {
  registeredUserId: string | null;
}
interface AdminGroup extends AdminRecord {
  name: string; memberIds: string[]; ownerId: string; deletedAt: string | null;
}
interface AdminGroupRow extends AdminGroup {
  ownerName: string; members: { id: string; name: string; departmentName: string }[];
}
interface AdminModel { id: string; name: string; provider: string }
interface AdminPrice extends AdminRecord {
  modelId: string; inputUsdMicrosPerMillion: number; outputUsdMicrosPerMillion: number;
}
interface CostSnapshot {
  priceId: string; priceVersion: number;
  inputUsdMicrosPerMillion: number; outputUsdMicrosPerMillion: number;
  krwMicrosPerUsd: number; capturedAt: string;
  amountUsdMicros: string; amountKrwMicros: string;
}
interface AdminUsage {
  id: string; userId: string; userName: string; departmentId: string | null;
  modelId: string; projectId: string | null; feature: UsageFeature;
  occurredAt: string; inputTokens: number; outputTokens: number; cost: CostSnapshot;
}
interface AdminTokenAccount extends AdminRecord {
  userId: string; month: string; limitTokens: number; paused: boolean;
}
interface AdminTokenRequest extends AdminRecord {
  requesterId: string; requesterName: string; departmentId: string | null;
  month: string; projectId: string | null; amountTokens: number; reason: string;
  status: RequestStatus; processedBy: string | null; processedAt: string | null;
}
interface AdminAuditEvent {
  id: string; occurredAt: string; actorId: string; actorName: string; actorEmail: string;
  departmentId: string | null; action: AuditAction; resource: AuditResource;
  detail: string; targetId: string; targetLabel: string; outcome: "success" | "failure";
  failureReason: string | null; requestId: string;
  usageId: string | null; tokens: number; ip: string; userAgent: string;
}
interface AdminRfp {
  id: string; number: string; name: string; departmentId: string;
  pmId: string; registeredAt: string; budgetKrw: number; status: RfpStatus;
}
interface AdminRfpRow extends AdminRfp { pmName: string; departmentName: string }
interface RoleGrants {
  role: AdminRole; grants: Record<AdminResource, Record<CrudAction, boolean>>;
}
interface AdminSettings {
  version: number; updatedAt: string;
  modelByJob: Record<JobKind, string>; krwMicrosPerUsd: number;
  monthlyTokenLimit: number; defaultPersonalLimit: number;
  warningPercents: [number, number];
}
interface AdminActor {
  userId: string; name: string; email: string;
  role: AdminRole; departmentId: string | null;
}
interface AdminStoreState {
  revision: number; permissionRevision: number; logicalNow: string;
  departments: AdminDepartment[]; users: AdminUser[]; groups: AdminGroup[];
  models: AdminModel[]; prices: AdminPrice[]; settings: AdminSettings;
  accounts: AdminTokenAccount[]; requests: AdminTokenRequest[];
  usages: AdminUsage[]; audits: AdminAuditEvent[]; rfps: AdminRfp[];
  roleGrants: RoleGrants[];
}
type NewAdminUser = Pick<AdminUser, "name" | "email" | "departmentId" | "title" | "role"> & { invite: boolean };
type EditAdminUser = Pick<AdminUser, "name" | "departmentId" | "title" | "role">;
type GroupDraft = Pick<AdminGroup, "name" | "memberIds">;
interface VersionedRef { id: string; version: number }
interface Period { from: string; to: string }
interface PageInput { page: number; pageSize: 10 | 20 | 50 }
interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number; totalPages: number }
interface MoneyTotal { usdMicros: string; krwMicros: string }
interface UserQuery extends PageInput {
  search: string; departmentId: string | null;
  role: AdminRole | "all"; status: UserStatus | "all";
}
interface GroupQuery extends PageInput { search: string }
type AuditSortKey = "occurredAt" | "actorName" | "action" | "resource" | "tokens" | "outcome";
interface AuditQuery extends PageInput, Period {
  userSearch: string; targetSearch: string;
  action: AuditAction | "all"; resource: AuditResource | "all";
  outcome: "all" | "success" | "failure"; sortKey: AuditSortKey; direction: "asc" | "desc";
}
interface TokenQuery extends Period {
  month: string; search: string; departmentId: string | null;
  status: "all" | "normal" | "warning" | "over" | "paused";
}
interface DashboardQuery extends Period {
  rfpStatus: RfpStatus | "all" | "progress";
  bucketStart: string | null; userSearch: string; rfpPage: number;
}
interface UserList {
  rows: PageResult<AdminUser>; departments: AdminDepartment[];
  roleCounts: Record<AdminRole | "all", number>;
  statusCounts: Record<UserStatus, number>;
}
interface TokenAccountRow {
  id: string; userId: string; name: string; departmentId: string | null;
  departmentName: string; title: string; version: number;
  usedTokens: number; limitTokens: number; paused: boolean;
  status: "normal" | "warning" | "over" | "paused";
}
interface ModelCostRow extends MoneyTotal {
  id: string; modelName: string; inputTokens: number; outputTokens: number;
}
interface TokenOverview {
  rows: TokenAccountRow[];
  departments: AdminDepartment[];
  byDepartment: { id: string; name: string; usedTokens: number; userCount: number }[];
  usedTokens: number; personalLimitsTotal: number;
  models: ModelCostRow[]; cost: MoneyTotal;
  settings: TokenPolicyView | null;
}
type TokenPolicyView = Pick<AdminSettings, "version" | "updatedAt" | "monthlyTokenLimit" | "defaultPersonalLimit" | "warningPercents">;
interface ModelSettingsView extends Pick<AdminSettings, "version" | "updatedAt" | "modelByJob"> { models: AdminModel[] }
interface PricingView extends Pick<AdminSettings, "version" | "updatedAt" | "krwMicrosPerUsd"> { models: AdminModel[]; prices: AdminPrice[] }
interface SelfUsageView {
  usedTokens: number; limitTokens: number; paused: boolean; warningPercent: number;
  requests: AdminTokenRequest[]; usage: AdminUsage[];
  month: string; from: string; to: string; elapsedDays: number; daysInMonth: number;
}
interface AuditList {
  rows: PageResult<AdminAuditEvent>; successCount: number; failureCount: number;
  actions: AuditAction[]; resources: AuditResource[];
}
interface TrendPoint {
  id: string; label: string; activities: number; activeUsers: number; generations: number;
  downloads: number; tokens: number; cost: MoneyTotal;
}
interface NamedCount { id: string; label: string; count: number; failures: number }
interface DashboardView {
  period: Period; activityPeriod: Period | null; activityCapped: boolean;
  rfpCounts: Record<RfpStatus, number>; totalRfps: number;
  activities: number; activeUsers: number; generations: number; downloads: number;
  tokens: number; cost: MoneyTotal;
  registrations: { id: string; label: string; from: string; to: string; count: number }[];
  distribution: Record<RfpStatus, number>; selectedRfpCount: number;
  wonBudgetKrw: number;
  departments: { id: string; name: string; counts: Record<RfpStatus, number>; total: number; wonBudgetKrw: number }[];
  rfps: PageResult<AdminRfpRow>;
  trends: TrendPoint[]; actions: NamedCount[]; resources: NamedCount[]; details: NamedCount[];
  users: { id: string; name: string; departmentName: string; activities: number;
    rfpCreates: number; sectionWrites: number; generations: number; downloads: number; failures: number;
    tokens: number; cost: MoneyTotal }[];
}
interface AdminAccessView {
  actor: AdminActor; revision: number; permissionRevision: number;
  grants: Record<AdminResource, Record<CrudAction, boolean>>;
  departments: AdminDepartment[]; logicalNow: string;
}
type AdminErrorCode = "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INACTIVE_USER";
class AdminDataError extends Error {
  readonly code: AdminErrorCode;
  readonly fieldErrors: Record<string, string>;
  constructor(code: AdminErrorCode, message: string, fieldErrors?: Record<string, string>);
}
type AdminCommand =
  | { type: "create-user"; value: NewAdminUser }
  | { type: "add-directory-users"; ids: string[]; role: AdminRole; invite: boolean }
  | { type: "update-user"; target: VersionedRef; value: EditAdminUser }
  | { type: "change-user-role"; targets: VersionedRef[]; role: AdminRole }
  | { type: "set-user-status"; targets: VersionedRef[]; status: "active" | "locked" }
  | { type: "delete-users"; targets: VersionedRef[] }
  | { type: "resend-invite"; target: VersionedRef }
  | { type: "create-group"; value: GroupDraft }
  | { type: "update-group"; target: VersionedRef; value: GroupDraft }
  | { type: "delete-group"; target: VersionedRef }
  | { type: "undo-delete"; undoToken: string }
  | { type: "save-grants"; permissionRevision: number; rows: RoleGrants[] }
  | { type: "save-model-defaults"; version: number; value: Record<JobKind, string> }
  | { type: "save-price"; target: VersionedRef; inputUsdMicrosPerMillion: number; outputUsdMicrosPerMillion: number }
  | { type: "save-fx"; version: number; krwMicrosPerUsd: number }
  | { type: "save-token-policy"; version: number; monthlyTokenLimit: number; defaultPersonalLimit: number; warningPercents: [number, number] }
  | { type: "set-token-limit"; target: VersionedRef; limitTokens: number }
  | { type: "set-token-paused"; target: VersionedRef; paused: boolean }
  | { type: "submit-token-request"; submissionId: string; projectId: string | null; amountTokens: number; reason: string }
  | { type: "process-token-request"; target: VersionedRef; status: "approved" | "rejected" };
interface CommandReceipt {
  revision: number; changedIds: string[];
  createdRequest: AdminTokenRequest | null; undoToken: string | null;
}
interface AdminDataService {
  getAccess(actor: AdminActor): Promise<AdminAccessView>;
  getUsers(actor: AdminActor, query: UserQuery): Promise<UserList>;
  getGroups(actor: AdminActor, query: GroupQuery): Promise<PageResult<AdminGroupRow>>;
  getDirectory(actor: AdminActor): Promise<AdminDirectoryEntry[]>;
  getRoleGrants(actor: AdminActor): Promise<RoleGrants[]>;
  getModels(actor: AdminActor): Promise<ModelSettingsView>;
  getPricing(actor: AdminActor): Promise<PricingView>;
  getTokenRequests(actor: AdminActor): Promise<AdminTokenRequest[]>;
  getTokens(actor: AdminActor, query: TokenQuery): Promise<TokenOverview>;
  getSelf(actor: AdminActor): Promise<SelfUsageView>;
  getAudit(actor: AdminActor, query: AuditQuery): Promise<AuditList>;
  getDashboard(actor: AdminActor, query: DashboardQuery): Promise<DashboardView>;
  exportUsers(actor: AdminActor, query: UserQuery): Promise<string>;
  exportAudit(actor: AdminActor, query: AuditQuery): Promise<string>;
  execute(actor: AdminActor, command: AdminCommand): Promise<CommandReceipt>;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
~~~

### 고정 업무 규칙
- 역할 라벨: super_admin=슈퍼 관리자, department_admin=관리자, user=일반 사용자. 실제 APP_ROLES는 User/Admin으로 유지한다.
- CRUD 최대치: super_admin은 users/groups의 CRUD, 나머지 설정·신청의 R/U, dashboard/audit의 R. department_admin은 users R, tokenPolicies R, tokenRequests R/U(승인·반려만), dashboard/audit R. groups/modelSettings/pricing/permissions는 없음. user는 관리자 리소스 전부 없음.
- 권한표 초기값은 위 최대치. 상한을 넘는 체크는 저장 거절. read=false이면 같은 리소스 C/U/D=false. permissions의 super_admin R/U는 고정하여 관리자 잠금을 방지한다.
- 메뉴 7+7개는 역할 기준으로 표시한다. 권한표에서 R을 끄더라도 메뉴 그룹 기준을 바꾸지 않고 본문에 접근 불가 상태를 제공한다. 특수 승인 동작은 tokenRequests U와 부서 범위를 모두 검사한다.
- department_admin의 departmentId=null이면 부서 조회/처리를 거절한다. null을 전체로 해석하지 않는다. 본인 사용량/신청은 관리자 권한표와 별개로 자기 userId만 허용한다.
- 부서 제한은 사용자 목록=현재 부서, 사용/신청/로그=당시 departmentId, RFP=등록 부서에 적용한다. 글로벌 정책 로그 departmentId=null은 부서 관리자에게 노출하지 않는다.
- 비용: 100만 토큰당 USD 단가를 1e-6 USD 정수로, 환율을 1e-6 KRW/USD 정수로 저장한다. 금액 DTO는 1e-6 단위의 10진 정수 문자열이다.
- A=inputTokens×inputUsdMicrosPerMillion+outputTokens×outputUsdMicrosPerMillion. USD micros=halfUp(A/1e6), KRW micros=halfUp(A×krwMicrosPerUsd/1e12). 양수 BigInt 정수 연산을 사용한다. 원화 표시는 micros 합산 후 원 단위 halfUp, USD 표시는 소수 6자리까지다. 원장의 cost는 다시 최신 단가로 계산하지 않는다.
- 논리 시계 시작=2026-10-20T00:00:00.000Z(한국 09시). mutation마다 1ms 증가. 모든 화면에 작은 '예시 데이터 · 기준일 2026.10.20' 표시. 날짜 필터는 한국 날짜의 00:00 이상 다음날 00:00 미만, 최근 90일은 2026-07-23~10-20.
- 필터 search는 trim 및 소문자 비교, 빈 문자열은 전체. page는 1부터, totalPages는 빈 목록도 1, 요청 page는 최종 범위로 보정한다.
- 사용자 삭제는 deletedAt으로 보관하고 목록에서 제외한다. 과거 이름/부서 스냅샷, 사용량, 신청, 로그는 보존한다. 초대·메일은 시뮬레이션이다.
- 모든 입력은 스키마 및 참조 무결성 검사 후 처리한다. 모든 쓰기는 복사본 검증→한 번에 commit→revision 증가→구독 알림 순서이며 실패 시 상태·감사 로그·revision이 부분 반영되지 않는다.
- 예외는 AdminDataError로 통일한다. 내부 실패는 instanceof Error로 한국어 일반 오류로 바꾸며 내부 구현/입력 전체를 노출하지 않는다. 실제 HTTP가 없는 mock에서 HTTP 요청/상태 코드를 꾸며내지 않는다.


## 자체 포함 계약 부록: 화면 연결
### 공용 UI — components/admin/ui
~~~typescript
interface AdminPageProps { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }
interface AdminCardProps { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }
interface AdminMetricProps { label: string; value: string; caption?: string; selected?: boolean; onClick?: () => void; tone?: "neutral" | "brand" | "success" | "warning" | "danger" }
interface AdminColumn<Row extends { id: string }> {
  id: string; label: string; render(row: Row): React.ReactNode;
  width?: string; align?: "start" | "end"; sortable?: boolean;
}
interface AdminTableProps<Row extends { id: string }> {
  label: string; rows: readonly Row[]; columns: readonly AdminColumn<Row>[];
  selectedIds?: readonly string[]; onSelectionChange?: (ids: string[]) => void;
  expandedId?: string | null; onExpand?: (id: string | null) => void;
  renderExpanded?: (row: Row) => React.ReactNode; emptyMessage: string;
  sort?: { columnId: string; direction: "asc" | "desc" };
  onSort?: (columnId: string) => void;
}
interface AdminPagerProps { page: number; total: number; pageSize: number; onChange(page: number): void }
interface AdminTabsProps<T extends string> { label: string; value: T; options: readonly { value: T; label: string }[]; onChange(value: T): void }
interface AdminAsyncStateProps {
  state: "loading" | "error" | "forbidden" | "empty"; message?: string; onRetry?: () => void;
}
interface AdminPeriodFilterProps { value: Period; onChange(value: Period): void; maxDate: string }
~~~
- AdminPrimitives.tsx에서 AdminPage/AdminCard/AdminMetric을 제공한다. 나머지 컴포넌트는 이름과 같은 TSX 파일로 나눈다. 문서·주석·실제 UI는 한국어로 작성한다.
- 기존 ModalFrame props: open:boolean, title:string, subtitle?:string, width?:number, contentKey:string, children:ReactNode, footer:ReactNode, onClose():void. Dialog/포커스/Escape 제어를 재사용한다.
- 기존 SegmentedControl<T extends string>: ariaLabel, options:{value,label,disabled?}[], value, onChange, disabled?, fullWidth?, className?, variant:"segmented"|"chips".
- 기존 lib/pagination.ts의 getPaginationItems({totalPages,currentPage,siblingCount?})를 재사용한다.
- 배치에는 tw: 접두사 Tailwind 클래스, Fluent 자체 스타일 변경에 makeStyles/mergeClasses를 사용한다. 동적 클래스를 문자열 조합하지 않고 완전한 클래스 문자열의 매핑을 사용한다.
- 표는 의미 있는 table/th/td, 정렬은 th 안 버튼과 aria-sort, 행 펼침은 별도 버튼으로 키보드 접근 가능하게 한다. 선택은 현재 페이지 기준, 필터 변경 시 선택 초기화.
- 원본 .page의 여백을 AppShell 여백에 다시 더하지 않는다. 관리자 본문 여백은 데스크톱 22px 28px, 760px 이하 20px 16px로 셸 한곳에서 처리한다.
- 고정 높이 표를 만들지 않는다. 작은 화면에서는 표 영역만 가로 스크롤, 필터/액션은 줄바꿈, 모달은 기존 max-height/본문 스크롤을 사용한다.

### 런타임과 훅 — components/admin/AdminRuntimeProvider.tsx, hooks/admin/use-admin-data.ts
~~~typescript
interface AdminRuntime {
  actor: AdminActor; service: AdminDataService; revision: number;
  queryClient: import("@tanstack/react-query").QueryClient;
}
declare function useAdminRuntime(): AdminRuntime;
declare function useAdminAccess(): import("@tanstack/react-query").UseQueryResult<AdminAccessView, AdminDataError>;
declare function useAdminUsers(q: UserQuery): import("@tanstack/react-query").UseQueryResult<UserList, AdminDataError>;
declare function useAdminGroups(q: GroupQuery): import("@tanstack/react-query").UseQueryResult<PageResult<AdminGroupRow>, AdminDataError>;
declare function useAdminDirectory(): import("@tanstack/react-query").UseQueryResult<AdminDirectoryEntry[], AdminDataError>;
declare function useAdminGrants(): import("@tanstack/react-query").UseQueryResult<RoleGrants[], AdminDataError>;
declare function useAdminModels(): import("@tanstack/react-query").UseQueryResult<ModelSettingsView, AdminDataError>;
declare function useAdminPricing(): import("@tanstack/react-query").UseQueryResult<PricingView, AdminDataError>;
declare function useAdminRequests(): import("@tanstack/react-query").UseQueryResult<AdminTokenRequest[], AdminDataError>;
declare function useAdminTokens(q: TokenQuery): import("@tanstack/react-query").UseQueryResult<TokenOverview, AdminDataError>;
declare function useAdminSelf(): import("@tanstack/react-query").UseQueryResult<SelfUsageView, AdminDataError>;
declare function useAdminAudit(q: AuditQuery): import("@tanstack/react-query").UseQueryResult<AuditList, AdminDataError>;
declare function useAdminDashboard(q: DashboardQuery): import("@tanstack/react-query").UseQueryResult<DashboardView, AdminDataError>;
declare function useAdminCommand(): import("@tanstack/react-query").UseMutationResult<CommandReceipt, AdminDataError, AdminCommand>;
declare function useExportUsers(): import("@tanstack/react-query").UseMutationResult<string, AdminDataError, UserQuery>;
declare function useExportAudit(): import("@tanstack/react-query").UseMutationResult<string, AdminDataError, AuditQuery>;
~~~
- 초기 query.data는 undefined이므로 로딩 분기 전에 강제 단언하지 않는다.
- 훅은 Query를 통해 서비스 메서드를 호출한다. 컴포넌트에서 원장 배열을 import하거나 fetch를 직접 호출하지 않는다.
- 키는 ["admin-mock", actor.userId, actor.role, actor.departmentId, revision, kind, 입력값]이며 Access/개인 사용량도 동일 원칙. revision을 키에 넣으면 권한 변경 때 이전 결과가 그대로 남지 않는다.
- placeholderData/keepPreviousData로 역할·부서가 다른 이전 결과를 재사용하지 않는다. query retry=false, staleTime=Infinity, mutation retry=false, refetchOnWindowFocus=false. QueryClient와 mock service는 Provider별 생성, 모듈 전역 singleton 금지.
- 쓰기/내보내기 완료 후 서비스의 subscribe가 revision을 갱신하며 현재 관찰 쿼리가 새 키로 재조회된다. 이전 revision의 캐시는 취소·제거하되 진행 중 현재 revision을 제거하지 않는다.
- 새 역할·부서에서 기존 목록을 표시하지 않도록 화면 상태를 identity key(userId/role/departmentId)로 초기화한다. revision마다 폼 전체를 재마운트하지 않는다. dirty 폼은 version 충돌을 처리한다.
- 본문 마운트 전에 화면/리소스 R 권한을 확인한다. 데이터 쿼리 enabled도 actor/access 조건으로 제한한다. 역할 자체만으로 허용 액션 버튼을 렌더링하지 않는다.
- 샘플 HTTP/API는 만들지 않는다. 이 mock 검사는 개발 시연 데이터의 일관성 검사이며 실제 보안 권한 검사를 대신하지 않는다.

## Acceptance Criteria
- [x] 14개 메뉴의 3역할 노출·legacy URL·서버 Admin 검사에 회귀가 없다.
- [x] 프로필 신청과 서비스 원장이 하나이며 변경된 개인 한도를 같은 데이터로 표시한다.
- [x] 역할 변경으로 저장소가 초기화되지 않고 다른 범위 캐시가 노출되지 않는다.
- [ ] 모달 초안·포커스·모바일 동작과 실제 인증 경계를 유지한다. — 초안·인증 자동 검증 통과, 포커스·모바일 확인은 T09 대기

## Validation
- `npm test -- tests/config/sidebar.test.ts tests/app/workspace/screen.test.ts tests/components/preview-role-boundary.test.ts tests/lib/profile-preview.test.ts tests/lib/token-preview.test.ts tests/lib/admin/runtime.test.ts tests/lib/admin/query-keys.test.ts` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `npm run build` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과

## Commit Message
~~~text
feat(admin): 3단계 메뉴·공유 상태·프로필 연결

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T04-runtime-and-navigation

- 일반/부서/슈퍼 역할의 메뉴와 공유 저장소를 연결하고 기존 토큰 신청·개인 한도가 새 관리자 데이터와 함께 동작하도록 전환한다.
- 기존 화면·권한 연결 회귀 방지
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 메뉴·프로필·라우트·캐시 테스트 139개, typecheck, lint, build, diff 검사 통과. 기존 신청 reducer는 UI 전용으로 이관했고 서비스에서 중복 제출을 검증한다.
