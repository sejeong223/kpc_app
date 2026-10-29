# Task: T01 도메인 계약·권한·비용·예시 데이터

## Status: done

## Goal
관리자 화면이 공유할 타입·검증·권한 상한·비용 계산과 일관된 예시 원장을 순수 모듈로 제공하여 이후 화면이 서로 다른 숫자나 권한 판단을 만들지 않게 한다.

## Decision Summary
- 실제 인증 역할과 분리된 3단계 mock 도메인을 정의한다. USD/환율 스냅샷과 72.4K 예시 합계를 보존하며 DB나 UI는 연결하지 않는다.
- 계획: 2026-10-29-admin-mock-ui, Phase: P01-admin-mock-ui. 선행 Task는 없음 완료를 전제로 한다. 현재 청사진의 범위만 구현한다.

## Implementation

### I01. 전체 모델과 입력 스키마
- Related Files:
  - `types/admin.ts` :: 도메인 타입 재수출 — 계약; new
  - `lib/admin/schemas.ts` :: 모든 Admin*Schema와 AdminCommandSchema — Zod 검증 및 추론; new
  - `lib/admin/errors.ts` :: AdminDataError — 공통 오류; new
  - `config/profile-preview.ts`, `config/token-preview.ts` :: 기존 예시 상수 — 초기 합계/기간 참고; read-only
#### Details
- **Signatures & Types**: 이 Task 끝의 자체 포함 계약 전체가 결과 타입이다. `AdminRecordSchema`, `AdminUserSchema`, `AdminGroupSchema`, `AdminPriceSchema`, `CostSnapshotSchema`, `AdminUsageSchema`, `AdminTokenRequestSchema`, `AdminAuditEventSchema`, `AdminSettingsSchema`, `RoleGrantsSchema`, `AdminCommandSchema`, 각 QuerySchema를 export한다. 타입은 schemas에서 z.infer 후 types/admin.ts에서 type-only 재수출한다. schemas가 types/admin.ts를 역으로 import하는 순환을 만들지 않는다.
- **Data & Schema Fields**:
  - version/revision은 안전한 정수 1 이상(초기 store revision=1, permissionRevision=1). nullable 필드는 부록에 명시한 필드만 null을 허용한다. 누락을 임의 null로 바꾸지 않는다.
  - 이름 1~80자, 이메일 trim/lowercase 및 email 형식 최대254자, 직급 1~40자, 그룹명 1~80자, 사유 trim 2~1000자. 초대 기본 true, 신규 role=user, 신규 status는 invite ? invited : active.
  - 정수 토큰 0~1,000,000,000. 신청은 1,000 이상/1,000의 배수. limit은 1,000 이상. 토큰 입력에 NaN/Infinity/음수/소수/안전 정수 초과를 허용하지 않는다.
  - 단가는 0~1,000,000,000 micros/M, 환율은 1~10,000,000,000 micros/USD. 경고 두 값은 정수 1≤a<b<100. 기본 [70,90].
  - month=YYYY-MM 유효월, Period=유효한 YYYY-MM-DD이며 from≤to≤2026-10-20. 문자열 Date 파싱 뒤 연/월/일 왕복 검증으로 2월30일을 거절한다.
  - ID 참조 존재·부서 관계·중복 이메일은 저장소가 검사한다. 스키마는 모양/값 범위와 객체 내부 관계를 검사한다.
- **Execution Flow / Logic**:
  1. 사전 검증: 엄격한 객체 스키마로 정의되지 않은 키와 잘못된 union 값을 거절한다.
  2. 핵심 처리: Container 스키마에서 pick/omit/extend로 생성·수정 DTO를 파생한다. 사용자 수정 입력에서 email/id/deletedAt/version을 받지 않는다.
  3. 오류 처리: Zod 오류를 fieldErrors로 변환하되 내부 입력 전체를 포함하지 않는다. AdminDataError는 code와 한국어 메시지만 공개한다.
  4. 반환: 일반 JSON 데이터와 추론 타입만 제공한다. Cosmos 문서의 partition key 등은 정의하지 않는다.

### I02. 권한·날짜·비용의 순수 계산
- Related Files:
  - `config/admin-permissions.ts` :: ADMIN_ROLE_LABELS, ADMIN_RESOURCE_LABELS, CRUD_CEILING, DEFAULT_ROLE_GRANTS — 상한/기본값; new
  - `lib/admin/permissions.ts` :: canPerform, assertPermission, assertDepartmentScope — 권한 검사; new
  - `lib/admin/cost.ts` :: calculateCost, sumMoney, formatKrw, parseUsdRate, parseFx — 정밀 계산; new
  - `lib/admin/dates.ts` :: toKoreanDay, periodBounds, clampActivityPeriod — 날짜; new
