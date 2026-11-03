# Task: T05 파일·웹 편집과 회차 액션

## Status: done

## Goal
자료함에서 다중 파일 선택·드롭·일괄 설정·웹 등록·개별 편집·삭제/되돌리기·새 회차·참조 순서 변경을 실제 저장 명령으로 연결한다. 과거 자료나 타인의 자료를 우회 변경할 수 없어야 한다.

## Decision Summary
- 모든 입력은 T01 스키마와 T02 트랜잭션으로 저장한다. 모달 닫기나 과거 자료 편집 준비만으로 데이터/버전을 생성하지 않는다.
- 현재 목록 30개, 50MB, own/PM/super 권한과 이전 회차 읽기 전용을 UI와 서비스에서 함께 적용한다.

## 실행 범위 및 지속 정책

- cwd: C:/Developer/Project/kpc_app. Plan: 2026-11-03-workspace-file-upload, Phase: P01-file-workspace. 확정 범위: 실제 파일/설정의 로컬 저장, 서버·검색·AI·KMS 연결 제외. 공통 인증 세션 갱신은 사용자 추가 선택으로 포함한다.
- 이 파일은 청사진이다. 계획 작성 시 코드 구현 금지. 실행 시에만 명시된 production 경로를 수정한다. 일반 레이아웃은 tw: Tailwind와 공통 토큰, 내부 타입은 strict/Container 기반, 데이터 훅은 TanStack Query를 사용한다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/검증용 dev server 제외. npm run test 및 test:admin-review를 대체 검증으로 호출하지 않는다. 기존 테스트 삭제도 하지 않는다.
- 서버 권한 검사를 이번 로컬 규칙이 대체한다고 보고하지 않는다. Azure/Cosmos 리소스 생성·설정 변경 없음. DB/버킷/환경 변수를 새로 요구하지 않는다.
- Task별 커밋 메시지는 아래 것을 사용하되 실행 요청의 단일 커밋 등 최신 지시가 우선이다. 이번 계획 작성은 commit/push를 수행하지 않는다.

## Implementation

### I01. 다중 파일 입력과 재사용 설정 필드

- Related Files:
  - components/workspace/files/FileUploadDialog.tsx :: FileUploadDialog — 실제 File 대기 목록; new
  - components/workspace/files/FileReferenceFields.tsx :: FileReferenceFields — 종류·참조 우선순위·활용 지침; new
  - components/workspace/files/FileSettingsDialog.tsx :: FileSettingsDialog — 파일 메타데이터 편집; new
  - components/workspace/files/WebReferenceDialog.tsx :: WebReferenceDialog — 링크/기간/지침 생성·편집; new
  - components/workspace/files/file-ui-types.ts :: dialog props/state — UI 타입 컨테이너; new
  - config/workspace-files.ts, lib/workspace/files/validation.ts, schemas.ts — T01; read-only
  - components/ui/DadamControls.tsx, SegmentedControl.tsx, ModalFrame.tsx — read-only

#### Details

### 공통 계약 — 이 Task만으로 해석 가능한 전체 필드

아래는 production 코드가 아니라 구현할 계약의 청사진이다. 모든 시간은 UTC ISO 문자열, 모든 ID는 공백 없는 비어 있지 않은 문자열이다. 타입의 컨테이너를 먼저 정의하고 파생 타입은 Pick/Omit/extends를 사용한다. 별도 표시 없는 필드는 필수이며 null/undefined를 임의 혼용하지 않는다.

