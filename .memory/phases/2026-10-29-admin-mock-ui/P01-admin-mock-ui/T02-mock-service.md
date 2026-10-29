# Task: T02 범위 검사와 원자적 mock 서비스

## Status: done

## Goal
UI와 무관하게 역할·부서·버전을 검사하는 단일 mock 서비스를 제공하여 모든 화면에서 같은 조회·승인·집계 결과를 얻는다.

## Decision Summary
- T01의 계약을 구현한다. 저장소 수명은 생성 인스턴스 기준이며 네트워크/DB 없이 읽기 DTO와 원자적 명령을 제공한다.
- 계획: 2026-10-29-admin-mock-ui, Phase: P01-admin-mock-ui. 선행 Task는 T01 완료를 전제로 한다. 현재 청사진의 범위만 구현한다.

## Implementation

### I01. 서비스 수명과 접근 경계
- Related Files:
  - `services/admin/MockAdminDataService.ts` :: MockAdminDataService — AdminDataService 구현; new
  - `services/admin/AdminDataService.ts` :: AdminDataService 타입 재수출 — 교체 경계; new
  - `lib/admin/selectors.ts` :: 리소스별 범위·집계·필터 순수 함수; new
  - `lib/admin/permissions.ts`, `lib/admin/schemas.ts`, `config/admin-seed.ts` :: T01 계약; read-only
#### Details
- **Signatures & Types**:
~~~typescript
interface MockAdminOptions {
  seed: AdminStoreState;
  createId?: () => string;
}
declare class MockAdminDataService implements AdminDataService {
  constructor(options: MockAdminOptions);
}
~~~
모든 public 메서드/입출력은 자체 포함 부록의 AdminDataService 그대로다. private state와 undo 보관함 외부 접근을 허용하지 않는다. 반환 객체는 복사하여 호출자가 수정해도 저장소가 변하지 않게 한다.
- **Data & Schema Fields**: store revision=1부터 시작, 변경마다 +1. permissionRevision은 save-grants 때만+1. 논리시각은 성공한 쓰기/내보내기당1ms 증가. createId 기본은 crypto.randomUUID이며 테스트는 순번 ID 주입.
- **Execution Flow / Logic**:
  1. actor.userId가 미삭제 active 사용자여야 한다. actor.role은 runtime에서 전달한 시연 역할이며 mock 한정이다. 실제 세션 역할을 생성하지 않는다. 부서 관리자는 actor.departmentId가 저장된 self의 부서와 일치하고 null이 아니어야 한다.
  2. 해당 리소스 R과 역할 상한을 확인한 후 범위를 좁힌다. 부서 밖 상세 ID는 NOT_FOUND로 처리하여 존재 유무를 노출하지 않는다.
  3. 범위→필터→안정 정렬→집계/페이지 순서로 DTO를 만든다. 이름 동률은 id 오름차순으로 정렬한다. 조회시 원장을 정렬해 변형하지 않는다.
  4. getAccess는 개인 actor 및 자신의 grants만 반환한다. 일반 사용자의 getSelf는 허용하되 나머지 관리자 메서드는 FORBIDDEN. 부서별 선택 후보도 권한 범위 안으로 제한한다.
  5. getDirectory/getGroups/getRoleGrants/getModels/getPricing는 슈퍼 관리자 전용이며 각각의 리소스 R도 검사한다. getModels는 모델 기본값만, getPricing는 단가·환율만 반환한다. getTokens는 tokenPolicies R로 사용량·비용·토큰 정책만 반환하고, 신청은 getTokenRequests의 별도 tokenRequests R로 조회한다. 부서 관리자에게 settings=null로 반환한다. getDirectory는 registeredUserId가 있는 등록 인원과 null인 미등록 후보를 구분한 AdminDirectoryEntry를 반환한다.
  6. getDashboard는 dashboard R로 집계 결과만 제공한다. audit R이 없어도 dashboard용 원시 감사 행을 반환하지 않는다. getAudit는 별도 audit R이다.

### I02. 사용자·그룹·권한 명령
- Related Files:
  - `services/admin/MockAdminDataService.ts` :: execute, 사용자/그룹/권한 처리 — new
  - `lib/admin/command-validation.ts` :: 입력·버전·참조 검사; new
