# Task: T01 구조 데이터를 보존하는 문서형 편집기

## Status: done

## Goal

기존 항목별 입력 폼을 하나의 연속된 문서형 편집 표면으로 바꾸고, 제목·리딩 메시지·문단·목록·표·기존 이미지가 `SlideContent` 구조로 손실 없이 돌아오도록 한다. 반영 전 초안과 Template 블록 연결도 보존한다. 현재 제작 라우트 연결은 T03에서 하므로 이 Task는 편집기 모듈 단위로 완료한다.

## Decision Summary

- 사용자 선택: 문서형 편집 → 명시적인 `슬라이드에 반영`. 현재 Dadam 컨트롤·스타일을 사용하고 새 공용 컴포넌트나 편집기 패키지를 만들지 않는다.
- 영속 원본은 기존 `SlideContent`다. 임의 HTML·새 DB 스키마·실제 AI·자유 배치 편집을 추가하지 않는다. 헤더·코멘트·현재 라우트는 이 Task에서 변경하지 않는다.

## Implementation

### I01. 문서 변환과 문단·목록·표 편집 명령

- Related Files:
  - `lib/workspace/production/document-editor.ts` :: `createSlideDocument`, `readSlideDocument`, `parseSlidePaste`, `applyDocumentCommand` — 문서 전용 변환/명령; new
  - `types/workspace-production.ts` :: `SlideContent`, `ContentBlock`, `SlideTemplateRef` — 저장 계약; read-only
  - `lib/workspace/production/schemas.ts` :: `SlideContentSchema`, `ProposalSlideSchema` — 현재 검증; read-only
  - `config/workspace-production.ts` :: `WORKSPACE_LIMITS` — 길이·개수 제한; read-only

#### Details

- **Signatures & Types**:

```typescript
import type { ContentBlock, SlideContent } from "@/types/workspace-production";

export type DocumentReadResult =
  | { ok: true; content: SlideContent }
  | { ok: false; message: string };
export type SlidePasteResult =
  | { ok: true; blocks: ContentBlock[]; notices: string[] }
  | { ok: false; message: string };
export type DocumentCommand =
  | { type: "insert-block"; kind: "text" | "list" | "table"; afterId: string | null }
  | { type: "remove-block"; blockId: string }
  | { type: "move-block"; blockId: string; delta: -1 | 1 }
  | { type: "insert-list-item"; blockId: string; afterIndex: number }
  | { type: "remove-list-item"; blockId: string; index: number }
  | { type: "insert-table-row"; blockId: string; afterIndex: number }
  | { type: "remove-table-row"; blockId: string; index: number }
  | { type: "insert-table-column"; blockId: string; afterIndex: number }
  | { type: "remove-table-column"; blockId: string; index: number };

export function createSlideDocument(content: SlideContent, document: Document): DocumentFragment;
export function readSlideDocument(root: HTMLElement, previous: SlideContent): DocumentReadResult;
export function parseSlidePaste(
  html: string, text: string, document: Document, newId: () => string,
): SlidePasteResult;
export function applyDocumentCommand(
  content: SlideContent, command: DocumentCommand, newId: () => string,
): DocumentReadResult;
```