~~~typescript
type FileCategory = "proposal" | "related" | "web";
type ReferenceKind = "rfp" | "business" | "customer" | "case-study" | "technical" | "company" | "web" | "other";
type ReferencePriority = "required" | "preferred" | "normal" | "excluded";
type WebPeriod = "all" | "1y" | "3m";
type FileRole = "super_admin" | "department_admin" | "user";
type AllowedFileExtension = ".pdf" | ".hwp" | ".hwpx" | ".doc" | ".docx" | ".ppt" | ".pptx" | ".xls" | ".xlsx" | ".txt";
interface FileActor { id: string; name: string; role: FileRole; isMock: boolean }
interface FileIdentity { namespace: string; actor: FileActor }
interface WorkspaceProject {
  id: string; number: string; name: string; departmentId: string | null;
  pmId: string; pmName: string; memberIds: string[];
}
interface FileSettings { kind: ReferenceKind; priority: ReferencePriority; instruction: string }
interface FileOriginal {
  type: "file"; blobId: string; filename: string; extension: AllowedFileExtension;
  mediaType: string; byteLength: number; lastModified: number;
}
interface WebOriginal { type: "web"; url: string; period: WebPeriod }
interface FileAsset { id: string; ownerId: string; ownerName: string; createdAt: string; sourceKind: "file" | "web" }
interface FileVersion extends FileSettings {
  id: string; assetId: string; category: FileCategory; createdInRound: number;
  createdAt: string; createdBy: string; label: string; source: FileOriginal | WebOriginal;
}
interface FileRoundEntry { assetId: string; versionId: string }
interface FileRound {
  number: number; createdAt: string; createdBy: string; sealedAt: string | null;
  categoryOrder: FileCategory[]; entries: FileRoundEntry[];
}
interface FileRemoval {
  id: string; round: number; entry: FileRoundEntry; index: number;
  removedBy: string; expiresAt: string;
}
interface FileProjectState {
  schemaVersion: 1; projectId: string; revision: number; currentRound: number;
  rounds: FileRound[]; assets: FileAsset[]; versions: FileVersion[]; removals: FileRemoval[];
}
interface FileResourceView {
  asset: FileAsset; version: FileVersion; canManage: boolean;
  currentVersionId: string | null; isInherited: boolean;
}
interface FileRoundView extends Omit<FileRound, "entries"> { readOnly: boolean; resources: FileResourceView[] }
interface FileWorkspaceView {
  project: WorkspaceProject; revision: number; currentRound: number; rounds: FileRoundView[];
  currentCount: number; canAdd: boolean; canStartRound: boolean; canReorder: boolean;
}
interface FileUploadDraft extends FileSettings { file: File }
type FileOperation =
  | { type: "add-files"; category: Exclude<FileCategory, "web">; files: FileUploadDraft[] }
  | { type: "add-web"; url: string; period: WebPeriod; instruction: string }
  | { type: "edit"; assetId: string; sourceVersionId: string; settings: FileSettings; web: WebOriginal | null }
  | { type: "remove"; assetId: string; sourceVersionId: string }
  | { type: "undo-remove"; removalId: string }
  | { type: "start-round" }
  | { type: "reorder"; categoryOrder: FileCategory[] };
interface FileMutation {
  projectId: string; expectedRevision: number; expectedRound: number; operation: FileOperation;
}
interface PreparedUpload extends FileSettings { original: FileOriginal }
type PreparedFileOperation =
  | Exclude<FileOperation, { type: "add-files" }>
  | { type: "add-files"; category: Exclude<FileCategory, "web">; files: PreparedUpload[] };
interface PreparedFileMutation extends Omit<FileMutation, "operation"> { operation: PreparedFileOperation }
interface FileCommandContext { identity: FileIdentity; project: WorkspaceProject; now: string; newId(): string }
interface FileReceipt { state: FileProjectState; createdAssetIds: string[]; removalId: string | null }
interface FileOriginalRequest { projectId: string; round: number; versionId: string }
interface StoredFileProject { namespace: string; projectId: string; state: FileProjectState }
interface StoredFileBlob {
  namespace: string; projectId: string; id: string; blob: Blob;
  filename: string; mediaType: string; byteLength: number; createdAt: string;
}
interface StoredFilePreference { namespace: string; key: "selected-project"; projectId: string }
interface FileRepository {
  load(projectId: string): Promise<FileProjectState>;
  execute(input: FileMutation): Promise<FileReceipt>;
  readOriginal(input: FileOriginalRequest): Promise<File>;
  readSelection(): Promise<string | null>;
  saveSelection(projectId: string): Promise<void>;
  close(): void;
}
interface FileProjectCatalog {
  list(): readonly WorkspaceProject[];
  get(projectId: string): WorkspaceProject | null;
}
type FileErrorCode = "UNIDENTIFIED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "LIMIT"
  | "READ_ONLY" | "CONFLICT" | "DB_UNAVAILABLE" | "DB_BLOCKED" | "STORAGE"
  | "QUOTA" | "ORIGINAL_MISSING" | "CANCELLED" | "UNDO_EXPIRED";
