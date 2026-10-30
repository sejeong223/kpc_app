# Task: T06 Runtime·React Query·공통 자산 컴포넌트

## Status: done

## Goal
동일한 실행 저장소를 Skill·Template 화면과 적용 테스트가 공유하고, 권한 변경 후 캐시나 파일 미리보기가 남아 노출되지 않는 공통 기반을 제공한다.

## Decision Summary
- D13~D15. 현재 RuntimeInstance의 identity 수명을 재사용하고 조회/변경은 React Query로 연결한다. 공통 목록·공개 범위·버전 표시를 두 메뉴에서 재사용한다.
- 선행 Task 완료 후 순차 구현한다. 사용자 요청에 따라 최종 Task 검증 후 한 번 커밋하고 중간 commit은 deferred로 기록한다.

## Implementation

### I01. 공급자와 훅 연결
- Related Files:
  - components/admin/AdminRuntimeProvider.tsx :: AdminRuntime, RuntimeInstance — files/service/works 동일 수명; modify
  - lib/admin/query-keys.ts :: AdminQueryFilter, adminQueryKey — 자산/작업 필터 타입; modify
  - hooks/admin/use-assets.ts :: 아래 훅 — metadata query/mutation; new
  - hooks/admin/use-template-work.ts :: 아래 작업 훅 — work revision query/mutation; new
  - services/admin/TemplateWorkService.ts :: setActor/canAccess/dispose — 현재 상태 판정; read-only
  - tests/lib/admin/assets/runtime.test.ts, tests/lib/admin/assets/query-keys.test.ts — 수명/권한 키; new

#### Details
```typescript
function useAssets(query:AssetQuery): UseQueryResult<AssetList,AdminDataError>;
function useAsset(id:string|null): UseQueryResult<AssetDetail,AdminDataError>;
function useAssetAudience(kind:AssetKind): UseQueryResult<AssetAudienceOptions,AdminDataError>;
function useAssetCommand(): UseMutationResult<AssetReceipt,AdminDataError,AssetCommand>;
function useTemplateImport(): UseMutationResult<StagedTemplateSource,Error,
  {file:File;signal?:AbortSignal;onProgress?:TemplateProgress}>;
function useTemplateWorks(): UseQueryResult<TemplateWorkListItem[],Error>;
function useTemplateWork(id:string|null): UseQueryResult<WorkView,Error>;
function useTemplateWorkCommand(): UseMutationResult<WorkView|null,Error,WorkCommand>;
function useTemplateDownload(): UseMutationResult<WorkDownload,Error,{workId:string;resultId:string}>;
```
- 현재 AdminRuntime={actor,service,revision,queryClient,access}에 works:TemplateWorkDataService를 추가한다. files는 context로 직접 노출하지 않는다.
- useState 초기화 순서는 files=new TemplateFileStore → service=new MockAdminDataService({seed,files}) → works=new TemplateWorkService({host:service,files,actor:initialActor})다. 서비스의 actor/getAccessSnapshot 동작은 유지한다.
- RuntimeInstance key=adminIdentityKey(authEnabled,session)를 유지한다. preview role 전환 때문에 저장소를 새로 만들지 않는다. actor의 userId/role/departmentId가 바뀌면 works.setActor로 실행을 취소하고 화면에서 canAccess로 즉시 가린다.
- dispose는 최종 unmount/identity 교체 시 works→files→queryClient 순서다. React StrictMode effect의 setup-cleanup-setup 재실행에서 살아 있는 저장소를 지우지 않도록 effect 세대 번호와 microtask 지연 정리 또는 동등한 lease 방식을 쓴다. 같은 instance의 다음 setup이 이미 실행됐으면 이전 cleanup은 취소한다.
- useSyncExternalStore는 service.getRevision와 works.getRevision의 숫자 snapshot을 구독한다. getSnapshot에서 매 호출 새 객체를 반환해 무한 렌더하지 않는다.
- AdminQueryFilter에 AssetQuery와 {assetId:string}와 {workId:string;workRevision:number} 타입을 추가한다. 기존 key [admin-mock,userId,role,departmentId,adminRevision,kind,filter] 구조를 유지한다. works list/detail은 workRevision을 filter에 넣는다.
- 모든 자산 쿼리는 current access와 kind별 read 허용 때만 enabled=true다. assetId/작업ID 및 역할/부서/revision을 key에 넣는다. 자산/작업은 placeholderData를 사용하지 않는다. ACL 변경 뒤 이전 결과를 잠깐 노출하는 최적화를 하지 않는다.
- disabled 쿼리에도 예전 data가 남을 수 있으므로 UI는 current access/canAccess가 false면 query.data를 소비하지 않는다. permissionRevision만으로 ACL 회수를 감지하려 하지 않는다. 공개/그룹 구성 변화는 adminRevision으로도 갱신된다.
- work query는 가벼운 메타데이터만 캐시하고 gcTime=0으로 이전 workRevision 캐시를 정리한다. bytes/ZIP/TemplateResult를 mutation 성공 data에 계속 보관하지 않고 필요한 UI 처리 후 mutation.reset 한다.
- 기존 retireAdminQueries의 '관찰 중인 새 query를 삭제하지 않는' 보호 조건을 보존한다. 전역 QueryClient를 새로 추가하지 않는다.
### 공통 자산 계약 (이 Task의 구현 기준)

