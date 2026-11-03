# Task: T02-deck-roundtrip 슬라이드 조립·내보내기·수정본 비교

## Status: done

## Goal
여러 템플릿의 선택 슬라이드를 실제 PPTX 한 파일로 조립하고, 외부 수정본을 안정적인 연결 기준으로 비교한다.

## Decision Summary
- 선행 P02-T01 완료. 기존 파서는 presentation.xml 관계 순서를 읽는다. ZIP 파일명 정렬이나 화면 번호를 식별 키로 사용하지 않는다.
- D04/D17: 업로드 원본의 디자인은 원본 파일에 보존하며 지원 텍스트·표만 웹 내용으로 적용한다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 슬라이드·관계 그래프 조립
- Related Files:
  - `lib/pptx/production/deck.ts` :: assembleProjectDeck — new
  - `lib/pptx/production/package-graph.ts` :: 관계 복사/validateDeckGraph — new
  - `lib/pptx/production/manifest.ts` :: manifest 쓰기/읽기/스키마 — new
  - `lib/pptx/zip.ts` :: ZipLibrary.create/ZipArchive.remove 및 byte setter — modify
  - `types/workspace-production.ts` :: 아래 계약 — modify
  - `lib/pptx/pptx-xml.ts`, `template-read.ts`, `limits.ts` — reuse
#### Details
**Signatures & Types**
```typescript
interface DeckInput {projectId:string;round:number;inputRevision:number;exportId:string;slides:RenderedSlide[]}
interface DeckResult {bytes:Uint8Array;manifest:ExportManifest;warnings:string[]}
interface ImportMapping {externalPath:string;externalShapeId:string;slideId:string;key:string}
interface PptContentChange {id:string;slideId:string;key:string;kind:"text"|"list"|"table";before:ContentBlock|string;after:ContentBlock|string;externalPath:string;externalShapeId:string}
interface ImportIssue {externalPath:string|null;slideId:string|null;code:"unmatched"|"ambiguous"|"unsupported"|"missing"|"layout";message:string}
interface PptComparison {changes:PptContentChange[];issues:ImportIssue[];matchedSlideIds:string[];externalSlideCount:number}
function assembleProjectDeck(input:DeckInput,library:ZipLibrary,signal?:AbortSignal):Promise<DeckResult>;
function compareExternalDeck(input:{bytes:Uint8Array;filename:string;currentSlides:ProposalSlide[];baseManifest:ExportManifest|null;mapping:ImportMapping[]},library:ZipLibrary,signal?:AbortSignal):Promise<PptComparison>;
function validateDeckGraph(bytes:Uint8Array,library:ZipLibrary,signal?:AbortSignal):Promise<void>;
```
- RenderedSlide는 `slideId,sectionId,sourcePinId,sourcePath,bytes,width,height,preview,elements,warnings`. bytes는 P02-T01에서 내용을 반영한 템플릿 전체 패키지다.
- ExportManifest는 `{version:1,projectId,round,inputRevision,exportId,slides:[{id,sectionId,path,sourcePinId,sourcePath,elements:[{key,objectId,shapeId,kind}]}]}`. 내용·프롬프트·사용자 정보는 manifest에 쓰지 않는다.
- JSZip 기존 어댑터에 `create():ZipArchive`, `remove(name:string):ZipArchive`, `file(name:string,data:Uint8Array):ZipArchive`만 추가한다. 모든 기존 read/apply 호출의 타입 호환을 유지한다.