- **Data & Schema Fields**:
  - `SlideContent`: `title:string` ≤200자, `lead:string` ≤1,000자, `blocks:ContentBlock[]` ≤100개. 빈 제목·본문은 현재 스키마에서 허용한다. 별도의 필수 제목 조건을 추가하지 않는다.
  - `ContentBlock`: `id:string` 필수·중복 금지·`title`/`lead` 예약 ID 금지. `text {text:string ≤20000}`, `list {items:string[] ≤100, 각 ≤2000}`, `table {columns:string[] 1~20, rows:string[][] 1~100, 각 셀 ≤2000, 모든 행 열 수 일치}`, `image {blobId:string,alt:string ≤1000,width:number,height:number,mime:"image/png"|"image/jpeg"}`.
  - 이미지 최대 가로/세로 8192, 면적 32,000,000. 읽어온 기존 이미지 블록은 ID·Blob 참조·크기를 그대로 유지한다. DOM의 임의 `<img src>`를 저장 이미지로 승격하지 않는다.
  - 새 문단은 `text:""`, 새 목록은 `items:[""]`, 새 표는 `columns:["항목","내용"]`, `rows:[["",""]]`로 시작한다. ID는 명령이 새 블록을 추가하는 시점에만 `newId()`로 생성한다.
  - DOM 표식은 제목 `data-document-field="title"`, 리딩 메시지 `data-document-field="lead"`, 본문 컨테이너 `data-document-body`, 각 블록 `data-block-id`/`data-block-kind`. 목록 항목·표 셀의 순서가 데이터 순서다. 이 표식은 저장하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 입력 구조는 기존 스키마를 따른다. DOM에서 제목/lead 표식 누락·중복, 알 수 없는 블록 ID/종류, 불균일 표, 허용 크기 초과를 발견하면 `ok:false`로 반환한다. `previous`는 현재 초안이며 저장소를 다시 읽지 않는다.
  2. Core Processing: `createElement`/`textContent`/텍스트 노드로 문서 구조를 만든다. 상위 표면은 하나의 문서이며 제목은 헤딩, lead는 요약 문단, 본문은 실제 문단/목록/표다. 각 의미 영역의 contenteditable 호스트를 분리해 표 셀 입력이 제목/블록 표식을 파괴하지 않게 한다. 입력 위젯이나 블록별 큰 카드 폼으로 되돌리지 않는다.
  3. 텍스트 읽기는 `<br>`와 브라우저가 생성한 줄 단위 `<div>/<p>`를 명시적인 `\n`으로 정규화한다. 목록은 li별 문자열, 표는 헤더와 tbody의 행·열을 그대로 읽는다. 같은 블록의 텍스트 수정은 ID를 유지한다. 이미지의 DOM 설명을 파싱해 blobId를 변경하지 않고 `previous`의 동일 ID 이미지 값을 사용한다.
  4. 문단·목록·표 명령은 복제한 데이터에 적용하고 검증 성공 후 반환한다. 1행/1열인 표에서 마지막 행/열 제거는 거부하고 `표 삭제`는 블록 삭제로 한다. 이동 경계·없는 ID·음수/범위 밖 index는 오류다. 비어 있는 목록의 마지막 항목을 지우면 빈 항목 1개를 남긴다.
  5. 붙여넣기는 먼저 분리된 DOM에서 읽는다. 지원 구조는 p/div/br, 단순 ul/ol/li, 병합 없는 table/thead/tbody/tr/th/td다. b/strong/i/em/span/a의 텍스트는 보존하되 글자별 서식/링크 기능은 저장하지 않고 notices에 알려준다. 목록 번호 스타일은 저장 모델에 없으므로 항목 순서만 유지한다.
  6. script/style/iframe/object/embed/svg/form 및 이벤트 속성·URL·CSS는 실행·전달하지 않는다. 외부 이미지, 병합 표, 중첩 표/중첩 목록처럼 모델로 보존할 수 없는 구조는 자동 삽입하지 않고 오류와 일반 텍스트로 붙여넣는 명시적 대안을 제공한다. 단순 지원 구조만 있는 경우 정상화된 블록을 새 ID로 추가한다. HTML만 있는 입력을 iframe 등으로 렌더링하지 않는다.
  7. Error & Exception Handling: DOM/변환 오류는 `ok:false`로 UI에 전달한다. 잘린 내용·빈 결과를 저장 성공으로 반환하지 않는다. 입력 내용 자체를 콘솔에 남기지 않는다.
  8. State Transition & Return: 성공한 데이터만 `onChange`로 전달한다. 저장소/네트워크/프로젝트 상태를 직접 변경하지 않는다. 내부 코드에 `any`나 불필요한 `unknown`을 추가하지 않는다.

