# Task: T03 자산 CRUD·내용 버전·공개·복제 서비스

## Status: done

## Goal
관리자가 허용된 자산을 등록·수정·공개·복제·삭제하고, 내용 버전과 감사 기록을 함께 일관되게 저장한다.

## Decision Summary
- D03/D04/D08~D10의 소유권·공개·버전 정책을 한 저장소에 구현한다. 그룹/사용자 목록을 새 저장소로 복사하지 않으며 삭제한 자산도 기존 작업의 참조와 현재 권한 판단을 위해 남긴다.
- 선행 Task를 순서대로 완료한 후 실행한다. 모든 Task 검증 후 한 번 커밋하며 이 Task는 commit: deferred로 기록한다.

## Implementation

### I01. 기존 원자적 mock 서비스 확장
- Related Files:
  - services/admin/MockAdminDataService.ts :: constructor, getAssets/getAsset/getAssetAudience/executeAsset/importTemplate/resolveAsset/recordWorkActivity — 실제 계약 구현; modify
  - types/admin.ts :: AdminDataService — AssetDataService extends 및 type import; modify
  - types/admin-assets.ts :: AssetDataService, AssetRuntimeHost, StagedTemplateSource — 아래 인터페이스; modify
  - lib/admin/assets/permissions.ts :: canReadAsset, assertAssetRead, assertAssetWrite — 최신 디렉터리/권한 검사; new/modify
  - lib/admin/assets/selectors.ts :: selectAssets, assetDetail — 권한 적용 후 검색/집계/페이지; new
  - lib/admin/assets/commands.ts :: applyAssetCommand — draft에서만 수행하는 변환; new
  - config/admin-assets-seed.ts :: createAssetSeed — 직렬화 가능한 예시 Skill; new
  - config/admin-seed.ts :: createAdminSeed — 기존 사용자/그룹 생성 후 assets seed 연결; modify
  - services/admin/TemplateFileStore.ts :: importFile/getSource/retain/release — T02 제공; read-only

#### Details
- 기존 MockAdminDataService의 private actor(input)는 활성 user를 찾아 department를 확인하고 preview role을 유지한다. access는 CRUD 상한까지 검사한다. draft는 structuredClone 후 logicalNow를 1ms 증가시키며 commit은 state schema 검증/revision 증가/listener 알림을 한다. 이 경로에 자산을 통합하고 별도 이벤트 저장소를 만들지 않는다.
- constructor 옵션에 files?:TemplateFileStore를 추가하고 생략 시 new TemplateFileStore를 생성한다. T06 Runtime은 같은 files 인스턴스를 작업 서비스에도 전달한다. 기존 tests의 {seed,createId} 호출은 유지된다.
- Signatures:
```typescript
function canReadAsset(state:AdminStoreState, actor:AdminActor, asset:AssetRecord): boolean;
function assertAssetRead(state:AdminStoreState, actor:AdminActor, asset:AssetRecord): void;
function assertAssetWrite(state:AdminStoreState, actor:AdminActor, asset:AssetRecord, action:"update"|"delete"): void;
function selectAssets(state:AdminStoreState, actor:AdminActor, query:AssetQuery): AssetList;
function applyAssetCommand(state:AdminStoreState, actor:AdminActor, command:AssetCommand,
  context:{createId:()=>string; templateSources:ReadonlyMap<string,TemplateExtraction>}):
  {assetId:string; retainedFiles:{fileRefId:string;revisionId:string}[]; action:"create"|"update"|"delete"; detail:string};
function createAssetSeed(input:Pick<AdminStoreState,"users"|"groups"|"departments"|"logicalNow">): AssetStore;
```
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

### Skill 서식 계약과 기본값

lib/skills/schema.ts는 전체 SkillRulesSchema와 엔진 어댑터용 SkillEngineInputSchema를 정의한다. 외부 관리 공개 범위는 AssetVisibility만 신뢰한다. PoC의 vis는 엔진 호환값 {all:false,items:[]}로 조립하며 접근 판단에 사용하지 않는다. 이름/약칭/설명은 revision에서 공급한다.

```typescript
type PageType = "cover" | "toc" | "div" | "body" | "table" | "appx";
type FontWeight = "Regular" | "Medium" | "SemiBold" | "Bold" | "ExtraBold";
type Align = "왼쪽" | "가운데" | "오른쪽";
interface PageRule { title: number | null; body: number | null; lh: number | null; align: Align; rule: string }
interface SkillRules {
  font: { family: "Pretendard" | "Noto Sans KR" | "나눔스퀘어" | "맑은 고딕" | "본고딕";
    title: [number, FontWeight]; sub: [number, FontWeight]; body: [number, FontWeight]; lh: number };
  gap: { tb: number; bt: number; para: number };
  table: { padV: number; padH: number; rowH: number; text: Align; num: Align;
    head: "가운데 · 굵게" | "왼쪽 · 굵게" | "가운데 · 배경색" | "왼쪽 · 배경색" };
  shape: { snap: "안내선 · 그리드에 맞춤" | "안내선에만 맞춤" | "자유 배치";
    img: "원본 비율 유지" | "영역 채우기 (잘라내기)" | "영역에 맞춤 (여백 허용)";
    align: "위쪽 맞춤" | "가운데 맞춤" | "아래쪽 맞춤"; min: number };
  mg: [number, number, number, number]; cols: number; rows: number; grid: number;
  guard: { shrink: boolean; split: boolean; overlap: boolean; inGuide: boolean; tableRows: number };
  pt: Record<PageType, PageRule>;
}
interface SkillEngineInput extends SkillRules {
  name: string; short: string; desc: string;
  vis: { all: boolean; items: { t: "team" | "user" | "group"; v: string }[] };
}
```

