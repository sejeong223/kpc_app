# Task: T04 Skill·공유 디자인 변환과 보고서

## Status: done

## Goal
실제 PPT에 Skill 및 명시적인 공유 디자인 편집을 적용하고, 지원하지 못한 요소를 보존한 출력과 요소별 보고서를 만든다.

## Decision Summary
- D06/D07/D11. 글꼴·크기·줄 간격·표는 Skill 우선, 기본 배치/색상/로고는 유지한다. v3.4 공유 그룹 내부 편집과 일반 그룹 자동 적용의 지원 범위를 구분한다.
- 선행 Task를 순서대로 완료한 후 실행한다. 모든 Task 검증 후 한 번 커밋하며 이 Task는 commit: deferred로 기록한다.

## Implementation

### I01. 원본 사본 기반 서식 변환
- Related Files:
  - lib/pptx/template-apply.ts :: applyTemplate, TemplateOptionsSchema — 적용/복원; new
  - lib/pptx/text-layout.ts :: fontFace, weightValue, alignValue, wrapText, textHeight, textHeightWithFont, setTextMeasurer — 필요한 측정 함수만 추출; new
  - lib/pptx/skill-adapter.ts :: toEngineSkill — revision에서 엔진 입력 조립; new
  - lib/pptx/shared-schema.ts :: SharedDesignEditSchema, SharedTextSchema — 공유 수정 검증; new
  - lib/pptx/shared-design.ts :: sharedDesigns, sharedTargets, canEditShared, applySharedDesigns — 공유 영향/그룹 내부 편집; new
  - lib/pptx/template-results.ts :: resultRows/countResults/filterResults — 결과 필터; new
  - types/pptx-template.ts :: TemplateOptions, TemplateResult, SharedDesignEdit — T02 타입 완성; modify

#### Details
- 고정 참조: C:/Users/k2020/Documents/Codex/2026-10-23/new-chat/work/kpc-skill-poc/ 의 src/_lib/template-apply.ts(sha256 f85f6b6a4c6721da633f461b1daa92a5d3c58eeb0c4b1ed5e5805eab3d2dc772), shared-design.ts(947727ed130b36302f1c1a3afd053b62e481291df6294ea7bc9dde2ca3027129), template-results.ts(f8b046211c1820aeefa7c779d7d559f8e0d9c8c74913ff2006b0622b426de5db), src/_scheme/shared-design.ts 및 layout.ts의 첫 46줄 측정 함수가 이식 대상이다.
- layout.ts의 새 PPT buildPlan/자동 분할이나 deck.ts/exportBytes/PptxGenJS는 이식하지 않는다.
- Signatures:
```typescript
function toEngineSkill(revision:SkillAssetRevision): SkillEngineInput;
function applyTemplate(input:TemplateDocument, skill:SkillEngineInput, options:TemplateOptions,
  library:ZipLibrary, onProgress?:TemplateProgress, signal?:AbortSignal): Promise<TemplateResult>;
interface SharedAccess { appearance:string[]; text:string[]; fill:string[]; position:string[] }
interface SharedDesign { id:string; path:string; object:TemplateObject; slides:number[]; visibleSlides:number[];
  blockers:string[]; access:SharedAccess; rootId:string; nodePath:number[]; ancestors:string[]; members:SharedDesign[] }
function sharedDesigns(doc:TemplateDocument): SharedDesign[];
function sharedTargets(doc:TemplateDocument): SharedDesign[];
function canEditShared(item:SharedDesign): boolean;
type ResultStatus = "changed"|"kept"|"skipped";
interface ResultQuery { scope:"slide"|"document"; slideIndex:number; filter:"all"|ResultStatus; query:string }
interface ResultRow { key:string; slide:TemplateSlide; object:TemplateObject; change:ObjectChange|null; next:TemplateObject|null }
function resultRows(doc:TemplateDocument|null, result:TemplateResult|null): ResultRow[];
function countResults(rows:readonly ResultRow[]): Record<ResultStatus,number>;
function filterResults(rows:readonly ResultRow[], selection:ResultQuery): ResultRow[];
```
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

