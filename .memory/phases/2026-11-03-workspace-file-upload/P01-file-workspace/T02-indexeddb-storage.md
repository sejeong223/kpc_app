# Task: T02 원본 파일·설정의 원자적 로컬 저장

## Status: done

## Goal
실제 파일과 자료 설정을 사용자·프로젝트별 IndexedDB에 함께 저장하고, 다시 열었을 때 같은 회차와 원본을 읽을 수 있는 저장소·서비스를 완성한다. 저장 실패나 두 탭의 충돌이 일부 성공으로 남지 않아야 한다.

## Decision Summary
- projects aggregate와 blobs 저장을 하나의 readwrite 트랜잭션으로 수행한다. 저장소 경계를 분리해 나중에 서버 구현으로 교체한다.
- 원본 중복 복제 없이 회차가 버전을 참조하며, 로그아웃·프로젝트 변조·권한 변경·저장 용량 실패 시 권한 없는 데이터나 거짓 성공을 반환하지 않는다.

## 실행 범위 및 지속 정책

- cwd: C:/Developer/Project/kpc_app. Plan: 2026-11-03-workspace-file-upload, Phase: P01-file-workspace. 확정 범위: 실제 파일/설정의 로컬 저장, 서버·검색·AI·KMS 연결 제외. 공통 인증 세션 갱신은 사용자 추가 선택으로 포함한다.
- 이 파일은 청사진이다. 계획 작성 시 코드 구현 금지. 실행 시에만 명시된 production 경로를 수정한다. 일반 레이아웃은 tw: Tailwind와 공통 토큰, 내부 타입은 strict/Container 기반, 데이터 훅은 TanStack Query를 사용한다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/검증용 dev server 제외. npm run test 및 test:admin-review를 대체 검증으로 호출하지 않는다. 기존 테스트 삭제도 하지 않는다.
- 서버 권한 검사를 이번 로컬 규칙이 대체한다고 보고하지 않는다. Azure/Cosmos 리소스 생성·설정 변경 없음. DB/버킷/환경 변수를 새로 요구하지 않는다.
- Task별 커밋 메시지는 아래 것을 사용하되 실행 요청의 단일 커밋 등 최신 지시가 우선이다. 이번 계획 작성은 commit/push를 수행하지 않는다.

## Implementation

### I01. IndexedDB 저장소

- Related Files:
  - services/workspace/IndexedDbFileRepository.ts :: IndexedDbFileRepository — DB 연결·트랜잭션·원본; new
  - types/workspace-files.ts :: FileRepository, FileMutation, StoredFile* — T01 계약; read-only (누락된 export 보완만 허용)
  - lib/workspace/files/domain.ts :: createEmptyFileProject, applyFileMutation, collectRetainedBlobIds — T01 순수 전이; read-only
  - lib/workspace/files/schemas.ts, permissions.ts, validation.ts, errors.ts — T01 검증; read-only
  - lib/comments/repository.ts :: IndexedDbCommentRepository — 연결 수명/실패 패턴 참고; read-only
  - services/admin/TemplateFileStore.ts :: TemplateFileStore — 메모리 저장소의 범위를 혼동하지 않음; read-only

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
interface IndexedDbFileRepositoryOptions {
  identity: FileIdentity; catalog: FileProjectCatalog;
  factory?: IDBFactory; dbName?: string; now?: () => string; newId?: () => string;
}
declare class IndexedDbFileRepository implements FileRepository {
  constructor(options: IndexedDbFileRepositoryOptions);
  load(projectId: string): Promise<FileProjectState>;
  execute(input: FileMutation): Promise<FileReceipt>;
  readOriginal(input: FileOriginalRequest): Promise<File>;
  readSelection(): Promise<string | null>;
  saveSelection(projectId: string): Promise<void>;
  close(): void;
}
~~~
- **Data & Schema Fields**:
  - DB=kpc-workspace-files, version=1. projects keyPath=["namespace","projectId"], index byNamespace(namespace).
  - blobs keyPath=["namespace","projectId","id"], index byProject(["namespace","projectId"]).
  - preferences keyPath=["namespace","key"]. 선택값 저장 실패도 한국어 오류로 반환한다.
  - 모듈 import 시 window/indexedDB/IDBKeyRange/File/Blob을 평가하지 않고 브라우저의 실제 호출 시점에만 접근한다.