### I02. 문서형 편집 표면과 입력 상태 계약

- Related Files:
  - `components/workspace/production/SlideContentEditor.tsx` :: `SlideContentEditor`, `SlideContentEditorProps` — 현재 폼 교체; modify
  - `components/ui/DadamControls.tsx` :: `DadamButton` — 기존 도구 버튼; read-only
  - `lib/ui/dadam-theme.ts` :: `dadamUi`, `dadamControl` — 현재 테마; read-only

#### Details

- **Signatures & Types**:

```typescript
export interface DocumentEditorState {
  dirty: boolean;
  composing: boolean;
  error: string | null;
}
export interface SlideContentEditorProps {
  value: SlideContent;
  readOnly: boolean;
  error: string | null;
  onChange(value: SlideContent): void;
  onSave(): void;
  busy?: boolean;
  onImage?(file: File): void;
  resetKey?: number; // 기본 0; 명시적인 변경 취소/최신 내용 불러오기 시 증가
  onEditorStateChange?(state: DocumentEditorState): void;
}
export default function SlideContentEditor(props: SlideContentEditorProps): React.ReactElement;
```

- **Data & Schema Fields**:
  - `rootRef:HTMLDivElement|null`, `composing:boolean=false`, `dirty:boolean=false`, `localError:string|null=null`, `lastEmitted:SlideContent`, `lastAppliedResetKey:number=0`, 편집 중 선택 `Range|null`를 로컬에 유지한다. 저장 모델에 추가하지 않는다.
  - 기존 필수 props와 `onImage`는 유지하여 이 Task만 적용해도 기존 `ProductionWorkspace` 호출부가 타입 검사에 통과해야 한다. 새 콜백은 선택적이며 T03에서 초안 보호와 연결한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: readOnly/busy에서는 contenteditable과 변경 버튼을 비활성화한다. 영역·테이블·셀에 구체적인 접근성 이름을 제공하고 버튼은 type=button이다.
  2. Core Processing: 문서 위에 문단/목록/표 추가와 선택한 블록/표의 최소 조작 버튼을 두고, 문서 아래에 오류·미저장 표시와 `슬라이드에 반영`을 둔다. 제목·lead는 빈칸 placeholder를 가진 문서 요소이며 기존 DadamInput/DadamTextarea 폼 나열을 제거한다. 기존 이미지 블록은 삭제 가능한 원본 보존 영역으로 표시한다.
  3. 각 입력에서 원시 DOM 변경 여부를 먼저 dirty로 알린다. 파싱 성공 시 `onChange`, 실패 시 DOM와 오류를 보존한다. 파싱 실패로 부모 데이터가 갱신되지 않아도 `onEditorStateChange({dirty:true,...})`를 전달한다. 그렇지 않으면 화면 이동 시 입력을 잃는다.
  4. `compositionstart`~`compositionend` 동안 DOM 재작성·Enter 전송·구조 조작을 하지 않는다. 조합 종료 뒤 한 번 읽는다. 일반 Enter는 문서 입력이며 저장 단축키로 쓰지 않는다. 제목/lead와 문단 경계를 넘는 구조 파괴는 beforeinput으로 막고 의도한 다음 영역으로 이동한다. 표 셀 Enter는 셀 내부 줄바꿈, Tab은 다음 셀/다음 도구로 이동하며 Tab으로 무단 행을 추가하지 않는다.
  5. 입력마다 React로 innerHTML을 덮지 않는다. 부모가 방금 방출한 value를 다시 전달한 경우 DOM을 유지해 커서/IME를 보존한다. 외부 value 변경은 dirty가 없는 경우에만 반영한다. 명시적인 resetKey 변경은 초안 폐기 승인으로 처리하고 다시 만든다. 조합 중에는 반영 버튼과 reset 경로를 막는다.
  6. 도구 클릭 시 선택 Range를 현재 편집기 내부인지 검증한다. 다른 문서의 Range를 사용하지 않는다. 구조 변경 전 DOM을 읽고, 성공한 결과를 기반으로 명령을 적용한다. 오류 상태에서는 블록 변경/반영을 막고 사용자가 원문을 수정·취소하게 한다.
  7. 인라인 호스트에 일반 텍스트 붙여넣기는 현재 선택에 삽입한다. 여러 블록/표 구조 붙여넣기는 본문 블록 위치에서 정상화 후 삽입한다. 제목/lead/표 셀에는 복잡한 구조를 삽입하지 않고 명시적 일반 텍스트 대안을 제공한다. 기존 onImage는 보존하되 새 외부 이미지 추출 엔진은 추가하지 않는다.
  8. 모든 입력·편집 도구에는 `data-comment-control`을 둔다. 편집기의 키/붙여넣기 이벤트가 상위 슬라이드 선택·삭제로 중복 처리되지 않게 한다. CSS는 파일 내 Griffel/기존 tw: 토큰을 사용하고 전역 테마를 변경하지 않는다.
  9. Error & Exception Handling: `localError`/부모 error를 읽을 수 있게 표시한다. IME·오류·busy 시 반영을 막는다. 성공 안내는 부모의 저장 성공 후 상태를 따른다.
  10. State Transition & Return: 반영 버튼은 `onSave`만 호출한다. 자동 저장·focusout 저장을 하지 않는다. 원시 dirty/조합/오류는 부모에 전달하고 저장소는 부모 훅이 담당한다.

