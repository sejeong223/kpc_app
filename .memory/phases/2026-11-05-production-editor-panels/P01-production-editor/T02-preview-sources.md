# Task: T02 기본·Template 미리보기와 읽기 전용 출처

## Status: done

## Goal

저장된 슬라이드를 중앙과 썸네일에서 같은 방식으로 표시하고, 선택한 슬라이드의 RFP·참조 자료를 실제 저장 정보로 조회한다. Template 없는 기본 표시와 연결 오류를 구분하며 원문은 정확한 회차·자료 버전으로 연다. T01 완료 후 실행하고 실제 화면 조립은 T03에서 한다.

## Decision Summary

- 사용자 선택: Template 미연결이면 기본 16:9, 연결되어 있으면 해당 Template, 출처는 조회·원문 열기만 제공한다.
- 기존 데이터·권한·보관본을 유지한다. RFP 파일 연결 모델, 출처 편집, 기본 레이아웃 PPT 출력, 새 공용 UI·패키지·DB 스키마는 추가하지 않는다.

## Implementation

### I01. 전체 목록·출처·미리보기용 읽기 모델

- Related Files:
  - `lib/workspace/production/presentation.ts` :: `selectProductionSlides`, `selectProductionSources`, `productionPreviewFingerprint` — 제작 전용 순수 계산; new
  - `types/workspace-production.ts` :: `ProjectView`, `ProposalSlide`, `Chapter`, `Section`, `SourceRef`, `Requirement` — 저장 계약; read-only
  - `types/workspace-files.ts` :: `FileWorkspaceView`, `FileResourceView` — 자료 조회 계약; read-only
  - `lib/workspace/production/selectors.ts` :: `outlineNumbers`, `selectSnapshotView` — 번호/보관본; read-only

#### Details

- **Signatures & Types**:

```typescript
export interface ProductionSlideRow {
  slide: ProposalSlide; section: Section; chapter: Chapter;
  number: number; sectionNumber: string; mine: boolean; editable: boolean;
}
export interface ProductionSourceCard {
  id: string; group: "rfp" | "reference"; title: string;
  page: number | null; quote: string | null;
  provenance: "mock" | "manual";
  resource: FileResourceView | null; round: number | null;
  missingReason: string | null;
}
export function selectProductionSlides(view: ProjectView): ProductionSlideRow[];
export function selectProductionSources(
  view: ProjectView, slide: ProposalSlide | null, files: FileWorkspaceView | null,
): ProductionSourceCard[];
export function productionPreviewFingerprint(view: ProjectView, slide: ProposalSlide): string;
```

- **Data & Schema Fields**:
  - `ProjectView.state.body`: chapters/sections/slides/requirements/settings/threads/canvasComments. 호출자는 `selectSnapshotView`를 거친 조회 회차의 view를 전달한다.
  - Chapter=id/title, Section=id/chapterId/title/assigneeIds/reviewerIds/state(writing|done)/locked. 순서는 각 배열과 관계를 사용한다.
  - `SourceRef {id,kind:"requirement"|"file",targetId,fileRound:number|null,versionId:string|null,page:number|null,quote:string|null,provenance:"mock"|"manual"}`. file은 fileRound/versionId 필수, requirement는 두 값이 반드시 null이다.
  - `Requirement {id,sectionId:string|null,title,coverage:"none"|"partial"|"full",page:number|null,excerpt:string|null,provenance}`에는 원문 파일 식별자가 없다.
  - 자료는 `FileWorkspaceView.rounds[].number`, `resources[].asset.id`, `resources[].version.id/label/source`로 연결한다. 카드의 resource/round=null이면 원문을 열 수 없으며 missingReason을 표시한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 다른 프로젝트 file view를 합치지 않는다. slide=null이면 빈 배열이다. 자료 조회 오류와 빈 데이터는 UI에서 구분한다.
  2. Core Processing: chapters 순서 → 해당 sections 순서 → 해당 slides 저장 순서로 펼치고 번호를 1부터 부여한다. mine은 assigneeIds의 actor.id 포함 여부, editable은 capabilities.editableSectionIds로 계산한다. 배열을 제자리 정렬하지 않는다.
  3. RFP는 같은 sectionId의 requirements와 명시적으로 참조한 requirement ID를 합쳐 중복 제거한다. 미연결 요구사항은 명시 참조가 있을 때만 포함한다. 참조의 page/quote가 있으면 우선하고 없으면 Requirement.page/excerpt를 사용한다. 삭제된 참조도 `요구사항 확인 필요`로 남긴다.
  4. 현재 스키마로 RFP 원문 파일을 특정할 수 없으므로 resource/round=null, `원문 파일 연결 정보 없음`으로 표시한다. 첫 업로드 RFP나 유사한 파일명으로 추측 연결하지 않는다.
  5. file 참조는 fileRound/versionId/targetId가 모두 일치해야 연결한다. 누락되면 원본 확인 필요를 표시한다. 현재 priority가 제외라고 과거에 연결한 출처를 지우지 않는다. 출처를 추천·자동 추출하지 않는다.
  6. fingerprint는 저장 content/template/usedSettings, 사용한 자산 pin의 revision과 access status/reason을 JSON으로 직렬화한다. 프로젝트 전체 revision·코멘트·선택 상태는 제외한다. 사용자/프로젝트/회차/snapshot/slide ID는 Query key의 별도 구간으로 포함한다.
  7. Error & Exception Handling: 조회 중 files=null과 조회 완료 후 원본 누락을 구분하여 성급하게 누락 안내를 표시하지 않는다. 순수 함수는 입력을 변경하거나 저장하지 않는다.
  8. State Transition & Return: 안정적인 카드 ID와 전체 순서의 행을 반환한다. null 페이지·인용문을 가짜 값으로 채우지 않는다.