아래 타입은 전부 Zod strict schema에서 추론하고 types/admin-assets.ts에서 재수출한다. ID는 trim된 1~120자, 이름 1~80자, short 1~20자, description 0~1000자다. 카운터는 양의 안전한 정수, 시간은 ISO UTC 문자열이다. 명시한 nullable 외에는 null/undefined를 저장하지 않는다.

```typescript
type AssetKind = "skill" | "template";
type AssetStatus = "active" | "inactive";
type AssetAudienceTarget = { type: "department" | "user" | "group"; id: string };
interface AssetVisibility { all: boolean; targets: AssetAudienceTarget[] }
interface AssetRecord extends AdminRecord {
  kind: AssetKind;
  ownerDepartmentId: string | null;
  createdBy: string;
  status: AssetStatus;
  visibility: AssetVisibility;
  currentRevision: number;
  deletedAt: string | null;
}
interface AssetRevisionBase {
  id: string; assetId: string; revision: number;
  name: string; short: string; description: string;
  createdAt: string; createdBy: string;
}
interface SkillAssetRevision extends AssetRevisionBase { kind: "skill"; rules: SkillRules }
interface TemplateAssetRevision extends AssetRevisionBase {
  kind: "template"; definition: TemplateDefinition;
}
type AssetRevision = SkillAssetRevision | TemplateAssetRevision;
interface TemplateDefinition {
  fileRefId: string;
  extraction: TemplateExtraction;
  pageTypes: Record<string, PageType>;
  roles: Record<string, ObjectRole>;
  excluded: string[];
}
interface TemplateExtraction {
  filename: string; byteLength: number; sha256: string;
  widthCm: number; heightCm: number; slideCount: number;
  fonts: string[];
  themes: { path: string; name: string; colors: { slot: string; color: string }[];
    majorFont: string | null; minorFont: string | null }[];
  layouts: { path: string; name: string; masterPath: string | null;
    slideIndices: number[]; placeholderCount: number }[];
  logoCandidates: { objectId: string; sourcePart: string; slideIndices: number[] }[];
  slides: { index: number; name: string; type: PageType; objectCount: number }[];
  warnings: string[];
}
interface AssetStore { records: AssetRecord[]; skillRevisions: SkillAssetRevision[];
  templateRevisions: TemplateAssetRevision[] }
interface AssetCapabilities { read: boolean; update: boolean; delete: boolean; duplicate: boolean; apply: boolean }
interface AssetRow extends AssetRecord {
  name: string; short: string; description: string; ownerDepartmentName: string;
  capabilities: AssetCapabilities;
}
interface AssetDetail { asset: AssetRow; revision: AssetRevision;
  history: { id: string; revision: number; createdAt: string; createdBy: string }[] }
interface AssetQuery {
  kind: AssetKind; search: string; visibility: "all" | "organization" | "department" | "group" | "user";
  status: "all" | AssetStatus; page: number; pageSize: 10 | 20 | 50;
  sort: "updatedAt" | "name"; direction: "asc" | "desc";
}
interface AssetList { rows: PageResult<AssetRow>; activeCount: number; inactiveCount: number }
interface AssetAudienceOptions {
  departments: { id: string; name: string }[];
  users: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}
type AssetNamedDraft = Pick<AssetRevisionBase, "name" | "short" | "description">;
interface SkillDraft extends AssetNamedDraft { rules: SkillRules }
interface TemplateDraft extends AssetNamedDraft {
  fileRefId: string; pageTypes: Record<string, PageType>;
  roles: Record<string, ObjectRole>; excluded: string[];
}
type AssetCommand =
  | { type: "create-skill"; ownerDepartmentId: string | null; status: AssetStatus; visibility: AssetVisibility; value: SkillDraft }
  | { type: "create-template"; ownerDepartmentId: string | null; status: AssetStatus; visibility: AssetVisibility; value: TemplateDraft }
  | { type: "update-skill"; target: VersionedRef; value: SkillDraft; status: AssetStatus; visibility: AssetVisibility }
  | { type: "update-template"; target: VersionedRef; value: TemplateDraft; status: AssetStatus; visibility: AssetVisibility }
  | { type: "set-asset-visibility"; target: VersionedRef; visibility: AssetVisibility }
  | { type: "set-asset-status"; target: VersionedRef; status: AssetStatus }
  | { type: "delete-asset"; target: VersionedRef }
  | { type: "duplicate-asset"; target: VersionedRef };
interface AssetReceipt { revision: number; assetId: string; assetVersion: number; contentRevision: number }
interface AppliedAssetRef { assetId: string; revisionId: string; revision: number }
interface ResolvedAsset { asset: AssetRecord; revision: AssetRevision }
```

