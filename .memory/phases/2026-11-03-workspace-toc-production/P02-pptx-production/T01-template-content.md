# Task: T01-template-content 템플릿 요소 내용 반영과 Skill 적용

## Status: done

## Goal
등록 Template 원본의 지원 요소에 실제 슬라이드 내용을 기록하고 Skill 서식을 적용한 PPT 바이트와 구조 미리보기를 만든다.

## Decision Summary
- 선행 P01 전체 완료. D03/D09/D17: 내용 중심 편집이며 자유 배치 엔진은 만들지 않는다.
- 텍스트·목록·단순 표와 지정 이미지 칸만 변경한다. 넘침·매핑 실패를 정상 출력으로 처리하지 않는다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 내용 바인딩과 XML 변환
- Related Files:
  - `lib/pptx/production/content.ts` :: inspectContentSlots/renderProposalSlide — new
  - `lib/pptx/production/content-schema.ts` :: 렌더 입력 검증 — new
  - `types/workspace-production.ts` :: 아래 렌더 계약 추가 — modify
  - `lib/pptx/zip.ts` :: ZipArchive.file의 binary overload — modify
  - `lib/pptx/pptx-xml.ts` :: NS/parseXml/serialize/relativePart/relPath — reuse
  - `lib/pptx/template-read.ts` :: readTemplate/textValue — reuse
  - `types/pptx-template.ts`, `types/admin-assets.ts`, `types/template-work.ts` — read-only
#### Details
**Signatures & Types**
```typescript
interface SlideRenderInput {
 slide:ProposalSlide; templateBytes:Uint8Array; templateFilename:string;
 templateRevision:TemplateAssetRevision; skill:SkillAssetRevision|null;
 images:ReadonlyMap<string,{bytes:Uint8Array;mime:"image/png"|"image/jpeg";width:number;height:number}>;
}
interface RenderedSlide {
 slideId:string; sectionId:string; sourcePinId:string; sourcePath:string;
 bytes:Uint8Array; width:number; height:number; preview:TemplatePreviewData;
 elements:ManifestElement[]; warnings:string[];
}
interface ContentSlot {objectId:string;shapeId:string;role:ObjectRole;kind:TemplateObject["kind"];supported:boolean;reasons:string[]}
function inspectContentSlots(document:TemplateDocument,path:string,options:TemplateOptions):ContentSlot[];
function renderProposalSlide(input:SlideRenderInput,library:ZipLibrary,signal?:AbortSignal):Promise<RenderedSlide>;
```
- ProposalSlide는 `id,sectionId,revision,content:{title,lead,blocks},template:{pinId,sourceSlidePath,bindings:[{key,objectId}]}|null,usedSettings,sources`이다. block은 text(text), list(items), table(columns/rows), image(blobId/alt/width/height/mime) 중 하나이며 각각 불변 id가 있다.
- bindings.key는 예약 title/lead 또는 block.id다. 대상 objectId는 기존 파서의 `slidePath#index`다. source path와 pinId를 일치 검증하고 같은 객체를 중복 배정하지 않는다. 빈 title/lead는 바인딩 없이 허용하지만 실제 내용이 있는 항목은 반드시 지원 칸에 연결한다.
- TemplateAssetRevision은 {id,assetId,revision,createdAt,createdBy,name,short,description,kind:"template",definition:{fileRefId,extraction,pageTypes,roles,excluded}}다. definition.extraction의 sha256/크기와 입력 원본을 확인하고, lib/admin/assets/work-policy.ts의 buildDefaultOptions(revision)로 타입·역할·제외 설정을 받는다. 객체의 source=slide, reasons 비어 있음, 미병합 등 기존 엔진의 지원 범위를 충족해야 한다. 슬라이드에 직접 놓이지 않은 layout/master 상속 객체에 내용을 기록하지 않는다.
- `ContentSlot.shapeId`는 원본 요소의 cNvPr/@id다. index와 혼동하지 않고 XML 노드에서 추출하며, ID 누락/중복은 MAPPING 오류다. ManifestElement는 `{key,objectId,shapeId,kind:"text"|"list"|"table"|"image"}`.
- 입력 크기 한계는 P01의 200 slides, 제목200, lead1000, text20000, list100×2000, table20열×100행/셀2000을 재검증한다. 원본 PPT/POTX 검증은 기존 openPackage 경로의 ZIP 안전 검사와 250MiB/해제1GiB/200슬라이드 한계를 그대로 사용한다.