### I03. 초안 충돌과 Template 연결 정합성

- Related Files:
  - `hooks/workspace/use-slide-draft.ts` :: `useSlideDraft`, `setContent`, `save` — 초안 저장; modify
  - `lib/workspace/production/editor.ts` :: `refreshSlideDraft` — 외부 회차 변경 시 초안 보호; modify
  - `lib/workspace/production/schemas.ts` :: `ProposalSlideSchema` — 연결 검증; read-only

#### Details

- **Signatures & Types**: 기존 `createSlideDraft(view,slide):SlideDraft`, `refreshSlideDraft(draft,view,slide):{draft:SlideDraft;conflict:boolean}`, `useSlideDraft(view,slide)`의 반환 `draft/conflict/error/busy/save/setContent/setTemplate/discard` 계약을 유지한다.
- **Data & Schema Fields**: `SlideDraft { projectId:string, round:number, slideId:string, baseRevision:number, content:SlideContent, template:SlideTemplateRef|null, dirty:boolean }`. `SlideTemplateRef {pinId:string,sourceSlidePath:string,bindings:{key:string,objectId:string}[]}`. `key`는 title/lead/실제 블록 ID만 허용한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 이전 draft가 dirty라면 프로젝트·회차·슬라이드·revision이 달라도 자동으로 `createSlideDraft`를 호출해 버리지 않는다. 기존 draft를 반환하고 conflict=true로 표시한다. clean 상태에서는 최신 view/slide로 정상 재구성한다.
  2. Core Processing: `setContent`는 내용과 Template bindings를 한 번에 갱신한다. 제거된 블록의 binding을 제거한다. 기존 ID의 종류가 바뀌면 해당 binding도 해제한다. 유지된 종류/ID의 binding과 title/lead 연결은 유지한다. 스키마를 완화해 dangling binding을 허용하지 않는다.
  3. save는 draft의 `baseRevision/round/projectId/slideId`로 기존 `save-slide` 명령을 호출한다. conflict를 현재 revision으로 몰래 덮어써 저장하지 않는다. 성공 응답의 동일 slide로 clean draft를 만든다. 원시 DOM 오류/조합 상태 차단은 T03 부모에서 추가 연결한다.
  4. Error & Exception Handling: 기존 `WorkspaceError("VALIDATION",...)`와 mutation 오류를 유지한다. 충돌·권한 오류 시 입력은 그대로 둔다. onDiscard는 명시적으로 최신 값으로 리셋한다.
  5. State Transition & Return: 이 Task는 스키마·DB 변경 없이 초안과 binding 일관성만 보완한다. T03에서 권한·회차를 React key에 넣어 초안을 재마운트로 버리지 않도록 연결한다.