declare class WorkspaceFileError extends Error {
  readonly code: FileErrorCode;
  constructor(code: FileErrorCode, message: string, options?: ErrorOptions);
}
~~~

- 초기값: schemaVersion=1, revision=1, currentRound=1. rounds는 1건이며 sealedAt=null, categoryOrder=["proposal","related","web"], entries/assets/versions/removals는 빈 배열이다. 원본 없는 가짜 파일을 넣지 않으며 프로젝트와 참여자는 mock 카탈로그에서 공급한다.
- DB 이름 kpc-workspace-files, 버전 1. project key=[namespace,projectId], blob key=[namespace,projectId,id], preferences key=[namespace,key]. 메타데이터만 Query에 보관하고 Blob/File는 일반 목록 캐시에 넣지 않는다.
- 상수: MAX_FILE_BYTES=50*1024*1024, MAX_CURRENT_MATERIALS=30, UNDO_TTL_MS=15000, TXT_PREVIEW_BYTES=256*1024. ID 최대 256자, namespace 최대 512자, 파일명 최대 255자, URL 최대 2048자, instruction 최대 4000자. 크기 1..MAX_FILE_BYTES 정수, lastModified>=0 정수, 회차/revision>=1 정수.
- 종류 한글 레이블 순서: RFP (공고문), 사업 관련 문서, 고객 제공자료, 수행 사례, 기술자료, 회사 소개·실적, 웹 검색 자료, 기타. 우선순위 레이블: 필수 참조·우선 참조·일반 참조·참조 제외.
- 웹은 category=web/source.type=web/kind=web/priority=normal; 초기 period=1y/instruction="". 일반 파일은 source.type=file, category=proposal 또는 related, 초기 priority=normal/instruction="", 종류는 파일명 추정 후 수정 가능. 종류 변경으로 category를 자동 이동하지 않는다.
- entries는 각 회차별 중복 없는 assetId 목록이며 versionId는 동일 asset의 versions를 참조한다. currentRound만 sealedAt=null, 이전 회차는 sealedAt 필수. 버전·원본은 불변이고 현재 설정 편집도 새 버전+현재 entry 교체로 처리한다.
- 권한: 접근은 참여자 또는 PM 또는 super_admin; 개별 변경은 접근 후 ownerId=actor.id 또는 PM/super_admin. 공통 순서/새 회차는 PM/super_admin. department_admin도 이 프로젝트 규칙을 따름. 과거 목록은 항상 읽기 전용.
- mutation은 projectId가 catalog 및 state와 일치하고 expectedRevision/currentRound가 저장값과 같은지 확인한다. 불일치=CONFLICT, 자동 재시도/덮어쓰기 금지. 주체·등록일·원본 참조를 UI 입력에서 신뢰하지 않는다.
- 편집: 현재 entry가 있으면 sourceVersionId와 같아야 한다. 현재 entry가 없으면 과거 회차에서 실제 사용한 해당 asset의 가장 최신 버전만 가져올 수 있다. 현재 목록 30개 검사를 거친다. sourceKind와 owner는 바꾸지 않는다. 타인 과거 자료를 복사해 소유권을 얻는 경로도 금지한다.
- 새 회차는 이전 현재 회차를 봉인하고 entries/categoryOrder를 새 배열로 계승한다. 자료 버전과 Blob은 복제하지 않는다. removed entry는 다시 나타나지 않는다.
- 현재 remove는 entry만 제거하고 15초 제거 기록을 만든다. undo는 저장 기록으로만 복원하며 권한·현재 회차·유효기간·자리/중복·30개 한도를 재검사한다. 이전 회차의 entry를 삭제하지 않는다.
- 각 성공 변경은 revision을 정확히 1 증가시킨다. 작업 시작 시 만료/이전 회차 removal을 정리하고, 모든 회차 entries와 유효 removal이 참조하지 않는 versions/assets만 정리한다. Blob도 이 보존 집합을 기준으로만 정리한다. 새 회차 생성 중에는 새 currentRound를 기준으로 removal을 정리한다.
- 파일과 웹 링크, 참조 제외 항목 모두 currentRound.entries.length로 30개 한도를 계산한다. archive/version 수는 한도에 중복 가산하지 않는다.
- HTTP 서버 없음: 위 오류는 코드·한국어 메시지가 있는 로컬 Error이며 HTTP 상태 코드를 만들지 않는다. 서버 연동은 후속이다.

