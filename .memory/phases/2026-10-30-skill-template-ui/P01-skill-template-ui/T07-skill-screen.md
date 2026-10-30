# Task: T07 Skill 목록과 9영역 편집 화면

## Status: done

## Goal
Skill 메뉴에서 권한에 맞는 목록·상세·9개 영역 편집·복제·공개·활성/삭제가 동작하며 저장한 규칙을 실제 적용 테스트에서 재사용할 수 있게 한다.

## Decision Summary
- D02/D03/D14. 기획 HTML의 실제 9영역을 기준으로 기존 관리자 컴포넌트를 사용한다. Skill은 설정 데이터이며 AI Skill 실행기가 아니다.
- 선행 Task 완료 후 순차 구현한다. 중간 커밋은 deferred로 기록하고 T10에서 통합 커밋한다.

## Implementation

### I01. Skill 관리 화면 및 편집 상태
- Related Files:
  - components/admin/skills/SkillsPage.tsx :: SkillsPage — 목록/상세/편집 연결; new
  - components/admin/skills/SkillEditorDialog.tsx :: SkillEditorDialog — 전체 draft 및 저장; new
  - components/admin/skills/SkillRuleFields.tsx :: SkillRuleFields — 2~8 영역 폼; new
  - components/admin/skills/SkillStylePreview.tsx :: SkillStylePreview — 정적 서식 예시; new
  - components/admin/assets/AssetListPanel.tsx, AssetVisibilityField.tsx, AssetDeleteDialog.tsx — T06 공통 UI; read-only
  - hooks/admin/use-assets.ts — T06 서비스 훅; read-only
  - config/skill-options.ts, lib/skills/schema.ts — T01 규칙/옵션 검증; read-only

#### Details
```typescript
function SkillsPage(): React.ReactElement;
interface SkillEditorDialogProps { open:boolean; detail:AssetDetail|null; readOnly:boolean; onClose():void }
function SkillEditorDialog(props:SkillEditorDialogProps): React.ReactElement;
interface SkillRuleFieldsProps { value:SkillRules; disabled:boolean;
  fieldErrors:Record<string,string>; onChange(value:SkillRules):void }
function SkillRuleFields(props:SkillRuleFieldsProps): React.ReactElement;
function SkillStylePreview(props:{rules:SkillRules}): React.ReactElement;
```
- page state는 query, selectedId:string|null, mode:"detail"|"create"|"edit"|null, deletion target다. 실제 자산 목록/상세는 useAssets/useAsset로 가져오고 별도 배열을 만들지 않는다.
- editor draft는 {value:SkillDraft,status:AssetStatus,visibility:AssetVisibility,ownerDepartmentId:string|null,baseVersion:number|null}. detail을 처음 열 때만 복사하고 background refetch가 미저장 입력을 덮어쓰지 않게 한다.
- 수정 폼은 AssetRecord.version을 baseVersion으로 보관한다. Content revision 숫자를 CAS 값으로 보내지 않는다. 취소/닫기는 dirty 상태이면 기존 입력을 버리는지 같은 대화상자 안에서 확인한다.
- 1영역=이름/약칭/설명, 2=글꼴·제목/리딩/본문 크기와 굵기·줄 간격, 3=제목-본문/블록/문단 간격, 4=표 padding/행 높이/문자/숫자 정렬/헤더, 5=도형 snap·이미지 맞춤·정렬·최소열, 6=상좌하우 여백·열/행/그리드, 7=축소/분할/겹침/가이드/최대표행, 8=6개 페이지 유형별 override, 9=공개 범위다. 상태/소유 부서는 관리 정보에 제공하며 소유부서 수정은 막는다.
- 모든 숫자/enum은 아래 계약의 허용값을 Fluent Select로 제공한다. null 페이지 override는 '공통 규칙' 옵션으로 저장한다. 빈 값을 0이나 NaN으로 바꾸지 않는다.
- 지원하지 않는 기존 PPT 자동 분할 등은 규칙을 저장하되 '기존 PPT 적용에서는 원본 유지/적용 제외 사유로 안내'라는 도움말을 해당 필드에 둔다.
- SkillStylePreview는 sample 제목/문단/표가 선택 서식에 따라 어떻게 보이는지 보여주는 정적 예시다. 실제 PPT 분석 결과나 PowerPoint 정밀 렌더링처럼 표시하지 않는다. 새 샘플 PPT 생성 패키지를 추가하지 않는다.
- 저장 precondition=현재 read/create 또는 read/update 권한, 자기 부서/슈퍼 관리자 범위, Zod strict draft 통과. create는 create-skill, edit는 update-skill(target,value,status,visibility) 한 명령으로 내용/공개/상태를 원자 저장한다.
- 서비스는 내용 동일·메타만 변경이면 내용 revision을 새로 만들지 않는다. 모두 동일이면 저장 버튼 disabled, 서비스도 no-op이다. CONFLICT는 입력을 유지하고 '최신 내용 불러오기'를 명시적으로 선택할 때만 다시 초기화한다.
- 공개 범위 변경 저장 즉시 기존 작업 접근이 달라질 수 있음을 필드 도움말로 표시한다. 단순 서식 변경은 기존 작업에 자동 반영되지 않는다는 안내도 제공한다.
- 권한 회수 시 저장·복제·삭제 등 액션을 숨기고 민감한 detail도 current grant/asset 접근 판정에 따라 가린다. 비활성 예시를 '삭제'로 오인하지 않는다.
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


