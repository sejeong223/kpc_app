# Task: T06 실제 미리보기·다운로드·최종 검증

## Status: pending

## Goal
등록한 원본을 PDF·TXT로 미리 보고 지원하지 않는 문서는 원본을 다운로드할 수 있도록 연결한다. 확정 결정과 기획 요소의 대응 및 자동 검증 결과를 보고서로 남겨 전체 자료함 작업을 완료한다.

## Decision Summary
- 원본은 FileOriginalRequest(projectId,round,versionId)로 권한 검사 후 읽는다. PDF는 브라우저 지원 범위, TXT는 안전한 텍스트, 그 외는 메타데이터와 다운로드다.
- 기획의 고정 시연 본문이나 가짜 검색 결과를 사용하지 않는다. 브라우저 검증 제외와 tests/ 생성 금지 정책을 유지하며 실제 실행한 검증만 기록한다.

## 실행 범위 및 지속 정책

- cwd: C:/Developer/Project/kpc_app. Plan: 2026-11-03-workspace-file-upload, Phase: P01-file-workspace. 확정 범위: 실제 파일/설정의 로컬 저장, 서버·검색·AI·KMS 연결 제외. 공통 인증 세션 갱신은 사용자 추가 선택으로 포함한다.
- 이 파일은 청사진이다. 계획 작성 시 코드 구현 금지. 실행 시에만 명시된 production 경로를 수정한다. 일반 레이아웃은 tw: Tailwind와 공통 토큰, 내부 타입은 strict/Container 기반, 데이터 훅은 TanStack Query를 사용한다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/검증용 dev server 제외. npm run test 및 test:admin-review를 대체 검증으로 호출하지 않는다. 기존 테스트 삭제도 하지 않는다.
- 서버 권한 검사를 이번 로컬 규칙이 대체한다고 보고하지 않는다. Azure/Cosmos 리소스 생성·설정 변경 없음. DB/버킷/환경 변수를 새로 요구하지 않는다.
- Task별 커밋 메시지는 아래 것을 사용하되 실행 요청의 단일 커밋 등 최신 지시가 우선이다. 이번 계획 작성은 commit/push를 수행하지 않는다.

## Implementation

### I01. 미리보기 준비와 원본 다운로드

- Related Files:
  - lib/workspace/files/preview.ts :: prepareFilePreview, downloadOriginalFile — 자원 수명과 형식 처리; new
  - hooks/workspace/use-file-preview.ts :: useFilePreview — 원본 mutation과 늦은 응답 처리; new
  - hooks/workspace/use-workspace-files.ts :: useFileOriginal — T04 mutation 재사용; read-only 또는 필요한 연결 보완
  - services/workspace/WorkspaceFileService.ts :: getOriginal — T02 권한 검사; read-only
  - services/workspace/IndexedDbFileRepository.ts :: readOriginal — T02 scoped 원본 조회; read-only
  - config/workspace-files.ts :: TXT_PREVIEW_BYTES 및 허용 형식 — read-only

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
type FilePreviewContent =
  | { type: "pdf"; url: string }
  | { type: "text"; text: string; truncated: boolean; encoding: "utf-8" | "utf-16le" | "utf-16be" }
  | { type: "metadata"; reason: string };
interface PreparedFilePreview { content: FilePreviewContent; dispose(): void }
interface FilePreviewState {
  status: "idle" | "loading" | "ready" | "error";
  content: FilePreviewContent | null; file: File | null; error: WorkspaceFileError | null;
}
interface FilePreviewController extends FilePreviewState { retry(): void; download(): void }
declare function prepareFilePreview(file: File): Promise<PreparedFilePreview>;
declare function downloadOriginalFile(file: File): () => void;
declare function useFilePreview(request: FileOriginalRequest | null): FilePreviewController;
~~~
- **Data & Schema Fields**:
  - readOriginal이 반환한 File만 사용한다. 임의 경로 또는 metadata.blobId를 사용해 UI에서 직접 IDB를 읽지 않는다.
  - FilePreviewState는 모달 단위 메모리 상태다. Blob/File/object URL을 목록 query·localStorage·JSON에 보관하지 않는다.
  - file.name과 extension을 비교하고 MIME만으로 iframe/HTML을 실행하지 않는다. PDF URL은 %PDF- 헤더를 확인한 바이트에 application/pdf 타입을 지정한 Blob으로만 만든다.
  - TXT는 UTF-8 기본, UTF-8 BOM/UTF-16LE BOM/UTF-16BE BOM을 판별한다. 최대 256KiB를 읽고 TextDecoder의 해당 encoding을 사용한다. 잘못된 인코딩은 메타데이터 상태와 안내로 전환하고 원본 다운로드는 남긴다. 모든 인코딩 지원을 보장하지 않는다.