- **Signatures & Types**:
~~~typescript
interface FileDialogBaseProps {
  open: boolean; busy: boolean; error: WorkspaceFileError | null; onClose(): void;
}
interface FileReferenceFieldsProps {
  value: FileSettings; idPrefix: string; disabled?: boolean;
  onChange(value: FileSettings): void;
}
interface FileUploadDialogProps extends FileDialogBaseProps {
  category: Exclude<FileCategory, "web">; availableSlots: number;
  onSubmit(files: FileUploadDraft[]): Promise<void>;
}
interface FileUploadRow extends FileUploadDraft { key: string; expanded: boolean; validationError: string | null }
interface FileSettingsDialogProps extends FileDialogBaseProps {
  resource: FileResourceView; copyToCurrent: boolean;
  onSubmit(settings: FileSettings): Promise<void>;
}
interface WebReferenceDraft extends Pick<WebOriginal, "url" | "period"> { instruction: string }
interface WebReferenceDialogProps extends FileDialogBaseProps {
  initial: WebReferenceDraft | null; copyToCurrent: boolean;
  onSubmit(value: WebReferenceDraft): Promise<void>;
}
type FileDialogState =
  | { type: "upload"; category: Exclude<FileCategory, "web">; projectId: string; baseRevision: number; baseRound: number }
  | { type: "web-new"; projectId: string; baseRevision: number; baseRound: number }
  | { type: "edit"; projectId: string; baseRevision: number; baseRound: number; source: FileResourceView }
  | null;
declare function FileReferenceFields(props: FileReferenceFieldsProps): React.ReactElement;
declare function FileUploadDialog(props: FileUploadDialogProps): React.ReactElement;
declare function FileSettingsDialog(props: FileSettingsDialogProps): React.ReactElement;
declare function WebReferenceDialog(props: WebReferenceDialogProps): React.ReactElement;
~~~
- **Data & Schema Fields**:
  - FileUploadRow.file은 원본 File 객체로 메모리에만 대기한다. input.value를 저장값으로 취급하지 않는다.
  - 종류 8개, 우선순위 4개 및 다섯 지침 제안은 공통 상수를 사용한다. 업로드 category는 추가를 누른 proposal/related로 고정한다.
  - 신규 web 기본값 url="", period="1y", instruction=""; 웹 편집은 정확히 링크·기간·지침만 표시한다. 검색어/검색 결과/KMS 탭은 넣지 않는다.
  - FileSettingsDialog은 source.type=file만 허용한다. 원본 파일 교체·이름 변경·내용 변환 기능은 추가하지 않는다. 웹 편집은 WebReferenceDialog을 재사용한다.