#### Details
- **Signatures & Types**: 부록 AdminCommand의 사용자/그룹/grants 명령과 CommandReceipt를 사용한다. version은 대상 id와 함께 필수다.
- **Data & Schema Fields**: 신규 record createdAt=updatedAt=논리시각, version=1. 변경 시 version+1. email은 활성·삭제 포함 기존 사용자와 대소문자 무관 중복을 금지한다. directory ID와 사용자 ID를 분리한다.
- **Execution Flow / Logic**:
  1. 명령 전체를 Zod 검증하고 CRUD 상한을 확인한다. user/group에 대한 변경은 super_admin 전용이다.
  2. 자기 userId의 role·status·삭제는 거절한다. 마지막 active super_admin 삭제/잠금/강등도 거절한다. 표시 이름 일치로 자기 여부를 판단하지 않는다.
  3. 일괄 변경은 targets 중복 ID를 거절하고 모든 버전·대상을 검증한 뒤 한 번에 적용한다. 한 명이라도 실패하면 전체 무변경이다. UI는 실패 대상 ID와 일반 한국어 사유를 표시할 수 있다.
  4. add-directory-users는 기존 등록 이메일을 제외하고 미등록 후보만 추가한다. 기존 회원에게 새 역할을 덮어쓰지 않는다. 생성 후 그룹이 저절로 생기지 않는다. 등록0명이면 VALIDATION을 반환한다.
  5. delete는 deletedAt만 설정한다. 한도·이력·신청·그룹 memberIds는 보존하고 표시 시 삭제 사용자를 제외한다. deleted/locked requester의 신청 승인은 INACTIVE_USER다.
  6. delete 성공 시 하나의 undoToken을 생성한다. 복구는 삭제 당시 version과 tombstone이 그대로인 대상만 원자적으로 복원하고 버전을 증가시킨다. 토큰은 한 번만 사용 가능하고 새로고침하면 사라진다. 이후 충돌이 있으면 CONFLICT이며 예전 객체를 통째로 덮어쓰지 않는다.
  7. 그룹 조회는 AdminGroupRow로 소유자 이름과 멤버 표시명까지 반환한다. 삭제 회원은 표시 멤버에서 제외한다. 그룹 생성/멤버 수정은 groups C/U 외에 users R도 요구한다. 그룹 이름은 trim/case 무관 중복 금지, 멤버는 미삭제 실제 사용자 ID를 중복 없이0~500개 허용한다. 그룹 소유자는 생성 actor. 그룹 삭제·복구도 tombstone 규칙을 적용한다.
  8. resend-invite는 invited에만 허용하며 실제 메일 호출 없이 updatedAt/version과 감사 이벤트만 갱신한다.
  9. save-grants는 전체3역할×9리소스의 완전한 행렬과 최신 permissionRevision을 받는다. 상한 외 체크·read없이CUD·super_admin permissions R/U해제를 거절한다. 저장 성공 시 permissionRevision과 전역revision이 바뀐다.
  10. 감사 이벤트는 사용자 대상이면 대상 부서, 그룹의 단일 부서이면 그 부서/혼합이면null, 권한표는null로 기록한다. actor 스냅샷과 targetId를 별도로 보관한다.

### I03. 모델·비용·토큰의 상태 전이
- Related Files:
  - `services/admin/MockAdminDataService.ts` :: 설정/토큰 execute 분기; new
  - `lib/admin/cost.ts` :: 스냅샷 계산; read-only
