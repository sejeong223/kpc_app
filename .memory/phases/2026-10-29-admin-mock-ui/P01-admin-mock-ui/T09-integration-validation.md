# Task: T09 통합 흐름·회귀·접근성 검증

## Status: in_progress

## Goal
9개 Task가 만든 관리자 기능과 기존 프로필·인증·디자인의 연결을 실제 시나리오로 검증하고 재현 가능한 완료 기록을 남긴다.

## Decision Summary
- 새 기능을 확대하지 않고 확정 범위의 통합 결함만 고친다. 실제 브라우저 검증이 불가능하면 통과로 기록하지 않는다.
- 선행: T01~T08 완료. 계획 2026-10-29-admin-mock-ui, Phase P01-admin-mock-ui.

## Implementation

### I01. 서비스·Query·프로필 통합 시나리오
- Related Files:
  - `tests/integration/admin-mock-workflow.test.ts` :: 역할/신청/승인/로그/집계/비용 통합 — new
  - `tests/services/admin/MockAdminDataService.test.ts`, `tests/lib/admin/query-keys.test.ts` :: 기존단위검증 — read-only
  - `components/admin/**`, `components/profile/**`, `hooks/admin/**`, `lib/admin/**` :: 통합 결함이 확인된 지정 기능만 — modify(필요시)
#### Details
- **Signatures & Types**: 부록 AdminDataService/Command/Query 계약과 toTokenUsageSnapshot(view:SelfUsageView):TokenUsageSnapshot, adminQueryKey 계약을 사용한다. node 환경 Vitest이므로 DOM이필요없는서비스/QueryClient통합만자동화한다.
- **Data & Schema Fields**: seed고정논리시각·u-self·role3단계·월2026-10. createId는테스트순번값을주입하여한사용자의동일신청/버전흐름을재현한다.
- **Execution Flow / Logic**:
  1. self user로개인used72400/limit100000 확인→50K신청→한도100000유지.
  2. 동일ID의department_admin으로전환→자기 부서신청확인→다른 부서신청ID처리NOT_FOUND/FORBIDDEN→허용요청승인→한도150000/approved/감사로그1건.
  3. 중복 승인CONFLICT 후한도150000유지→일반으로복귀해개인 한도/승인상태확인. 새신청반려는한도 변경없음.
  4. 슈퍼로사용자등록/수정→로그/활동수변경→필터CSV내보내기→대시보드downloads증가. 삭제와undo가과거사용량/이력을지우지않음.
  5. 단가/환율 변경→기존비용합계불변→동일 입력으로calculateCost를호출한새record값만변경. 실제AI요청시뮬레이션UI는추가하지않는다.
  6. 슈퍼전체cache를채운후부서scope키에서다른 부서이름/건수/비용이없음. permissionRevision/revision변경시구권한결과재사용없음.
  7. 서비스2개생성시요청/한도/삭제상태가서로독립이고새service는초기값으로돌아감을확인한다.

### I02. 실제 브라우저 검증과 회귀 수정
- Related Files:
  - `app/(authenticated)/layout.tsx`, `app/(authenticated)/workspace/[screen]/page.tsx`, `components/layout/*` :: 메뉴/라우트/레이아웃 회귀 — modify(필요시)
  - `.memory/reports/2026-10-29-admin-mock-ui-validation.md` :: 검증 보고서 — new
  - `.memory/reports/assets/2026-10-29-admin-mock-ui/` :: 필요 화면 증거 — new
