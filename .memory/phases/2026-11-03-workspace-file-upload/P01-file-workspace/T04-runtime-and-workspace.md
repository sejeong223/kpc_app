# Task: T04 Query·프로젝트 선택·자료함 화면

## Status: done

## Goal
/workspace/files에 사용자별 서비스와 TanStack Query를 연결하고 프로젝트별 3개 자료 영역 및 회차를 읽을 수 있게 한다. 다른 사용자의 캐시나 이전 프로젝트 응답을 새 화면에 표시하지 않는다.

## Decision Summary
- T01/T02 데이터 계약과 T03 최신 세션을 사용한다. 기존 관리자 QueryClientProvider 아래에서 별도 key namespace를 사용하며 관리자 query를 제거하지 않는다.
- 이 Task는 프로젝트 선택·목록·회차 조회를 완성한다. 편집 액션은 T05, 내용 미리보기·다운로드는 T06에서 연결하고 그 전에는 동작하지 않는 버튼을 노출하지 않는다.

## 실행 범위 및 지속 정책

- cwd: C:/Developer/Project/kpc_app. Plan: 2026-11-03-workspace-file-upload, Phase: P01-file-workspace. 확정 범위: 실제 파일/설정의 로컬 저장, 서버·검색·AI·KMS 연결 제외. 공통 인증 세션 갱신은 사용자 추가 선택으로 포함한다.
- 이 파일은 청사진이다. 계획 작성 시 코드 구현 금지. 실행 시에만 명시된 production 경로를 수정한다. 일반 레이아웃은 tw: Tailwind와 공통 토큰, 내부 타입은 strict/Container 기반, 데이터 훅은 TanStack Query를 사용한다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/검증용 dev server 제외. npm run test 및 test:admin-review를 대체 검증으로 호출하지 않는다. 기존 테스트 삭제도 하지 않는다.
- 서버 권한 검사를 이번 로컬 규칙이 대체한다고 보고하지 않는다. Azure/Cosmos 리소스 생성·설정 변경 없음. DB/버킷/환경 변수를 새로 요구하지 않는다.
- Task별 커밋 메시지는 아래 것을 사용하되 실행 요청의 단일 커밋 등 최신 지시가 우선이다. 이번 계획 작성은 commit/push를 수행하지 않는다.

## Implementation

### I01. 런타임과 Query 훅

- Related Files:
  - components/workspace/files/FilesScreen.tsx :: FilesScreen — 세션/preview 입력과 identity 검사; new
  - components/workspace/files/FileRuntimeProvider.tsx :: FileRuntimeProvider/useFileRuntime — 서비스 수명; new
  - hooks/workspace/use-workspace-files.ts :: 아래 조회·변경 훅 — 모든 데이터 진입점; new
  - lib/workspace/files/query-keys.ts :: fileQueryKeys — 사용자/역할/인스턴스 키; new
  - services/workspace/WorkspaceFileService.ts :: WorkspaceFileService — T02; read-only
  - services/workspace/IndexedDbFileRepository.ts :: IndexedDbFileRepository — T02; read-only
  - lib/workspace/files/identity.ts, config/workspace-projects.ts — T01; read-only
  - lib/admin/runtime-lifetime.ts :: createDisposalLease — StrictMode 정리 재사용; read-only
  - components/admin/AdminRuntimeProvider.tsx :: QueryClientProvider — 이미 상위 layout에 존재; read-only

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
type FileQueryScope = readonly ["workspace-files", string, string, FileRole, string];
interface FileRuntimeValue {
  identity: FileIdentity;
  service: import("@/services/workspace/WorkspaceFileService").WorkspaceFileService;
  queryScope: FileQueryScope;
}
interface FileRuntimeProviderProps { identity: FileIdentity; children: React.ReactNode }
declare function FilesScreen(): React.ReactElement;
declare function FileRuntimeProvider(props: FileRuntimeProviderProps): React.ReactElement;
declare function useFileRuntime(): FileRuntimeValue;
declare function useFileProjects(): import("@tanstack/react-query").UseQueryResult<WorkspaceProject[], WorkspaceFileError>;
declare function useFileSelection(): import("@tanstack/react-query").UseQueryResult<string | null, WorkspaceFileError>;
declare function useFileWorkspace(projectId: string | null): import("@tanstack/react-query").UseQueryResult<FileWorkspaceView, WorkspaceFileError>;
declare function useSelectFileProject(): import("@tanstack/react-query").UseMutationResult<void, WorkspaceFileError, string>;
declare function useFileCommand(): import("@tanstack/react-query").UseMutationResult<FileReceipt, WorkspaceFileError, FileMutation>;
declare function useFileOriginal(): import("@tanstack/react-query").UseMutationResult<File, WorkspaceFileError, FileOriginalRequest>;
~~~
- **Data & Schema Fields**:
  - service API(T02): listProjects(), loadProject(id), execute(FileMutation), getOriginal(FileOriginalRequest), getSelection(), selectProject(id), close(). close 외에는 Promise를 반환한다.
  - 한국어 계약: close 외 서비스 메서드는 Promise를 반환한다. loadProject→FileWorkspaceView, execute→FileReceipt, getOriginal→File, getSelection→string|null, selectProject→void.
  - queryScope tuple: ["workspace-files", namespace, actor.id, actor.role, instanceId]. instanceId는 Provider의 useId() 값으로 StrictMode effect 재연결 동안 고정하고 실제 새 인스턴스의 늦은 정리가 새 요청을 취소하지 않게 한다.
  - fileQueryKeys(scope)는 projects=[...scope,"projects"], selection=[...scope,"selection"], project(id)=[...scope,"project",id], mutation=[...scope,"mutation"]을 반환한다.