#### Details
- **Signatures & Types**: save-model-defaults/save-price/save-fx/save-token-policy/set-token-limit/set-token-paused/submit-token-request/process-token-request의 부록 계약 그대로다.
- **Data & Schema Fields**: settings.version은 모델 기본값·환율·전사토큰정책이 공유하는 optimistic version이다. price는 모델별 독립 version이다. 개인계정 version은 한도/정지/승인 때 증가한다. 신청 version은 처리 때 증가한다.
- **Execution Flow / Logic**:
  1. 전사 모델·가격·환율·한도 변경 및 임의 개인 한도/정지는 super_admin+대상 CRUD U를 요구한다. 모델 ID는 허용 목록 안에서만 받는다.
  2. 단가/환율 저장은 기존 cost snapshot을 수정하지 않는다. 새로운 사용량은 향후 calculateCost를 통해 현재 설정을 캡처하도록 경계를 유지한다. 시연을 위한 실제 AI 생성 버튼은 추가하지 않는다.
  3. defaultPersonalLimit 변경은 이후 신규 계정에만 적용한다. monthlyTokenLimit은 토큰 수이며 원화 예산이 아니다. 합계가 한도를 넘어도 사용량을 삭제하거나 자동 소급 제한하지 않는다.
  4. submit-token-request는 본인 userId를 actor에서 얻고 입력으로 받지 않는다. 이름/부서/월/시각/상태를 저장소가 결정한다. amount는1000배수·양수이며 현재 한도에 더해도 최대10억을 넘지 않아야 한다. 사유는2~1000자, 프로젝트는mois/edu/sample/null만 허용한다.
  5. submissionId를 중복 제출 키로 사용한다. 동일 ID/동일 요청 재전송은 최초 receipt를 반환하고 추가 로그·revision을 만들지 않는다. 동일 ID/다른payload는 CONFLICT.
  6. 승인은 tokenRequests U와 같은 부서 범위를 요구한다. pending만 처리하며 approved/rejected는 재처리 CONFLICT. 승인 시 최신 개인계정 한도에 requested amount를 더하고 신청/계정/감사로그를 한 번에 commit한다. 반려는 신청과 감사로그만 바꾼다.
  7. 일반 사용자는 관리자 API로 승인할 수 없다. 같은 예시 사용자가 역할을 바꿔 자기 신청을 시연 승인하는 흐름은 허용한다(실제 정책으로 자기승인 금지를 새로 추가하지 않는다).
  8. 최신 버전이 아닌 수정은 CONFLICT. 유효성 실패·권한 실패·한도 초과에서 부분 반영 및 성공 토스트를 발생시키지 않는다.

### I04. 조회·대시보드·내보내기 계산
- Related Files:
  - `lib/admin/selectors.ts` :: selectUsers, selectTokens, selectAudit, buildDashboard, buildSelfUsage — new
  - `lib/admin/csv.ts` :: makeCsv, downloadCsv — CSV 안전 처리; new
#### Details
- **Signatures & Types**:
~~~typescript
declare function makeCsv(headers: readonly string[], rows: readonly (readonly (string | number | null)[])[]): string;
declare function downloadCsv(filename: string, csv: string): void;
~~~
- **Data & Schema Fields**: UserList roleCounts/statusCounts는 허용 범위의 미삭제 전체 사용자 기준, rows는 현재필터 기준. TokenAccountRow 상태 우선순위 paused→used>=limit over→used/limit>=warning[0] warning→normal이다.
- **Execution Flow / Logic**:
  1. getSelf는 개인의10월 usage/계정/신청만 반환한다. usage 원장에서 used와 UI 분석을 파생한다. period는10/1~20, elapsedDays20, daysInMonth31이다.
  2. getTokens의 개인 사용량은 선택 month 전체 기준(화면에서는10월 고정), 비용표는 query의 Period기준이다. 기본기간도10/1~20이다. 부서칩과 총량은 허용된 선택기간 전체, 개인표 검색/상태는 그 하위 필터다. 일반 query에서 다른 부서 ID를 보내면 빈 전체가 아니라 FORBIDDEN.
  3. getAudit는 범위/기간/검색/액션/결과를 적용하고 정렬한다. successCount/failureCount는 결과 필터만 제외한 나머지 조건의 집계이며 rows는 결과필터까지 적용한다. 정렬동률은 occurredAt desc/id asc이다.
  4. getDashboard의 RFP는 선택기간 등록분, 로그/usage는 선택기간과 최근90일의 교집합이다. 겹침 없으면 활동값0, activityPeriod=null, activityCapped=true를 반환한다. 부서별 원장 범위는 먼저 적용한다.
  5. totalRfps/rfpCounts는 기간 전체, 진행=review+writing, 수주율=won/(won+lost)이며 분모0은'—'. 등록 그래프는 기간120일 이하면 시작일부터7일 간격, 초과면 월별. bucket은 from/to 반개구간으로 선택하고 마지막은 query.to까지만 포함한다.
  6. distribution/selectedRfpCount/wonBudgetKrw는 bucket선택 반영, rfpStatus는 목록에만 추가 반영. departments는 기간 전체를 유지한다. 목록은 등록일desc/id asc,10행페이지다. AdminRfpRow의 pmName/departmentName을 서비스가 채워 반환한다. 대시보드에서 표시명을 얻기 위해 별도 users R을 요구하지 않는다.
  7. activities=허용 로그수, activeUsers=로그 actorId 고유수, generations=generate 이벤트수, downloads=export 이벤트수. tokens/cost는 같은기간 usage 원장에서 합산한다. 사용자/일별 합계도 같은 원장을 쓰고 generate 로그와 usageId가 일대일이다.
  8. trends는 날짜빈칸도0을 채운다. actions/resources/details는 로그분류별 건수와실패수, users는 actor별 로그와 usage를 합쳐 활동desc/id asc. 삭제 사용자도 과거 스냅샷 이름으로 집계한다. rfpCreates는 resource=rfp/action=create 로그 수이고 sectionWrites는 resource=document/action=update 로그 수다. 사용자별 목록에는 허용 범위의 현재 사용자(활동 0 포함)와 이력이 있는 삭제 사용자를 포함한다. 합산 시 CostSnapshot의 amountUsdMicros/amountKrwMicros를 MoneyTotal의 usdMicros/krwMicros로 투영한다.
  9. export는 페이지 제한을 제거하되 같은 범위·필터·정렬을 유지한다. CSV에는 UTF-8 BOM, CRLF, 큰따옴표 escape를 적용하고 =,+,-,@,탭,CR로 시작하는 문자열은 앞에 작은따옴표를 붙인다. CSV 수식 실행을 막는다.
  10. CSV 문자열 생성 후 내보내기 감사 로그를 추가한다. 이 새 이벤트는 방금 내보낸 파일에 포함하지 않는다. 실패하면 로그도 추가하지 않는다. 브라우저 downloadCsv는 Blob object URL을 만들고 클릭 후 revoke한다.
  11. 감사 행 key는 event.id다. targetId가 같아도 다른행/다른상세로 취급한다. ip/userAgent는 예시임을 상세에서 표시한다.

