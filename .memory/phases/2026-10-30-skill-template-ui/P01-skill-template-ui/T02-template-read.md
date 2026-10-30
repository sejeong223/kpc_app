# Task: T02 실제 PPT 분석과 메모리 파일 저장소

## Status: done

## Goal
실제 PPTX/POTX를 검증·분석하여 저장 가능한 추출 정보를 만들고, 업로드 파일을 실행 중 보관하는 분리된 파일 저장소를 제공한다.

## Decision Summary
- 확정 D05/D11~D13. PoC v3.4의 분석기를 재사용하고 Next/React 서버 단계에서 DOM·ZIP을 실행하지 않는다. 이 Task는 서식 변환을 구현하지 않는다.
- Plan: 2026-10-30-skill-template-ui / Phase: P01-skill-template-ui. 선행 Task가 순서대로 완료된 상태에서 실행한다. 모든 Task 검증 후 단일 커밋하며 현재 Task에서는 commit을 deferred로 기록한다.

## Implementation

### I01. ZIP/XML 분석기 이식
- Related Files:
  - package.json, package-lock.json — jszip=3.10.1(dependency), @xmldom/xmldom=0.9.12(devDependency) 추가; modify
  - lib/pptx/zip.ts :: ZipEntry, ZipArchive, ZipLibrary, loadZipLibrary — ZIP 라이브러리 어댑터; new
  - lib/pptx/limits.ts :: TEMPLATE_LIMITS — 파일/미리보기 한도; new
  - lib/pptx/pptx-xml.ts :: validateZip, openPackage, parseXml, xmlPart, relationships — 압축/XML 검증; new
  - lib/pptx/template-read.ts :: readTemplate, textBody, textValue, transform — 원본 분석; new
  - types/pptx-template.ts :: TemplateDocument, TemplateObject, TemplateSlide, TemplateImage — 런타임 타입; new
  - lib/pptx/extraction.ts :: extractTemplateMetadata — 관리 저장용 추출; new
  - tests/fixtures/pptx/native-template.pptx — 합성 4슬라이드 파일; new

#### Details
- 정확한 원본 경로는 C:/Users/k2020/Documents/Codex/2026-10-23/new-chat/work/kpc-skill-poc/ 이다. src/_lib/pptx-xml.ts(sha256 761cd0ae8d13ba3f9dfcd56bb46bea40c4147d2d145d278d2abe86043930d5a0), template-read.ts(fbb9ae6b9c93a979dd954bc6fd1d24dad6d5a7e81169153f3a2cd2dd0161f3f7), src/_types/template.ts, src/_const/template.ts를 위 목적지에 이식한다. src/_lib/export.ts의 ZIP 인터페이스만 분리하고 PptxGenJS 생성 경로/vendor bundle을 가져오지 않는다.
- npm.cmd install --save-exact jszip@3.10.1 / npm.cmd install --save-dev --save-exact @xmldom/xmldom@0.9.12는 실행 단계에서만 사용한다. 이미 설치되었다면 중복 설치하지 않는다. 기존 lock의 libc 삭제 변경을 되돌리거나 커밋에 섞지 않는다.
- Signatures:
```typescript
function loadZipLibrary(): Promise<ZipLibrary>;
function readTemplate(bytes:Uint8Array, filename:string, library:ZipLibrary,
  options?:TemplateReadOptions): Promise<TemplateDocument>;
function extractTemplateMetadata(doc:TemplateDocument, sha256:string): Promise<TemplateExtraction>;
class PptxError extends Error {
  constructor(readonly code:"INVALID_FILE"|"LIMIT"|"UNSUPPORTED"|"CANCELLED", message:string);
}
```
- loadZipLibrary는 import("jszip")를 실제 호출 시 실행하며 모듈 최상위에서 window/document를 참조하지 않는다. 테스트만 xmldom DOMParser/XMLSerializer를 vi.stubGlobal로 주입한다. 브라우저에서는 네이티브 DOM API를 사용한다.
- 외부 라이브러리 어댑터는 반환을 명시적으로 맞춘다. 내부 any/unknown으로 ZIP/DOM 타입을 포기하지 않는다. @xmldom 타입과 DOM 타입 사이 불가피한 외부 경계가 있다면 해당 한 위치에만 설명한다.
- preflight: 확장자 .pptx/.potx, 최대 250*1024*1024바이트, ZIP 중앙 디렉터리·경로·중복·암호화·ZIP64·다중 볼륨·전자서명·VBA를 검사한다. 원본 PoC의 파트 256 MiB/합계 1 GiB/과도 압축률/1만 entry 제한을 유지한다. CRC32 검사는 preflight 후 loadAsync 옵션으로 활성화하여 손상 데이터를 성공으로 만들지 않는다. 압축 해제 실제 크기도 다시 검사하며 한도가 모든 PC에서의 메모리 사용 보장이라고 설명하지 않는다.
- XML은 12,000,000자 한도, DOCTYPE/ENTITY 금지, parsererror 검출, OOXML Transitional namespace/관계 검증을 유지한다. 외부 관계는 네트워크로 따라가지 않으며 원본 관계 파일만 보존한다.
- 1~200장, 장당 1,000개 최상위 요소, 3~200cm 슬라이드 크기 한도를 유지한다. title 후보 추정·상속 좌표·표·회전·그룹 보존 사유와 공유 요소 캐시를 옮긴다.
- 이미지 미리보기 8 MiB/2,400만 화소/누적64 MiB를 초과하면 화면 이미지만 생략한다. 원본 미디어를 삭제하지 않는다. 지원된 이미지 data URL 외의 외부 URL·SVG/HTML을 화면에 주입하지 않는다.
- options.signal을 시작/슬라이드 반복/분석 종료 때 검사하여 취소 결과를 폐기한다. 진행 문자열은 onProgress로 전달한다.
- extractTemplateMetadata는 실제 theme XML의 clrScheme major/minor font, layout/master 경로, placeholder 수, 객체의 font 집합과 공유 image 후보를 추출한다. 로고 후보는 '확정된 로고'가 아니다. 찾지 못한 테마/로고는 빈 배열/null이며 추측한 브랜드값을 저장하지 않는다.
- SHA-256은 crypto.subtle.digest("SHA-256", 원본 bytes)로 계산하고 lowercase hex로 출력한다. filename은 경로 구분자와 제어문자를 제거한 표시명(1~255자)이다.
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