- AdminRecord는 기존 id/version/createdAt/updatedAt이다. AssetRecord.version은 메타데이터 동시 수정 검사용이고 currentRevision은 서식 내용 버전이다. 상태·공개 범위 변경은 version만 증가, 이름/설명/설정/파일 수정은 새 내용 버전을 추가한다.
- Revision은 덮어쓰지 않는다. assetId는 AssetRecord.id를 참조하고 (assetId, revision)과 revision.id는 유일하다. 종류가 다른 revision 연결, 존재하지 않는 파일/사용자/부서/그룹을 서비스가 거절한다.
- Visibility: all=true이면 targets=[]로 정규화한다. all=false이고 targets=[]이면 소유 부서의 관리자/슈퍼 관리자만 관리 가능하다. 공개 대상은 이용 권한이며 편집 권한을 부여하지 않는다. 대상 중복 제거, 최대 100개. department/user/group은 현재 디렉터리 ID로 검사한다.
- 신규 자산 기본 상태 inactive, 기본 공개 {all:false, targets:[]}다. 슈퍼 관리자는 소유 부서를 지정하거나 null(전사 소유)로 만들 수 있고, 부서 관리자는 자신의 확인된 departmentId만 사용한다. 복제는 새 ID·revision=1·자기 부서·inactive·기본 공개로 생성하고 이름에 ' 복사본'을 붙이되 80자 이내로 제한한다.
- TemplateExtraction은 서비스가 실제 분석 결과에서 작성한다. UI의 요약/sha256/슬라이드 개수 입력을 받아 재저장하지 않는다. sha256은 소문자 64자리 16진수다. 슬라이드 index와 pageTypes 키는 0 기반이다.
- Template의 이번 편집 범위는 파일 교체·유형·역할·적용 제외 및 관리 정보다. 추출 색상/글꼴/로고 후보를 임의의 기본값으로 바꾸거나 전체 브랜드 변환을 구현했다고 표시하지 않는다.
- 조회 권한을 먼저 적용한 뒤 필터·정렬·페이지를 계산한다. 검색은 name/short/description, count는 동일 권한/검색/공개 필터 후 상태 필터 이전, 정렬 동률은 id로 결정한다. pageSize=20, page=1, sort=updatedAt, direction=desc, 검색 빈 값, status/visibility=all이 초기값이다.