- **Execution Flow / Logic**:
  1. request가 null이면 idle. 존재하면 useFileOriginal.mutateAsync로 service의 접근 검사를 거쳐 File을 읽는다. render 중에 File/URL 브라우저 API를 실행하지 않는다.
  2. PDF는 첫 5바이트 %PDF- 확인. 유효 헤더이면 Blob object URL 생성, 아니면 내용 미리보기 불가 metadata 상태. 전체 PDF 파싱/페이지 수 검사/악성 문서 검사는 하지 않는다.
  3. TXT는 slice(0,TXT_PREVIEW_BYTES)의 바이트를 읽고 BOM에 맞춰 디코딩한다. 큰 파일의 마지막 멀티바이트 문자 절단이 잘못된 인코딩으로 오판되지 않도록 truncated일 때 decoder stream 옵션을 사용한다. UTF-16 odd 마지막 바이트도 안전하게 처리한다. 원본이 더 크면 truncated=true 안내를 보이며 다운로드는 전체 원본이다.
  4. 기타 허용 확장자는 metadata(reason="이 형식은 원본 다운로드로 확인할 수 있습니다.")를 반환한다. 원본이 없으면 ORIGINAL_MISSING 에러이지 빈 시연 문서가 아니다.
  5. 각 요청에 generation을 부여한다. 닫기/프로젝트/회차/사용자/버전 변경 시 이전 content.dispose, File 참조 해제, mutation.reset. 이미 늦게 준비된 PDF URL도 채택하지 않고 dispose한다.
  6. downloadOriginalFile은 File을 원형 그대로 Blob URL로 내려받고 download filename은 경로/제어문자만 정리한다. 임시 anchor를 제거하고 URL을 1초 뒤 정리하는 idempotent disposer를 반환한다. 모달/identity 종료에도 정리하며 여러 다운로드의 타이머/URL을 누락하지 않는다.
  7. 원본 다운로드 액션은 실제 다운로드 요청의 시작이지 OS 저장 완료가 아니다. 원본이 없거나 접근 거부된 경우 성공 문구를 표시하지 않는다.
  8. URL·파일 바이트를 로그나 오류 메시지에 출력하지 않는다. PDF/TXT 외 자료를 HTML로 렌더링하지 않는다.

### I02. 미리보기 모달과 카드 연결

- Related Files:
  - components/workspace/files/FilePreviewDialog.tsx :: FilePreviewDialog — 실제 내용 및 웹 상세; new
  - components/workspace/files/FilesWorkspace.tsx :: 선택한 resource/round와 onOpen — modify
  - components/workspace/files/FileResourceCard.tsx :: 자료명 미리보기 버튼 — modify
  - components/ui/ModalFrame.tsx :: 공통 frame — read-only
  - components/ui/DadamControls.tsx :: 버튼 등 — read-only
  - proxy.ts :: buildFrameAncestors 연결 — read-only, 이번에 CSP 전역 완화 없음

#### Details
- **Signatures & Types**:
~~~typescript
interface FilePreviewDialogProps {
  projectId: string;
  resource: FileResourceView;
  round: number;
  open: boolean;
  onClose(): void;
}
declare function FilePreviewDialog(props: FilePreviewDialogProps): React.ReactElement;
~~~
- **Data & Schema Fields**: 모달 제목은 version.label, 부제/정보는 종류·priority·ownerName·생성일·byteLength 또는 URL/기간. 화면상의 명칭은 직접 HTML 조립 없이 텍스트로 출력한다.
- **Execution Flow / Logic**:
  1. 모든 조회 가능한 카드의 자료명을 button으로 바꾸고 onOpen(resource,round)을 호출한다. 권한 없는 프로젝트는 상위 runtime/query에서 차단된다. readOnly 과거 회차도 조회 가능하다.
  2. 파일 source면 FilePreviewDialog 내부의 별도 FileOriginalPreview 컴포넌트에서 useFilePreview를 사용한다. web일 때 hook 호출을 조건문으로 바꾸지 말고 자식 컴포넌트를 분리한다.
  3. ModalFrame width는 960px, 실제 폭/높이는 기존 viewport 안전 여백·최대 높이를 따른다. PDF object(type="application/pdf") 영역에는 적절한 title/접근성 이름과 다운로드 fallback을 둔다. PDF가 표시되지 않을 때를 위해 원본 다운로드 버튼을 항상 따로 제공한다.
  4. TXT는 pre-wrap 텍스트로 표시하고 가로 폭을 넘는 긴 문자열을 감싼다. truncated 안내와 전체 원본 다운로드를 함께 제공한다. dangerouslySetInnerHTML은 사용하지 않는다.
  5. 로딩/오류/재시도·미지원/원본 누락을 구분한다. 닫기는 원본 읽기 중에도 가능하며 닫은 뒤 도착한 응답이 모달을 다시 열지 않는다.
  6. web source는 정규화된 URL, 전체/1년/3개월 기간, 활용 지침을 보여준다. http/https anchor에 target="_blank" rel="noopener noreferrer"를 지정한다. 등록한 기간의 문서를 실제 검색했다는 문구나 고정 결과를 표시하지 않는다.
  7. 부모는 닫기 시 선택 자원을 null로 만들고 포커스 복귀는 ModalFrame을 사용한다. 현재 상태가 refetch되어 version 접근이 사라지면 오래된 원본 버튼을 유지하지 않는다.
