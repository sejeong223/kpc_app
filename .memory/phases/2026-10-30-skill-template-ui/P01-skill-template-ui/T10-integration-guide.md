# Task: T10 통합 검증·디자인 HTML·단일 커밋

## Status: done

## Goal
새 메뉴의 실제 파일/권한/버전 시나리오를 통합 검증하고, 교체 가능한 디자인 컴포넌트를 HTML로 정리한 뒤 이번 변경만 한 번 커밋한다.

## Decision Summary
- D14/D16. 기존 PoC 검증 이력은 현재 앱 통과를 대신하지 않는다. 새 작업 검증과 기존 관리자 T09 미완료 기록을 구분하고 기존 변경을 커밋에 섞지 않는다.
- 선행 Task 완료 후 순차 실행한다. 모든 Task 검증을 마친 뒤 한 번 커밋한다.

## Implementation

### I01. 통합 자동 검사와 검증 결과
- Related Files:
  - tests/integration/skill-template-workflow.test.ts :: Skill/Template 연결 시나리오 — 실제 서비스·작은 합성 PPT; new
  - tests/fixtures/pptx/README.md — 원본/해시/제한 기록; modify
  - .memory/reports/2026-10-30-skill-template-validation.md — 자동/브라우저/출력 검증 결과; new
  - .memory/reports/2026-10-30-skill-template-plan-notes.md — 계획 때 확인한 출처/기존 상태; read-only
  - tests/app/workspace/screen.test.ts, tests/config/sidebar.test.ts — 서버/메뉴 경계; read-only

#### Details
- Signatures & Types: 이 Task는 신규 업무 API를 추가하지 않는다. 아래 시나리오의 fixture builder는 createAdminSeed, MockAdminDataService({seed,files}), TemplateFileStore, TemplateWorkService({host,files,actor,apply?})를 사용한다. 파일은 File([new Uint8Array(buffer).buffer],"sample.pptx")로 전달한다.
- actor fixture는 기존 user id/departmentId와 role의 일치를 지키고 createAdminSeed의 실제 사용자 중 활성 계정을 선택한다. 예시 현재 계정은 u-self, AI사업본부=d-ai, 산업본부=d-industry다. 별도 조직 배열을 만들지 않는다.
- 테스트는 자산 ID를 command receipt에서 읽는다. 외부 서비스/Cosmos/Blob/AI 호출을 mock 성공시키는 새 기능을 만들지 않는다.
- 필수 통합 시나리오:
  1. 슈퍼 관리자/부서 관리자/일반 사용자별 메뉴 및 직접 URL 가드, CRUD 표 상한.
  2. 실제 예시 PPT 등록 → Skill 등록 → 작업 생성 → pinned 적용 → 결과 재분석. 문구/슬라이드수/관계/미변경 파트 보존, apply audit 1건, tokens=0, usage 레코드 증가 없음.
  3. 다른 부서 전사 공개 자산 조회/적용 가능, update/delete 불가, read+create로 복제 후 사본 수정 가능.
  4. 원본 content v2 생성 후 기존 작업 refs/bytes/download 유지 → 최신 재적용 성공 때만 새 refs 반영. 실패한 latest 시 기존 성공 다운로드 유지.
  5. inactive/delete 후 기존 작업 재적용/다운로드 가능, 새 작업과 latest 불가.
  6. 전사→특정부서 제한, 그룹 탈퇴/삭제, 부서 이동, 계정 잠금, 역할 read 해제 때 기존 작업/미리보기/다운로드 차단. 지연 처리 완료가 성공으로 게시되지 않음.
  7. 공유 master/layout 편집은 연결된 전체 페이지에 영향, 등록 Template revision은 변하지 않음. 지원하지 않는 요소는 원본 유지+사유, 손상 파일은 전체 실패.
  8. 메뉴 이동 후 작업 복귀, identity 교체 후 이전 work/file 접근 불가, 새로고침 초기화, 결과/파일 참조 정리.
