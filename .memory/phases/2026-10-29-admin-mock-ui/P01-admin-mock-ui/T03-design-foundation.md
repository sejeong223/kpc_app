# Task: T03 Tailwind·Query 의존성과 공용 UI

## Status: done

## Goal
기존 Fluent 화면을 유지하면서 관리자 화면이 사용할 공통 레이아웃·테마·표·필터·상태 UI와 Query 의존성을 준비한다.

## Decision Summary
- Tailwind는 접두사와 Preflight 제외를 적용한다. 업무 없는 공용 표현 컴포넌트만 만들고 기존 Fluent 모달·선택 컨트롤을 재사용한다.
- 선행: T01~T02 완료. 계획 2026-10-29-admin-mock-ui, Phase P01-admin-mock-ui. 청사진 지정 파일만 변경한다.

## Implementation

### I01. 의존성과 스타일 충돌 방지
- Related Files:
  - `package.json`, `package-lock.json` :: 의존성 — modify
  - `postcss.config.mjs` :: @tailwindcss/postcss 플러그인 — new
  - `app/admin-utilities.css` :: 접두사 Tailwind theme/utilities import — new
  - `app/admin-theme.css` :: 공통 디자인 변수 — new
  - `app/globals.css` :: 위 두 CSS를 선두에서 import — modify
  - `components/providers/FluentUiProvider.tsx` :: workspaceTheme — modify
#### Details
- **Signatures & Types**: 컴포넌트 props는 부록 공용 UI 계약을 따른다. Fluent Theme 타입을 유지하고 값만 CSS 변수 참조로 바꾼다.
- **Data & Schema Fields**:
  - 실행 단계 설치명령: `npm install --save-exact @tanstack/react-query@5.105.0`, 이어 `npm install --save-dev --save-exact tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 postcss@8.5.32`.
  - postcss.config.mjs의 default export는 plugins에 "@tailwindcss/postcss":{} 하나를 추가한다. 기존 config가 생겨 있으면 덮어쓰지 않고 병합한다. autoprefixer·별도 UI/차트 패키지는 추가하지 않는다.
  - admin-utilities.css는 theme/utilities의 개별 import에 각각 prefix(tw)를 설정한다. utilities import에 source(none)을 적용하고 @source로 ../components/admin, ../hooks/admin, ./ (app)만 지정한다. preflight.css는 import하지 않는다.
  - 관리자 스타일 변수: --kpc-bg #f8f9fa, --kpc-card #fff, --kpc-line #e6e7eb, --kpc-line-soft #eff0f3, --kpc-line-strong #dddde2, --kpc-ink #161616, --kpc-secondary #55585f, --kpc-muted #74747d, --kpc-brand #d7192f, --kpc-brand-hover #c31429, --kpc-brand-pressed #b01225, --kpc-brand-ink #c91c2b, --kpc-brand-soft #fff0f2, --kpc-success #0d7a4a, --kpc-warning #9a5b0b, --kpc-danger #c91c2b.
  - 변수 추가값: --kpc-radius-card 12px, --kpc-radius-control 8px, --kpc-radius-dialog 16px, --kpc-space-unit 4px, --kpc-font-ui(기존 글로벌 폰트 스택), --kpc-font-body 12px, --kpc-font-small 11px, --kpc-font-title 18px. root에는 변수만 정의하고 전역 element 스타일을 바꾸지 않는다.
- **Execution Flow / Logic**:
  1. 설치 전 package-lock.json의 기존30줄삭제 diff를 확인·보존한다. npm install 뒤 새 dependency diff와 기존 변경을 구분하고 임의 checkout/reset을 금지한다.
  2. 기존 globals.css 초기화·로그인 스타일은 유지한다. Tailwind의 모든 클래스는 tw:flex/tw:gap-3 같은 완전한 접두사 문자열을 쓴다. 동적 문자열 조합을 피한다.
  3. Preflight가 없으므로 새 native 요소의 margin·border-style·box-sizing을 공용 컴포넌트에서 명시한다. 기존 Fluent Button의 자체 스타일을 Tailwind !important로 덮지 않는다.
  4. workspaceTheme의 기존 빨간색/중립색 슬롯을 같은 값의 --kpc 변수로 연결한다. Griffel createDOMRenderer와 useServerInsertedHTML의 didFlush 동작은 변경하지 않는다.
  5. 컴포넌트 Portal에서도 변수를 읽도록 :root에 공통 변수만 둔다. FluentProvider 안에만 변수를 두면 Dialog Portal에서 상속이 끊길 수 있다.
