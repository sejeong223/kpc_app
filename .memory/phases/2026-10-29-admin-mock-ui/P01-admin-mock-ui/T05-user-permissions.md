# Task: T05 사용자·그룹·역할별 권한 화면

## Status: done

## Goal
슈퍼 관리자가 사용자·그룹과 역할별 CRUD를 관리하고 부서 관리자는 자기 부서 사용자만 조회하는 사용자 설정 화면을 제공한다.

## Decision Summary
- 원본의 역할 카드·필터·목록·편집·일괄 작업을 공용 UI로 구성한다. 권한표와 그룹 편집은 슈퍼 관리자에게만 렌더링한다.
- 선행: T01~T04 완료. 계획 2026-10-29-admin-mock-ui, Phase P01-admin-mock-ui. 사용자 선택 범위 밖의 인증/DB 연동은 추가하지 않는다.

## Implementation

### I01. 사용자 목록·필터·선택
- Related Files:
  - `components/admin/users/UsersPage.tsx` :: UsersPage — new
  - `components/admin/users/UserTable.tsx` :: UserTable — new
  - `components/admin/AdminScreenRouter.tsx` :: users 분기 — modify
  - `hooks/admin/use-admin-data.ts`, `components/admin/ui/*` :: 앞선 계약 — read-only
#### Details
- **Signatures & Types**:
~~~typescript
declare function UsersPage(): React.ReactElement;
interface UserTableProps {
  rows: readonly AdminUser[]; departments: readonly AdminDepartment[];
  selectedIds: readonly string[]; onSelectionChange(ids: string[]): void;
  actor: AdminActor; grants: AdminAccessView["grants"]; busy: boolean;
  onEdit(user: AdminUser): void;
  onRoleChange(user: AdminUser, role: AdminRole): void;
  onDelete(users: readonly AdminUser[]): void;
  onResend(user: AdminUser): void;
}
type UsersTab = "users" | "groups" | "permissions";
~~~
- **Data & Schema Fields**: 초기 탭users, UserQuery={search:"",departmentId:null,role:"all",status:"all",page:1,pageSize:20}. 역할 카드4개(전체/슈퍼 관리자/관리자/일반 사용자), 상태3종(active활성/invited초대 대기/locked잠김).
- **Execution Flow / Logic**:
  1. access.loading/error 처리 후 users R이 있을 때만 목록훅 활성화. R이 없으면 접근불가, 데이터가없으면 빈목록을 구분한다.
  2. 상단역할카드 수치는 UserList.roleCounts, 상태요약은statusCounts. 카드/검색/부서/상태변경 시page1 및 selectedIds=[]로 초기화한다. 검색은 UI입력 즉시 갱신하고250ms 후 query에 반영한다.
  3. 표열: 선택, 이름/직급/본인표시, 이메일, 부서, 역할, 상태, 최근접속, 관리. departmentName은 ID맵, null은'소속 미지정'. 시간표시는 한국시간, lastSeen=null은'—'.
  4. 부서 관리자에서는 소속 부서필터를 해당값으로 고정하고 다른 부서 옵션을 보내지 않는다. 편집/삭제/잠금/역할드롭다운·체크박스열을 렌더링하지 않는다. 읽기 역할라벨은 보여준다.
  5. 슈퍼 관리자도 해당 CRUD가 꺼졌으면 버튼/체크박스/드롭다운을 렌더링하지 않는다. 본인 role/status/delete 컨트롤은 비활성 및 사유를 표시한다.
  6. 페이지 전체선택은 현재 보이는 타 사용자 중 변경가능한 행만 대상이다. 일괄 명령의 version을 선택시점 row에서 캡처하고 stale상태는서비스가충돌로거절하게 한다.
  7. 목록 내보내기는 useExportUsers().mutateAsync 현재query를 사용한다. 선택사용자만내보내는동작으로바꾸지 않는다. 서비스가전체필터 결과CSV를 반환하면 downloadCsv로저장한다.
  8. API 오류·변경중 상태를 카드영역에 표시하며 반복클릭을 막는다. 실패 시 selection/입력값을 보존하고 성공 후에만 선택을 비운다.