### I02. Template 조회와 저장 이미지 접근

- Related Files:
  - `hooks/workspace/use-production-preview.ts` :: `useProductionPreview`, `useSlideImageUrl` — 조회와 URL 수명; new
  - `services/workspace/WorkspaceProductionService.ts` :: `previewSlide`, `loadSlideImage` — 기대 버전 검사·기존 이미지 조회; modify
  - `hooks/workspace/use-workspace-production.ts` :: `activeWorkspaceRead` — 수명 경계; read-only
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: `readBlob` — namespace/참조/hash 확인; read-only

#### Details

- **Signatures & Types**:

```typescript
// 기존 previewSlide 입력에 expected만 선택적으로 추가한다.
previewSlide(input: {
  projectId: string; slideId: string; snapshotId: string | null;
  content?: SlideContent; template?: SlideTemplateRef;
  expected?: { round: number; slideRevision: number };
}, signal?: AbortSignal): Promise<{ preview: TemplatePreviewData; warnings: string[] }>;
loadSlideImage(input: {
  projectId: string; slideId: string; blockId: string; snapshotId: string | null;
  expected: { round: number; slideRevision: number };
}, signal?: AbortSignal): Promise<{ blob: Blob; alt: string; width: number; height: number }>;
export function useProductionPreview(
  view: ProjectView, slide: ProposalSlide, snapshotId: string | null, enabled: boolean,
): UseQueryResult<{ preview: TemplatePreviewData; warnings: string[] }, WorkspaceError>;
export function useSlideImageUrl(
  view: ProjectView, slide: ProposalSlide, blockId: string,
  snapshotId: string | null, enabled: boolean,
): { url: string | null; loading: boolean; error: WorkspaceError | null };
```