- 공식 근거: [Preflight 제외](https://tailwindcss.com/docs/preflight), [PostCSS 구성](https://tailwindcss.com/docs/installation/using-postcss). 두 개별 import 모두 prefix를 지정한다.

### I02. 공용 관리자 컴포넌트
- Related Files:
  - `components/admin/ui/AdminPrimitives.tsx` :: AdminPage/AdminCard/AdminMetric — new
  - `components/admin/ui/AdminTable.tsx` :: AdminTable/AdminColumn — new
  - `components/admin/ui/AdminTabs.tsx` :: AdminTabs — new
  - `components/admin/ui/AdminPager.tsx` :: AdminPager — new
  - `components/admin/ui/AdminAsyncState.tsx` :: AdminAsyncState — new
  - `components/admin/ui/AdminPeriodFilter.tsx` :: AdminPeriodFilter — new
  - `components/ui/ModalFrame.tsx`, `SegmentedControl.tsx`, `ToggleSwitch.tsx` :: 기존 컨트롤 — 재사용, 필요한 색상 변수 치환만 modify
  - `lib/pagination.ts` :: getPaginationItems — read-only
#### Details
- **Signatures & Types**: 부록의 공용 UI props가 정확한 계약이다. 테이블의 Row는 {id:string} Container를 extends한다. render가 ReactNode를 반환하므로 unknown/any cell accessor를 만들지 않는다.
- **Data & Schema Fields**: AdminPage는 h1 하나와 시연기준 배지를 제공한다. AdminCard는 section 제목, AdminMetric은 onClick이 있으면 button, 없으면 표시 카드다. AdminTabs는 Fluent TabList/Tab 또는 기존 SegmentedControl을 의미에 맞게 사용한다.
- **Execution Flow / Logic**:
  1. 행 선택은 현재 page의 row ID에 한정한다. 전체 체크는 일부선택 시 mixed, 선택없는 표는 체크열 자체를 렌더링하지 않는다.
  2. expandedId가 있을 때 별도 펼침 버튼과 colspan 상세행을 제공한다. 클릭 가능한 tr만으로 구현하지 않는다. 상세 aria-controls는 안전한 useId 기반 ID를 사용한다.
  3. AdminPager는 total=0에도 1/1로 보정한다. 이전/다음 disabled는 페이지에 의해 결정하고 getPaginationItems의 1기반 규약을 유지한다.
  4. AdminPeriodFilter는 date input2개와 최근30/90일·올해·전체 선택을 제공한다. 전체 시작2025-01-01, max2026-10-20. 기간오류는 저장/조회 전에 한국어 field error로 표시한다.
  5. AsyncState는 loading에 role=status, error에 재시도 버튼, forbidden에 접근불가 문구, empty에 조건에 맞는 결과 없음 문구를 쓴다. 권한 없는 작업 버튼은 포함하지 않는다.
  6. 기본 카드 간격14~16px, 필터 gap8px, 본문12px, 제목18px, 표 헤더11px/본문12px, 행48px 수준으로 원본 밀도를 따른다. 모바일에서 입력이 겹치지 않게 줄바꿈한다.
  7. 기존 ModalFrame의 폭560/760, 내부 스크롤, z-index, 포커스 및 Escape 처리, 기존 프로필의 빨간색·높이·반경을 값 변화 없이 유지한다.

### I03. 기반 검증
- Related Files:
  - `tests/lib/pagination.test.ts` :: 기존 페이지 유틸 회귀 — read-only
#### Details
- 컴포넌트 마크업을 그대로 복사한 스냅샷/테스트는 추가하지 않는다. 의미 있는 순수 로직이 추가된 경우에만 단위 테스트를 둔다.
- build가 실제 Tailwind 클래스와 CSS를 생성하는지, 기존 로그인/프로필에 Preflight 초기화가 추가되지 않는지 브라우저에서 확인한다.
- 이 Task에서는 훅/저장소 Provider를 앱에 연결하지 않는다. 아직 사용하지 않는 공용 컴포넌트도 export 상태로 컴파일되어야 한다.




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
- [x] 정확한 dependency 버전과 PostCSS 설정이 추가된다.
- [ ] Tailwind Preflight/클래스 충돌 없이 기존 Fluent SSR 스타일이 유지된다. — 설정·빌드 통과, 실제 화면 확인은 T09 대기
- [x] 표·탭·필터·상태·페이지 UI가 업무 로직 없이 재사용 가능하다.
- [x] 기존 사용자 변경을 되돌리거나 별도 스타일 라이브러리를 중복 설치하지 않는다.

## Validation
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `npm test -- tests/lib/pagination.test.ts` — 오류 없이 통과
- `npm run build` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과

## Commit Message
~~~text
feat(admin): Tailwind·Query 의존성과 공용 UI

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T03-design-foundation

- 기존 Fluent 화면을 유지하면서 관리자 화면이 사용할 공통 레이아웃·테마·표·필터·상태 UI와 Query 의존성을 준비한다.
- 기존 화면·권한 연결 회귀 방지
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 페이지 유틸 테스트 7개, typecheck, lint, production build, diff 검사 통과. 화면별 시각 검증은 T09에서 수행한다. npm audit의 기존 의존성 취약점은 별도 후속 사항으로 기록하며 범위 밖 업그레이드는 수행하지 않았다.