### I02. 실제 관리자 경로 연결 및 회귀
- Related Files:
  - components/admin/AdminScreenRouter.tsx :: AdminScreenRouterProps, ScreenContent — skills 분기 및 grants.skills.read; modify
  - app/(authenticated)/workspace/[screen]/page.tsx :: WorkspaceScreenPage — skills를 실화면 목록에 추가; modify
  - tests/app/workspace/screen.test.ts — skills 실화면/서버 가드 기대치; modify
  - tests/components/admin/skill-access.test.ts — 액션 조건부 렌더링; new
  - config/sidebar.ts — 이미 존재하는 Skill 메뉴; read-only

#### Details
- 현재 router union은 users|policy|audit|dashboard다. skills만 추가하고 requiredRole 가드를 우회하지 않는다. template 연결은 T08에서 한다.
- authEnabled=true일 때 서버 requireRole("Admin","/workspace/skills")를 기다린 뒤 화면을 반환한다. 일반 사용자에게 sidebar 항목을 표시하지 않는 기존 규칙을 보존한다.
- 목록 row의 action render는 capabilities와 최신 grant를 모두 확인한다. 다른 부서 공개 자산의 상세는 readOnly=true이며 복제는 read+create가 있을 때만 표시한다.
- renderToStaticMarkup/createElement를 사용하는 기존 Vitest 패턴으로 hook data를 mock하여 read-only 액션 부재를 검사한다. 브라우저에서 모달 포커스/입력/토글/반응형의 실제 작동은 T10에서 별도로 검증한다.
- 조회/변경 중 상태, 빈 목록, 필터 결과 없음, 오류 재시도, 저장 충돌 문구가 구분되어야 한다. 임시 저장 안내는 AdminPage dataNotice로 전달한다.

## Acceptance Criteria
- [x] 9영역 전체를 편집·검증·저장하고 다시 조회할 수 있다.
- [x] 다른 부서 공개 자산은 수정할 수 없고 복제는 권한에 따라 제공된다.
- [x] 상태/공개/내용 동시 저장이 하나의 명령으로 처리된다.
- [x] 충돌/실패 시 입력을 잃지 않으며 기존 서버 가드를 보존한다.
- [x] 정적 서식 예시와 실제 PPT 변환을 구분한다.

## Validation
- `npm.cmd test -- tests/app/workspace/screen.test.ts tests/components/admin/skill-access.test.ts tests/services/admin/assets.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): Skill 9영역 편집과 관리자 화면 연결

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T07-skill-screen

- Skill 메뉴에서 권한에 맞는 목록·상세·9개 영역 편집·복제·공개·활성/삭제가 동작하며 저장한 규칙을 실제 적용 테스트에서 재사용할 수 있게 한다.
- 권한·버전·파일 동작 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 790835657f82a27871ff5e1ec80632ca115c69c7 (T01~T10 단일 통합 커밋)


## 실행 검증 기록
- 화면/서버 가드/자산 3개 파일 41개 테스트, typecheck, lint 통과. 다른 부서 공개 자산 쓰기 액션 미렌더링, 9영역 편집·제한 안내 연결. 실제 모달·반응형 조작은 T10에서 검증.
