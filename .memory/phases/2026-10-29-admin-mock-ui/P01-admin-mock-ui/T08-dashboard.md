# Task: T08 대시보드 4개 탭과 공통 기간

## Status: done

## Goal
기간과 허용 부서를 공유하는 네 개의 대시보드 탭을 제공하고 로그·사용량·RFP 집계와 시각 자료가 같은 값을 보여주게 한다.

## Decision Summary
- HTML의 RFP 고정 코드 대신 사용자 선택에 따라4개 탭을 활성화한다. 원시 로그를 화면에서 재집계하지 않고 서비스의 DashboardView를 사용한다.
- 선행: T01~T07 완료. 계획 2026-10-29-admin-mock-ui, Phase P01-admin-mock-ui.

## Implementation

### I01. 페이지와 기간·탭 상태
- Related Files:
  - `components/admin/dashboard/DashboardPage.tsx` :: DashboardPage — new
  - `components/admin/dashboard/RfpDashboardPanel.tsx` :: RFP 탭 — new
  - `components/admin/dashboard/UsageTrendPanel.tsx` :: 사용량 탭 — new
  - `components/admin/dashboard/ActivityBreakdownPanel.tsx` :: 작업/리소스 탭 — new
  - `components/admin/dashboard/UserActivityPanel.tsx` :: 사용자 탭 — new
  - `components/admin/AdminScreenRouter.tsx` :: dashboard 분기 — modify
#### Details
- **Signatures & Types**:
~~~typescript
type DashboardTab = "rfp" | "trend" | "activity" | "users";
declare function DashboardPage(): React.ReactElement;
interface DashboardPanelProps { view: DashboardView }
interface RfpDashboardPanelProps extends DashboardPanelProps {
  query: DashboardQuery; onChange(query: DashboardQuery): void;
}
interface UsageTrendPanelProps extends DashboardPanelProps {
  chartKind: "bar" | "line"; onChartKindChange(value: "bar" | "line"): void;
}
interface UserActivityPanelProps extends DashboardPanelProps {
  search: string; onSearchChange(value: string): void;
}
~~~
- **Data & Schema Fields**: tab=rfp, chartKind=bar. DashboardQuery 초기 from=2025-01-01/to=2026-10-20/rfpStatus=all/bucketStart=null/userSearch=""/rfpPage=1.
- **Execution Flow / Logic**:
  1. dashboard R을 확인한 뒤 useAdminDashboard를 호출한다. 부서 관리자의 기간·탭변경이 데이터 범위를 전사로 바꾸지 않는다.
  2. 기간 필터는 네 탭 공통이며 기간 변경 시bucketStart=null/rfpPage=1, 상태필터는 유지한다. 탭변경만으로 기간을 초기화하지 않는다.
  3. 활동은 최근90일까지만 있고 RFP는 더 오래 있을 수 있다. activityCapped이면 활동영역에 실제집계기간을 표시하고 두 집계가 같은 기간인 것처럼 쓰지 않는다. activityPeriod=null이면 활동없음0값을 표시한다.
  4. 상단 RFP 6개 카드: 전체/진행중/제출·결과대기/수주/수주실패/진행안함. 클릭은tab=rfp와해당rfpStatus/page1, 다시누르면all로토글한다.
  5. 상단 활동 카드: 총활동/활성사용자/AI생성/다운로드/토큰, 토큰caption은원화예상 비용. 카드 숫자를별도고정상수로구현하지않는다.
  6. '활동 로그' 링크는 /workspace/audit로 이동한다. 존재하지 않는 실제 RFP 상세나 제작 기능으로 연결하는 링크를 추가하지 않는다.

### I02. RFP 현황과 데이터 선택 규칙
- Related Files:
  - `components/admin/dashboard/RfpDashboardPanel.tsx` :: 그래프·분포·부서·목록 — new
  - `components/admin/ui/AdminCharts.tsx` :: 공용 차트 — new
  - `lib/admin/chart-data.ts` :: buildChartCoordinates/ChartPoint/ChartCoordinate — 순수 좌표 계산; new
#### Details
- **Signatures & Types**:
~~~typescript
interface ChartPoint { id: string; label: string; value: number; tooltip: string }
interface ChartCoordinate extends ChartPoint { x: number; y: number }
declare function buildChartCoordinates(points: readonly ChartPoint[], width: number, height: number): ChartCoordinate[];
interface AdminSeriesChartProps {
  label: string; points: readonly ChartPoint[]; kind: "bar" | "line"; unit: string;
  selectedId?: string | null; onSelect?: (id: string | null) => void;
}
interface AdminBreakdownProps {
  label: string; items: readonly NamedCount[];
  selectedId?: string | null; onSelect?: (id: string | null) => void;
}
declare function AdminSeriesChart(props: AdminSeriesChartProps): React.ReactElement;
declare function AdminBreakdown(props: AdminBreakdownProps): React.ReactElement;
~~~
- **Data & Schema Fields**: 기간120일이하의등록추이는주별, 초과는월별. registrations.id를선택키로사용하고bucketStart는해당from. 분포상태색은review회색/writing파랑/submitted보라/won초록/lost빨강/dropped중립이다.
- **Execution Flow / Logic**:
  1. 등록막대선택은해당주/월의결과분포·수주율·수주금액·RFP목록에만적용한다. 기간 전체KPI와부서별표는유지하고각영역에범위를명시한다.
  2. 선택된막대를다시누르거나선택칩닫기를누르면전체분포로돌아간다. 배경클릭만을유일한해제방법으로두지않는다.
  3. 결과분포의범례/상태카드선택은목록의상태필터를토글한다. 진행중은review+writing이다. 수주율분모won+lost=0이면'—'를표시한다.
  4. 부서표열: 부서/등록/진행/결과대기/수주/실패/Drop/수주율/결과구성. 각행합계=상태합계여야한다.
  5. RFP표는번호/사업명/부서/PM/등록일/예산/상태,10행페이지다. budgetKrw를원화나억원표현으로변환할때단위라벨을명확히하고실수합산으로원본금액을바꾸지않는다.
  6. 현재선택bucket이기간 변경으로사라지면선택해제한다. 목록0개는빈상태이며페이지1/1이다.

