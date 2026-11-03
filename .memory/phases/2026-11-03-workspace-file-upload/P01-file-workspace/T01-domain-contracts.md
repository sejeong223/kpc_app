# Task: T01 자료 모델·권한·회차 규칙

## Status: done

## Goal
자료함의 모든 조작이 동일한 타입·권한·회차 전이 규칙으로 해석되도록 순수 도메인 계층을 만든다. 이 Task 완료 시 UI나 DB 없이도 원본 보존·최신 참조·30개 집계의 계약이 고정된다.

## Decision Summary
- 논리 자료/불변 버전/회차별 목록/원본 바이트를 분리한다. PM·슈퍼 관리자 외에는 본인 자료만 변경하며 과거 회차는 누구도 직접 변경하지 않는다.
- 일반 사용자도 참여 프로젝트에 자료를 올린다. 실제 서버는 연결하지 않고 안정적인 사용자 키와 mock 프로젝트 카탈로그를 준비한다.

## 실행 범위 및 지속 정책

- cwd: C:/Developer/Project/kpc_app. Plan: 2026-11-03-workspace-file-upload, Phase: P01-file-workspace. 확정 범위: 실제 파일/설정의 로컬 저장, 서버·검색·AI·KMS 연결 제외. 공통 인증 세션 갱신은 사용자 추가 선택으로 포함한다.
- 이 파일은 청사진이다. 계획 작성 시 코드 구현 금지. 실행 시에만 명시된 production 경로를 수정한다. 일반 레이아웃은 tw: Tailwind와 공통 토큰, 내부 타입은 strict/Container 기반, 데이터 훅은 TanStack Query를 사용한다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/검증용 dev server 제외. npm run test 및 test:admin-review를 대체 검증으로 호출하지 않는다. 기존 테스트 삭제도 하지 않는다.
- 서버 권한 검사를 이번 로컬 규칙이 대체한다고 보고하지 않는다. Azure/Cosmos 리소스 생성·설정 변경 없음. DB/버킷/환경 변수를 새로 요구하지 않는다.
- Task별 커밋 메시지는 아래 것을 사용하되 실행 요청의 단일 커밋 등 최신 지시가 우선이다. 이번 계획 작성은 commit/push를 수행하지 않는다.

## Implementation

### I01. 스키마·오류·상수와 계약

- Related Files:
  - types/workspace-files.ts :: 아래 공통 계약의 모든 타입 및 FileRepository — 전체 타입 컨테이너; new
  - config/workspace-files.ts :: FILE_CATEGORIES, REFERENCE_KINDS, REFERENCE_PRIORITIES, WEB_PERIODS, FILE_LIMITS, PROMPT_HINTS — 순서/레이블/제한; new
  - lib/workspace/files/schemas.ts :: FileSettingsSchema, FileVersionSchema, FileProjectStateSchema, FileMutationSchema, PreparedFileMutationSchema — 런타임 검증; new
  - lib/workspace/files/errors.ts :: WorkspaceFileError — 코드와 한국어 오류; new
  - lib/workspace/files/validation.ts :: normalizeWebUrl, validateUploadFile, guessReferenceKind — 공통 입력 처리; new
  - package.json, tsconfig.json :: dependencies/compilerOptions — read-only

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
declare function normalizeWebUrl(raw: string): string;
declare function validateUploadFile(file: File): AllowedFileExtension;
declare function guessReferenceKind(filename: string): ReferenceKind;
~~~
- **Data & Schema Fields**: 공통 계약을 Zod strictObject와 discriminatedUnion으로 검증한다. categoryOrder는 3개 분류를 정확히 한 번씩 포함한다. 정수·길이·ISO 날짜·entry 외래키·asset sourceKind·버전 생성 회차를 함께 검증한다. 필드 기본값은 생성 함수에서 명시하며 손상된 저장값을 default로 은폐하지 않는다. WorkspaceFileError 클래스의 구현은 errors.ts 한 곳에만 두고 types/workspace-files.ts에서는 FileErrorCode 및 필요한 type-only re-export만 제공한다.
- FileMutationSchema의 File은 브라우저 경계에서만 검사한다. 모듈 최상위에서 File/Blob 생성자나 indexedDB/window를 평가하지 않는다. Zod/custom 및 IDB 외부 경계를 제외하고 any/unknown 타입 우회 금지.
- 파일 기본 종류 추정: rfp/제안요청/공고→rfp, 과업/지시서/요구→business, 실적/사례→case-study, 소개/회사→company, 나머지 other. 확장자는 소문자로 검사하고 입력의 실제 파일명은 보존한다.
- PROMPT_HINTS 정확한 순서: 핵심 수치만 원문 그대로 발췌 / 평가 기준 관점으로 요약 / 표 형식으로 정리해 인용 / 최신 내용만 사용 / 특정 장(章) 작성에만 사용.
- URL은 trim 후 스킴 없는 호스트에 https://를 붙여 URL 파싱한다. http/https만 허용하고 username/password 및 빈 hostname을 거부한다. 경로·query·fragment는 보존한다. javascript:, data:, file:, 임의 스킴을 호스트처럼 재해석하지 않는다.
- **Execution Flow / Logic**:
  1. 파일 메타데이터 또는 URL 입력을 검사한다. 0바이트·지원하지 않는 확장자·50MB 초과는 각각 한국어 이유를 반환한다.
  2. 검증된 타입을 반환하고 이름·지침은 표시 시 React 텍스트로 렌더링한다.
  3. 입력 불일치=VALIDATION, 용량/목록 한도=LIMIT. Zod 내부 오류나 스택을 사용자 문구로 그대로 노출하지 않는다.
  4. 이 Task에서는 File 내용을 분석·보관하지 않는다.

