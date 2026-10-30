# Task: T08 Template 목록·실제 업로드·추출·버전 편집

## Status: done

## Goal
Template 메뉴에서 실제 PPT 파일을 분석한 결과를 검토하고 등록·파일 교체·유형/역할/제외 설정을 새 버전으로 저장할 수 있게 한다.

## Decision Summary
- D05/D08/D17. 전역 브랜드 변경·새 로고 삽입은 후속이다. 실제 추출 결과는 조회 정보이고 편집은 지원 범위 내 설정과 파일 교체로 한정한다.
- 선행 Task 완료 후 순차 구현한다. 중간 커밋은 deferred로 기록하고 T10에서 통합 커밋한다.

## Implementation

### I01. 업로드와 추출 편집
- Related Files:
  - components/admin/templates/TemplatesPage.tsx :: TemplatesPage — 목록/상세/편집; new
  - components/admin/templates/TemplateEditorDialog.tsx :: TemplateEditorDialog — draft/등록/파일 교체; new
  - components/admin/templates/TemplateFileInput.tsx :: TemplateFileInput — 파일 선택/드롭/예시; new
  - components/admin/templates/TemplateExtractionPanel.tsx :: TemplateExtractionPanel — 실제 메타데이터; new
  - components/admin/templates/TemplateMappingFields.tsx :: TemplateMappingFields — 페이지 유형/객체 역할/제외; new
  - config/pptx-demo.ts :: createDemoTemplateFile — 합성 sample 바이트의 지연 생성; new
  - hooks/admin/use-assets.ts :: useTemplateImport/useAssetCommand — T06 훅; read-only
  - services/admin/TemplateFileStore.ts — T02 보관; read-only

#### Details
```typescript
interface TemplateEditorDialogProps { open:boolean; detail:AssetDetail|null; readOnly:boolean; onClose():void }
function TemplateEditorDialog(props:TemplateEditorDialogProps): React.ReactElement;
interface TemplateFileInputProps { disabled:boolean; filename:string|null; progress:string|null;
  error:string|null; onSelect(file:File):void; onCancel():void; onUseExample():void }
function TemplateFileInput(props:TemplateFileInputProps): React.ReactElement;
function TemplateExtractionPanel(props:{value:TemplateExtraction}): React.ReactElement;
interface TemplateMappingFieldsProps {
  document:TemplatePreviewData; value:Pick<TemplateDraft,"pageTypes"|"roles"|"excluded">;
  disabled:boolean; onChange(value:Pick<TemplateDraft,"pageTypes"|"roles"|"excluded">):void;
}
function TemplateMappingFields(props:TemplateMappingFieldsProps): React.ReactElement;
function createDemoTemplateFile(): File;
```
- editor draft={value:TemplateDraft,status,visibility,ownerDepartmentId,baseVersion}; 신규는 fileRefId 없이 시작하는 UI draft 타입을 별도로 두고 저장 직전 TemplateDraft 검증을 통과시킨다. 파일 없음은 null UI 상태이며 도메인의 필수 fileRefId를 빈 문자열로 저장하지 않는다.
- TemplateImport UI 상태는 idle|reading|ready|error와 request sequence/AbortController를 사용한다. 한 번에 1개 .pptx/.potx만 허용하고 멀티 선택/드롭은 설명 후 거절한다. 파일 크기를 먼저 확인하고 File.arrayBuffer는 서비스가 수행한다.
- import가 진행될 때 진행 문자열/취소를 제공한다. 파일 교체·모달 닫기·권한 회수 때 abort한다. 이전 파일의 늦은 응답이 새 선택을 덮어쓰지 못하도록 requestId를 비교하고 무효 완료의 staged 파일을 정리한다.
- actual extraction/fonts/themes/layouts/logoCandidates/slides/warnings를 표시한다. 로고 후보는 확인용이며 자동 선택/삽입하지 않는다. 미리보기 생략 사유와 파일 자체 실패를 구분한다.
- pageTypes는 slide index별 enum, roles는 실제 객체별 ObjectRole, excluded는 객체별 checkbox다. 구조 미리보기용 데이터는 Query 캐시에 ZIP/bytes를 넣지 않도록 자산 서비스에 getTemplatePreview(actor,fileRefId,assetId?) 메서드를 추가한다. 반환은 TemplatePreviewData이며 본인 staged 파일 또는 읽기 가능한 해당 자산의 현재 파일인지 검사한다. 이 메서드를 type 계약/클래스/훅에 같은 Task에서 추가한다.
```typescript
getTemplatePreview(actor:AdminActor, fileRefId:string, assetId?:string): Promise<TemplatePreviewData>;
function useTemplatePreview(fileRefId:string|null, assetId?:string): UseQueryResult<TemplatePreviewData,AdminDataError>;
```
- preview query key에는 actor/role/dept/adminRevision/fileRefId/assetId를 넣고 placeholderData 없이 gcTime=0을 사용한다. 공개 권한이 없어지면 기존 preview도 렌더링하지 않는다.
- 파일 교체는 pageTypes를 추출 타입으로 초기화하고 roles/excluded를 비운다. 이전 파일의 ID가 새 파일에 우연히 같아도 자동 유지하지 않는다. 기존 revision/file은 삭제하지 않는다.
- 저장은 create-template 또는 update-template(target,value,status,visibility) 한 명령이다. UI에서 보내는 것은 fileRefId와 사용자가 선택한 mapping/관리 정보이며 extraction은 서비스가 다시 읽는다.
- name/short/description, 상태와 공개 범위는 공통 컴포넌트를 사용한다. 편집 가능한 전역색상/새로고 컨트롤을 기능 없는 상태로 노출하지 않는다.
- createDemoTemplateFile은 tests/fixtures/pptx/native-template.pptx의 50,079바이트 합성 fixture를 base64 상수로 인코딩한 데이터를 복원해 File로 만든다. module top-level에서 File/atob를 호출하지 않고 버튼 handler에서 config를 dynamic import하여 실행한다. 실제 사용자가 등록한 파일은 절대 소스나 public 경로에 넣지 않는다.
- '예시 파일로 시작'도 useTemplateImport를 그대로 통과한다. 가짜 추출 요약이나 임의 썸네일로 성공을 꾸미지 않는다. 초기 Template 목록은 빈 상태가 정상이며 예시 버튼으로 즉시 검토 가능하다.
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


