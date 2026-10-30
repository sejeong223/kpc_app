# Task: T05 고정 버전 작업·재적용·취소·권한 회수

## Status: done

## Goal
관리자 적용 테스트가 원본 변경·삭제와 무관하게 고정 버전을 사용하고, 명시적 재적용과 현재 권한에 따라 결과를 안전하게 교체한다.

## Decision Summary
- D08/D09/D13. 원본 새 버전은 알림만 만들고 기존 결과 다운로드를 차단하지 않는다. 공개 범위/역할/그룹 권한 회수는 기존 작업도 즉시 차단한다.
- 선행 Task 완료 후 순차 구현한다. 사용자 요청에 따라 최종 Task 검증 후 한 번 커밋하고 중간 commit은 deferred로 기록한다.

## Implementation

### I01. 실행 중 작업 서비스와 상태 전이
- Related Files:
  - services/admin/TemplateWorkService.ts :: TemplateWorkService — 작업 Map·실행 token·취소·결과 보관; new
  - types/template-work.ts :: TemplateWorkDataService, WorkView, WorkCommand — 공개 계약; new
  - lib/admin/assets/work-schemas.ts :: WorkCommandSchema, TemplateWorkSchema — 작업 입력/결과 검증; new
  - lib/admin/assets/work-policy.ts :: buildDefaultOptions, canDownloadWork, resolveLatestCandidates — 순수 정책; new
  - services/admin/MockAdminDataService.ts :: resolveAsset, recordWorkActivity, getAccess — T03 권한/감사 경로; read-only
  - services/admin/TemplateFileStore.ts :: getSource/retain/release — T02 원본 보유; read-only
  - lib/pptx/template-apply.ts :: applyTemplate — T04 실제 변환; read-only

#### Details
- Signatures:
```typescript
interface WorkServiceOptions {
  host: AssetRuntimeHost; files: TemplateFileStore; actor: AdminActor; createId?:()=>string;
  apply?: (source:TemplateDocument, skill:SkillEngineInput, options:TemplateOptions,
    onProgress:TemplateProgress, signal:AbortSignal)=>Promise<TemplateResult>;
}
class TemplateWorkService implements TemplateWorkDataService {
  constructor(options:WorkServiceOptions);
}
function buildDefaultOptions(revision:TemplateAssetRevision): TemplateOptions;
function canDownloadWork(work:TemplateWork, currentlyAllowed:boolean): boolean;
```
- AssetRuntimeHost에는 기존 getAccess(actor):Promise<AdminAccessView>도 포함한다. 작업 시간은 getAccess의 logicalNow를 사용한다. 테스트에서는 options.apply를 지연 Promise로 주입하고 운영 mock에서는 applyTemplate을 dynamic import한 뒤 ZIP 어댑터와 연결한다.
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

### PPT 엔진 입출력