### I02. 사용자 등록·편집·일괄 작업
- Related Files:
  - `components/admin/users/UserEditorDialog.tsx` :: UserEditorDialog — new
  - `components/admin/users/DirectoryPickerDialog.tsx` :: DirectoryPickerDialog — new
  - `components/admin/users/UserBulkActions.tsx` :: UserBulkActions — new
  - `components/ui/ModalFrame.tsx` :: 기존모달 — read-only
#### Details
- **Signatures & Types**:
~~~typescript
interface UserEditorDialogProps {
  open: boolean; user: AdminUser | null; departments: readonly AdminDepartment[];
  onClose(): void;
}
interface DirectoryPickerDialogProps { open: boolean; onClose(): void }
interface UserBulkActionsProps {
  users: readonly AdminUser[]; busy: boolean;
  onClear(): void; onCommand(command: AdminCommand): Promise<void>;
}
~~~
- **Data & Schema Fields**: 신규는 NewAdminUser, 수정은 EditAdminUser와VersionedRef. email은신규만입력, 수정시readonly. departmentId=null허용, 부서 관리자로저장할때는부서선택필수. invite기본true이며 실제 메일발송이아닌예시초대상태임을라벨근처에표시한다.
- **Execution Flow / Logic**:
  1. '사용자 추가'는 디렉터리 선택모달을 열고, 내부 '직접 등록'에서 빈UserEditor로 이동한다. 실제 Graph 검색/초대는 호출하지 않는다.
  2. directory는 useAdminDirectory 결과를 이름/이메일/부서로 필터한다. registeredUserId!=null은등록됨배지와추가선택disabled. 후보id는 add-directory-users ids로 전송한다.
  3. 신규 역할선택은3단계, 부서 관리자는부서필수. 일반/슈퍼는미지정가능. 입력오류는 Zod/서비스fieldErrors로각필드에연결한다.
  4. 편집에서는 모달을연시점version으로저장한다. 서버대응mock CONFLICT면 입력유지+'다시 불러오기'를제공한다. 자동덮어쓰기/실패 시닫기를하지않는다.
  5. 단일행역할변경은 change-user-role targets1개, 일괄은여러개. 잠금/해제는set-user-status, 삭제는delete-users. 일괄중1명실패 시전원실패라는안내를보여준다.
  6. 삭제 전 ModalFrame확인으로대상수/이름을보여주고, 성공 후토스트의'되돌리기'가undoToken을사용한다. Undo실패는충돌안내이며옛객체로임의복구하지않는다.
  7. 본인권한 변경/잠금/삭제와마지막슈퍼 관리자제약은UI와서비스모두검사한다. hidden액션을이벤트로우회해도서비스가거절한다.
  8. 등록·편집·초대 재발송·잠금·삭제 성공은동일store의로그와대시보드에반영된다. '메일을보냈습니다' 대신 '초대 대기 상태를 예시로 등록했습니다'처럼 실제발송으로오해하지않게 한다.

### I03. 그룹과 역할별 CRUD 탭
- Related Files:
  - `components/admin/users/GroupsPanel.tsx` :: GroupsPanel — new
  - `components/admin/users/GroupEditorDialog.tsx` :: GroupEditorDialog — new
  - `components/admin/users/RolePermissionsPanel.tsx` :: RolePermissionsPanel — new
  - `config/admin-permissions.ts` :: 상한/라벨 — read-only