### I02. 원본 파일 저장과 보유 참조
- Related Files:
  - services/admin/TemplateFileStore.ts :: TemplateFileStore — bytes/zip/preview 보관; new
  - tests/lib/pptx/template-read.test.ts, tests/lib/pptx/zip-validation.test.ts, tests/services/admin/TemplateFileStore.test.ts — 실제 파일 및 소유/수명 검증; new

#### Details
```typescript
class TemplateFileStore {
  importFile(ownerId:string, file:File, signal?:AbortSignal, onProgress?:TemplateProgress): Promise<StagedTemplateSource>;
  getSource(fileRefId:string): { ownerId:string; document:TemplateDocument; extraction:TemplateExtraction };
  retain(fileRefId:string, reference:string): void;
  release(fileRefId:string, reference:string): void;
  discardStaged(ownerId:string, fileRefId:string): void;
  dispose(): void;
}
```
- Map entry: id, ownerId, document, extraction, Set<string> references, staged:boolean. ID는 crypto.randomUUID()로 생성한다. id는 저장소가 생성한다.
- 최초 업로드 바이트의 사본을 불변 원본으로 보관한다. getSource는 내부 엔진/서비스 전용이며 공개 UI 액션이나 권한 검사를 대신하지 않는다. 파서 doc/zip을 UI가 수정하지 못하게 인터페이스를 숨긴다.
- retain 키는 revision:<revisionId> 또는 work:<workId>, Set으로 중복 보유를 방지한다. 성공한 자산 revision 저장 때 staged=false로 전환한다. 모든 참조가 사라지고 staged도 아니면 bytes/zip/images 참조를 제거한다.
- 등록 취소는 본인 staged 파일만 버린다. 저장된 파일·다른 사람 staged 파일은 삭제하지 않는다. 분석 실패/취소 시 Map에 entry가 남지 않는다. 재업로드로 교체할 때 이전 staged 참조를 정리한다.
- 합성 fixture 원본 native-template.pptx는 50,079 bytes, sha256 d3b09a2900b346a549fd75b4a4cb398efc0e081b57701855e80879c45378a6c7이다. 복사 후 README에 출처·해시를 남긴다. 고객 PPT나 대용량 결과물을 저장소에 넣지 않는다.
- 기본 경계 테스트는 작은 ZIP의 헤더를 조작해 한도를 검사하고 250 MiB 파일을 매 테스트마다 만들지 않는다. 잘못된 CRC, missing relationships, DTD, external target, 0/201 slides, unsupported content type도 거절한다.

## Acceptance Criteria
- [x] 합성 PPTX/POTX를 실제 분석하여 슬라이드/테마/레이아웃 메타데이터를 만든다.
- [x] 손상·용량·XML·경로 검증과 취소가 실패 결과로 돌아온다.
- [x] 미리보기 생략에도 원본 미디어가 보존된다.
- [x] 모듈 import 및 Next build 시 브라우저 전용 API 실행 오류가 없다.
- [x] 파일 보유/취소/해제가 사용자와 자산 참조에 맞게 동작한다.

## Validation
- `npm.cmd test -- tests/lib/pptx/template-read.test.ts tests/lib/pptx/zip-validation.test.ts tests/services/admin/TemplateFileStore.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): PPT 분석과 메모리 파일 보관 계층 추가

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T02-template-read

- 실제 PPTX/POTX를 검증·분석하여 저장 가능한 추출 정보를 만들고, 업로드 파일을 실행 중 보관하는 분리된 파일 저장소를 제공한다.
- 정책 경계와 기존 관리자 동작 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: deferred (전체 검증 후 통합 커밋)


## 실행 검증 기록
- 실제 PPT/ZIP/파일 수명 테스트 3파일·9개, typecheck, lint, Next build 통과. npm audit 전체 24건(신규 직접 jszip/xmldom 경고 없음)은 별도 보고하며 임의 업그레이드하지 않음.