- **Data & Schema Fields**:
  - Template key=`[...runtime.queryScope,"production-preview",projectId,snapshotId,round,slideId,fingerprint]`, staleTime=Infinity, gcTime=5분, retry=false, refetchOnWindowFocus=false.
  - `UseQueryResult`는 `@tanstack/react-query`, `TemplatePreviewData`는 `types/template-work.ts`, `WorkspaceError`는 `lib/workspace/production/errors.ts`에서 가져온다.
  - 이미지 key는 같은 scope의 `production-image` 구간과 projectId/snapshotId/round/slideId/blockId/blobId를 포함한다. 캐시에는 Blob을 저장하고 객체 URL은 각 소비자가 관리한다.
  - expected.round=조회 view.state.currentRound, expected.slideRevision=조회 slide.revision. 저장 스키마 변경 없이 로컬 서비스 요청에만 추가한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 서비스의 기존 load/context/target/alive를 사용한다. ID는 WorkspaceIdSchema, expected는 양의 정수로 검증한다. 선택된 target의 회차·slide revision 불일치는 CONFLICT다.
  2. Core Processing: previewSlide는 render 전 expected를 확인하고 기존 render 후 requested 검사를 유지한다. 새 조회 훅은 content/template 덮어쓰기를 넘기지 않고 저장본만 요청하므로 읽기 전용 사용자도 조회할 수 있다.
  3. loadSlideImage는 target의 slide 안에 실제 존재하는 image block만 허용한다. UI가 blobId만 직접 요청하지 못하게 한다. repository.readBlob(projectId,block.blobId) 후 kind=image, MIME, 존재·정합성을 확인한다. 마지막에도 context/alive와 요청 당시 revision/round를 확인한다. Blob/DB 쓰기를 추가하지 않는다.
  4. 훅은 activeWorkspaceRead와 Query의 AbortSignal을 사용한다. Template이 없거나 해당 pin의 접근이 불허되면 Template query를 실행하지 않는다. 캐시에 데이터가 있어도 현재 접근 불가면 표시하지 않는다.
  5. 중앙과 썸네일은 같은 key로 중복 요청을 합친다. 썸네일은 IntersectionObserver(rootMargin=200px)로 가시 영역 근처에서만 enabled로 만들고 현재 선택은 우선한다. observer가 없으면 현재 선택만 조회하고 나머지는 아직 읽지 않은 상태를 표시한다. 200장을 한꺼번에 생성하지 않는다.
  6. 내용/Template/적용 자산 변경은 새 fingerprint로 자동 조회한다. 코멘트 저장만으로 전체 PPT를 다시 만들지 않는다. 진행 중 변경으로 CONFLICT가 발생하면 최신 view에서 재시도할 수 있게 하며 무한 재시도하지 않는다.
  7. 이미지 훅은 현재 결과에만 createObjectURL하고 대상 변경·해제·접근 상실에 revokeObjectURL한다. 다른 소비자의 URL을 폐기하지 않는다. 이미지 누락 시 alt와 오류를 표시하고 다른 이미지를 대신 보여주지 않는다.
  8. Error & Exception Handling: 기존 WorkspaceError의 VALIDATION/NOT_FOUND/CONFLICT/FORBIDDEN/ORIGINAL_MISSING/STORAGE/CANCELLED를 사용한다. 취소를 성공 또는 반복 오류 토스트로 처리하지 않는다.
  9. State Transition & Return: 다른 scope/slide/snapshot/fingerprint의 늦은 결과를 현재 대상에 보여주지 않는다. 서비스 경계를 우회해 UI가 저장소에 직접 접근하지 않는다.

### I03. 기본·Template 슬라이드 표시

- Related Files:
  - `components/workspace/production/BasicSlidePreview.tsx` :: `BasicSlidePreview` — 기본 표시; new
  - `components/workspace/production/ProductionPreview.tsx` :: `ProductionPreview` — 표시 분기; modify
  - `components/admin/templates/workbench/TemplateSlidePreview.tsx` :: `TemplateSlidePreview` — 기존 구조 표시; read-only
  - `components/workspace/production/SlideTemplatePicker.tsx` — T03 보조 설정; read-only

#### Details

- **Signatures & Types**:

```typescript
export interface BasicSlidePreviewProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null;
  mode: "full" | "thumbnail"; enabled: boolean;
  onOverflow?(value: boolean): void;
}
export default function BasicSlidePreview(props: BasicSlidePreviewProps): React.ReactElement;
export interface ProductionPreviewProps {
  view: ProjectView; slide: ProposalSlide; snapshotId: string | null;
  mode?: "full" | "thumbnail"; number?: number;
  // T03에서 호출부와 동시에 제거할 임시 호환 props. 저장본 표시에 사용하지 않는다.
  content?: SlideContent; template?: SlideTemplateRef | null;
  dirty?: boolean; overlay?: React.ReactNode;
}
export default function ProductionPreview(props: ProductionPreviewProps): React.ReactElement;
```