- **Execution Flow / Logic**:
  1. 다중 native input의 accept를 공통 확장자 목록으로 설정한다. 파일 선택과 drop 모두 같은 addPendingFiles 경로를 호출해 validateUploadFile 및 현재 availableSlots를 검사한다. 파일/분류 순서 드래그를 DataTransfer.types로 구별한다.
  2. 실패한 파일도 대기 목록에서 이름과 이유를 보여주고 사용자가 제거하게 한다. 용량 초과·확장자 오류·빈 파일·합계 슬롯 초과가 있으면 전체 저장 버튼 비활성. 정상 파일 일부를 조용히 자동 저장하지 않는다.
  3. 대기 row는 filename/크기/제거/종류/우선순위/접는 지침 입력을 제공한다. 여러 파일이면 bulk 종류 선택과 4개 우선순위 버튼을 제공하고 적용 후 개별 수정도 허용한다.
  4. 지침 제안은 현재 textarea에 줄바꿈으로 추가한다. 4000자 제한 초과를 표시하며 임의 잘라 저장하지 않는다. 각 입력에 레이블·오류 연결·키보드 포커스를 제공한다.
  5. 저장은 onSubmit의 완료를 기다린다. 대기 목록과 입력을 성공 전 지우지 않는다. 실패한 File은 재시도용으로 유지한다. busy 동안 중복 저장·닫기·새 파일 추가를 막는다.
  6. 업로드 File을 JSON.stringify하여 저장하거나 다수 파일 전체를 arrayBuffer/base64로 만드는 동작을 넣지 않는다. 취소 시 메모리 참조를 해제하며 DB에는 등록 전 원본을 만들지 않는다.

### I02. 자료 생성·편집·삭제·되돌리기 연결

- Related Files:
  - components/workspace/files/FilesWorkspace.tsx :: dialog와 command 상태 — modify
  - components/workspace/files/FileResourceCard.tsx :: 권한별 액션 — modify
  - components/workspace/files/FileUndoNotice.tsx :: FileUndoNotice — 15초 되돌리기; new
  - hooks/workspace/use-workspace-files.ts :: useFileCommand — T04 연결 보완; modify
  - services/workspace/WorkspaceFileService.ts :: execute — read-only

#### Details
- **Signatures & Types**:
~~~typescript
interface FileUndoNoticeProps {
  removal: FileRemoval; busy: boolean; onUndo(removalId: string): void; onExpire(): void;
}
declare function FileUndoNotice(props: FileUndoNoticeProps): React.ReactElement;
~~~
- **Execution Flow / Logic**:
  1. 편집창을 열 때 projectId/baseRevision/baseRound/sourceVersionId를 캡처한다. background refetch로 dirty form을 새 props 값으로 덮어쓰거나 baseRevision을 자동 갱신하지 않는다.
  2. 파일 추가는 add-files, 링크 추가는 add-web, 파일 설정은 edit(settings, web:null), 웹 설정은 edit(settings kind=web/priority=normal/instruction, web={type:"web",url,period}) 명령을 호출한다.
  3. 현재 row가 inherited이면 액션명을 "현재 회차로 복사하여 수정"으로 표시한다. 과거 row에서 이미 더 최신 currentVersionId가 있으면 그 현재 버전을 찾아 편집한다. 과거 버전으로 최신 자료를 되돌리지 않는다. 현재 entry가 없으면 과거 가장 최신 사용 버전만 현재 회차로 가져온다.
  4. canManage=false이면 편집·삭제·복사 버튼 자체를 렌더링하지 않는다. readOnly 과거 회차에는 직접 삭제/편집 버튼을 두지 않고 권한 있는 사용자에게 현재 회차 편집 경로만 제공한다. 현재 목록에서도 ownerId를 UI 값으로 바꿀 수 없다.
  5. 삭제 확인은 현재 회차에서 제외되며 이전 보관본은 유지된다는 결과를 설명한다. remove 성공 시 receipt.state.removals에서 removalId와 expiresAt을 받아 FileUndoNotice를 표시한다. 프론트엔드가 직접 원래 entry를 재삽입하지 않는다.
  6. undo는 현재 query의 revision/round와 removalId를 보내며 service가 권한/유효기간/중복/한도를 검사한다. notice는 현재 프로젝트·회차에만 표시한다. 회차 이동·사용자 전환·만료 시 정리하고 타이머를 해제한다. 같은 프로젝트의 후속 remove는 최신 notice로 교체 가능하지만 저장 기록은 만료까지 보호된다.
  7. 성공 후 해당 프로젝트 refetch 완료 → 모달/임시 File 정리 → mutation.reset 순으로 수행한다. 오류 시 폼 유지 및 오류 표시. CONFLICT에서는 "최신 자료 다시 불러오기" 액션을 제공하고 입력 폐기 확인 뒤 새 baseRevision/source로 초기화한다. 같은 명령을 자동 재제출하지 않는다.
  8. 계정·역할이 바뀌면 기존 런타임이 폐기되어 폼/원본 읽기/undo가 남지 않는다. 접근을 잃은 뒤 dirty 안내로 로그아웃을 붙잡지 않는다.