### I05. 상태·집계 불변식 검증
- Related Files:
  - `tests/services/admin/MockAdminDataService.test.ts` :: 서비스 권한·버전·트랜잭션; new
  - `tests/lib/admin/selectors.test.ts`, `tests/lib/admin/csv.test.ts` :: 집계·필터·CSV; new
#### Details
- 다른 부서의 목록/집계/ID검색/내보내기 누출없음, null부서 거절, 메뉴역할과 CRUD가 모두 적용됨을 확인한다.
- 불일치 version·배치 중1개 실패·중복신청·동시 승인2회·한도overflow·잠김/삭제 사용자를 테스트한다.
- 승인50K가 self100K→150K에 정확히 한 번 반영되고 반려는한도 변경없음. 과거 비용 스냅샷이 설정변경뒤 그대로인지 확인한다.
- 이전 반환 DTO를 바꿔도 store무변경, seed공유없음, 실패 시revision/로그무변경, 성공구독1회, unsubscribe후 알림없음을 확인한다.
- 대시보드 총량=같은기간/부서 usage 및 audit 집계, 차트선택이 기간 전체 KPI/부서표에 잘못전파되지 않음, 빈기간/월경계/삭제사용자역사/CSV수식을 확인한다.



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
- [x] 모든 서비스 메서드와 명령이 구현되고 실제 네트워크/DB를 호출하지 않는다.
- [x] 부서 범위가 상세·후보·합계·CSV에도 일관되게 적용된다.
- [x] 신청·승인·한도·감사 이벤트가 원자적으로 변경된다.
- [x] 동일 원장에서 대시보드·개인·비용 집계가 일치한다.

## Validation
- `npm test -- tests/services/admin/MockAdminDataService.test.ts tests/lib/admin/selectors.test.ts tests/lib/admin/csv.test.ts` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과

## Commit Message
~~~text
feat(admin): 범위 검사와 원자적 mock 서비스

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T02-mock-service

- UI와 무관하게 역할·부서·버전을 검사하는 단일 mock 서비스를 제공하여 모든 화면에서 같은 조회·승인·집계 결과를 얻는다.
- 업무 규칙과 경계 조건 검증
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 서비스·집계·CSV 테스트 12개, typecheck, lint, diff 검사 통과.
