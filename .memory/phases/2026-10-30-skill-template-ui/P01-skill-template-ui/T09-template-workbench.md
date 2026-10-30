# Task: T09 실제 적용 테스트·공유 편집·전후 비교·다운로드

## Status: done

## Goal
Template에서 Skill을 골라 실제 적용하고, 기존 작업을 다시 열어 고정 버전/최신 재적용 및 요소별 전후 결과를 검토·다운로드한다.

## Decision Summary
- D01/D06~D11. 작업은 관리자 메뉴 안에 있으며 일반 제작 화면을 구현하지 않는다. 공유 편집은 작업 출력에만 반영하고 등록 Template을 자동 수정하지 않는다.
- 선행 Task 완료 후 순차 실행한다. 모든 Task 검증을 마친 뒤 한 번 커밋한다.

## Implementation

### I01. 작업 진입과 실행 화면
- Related Files:
  - components/admin/templates/TemplatesPage.tsx — 적용 테스트 진입·작업 목록 복귀; modify
  - components/admin/templates/workbench/TemplateWorkbench.tsx :: TemplateWorkbench — 전체 작업 UI; new
  - components/admin/templates/workbench/TemplateWorkList.tsx :: TemplateWorkList — 실행 중인 본인 작업 목록; new
  - components/admin/templates/workbench/TemplateApplyOptions.tsx :: TemplateApplyOptions — 선택/매핑/배치 옵션; new
  - components/admin/templates/workbench/LatestVersionDialog.tsx :: LatestVersionDialog — 명시적 최신 재적용; new
  - hooks/admin/use-template-work.ts — T06 훅; read-only
  - services/admin/TemplateWorkService.ts — T05 상태/권한 유지 및 getSharedDesigns 추가; modify
  - types/template-work.ts :: TemplateWorkDataService — getSharedDesigns 계약 추가; modify
  - lib/pptx/download.ts :: downloadPptxBytes — 브라우저 결과 파일 저장; new

#### Details
```typescript
interface TemplateWorkbenchProps { workId:string; onBack():void }
function TemplateWorkbench(props:TemplateWorkbenchProps): React.ReactElement;
interface TemplateWorkListProps { items:readonly TemplateWorkListItem[]; onOpen(id:string):void;
  onDiscard(id:string):void }
function TemplateWorkList(props:TemplateWorkListProps): React.ReactElement;
interface TemplateApplyOptionsProps { value:TemplateOptions; document:TemplatePreviewData;
  disabled:boolean; onChange(value:TemplateOptions):void }
function TemplateApplyOptions(props:TemplateApplyOptionsProps): React.ReactElement;
interface LatestVersionDialogProps { open:boolean; view:WorkView; pending:boolean;
  onConfirm():void; onClose():void }
function LatestVersionDialog(props:LatestVersionDialogProps): React.ReactElement;
function downloadPptxBytes(bytes:Uint8Array, filename:string): void;
```
- Template row/detail의 capabilities.apply와 Skill read 권한이 있을 때만 '적용 테스트' 진입을 제공한다. active Skill을 검색/페이지 조회하여 하나 선택한다. 첫 페이지 항목만 있는 것으로 오인하지 않게 검색·페이지 이동을 제공한다.
- create-work 성공 id로 workbench를 연다. TemplatesPage에 본인 작업 목록을 두어 메뉴 이동 후 다시 열 수 있다. 삭제된 원본을 getAsset으로 읽어 작업을 복구하지 않는다. getWork의 pinned revision 이름(templateName/skillName)과 refs를 사용한다.
- page 내부 선택으로 제공하며 새 일반 제작 route를 만들지 않는다. 화면 상단은 적용 Template vN, Skill vN, '새 버전 있음', 상태/진행/재적용/다운로드/작업 닫기다.
- useTemplateWork query/works.subscribe로 진행을 표시한다. 최신 current access 및 works.canAccess가 false면 이전 query.data/preview를 렌더링하지 않고 접근 제한 상태를 보여준다.
- 옵션 변경은 update-work-options mutation으로 즉시 메모리에 보관한다. pending 또는 최신 work.version 쿼리가 도착하기 전에는 중복 변경을 잠깐 막아 stale CAS로 입력을 덮어쓰지 않는다. 제어된 폼은 변경한 값의 응답을 받으면 갱신한다. 로컬에 저장되지 않은 옵션이 남았다면 다운로드를 허용하지 않는다.
- '현재 버전 재적용'은 pinned, '최신 버전 재적용'은 latest다. 최신 알림이 없거나 최신 후보가 비활성/삭제/권한 없음이면 latest를 제공하지 않는다. 단순 알림 때문에 기존 다운로드 버튼을 숨기거나 비활성화하지 않는다.
- latest 확인 문구에 기존 출력이 성공 후 교체됨, 실패 시 기존 성공 결과 유지, Template 파일이 달라지면 대상/역할/공유 편집을 초기화함을 명시한다. 현재 작업만 변경하며 다른 작업이 함께 업데이트된다고 표현하지 않는다.
- 옵션 기본은 layout/images=false다. 선택 슬라이드·유형·역할·원본 유지 항목을 편집할 수 있다. 자동 분할이 실제 수행된다고 표시하지 않는다.
- 실행 중 진행은 aria-live=polite, 취소 버튼, 완료/실패 상태를 구분한다. 업로드 손상/권한 회수는 전체 실패, 일부 요소 미지원은 결과 보고서에서 표시한다.
- download는 mutation으로 현재 work/resultId를 서비스에 전달하고 bytes 응답 직후 저장한다. Blob MIME=application/vnd.openxmlformats-officedocument.presentationml.presentation, filename 확장자=.pptx, 제어/경로 문자는 제거한다. URL.createObjectURL은 필요 시에만 만들고 클릭 후 지연 revoke, discard/unmount에서 남은 URL을 정리한다. raw bytes를 화면 state/Query에 장기 보관하지 않는다.
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