**Execution Flow / Logic**
1. 슬라이드1..200, unique slideId, 같은 width/height, 입력 ZIP 안전성·정확한 sourcePath 존재를 검증한다. 혼합 페이지 크기는 LAYOUT으로 거절하고 템플릿 변경을 안내한다. 0장 출력은 VALIDATION이며 완성본 보관 자체와는 별개다.
2. 새 OPC 패키지를 만들고 프로젝트 순서대로 slide part를 쓴다. sourcePinId+원본 의존 part 경로를 키로 layout/master/theme/media 등 동일 바이트의 공유 의존을 재사용한다. 여러 렌더 결과에서 같은 원본 경로가 서로 다른 내용이면 SHA-256까지 키에 포함하여 덮어쓰지 않는다.
3. 선택 slide는 복제마다 별도 part/rId/cNvPr slide marker를 갖는다. notes와 notes→slide 역참조도 선택 복제에 귀속한다. source ZIP 전체를 그대로 병합하거나 불필요한 원본 slide를 남기지 않는다.
4. 내부 관계를 재귀 복사하며 순환 참조(layout↔master)는 visited mapping으로 처리한다. 타깃 경로는 relativePart로 정규화하고 상대경로를 다시 쓴다. 기존 relationships()는 type URI 마지막 구간만 반환하므로 관계를 쓸 때는 원본 XML의 완전한 Type URI를 사용한다. 외부 관계는 TargetMode=External 그대로 보관하되 절대 네트워크 요청을 하지 않는다.
5. master/layout/notesMaster/theme/chart/embedded/media part와 content type을 복사하고 presentation의 sldMasterIdLst/notesMasterIdLst/sldIdLst 관계를 재구성한다. slide ID는256부터, master ID는2147483648부터 충돌 없이 생성한다. 커스텀 쇼·내부 하이퍼링크 등 presentation/다른slide 참조가 선택 집합 밖을 가리키거나 복제 때문에 대상을 확정할 수 없으면 관련 part와 이유를 반환해 출력을 막는다. 깨진 관계를 묵인하거나 조용히 삭제하지 않는다.
6. [Content_Types].xml의 Default/Override를 실제 parts와 일치시킨다. package root officeDocument 관계와 최소 core/app metadata를 작성한다. POTX 원본도 결과 main content type은 PPTX presentation으로 설정한다.
7. customXml에 manifest를 넣고 presentation에서 연결한다. 각 slide extLst의 고유 URI 아래 exportId/projectId/slideId를 쓴다. 기존 extLst는 보존한다. 바인딩 대상의 cNvPr/@id를 elements.shapeId에 기록한다.
8. generate→validateDeckGraph→readTemplate 순으로 검사한다. 모든 내부 relationship target 존재, 타입/slide 순서/수/size 일치, manifest의 고유 ID와 slide연결을 검사한 뒤 결과를 반환한다. 실패 시 등록/다운로드할 바이트를 반환하지 않는다. 취소는 CANCELLED, 제한은 LIMIT, 그래프 불일치는 MAPPING으로 매핑한다.

### I02. 실제 외부 내용 비교와 명시적 매핑
- Related Files:
  - `lib/pptx/production/import.ts` :: compareExternalDeck — new
  - `lib/pptx/production/manifest.ts` :: metadata 검증 — new
  - `lib/pptx/template-read.ts` :: 객체 읽기 — reuse
#### Details
- 입력은 .pptx만(수정본에 .potx를 허용하지 않음). ZIP/XML 안전검사 후 presentation의 실제 순서를 읽는다. 지원하지 않는 차트/그룹/병합 표/자유 도형·배치 변경은 issues로 기록한다.
- baseManifest는 서비스가 저장한 기존 generated 버전에서 가져온다. 외부 manifest의 projectId/exportId/ID 집합과 저장본을 대조하고 slide marker와 cNvPr shapeId가 단일 대응할 때만 자동 연결한다. 외부 metadata 자체는 권한 증명이 아니다. 제목/배열 위치만으로 연결하지 않는다.
- metadata가 제거되었거나 새로 만든 PPT에는 mapping 입력을 통한 사용자 확인 경로를 둔다. externalPath+externalShapeId와 현재slideId+key가 각각 유일하고 지원 유형이 호환되어야 한다. 자동 연결과 충돌하면 ambiguous로 표시하고 해당 변경 적용을 막는다.
- 원본 textValue를 공통 줄바꿈(CRLF→LF)만 정규화해 비교한다. 앞뒤 공백·숫자·문장 내용을 임의 제거하지 않는다. list는 문단별 항목, 표는 첫행 columns와 나머지rows로 변환하며 빈 셀·행도 유지한다. shape 종류가 바뀐 경우 유형을 추정 변환하지 않는다.
- 변경id는 현재 slideId/key와 외부part/shapeId의 조합으로 안정적으로 생성한다. before는 현재 웹 내용, after는 외부 지원 내용이다. 지원 불가 부분은 changes로 만들지 않는다. 삭제된 외부 slide는 missing issue이며 웹 slide 자동 삭제 명령이 아니다.
- compareExternalDeck은 순수 비교이며 웹 상태/원본 버전을 저장하지 않는다. 서비스가 원본 저장과 적용 권한·버전 확인을 수행한다.