- **Data & Schema Fields**: 실제 표시 원본은 slide.content/slide.template. title/lead/text/list/table/image를 모두 처리한다. mode 기본값=full, number/overflow는 UI 상태이며 저장하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Template=null은 BasicSlidePreview, 유효한 연결은 Template query, 연결된 원본·권한이 불명이면 오류와 제작 설정 재선택 경로다. 오류를 기본 표시로 숨기지 않는다.
  2. Core Processing: 기본은 960×540 가상 캔버스를 부모 폭에 맞춰 같은 비율로 축소한다. full/thumbnail의 내부 레이아웃은 동일하다. 기존 Dadam 글꼴·테마 변수로 제목·lead·본문·표·이미지를 표시하며 전역 디자인을 수정하지 않는다.
  3. ResizeObserver로 scale과 바깥 높이(width×9/16)를 계산한다. 폭 0일 때는 측정을 기다린다. 본문 넘침은 감지하여 full에서 안내와 전체 본문 펼치기를, thumbnail에서 초과 상태를 표시한다. 조용한 잘림이나 무제한 글자 축소를 하지 않는다.
  4. 기존 TemplateSlidePreview의 객체는 role=button/tabIndex=0이다. 제작에서는 객체를 선택하지 않으므로 제작 쪽 inert 래퍼로 내부 조작·포커스를 막고 외부에 읽기용 aria-label을 둔다. 관리자 컴포넌트는 수정하지 않으며 썸네일 버튼 안에 또 조작 버튼을 넣지 않는다.
  5. 재시도/설정 링크만 data-comment-control로 표시한다. 정적 슬라이드 표면에는 기존 캔버스 핀을 놓을 수 있어야 한다. 새 슬라이드별 코멘트 overlay를 만들지 않는다.
  6. Error & Exception Handling: 구조 미리보기의 warnings와 제한을 표시한다. 잘린 출력이나 기본 표시를 실제 PPT 생성 성공으로 알리지 않는다.
  7. State Transition & Return: 선택·반영 후 자동 표시하고 수동 갱신은 오류 재시도 용도로만 제공한다. 임시 호환 props를 받아도 저장본을 표시한다.

### I04. 읽기 전용 출처 패널

- Related Files:
  - `components/workspace/production/SourcePanel.tsx` :: `SourcePanel` — 두 그룹 표시; modify
  - `hooks/workspace/use-workspace-files.ts` :: `useFileWorkspace`, `useWorkspaceFileHistory` — 자료 조회; read-only
  - `components/workspace/files/FilePreviewDialog.tsx` :: `FilePreviewDialog` — 원문 보기; read-only

#### Details

- **Signatures & Types**: `SourcePanel({view,slide,snapshotId,number?}: {view:ProjectView;slide:ProposalSlide|null;snapshotId:string|null;number?:number}):React.ReactElement`. T02에서는 기존 호출 호환용 onSlide?/comments?를 선택적 타입으로 받아 무시하고, T03에서 호출과 타입을 함께 제거한다.
- **Data & Schema Fields**: `preview:{resource:FileResourceView;round:number}|null=null`. 현재는 useFileWorkspace(projectId), 보관본은 useWorkspaceFileHistory(projectId,snapshotId)의 반환값을 쓴다. 두 훅은 항상 호출하되 snapshot 조회에서 live 훅의 projectId는 null로 비활성화한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 로딩/오류/선택 없음/조회 완료 후 비어 있음을 구분한다. 자료 조회 실패를 출처 없음으로 숨기지 않는다.
  2. Core Processing: 출처 제목·슬라이드 번호·소목차, RFP와 참조 자료의 건수/카드를 표시한다. 기존 RFP/자료/의견 탭, set-sources mutation, 수동 연결 Select, 출처 삭제, coverage 수정, 의견을 제거한다.
  3. page=null이면 번호를 만들지 않고 quote=null이면 인용 블록을 생략한다. mock이면 짧은 시연 자료 표시를 한다. 실제 버전이 일치하는 resource/round가 있는 카드만 원문을 여는 버튼으로 만든다.
  4. 클릭 시 동일 projectId/resource/round를 FilePreviewDialog로 넘긴다. 보관본에서 찾을 수 없는 자료를 현재 자료로 채우지 않는다. 옛 버전을 최신 버전으로 대체하지 않는다. RFP에는 원문 미연결 설명만 표시한다.
  5. slide/project/round/snapshot 변경 시 열린 원문 대화상자를 닫는다. 파일/웹 열기는 기존 뷰어를 재사용하고 PDF 특정 위치 하이라이트를 새로 만들지 않는다.
  6. Error & Exception Handling: 원본 누락은 카드에 남기고 이유를 표시한다. 실제 읽기 권한만 사용하며 출처 수정 권한이나 별도 저장·통신을 추가하지 않는다.
  7. State Transition & Return: 출처 변경 명령을 한 번도 호출하지 않는다. 카드/링크 제어에만 data-comment-control을 부여한다.