### I02. 사용자 식별과 mock 프로젝트

- Related Files:
  - lib/workspace/files/identity.ts :: resolveFileIdentity, fileIdentityKey — 인증과 저장 범위; new
  - config/workspace-projects.ts :: createWorkspaceProjectCatalog — 기존 RFP fixture 매핑; new
  - components/providers.tsx :: useAuthRuntime — 현 계약 {authEnabled, session}; read-only
  - lib/auth/roles.ts :: APP_ROLES, hasRole — User/Admin 검사; read-only
  - config/admin-seed.ts :: createAdminSeed — RFP/PM/사용자 fixture; read-only
  - lib/comments/domain.ts :: resolveCommentIdentity — namespace 패턴 참고; read-only

#### Details
- **Signatures & Types**:
~~~typescript
interface FileIdentityInput {
  authEnabled: boolean; session: import("next-auth").Session | null;
  previewRole: FileRole; displayName: string;
}
declare function resolveFileIdentity(input: FileIdentityInput): FileIdentity | null;
declare function fileIdentityKey(identity: FileIdentity): string;
declare function createWorkspaceProjectCatalog(identity: FileIdentity): FileProjectCatalog;
~~~
- **Data & Schema Fields**: 인증 비활성 actor.id="preview:sodam", namespace="files:preview:sodam", isMock=true, role=previewRole. 인증 활성은 oid(원형) → upn(lowercase) → email(lowercase) 순서로 "entra:oid:", "entra:upn:", "entra:email:" 접두 actor.id를 만들고 namespace="files:"+actor.id. 세션 없음/오류/안정적 ID 없음/유효 앱 역할 없음이면 null.
- 활성 세션 Admin은 super_admin, User는 user로 매핑한다. 기존 서버 역할 계약을 확장해 department_admin 서버 claim을 새로 만들지 않는다.
- fileIdentityKey는 namespace/id/name/role/isMock의 JSON tuple이다. 역할·사용자 변경 시 런타임 재생성, 이름 변경 시 표시 이름 갱신을 허용한다. 접근 토큰·email 원문·roles를 콘솔에 출력하지 않는다.
- createAdminSeed() 결과를 한 번 읽어 rfps의 id/number/name/departmentId/pmId를 재사용한다. "u-self"는 identity.actor.id, 나머지 사용자 ID는 "mock:"+원래 id로 변환하고 PM 이름도 일치시킨다.
- mock memberIds는 해당 RFP 부서의 active 사용자 + PM으로 만든다. mois/edu/sample에는 현재 actor도 명시적으로 참여시켜 PM 프로젝트와 일반 참여 프로젝트의 흐름을 제공한다. 이 규칙은 로컬 fixture이며 실제 참여 권한 추론이 아님을 문서에 명시한다. invited/locked 사용자를 추가하지 않는다.
- 모든 36개 fixture의 업무 status를 재정의하거나 제작 생명주기 필터를 새로 만들지 않는다. 실제 표시 가능 여부는 아래 접근 규칙으로 결정한다.
- 카탈로그는 불변 사본을 반환하며 UI draft로 PM·memberIds를 변경할 수 없다. 관리자 seed 원본과 기존 대시보드 집계를 수정하지 않는다.
- **Execution Flow / Logic**: identity 검증 → fixture 매핑 → 접근 가능한 프로젝트 필터. 누락된 프로젝트는 null이며 임의 샘플 복제나 fallback으로 접근을 허용하지 않는다.