- 한국어 구현 기준: preferences는 마지막 선택 프로젝트만 저장하며, 브라우저 전역은 메서드 호출 시 지연 접근한다. IDBFactory를 주입할 수 있게 하되 새로운 검증용 패키지를 설치하지 않는다.
- DB 반환은 외부 타입 경계다. Zod로 key와 wrapper/state를 검증한 뒤 도메인 타입으로 사용한다. request.result의 any를 업무 타입으로 무검증 전파하거나 범용 any 레코드를 만들지 않는다. Blob은 이 경계에서 실제 Blob 여부·size·타입과 wrapper 필드의 일치를 검사한다.

- **Execution Flow / Logic**:
  1. Precondition: disposed/generation, identity, catalog 프로젝트 존재와 접근권한을 검사한다. IDB 연결은 캐시하고 동시 open은 같은 Promise를 쓴다.
  2. open: upgrade에서 3개 store/index 생성. blocked→DB_BLOCKED, 미지원→DB_UNAVAILABLE, 열기 오류→STORAGE. 실패 후 늦게 성공한 연결은 즉시 닫는다. versionchange에서 연결·pending transaction을 닫고 후속 재로드 가능한 오류를 제공한다.
  3. load: projects readwrite로 scoped key 읽기. 저장값 undefined이고 검증된 프로젝트에 처음 접근한 경우만 빈 1차 생성. 손상된 값/DB read 오류를 빈 초기 상태로 대체하지 않는다. 실제 commit 완료에만 반환한다.
  4. execute 준비: input을 검증하고 add-files를 모두 검증한다. 각 File의 blobId, canonical extension/mediaType, size/lastModified, file.slice 기반 Blob을 준비하고 PreparedFileMutation으로 바꾼다. MIME 기준: PDF application/pdf, TXT text/plain, 기타는 file.type 또는 application/octet-stream; 신뢰 근거로 사용하지 않는다. File 내용을 전체 arrayBuffer/JSON/base64로 복제하지 않는다.
  5. projects+blobs readwrite 트랜잭션 시작. scoped project get과 blobs.byProject.getAllKeys를 요청한다. 대기 결과가 모두 도착한 IDB callback 안에서 현재 state의 권한/revision/회차를 재검사하고 applyFileMutation을 호출한다.
  6. 새 Blob put, 새 state put, 보존 집합 밖의 Blob key delete를 같은 트랜잭션에 등록한다. DB 요청 callback 안에서 파일 읽기·fetch·crypto.digest 등의 await를 하지 않는다. IDB 트랜잭션이 자동 종료된 뒤 put하는 버그를 피한다.
  7. oncomplete에서만 FileReceipt 반환. 어느 put/delete가 실패해도 abort하여 metadata와 Blob을 함께 롤백한다. quota 실패=QUOTA, DOM 저장 오류=STORAGE, 이전 회차/권한/충돌은 도메인 오류 코드 유지. request 성공만으로 저장 완료를 알리지 않는다.
  8. 성공 후에는 참조하는 모든 round entry와 유효 removal의 버전을 보존한다. 만료된 removal로만 남은 파일은 다음 성공 변경에서 정리한다. 조회에 단지 접근했다는 이유로 회차의 revision을 바꾸지 않는다.
  9. close: generation 증가, pending open 무효화, 진행 중 트랜잭션 abort, connection close. 늦게 도착한 resolve를 CANCELLED로 처리한다. close 후 메서드는 새 DB를 조용히 열지 않는다.

### I02. 접근을 검사하는 원본 읽기와 선택값 저장

- Related Files:
  - services/workspace/IndexedDbFileRepository.ts :: readOriginal/readSelection/saveSelection — modify (I01에서 생성한 파일)
  - lib/workspace/files/permissions.ts :: canAccessFileProject — read-only

#### Details
- **Signatures & Types**: 공통 계약의 FileOriginalRequest와 StoredFilePreference를 그대로 사용한다.
- **Execution Flow / Logic**:
  1. readOriginal은 namespace/프로젝트 접근 검사 후 해당 round.entries에 versionId가 실제 존재하는지 확인한다. version.assetId, source.type=file, wrapper.projectId 일치를 검사한다.
  2. scoped blob key로 읽고 바이트 크기/파일명/metadata와의 일치를 확인한다. 존재하지 않으면 ORIGINAL_MISSING, web/임의 Blob ID는 VALIDATION 또는 NOT_FOUND. 호출자가 전달한 blobId로 원본을 바로 읽는 API는 만들지 않는다.
  3. Blob을 원본 filename/type/lastModified의 File로 반환한다. 이전 회차 자료도 조회 권한이면 다운로드 가능하다. 현재 목록에서 삭제되고 어느 회차에도 보이지 않는 자료는 removal ID로 우회 다운로드하지 못한다.
  4. readSelection은 현재 namespace의 값만 읽는다. 저장된 선택이 catalog에서 없어졌거나 접근 불가하면 null을 반환하되 타 프로젝트 자료를 대신 반환하지 않는다. 잘못된 wrapper는 STORAGE.
  5. saveSelection은 접근 가능한 실제 프로젝트만 저장한다. 실패하면 기존 선택을 유지하고 오류를 호출자에게 전달한다. 다른 사용자 선택과 공유하지 않는다.