### 자산 서비스와 파일 경계

```typescript
interface AssetDataService {
  getAssets(actor: AdminActor, query: AssetQuery): Promise<AssetList>;
  getAsset(actor: AdminActor, id: string): Promise<AssetDetail>;
  getAssetAudience(actor: AdminActor, kind: AssetKind): Promise<AssetAudienceOptions>;
  executeAsset(actor: AdminActor, command: AssetCommand): Promise<AssetReceipt>;
  importTemplate(actor: AdminActor, file: File, signal?: AbortSignal,
    onProgress?: (message: string) => void): Promise<StagedTemplateSource>;
  discardTemplateImport(actor: AdminActor, fileRefId: string): void;
}
interface StagedTemplateSource { id: string; filename: string; byteLength: number; sha256: string; extraction: TemplateExtraction }
interface AssetRuntimeHost extends AssetDataService {
  getAccess(actor: AdminActor): Promise<AdminAccessView>;
  resolveAsset(actor: AdminActor, ref: AppliedAssetRef | { assetId: string }, mode: "new" | "existing"): ResolvedAsset;
  recordWorkActivity(actor: AdminActor, refs: { template: AppliedAssetRef; skill: AppliedAssetRef },
    action: "apply" | "export", workId: string): void;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
```

MockAdminDataService가 위 계약을 구현하고 기존 AdminDataService는 해당 Task에서 AssetDataService를 extends한다. resolveAsset/recordWorkActivity는 앱 내부의 작업 서비스용 동기 메서드로서 별도 공개 서버 API가 아니다. UI는 클라이언트 supplied actor를 신뢰하는 실제 보안을 제공한다고 주장하지 않는다.

- getAsset은 조회 권한+현재 대상 범위를 검사하고 삭제 자산은 NOT_FOUND, 접근 불가 자산은 FORBIDDEN으로 처리한다. 반환은 복사본이며 현재 revision과 history 요약만 포함한다.
- resolveAsset(mode=new)은 삭제 아님/active/현재 read 범위를 요구하고 최신 revision만 반환한다. existing은 존재하는 정확한 assetId/revisionId/revision 삼중 조합 및 현재 read 범위를 요구하되 inactive/deleted를 허용한다. 호출자는 작업에 고정된 참조를 사용해야 한다.
- 공통 오류는 기존 AdminDataError(FORBIDDEN,NOT_FOUND,VALIDATION,CONFLICT,INACTIVE_USER)를 사용한다. 입력은 Zod로 검증하고 stale AssetRecord.version은 CONFLICT. mock Promise API이므로 HTTP 상태를 만들지 않는다.
- read 범위: 슈퍼 관리자 또는 자기 부서 자산 관리자는 접근 가능하며, 그 외에는 visibility.all 또는 현재 actor 부서/사용자 ID/삭제되지 않은 그룹의 실제 memberIds 일치가 필요하다. 그 뒤 역할별 read grant도 필수다. 그룹 ID를 안다는 것만으로 접근하지 못한다.
- write: 해당 create/update/delete grant와 슈퍼 관리자 또는 소유 부서 일치가 필요하다. 다른 부서 공개 자산에 대한 update/delete는 항상 거절한다.
- audience 후보 조회는 별도 제한된 서비스다. 기존 getDirectory/getGroups를 부서 관리자에게 개방하지 않는다. 슈퍼 관리자는 살아 있는 전체 등록 사용자·그룹·부서, 부서 관리자는 자기 부서 사용자·자기 부서·본인이 소유하거나 구성원인 그룹의 id/name만 얻는다. 전사 공개는 all=true로 지정할 수 있다.
- importTemplate은 해당 리소스 read와 create 또는 update를 검사하고 실제 파일을 비동기 분석한다. 완료 시 권한/취소를 재확인하고 caller 소유 staged handle만 반환한다. 저장 시 fileRefId가 본인 staged 파일 또는 해당 자산의 기존 파일인지 검사한다. 다른 사람 staged ID를 주입할 수 없다.
- 파일 교체 후 pageTypes/roles/excluded는 새 파일에 실제 존재하는 키만 허용한다. extraction은 TemplateFileStore의 분석 결과를 읽어 저장한다.
- private state를 structuredClone → 검증/수정 → commit하는 기존 패턴을 사용한다. 실패 시 state/revision/audit/파일 보유 참조가 남지 않는다. 보유 파일 참조는 commit 전 준비 후 실패 시 해제한다.

