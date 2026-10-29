# Task: T06 모델·단가·환율·토큰 승인 화면

## Status: done

## Goal
하나의 관리자 메뉴에서 업무별 모델·단가·환율·개인 한도와 토큰 신청을 관리하고 모델별 예상 비용을 검토한다.

## Decision Summary
- models/tokens 두 탭을 URL과 연결한다. 가격·환율은 설정 시점 이후 원장에만 적용하며 승인 결과는 기존 프로필과 공유한다.
- 선행: T01~T05 완료. 계획 2026-10-29-admin-mock-ui, Phase P01-admin-mock-ui. 사용자 선택 범위 밖의 인증/DB 연동은 추가하지 않는다.

## Implementation

### I01. 통합 화면과 탭별 접근
- Related Files:
  - `components/admin/policy/ModelTokenPage.tsx` :: ModelTokenPage — new
  - `components/admin/policy/ModelDefaultsPanel.tsx` :: ModelDefaultsPanel — new
  - `components/admin/AdminScreenRouter.tsx` :: policy분기 — modify
  - `hooks/admin/use-admin-data.ts` :: 기존모델/가격/토큰/신청훅 — read-only
#### Details
- **Signatures & Types**:
~~~typescript
interface ModelTokenPageProps { requestedTab: "models" | "tokens" | null }
declare function ModelTokenPage(props: ModelTokenPageProps): React.ReactElement;
declare function ModelDefaultsPanel(): React.ReactElement;
~~~
- **Data & Schema Fields**: super_admin 기본models, department_admin 기본tokens. URL=/workspace/policy?tab=models|tokens. 잘못된tab값은기본값으로replace, 탭클릭은router.push로뒤로가기가가능하게 한다.
- **Execution Flow / Logic**:
  1. 부서 관리자는tokens탭만보이며modelsURL직접입력시tokens로replace한다. 모델 설정버튼을CSS로숨기지않는다. 슈퍼 관리자도modelSettings R이없으면해당본문은forbidden이다.
  2. 모델 설정은useAdminModels의5개업무 analysis/checklist/search/slides/quality를한국어 AI분석/체크리스트/자료검색/PPT생성및고도화/품질검증으로표시한다.
  3. 각업무의Fluent Select에허용모델3개를제공한다. U없으면readonly라벨이며저장버튼없음. 신규모델연결·API키·외부요청은추가하지않는다.
  4. 초안은열린시점settings.version과함께보관하며저장save-model-defaults 성공 후에만clean으로바꾼다. 다른설정변경과충돌하면새로불러오기/입력유지안내를제공한다.
  5. 가격/환율은별도pricing R/U를적용한다. getModels 응답에가격·환율·토큰정책을무조건넣지않고getPricing/getTokens로분리한다.

### I02. 모델별 단가·환율과 비용
- Related Files:
  - `components/admin/policy/PricingPanel.tsx` :: PricingPanel — new
  - `components/admin/policy/ModelCostTable.tsx` :: ModelCostTable — new
  - `lib/admin/cost.ts` :: parseUsdRate/parseFx/formatKrw — read-only
#### Details
- **Signatures & Types**:
~~~typescript
declare function PricingPanel(): React.ReactElement;
interface ModelCostTableProps { rows: readonly ModelCostRow[]; total: MoneyTotal }
declare function ModelCostTable(props: ModelCostTableProps): React.ReactElement;
interface PriceDraft {
  priceId: string; version: number; inputUsd: string; outputUsd: string;
}
interface FxDraft { version: number; krwPerUsd: string }
~~~
- **Data & Schema Fields**: 표열모델/입력USD·100만토큰/출력USD·100만토큰/변경일/저장. 원화환율입력은1USD당KRW, 소수6자리최대. 숫자input의자동부동소수계산대신text+inputMode=decimal과검증함수를사용한다.
- **Execution Flow / Logic**:
  1. 가격표는useAdminPricing, 행별version/draft를분리한다. 0단가허용,음수·지수표기·소수7자리·상한초과는필드오류다.
  2. 가격저장save-price와환율save-fx는별도액션이다. 가격행하나저장으로다른dirty행을reset하지않는다. 환율dirty상태도다른사용량갱신으로덮지않는다.
  3. 저장전단가 변경의적용범위를'이후 사용분부터 적용'으로짧게표시한다. 사용내역을현재단가로재계산하지않는다.
  4. 토큰·비용탭에는선택기간모델별입력토큰/출력토큰/합계토큰/USD예상 비용/원화예상 비용을표시한다. 총계는MoneyTotal을원장단위로합산한다.
  5. 서로 다른스냅샷단가가섞인모델집계에현재단가를곱해표시하지않는다. 필요시'사용 당시 단가 기준'으로안내한다.
  6. 모델이름에예시표시, 비용영역에'예상 비용'을명시한다. 실제금액청구·환율자동동기화를암시하지않는다.

### I03. 사용량·한도·토큰 신청 처리
- Related Files:
  - `components/admin/policy/TokenOverviewPanel.tsx` :: TokenOverviewPanel — new
  - `components/admin/policy/TokenAccountsTable.tsx` :: TokenAccountsTable — new
  - `components/admin/policy/TokenRequestsPanel.tsx` :: TokenRequestsPanel — new
  - `components/admin/policy/TokenPolicyForm.tsx` :: TokenPolicyForm — new