- metadata·Blob 모두 사용자 이름이나 파일명을 DB key로 쓰지 않는다. 이름 충돌은 별도 UUID 자료로 보관한다.

### I03. UI와 저장소 사이의 업무 서비스

- Related Files:
  - services/workspace/WorkspaceFileService.ts :: WorkspaceFileService — Query 훅의 유일한 데이터 진입점; new
  - lib/workspace/files/selectors.ts :: selectFileWorkspace — DTO 생성; read-only

#### Details
- **Signatures & Types**:
~~~typescript
interface WorkspaceFileServiceOptions {
  identity: FileIdentity; catalog: FileProjectCatalog; repository: FileRepository;
}
declare class WorkspaceFileService {
  constructor(options: WorkspaceFileServiceOptions);
  listProjects(): Promise<WorkspaceProject[]>;
  loadProject(projectId: string): Promise<FileWorkspaceView>;
  execute(input: FileMutation): Promise<FileReceipt>;
  getOriginal(input: FileOriginalRequest): Promise<File>;
  getSelection(): Promise<string | null>;
  selectProject(projectId: string): Promise<void>;
  close(): void;
}
~~~
- **Execution Flow / Logic**:
  1. identity/catalog를 생성자로 고정하고 메서드마다 접근 및 closed 상태를 확인한다. UI가 actor/권한 필드를 전달하는 execute API를 만들지 않는다.
  2. listProjects는 catalog 전체 중 접근 가능한 항목을 id 순으로 안정적으로 정렬한다. loadProject는 repository.load 후 selectFileWorkspace 반환. null·forbidden을 정상 empty로 감추지 않는다.
  3. execute/getOriginal/선택 저장은 repository에 위임하고 완료 전후 generation을 확인한다. 도메인 코드는 UI 메시지 변환 중 잃지 않는다.
  4. close는 저장소를 닫고 재사용을 거부한다. 새로운 사용자·역할은 새 service/repository 인스턴스를 사용한다.
- 서버 Blob/Cosmos 서비스나 키·환경설정·API route는 수정하지 않는다.

## Acceptance Criteria
- [x] reload와 재접속에 필요한 metadata/원본/선택이 별도 namespace로 보관된다.
- [x] add batch 실패·quota·transaction abort 시 자료 카드만 남거나 원본만 남는 부분 저장이 없다.
- [x] stale revision 및 다른 프로젝트의 version/blob 접근을 거부한다.
- [x] 과거 회차 원본은 GC에서 보호되고 같은 파일 버전 편집으로 Blob이 복제되지 않는다.
- [x] DB 로드 오류는 빈 DB 초기화로 처리하지 않고 늦은 요청·dispose를 차단한다.

## Validation
- npm run typecheck — 저장소/서비스 인터페이스와 T01 타입 일치.
- npm run lint — async callback/미사용 분기/내부 any 관련 오류 없음.
- git diff --check — 형식 오류 없음.
- 정적 transaction 검토: completion에서만 resolve, 모든 오류 abort, IDB 내 unrelated await 없음, namespace key 및 원본 membership 검사, 유효 removal 포함 참조 집합. 실제 브라우저 영속성/용량 테스트는 정책상 미실시로 기록한다.

## Commit Message
~~~text
feat(files): IndexedDB 원본 저장소와 자료 서비스 구현

Plan: 2026-11-03-workspace-file-upload
Phase: P01-file-workspace
Task: T02-indexeddb-storage

- 파일과 설정을 프로젝트별 트랜잭션으로 저장
- 이전 회차 원본 보존과 충돌 및 용량 오류 처리
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 모든 Task 완료 후 일괄 커밋 (사용자 지시 2026-11-03).

## 실행 결과 — 2026-11-03
- typecheck/lint/공백 검사 통과. fake-indexeddb 인라인 확인: 원본·회차·선택 재접속 복원, 동시 충돌, 사용자 격리, dispose, QUOTA 주입 롤백. 실제 브라우저 영속성·용량 검증은 미실시.