### 적용 작업 계약

```typescript
type WorkStatus = "ready" | "running" | "succeeded" | "failed" | "cancelled";
interface WorkResultSummary {
  id: string; inputRevision: number; template: AppliedAssetRef; skill: AppliedAssetRef;
  createdAt: string; filename: string; changed: number; kept: number; skipped: number;
  warnings: string[];
}
interface TemplateWork {
  id: string; ownerId: string; createdAt: string; updatedAt: string; version: number;
  template: AppliedAssetRef; skill: AppliedAssetRef; options: TemplateOptions;
  inputRevision: number; status: WorkStatus; progress: string;
  error: { code: "FORBIDDEN" | "CONFLICT" | "FILE" | "CANCELLED"; message: string } | null;
  result: WorkResultSummary | null;
}
interface WorkView {
  work: TemplateWork;
  templateName: string; skillName: string;
  newer: { template: boolean; skill: boolean };
  canReapply: boolean; canApplyLatest: boolean; canDownload: boolean;
}
interface TemplateWorkListItem extends Pick<TemplateWork,"id"|"createdAt"|"updatedAt"|"status"> {
  templateName: string; skillName: string;
}
type WorkCommand =
  | { type: "create-work"; templateId: string; skillId: string }
  | { type: "update-work-options"; target: VersionedRef; options: TemplateOptions }
  | { type: "apply-work"; target: VersionedRef; mode: "pinned" | "latest" }
  | { type: "cancel-work"; id: string }
  | { type: "discard-work"; id: string };
type TemplatePreviewData = Pick<TemplateDocument,"width"|"height"|"slides"|"warnings">;
interface WorkDownload { bytes: Uint8Array; filename: string }
interface TemplateWorkDataService {
  getWorks(actor: AdminActor): Promise<TemplateWorkListItem[]>;
  getWork(actor: AdminActor, id: string): Promise<WorkView>;
  execute(actor: AdminActor, command: WorkCommand): Promise<WorkView | null>;
  download(actor: AdminActor, workId: string, resultId: string): Promise<WorkDownload>;
  canAccess(actor: AdminActor, workId: string): boolean;
  getPreview(actor: AdminActor, workId: string, side: "before" | "after"): TemplatePreviewData | null;
  getChanges(actor: AdminActor, workId: string): ObjectChange[];
  setActor(actor: AdminActor): void;
  subscribe(listener: () => void): () => void; getRevision(): number;
  dispose(): void;
}
```