- sharedEdit: id 1~400자, position x/y 0~200cm·w/h .01~200cm, fill=#RRGGBB 또는 transparent 또는 null. full text size4~200pt/lh.5~5/para0~100pt/pad0~10cm/face1~100자. appearance에서는 수정하지 않는 원본 size/lh/pad에 full 범위를 강제하지 않으며 face/bold/color 중 실제 지정 필드만 변경한다. position/text/fill이 전부 null이면 거절한다.
- TemplateOptionsSchema는 selectedSlides 정수 중복 제거/0~199, pageTypes 정확한 enum, role enum, excluded 중복 제거, sharedEdits 검증을 수행한다. 실제 문서에 없는 slide/object/shared id는 VALIDATION 성격의 PptxError로 거절한다.
- 처리 순서: skill/options 검증 → input.bytes에서 새 ZIP open → 원본 XML 노드 백업 → 선택한 슬라이드의 지원 요소 적용 → 공간/겹침 검사 실패 요소 원복 → 공유 편집 및 연결 페이지 검사 → 변경 파트만 저장 → 새 PPTX bytes → readTemplate로 출력 분석 → 보고서 반환.
- layout=false/images=false가 기본이다. image/shape는 옵션 없이 이동/크기 변경하지 않는다. 기존 문구·hyperlink·관계·그룹 구조를 보존한다. title/sub/body의 size/weight/font/lh 및 표 규칙 적용은 PoC 조건을 그대로 이식한다.
- per-element unsupported/공간 부족은 skipped+사유, 사용자 제외/미선택은 kept+사유. XML 필수 파트 손상·전체 파일 오류는 catch하여 성공 부분 출력으로 바꾸지 않고 throw한다.
- 원본 함수가 필수 XML/관계 오류까지 요소별 catch로 삼키는 지점이 있다면 파트 로드/구조 검증을 적용 루프 밖에서 수행하여 전체 오류와 서식 적용 실패를 분리한다.
- 공유 원본 변경은 연결된 전체 페이지에서 검사한다. 일부 페이지 선택으로 범위를 제한하지 않는다. 그룹 내부 지원 속성만 바꾸고 그룹 xfrm/ID/문구/관계는 유지한다. 연결 페이지 하나라도 공간 검사 실패면 해당 공유 요소 변경 전체를 원복한다.
- .potx는 콘텐츠 타입을 presentation.main+xml로 바꾸어 .pptx 출력한다. 변환 때 수정한 파트 목록에 content-types도 포함한다.
- signal 취소는 루프/ZIP 생성 진행 콜백/출력 분석 후에 검사한다. 취소 시 부분 결과를 반환하지 않는다.

### I02. 결과 보고서·파일 보존 테스트
- Related Files:
  - tests/lib/pptx/template-apply.test.ts, shared-design.test.ts, shared-groups.test.ts, template-results.test.ts — 변환 회귀; new
  - tests/fixtures/pptx/skill-comparison.pptx, shared-design.pptx, shared-groups.pptx, native-shared-group.pptx — PoC 합성 fixture; new
  - tests/fixtures/pptx/README.md — 원본/해시/지원 제한; modify

#### Details
- source fixtures는 위 PoC 경로의 같은 이름 파일이다. 각각 sha256: skill-comparison=5b944fc515275df8506718ebc82dd74e88fba48b223eb792148a94f1e43e80a5; shared-design=9a0e84bec79a6a41b066a7d12f08fafc82391f4ad3db186bd73cf34412d99164; shared-groups=86bfae7d660c319122b82b684c91254c1753e0a5aa7c62c343e7344afddfa202; native-shared-group=0a6c49f6f17c41ed63fdd3ab7578a3cf12f5536eb24a28468c8c2fe3f0a94f4c.
- 기존 PoC test-template.mjs/test-shared.mjs/test-groups.mjs/test-results.mjs의 검증 논리를 Vitest TypeScript로 옮기며 vendor bundle eval/vm이나 원본 절대 경로를 테스트 실행 의존으로 남기지 않는다.
- 검증: 문구/슬라이드수/크기/미변경 파트 바이트, 미선택 페이지, 제외 요소, 겹침 복원, 병합표/차트/일반그룹 보존, shared group 내부 색/글꼴 변경 및 구조 보존, 잘못된 shared ID, 출력 재분석, 원본 입력 불변.
- 동일 원본+설정 재적용은 파트별 내용/결과가 같아야 한다. ZIP timestamps로 전체 바이트가 다를 수 있으므로 ZIP 전체 hash 동일성을 요구하지 않는다.
- UI에 전달할 결과는 변경/원본 유지/적용 제외와 이유가 모두 존재해야 한다. children 변경도 부모 그룹과 구분하여 집계/표시한다.

## Acceptance Criteria
- [x] 지원되는 서식과 명시적 공유 디자인 변경이 실제 PPT에 반영된다.
- [x] 부분 실패 시 원본을 보존하고 이유를 제공한다.
- [x] 원본 입력·문구·관계·미변경 파트 및 그룹 구조를 보존한다.
- [x] 파일 손상/취소는 성공 결과를 생성하지 않는다.
- [x] 자동 슬라이드 분할·전체 테마 편집·AI 호출을 추가하지 않는다.

## Validation
- `npm.cmd test -- tests/lib/pptx/template-apply.test.ts tests/lib/pptx/shared-design.test.ts tests/lib/pptx/shared-groups.test.ts tests/lib/pptx/template-results.test.ts` — 오류 없이 통과한다.
- `npm.cmd run typecheck` — 오류 없이 통과한다.
- `npm.cmd run lint` — 오류 없이 통과한다.

## Commit Message
```text
feat(admin): PPT 서식 및 공유 디자인 변환 엔진 이식

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Task: T04-template-transform

- 실제 PPT에 Skill 및 명시적인 공유 디자인 편집을 적용하고, 지원하지 못한 요소를 보존한 출력과 요소별 보고서를 만든다.
- 정책 경계와 기존 관리자 동작 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 790835657f82a27871ff5e1ec80632ca115c69c7 (T01~T10 단일 통합 커밋)


## 실행 검증 기록
- 변환 4개 파일 9개 테스트, typecheck, lint 통과. 고정 PoC fixture 4개 해시 일치. 부분 요소 복원·공유 그룹 보존·취소·POTX 출력 확인.