- **Execution Flow / Logic**:
  1. FilesScreen은 useAuthRuntime의 최신 authEnabled/session과 useProfilePreview의 profile.name/state.previewRole로 resolveFileIdentity를 호출한다. null이면 WorkspacePage+오류/접근 불가 상태만 렌더링하고 DB 런타임을 생성하지 않는다.
  2. 유효 identity는 fileIdentityKey로 key를 지정한 FileRuntimeProvider에 전달한다. catalog/repository/service를 인스턴스당 한 번 생성한다. 생성자는 DB를 열지 않는다. useQuery 시작 시 열린다.
  3. useQueryClient는 기존 상위 Provider를 사용한다. createDisposalLease로 StrictMode의 일시 effect cleanup에서 service를 영구 종료하지 않게 한다. 실제 종료 시 service.close, 자기 queryScope의 취소/제거만 수행한다.
  4. 조회는 useQuery, 선택·자료 command·원본 읽기는 useMutation을 사용한다. 조회 staleTime=0, retry=false, refetchOnWindowFocus=true. metadata gcTime=5분. File을 포함한 두 mutation은 gcTime=0이고 UI 종료/성공 처리 후 reset한다.
  5. 선택 변경은 service.selectProject 완료 후 selection cache를 갱신한다. 실패하면 기존 선택 유지. command 성공은 해당 프로젝트 query만 invalidate/refetch하고 UI 완료 처리 전에 최신 상태를 확인한다. 선택값·다른 프로젝트·admin-mock 캐시를 불필요하게 무효화하지 않는다.
  6. CONFLICT는 폼을 유지하고 현재 프로젝트를 refetch하며 자동 mutation retry를 하지 않는다. 갱신된 revision으로 무조건 같은 명령을 재전송하지 않는다.
  7. signal 취소/프로젝트 변경 뒤 응답은 해당 scoped key에만 속한다. 사용자 전환에서는 서비스 close와 key 변경이 이전 응답 적용을 차단한다. query placeholderData/keepPreviousData로 이전 프로젝트 DTO를 표시하지 않는다.

### I02. 재사용 가능한 프로젝트 선택과 조회 UI

- Related Files:
  - components/workspace/ProjectSelector.tsx :: ProjectSelector — generic controlled 선택; new
  - components/workspace/files/FilesWorkspace.tsx :: FilesWorkspace — 프로젝트/회차 상태 조합; new
  - components/workspace/files/FileRoundSection.tsx :: FileRoundSection — 회차 펼치기/읽기 전용; new
  - components/workspace/files/FileCategoryPanel.tsx :: FileCategoryPanel — 세 자료 영역; new
  - components/workspace/files/FileResourceCard.tsx :: FileResourceCard — 자료 메타데이터; new
  - components/layout/WorkspacePage.tsx, WorkspaceToolbar.tsx, WorkspaceActionRow.tsx, WorkspaceCard.tsx — read-only
  - components/ui/DadamControls.tsx, SegmentedControl.tsx, ModalFrame.tsx — read-only
  - components/admin/ui/AdminAsyncState.tsx :: AdminAsyncState — loading/error/empty 재사용; read-only