### I03. 권한·상태 전이·목록 선택

- Related Files:
  - lib/workspace/files/permissions.ts :: canAccessFileProject, canManageFileAsset, canManageFileProject — 로컬 업무 규칙; new
  - lib/workspace/files/domain.ts :: createEmptyFileProject, applyFileMutation, collectRetainedBlobIds — 순수 전이; new
  - lib/workspace/files/selectors.ts :: selectFileWorkspace — 카드/회차/권한 DTO; new

#### Details
- **Signatures & Types**:
~~~typescript
declare function canAccessFileProject(identity: FileIdentity, project: WorkspaceProject): boolean;
declare function canManageFileProject(identity: FileIdentity, project: WorkspaceProject): boolean;
declare function canManageFileAsset(identity: FileIdentity, project: WorkspaceProject, asset: FileAsset): boolean;
declare function createEmptyFileProject(context: FileCommandContext): FileProjectState;
declare function applyFileMutation(state: FileProjectState, input: PreparedFileMutation, context: FileCommandContext): FileReceipt;
declare function collectRetainedBlobIds(state: FileProjectState): ReadonlySet<string>;
declare function selectFileWorkspace(state: FileProjectState, project: WorkspaceProject, identity: FileIdentity): FileWorkspaceView;
~~~
- **Execution Flow / Logic**:
  1. 저장된 state와 input을 검증하고 한국어 오류로 변환한다.
  2. 상태/명령 검증 → 접근·소유권 → expectedRevision/expectedRound → 개수/참조/분류 순서 검사를 완료한다. 원본 state를 직접 변형하지 않고 구조 복제 후 변경한다.
  3. add-files: batch 1..30, 남은 칸에 모두 들어갈 때만 각 asset/version/entry를 함께 생성한다. 부분 성공 없음. 준비된 original의 blobId/byteLength만 사용하고 owner는 context.actor로 지정한다.
  4. add-web: URL 정규화 후 web/normal 설정으로 생성한다. label은 정규화된 URL, instruction만 사용자 입력. 검색 결과는 만들지 않는다.
  5. edit: 권한 확인 후 sourceVersion을 찾는다. 현재 entry가 다른 버전이면 CONFLICT. 현재 entry가 없으면 과거 목록의 최신 버전인지 확인하고 30개 한도를 검사한다. file 원본·분류·owner는 유지, web은 검증된 web.url/period만 교체한다. 새 버전 생성 후 현재 entry만 교체/추가하고 과거 버전은 변경하지 않는다.
  6. remove: 현재 entry와 sourceVersion 일치·권한 검사 후 해당 entry 제거, 저장 데이터로 FileRemoval 생성. undo: 기록 유효기간과 같은 현재 회차 확인 후 원래 index(목록 길이 이내)로 복원, 중복 asset/한도/권한 재검사. PM도 타인의 기록을 임의 입력으로 만들어낼 수 없다.
  7. start-round: PM/슈퍼 검사, 이전 currentRound sealedAt=now, currentRound+1의 entries/order 복사, createdBy/At 설정. 자료/Blob 복제 없음. reorder: PM/슈퍼 검사 후 현재 order만 변경한다.
  8. 이전 회차와 유효 removal이 참조한 버전은 유지한다. 불필요한 버전/asset 정리 후 schema 검증, revision+1, createdAssetIds/removalId 포함 receipt 반환. 실패 시 원래 state는 변하지 않는다.