### I02. 구조 미리보기·공유 디자인·결과 필터
- Related Files:
  - components/admin/templates/workbench/TemplateSlidePreview.tsx :: TemplateSlidePreview — 구조 렌더; new
  - components/admin/templates/workbench/SharedDesignEditor.tsx :: SharedDesignEditor — 지원 속성 편집; new
  - components/admin/templates/workbench/TemplateResultsPanel.tsx :: TemplateResultsPanel — 변경/유지/제외 필터; new
  - lib/pptx/shared-design.ts, shared-schema.ts — T04 정책/검증; read-only
  - lib/pptx/template-results.ts :: resultRows/filterResults — 미리보기에 필요한 Pick 타입으로 입력 최소화; modify
  - tests/lib/admin/assets/workbench-view.test.ts — 표시 상태 정책; new

#### Details
```typescript
interface TemplateSlidePreviewProps { document:TemplatePreviewData; slideIndex:number;
  selectedObjectId:string|null; onSelect(id:string):void }
function TemplateSlidePreview(props:TemplateSlidePreviewProps): React.ReactElement;
interface SharedDesignEditorProps { items:readonly SharedDesign[]; value:readonly SharedDesignEdit[];
  disabled:boolean; onChange(value:SharedDesignEdit[]):void }
function SharedDesignEditor(props:SharedDesignEditorProps): React.ReactElement;
interface TemplateResultsPanelProps { before:TemplatePreviewData; after:TemplatePreviewData|null;
  changes:readonly ObjectChange[]; warnings:readonly string[] }
function TemplateResultsPanel(props:TemplateResultsPanelProps): React.ReactElement;
```
- 참조 소스는 C:/Users/k2020/Documents/Codex/2026-10-23/new-chat/work/kpc-skill-poc/src/TemplateWorkbench.tsx, TemplateResults.tsx, SharedDesignEditor.tsx다. UI 구조/행동만 재사용하며 PoC Tailwind 전역 스타일/임의 HTML/저장소를 옮기지 않는다.
- 구조 미리보기는 원본 width/height 비율, objects/decorations의 cm를 백분율로 표시한다. 표·텍스트·이미지·그룹의 지원 범위 표시와 선택을 제공하고 'PowerPoint와 동일한 화면 아님' 안내를 둔다.
- before/after는 같은 slideIndex/선택 객체를 공유한다. 선택 슬라이드가 없는 경우 첫 실제 슬라이드로 보정하고 0 기반/보고서1 기반을 명시적으로 변환한다.
- React text로 PPT 문구를 렌더링한다. dangerouslySetInnerHTML, 외부 relation URL 자동 로드, raw SVG/XML 삽입은 금지한다. 이미지 data URL은 파서가 만든 허용 이미지 형식만 사용한다.
- sharedDesigns/sharedTargets의 blockers/access를 그대로 사용한다. 지원하지 않는 text/position/fill 필드는 비활성 또는 미노출하고 구체적인 이유를 보여준다. 공유 그룹은 접어둔 부모/내부 요소를 펼쳐 각 지원 속성을 편집한다.
- 공유 변경에 영향받는 연결 슬라이드 번호 전체를 표시한다. 선택한 슬라이드만 바뀐다는 설명을 하지 않는다. 변경은 TemplateOptions.sharedEdits에 저장하며 AssetCommand를 호출하지 않는다.
- 결과 필터는 현재/전체 슬라이드, all/changed/kept/skipped, 객체 이름/텍스트/사유 검색이다. 전후 수치·사유·공유 그룹 내부 children 결과를 함께 보여준다. 결과 count와 시각적 변화 개수의 차이를 안내한다.
- 좁은 화면은 before/after 세로, 넓은 화면은 나란히 배치한다. 표 스크롤/키보드 선택/포커스 표시를 유지한다.
- 서비스의 getPreview/getChanges는 bytes/ZIP을 반환하지 않는다. sharedDesigns가 TemplateDocument를 요구하면 계산은 작업 서비스 내부에서 하고 getSharedDesigns(actor,workId):SharedDesign[] 조회를 추가한다. UI에서 가짜 bytes/zip을 붙여 타입을 만족시키지 않는다.
```typescript
getSharedDesigns(actor:AdminActor, workId:string): SharedDesign[];
```
- 이 메서드는 getPreview와 같은 owner/live ACL 검사 후 현재 pinned 원본에서 계산한다. types/template-work.ts와 실제 서비스, 해당 단위 테스트를 함께 확장한다.
- 결과 필터도 TemplateDocument를 요구하는 기존 함수를 억지 cast하지 말고 필요한 Pick 필드만 받도록 T04 resultRows 시그니처를 좁혀 기존 엔진 테스트를 유지한다.
- '등록 Template 수정'은 별도 Template 편집 진입일 뿐 현재 공유 편집을 자산에 자동 복사하거나 저장하지 않는다.