### I03. 회차 생성과 공통 분류 순서 변경

- Related Files:
  - components/workspace/files/FilesWorkspace.tsx :: 다음 회차 확인 모달 — modify
  - components/workspace/files/FileRoundSection.tsx :: 순서 변경 — modify
  - components/workspace/files/FileCategoryPanel.tsx :: 분류 순서 조작 UI — modify
  - components/workspace/files/file-ui-types.ts :: 분류 이동 props — modify

#### Details
- **Signatures & Types**:
~~~typescript
interface FileCategoryOrderControlsProps {
  category: FileCategory; index: number; disabled: boolean;
  onMove(category: FileCategory, direction: -1 | 1): void;
}
~~~
- **Data & Schema Fields**: 순서는 완전한 FileCategory[3] 배열이며 현재 회차에만 적용한다. UI의 drag state는 "proposal"|"related"|"web"|null이며 File drag와 혼용하지 않는다.
- **Execution Flow / Logic**:
  1. canStartRound일 때만 상단 "다음 회차 시작"을 표시한다. 확인 모달에 새 회차 번호·이전 회차 읽기 전용·기존 자료 계승을 알리고 latest query의 expectedRevision/expectedRound로 start-round를 실행한다.
  2. 성공하면 새 현재 회차를 펼치고 이전 회차를 접는다. 실패하면 화면/회차 표시를 변경하지 않는다. 두 번 클릭·다른 탭의 중복 회차 생성은 busy/revision 검사로 차단한다.
  3. current round && canReorder && callback이 존재할 때만 drag handle과 키보드 앞/뒤 이동 수단을 렌더링한다. 첫/마지막 경계 버튼은 disabled, 이동 방향의 의미를 레이블로 제공한다.
  4. HTML DnD data type="application/x-kpc-file-category"를 사용하고 허용 enum만 받는다. dragover는 drop 허용 표시만 수행하고 drop 후 complete permutation을 reorder로 저장한다.
  5. drop 전에 UI 원본 배열을 직접 mutate하지 않는다. 성공 전 순서를 확정 표시하지 않고 실패 시 기존 순서 유지. 선택 프로젝트나 이전 회차의 순서는 변경하지 않는다.
  6. 창이 좁을 때도 참조 우선순위는 배열 순서 그대로이며 CSS 그리드 배치만 바뀐다.

### I04. 미등록 입력 보호

- Related Files:
  - hooks/workspace/use-file-draft-guard.ts :: useFileDraftGuard — 파일 화면 전용 guard; new
  - components/workspace/files/FileDiscardDialog.tsx :: FileDiscardDialog — 공통 ModalFrame 확인; new
  - components/workspace/files/FilesWorkspace.tsx 및 편집 Dialog — modify
  - components/admin/skills/SkillEditorPage.tsx :: 기존 beforeunload/앱 링크 패턴 — read-only