- selector는 과거 회차를 readOnly=true로, 현재 목록 수를 entries.length로 계산한다. row.isInherited는 version.createdInRound < 표시 중인 round.number. canManage는 소유권 규칙, currentVersionId는 현재 entry를 조회한 ID 또는 null이다. canAdd는 프로젝트 접근 권한을 뜻하며 남은 슬롯은 별도 30-currentCount로 계산한다. canStartRound/canReorder는 PM·슈퍼 여부다. UI는 readOnly에서 직접 수정 대신 현재 회차 편집 경로만 제공한다.
- 빈 상태·조회·편집·원본 읽기에 같은 접근 함수 사용. admin-permissions.ts의 관리자 메뉴 CRUD ceiling에 파일 권한을 끼워 넣지 않는다.

## Acceptance Criteria
- [x] 타입/스키마/상수/순수 함수가 일치하며 undefined와 null 규칙이 고정된다.
- [x] PM·본인·다른 참여자·비참여자·슈퍼 관리자 분기가 서비스에서도 재사용 가능하다.
- [x] 이전 회차 불변, 최신 버전 단일 참조, 삭제 계승·undo, 버전 중복 제외 30개 계산이 정의된다.
- [x] 브라우저 API를 서버 import 시 평가하지 않는다. 기존 관리자·코멘트 정책은 바꾸지 않는다.

## Validation
- npm run typecheck — 추가 타입/함수/기존 import 모두 통과.
- npm run lint — 신규 미사용 변수, any/무분별한 unknown, 부수효과 없음.
- git diff --check — whitespace 오류 없음.
- 정적 전이표 검토: add 30/31, edit inherited 30개에서 교체, remove 후 start-round, archived copy restore 30/31, 다른 사람 자료 편집, 중복 version, stale revision. 코드 분기와 위 표를 비교한다. 실행하지 않은 테스트를 통과로 기록하지 않는다.

## Commit Message
~~~text
feat(files): 자료 모델과 권한 및 회차 전이 규칙 정의

Plan: 2026-11-03-workspace-file-upload
Phase: P01-file-workspace
Task: T01-domain-contracts

- 프로젝트별 자료와 불변 버전 및 현재 목록 계약 추가
- 파일 제한과 소유권 및 회차별 참조 규칙 통일
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서와 구현 파일을 함께 저장한 `Task: T01-domain-contracts` 커밋. 최종 해시는 로컬 current.md와 Git 이력에서 확인한다.

## Execution Result — 2026-11-03

- 신규 production 파일 10개에 계약·상수·오류·Zod 스키마·입력 검증·identity·mock 카탈로그·권한·순수 전이·selector를 구현했다. 기존 화면/관리자 seed/인증 Provider는 변경하지 않았다.
- `npm run typecheck`, `npm run lint`, `git diff --cached --check` 통과.
- Node + 설치된 tsx에 인라인 검증 코드를 전달해 78개 조건을 확인했다. 검증 파일과 tests/를 생성하지 않았다. 브라우저·서버·DB는 실행하지 않았다.
- 확인 범위: File 전역 없는 모듈 import, 30/31개 및 50MiB 경계, 일괄 등록, 참조 제외 집계, 현재 버전 교체, 과거 회차 복사, 삭제/되돌리기/만료/회차 계승, 소유권·PM·슈퍼·비참여자, stale revision/회차, 원본 및 입력 불변, 손상 참조·중복 원본·식별자 충돌, URL·파일명·지침 검증, 사용자 저장 범위·카탈로그 사본.
- 마지막 검토에서 파일명/지침 길이 오류와 용량/자료 개수 한도 오류를 구분했다. 전자는 VALIDATION, 후자는 LIMIT이며 4개 경계 확인을 추가했다.
- 정적 전이표의 add 30/31, 30개 상태의 상속 자료 편집, 삭제 후 회차 전환, 과거 자료 복사 30/31, 타인 편집, 중복 버전 및 오래된 revision을 구현 분기와 대조했다.
- 다음 경계: IndexedDB 원자적 저장·원본 읽기·실제 UI 연동은 T02 이후 작업이다. 현재 권한은 로컬 업무 규칙이며 서버 권한 검사를 대체하지 않는다. 브라우저 저장/화면 동작 검증을 완료한 것으로 해석하지 않는다.
- 범위 밖 추가 발견: 특이사항 없음. 이미 계획된 공통 인증 갱신 수정은 T03에 유지한다.