**Execution Flow / Logic**
1. 신호 취소, template 존재, 역할/적용제외/핀 일치와 모든 내용 매핑을 먼저 검사한다. 새 ZipArchive에 입력 bytes 사본을 로드하여 호출자의 원본과 이전 결과를 변경하지 않는다.
2. 텍스트는 기존 shape/geometry/색상/스타일을 유지하고 a:txBody의 문단/run 내용을 DOM createTextNode로 교체한다. 줄바꿈은 문단으로, list는 항목별 문단과 지원 bullet로 쓴다. 단순 문자열 XML 보간과 HTML 삽입은 금지한다. 필드·회전·세로글·그룹·상속 등 지원하지 않는 원본은 수정하지 않는다.
3. 표는 열 수가 원본과 같은 단순 비병합 표만 허용한다. columns를 첫 행으로, rows를 뒤 행으로 기록한다. 필요한 행은 기존 본문 행의 셀/서식을 복제하며 감소하면 현재 slide 사본에서만 제거한다. 열 폭과 프레임을 유지하고 새 행 높이/셀 텍스트 높이가 프레임 안에 들어가는지 검사한다. 헤더만 있는 원본은 헤더 셀의 속성을 이용하되 본문으로 분리한다.
4. image는 PNG/JPEG만 허용하고 bytes signature와 실제 치수를 검증한다(최대10MiB, 1..8192px, 최대32MP). source slide의 image role 칸에만 배치한다. 새로운 media part와 relationship ID를 생성하고 기존 프레임에 contain으로 맞춘다. 공유 원본 media 바이트를 덮어쓰지 않고 SVG/HTML/외부URL은 받지 않는다.
5. xmlPart/serialize와 byte file setter를 사용해 변환 bytes를 만든 후 readTemplate으로 재분석한다. 바인딩된 내용 전체가 보존되는지 비교한다. 텍스트 유실/지원 불가/모순된 바인딩은 MAPPING, 넘침은 LAYOUT, 취소는 CANCELLED로 반환한다. 일부 성공본을 저장하지 않는다.
6. 반환 bytes는 선택 source slide가 수정된 전체 템플릿 패키지이며 아직 프로젝트 deck이 아니다. P02-T02가 필요한 슬라이드만 조립한다. preview는 bytes/zip을 제외한 TemplatePreviewData로 만든다.

### I02. Skill 서식·지원 한계·미리보기
- Related Files:
  - `lib/pptx/template-apply.ts` :: applyTemplate — reuse
  - `lib/pptx/skill-adapter.ts` :: toEngineSkill — reuse
  - `lib/pptx/text-layout.ts` :: textHeightWithFont — reuse
  - `lib/pptx/production/content.ts` :: 지원 범위/최종 출력 검증 — new
  - `components/admin/templates/workbench/TemplateSlidePreview.tsx` — 화면 재사용 예정; 이 Task는 read-only
#### Details
- skill=null이면 Template 서식 그대로, 있으면 toEngineSkill 후 applyTemplate을 호출한다. selectedSlides에는 실제 source index만 지정한다. 기본 layout=false/images=false/sharedEdits=[]로 두고 관리자 적용제외/역할/슬라이드 유형을 존중한다. 브랜드 색상·로고·전체 master를 새로 편집하지 않는다.
- 적용 후 내용/매핑을 다시 읽고 확인한다. textHeightWithFont는 근사 측정이므로 여백을 포함한 보수적 공간 검사만 한다. 모든 실제 글꼴·PowerPoint 줄바꿈을 보장한다고 표시하지 않는다. 프레임을 넘기면 잘라서 성공시키지 않고 입력 축소·템플릿 변경 경로를 반환한다.
- 원본 유지 대상은 warnings로 설명한다. 지원 대상 내용은 모두 기록되었는지 별도 검사하므로 지원하지 않는 객체 보존 경고가 실제 본문 누락을 덮지 않는다.
- 브라우저 DOMParser/외부 JSZip 경계 외에는 any/unknown을 도입하지 않는다. PPT 경로/관계 검증은 기존 헬퍼를 사용하고 외부 관계를 fetch하지 않는다.

## Acceptance Criteria
- [x] 지원 텍스트·목록·표·이미지 내용을 실제 PPT XML에서 다시 읽을 수 있다.
- [x] 원본 bytes와 미대상 객체/색상/로고/레이아웃은 유지된다.
- [x] 매핑 중복/누락·병합 표·넘침·취소에서 저장 가능한 성공 결과를 반환하지 않는다.
- [x] 실제 렌더러와 구조 미리보기의 범위를 구분한다.