#### Details
- **Signatures & Types**:
~~~typescript
interface ProjectSelectorProps {
  projects: readonly Pick<WorkspaceProject, "id" | "name" | "number">[];
  value: string | null; disabled?: boolean; onChange(projectId: string): void;
}
interface FileResourceCardProps {
  resource: FileResourceView; round: number; readOnly: boolean;
  onOpen?(resource: FileResourceView, round: number): void;
  onEdit?(resource: FileResourceView, round: number): void;
  onRemove?(resource: FileResourceView): void;
}
interface FileCategoryPanelProps {
  category: FileCategory; ordinal: number; round: number; readOnly: boolean;
  resources: FileResourceView[]; canAdd: boolean;
  onAdd?(category: FileCategory): void;
  onOpen?: FileResourceCardProps["onOpen"];
  onEdit?: FileResourceCardProps["onEdit"];
  onRemove?: FileResourceCardProps["onRemove"];
}
interface FileRoundSectionProps extends Pick<FileCategoryPanelProps, "onAdd" | "onOpen" | "onEdit" | "onRemove"> {
  value: FileRoundView; canAdd: boolean; canReorder: boolean;
  onReorder?(order: FileCategory[]): void;
}
declare function ProjectSelector(props: ProjectSelectorProps): React.ReactElement;
declare function FilesWorkspace(): React.ReactElement;
declare function FileRoundSection(props: FileRoundSectionProps): React.ReactElement;
declare function FileCategoryPanel(props: FileCategoryPanelProps): React.ReactElement;
declare function FileResourceCard(props: FileResourceCardProps): React.ReactElement;
~~~
- **Data & Schema Fields**: 화면의 열린 회차·선택 프로젝트·활성 다이얼로그는 UI 상태이며 저장 자료의 별도 복제본을 만들지 않는다. 프로젝트 key가 바뀌면 회차 펼침 상태를 초기화한다.
- **Execution Flow / Logic**:
  1. 프로젝트 목록과 마지막 선택을 Query로 읽는다. 둘 중 하나가 실패하면 재시도 상태를 보이며 임의 첫 프로젝트로 숨기지 않는다. 선택값이 null/더 이상 접근 불가이고 목록이 있으면 id 정렬 첫 항목을 정상 선택 저장 경로로 선택한다. 빈 목록은 자료 query를 비활성화한다.
  2. WorkspacePage title="파일 업로드"의 기본 showTitle=false를 유지한다. leading에 ProjectSelector, actions에 현재 자료 수/제한 표시를 둔다. 중복 페이지 제목·시연 라벨·추가 상단 padding을 만들지 않는다.
  3. 현재 회차를 먼저 표시하고 이전 회차는 내림차순으로 접어 둔다. 기존 의미는 보존하며 각 회차는 독립적으로 토글 가능하다. details/summary나 aria-expanded 버튼으로 조작한다. 현재 기본 펼침, 이전 기본 접힘.
  4. 각 회차의 categoryOrder에 따라 3개 패널을 배치한다. grid-cols-1, 가용 중간 폭에서 2열, 넓은 폭에서 3열. gap/padding은 --layout-section-gap/--layout-card-inset 등 기존 토큰. 카드 최소 폭으로 모바일 가로 스크롤이 생기지 않게 min-w-0/break-words를 적용한다.
  5. row는 label, 파일/웹 구분 아이콘, 종류, priority badge, 크기/URL 호스트, ownerName, 생성일, 읽기 전용/계승 상태를 표시한다. 날짜는 ko-KR/Asia-Seoul 표시, 저장값은 UTC. 파일명·지침을 HTML로 삽입하지 않는다.
  6. callbacks가 없는 현재 Task에서는 자료명을 텍스트로 표시하고 미구현 액션 버튼을 노출하지 않는다. T05/T06에서 같은 props를 연결한다. 권한이 없으면 콜백 유무와 별개로 액션을 조건부 렌더링한다.
  7. 30개 한도는 현재 query.currentCount로 표시한다. 개별 분류/과거 회차 카드 수와 전체 currentCount를 혼동하지 않는다. 참조 제외 항목은 흐린 상태를 표시하되 조회 가능하다.
  8. 재조회 실패 시 과거 데이터로 조용히 계속 편집하지 않게 오류와 재시도를 제공한다. 프로젝트 변경 진행 중에는 이전 프로젝트 액션을 실행할 수 없다.