TemplateWorkService는 RuntimeInstance별로 1개이며 인증 identity 변경 시 dispose한다. 작업 소유자는 creator actor.userId이고 타인 작업을 열지 못한다. 내부 Map에 작업·작업별 AbortController·실행 token·무거운 TemplateResult를 보관하며 React Query에는 WorkView 등 가벼운 데이터만 제공한다.

새 작업은 활성·접근 가능한 자산의 최신 revision을 resolveAsset(new)로 고정한다. 이후 원본 수정은 newer 표시만 바꾸고 work.options/inputRevision/result를 건드리지 않는다. 원본 inactive/deleted도 resolveAsset(existing)으로 기존 작업은 계속 사용한다. read 권한 회수·그룹 탈퇴·부서 이동·계정 비활성은 즉시 접근/적용/다운로드를 막는다.

apply-work(pinned)는 기존 refs를 사용하고, latest는 두 자산 모두 active/현재 접근 가능할 때 현재 최신 refs를 후보로 계산한다. Template revision 변경으로 fileRefId가 달라지면 새 파일의 기본 selectedSlides/pageTypes/roles/excluded로 재설정하고 sharedEdits를 비운다. UI는 이를 최신 재적용 확인에 표시한다. Skill만 변경이면 기존 options를 유지한다.

처리 중 변경사항을 성공으로 확정하지 않는다. 성공 시 refs/options/result를 함께 교체하며 실패·취소는 이전 성공 refs/result를 보존한다. 직접 options 편집은 inputRevision을 증가시키며 이전 결과를 현재 설정의 결과로 다운로드하지 못한다. 실패한 latest 시도는 기존 inputRevision을 건드리지 않아 이전 성공 결과를 계속 다운로드할 수 있다.

새 실행/취소/삭제/역할 또는 부서 변경/권한 회수는 실행 token을 폐기한다. 시작·진행·완료·download에서 현재 권한과 token을 검사한다. 취소 후 늦게 도착한 Promise는 결과·감사 로그를 게시하지 못한다. JSZip의 이미 실행 중인 구간을 강제로 중단할 수 있다고 보장하지 않고 다음 진행/완료 경계에서 결과를 폐기한다.

getWork/getPreview/getChanges/download는 매번 현재 양쪽 자산 read 권한을 검사한다. canAccess=false이면 캐시에 남은 결과·미리보기도 렌더링하지 않는다. resultId와 inputRevision이 일치한 성공 결과만 내려받는다. output 원본은 생성 시 저장한 bytes이며 재압축을 다운로드 때 다시 수행하지 않는다.


### I02. 목록·공개 범위·버전 UI
- Related Files:
  - components/admin/assets/AssetListPanel.tsx :: AssetListPanel — 목록/필터/상태/액션; new
  - components/admin/assets/AssetVisibilityField.tsx :: AssetVisibilityField — 공개 범위; new
  - components/admin/assets/AssetVersionBadge.tsx :: AssetVersionBadge — 현재/적용 버전; new
  - components/admin/assets/AssetDeleteDialog.tsx :: AssetDeleteDialog — 삭제 영향 확인; new
  - components/admin/ui/AdminPrimitives.tsx :: AdminPageProps, AdminPage — 안내 문구 선택; modify
  - app/admin-theme.css — 필요한 공통 상태/패널 토큰만 추가; modify
  - components/admin/ui/AdminTable.tsx, AdminPager.tsx, AdminAsyncState.tsx — 기존 공용 표/상태; read-only
  - components/ui/ModalFrame.tsx — 기존 접근성/포커스/스크롤; read-only