## Acceptance Criteria
- [x] 관리자 메뉴 안에서 실제 적용·비교·다운로드 전체 흐름이 동작한다.
- [x] 새 버전 알림과 현재 옵션 미적용 상태를 구분한다.
- [x] 공유 편집의 연결 페이지 범위·지원 제한·부분 실패 사유를 확인할 수 있다.
- [x] 삭제된 원본을 사용하는 기존 작업을 다시 열 수 있고 권한 회수 시 가려진다.
- [x] 일반 제작 화면과 등록 자산을 자동 수정하지 않는다.

## Validation
- `npm.cmd test -- tests/lib/admin/assets/workbench-view.test.ts tests/services/admin/TemplateWorkService.test.ts tests/services/admin/TemplateWorkService.races.test.ts tests/lib/pptx/template-results.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.
- `npm.cmd run build` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): 관리자 PPT 적용 테스트와 전후 비교 연결

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T09-template-workbench

- Template에서 Skill을 골라 실제 적용하고, 기존 작업을 다시 열어 고정 버전/최신 재적용 및 요소별 전후 결과를 검토·다운로드한다.
- 권한·버전·파일 동작 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 790835657f82a27871ff5e1ec80632ca115c69c7 (T01~T10 단일 통합 커밋)


## 실행 검증 기록
- 작업 UI/권한/경합/결과 4개 파일 18개 테스트, typecheck, lint, Next production build 통과. 실제 공유 편집 후 등록 Template 불변·권한 회수 차단·출력 다운로드 URL 수명 확인.