## Validation
- `npm run typecheck`
- `npx eslint lib/pptx/production/content.ts lib/pptx/production/content-schema.ts lib/pptx/zip.ts types/workspace-production.ts`
- 다음 PowerShell 인라인 검증으로 실제 fixture 왕복·XML escape·원본 불변을 확인한다. fixture 바이트/base64를 출력하지 않는다.
```powershell
@'
const assert = require("node:assert/strict");
const {JSDOM} = require("jsdom");
const w = new JSDOM("").window;
globalThis.DOMParser = w.DOMParser; globalThis.XMLSerializer = w.XMLSerializer;
const {createDemoTemplateFile} = require("./config/pptx-demo.ts");
const {loadZipLibrary} = require("./lib/pptx/zip.ts");
const {readTemplate} = require("./lib/pptx/template-read.ts");
const {extractTemplateMetadata} = require("./lib/pptx/extraction.ts");
const {renderProposalSlide} = require("./lib/pptx/production/content.ts");
const {createHash} = require("node:crypto");
(async()=>{
 const file = createDemoTemplateFile(), bytes = new Uint8Array(await file.arrayBuffer());
 const zip = await loadZipLibrary(), before = await readTemplate(bytes,file.name,zip);
 const source = before.slides.find(s=>s.objects.some(o=>o.kind==="text"&&!o.reasons.length&&o.source==="slide"));
 assert.ok(source);
 const object = source.objects.find(o=>o.kind==="text"&&!o.reasons.length&&o.source==="slide");
 const hash = value=>createHash("sha256").update(value).digest("hex"), originalHash=hash(bytes);
 const extraction=await extractTemplateMetadata(before,originalHash);
 const revision={id:"revision1",assetId:"template1",revision:1,createdAt:"2026-11-03T00:00:00.000Z",createdBy:"pm",name:"검증",short:"검증",description:"",kind:"template",definition:{fileRefId:"source1",extraction,pageTypes:{[source.index]:source.type},roles:{[object.id]:"title"},excluded:[]}};
 const slide={id:"slide1",sectionId:"section1",revision:1,content:{title:"A<&>",lead:"",blocks:[]},template:{pinId:"pin1",sourceSlidePath:source.path,bindings:[{key:"title",objectId:object.id}]},usedSettings:{skillPinId:null,promptPinId:null,promptItemId:null,prompt:"",sources:[]},sources:[]};
 const input={slide,templateBytes:bytes,templateFilename:file.name,templateRevision:revision,skill:null,images:new Map()};
 const result=await renderProposalSlide(input,zip);
 const after=await readTemplate(result.bytes,"result.pptx",zip);
 assert.equal(after.slides.find(s=>s.path===source.path).objects.find(o=>o.id===object.id).text,"A<&>");
 assert.equal(hash(bytes),originalHash);
 assert.equal(result.elements[0].key,"title"); assert.ok(result.elements[0].shapeId);
 const invalid=structuredClone(slide); invalid.template.bindings.push({key:"lead",objectId:object.id});
 await assert.rejects(renderProposalSlide({...input,slide:invalid},zip),e=>e.code==="MAPPING");
 const abort=new AbortController();abort.abort();
 await assert.rejects(renderProposalSlide(input,zip,abort.signal),e=>e.code==="CANCELLED");
 console.log("실제 내용 왕복·XML escape·원본 보존·매핑·취소 검증 통과");
})().catch(e=>{console.error(e);process.exitCode=1});
'@ | node --import tsx
```
- 같은 인라인 세션의 fixture에 지원 객체를 선택하고 기존 TemplateAssetRevision 스키마에 맞는 역할/옵션을 구성하여 renderProposalSlide를 호출한다. 제목 `A<&>` readback 동일, 원본 hash 동일, skill 유/무 모두 성공을 assert한다. 본문/표가 있는 실제 fixture에는 모든 매핑 내용 readback을 검사한다. image는 1px PNG를 메모리 생성해 slot에 넣고 관계 타깃 존재를 검사한다.
- 실패 케이스: 동일 target 이중 매핑, 존재하지 않는 path, excluded 객체, 병합/그룹 객체, 과도한 표/텍스트, abort된 signal. 각각 MAPPING/LAYOUT/LIMIT/CANCELLED를 assert한다. 필요한 작은 XML fixture는 실행 스크립트의 메모리 Zip에서 구성하며 tests/에 파일을 쓰지 않는다.
- `git diff --check`

## Commit Message
```text
feat(workspace): 템플릿 내용 반영과 Skill 서식 엔진 연결

Plan: 2026-11-03-workspace-toc-production
Phase: P02-pptx-production
Task: T01-template-content

- 템플릿 요소 내용 반영과 Skill 적용
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 실행 결과
- typecheck·범위 ESLint·diff 검사 통과. 청사진 실제 PPTX 왕복/XML escape/원본 보존/매핑/취소 검증 통과.
- 추가 인라인 52건: 목록 bullet, Skill 유/무, 미대상 ZIP 파트 hash 동일, 표 내용·프레임, 이미지 실제 signature·치수·신규 관계·기존 media 보존, 제외·누락·병합·그룹·넘침·잘못된 이미지 거부.
- 동기 슬롯 조회가 cNvPr의 실제 ID를 사용하도록 기존 파서에 shapeId 메타데이터를 추가했다. index로 ID를 추정하지 않는다. 레이아웃 좌표를 상속한 슬라이드 자신의 텍스트는 수정 가능하고 layout/master 원본 요소는 보호한다.
- 텍스트 공간 측정은 보수적 근사다. 실제 PowerPoint 시각 검증은 하지 않았다.