수치 선택값은 자유 숫자가 아니라 다음 집합의 원소다. 모든 수치는 finite를 먼저 검사한다.

| 필드 | 허용값 |
| --- | --- |
| font.title[0] | 20,22,24,26,28,32,36,40 |
| font.sub[0] | 14,16,18,20,22,24 |
| font.body[0] | 10,11,12,13,14,16,18 |
| font.lh / pt.*.lh | 1,1.2,1.3,1.4,1.5,1.6,1.8 |
| gap.tb / gap.bt | .2,.3,.4,.5,.6,.8,1,1.2,1.5 |
| gap.para | 0,2,4,6,8,10,12 |
| table.padV / padH | .05,.1,.15,.2,.25,.3,.4 |
| table.rowH | .5,.6,.7,.8,.9,1,1.2 |
| shape.min | 2,3,4,6 |
| mg (상·좌·하·우, cm) | .5,.8,1,1.2,1.5,1.8,2,2.5 |
| cols / rows / grid | cols=6,8,12,16; rows=2,3,4,6; grid=.1,.2,.25,.5,1 |
| guard.tableRows | 8,10,12,15,20 |
| pt.*.title / body | title 허용값 +44,48; body 허용값 +9; null은 공통 규칙 상속 |

pt.*.rule은 유형별로 다음만 허용한다: cover=['사업명 2줄까지 자동 줄바꿈','로고 우상단 고정','본문 규칙 미적용']; toc=['장 번호 Ⅰ·Ⅱ·Ⅲ','장 번호 01·02·03','페이지 번호 오른쪽 정렬']; div=['장 번호 크게 + 한 줄 메시지','장 제목만']; body=['리딩 메시지 + 2~3블록','리딩 메시지 + 자유 배치']; table=['머리글 반복 · 행 단위 분할','열 너비 내용에 맞춤']; appx=['작은 글자 허용 (최소 9pt)','출처 표기 필수'].

기본값: font=Pretendard/title[28,Bold]/sub[18,SemiBold]/body[14,Regular]/lh1.4; gap=.8/.5/6; table=.15/.25/.8/왼쪽/오른쪽/가운데 · 굵게; shape=첫 snap/첫 img/위쪽 맞춤/min4; mg=[1.2,1.5,1,1.5], cols12/rows3/grid.25; guard는 네 boolean=true, tableRows15.
페이지 기본값은 각 유형 첫 rule, align=왼쪽, title/body/lh=null에서 시작하고 cover=(40,null,null,가운데), toc=(null,16,1.6), div=(36,null,null), table=(null,11,1.2), appx=(null,10,1.3)만 덮어쓴다.
출력 지원 제한: split·표 분할·로고 자동 배치처럼 저장 가능한 규칙이라도 기존 PPT 변환에서 지원되지 않는 항목은 설정 도움말/보고서에 적용 제한을 표시한다. UI 선택 가능을 엔진 구현 완료로 표현하지 않는다.

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

- Execution Flow:
  1. actor(raw)/AssetCommandSchema 검증 및 권한 검사. 파일 등록 명령은 본인 staged 또는 해당 자산의 기존 fileRefId를 확인한다. 검증에 필요한 자료 준비 후 상태/version을 다시 검사한다.
  2. 최신 state의 draft를 만든다. create는 서버 역할에 해당하는 mock 서비스가 ID/작성자/시간/버전을 결정한다. 클라이언트가 revision/createdBy/extraction을 지정할 수 없다.
  3. update는 기존 row.version CAS 검사 후 이름/약칭/설명/서식 또는 파일/mapping이 바뀌면 currentRevision+1의 새 revision을 추가한다. status/visibility만 바뀌면 record.version만 증가시킨다. 내용과 메타데이터를 같은 draft에서 원자 저장하며 기존 revision은 수정하지 않는다. 내용과 메타데이터가 모두 동일할 때만 revision/audit를 추가하지 않는 no-op receipt를 반환한다.
  4. set visibility/status/delete는 record.version/updatedAt만 변경한다. delete는 deletedAt을 기록한다. set-asset-visibility는 관리 권한이 있는 삭제 자산에도 서비스 내부에서 적용 가능하도록 하여 tombstone이 영구적인 ACL 허용증이 되지 않게 한다. 일반 목록에는 삭제 자산을 노출하지 않는다.
  5. duplicate는 원본 read+신규 create를 검사하고 현재 revision을 복사한다. 새 부서 소유/ID/내용 revision/기본 비공개·inactive로 만들며 기존 파일 bytes는 불변 보유 참조만 추가한다. 원본에 대한 write는 요구하지 않는다.
  6. draft schema 검증 → 필요한 파일 retain → 같은 draft에 감사 기록 → commit. 실패는 retain rollback, draft 폐기. 이미 commit된 사용자 표시 오류 때문에 데이터를 되돌리지 않는다.