**기술 근거**
- OOXML은 presentation/slide/layout/master/theme가 관계로 연결된 구조다. [Microsoft 문서](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document)를 근거로 기존 TypeScript ZIP/XML 엔진을 확장한다. [presentation 예제](https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-presentations)의 ID/관계 구조를 확인했으며 .NET SDK 코드를 복사하지 않는다. 실제 조립·복제 정책은 이 청사진의 설계다.

## Acceptance Criteria
- [x] 동일·여러 Template의 선택 슬라이드가 지정 순서대로 실제 PPTX에 포함된다.
- [x] 복제/순서 변경 후에도 stable ID와 shape ID로 연결되며 모호한 연결은 자동 적용하지 않는다.
- [x] 내부 관계가 끊기거나 혼합 페이지 크기인 출력은 등록되지 않는다.
- [x] 업로드 원본은 변경하지 않고 텍스트·표의 실제 차이와 지원 제외 사유를 반환한다.

## Validation
- `npm run typecheck`
- `npx eslint lib/pptx/production lib/pptx/zip.ts types/workspace-production.ts`
- `@' ... '@ | node --import tsx` 인라인에 node:assert/strict, jsdom DOMParser/XMLSerializer, createDemoTemplateFile, loadZipLibrary/readTemplate/renderProposalSlide/assembleProjectDeck/compareExternalDeck/validateDeckGraph를 import한다. 파일 fixtures는 만들지 않고 메모리 ZIP만 수정한다.
- 실제 fixture의 지원 텍스트를 A/B로 바꾼 RenderedSlide 두 개를 조립한다. readTemplate의 순서가 A→B, slide수2, 모든 내부 target 존재, sourcebytes hash불변을 assert한다. 두번째 sourcePinId를 다른 값으로 바꾼 동일크기 두 템플릿 조립과 동일 slide 복제도 검사한다.
- 생성본 ZIP에서 sldIdLst 순서만 뒤집은 수정본은 changes가0이어야 한다. title shape 텍스트만 C로 변경한 파일은 정확한 slideId/title 1개 change여야 한다. 다른 객체를 spTree 앞에 삽입해 index가 달라져도 cNvPr 기반 연결이 유지되어야 한다.
- manifest/marker 삭제→unmatched; 중복slide marker/shape ID→ambiguous; 명시적 mapping 후 지원text/table만 changes; 새slide/삭제slide/차트변경은 issues. 원본 mutation 없음과 대상 아닌 슬라이드 changes0을 assert한다.
- size 불일치, dangling target, path traversal, 중단 signal, 201 slides는 각각 LAYOUT/MAPPING/기존 ZIP 안전 오류/CANCELLED/LIMIT를 assert한다. PowerPoint 육안 검증은 수행하지 않고 남은 제한으로 기록한다.
- `git diff --check`

## Commit Message
```text
feat(workspace): 실제 PPT 조립과 외부 수정본 내용 비교 구현

Plan: 2026-11-03-workspace-toc-production
Phase: P02-pptx-production
Task: T02-deck-roundtrip

- 슬라이드 조립·내보내기·수정본 비교
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 실행 결과
- typecheck·범위 ESLint·diff 검사 통과. 실제 Demo Template 인라인 28건 통과: A/B 순서, 여러 자산, 동일 슬라이드 복제, 순서 변경 무차이, index 변경 후 shape ID 연결, 단일 텍스트 변경, 메타데이터 제거·수동 연결·중복 식별자 차단, 끊긴 관계/혼합 크기/201장/취소 거부, 노트 복제별 역참조와 master 공유, 선택 밖 내부 링크 거부, 삭제 슬라이드 보존, 빈 셀·공백·숫자 표 차이, 자동/수동 매핑 충돌.
- Microsoft PresentationML 구조 문서 재확인: https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document . 실제 구현은 TypeScript ZIP/XML이며 .NET SDK 복사 없음.
- 전역 텍스트 기본값·표 스타일·작성자 정의가 충돌하거나 사용자 지정 쇼가 있는 원본은 조용히 손상시키지 않고 이유와 함께 출력 거부한다. 실제 PowerPoint 시각 검증은 하지 않았다.