```typescript
type ObjectRole = "title" | "sub" | "body" | "table" | "image" | "shape" | "keep";
interface Box { x: number; y: number; w: number; h: number }
interface TextStyle { face: string; size: number; bold: boolean; color: string;
  align: "left" | "center" | "right"; lh: number; para: number; padV: number; padH: number }
interface TemplateObject extends Box {
  id: string; name: string; kind: "text" | "shape" | "table" | "image" | "unsupported";
  role: ObjectRole; inferred: boolean; text: string; style: TextStyle;
  fill: string; stroke: string; geometry: string; rotation: number;
  cells: string[][]; columnWidths: number[]; rowHeights: number[];
  cellStyles: TextStyle[][]; cellFills: string[][];
  imageData: string; imageWidth: number; imageHeight: number; crop: [number,number,number,number];
  reasons: string[]; notices: string[]; inherited: boolean; merged: boolean; index: number;
  source: "slide" | "layout" | "master"; groupMembers?: GroupMember[];
}
interface GroupMember extends TemplateObject {
  nodePath: number[]; ancestors: string[]; contextReasons: string[];
  previewBox: Box | null; previewScale: number;
}
interface TemplateSlide { path: string; index: number; name: string; type: PageType;
  objects: TemplateObject[]; decorations: TemplateObject[]; background: string;
  warnings: string[]; layoutPath: string; masterPath: string }
interface TemplateImage { data: string; width: number; height: number; previewBytes: number; notice: string }
interface TemplateDocument { filename: string; bytes: Uint8Array; zip: ZipArchive;
  width: number; height: number; slides: TemplateSlide[]; warnings: string[]; images: Map<string,TemplateImage> }
type TemplateProgress = (message: string) => void;
interface TemplateReadOptions { images?: Map<string,TemplateImage>; onProgress?: TemplateProgress; signal?: AbortSignal }
interface SharedDesignEdit {
  id: string; position: Box | null; text: TextStyle | null; fill: string | null;
  textMode?: "full" | "appearance"; textFields?: ("face" | "bold" | "color")[];
}
interface TemplateOptions { layout: boolean; images: boolean; selectedSlides: number[];
  pageTypes: Record<number,PageType>; roles: Record<string,ObjectRole>; excluded: string[];
  sharedEdits?: SharedDesignEdit[] }
interface ObjectChange { slide: number; id: string; name: string;
  status: "changed" | "kept" | "skipped"; details: string[]; before: string; after: string; children?: ChildChange[] }
type ChildChange = Pick<ObjectChange,"id" | "name" | "status" | "details">;
interface TemplateResult { bytes: Uint8Array; before: TemplateDocument; after: TemplateDocument;
  changes: ObjectChange[]; warnings: string[]; skill: SkillEngineInput; modifiedParts: string[] }
interface ZipEntry { name: string; dir: boolean;
  async(format: "string"): Promise<string>; async(format: "uint8array"): Promise<Uint8Array>;
  async(format: "base64"): Promise<string> }
interface ZipArchive { files: Record<string,ZipEntry>;
  file(name: string): ZipEntry | null; file(name: string, text: string): ZipArchive;
  generateAsync(options: {type:"uint8array";compression:"DEFLATE";streamFiles?:boolean},
    onUpdate?: (metadata:{percent:number;currentFile:string|null})=>void): Promise<Uint8Array> }
interface ZipLibrary { loadAsync(bytes: Uint8Array): Promise<ZipArchive> }
```

좌표·여백은 cm, 글자 크기·단락 간격은 pt, 줄 간격은 배수다. 입력 slide.index/selectedSlides는 0 기반, 결과 ObjectChange.slide는 표시용 1 기반이다. 두 값을 혼용하지 않는다.
TemplateDocument/TemplateResult의 bytes·zip·Map은 Query 캐시나 AdminStoreStateSchema에 넣지 않는다. UI에는 메타데이터와 필요한 구조 미리보기만 노출한다. 수정하지 않은 구성 파일의 압축 해제 바이트를 비교하며 ZIP 전체 바이트 일치는 요구하지 않는다.

- 생성: current actor와 두 리소스 read 확인 → resolveAsset(new) 두 건 → 종류 확인 → immutable refs/options 복사 → template file retain("work:"+id) → ready/result=null/inputRevision=1/version=1. 신규 작업용 리소스 inactive/deleted이면 거절한다.
- buildDefaultOptions: layout=false/images=false, selectedSlides=extraction.slides의 index 전체, pageTypes=등록 revision.definition.pageTypes를 number key로 변환, roles/excluded=등록값 복사, sharedEdits=[].
- 옵션 변경: target.id/version CAS 및 현재 접근 확인. running 작업은 먼저 취소하고 입력을 새로 저장한다. 옵션 값이 같으면 no-op, 달라지면 inputRevision/version 증가, status=ready, error=null. 과거 결과는 보관하되 inputRevision 불일치로 canDownload=false.
- pinned 실행: work refs로 resolveAsset(existing); latest 실행: 두 자산이 active이면 최신 후보 조회. currentRevision 새 값 존재 여부와 refs를 비교하고 내용이 같은데 latest를 실행하더라도 결과를 정직하게 표시한다.
- latest에서 Template fileRefId 변경은 target ID와 shared edit가 불안정하므로 buildDefaultOptions로 재설정한다. 동일 fileRefId인 Template 설정 revision 변경은 새 등록 pageTypes/roles/excluded를 기준으로 하되 layout/images 사용자 옵션은 유지하고 sharedEdits는 실제 존재 ID만 남긴다. Skill만 바뀌면 옵션 그대로다.
- 실행 시작에 base work.version/inputRevision, actor key(userId/role/departmentId), operation token, candidate refs/options를 캡처한다. 버전은 상태 관찰/동시 실행 구분용으로 갱신하고 ready/running 전이를 알린다.
- 엔진 await 중 원본 latest가 더 바뀌어도 캡처한 후보를 몰래 교체하지 않는다. 그 후보가 성공하면 다시 newer=true로 남길 수 있다. 권한은 별개로 진행·완료 때 매번 현재 정책으로 검사한다.
- 성공: signal/token/actor key/base inputRevision/현재 접근 재검사 → output summary와 파일 retain 준비 → host.recordWorkActivity(apply) → refs/options/result를 같은 동기 구간에서 교체 → 이전 결과와 불필요한 work file 보유 해제 → succeeded. 공개 변경으로 실패하면 새 bytes/URL은 게시하지 않고 이전 결과를 보존하되 접근도 막는다.
- 실패: 예상 파일 오류는 code=FILE, 충돌=CONFLICT, 권한=FORBIDDEN, 취소=CANCELLED를 한국어 메시지로 기록한다. 파일 내용 자체를 오류 로그에 넣지 않는다. 이전 성공 결과/refs는 유지한다. 실패한 latest는 inputRevision을 증가시키지 않는다.
- cancel은 controller.abort+token 폐기+cancelled, discard는 같은 취소 후 모든 work 보유·결과 Map 삭제다. 화면을 잠시 이동하는 것과 작업 버리기를 혼동하지 않는다.
- setActor는 role/부서/계정 변화가 있으면 진행 중 작업들을 취소한다. 작업을 유지할 수 있는 동일 사용자의 관리자 미리보기 전환이라도 예전 권한으로 실행 중인 결과가 새 화면에 들어오지 못한다.
- host.subscribe에서 현재 사용자/작업들의 live ACL을 검사한다. 권한 회수는 취소와 UI 가림을 유발하지만 원본 새 버전/단순 상태 변경은 기존 결과를 지우지 않는다.
- download는 ownerId/두 자산 current read/resultId/inputRevision 검사 → host.recordWorkActivity(export) → 기존 output bytes의 사본을 반환한다. 이미 다운로드된 로컬 파일의 사용을 회수하지는 않는다.