#### Details
- **Signatures & Types**:
~~~typescript
interface FileDraftGuardOptions { dirty: boolean; busy: boolean; onDiscard(): void }
interface FileDraftGuard {
  confirmOpen: boolean;
  request(action: () => void): void;
  keepEditing(): void;
  discardAndContinue(): void;
}
declare function useFileDraftGuard(options: FileDraftGuardOptions): FileDraftGuard;
interface FileDiscardDialogProps {
  open: boolean; onKeep(): void; onDiscard(): void;
}
~~~
- **Execution Flow / Logic**:
  1. 실제 입력 변경/대기 파일이 있을 때 dirty. 모달 X/Escape/바깥 닫기·취소·프로젝트 선택은 guard.request로 전달한다. busy이면 종료를 진행하지 않는다.
  2. dirty 상태에서는 native beforeunload 안내를 연결하고 onDiscard에서 대기 File·초안을 정리한다. 내부 일반 링크 클릭은 기존 SkillEditor 패턴처럼 capture에서 preventDefault하고 확인 후 useRouter로 이동한다. modifier/new-tab/download/동일 페이지 hash 이동은 가로채지 않는다.
  3. 링크의 모바일 sidebar 닫기 이벤트까지 stopPropagation으로 막지 않는다. 확인 모달 열기는 다음 frame으로 처리해 같은 클릭이 바깥 클릭으로 닫지 않게 한다.
  4. 폼 저장 성공은 guard를 해제하고 정상 닫기. 오류는 dirty 유지. identity 변경/권한 상실은 저장을 막고 민감한 이전 사용자 입력을 정리한다.
  5. 전역 History API patch나 Next App Router 비공개 라우터 차단기를 만들지 않는다. 앱 내 버튼/링크·프로젝트 선택과 document unload 경로를 보호하며, SPA의 브라우저 뒤로/앞으로 전체 차단을 검증했다고 주장하지 않는다. 필요한 경우 후속 전역 navigation 정책으로 보고한다.
- 모달 레이블/포커스 복귀는 ModalFrame을 재사용한다. 구현하지 않은 서버 저장이나 AI 활용 상태 문구를 추가하지 않는다.

## Acceptance Criteria
- [x] 선택/드롭/일괄/개별 설정/웹 등록이 같은 검증 및 원자적 저장 경로를 사용한다.
- [x] 현재 30개에서 inherited 설정 수정은 가능하고 새 자료/복원으로 31개가 되면 차단된다.
- [x] 과거 회차 원본·설정·순서는 유지되고 새 회차/순서는 PM·슈퍼만 변경한다.
- [x] 삭제·undo는 현재 목록만 변경하며 과거 이력 또는 타인 자료를 우회 수정하지 않는다.
- [x] 실패·충돌 시 폼 유지, 성공 시 임시 File/reset, 중복 저장/분류 DnD 혼동 방지.
- [x] 입력 보호 범위를 정확히 기록하며 전체 브라우저 navigation 차단을 허위 보장하지 않는다.

## Validation
- npm run typecheck — dialog union과 commands/hook props 일치.
- npm run lint — effect cleanup, drag 이벤트, 미사용 상태/any 오류 없음.
- git diff --check — 형식 오류 없음.
- 정적 사용자 흐름표 검토: 본인/타인/PM/슈퍼, web/file, current/inherited/archive, 29→30/31, 복사→취소, 삭제→undo/만료/회차 전환, 두 탭의 stale edit. 기획의 8종/4종/5개 지침·3개 기간 입력 누락 확인.
- 이 Task에서는 새 브라우저 자동화·테스트 파일을 만들지 않는다. 최종 build는 T06의 미리보기 연결 후 수행한다.

## Commit Message
~~~text
feat(files): 자료 편집과 회차별 관리 액션 구현

Plan: 2026-11-03-workspace-file-upload
Phase: P01-file-workspace
Task: T05-material-editing

- 다중 업로드와 웹 링크 및 일괄 참조 설정 연결
- 소유권과 회차 보존을 적용한 편집 삭제 복원 및 순서 관리
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 모든 Task 완료 후 일괄 커밋 (사용자 지시 2026-11-03).

## 실행 결과 — 2026-11-03
- typecheck/lint/공백 검사 통과. 업로드 대기 파일 오류·슬롯 제한, 8종/4종/5개 지침/3개 기간, 소유권·과거 최신 버전 편집·취소, revision 고정·충돌 유지, 삭제/undo/회차 전환, 파일/분류 DnD 구분을 정적 확인. 앱 링크·프로젝트 변경·unload 보호만 구현했으며 브라우저 뒤로/앞으로 전체 차단 및 실제 UI 검증은 제외.
