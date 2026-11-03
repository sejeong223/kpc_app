# Task: T03-production-editor 내용 편집·슬라이드 목록·출처·붙여넣기

## Status: done

## Goal
제작 화면을 프로젝트별 슬라이드 내용 편집과 등록 템플릿 미리보기가 연결된 작업 공간으로 바꾼다.

## Decision Summary
- D03/D09/D10/D15: 내용 중심 편집/템플릿 slot, 담당자 권한, 실제 자료와 mock근거 구분.
- 왼쪽 목록·가운데 편집/미리보기·오른쪽 출처를 재사용 가능한 컴포넌트로 나누고 공통 여백 규칙을 유지한다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 3영역 작업 화면과 슬라이드 편집
- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx`, `ProductionToolbar.tsx`, `SlideNavigator.tsx`, `SlideContentEditor.tsx`, `SlideTemplatePicker.tsx`, `ProductionPreview.tsx`, `ProductionPanels.tsx` — new
  - `hooks/workspace/use-slide-draft.ts`, `use-production-panels.ts` — new
  - `lib/workspace/production/editor.ts` :: draft/선택/이동 보조 순수 함수 — new
  - `components/workspace/WorkspaceScreen.tsx` :: write 연결 — modify
  - `components/layout/AppShell.tsx` :: 기존 /write 전용 padding 특례 정리 — modify
  - `components/admin/templates/workbench/TemplateSlidePreview.tsx`, `WorkspacePage.tsx`, `DadamControls.tsx` — reuse
#### Details
**Signatures & Types**
```typescript
interface SlideDraft {projectId:string;round:number;slideId:string;baseRevision:number;content:SlideContent;template:SlideTemplateRef|null;dirty:boolean}
interface SlideContentEditorProps {value:SlideContent;readOnly:boolean;error:string|null;onChange(value:SlideContent):void;onSave():void}
interface SlideNavigatorProps {view:ProjectView;sectionId:string|null;selectedIds:string[];activeId:string|null;onSelect(id:string,multiple:boolean):void;onCommand(operation:WorkspaceOperation):void}
interface ProductionPanelState {leftOpen:boolean;rightOpen:boolean;leftWidth:number;rightWidth:number;mobilePanel:"slides"|"editor"|"sources"}
function normalizeSelectedSlides(slides:readonly ProposalSlide[],selectedIds:readonly string[]):string[];
function moveSlideSelection(slides:readonly ProposalSlide[],ids:readonly string[],targetSectionId:string,beforeId:string|null):ProposalSlide[];
```
- 초기 panels는 left240px/right320px, left200..320/right280..420 범위, 가운데 min420px. 1180px 미만에서는 오른쪽 drawer, 760px 이하에서는 slides/editor/sources 탭 전환을 사용한다. splitter는 role=separator/aria-orientation, 키보드10px 이동/기본크기복원 제공. 사용자별 화면선호만 보관하며 문서 데이터로 저장하지 않는다.
- 상단은 프로젝트선택/회차·상태, 섹션선택/이전다음, 저장/완성/재작업/PPT actions를 공간에 맞게 공통toolbar로 배치한다. 화면 이름 반복헤더·예시데이터/화면안내 장식 문구 없음. 작업에 필요한 mock/원본제한 설명은 결과/오류 안에만 표시한다.
- AppShell의 productionContent padding0/minHeight100svh 특례를 제거하거나 일반공통inset에 맞추고, 내부작업영역이 같은 pageinset/gap 토큰을 사용하게 한다. 별도페이지 전체높이+상단높이로 이중스크롤을 만들지 않는다. 모바일에서는 고정높이/최소너비로 본문을 밀어내지 않는다.
- 썸네일에 현재순서/제목/담당/상태/고정/미처리의견을 표시한다. 선택 active는1개, selectedIds는 다중0..200. Ctrl/Meta/Shift 선택과 모두선택은 작업영역 안에서만. 단일추가/복제/삭제/위아래이동/다른section이동은 권한조건부렌더. 다중이동/삭제는 전대상 검증한 prepared 서비스 경로를 사용하며 하나씩 성공하는 반복 mutation으로 부분 저장하지 않는다(서비스에 `editSlides(input:ProjectRequest & {operation:"move"|"remove";slideIds:string[];sectionId:string|null;beforeId:string|null}):Promise<WorkspaceReceipt>` 추가).
- 제목/lead/text/list/table는 controlled plain data 편집. DOM.innerHTML/contentEditable 저장 없음. table 열이름/행/셀과 추가삭제, list 항목 추가삭제/순서, block추가/삭제/이동을 제공한다. 각block에 안정ID, P01입력길이 한계와 표직사각형 검증을 적용한다.
- editSlides의 다중 이동은 출발/도착 모든 section의 편집·고정 권한을 검사하고 선택 slide의 상대 순서를 유지한다. 다중 삭제는 현재 body에서 대상 slide와 연결 thread만 함께 제거하고 snapshot/reviews/핀/원본 버전은 유지한다. 하나의 prepared replace-content와 하나의 Undo로 저장하며 중간 mutation 루프는 사용하지 않는다. block 삭제 시 해당 template binding도 제거한다.
- draft는 선택시 state.revision을 캡처한다. 자동저장 없이 명시적 저장/취소와 작업영역 Ctrl/Meta+S(입력중 포함하되 IME조합중 제외). 저장 성공 후만 baseRevision을 갱신한다. refetch가 dirtydraft를 자동 덮지 않는다. 충돌은 원문/입력 보존 후 다시불러오기 선택; 이동은 공통draftguard를 통과한다.
- TemplatePicker는 현재기본핀/slide사용핀에서 실제슬라이드유형/썸네일/roles를 읽고 title/lead/block→지원slot 매핑을 편집한다. 잘못된 역할/적용제외는 선택불가. 설정관리권한 없이도 본문담당자는 이미허용된 적용핀의 slide/slot을 선택할 수 있다. 새자산 pin 선택은 setup권한경로로 이동한다.
- 미리보기는 ProductionService.previewSlide를 취소 가능한 Query/Mutation으로 호출한다. 내부 P02 renderProposalSlide의 bytes/zip은 Query 캐시에 넣지 않고 TemplatePreviewData/warnings만 받는다. 원본/권한불명·매핑없음·넘침이면 마지막미리보기를 최신성공본처럼 표시하지 않고 갱신불가 상태/입력수정경로를 준다. 과거snapshot은 당시 content/usedSettings로 읽기전용 표시한다.
- locked 상태는 입력/AI/변경 액션을 숨기고 권한있는 사용자에게 명시적 해제버튼. 해제 성공 후 state=writing을 확인하여 draft생성. 완료snapshot에는 해제버튼도 없다. 다른참여자는 내용읽기/의견만.

### I02. 출처 패널·실제 파일 원본 연결
- Related Files:
  - `components/workspace/production/SourcePanel.tsx`, `RequirementCoverage.tsx` — new
  - `components/workspace/files/FilePreviewDialog.tsx`, `hooks/workspace/use-file-preview.ts`, `lib/workspace/files/preview.ts` — reuse/필요한 prop adapter
  - `services/workspace/WorkspaceFileService.ts` :: getOriginal — reuse
#### Details
- SourceRef는 {id,kind:requirement|file,targetId,fileRound,versionId,page,quote,provenance:mock|manual}. Requirement는 {id,sectionId,title,coverage:none|partial|full,page,excerpt,provenance}. 현재slide sources와 section requirements를 분리해 보여준다.
- 출처 패널은 RFP 근거/자료/의견 탭과 각 건수를 제공한다. 의견 탭에는 미처리 의견이 있는 섹션별 집계와 해당 slide 이동을 제공하고 P03-T04의 ProjectComments를 연결한다. 선택한 slide뿐 아니라 프로젝트 전체 미처리 위치를 찾을 수 있어야 한다.
- RFP반영 상태 변경은 해당section편집 권한이며 set-coverage 명령을 사용한다. sectionId가 없는 requirement는 미연결 항목으로 읽기 전용 표시하고 목차 추천/제안 검토 경로에서 연결한다. 별도의 임의 requirement 재분류 API를 추가하지 않는다. 출처추가/제거는 slide편집권한, 같은프로젝트의 실제file/version만 선택 가능.
- 파일 open은 정확한 `{projectId,round,versionId}`로 FileService.getOriginal를 호출한다. PDF/TXT는 기존안전미리보기, 기타는 메타정보/원본다운로드. 웹자료는 기존URL정책, 새창noopener. 외부페이지를 fetch하여 자동분석하지 않는다.
- 과거snapshot은 그 당시 fileEntries/version을 조회하며 현재최신자료로 바꾸지 않는다. 실제파일에 fakeexcerpt/page를 붙이지 않는다. 위치가 없으면 원문 열기만 제공하고 RFP페이지를 조작하지 않는다.
- FilePreviewDialog를 다른context에 재사용하려면 resource/round props adapter로 해결하며 파일권한/원본조회경로를복제하지 않는다. ObjectURL은 취소/선택/프로젝트변경/close에 revoke한다.

### I03. 안전한 복사·붙여넣기와 키보드
- Related Files:
  - `hooks/workspace/use-slide-clipboard.ts` — new
  - `services/workspace/WorkspaceProductionService.ts` :: copySlides/pasteSlides/insertImage/editSlides — modify
  - `lib/workspace/production/clipboard.ts` — reuse
#### Details
- 우클릭context메뉴와 화면버튼 모두 복사/붙여넣기/복제/삭제 경로 제공. 키보드는 focus가슬라이드목록/preview이고 input/textarea/select/contenteditable/IME조합중이 아닐 때만 Ctrl/Meta+C,V,D와Delete를 처리한다. 브라우저 기본본문복사를 빼앗지 않는다.
- 내부복사는 서비스token으로, 시스템clipboard는 사용자가 paste이벤트를 직접 발생시켰을 때 plain text 또는PNG/JPEG file만 읽는다. clipboard-read권한을자동요청하거나 백그라운드 clipboard읽기 없음. HTML/스크립트/SVG/URL삽입을 허용하지 않는다.
- 외부plain text는10000자 한계로 새textblock 초안에 넣어 저장전검토. 이미지10MiB/8192px/32MP는 insertImage로 검증/저장하고 적절한Template image slot 연결을 요구한다. 브라우저지원이없는경우 파일선택으로같은기능제공.
- internal cross-project paste는 source조회/자산접근+target편집 검사; 미보존출처 notices를 보여준다. 사용자전환에token폐기, 범위다른토큰거절. 저장실패 시 선택/초안 유지.

## Acceptance Criteria
- [x] 기획 3영역 화면에서 슬라이드 CRUD/다중선택/이동/저장/출처/템플릿연결이 가능하다.
- [x] 제목·본문·목록·표·이미지 데이터와 미리보기가 분리되고 실제 내용누락은 표시한다.
- [x] 고정/완성본/다른담당자 내용의 변경 경로를 모두 차단한다.
- [x] 복사/붙여넣기/패널조절에 버튼·키보드 대안을 제공하고 기존 파일미리보기 정책을 유지한다.

## Validation
- `npm run typecheck`
- `npx eslint components/workspace/production hooks/workspace/use-slide-draft.ts hooks/workspace/use-production-panels.ts hooks/workspace/use-slide-clipboard.ts lib/workspace/production/editor.ts services/workspace/WorkspaceProductionService.ts components/layout/AppShell.tsx`
- node --import tsx 인라인에서 moveSlideSelection의 ID유지/원본불변/순서/다중section권한을 검증한다. remove/move 일괄 요청에 고정section 하나 포함시 변경0이어야 한다.
- draft순수전이를 추출해 저장실패→dirty입력유지, 같은revisionrefetch→입력유지, 다른revision→conflict, save성공→baseRevision갱신, 사용자변경→정리를 assert한다.
- plain text/악성HTML/허위PNG/대용량/정상PNG paste분기를 메모리데이터로 검사한다. 문서body를 HTML로 삽입하는 경로/자동clipboard read/fetch 없음 rg정적확인.
- 순수컴포넌트 SSR로 권한없음/완성본/고정 상태의 mutation버튼 부재, label/sectionlink/키보드대안 markup 존재를 검사한다. 실제브라우저drag/붙여넣기/반응형검증은 수행한 것으로 쓰지 않는다.
- `git diff --check`

## Commit Message
```text
feat(workspace): 내용 중심 슬라이드 제작 화면 구현

Plan: 2026-11-03-workspace-toc-production
Phase: P03-workspace-ui
Task: T03-production-editor

- 내용 편집·슬라이드 목록·출처·붙여넣기
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 검증 기록
- typecheck·범위 ESLint·diff 확인 통과. 다중 이동 순서/원본 불변/전체 권한 거절, Undo, 초안 충돌/저장, 텍스트·이미지 입력 경계, 읽기 전용 SSR 33건 통과.
- 일괄 변경은 임의 after-state를 받는 replace-content 대신 검증된 내부 batch-slides 명령 하나로 동일 트랜잭션·Undo에 저장한다. 기존 replace-content 순서 불변 계약을 약화하지 않는다.
- 직접 HTML 삽입/자동 clipboard 읽기/fetch 없음. 패널은 컨테이너 폭 기준으로 drawer·모바일 탭을 전환하며 실제 브라우저 조작 검증은 미실시.