- 공통 파일을 수정해야 할 필요가 없다면 수정하지 않는다. Admin 접두 UI의 스타일은 재사용할 수 있으나 관리자 권한 훅으로 파일 접근을 검사하지 않는다.

### I03. 라우트 연결

- Related Files:
  - app/(authenticated)/workspace/[screen]/page.tsx :: WorkspaceScreenPage — modify
  - app/(authenticated)/layout.tsx :: AuthenticatedLayout — read-only
  - components/layout/AppShell.tsx :: AppShell — 공통 page padding, DadamThemeScope; read-only
  - config/sidebar.ts :: getSidebarItemByScreen — 일반 메뉴 files; read-only

#### Details
- **Signatures & Types**: WorkspaceScreenPage의 params/searchParams 타입과 tokens redirect/admin 분기를 유지한다.
- **Execution Flow / Logic**:
  1. 일반 화면 분기에서 screen==="files"일 때 FilesScreen을 렌더링한다. 기존 write→CommentsWorkspace 및 다른 빈 화면의 WorkspacePage를 그대로 유지한다.
  2. PreviewRoleBoundary와 상위 requireAppAccess 경로를 유지한다. files에 requiredRole=Admin을 추가하거나 client query로 서버 guard를 대체하지 않는다.
  3. 새 Provider를 전체 앱 layout으로 올리지 않는다. 파일 메뉴 진입 때만 DB/자료 state를 준비하며 프로젝트 선택 컴포넌트는 다른 화면에서 나중에 재사용 가능하게 둔다.
  4. JSX의 hook/store는 client 경계 내부, route는 기존 server component. SSR 평가 시 IDB/File 참조가 없어야 한다.

## Acceptance Criteria
- [x] files route가 3영역·현재/과거 회차·프로젝트 선택을 공통 스타일로 표시하는 구조다.
- [x] 선택 상태가 namespace별 저장되고 오류·빈 목록·권한 없음이 구분된다.
- [x] 계정·역할 전환 및 StrictMode에서 오래된 service/캐시를 공유하거나 새 인스턴스를 잘못 종료하지 않는다.
- [x] 미구현 편집/미리보기 버튼은 나타나지 않으며 다른 메뉴 라우팅을 유지한다.

## Validation
- npm run typecheck — route/DTO/컴포넌트/훅 props 일치.
- npm run lint — Hook 의존성·조건부 호출·미사용 임시 UI 오류 없음.
- npm run build — 새 route의 서버 import 및 client 번들 빌드 통과.
- git diff --check — 형식 오류 없음.
- 정적 검토: query key에 namespace/role/project 포함, 이전 데이터 placeholder 금지, canManage 조건부 렌더링, 빈 목록 disabled query, 각 회차 순서/접힘, 기존 files 일반 메뉴 접근. 브라우저 렌더링 검증은 미실시.

## Commit Message
~~~text
feat(files): 프로젝트 선택과 공통 자료함 화면 연결

Plan: 2026-11-03-workspace-file-upload
Phase: P01-file-workspace
Task: T04-runtime-and-workspace

- 사용자별 Query 런타임과 프로젝트 선택 복원 연결
- 공통 디자인으로 회차 및 세 자료 영역 구성
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 모든 Task 완료 후 일괄 커밋 (사용자 지시 2026-11-03).

## 실행 결과 — 2026-11-03
- typecheck/lint/build/공백 검사 통과. 신규 Hook 경고는 inline effect로 수정 후 대상 eslint 재통과. 사용자·역할·인스턴스별 Query key와 scope 정리, placeholder 미사용, 조건부 액션, 회차 접힘, 일반 메뉴 route를 정적 검토. 실제 화면 검증 미실시.