#### Details
```typescript
interface AssetListPanelProps {
  kind:AssetKind; query:AssetQuery; onQueryChange(value:AssetQuery):void;
  list:AssetList; loading:boolean; error:string|null;
  onOpen(id:string):void; onCreate():void; onDuplicate(row:AssetRow):void;
  onToggle(row:AssetRow):void; onDelete(row:AssetRow):void; canCreate:boolean;
}
interface AssetVisibilityFieldProps { value:AssetVisibility; candidates:AssetAudienceOptions;
  disabled:boolean; onChange(value:AssetVisibility):void }
interface AssetVersionBadgeProps { currentRevision:number; appliedRevision?:number; inactive?:boolean; deleted?:boolean }
interface AssetDeleteDialogProps { open:boolean; asset:AssetRow|null; pending:boolean; error:string|null;
  onConfirm(target:VersionedRef):void; onClose():void }
```
- AdminPageProps에 dataNotice?:string|null 추가. undefined는 기존 '예시 데이터 · 기준일 2026.10.20'을 유지하고 null은 안내 생략, string은 전달한 안내를 표시한다. 새 두 메뉴는 '관리 정보는 임시 저장되며 새로고침하면 초기화됩니다. 업로드 파일은 실제로 분석합니다.'를 사용한다. 다른 네 관리자 화면 문구는 바꾸지 않는다.
- 목록 열=이름/약칭, 소유 부서, 공개 범위, 상태, 내용 버전, 수정일, 작업. 검색/공개/상태 변경 시 page=1. 동작 권한은 row.capabilities와 current grants를 모두 확인하여 버튼을 조건부 렌더링한다.
- 활성 토글은 해당 row.version을 command에 전달한다. 이름/단순 상태 표시는 inactive/deleted와 content revision을 혼동하지 않는다.
- 삭제 설명은 '새 작업에서 선택할 수 없습니다. 기존 작업은 권한이 유지되는 동안 적용 당시 버전을 계속 사용합니다.'다. 권한 회수가 모든 로컬 파일을 회수한다는 문구는 쓰지 않는다.
- 공개 범위는 전사 체크와 부서/그룹/사용자 칩 목록이다. 전사 선택 시 다른 targets는 지우고 전사 해제 시 자동으로 예전 대상이 복원되지 않게 한다. 액션 없이 권한을 바꾸지 않으며 저장은 부모가 수행한다.
- Tailwind tw: 접두사와 --kpc-* 토큰을 사용한다. Fluent Field/Input/Select/Button/Checkbox와 ModalFrame을 재사용한다. HTML 이벤트/innerHTML을 복사하지 않는다.
- 기능 없는 버튼을 임시로 노출하지 않는다. T07/T08이 연결되기 전에는 경로를 새 빈 page 컴포넌트로 바꾸지 않는다.

## Acceptance Criteria
- [x] 같은 브라우저의 메뉴 이동에서 저장소/작업이 유지되고 identity 교체 시 정리된다.
- [x] 권한이 회수되면 이전 캐시/미리보기를 렌더링하지 않는다.
- [x] StrictMode 재실행이 살아 있는 업로드·작업을 지우지 않는다.
- [x] 공통 컴포넌트가 소유권/권한에 맞춰 액션을 렌더링한다.
- [x] 새 화면 안내가 실제 파일과 예시 관리 데이터를 구분한다.

## Validation
- `npm.cmd test -- tests/lib/admin/assets/runtime.test.ts tests/lib/admin/assets/query-keys.test.ts tests/lib/admin/query-keys.test.ts tests/lib/admin/runtime.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.
- `npm.cmd run build` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): 자산 Runtime과 Query 및 공통 관리 UI 연결

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T06-runtime-components

- 동일한 실행 저장소를 Skill·Template 화면과 적용 테스트가 공유하고, 권한 변경 후 캐시나 파일 미리보기가 남아 노출되지 않는 공통 기반을 제공한다.
- 정책 경계와 기존 관리자 동작 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 790835657f82a27871ff5e1ec80632ca115c69c7 (T01~T10 단일 통합 커밋)


## 실행 검증 기록
- Runtime/Query 4개 파일 6개 테스트, typecheck, lint, Next production build 통과. StrictMode 재연결 보존·최종 dispose·역할별 캐시 격리 확인.