#### Details
- **Signatures & Types**:
~~~typescript
declare function GroupsPanel(): React.ReactElement;
interface GroupEditorDialogProps { open: boolean; group: AdminGroup | null; onClose(): void }
declare function RolePermissionsPanel(): React.ReactElement;
~~~
- **Data & Schema Fields**: groups/permissions 탭은 super_admin이며각리소스R이있을때만렌더링. 그룹검색기본"", page1/pageSize20. 그룹입력은GroupDraft, 멤버는directory의registeredUserId가존재하는실제회원만선택한다.
- **Execution Flow / Logic**:
  1. 그룹 목록은 AdminGroupRow의 이름/표시 멤버수/ownerName/수정일/관리열을 사용한다. 그룹 생성/멤버 편집은 groups C/U와 users R이 함께 있을 때만 제공하며, 편집은기존모달560px. 초기멤버검색과체크박스선택은userId기준이다. 미등록디렉터리인원을그룹멤버로저장하지않는다.
  2. 새그룹명중복·빈이름·삭제회원은유효성오류. 그룹삭제는확인과Undo를지원한다. 그룹삭제가사용자 계정삭제가되지않게 한다.
  3. 권한표는9개리소스별CRUD를세역할에설정한다. 조회전용리소스의불가능한C/U/D는체크박스대신'—'를표시한다. 역할상한밖은불가사유와disabled상태로표시한다.
  4. super_admin permissions R/U는항상체크고정. R을해제하면같은행C/U/D도해제하고dirty를표시한다. R없이C/U/D체크를허용하지않는다.
  5. save-grants에는전체행렬과편집을연시점permissionRevision을보낸다. 권한 변경으로현재다른탭의권한이사라지면현재access의새revision을기준으로본문을차단한다.
  6. 관리자가일반 사용자의권한을개별체크로예외설정하는기능은만들지않는다. 역할상한을넘는새메뉴/업무권한도추가하지않는다.

### I04. 화면 검증
- Related Files:
  - `tests/services/admin/MockAdminDataService.test.ts`, `tests/lib/admin/permissions.test.ts` :: 기존업무규칙검증 재사용; read-only
  - `tests/app/workspace/screen.test.ts` :: users router 연결 확인 필요시 갱신; modify
#### Details
- 노드테스트로이미확인한서비스 로직을컴포넌트테스트에복제하지않는다. 브라우저에서3역할의컨트롤유무, 필터 변경선택초기화, 혼합선택, 자기보호, 충돌폼보존, Undo를확인한다.
- 역할CRUD변경→역할 전환→버튼/조회차단 및 다른 부서검색불가를검증한다.
- 사용자행추가/역할변경으로로그/대시보드서비스집계가같이바뀌는지는서비스흐름과T09통합시나리오를연결한다.



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
- [x] 사용자 목록·등록·편집·일괄작업·그룹·권한표가 실제 mock 상태를 변경한다.
- [x] 부서 관리자에게사용자조회외변경컨트롤이렌더링되지않는다.
- [x] CRUD 상한·본인보호·버전충돌·Undo규칙이유지된다.
- [x] 소속 부서밖정보가목록·후보·내보내기에노출되지않는다.

## Validation
- `npm test -- tests/services/admin/MockAdminDataService.test.ts tests/lib/admin/permissions.test.ts tests/app/workspace/screen.test.ts` — 오류 없이 통과
- `npm run typecheck` — 오류 없이 통과
- `npm run lint` — 오류 없이 통과
- `git diff --check` — 오류 없이 통과
- `npm run dev -- --hostname 127.0.0.1 --port 3100` — 기존 설정에서 브라우저 시나리오 확인. 공유 .env를 변경하지 않는다.

## Commit Message
~~~text
feat(admin): 사용자·그룹·역할별 권한 화면

Plan: 2026-10-29-admin-mock-ui
Phase: P01-admin-mock-ui
Task: T05-user-permissions

- 슈퍼 관리자가 사용자·그룹과 역할별 CRUD를 관리하고 부서 관리자는 자기 부서 사용자만 조회하는 사용자 설정 화면을 제공한다.
- 역할·부서·상태 변경에 따른 화면 동작 검증
~~~

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과 (실브라우저 검증은 T09에서 별도 추적)
- commit: 이 청사진을 포함하는 통합 커밋 — feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현


## 실행 결과
- 서비스·권한·라우트 테스트 44개, typecheck, lint, diff 검사 통과. 3100 dev 실행은 기존 3000 dev 인스턴스의 lock으로 실행하지 않았으며 기존 서버는 보존했다. 브라우저 호스트 연결 및 Windows URL 인식 실패로 실제 시각 검증은 미검증이다. 현재 권한의 동기 스냅샷으로 변경 시 불필요한 폼 재마운트를 방지했다.