- 공개 범위 변경과 동시 수정은 CONFLICT/FORBIDDEN 등 기존 AdminDataError를 사용한다. 소유 부서는 생성 후 UI/일반 update로 이전하지 않는다.
- template update는 extraction을 files.getSource에서 읽고 pageTypes는 모든 실제 slide index만, roles/excluded는 실제 객체/공유 대상 ID만 허용한다. 삭제/파일 교체로 옛 revision의 파일 보유를 해제하지 않는다.
- 새 작업/latest용 resolveAsset은 active이고 삭제되지 않은 최신 revision, 기존 작업용은 정확한 과거 revision을 제공하되 최신 read ACL을 재검사한다. 타입이나 revisionId만 바꿔 다른 자산의 내용을 요청하면 거절한다.
- getAssetAudience는 부서 관리자에게 기존 getDirectory/getGroups 권한을 열지 않는 별도 최소 DTO다. deleted/locked 사용자나 deleted 그룹은 새 공유 대상으로 선택하지 않는다. 저장되어 있던 그룹이 삭제되면 memberIds를 남겼어도 접근은 실패한다.

### I02. 예시·감사 로그·서비스 정책 테스트
- Related Files:
  - tests/services/admin/assets.test.ts — CRUD/소유/공개/복제; new
  - tests/services/admin/asset-versions.test.ts — CAS/불변/상태·ACL 전이; new
  - tests/lib/admin/assets/selectors.test.ts — 필터/집계/후보 노출; new
  - tests/services/admin/MockAdminDataService.test.ts — 기존 관리자 회귀; read-only

#### Details
- seed는 기존 실제 생성된 users/departments/groups를 참조한다. 존재하지 않는 user/group ID를 하드코딩하지 않는다. 기본 Skill 4개는 전사 공개 활성(첫 부서), 자기 부서 활성, 다른 부서 공개 활성, 비활성 예시다. 각 revision은 DEFAULT_SKILL_RULES 복사본이다.
- Template 기본 목록은 등록 전 빈 상태다. '예시 파일로 시작'은 T08에서 합성 native-template.pptx를 실제 import 경로에 통과시켜 등록한다. 파일 없이 추출 완료인 가짜 Template을 seed에 넣지 않는다.
- addAudit를 재사용한다. CRUD 기록의 departmentId는 자산 소유 부서, 다른 부서의 apply/export는 행위자 부서로 남긴다. tokens=0, usageId=null, 논리 시계를 사용하고 실제 비용/모델 호출을 생성하지 않는다.
- recordWorkActivity는 template/skill refs 모두 현재 read를 검사한 뒤 template 리소스 대상 workId에 action=apply/export를 한 번 기록한다. detail에 두 자산 ID와 revision을 넣고 파일 내용/바이트는 로그에 넣지 않는다.
- 실패한 CRUD는 성공 audit를 만들지 않고 revision/데이터가 유지된다. 성공 apply의 로그는 T05가 결과 확정 시에만 요청한다.
- 테스트: 다른 부서 공개 조회/쓰기 거절, 전사 공개 후 원부서 편집, 개인/부서/현재그룹 공유, group 삭제/탈퇴 즉시 거절, create payload 소유부서/작성자 변조, 권한 상한, 복제 독립·원본 수정 후 사본 유지, stale version, 상태 전환에서 contentRevision 유지, 파일 교체 후 옛 파일 보유, 반환 객체 수정이 원본을 변경하지 않음.

## Acceptance Criteria
- [x] 부서·공개 범위·CRUD를 목록/상세/변경/복제에서 동일하게 적용한다.
- [x] 새 버전은 추가만 하고 상태·ACL 변경과 분리한다.
- [x] Template 파일 요약을 클라이언트 입력으로 위조할 수 없다.
- [x] 기존 관리자 state와 하나의 로그/revision 흐름을 사용한다.
- [x] 삭제/복제 후 보유 참조와 원본 버전이 유지된다.

## Validation
- `npm.cmd test -- tests/services/admin/assets.test.ts tests/services/admin/asset-versions.test.ts tests/lib/admin/assets/selectors.test.ts tests/services/admin/MockAdminDataService.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): 자산 권한과 불변 버전 CRUD 서비스 구현

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T03-asset-service

- 관리자가 허용된 자산을 등록·수정·공개·복제·삭제하고, 내용 버전과 감사 기록을 함께 일관되게 저장한다.
- 정책 경계와 기존 관리자 동작 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: deferred (전체 검증 후 통합 커밋)


## 실행 검증 기록
- 대상 4개 파일 18개 테스트, typecheck, lint 통과.