#### Details
- **Signatures & Types**:
~~~typescript
declare function TokenOverviewPanel(): React.ReactElement;
interface TokenAccountsTableProps {
  rows: readonly TokenAccountRow[]; canManage: boolean; busy: boolean;
  onCommand(command: AdminCommand): Promise<void>;
}
declare function TokenRequestsPanel(): React.ReactElement;
interface TokenPolicyFormProps { value: TokenPolicyView; canEdit: boolean }
~~~
- **Data & Schema Fields**: 기간·검색·상태의 초기값은 아래와 같다.
- 초기 TokenQuery: month=2026-10, 기간10/1~10/20, search빈값, departmentId=null, status=all. 월은예시10월로고정, 비용분석기간은공통기간필터로변경가능하다. 계정사용량은10월전체이며비용표의조회기간과라벨을구분한다.
- **Execution Flow / Logic**:
  1. 전사관리자는전사사용량/전사월토큰한도, 부서 관리자는부서사용량/부서개인 한도합계로라벨을달리한다. 부서화면에서전사한도를분모로표시하지않는다.
  2. 부서칩은허용범위의부서사용량/인원수다. 슈퍼는칩클릭으로필터토글, 부서 관리자는자기 부서만표시하고상위전체로확대하지않는다.
  3. 개인표는이름/부서/사용량·한도그래프/한도/상태/관리. 상태필터는전체·경고·초과·정지. 0사용량/한도이하/100%초과를처리하고그래프폭은0~100%로제한하되숫자비율은실제값이다.
  4. 임의한도 변경과+50K/정지/재개는super_admin+tokenPolicies U만표시한다. +50K는현재row.limit+50000과version으로전송하고중복클릭을막는다. 부서 관리자에게는읽기값만표시한다.
  5. 전사 정책폼은월토큰한도/1인기본한도/70·90등경고값을명시적저장한다. 모든한도단위는Token이며₩를붙이지않는다.
  6. 토큰 신청패널은useAdminRequests의독립쿼리를사용한다. tokenPolicies R이꺼져도tokenRequests R이있으면신청 목록을볼수있다. 반대의경우신청 목록은렌더링하지않는다.
  7. 신청 표열: 신청일/신청자/부서/프로젝트/요청량/사유/상태/처리. 프로젝트 표시명은 기존 config/token-preview.ts의 TOKEN_PROJECT_OPTIONS로 매핑하고 null은 프로젝트 외 사용으로 표시한다. pending만승인·반려가능, 각행version과id를전송한다. U없으면버튼미표시, 처리중에는그행및관련중복동작disabled.
  8. 승인완료toast와상태·한도는mutation성공이후표시한다. CONFLICT이면이미처리됨안내+재조회, INACTIVE_USER면사용자상태확인안내다.
  9. 승인·반려사유를새필수필드로추가하지않는다(인터뷰에서미확정). 기존신청사유를모든 사용자에게그대로노출하지않고부서 범위를지킨다.
  10. 일반 사용자가프로필에서생성한요청은같은u-self의역할을바꾼관리자화면에나타나고승인후프로필한도에한번반영된다. actual Entra계정변경은수행하지않는다.

### I04. 비용·승인 회귀 검증
- Related Files:
  - `tests/lib/admin/cost.test.ts`, `tests/services/admin/MockAdminDataService.test.ts` :: 기존업무테스트 재사용; read-only
  - `tests/app/workspace/screen.test.ts` :: policy route연결; modify(필요시)
#### Details
- 가격/환율 변경전후과거원장금액불변, 신규계산만변경, 비용합계반올림을확인한다. 실제AI호출없이서비스단위 테스트의새사용량계산으로검증한다.
- 미리보기 일반→신청50K→부서 관리자승인→개인100K→150K→같은요청재승인불가를브라우저에서확인한다.
- models/tokens깊은링크, 뒤로/앞으로, 부서 관리자models직접진입, 각조회 권한을해제했을때다른API응답으로설정이누출되지않는지확인한다.



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
- [x] models/tokens 통합 메뉴와 깊은 링크·권한별 탭이 동작한다.
- [x] 모델별 단가·환율·과거 비용 보존과 집계가 일치한다.
- [x] 토큰 한도·정지·승인·반려가 저장소와 프로필에 반영된다.
- [x] 부서 범위 밖 조회·임의 전사 정책 변경을 허용하지 않는다.

## Validation
- `npm test -- tests/lib/admin/cost.test.ts tests/services/admin/MockAdminDataService.test.ts tests/app/workspace/screen.test.ts` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과
- `npm run dev -- --hostname 127.0.0.1 --port 3100` — 기존 설정에서 브라우저 시나리오 확인. 공유 .env를 변경하지 않는다.

## Commit Message
~~~text
feat(admin): 모델·단가·환율·토큰 승인 화면

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T06-model-token-cost

- 하나의 관리자 메뉴에서 업무별 모델·단가·환율·개인 한도와 토큰 신청을 관리하고 모델별 예상 비용을 검토한다.
- 역할·부서·상태 변경에 따른 화면 동작 검증
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 비용·서비스·라우트 테스트 45개, typecheck, lint, diff 검사 통과. 기존 localhost:3000 사용자 화면 HTTP 200 확인. 브라우저 시각·입력 검증은 도구 중단으로 미검증이다. 동일 사용자·역할·부서·필터 및 현재 읽기 권한이 일치할 때만 갱신 중 데이터를 유지해 초안 재마운트를 방지한다.