#### Details
- **Signatures & Types**:
~~~typescript
declare function canPerform(actor: AdminActor, rows: readonly RoleGrants[], resource: AdminResource, action: CrudAction): boolean;
declare function assertPermission(actor: AdminActor, rows: readonly RoleGrants[], resource: AdminResource, action: CrudAction): void;
declare function assertDepartmentScope(actor: AdminActor, departmentId: string | null): void;
declare function calculateCost(input: { inputTokens: number; outputTokens: number; price: AdminPrice; krwMicrosPerUsd: number; capturedAt: string }): CostSnapshot;
declare function sumMoney(items: readonly MoneyTotal[]): MoneyTotal;
declare function formatKrw(micros: string): string;
declare function formatUsd(micros: string): string;
declare function parseUsdRate(text: string): number | null;
declare function parseFx(text: string): number | null;
declare function toKoreanDay(iso: string): string;
declare function periodBounds(period: Period): { startMs: number; endExclusiveMs: number };
declare function clampActivityPeriod(period: Period): Period;
~~~
- **Data & Schema Fields**: 역할 상한/비용 단위/기간 경계는 부록의 정확한 규칙을 따른다. 금액 문자열은 정규식 `^(0|[1-9][0-9]*)$`를 따른다. 입력 단가·환율은 소수6자리까지 받아 정수화하며 지수/콤마/음수는 거절한다. 표시 쉼표는 별도 포맷에만 사용한다.
- **Execution Flow / Logic**:
  1. 역할 상한과 저장된 grants를 모두 확인한다. R이 없으면 C/U/D도 거절한다. assertDepartmentScope는 super_admin이면 통과한다. department_admin은 actor와 target 부서가 모두 null이 아닌 동일 ID일 때만 허용하고, user의 관리자 리소스 접근은 거절한다.
  2. BigInt로 A 및 환율 곱을 계산한다. 반올림은 양수 n/d에 대해 (n+d/2)/d의 정수 나눗셈으로 정의한다. 저장 타입은 decimal string이며 ES2017 때문에 BigInt 리터럴을 쓰지 않는다.
  3. 잘못된 비용 입력은 VALIDATION. 사용자 날짜 표시·필터는 Asia/Seoul 기준이며 OS 시간대에 의존하지 않는다.
  4. 권한·날짜·계산 함수는 입력 객체를 변경하지 않는다.

### I03. 동일 원장에서 파생하는 예시 데이터
- Related Files:
  - `config/admin-seed.ts` :: createAdminSeed, ADMIN_DEMO_TIME, ADMIN_DIRECTORY — 독립 예시 생성; new
  - `lib/admin/seed-allocation.ts` :: allocateSelfUsage — 일/프로젝트/기능 합계 배분; new
#### Details
- **Signatures & Types**:
~~~typescript
type SeedSelf = Pick<AdminUser, "name" | "email" | "departmentId" | "role">;
declare function createAdminSeed(self?: SeedSelf): AdminStoreState;
declare function allocateSelfUsage(input: {
  dailyTokens: readonly number[];
  projects: readonly { id: string | null; tokens: number }[];
  features: readonly { id: UsageFeature; tokens: number }[];
}): { day: number; projectId: string | null; feature: UsageFeature; tokens: number }[];
~~~
- **Data & Schema Fields**:
  - self ID=u-self, 기본 정소담/sodam.jeong@example.invalid/d-ai/수석/super_admin/active, 초기 월 한도100000. role 시연으로 이 저장 레코드를 바꾸지 않는다.
  - 6개 부서: d-ai AI사업본부, d-industry AI산업본부, d-product 생산성본부, d-consult 컨설팅본부, d-cx CX본부, d-edu 교육사업본부.
  - 사용자18명: u-self와 u-02~u-18, 부서별3명. u-02 김민수/department_admin, u-03 박성훈/user, u-16 두 번째 super_admin. 나머지는 부서별 첫 인원 department_admin, 그 외 user. u-17 invited, u-18 locked, 나머지active. 이메일은 example.invalid로만 생성한다.
  - directory는 등록된18명 + dir-01~dir-06의 미등록 예시(부서별1명), AdminDirectoryEntry 모양의 표시 데이터이며 registeredUserId로 등록 여부를 구분한다. 신규 id는 실제 추가 시 재발급하고 디렉터리 ID를 사용자 ID로 쓰지 않는다.
  - 그룹3개: g-ai(처음 부서3명), g-review(부서별 첫1명), g-edu(교육3명), 소유자u-self. 삭제 상태null.
  - 모델3개: m-reason/Gemini 2.5 Pro (예시)/Google, m-write/Claude 3.7 Sonnet (예시)/Anthropic, m-light/GPT-4o (예시)/OpenAI. 실제 모델 지원/최신 가격을 주장하지 않는다.
  - price IDs p-reason,p-write,p-light. 입력/출력 USD/M 예시 각각2/8,3/12,0.5/2. 환율1400 KRW/USD. settings는 version1, monthlyTokenLimit2000000/defaultPersonalLimit100000/warningPercents[70,90], 업무 기본 모델 analysis/checklist/quality=m-reason, search=m-light, slides=m-write.
  - self 일별20개 토큰: [2500,4000,1400,0,0,5600,6500,4500,4900,3100,0,0,7100,8600,6100,5700,4400,0,0,8000].
  - self 프로젝트 합계: mois41200/edu18500/sample8100/null4600. 기능 합계: rfp15928/draft23168/polish13032/slides11584/review8688.