## Acceptance Criteria

- [x] 항목별 폼 대신 문서형 표면에서 문단·목록·표를 편집하고 명시적으로 반영한다.
- [x] title/lead/빈 문단/목록/다중 행·열 표/이미지의 데이터 왕복과 ID가 보존된다.
- [x] 블록 삭제 후 Template dangling binding이 남지 않고 유지 블록 연결은 유지된다.
- [x] 파싱 실패·한글 조합·외부 값 변경 중 원시 DOM와 초안을 조용히 폐기하지 않는다.
- [x] readOnly/busy 상태에서 직접 DOM 입력·도구·반영이 막힌다.
- [x] 기존 호출부가 변경 없이 타입 검사에 통과한다. 헤더·코멘트·라우트·DB는 변경하지 않는다.

## Validation

- `npm.cmd run typecheck` — 기존 호출부와 새 편집기 계약 오류 0.
- `npx.cmd eslint lib/workspace/production/document-editor.ts lib/workspace/production/editor.ts hooks/workspace/use-slide-draft.ts components/workspace/production/SlideContentEditor.tsx` — 변경 파일 오류 0.
- PowerShell here-string에 검증 코드만 작성하여 `@' ... '@ | npx.cmd tsx`로 stdin 실행한다. 파일을 생성하지 않는다. `node:assert/strict`, 설치된 `jsdom`, 새 변환 함수를 import하여 다음을 각각 assert한다: 모든 블록 왕복 deepEqual, 빈 문자열 유지, ID 유지, 2×2 표 행/열 추가·삭제, 마지막 행/열 거절, 중복 ID/알 수 없는 이미지 ID 거절, 길이 초과 거절, script/이벤트/외부 이미지 미삽입, 병합 표·중첩 구조 거절, unsupported 서식 notices, 입력 원본 불변성, dirty 회차 변경 시 초안 보존. 단순 HTML 실제 실행/네트워크는 하지 않는다.
- `git diff --check` — 공백 오류 0. 검증 범위와 건수를 실제 결과로 기록한다. tests 파일/폴더·브라우저·dev server를 만들지 않는다.

## Commit Message

```text
feat(write): 구조를 보존하는 문서형 슬라이드 편집기 구현

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T01-document-editor

- 문서 입력과 목록·표를 기존 슬라이드 데이터로 변환
- 입력 조합과 미저장 초안을 보호하고 Template 연결 정합성 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일과 함께 커밋한 Task: T01-document-editor 구현 커밋

Task 완료 뒤 Status/phase 진행률을 갱신하고 한국어 커밋을 만든다. `.memory/current.md`는 로컬 ignored 상태로 T02를 가리키게 갱신한다. push와 무관한 변경 stage는 하지 않는다.

## Execution Record

- 2026-11-05: 문서 편집·구조 명령·안전한 붙여넣기·원시 입력 상태 및 Template binding 보존 구현.
- 검증: typecheck, 변경 4개 파일 ESLint, git diff --check 통과. stdin DOM/명령/초안 24개와 UTF-8·빈 목록 3개 assertion 통과.
- 실제 브라우저·IME·포인터 검증은 지속 정책에 따라 수행하지 않음. tests/ 생성 없음.
- 학습: 블록 ID는 Template 연결 키이므로 텍스트 수정 시 재생성하지 않는다. 원시 DOM 파싱 오류도 dirty로 부모에게 전달한다.
- 범위 밖 발견: 특이사항 없음.