## Acceptance Criteria

- [x] Template 없이 실제 본문·표·기존 이미지를 기본 16:9로 표시한다.
- [x] 중앙/썸네일이 같은 저장본과 디자인을 자동 표시하고 현재 접근 권한을 확인한다.
- [x] Template 연결 실패를 기본 표시로 숨기지 않고 다른 대상의 캐시를 보여주지 않는다.
- [x] 이미지 조회가 대상 slide의 참조로 제한되며 객체 URL을 적절히 해제한다.
- [x] 출처는 두 그룹의 읽기 전용 목록이고 실제 회차/asset/version만 원문으로 연다.
- [x] 보관본에 현재 자료를 섞지 않고 빈 상태/조회 실패/원본 불명을 구분한다.
- [x] T03 전에도 기존 호출자와 서비스의 타입 호환이 유지된다.

## Validation

- `npm.cmd run typecheck` — 신·구 호출과 서비스 입력이 일치한다.
- `npx.cmd eslint lib/workspace/production/presentation.ts hooks/workspace/use-production-preview.ts components/workspace/production/BasicSlidePreview.tsx components/workspace/production/ProductionPreview.tsx components/workspace/production/SourcePanel.tsx services/workspace/WorkspaceProductionService.ts` — 변경 파일 오류 0.
- PowerShell의 리터럴 here-string을 `npx.cmd tsx` stdin으로 전달하는 인라인 검증: node:assert/strict로 대목차 2개·소목차 3개의 전체 순서/번호, 입력 불변성, 섹션별 출처 분리, 요구사항 중복 제거, 미연결 RFP, null 페이지/인용문, 같은 이름의 다른 버전 거절, 보관본에 현재 자료 미혼입, 댓글 변경 시 fingerprint 동일, 내용/Template/권한 변경 시 fingerprint 변화를 assert한다.
- WorkspaceRepository를 만족하는 인메모리 구현으로 이미지의 다른 block/유형/project/snapshot 및 회차·revision 불일치, Blob 누락 거절과 성공 시 쓰기 0회를 확인한다. 테스트 파일/폴더는 생성하지 않는다.
- `git diff --check` — 공백 오류 0. 실제 브라우저/PDF/이미지 배치 실측, E2E, dev server 검증은 하지 않는다.

## Commit Message

```text
feat(write): 기본 슬라이드 미리보기와 출처 조회 연결

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T02-preview-sources

- 저장본 기준 기본·Template 미리보기와 이미지 조회 제공
- 실제 회차·자료 버전으로 RFP 및 참조 자료 표시
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일과 함께 커밋한 Task: T02-preview-sources 구현 커밋

완료 시 Task/phase를 갱신하고 지정 한국어 커밋 후 local ignored current를 T03로 전진한다. 무관한 파일·현재 포인터 강제 stage와 push는 하지 않는다.

## Execution Record

- 저장본용 기본 16:9/Template 미리보기·공유 Query 캐시·가시 영역 썸네일·이미지 Blob URL 수명 구현.
- 읽기 전용 출처와 정확한 회차/자료/버전 연결. RFP 파일 식별자 미존재는 추측하지 않고 안내.
- 검증: typecheck, 변경 6개 파일 ESLint, git diff --check 통과. 읽기 모델/출처/fingerprint/서비스 이미지 경계 인라인 34개 assertion 통과, 저장소 쓰기 0회.
- 실제 렌더링·PDF·이미지 배치는 지속 정책에 따라 브라우저 검증하지 않음. 범위 밖 발견: 특이사항 없음.