- **Execution Flow / Logic**:
  1. 세 분할을 각각 0~72400 누적 구간으로 만든 뒤 모든 경계의 교집합 길이를 배분한다. 0길이 구간은 제외한다. 이 방법으로 일별/프로젝트별/기능별 합계를 동시에 보존한다.
  2. 각 조각 입력=floor(tokens×0.7), 출력=나머지, 모델은 feature rfp/review→reason, draft/slides→write, polish→light. 해당 날짜 한국08시부터 조각 순서당1초씩 배치한다.
  3. 각 usage에 1개의 generate 감사 이벤트를 연결한다(usageId). 최근 내역·모델 합계·대시보드 토큰은 이 원장에서 파생한다. 기존 최근 내역에 있는 10/19 값은 그대로 복제하지 않는다(그 날짜 일별0과 충돌).
  4. 자신 외 사용자 중 invited가 아닌 인원의 90일 사용량은 인덱스 j=0~29마다 기준일에서 3j일 전, 총 tokens=((사용자번호+j)%9+1)×700, 입력70%/출력30%, 모델3개 순환으로 생성한다. seed 발생 시각은 당일08시 이전으로 배치한다. 월 사용량은10월만 집계한다.
  5. 타 사용자 초기 개인 한도는 번호%3에 따라15000/30000/100000, u-10 paused=true. self한도는 예외100000. 승인 완료 예시1건(u-05,+20000)은 이미 해당 한도에 반영한 값으로 생성한다.
  6. pending 신청3건(u-02/u-08/u-11, 각50K/30K/20K), self신청은0건. approved1건만 processedBy/At이 채워져 있다.
  7. RFP36건: 첫3개 ID=mois/edu/sample, 나머지 rfp-04~36. 부서=i%6, 상태=floor(i/6)%6 순환, 등록일2026-04-01부터10-20까지 균등 배분. 예산100000000+(i%9)×25000000원. 등록일·담당자·부서는 서로 유효한 참조를 갖는다.
  8. 별도20개의 non-AI 로그에 create/update/export 및 성공/실패를 고르게 구성한다. 실패 사유/요청ID/IP/브라우저는 예시값만 사용한다. global 설정 로그의 부서는null.
  9. 매 생성마다 모든 배열·중첩 객체가 독립적이어야 한다. 과거 usage보다 늦게 가격이 생성된 모순을 피하도록 초기 가격·사용자의 createdAt은 2026-01-01T00:00:00.000Z로 둔다. invited 사용자는 사용량/활동 원장을 생성하지 않는다. 기본 self를 실제 표시 정보로 치환할 때 departmentId=null이면 임의 실제부서를 추정하지 않고 해당 self의 그룹 초기 멤버십에서 제외한다.

### I04. 업무 불변식 테스트
- Related Files:
  - `tests/lib/admin/domain.test.ts`, `tests/lib/admin/permissions.test.ts`, `tests/lib/admin/cost.test.ts`, `tests/lib/admin/seed.test.ts` :: 도메인 검증; new
#### Details
- unknown 역할/필드/잘못된 날짜/음수·초과·소수 토큰을 거절한다.
- 일반 사용자의 관리자권한 없음, 부서 null/다른 부서 거절, roles 상한 초과와 read없이update 거절을 검증한다.
- 입력1000/출력500, 단가2/8, 환율1400 → USD micros6000/KRW micros8400000. 가격4/16·환율1500으로 새 기록 생성 시18000000, 이전8400000은 유지한다.
- 큰 정수 곱·0토큰·소수6자리·반올림 경계, 문자열 합산 후 표시를 검증한다.
- self 일별/프로젝트별/기능별 총량72400, usage에 대응하는 로그 토큰 합계72400, 모든 FK유효성, 2회 seed 독립성을 검증한다.



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

## Acceptance Criteria
- [x] 전체 계약이 Zod와 추론 타입으로 정의되어 내부 any/unknown 없이 컴파일된다.
- [x] 권한·부서·비용 계산의 경계 테스트가 통과한다.
- [x] 예시 원장의 세 분할 합계와 비용·로그 참조가 일치한다.
- [x] 앱 화면·실제 인증·Cosmos 연결은 변경되지 않는다.

## Validation
- `npm test -- tests/lib/admin/domain.test.ts tests/lib/admin/permissions.test.ts tests/lib/admin/cost.test.ts tests/lib/admin/seed.test.ts` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과

## Commit Message
~~~text
feat(admin): 도메인 계약·권한·비용·예시 데이터

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T01-domain-contracts

- 관리자 화면이 공유할 타입·검증·권한 상한·비용 계산과 일관된 예시 원장을 순수 모듈로 제공하여 이후 화면이 서로 다른 숫자나 권한 판단을 만들지 않게 한다.
- 업무 규칙과 경계 조건 검증
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 도메인 테스트 7개, typecheck, lint, diff 검사 통과. 이전 경로의 생성 타입은 next typegen으로 갱신했다.
- 활동 기간에 교집합이 없는 경우를 위해 clampActivityPeriod 반환을 Period | null로 명확히 했다.
