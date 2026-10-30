# Task: T01 자산·Skill 계약과 역할별 권한

## Status: done

## Goal
Skill·Template의 관리 정보와 불변 내용 버전을 분리하고, 기존 관리자 검증을 깨뜨리지 않는 타입·권한 기반을 만든다.

## Decision Summary
- 확정 D02~D04/D08~D10/D13의 데이터 계약이다. 기존 사용자/그룹/권한을 재사용하며 아직 서비스 인터페이스에 미구현 메서드를 추가하지 않는다.
- Plan: 2026-10-30-skill-template-ui / Phase: P01-skill-template-ui. 선행 Task가 순서대로 완료된 상태에서 실행한다. 모든 Task 검증 후 단일 커밋하며 현재 Task에서는 commit을 deferred로 기록한다.

## Implementation

### I01. 스키마·타입·기본값
- Related Files:
  - lib/admin/record-schema.ts :: IdSchema, NameSchema, IsoSchema, AdminRecordSchema — 기존 기본 스키마 분리; new
  - lib/admin/schemas.ts :: AdminResourceSchema, AuditActionSchema, AdminStoreStateSchema — 자산 상태와 리소스 연결; modify
  - lib/skills/schema.ts :: SkillRulesSchema, SkillEngineInputSchema, PageTypeSchema, ObjectRoleSchema — 9영역 설정의 서식 계약; new
  - config/skill-options.ts :: SKILL_OPTIONS, PAGE_TYPES, PAGE_LABELS, PAGE_RULES, DEFAULT_SKILL_RULES — 아래 선택값/기본값; new
  - lib/admin/assets/schemas.ts :: AssetRecordSchema, AssetRevisionSchema, AssetStoreSchema, AssetCommandSchema, AssetQuerySchema, AssetListSchema, AssetDetailSchema — 엄격한 입력/출력; new
  - types/admin-assets.ts :: 아래 자산 계약 타입 — Zod 추론 타입 재수출; new
  - types/admin.ts :: AdminStoreState — 기존 재수출 유지; read-only
  - config/admin-seed.ts :: createAdminSeed — assets 빈 배열 컨테이너를 초기 state에 추가; modify

#### Details
- Signatures & Types / Data & Schema Fields: 뒤의 공통 자산·Skill 계약 전체가 정확한 모델/필드/nullable/기본값이다. AssetKind를 skills/templates 리소스에 매핑하는 순수 함수 assetResource(kind:AssetKind):"skills"|"templates"도 lib/admin/assets/permissions.ts에 만든다.
- 기존 lib/admin/schemas.ts 맨 위 Id/Name/Iso/AdminRecord를 record-schema.ts로 옮겨 그대로 import 및 AdminRecordSchema 재수출한다. assets/schemas.ts는 record-schema.ts와 skills/schema.ts만 런타임 import한다. AdminStoreStateSchema가 assets를 import하므로 반대로 assets/schemas.ts에서 admin/schemas.ts를 런타임 import하지 않는다.
- 공통 타입 중 AdminRecord/PageResult/VersionedRef는 type import만 허용한다. AssetQuery의 pagination shape와 command의 target은 leaf record-schema의 동일 제약을 사용한다.
- SkillEngineInput은 rules 전체에서 name/short/desc/vis를 추가한 Container다. SkillRules는 omit으로 파생하되, refine된 Zod 객체에 omit을 호출해 오류를 만들지 않도록 페이지별 rule 검증을 pt 하위에 배치하거나 refine 이전 base shape에서 파생한다.
- 입력 추가 필드·NaN/Infinity·범위 밖 선택값을 거절하고 UI에 한국어 오류 경로를 제공한다. 필수 page type 6개, margin 4개, font tuple 2개가 누락되면 거절한다.
- AssetRecord.version/currentRevision=1, deletedAt=null이 생성 기본값이다. 타입과 schema를 별도로 손으로 중복 유지하지 않는다.
- AdminStoreStateSchema.assets={records:[],skillRevisions:[],templateRevisions:[]}를 필수 필드로 추가하고 seed도 함께 바꾼다. 개별 state를 직접 만드는 기존 테스트가 있다면 동일 필드를 추가한다. 아직 실제 Template 파일을 넣지 않는다.
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


### I02. 권한 상한과 감사 레이블
- Related Files:
  - config/admin-permissions.ts :: ADMIN_RESOURCE_LABELS, ceiling, CRUD_CEILING — skills/templates 리소스와 역할 상한; modify
  - config/admin-labels.ts :: AUDIT_ACTION_LABELS — apply="서식 적용" 레이블; modify
  - lib/admin/command-validation.ts :: validateGrants — 기존 전체 리소스 반복 검증; read-only
  - components/admin/users/RolePermissionsPanel.tsx :: RolePermissionsPanel — 상수 기반 자동 행 추가를 확인; read-only
  - tests/lib/admin/assets/domain.test.ts, tests/lib/admin/assets/permissions.test.ts — 타입/권한 경계; new
  - tests/lib/admin/seed.test.ts, tests/lib/admin/permissions.test.ts — 기존 seed/상한 회귀; modify

#### Details
1. AdminResourceSchema에 skills/templates를 추가하고 슈퍼 관리자와 부서 관리자 모두 4 CRUD 상한=true, 일반 사용자 모두=false로 둔다. 부서 관리자 null 부서는 기존 canPerform에서 차단한다.
2. 다른 리소스 상한은 변경하지 않는다. 부서 관리자 groups/users 수정 권한을 이번 추가로 열어서는 안 된다.
3. AuditActionSchema에 apply를 추가한다. 기존 generate="AI 생성"은 그대로 둬서 규칙 기반 PPT 변환을 AI 활동/토큰으로 오인하지 않게 한다. AuditResourceSchema는 AdminResourceSchema를 포함하므로 신규 리소스를 자동 포함한다.
4. 역할별 z.record는 모든 리소스 키가 필요하다. DEFAULT_ROLE_GRANTS와 테스트 fixture를 함께 확장하고 슈퍼 관리자 permissions read/update 고정 제약을 보존한다.
5. 검증 실패는 기존 서비스가 사용하는 AdminDataError/validationError로 연결할 수 있는 ZodError를 제공한다. 이 Task에는 실제 CRUD 핸들러를 추가하지 않는다.

## Acceptance Criteria
- [x] 9영역 필드와 옵션이 명시된 기본값으로 검증된다.
- [x] 새 리소스가 권한표에 추가되며 기존 리소스 상한은 유지된다.
- [x] assets 상태 추가 후 기존 seed와 서비스의 compile/test가 유지된다.
- [x] 런타임 순환 import와 내부 any/unknown이 없다.

## Validation
- `npm.cmd test -- tests/lib/admin/assets/domain.test.ts tests/lib/admin/assets/permissions.test.ts tests/lib/admin/seed.test.ts tests/lib/admin/permissions.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): Skill·Template 계약과 역할별 권한 추가

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T01-domain-contracts

- Skill·Template의 관리 정보와 불변 내용 버전을 분리하고, 기존 관리자 검증을 깨뜨리지 않는 타입·권한 기반을 만든다.
- 정책 경계와 기존 관리자 동작 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 790835657f82a27871ff5e1ec80632ca115c69c7 (T01~T10 단일 통합 커밋)


## 실행 검증 기록
- 도메인·권한·기존 seed 테스트 4파일/7개, npm.cmd run typecheck, npm.cmd run lint 통과.