### I02. 라우팅과 파일 편집 시나리오
- Related Files:
  - components/admin/AdminScreenRouter.tsx — templates 분기/grants.templates.read; modify
  - app/(authenticated)/workspace/[screen]/page.tsx — templates 실화면 연결; modify
  - hooks/admin/use-assets.ts, types/admin-assets.ts, services/admin/MockAdminDataService.ts — 권한 검사된 preview 읽기 추가; modify
  - lib/admin/query-keys.ts :: AdminQueryFilter — {fileRefId:string;assetId:string|null} preview 필터 추가; modify
  - tests/app/workspace/screen.test.ts — templates 서버 가드; modify
  - tests/services/admin/template-upload.test.ts — 파일 참조 주입/분석 경합/교체; new
  - tests/components/admin/template-access.test.ts — 역할별 액션 부재; new

#### Details
- T07 skills 분기를 유지하고 templates를 실제 화면에 추가한다. 일반 7개와 prompt-sets 안내 화면은 변경하지 않는다.
- 등록/편집 모달은 넓은 화면에서 업로드·추출·편집의 3영역, 좁은 화면에서 같은 순서로 세로 배치한다. ModalFrame width와 내부 tw:grid를 사용하고 페이지 밖으로 고정폭이 넘지 않게 한다.
- 실제 파일이 준비되기 전 저장 비활성, 실패 시 파일명/오류 표시, 취소하면 staged file 해제, 재선택 후 정상 등록, 새 파일 수정 후 이전 작업의 fileRef 유지, 타인 staged handle 사용 거절을 검증한다.
- 적용 테스트 버튼과 작업 복귀 UI는 T09에서 기능과 함께 추가한다. 이 Task 시점에 작동하지 않는 링크/버튼을 먼저 노출하지 않는다.
- 클릭 기능·화면 크기·키보드/포커스 실제 검증은 T10에서 수행한다.

## Acceptance Criteria
- [x] 실제 PPTX/POTX 분석 후에만 Template을 저장할 수 있다.
- [x] 파일 교체와 mapping 편집이 새 불변 revision으로 저장된다.
- [x] 공개/소유권과 staged file 소유권을 UI와 서비스에서 검사한다.
- [x] 초기 빈 목록과 실제 예시 파일 경로가 동작한다.
- [x] 전역 브랜드 편집/로고 삽입을 구현 범위에 섞지 않는다.

## Validation
- `npm.cmd test -- tests/app/workspace/screen.test.ts tests/services/admin/template-upload.test.ts tests/components/admin/template-access.test.ts tests/lib/pptx/template-read.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): Template 실제 업로드와 추출 편집 화면 구현

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T08-template-screen

- Template 메뉴에서 실제 PPT 파일을 분석한 결과를 검토하고 등록·파일 교체·유형/역할/제외 설정을 새 버전으로 저장할 수 있게 한다.
- 권한·버전·파일 동작 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: deferred (전체 검증 후 통합 커밋)


## 실행 검증 기록
- Template 업로드/권한/경합/라우팅/분석 4개 파일 41개 테스트, typecheck, lint 통과. 실제 예시 파일 경로·최신 파일 조회·staged 소유권·폐기 후 늦은 응답 정리 확인.