- 브라우저의 PDF 플러그인/뷰어 지원 편차는 fallback으로 처리한다. 전역 CSP를 광범위하게 완화하거나 문서를 외부 Office viewer 서비스로 전송하지 않는다.

### I03. 기획 대응·회귀 검토와 보고

- Related Files:
  - .memory/reports/2026-11-03-workspace-file-upload-validation.md :: 결과 보고서 — 실행 단계에서 new
  - 이 계획의 T01~T06 production 변경 파일 — 필요 시 검증 실패를 고치는 범위에서 modify
  - .memory/phases/2026-11-03-workspace-file-upload/P01-file-workspace/phase.md 및 각 Task Progress — 실제 완료 상태 반영
  - .memory/plans/2026-11-03-workspace-file-upload.md, .memory/current.md — 실행 워크플로에 맞춰 완료/다음 포인터
  - C:/Users/k2020/Downloads/KPC_제안서_UI_v12 8 (1).html — source read-only, 실행 금지

#### Details
- **Signatures & Types**: 별도 제품 기능·서버 API·테스트 harness를 추가하지 않는다. 검증 보고서에는 항목/근거 경로/실행 명령/결과/미실시 제한을 표로 기록한다.
- **Execution Flow / Logic**:
  1. 기획 대비 포함 표: 3영역/카운트/참조순서, 파일 선택·드롭, 종류 8/priority 4, bulk, 지침 5, 링크/기간 3/지침, 설정·삭제·undo, 회차 아코디언, 실제 원본 보기·다운로드. 샘플 버튼과 dormant 검색/KMS는 제외 사유를 적는다.
  2. 권한 표: 비참여 user 접근 차단; 참여자 읽기/추가/본인 관리; 타인 자료 편집 거부; PM/super 공통 회차/순서; archived direct write 거부; 과거 타인 파일 복사로 소유권 획득 불가.
  3. 무결성 표: 현재 30개+과거 버전은 추가 집계 없음; 현재 참조 제외 포함; 이름 같은 새 파일 자동 덮어쓰기 없음; 새 회차 inherited snapshot 유지; copy/edit 취소 무변경; 삭제 후 새 회차에 부활 없음; undo 만료/한도/권한 검사; original GC가 과거 회차/유효 undo를 보존.
  4. 저장 실패/동시성 표: IDB unavailable/blocked/quota/손상 row, metadata/blob atomic rollback, 다른 탭 revision 충돌, 역할 변경/로그아웃/StrictMode cleanup, stale original response/URL revoke. 정적 검토와 실제 자동 실행 결과를 구별한다.
  5. 공통 인증 표: T03 useSession bridge가 최초 props fallback 없이 roles/id/null/error 변경을 전달하는지 확인한다. 서버 guards·기존 admin/comment 저장 계약 유지도 기록한다.
  6. 아래 자동 검증을 실행하고 실패는 변경 범위에서 수정한 뒤 필요한 명령만 재실행한다. 무관한 기존 오류가 발견되면 원인과 범위를 보고하고 숨기지 않는다.
  7. 보고서에 브라우저 검증 미실시, PDF/native 다운로드/저장 용량 실측 미실시, 지원 텍스트 인코딩, 서버 미연결, SPA history 전체 차단 미보장 등을 분리 기록한다. typecheck/build 통과를 모든 UI 동작 검증으로 표현하지 않는다.

## Acceptance Criteria
- [ ] PDF·TXT는 실제 원본에서 표시되고 기타 문서는 원본 다운로드 가능 구조다.
- [ ] 가짜 파일 본문/검색 결과/원본 누락 다운로드가 없다.
- [ ] 모달 종료·파일/사용자 전환에서 URL/File 참조와 늦은 결과를 정리한다.
- [ ] 기획 대응·권한·회차·30개·저장 오류·인증 변경을 정적으로 확인하고 누락/후속 범위를 기록한다.
- [ ] typecheck/lint/build/diff 검증 결과와 미실시 제한을 보고서에 명확히 적는다.
- [ ] 전체 완료 후에만 Phase/Plan/current를 완료로 전진한다.

## Validation
- npm run typecheck — 전체 타입 통과.
- npm run lint — 전체 lint 오류 없음.
- npm run build — 최종 Next.js 빌드 통과.
- git diff --check — 변경 형식 오류 없음.
- git diff --stat 및 git status --short — 허용된 기능 범위/문서만 변경되고 tests/가 생성되지 않았는지 확인.
- 위 I03 표에 따른 소스 정적 검토. npm test, Playwright, CUA, dev server, 화면 캡처는 수행하지 않는다. 경고는 오류와 구분해 기록한다.

## Commit Message
~~~text
feat(files): 원본 미리보기와 다운로드 및 통합 검증 완료

Plan: 2026-11-03-workspace-file-upload
Phase: P01-file-workspace
Task: T06-preview-and-validation

- PDF 및 텍스트 미리보기와 안전한 원본 다운로드 연결
- 기획 요소와 권한 및 회차 보존 검증 결과 기록
~~~

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