#### Details
- **Signatures & Types**: 이 단계에서 새 API·DB·인증 역할은 정의하지 않는다. 발견한 통합 결함의 기존 시그니처를 유지하거나 관련청사진계약과함께갱신한다.
- **Execution Flow / Logic**:
  1. 기존dev서버포트점유를확인하고이번작업프로세스만관리한다. 미리보기는프로세스환경AUTH_ENABLED=false로실행할수있으며공유.env를수정하지않는다. 서버인증활성검증은기존가드테스트와세션mock으로수행한다.
  2. 허용된브라우저도구로1440×900,1024×768,768×1024,390×844,320×568,1024×500을확인한다. 연결도구가불가능하면미검증범위와오류를기록하고체크박스를완료로바꾸지않는다.
  3. 메뉴: 위7개전역할, 아래7개관리자이상, legacytokens→policytokens, 브라우저뒤로/앞으로/새로고침, 일반의관리URL직접진입, 알수없는URL404.
  4. 계정:3역할 전환에도신청/초안/선호설정유지, 실제 로그인모드role토글disabled, 부서null이전체 조회가되지않음.
  5. 사용자: 검색/역할카드/상태필터/페이지선택리셋, 입력 검증, 자기보호, group등록/편집/삭제, CRUD저장후버튼/본문차단.
  6. 토큰: 신청/중복 제출/승인/반려/개인 한도정지/정책저장,100K→150K동기화, 입력실패·충돌시폼보존.
  7. 비용: 단가6자리/환율/0단가/음수거절, 모델별합계/지난비용보존, 예시표시, 모델 설정과가격조회 권한분리.
  8. 로그·대시보드: 같은필터CSV/한국어다운로드/같은대상두이벤트상세,4탭공통기간,90일캡,막대선택범위,빈결과,차트보조표.
  9. UI: Fluent초기SSR와클라이언트이동스타일유지, Tailwindpreflight회귀없음, 모달1개·Tab/Escape·포커스복귀·모바일사이드바겹침·수평스크롤확인.
  10. 콘솔오류/hydration경고/예기치않은외부모델·DB·메일요청이없음을확인한다. 실제Azure/Entra/비용청구검증을수행했다고기록하지않는다.
  11. 발견된기능범위내결함을고치면관련Task의단위 테스트를우선재실행한다. 범위밖기능을발견했다는이유로추가구현을하지않는다.

### I03. 기록과 완료 조건
- Related Files:
  - `.memory/reports/2026-10-29-admin-mock-ui-validation.md` :: 최종 보고서 — new
  - `.memory/phases/2026-10-29-admin-mock-ui/P01-admin-mock-ui/phase.md` :: 진행률 — modify
  - `.memory/current.md` :: 완료포인터 — modify
#### Details
- 보고서에는커밋기준/명령과exit결과/브라우저크기와시나리오/권한범위/스크린샷경로/미검증사항/기존변경보존을기록한다.
- 모든Task청사진의Status·Progress·commit과phase/current가실제구현결과를가리켜야한다. T09미검증이남으면done으로만들지않는다.
- 완료기준은아래전체명령통과와브라우저시나리오확인이다. 테스트개수는실제출력을기록하고과거304개통과기록을재사용하지않는다.
- 새로발견한요청밖문제는보고서별도목록과채팅에서범위선택을요청하되, 이미별도범위로결정한Cosmos·Entra·실메일을재승인받으려하지않는다.



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
- [x] 신청→승인→개인 한도→활동 로그→대시보드 흐름이 통합 검증된다.
- [x] 역할·부서·CRUD·가격 이력 및 캐시 분리의 자동 검증이 통과한다.
- [ ] 실제 브라우저 크기·키보드·프로필·SSR 스타일 회귀가 확인된다.
- [x] 검증 보고서와 Task/Phase/current 상태가 실제 결과와 일치한다.

## Validation
- `npm test` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `npm run build` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과
- `npm run dev -- --hostname 127.0.0.1 --port 3100` — 브라우저 시나리오 실행. 실행한 서버만 종료하고 결과를 기록한다.

## Commit Message
~~~text
test(admin): 통합 흐름·회귀·접근성 검증

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T09-integration-validation

- 9개 Task가 만든 관리자 기능과 기존 프로필·인증·디자인의 연결을 실제 시나리오로 검증하고 재현 가능한 완료 기록을 남긴다.
- 권한·집계·기존 UI 회귀 검증
~~~

## Progress
- [x] 통합 테스트·범위 내 수정·보고서·디자인 HTML 구현 완료
- [x] 자동 검증 통과: 36개 파일·328개 테스트, typecheck, lint, build
- [ ] 실제 브라우저 검증 통과 — 도구 중단으로 확인 불가
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 서비스·QueryClient·프로필 DTO 통합 테스트 9개를 추가했고 전체 328개 테스트가 통과했다.
- 직접 등록·삭제 사용자와 그룹 후보의 정합성, 부서 없는 관리자 저장 거절, 현재 계정 부서 반영, 권한 revision placeholder 차단을 보완했다.
- [검증 보고서](../../../reports/2026-10-29-admin-mock-ui-validation.md)와 [디자인 컴포넌트 HTML](../../../reports/2026-10-29-admin-design-components.html)을 작성했다.
- 브라우저 호스트 연결 실패 후 Chrome URL 확인 불가로 컴퓨터 사용 도구가 중단되었다. 우회하지 않았고 화면·키보드·hydration·콘솔 검증을 통과로 표시하지 않았다.
- 사용자 요청에 따라 구현 변경을 한 번의 통합 커밋으로 기록한다. Active Task는 미검증이 남은 T09에 유지한다.