- Validation report 필드: 실행 날짜/KST, git 기준, node/npm 버전, 명령/exit code/테스트 수, fixture 해시, 자동 시나리오 표, 브라우저 시나리오 표, 출력 파일 확인 수준, 실패/미검증/범위 밖, 추가된 의존성과 원본 보존.
- 자동검사를 통과하면 변경 없는 상태에서 반복 full suite를 여러 번 돌리지 않는다. 실패를 고친 경우 영향받은 검사 후 최종 전체 검사를 기록한다.
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


### I02. 브라우저와 결과 파일 확인
- Related Files:
  - .memory/reports/2026-10-30-skill-template-validation.md — 증거와 실제 결과; modify
  - .memory/reports/2026-10-30-skill-template-evidence/ — 스크린샷/작은 검증 출력; new (실행 단계)

#### Details
- 허용된 브라우저 도구로 로컬 개발 서버의 /workspace/skills, /workspace/templates를 연다. 포트 충돌이면 현재 프로세스를 확인하고 다른 사용자의 서버를 종료하지 않는다.
- 기본 확인 viewport=1440x900,1280x800,1024x768,768x1024,390x844,360x740. 각 두 화면의 목록/편집, Template 적용 테스트/공유 편집/결과를 확인한다. 좁은 화면 가로 넘침, 모달 본문 스크롤, footer 버튼 도달, 포커스 반환, Tab/Escape, 허용 액션 조건부 렌더링, 콘솔/hydration 오류를 검사한다.
- 권한 preview와 실제 서버 가드 테스트를 구분해 기록한다. 개발 auth disabled 시연을 실제 Entra 보안 통과로 부르지 않는다.
- 파일 선택/예시 import/취소/다른 파일로 교체/다운로드까지 실제 interaction을 수행한다. 내려받은 파일의 존재·크기·ZIP 필수 파트 및 XML을 검사한다. 가능한 환경에서 PowerPoint로 열어 복구 경고/문구/레이아웃도 확인하고 viewer/버전을 기록한다.
- PowerPoint가 없는 경우 구조 자동 검증과 시각 출력 미검증을 분리한다. 브라우저 자체를 못 열거나 필수 UI interaction을 수행하지 못하면 T10을 done으로 표시하지 않는다. 도구 실패·자동 승인 거절이 있으면 이유를 기록하고 우회하지 않는다.
- 기존 관리자 4개 화면은 새로운 리소스/감사 레이블 추가로 깨지지 않았는지 회귀 smoke를 한다. 기존 T09의 모든 미완료 항목을 확인하지 않고 그 Task를 완료 처리하지 않는다.
- 250 MiB/200장 한도는 상한 경계 테스트로 검증한다. 204 MB 이상 대용량 실파일 검증은 환경 여유가 있을 때 별도 기록하며 제한값을 처리시간·메모리 보장으로 표현하지 않는다. 대용량 PPT를 커밋하지 않는다.

### I03. 디자인 컴포넌트 HTML 가이드
- Related Files:
  - .memory/reports/2026-10-30-skill-template-design-components.html — 독립 실행 가이드; new
  - .memory/reports/2026-10-29-admin-design-components.html — 기존 가이드의 구성/토큰 참고; read-only
  - components/admin/assets/, components/admin/skills/, components/admin/templates/, app/admin-theme.css — 실제 구현과 매핑; read-only

#### Details
- HTML은 UTF-8/lang=ko, 외부 CDN/원격 폰트/빌드 없이 열리는 단일 파일이다. 실제 인터뷰 최종 디자인 확정본이나 실행 앱 자체로 표현하지 않는다.
- 필수 구성: 전체 사용자 흐름, 공통/업무 전용 컴포넌트 구분, 실제 파일 경로/props 요약, 토큰 표, 자산 테이블·필터·공개 범위·버전 상태 예시, 9영역 Skill 폼 배치, Template 추출/편집 배치, 적용 테스트 전후 비교/부분 적용 상태, 권한별 액션 표, 디자인 변경 시 수정 위치, mock/실파일/후속 연동 경계.
- 디자인 값(색상/간격/모서리/타이포)을 바꾸는 경우와 화면 정보 구조를 바꾸는 경우의 수정 범위 차이를 설명한다. 원본 비활성/삭제 vs 권한 회수 상태 표, 새 버전 알림 vs 미적용 옵션의 차이를 예시로 보여준다.
- HTML의 예시 동작은 문서 탐색/상태 비교에 한정한다. 사용자나 파일을 서버에 보내지 않는다. 실제 사용자 개인정보·업로드 PPT 내용·인증값을 넣지 않는다.
- 완성 파일을 브라우저로 열어 넓은/좁은 화면, anchor navigation, 글자 겹침을 확인하고 report에 경로를 남긴다. 정적 스크린샷만으로 작동하는 앱 검증을 대체하지 않는다.