### I03. 사용량·작업·사용자 탭과 접근성
- Related Files:
  - `components/admin/dashboard/UsageTrendPanel.tsx`, `ActivityBreakdownPanel.tsx`, `UserActivityPanel.tsx` :: 나머지 탭 — new
  - `components/admin/ui/AdminCharts.tsx` :: HTML/SVG 차트 — new
  - `lib/admin/cost.ts`, `lib/profile-preview.ts` :: 금액/토큰 포맷 — read-only
#### Details
- **Signatures & Types**: 부록 DashboardView를 그대로 사용한다. 차트값은 유한한0이상 수로검증하고 최대값0일때분모1로계산한다. 큰금액은MoneyTotal문자열로보관하고표시에만변환한다.
- **Execution Flow / Logic**:
  1. 사용량탭은일별활동·토큰·활성사용자차트3개, 공통막대/선전환을제공한다. 데이터없는날도0으로표시해날짜간격을유지한다.
  2. 작업탭은액션별/리소스별/세부작업별건수와실패수를정렬된막대목록으로표시한다.
  3. 사용자 탭은 이름·부서/총활동/RFP 등록/섹션 작성/AI 생성/다운로드/실패/토큰/예상 비용을표시한다. 검색은서비스입력userSearch로적용하고실제identity ID를집계키로사용한다.
  4. 차트패키지는추가하지않는다. 막대는HTML button(선택가능할때)/표시div, 선은SVG polyline/circle을쓴다. plot1점이면중앙배치, 빈배열이면빈상태로별도분기한다.
  5. 선택가능막대에는aria-pressed/키보드Enter·Space를제공한다. hover없어도수치를확인할수있도록각차트에caption과접근가능한데이터표를제공한다.
  6. 정보는색상만으로구분하지않고라벨·범례·숫자를함께쓴다. 애니메이션은불필요하며reduce-motion을존중한다.
  7. 1440/1024/768/390/320px에서카드·필터는줄바꿈하고표만가로스크롤한다. 전체페이지의불필요한수평스크롤은없어야한다.

### I04. 집계·그래프 경계 검증
- Related Files:
  - `tests/lib/admin/selectors.test.ts` :: 기존집계경계 회귀 — read-only
  - `tests/lib/admin/chart-data.test.ts` :: buildChartCoordinates 경계 검증 — new
  - `tests/app/workspace/screen.test.ts` :: dashboard 연결 — modify(필요시)
#### Details
- buildChartCoordinates는 width/height가 유한하고 48보다 큰지 검사하고 padding 24px을 적용한다. 점 i의 x는 24+i×(width-48)/(n-1), n=1이면 width/2, y는 height-24-value/max(1,maxValue)×(height-48)이다. 입력은 변형하지 않는다. 빈배열은 빈배열, 잘못된 크기/음수·비유한 값은 VALIDATION이다. 빈배열/한점/전부0/동일최대값/비정상수치 거절을 검증한다. SVG마크업그대로를복제한테스트는쓰지않는다.
- 브라우저에서네탭기간공유, 막대선택범위, 수주분모0, 부서 범위, 활동90일표시, 승인/사용자변경/내보내기후활동수갱신을확인한다.
- 과거기간을선택했을때새로그가안보이는것은정상필터결과이며기본기간에는논리시계의새로그가포함되어야한다.



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
- [x] 4개 탭과 기간·상태·등록구간 선택이 정한 범위대로 동작한다.
- [x] 활동·토큰·비용 숫자가 동일 서비스 원장 및 활동 로그와 일치한다.
- [x] 부서·권한·90일 경계와 빈기간/분모0을 정확히 처리한다.
- [ ] 차트를 키보드·좁은 화면·보조기술로 확인할 수 있다. — 의미 있는 버튼·보조 표 구현, 실제 확인은 T09 대기

## Validation
- `npm test -- tests/lib/admin/selectors.test.ts tests/lib/admin/chart-data.test.ts tests/services/admin/MockAdminDataService.test.ts tests/app/workspace/screen.test.ts` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `npm run build` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과
- `npm run dev -- --hostname 127.0.0.1 --port 3100` — 브라우저 시나리오 실행. 실행한 서버만 종료하고 결과를 기록한다.

## Commit Message
~~~text
feat(admin): 대시보드 4개 탭과 공통 기간

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T08-dashboard

- 기간과 허용 부서를 공유하는 네 개의 대시보드 탭을 제공하고 로그·사용량·RFP 집계와 시각 자료가 같은 값을 보여주게 한다.
- 권한·집계·기존 UI 회귀 검증
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 대시보드·차트·서비스·라우트 테스트 47개, typecheck, lint, build, diff 검사 통과. 반응형·차트 키보드·화면 렌더링의 실제 브라우저 검증은 미검증이다.