### I02. 경합·정책·파일 수명 테스트
- Related Files:
  - tests/services/admin/TemplateWorkService.test.ts — 상태 전이·파일 보유; new
  - tests/services/admin/TemplateWorkService.races.test.ts — 지연 응답·권한 경합; new

#### Details
- 정상 old→원본 v2 수정: newer만 true, 기존 filename/bytes/ref/inputRevision 유지, 기존 다운로드 허용.
- old→inactive/delete: getAssets/new work/latest 차단, pinned apply/download 성공. 권한 회수는 그보다 우선하여 pinned/download도 거절.
- Skill/Template 각각 최신, 둘 다 최신, 최신 적용 실패, 결과 생성 중 ACL 감소/그룹 탈퇴/부서 이동/사용자 잠금, 취소 직후 완료, double-click 실행, 메뉴 이동, discard 중 완료, 인증 identity 교체를 검증한다.
- resolveAsset의 assetId/revisionId/revision 조합 변조와 다른 사용자의 workId/resultId 사용을 거절한다.
- 성공 한 번에 apply audit 한 건, 취소/실패에 성공 audit 0건, 결과를 현재 설정으로 잘못 다운로드하는 경로 0건이다.
- 단순 원본 수정 후 쿼리 갱신이 work를 재생성하지 않는지, files의 참조가 마지막 사용자/작업 정리 시 해제되는지 확인한다.

## Acceptance Criteria
- [x] 원본 새 버전이 기존 결과를 자동 교체/차단하지 않는다.
- [x] 삭제/비활성 보존과 권한 회수 차단이 다르게 동작한다.
- [x] 실패한 최신 재적용 뒤 기존 성공 버전·결과를 유지한다.
- [x] 취소·권한/역할 변경 후 늦은 응답은 결과와 로그를 게시하지 않는다.
- [x] work options/registry revision 변경을 서로 다른 상태로 처리한다.

## Validation
- `npm.cmd test -- tests/services/admin/TemplateWorkService.test.ts tests/services/admin/TemplateWorkService.races.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): 고정 버전 적용 작업과 권한 회수 처리 구현

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T05-work-lifecycle

- 관리자 적용 테스트가 원본 변경·삭제와 무관하게 고정 버전을 사용하고, 명시적 재적용과 현재 권한에 따라 결과를 안전하게 교체한다.
- 정책 경계와 기존 관리자 동작 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 790835657f82a27871ff5e1ec80632ca115c69c7 (T01~T10 단일 통합 커밋)


## 실행 검증 기록
- 작업 수명/경합 2개 파일 14개 테스트, typecheck, lint 통과. 취소·폐기·역할/부서·ACL/그룹/잠금 변경 후 늦은 결과·감사 게시 차단, 최신 실패 시 이전 결과 보존 검증.