### I04. 상태 동기화와 단일 커밋
- Related Files:
  - .memory/phases/2026-10-30-skill-template-ui/P01-skill-template-ui/T01~T10 Task 문서 — 상태/검증/commit; modify
  - .memory/phases/2026-10-30-skill-template-ui/P01-skill-template-ui/phase.md — done 10/10; modify (실제 통과 후)
  - .memory/plans/2026-10-30-skill-template-ui.md, .memory/current.md — 완료/다음 상태; modify (실제 통과 후)
  - package-lock.json — 이번 의존성 변경과 기존 수정 분리; review only

#### Details
1. T01~T09의 done/validation 증거를 확인하고 T10 필수 검증을 통과한 경우에만 모두 done으로 동기화한다. 구현 완료와 검증 미완료를 구분한다.
2. git diff --check 및 git diff --stat/--name-only를 확인한다. user 기존 package-lock libc 삭제, 기존 기록, 이 계획 밖 파일을 임의로 stage하지 않는다. 새 jszip/xmldom 의존성 변경만 기존 수정과 분리해 index에 올린다. 작업 트리 기존 변경은 그대로 남긴다.
3. commit 전 Task들에는 commit: deferred (통합 커밋 대기)를 기록한 뒤 사용자 요청대로 한 번 커밋한다. 메시지는 아래 통합 메시지다. push하지 않는다.
4. 커밋 SHA를 알게 된 후 Progress 기록에 같은 실제 SHA를 남긴다. 자기 참조 SHA를 커밋 내부에 넣기 위해 amend를 반복하지 않는다. 기록만 후속 미커밋으로 남으면 최종 응답에서 사실대로 보고한다.
5. 기존 관리자 T09는 독립 기록을 유지한다. 새 계획 완료를 과거 브라우저 검증 완료로 취급하지 않는다.


## Acceptance Criteria
- [x] 전체 자동 검증과 필수 브라우저 interaction이 통과하고 증거를 기록한다.
- [x] 실제 출력 구조 보존과 시각 확인 수준을 구분해 보고한다.
- [x] 독립 HTML 가이드가 실제 컴포넌트/파일과 일치하며 열람 검증을 마친다.
- [x] 기존 변경을 보존한 채 이번 범위만 한 번 커밋한다.
- [x] current/phase/task 진행률이 실제 완료 상태와 일치한다.

## Validation
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.
- `npm.cmd test` — 오류 없이 통과한다.
- `npm.cmd run build` — 오류 없이 통과한다.
- `git diff --check` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): Skill·Template 관리와 실제 PPT 적용 테스트 구현

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Tasks: T01-T10

- 부서별 자산 권한과 고정 버전 재적용 정책 구현
- PPT 분석·변환·공유 디자인·전후 비교 연결
- 공통 디자인 컴포넌트 가이드와 검증 기록 작성
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: deferred (전체 검증 후 통합 커밋)


## 실행 검증 기록
- typecheck/lint/build 통과, 최종 전체 57개 파일 392개 테스트 통과. 브라우저 6개 크기, 등록/공유 편집/고정·최신 적용/다운로드/권한/메뉴 복귀/초기화 확인.
- 실제 출력 37,637 bytes, XML 34개 및 미변경 파트 32개 확인. PowerPoint 16.0.20527.20088 읽기 전용 열기·4장 PNG export/육안 확인. 시각 검증의 제한은 보고서에 별도 기록.
- 오프라인 HTML의 375/768/1440px, 탐색·검색·상태 비교·테마 확인. 공통 모달 포커스 복귀를 수정하고 브라우저 재검증.
- 상세: [검증 기록](../../../reports/2026-10-30-skill-template-validation.md), [디자인 HTML](../../../reports/2026-10-30-skill-template-design-components.html).
