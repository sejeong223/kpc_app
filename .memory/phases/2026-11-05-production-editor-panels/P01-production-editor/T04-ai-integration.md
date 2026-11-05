# Task: T04 단일·다중 AI 비교 적용과 최종 통합 검증

## Status: pending

## Goal

T03의 중앙 편집 영역에 기존 시연 AI를 연결하여 단일·다중 슬라이드의 수정 요청, 변경 전후 비교, 선택 적용, 원문 유지, 다시 생성이 동작하게 한다. 기존 목차 AI·헤더·코멘트에 영향을 주지 않고 전체 제작 흐름을 검증한다.

## Decision Summary

- AI 결과는 기존 mock이며 실제 모델·원문 분석·RAG·과금은 연결하지 않는다. 결과를 검토하기 전에는 저장본을 바꾸지 않는다.
- 기존 useWorkspaceProposals/ProposalReview/ContentDiff와 서비스 권한·revision 검사를 재사용한다. 요청 전체 대상의 권한 변경·취소·늦은 응답을 확인한다. 새로운 네 번째 패널을 만들지 않는다.

## Implementation

### I01. 중앙의 단일·다중 요청 UI

- Related Files:
  - `components/workspace/production/ProductionAiPanel.tsx` :: `ProductionAiPanel` — 중앙 요청과 대상 표시; modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: 중앙 구성/다중 선택 미리보기 — T03 결과 연결; modify
  - `components/workspace/production/ProductionPreview.tsx` — T02 저장본 표시; read-only
  - `components/workspace/production/ProductionJobStatus.tsx` — 진행·실패·재시도; read-only

#### Details

- **Signatures & Types**:

```typescript
export interface ProductionAiPanelProps {
  view: ProjectView;
  slideIds: string[];
  sectionId: string | null;
  busy?: boolean;
  onPropose(request: MockRequest): void;
}
export default function ProductionAiPanel(props: ProductionAiPanelProps): React.ReactElement;
// T03 ProductionWorkspaceProps의 기존 슬롯을 사용한다.
// onPropose?: (request: MockRequest) => void
// aiFeedback?: React.ReactNode
// aiBusy?: boolean
```

- **Data & Schema Fields**:
  - `MockRequest extends ProjectRequest {kind:"recommend-toc"|"edit-toc"|"draft"|"polish"|"check",sectionIds:string[],slideIds:string[],instruction:string}`. 제작 UI는 draft/polish/check만 사용한다.
  - 단일/다중 slideIds는 T02 전체 목록 순서의 존재하는 ID 집합이다. `sectionIds`는 slideIds가 없고 빈 섹션의 초안을 만들 때만 `[sectionId]`, 나머지는 `[]`다.
  - 로컬 `instruction:string=""`, `kind:"draft"|"polish"|"check"="polish"`. 기존 최대 4,000자 입력 제한을 유지한다. 선택·요청 정보는 DB에 별도 저장하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 선택한 모든 slide가 존재하고 편집 가능해야 draft/polish를 제공한다. phase=completed 또는 snapshot이면 요청을 숨긴다. check는 기존 actions.outline을 따른다. 고정/권한 없는 항목을 자동 제외하지 않는다.
  2. 단일 선택에서는 문서형 직접 편집을 기본으로 두고 AI 요청을 보조 영역으로 제공한다. 다중 선택 시 N장·실제 번호/제목을 표시한 요청 영역을 중앙 위에 보여주며 선택한 저장본 미리보기를 전체 목록 순서로 아래에 배치한다.
  3. 초안 생성·문장 다듬기·분량 줄이기·표 정리·누락 점검 등 기존 요청 목록과 instruction을 재사용한다. quick action도 동일한 onPropose와 저장 전 검토 경로를 사용한다. 새로운 문구별 가짜 성공 토스트를 만들지 않는다.
  4. 실제 요청은 버튼으로 수행한다. Enter는 여러 줄 입력으로 두어 문서 편집·한글 조합과 충돌하지 않게 한다. busy 또는 공백 요청에서는 전송하지 않는다. `시연용 AI`를 요청/결과에서 알아볼 수 있게 표시한다.
  5. 직접 편집에서 다중 요청 화면으로 전환하기 전에 T03의 runtime.navigate/초안 보호를 통과한다. 미저장 원시 DOM 오류가 있으면 저장 선택으로 우회하지 못하고 편집 계속/폐기를 선택하게 한다.
  6. 선택 변경 시 instruction을 다른 대상에게 조용히 제출하지 않는다. 선택 대상을 표시하고 요청 시점의 ID를 캡처한다. 사용자·프로젝트·보관본 전환에는 요청 영역을 새 scope로 초기화한다.
  7. AI 요청·진행·오류는 중앙 aiFeedback 슬롯에 배치한다. 비교 결과는 기존 ProposalReview 모달을 사용하므로 별도 상시 우측 패널이나 출처의 의견 탭을 추가하지 않는다.
  8. Error & State Transition: 실패하면 instruction/선택을 유지하고 재시도·닫기를 제공한다. 결과 생성만으로 저장본·썸네일·출처를 바꾸지 않는다. 적용 성공 후 기존 Query 갱신으로 함께 반영한다.

### I02. 기존 WorkspaceFlow와 요청/적용의 최신 상태 확인

- Related Files:
  - `components/workspace/shared/WorkspaceFlow.tsx` :: `start`, 제작 feedback/적용 처리 — 단일 AI 조정자; modify
  - `components/workspace/production/ProposalReview.tsx` :: `ProposalReview` — 전체 대상 차단 이유; modify
  - `lib/workspace/production/diff.ts` :: `proposalItemAllowed` — 기존 항목 권한; read-only
  - `services/workspace/WorkspaceProductionService.ts` :: `propose`, `applyProposal` — 기존 시연 제안·commit; read-only

#### Details

- **Signatures & Types**:

```typescript
// 기존 ProposalReview props 유지 + optional만 추가
interface ProposalReviewProps {
  view: ProjectView;
  proposal: WorkspaceProposal;
  busy: boolean;
  error: string | null;
  onApply(ids: string[]): void;
  onKeep(): void;
  onRegenerate(): void;
  blockedReason?: string | null;
}
```

- **Data & Schema Fields**:
  - `WorkspaceProposal {id,projectId,round,baseRevision,kind,items:ProposalItem[],mock:true,createdAt}`.
  - `ProposalItem {id,sectionId:string|null,slideId:string|null,title,before:string,after:string,warnings:string[],affectedSectionIds:string[]}`.
  - `applyProposal` 입력은 `{projectId,expectedRevision,expectedRound,proposalId,itemIds}`다. expectedRevision은 제안의 baseRevision이며 최신 revision으로 몰래 갱신하지 않는다.
  - 기존 scene의 `view`는 조회 중 보관본일 수 있고 `liveView`는 실제 현재 상태다. 모달 권한/변경 감지는 liveView로 판단하고 snapshot 조회 중에는 제작 요청·적용을 차단한다.

- **Execution Flow / Logic**:
  1. WorkspaceFlow가 useWorkspaceProposals를 한 번만 소유한다. toc branch의 기존 PptControls와 요청 UI는 유지한다. write branch는 `<ProductionWorkspace onPropose={start} aiBusy={...} aiFeedback={...} .../>`를 사용하고 actions/PPT/의견을 추가하지 않는다.
  2. start는 요청 ID/지시문을 캡처하고 runtime.navigate 안에서 loadProjectView로 최신 상태를 읽는다. guard에서 저장/폐기 후 돌아온 실제 상태의 revision/round를 사용한다. 캡처한 프로젝트가 현재 선택과 같은지, snapshot이 아닌지, 대상이 모두 존재·편집 가능한지 재확인한다.
  3. 기존 start처럼 expectedRevision만 바꾸고 다른 프로젝트/회차의 대상을 보내지 않는다. 빈 섹션 초안도 section의 존재·권한을 확인한다. 일부 대상이 잘못되면 전체 요청을 거절하고 이유를 표시한다.
  4. 제작용 feedback는 requestError, propose 진행·실패, 적용 오류를 보여준다. 취소는 close, 재시도/다시 생성은 초안 보호 후 regenerate를 실행한다. toc의 기존 결과 표시 위치/동작은 유지한다.
  5. 결과 모달은 proposalItemAllowed의 기존 개별 조건을 유지한다. write의 원래 request에 포함된 대상 중 삭제/고정/권한 상실이 있으면 blockedReason을 전달하여 전체 적용을 막는다. 권한 없는 항목을 기본 선택에서 조용히 제외하여 나머지만 성공시키지 않는다. 사용자가 허용된 변경 중 일부를 명시적으로 선택하는 기능은 유지한다.
  6. stale은 projectId/round/baseRevision을 모두 비교한다. stale/blocked/busy/선택항목 없음에서는 적용 버튼을 막는다. blockedReason은 이유와 재선택·다시 생성 경로를 설명한다. 기존 제안에 포함되지 않은 itemId를 보내지 않는다.
  7. onApply도 runtime.navigate 안에서 실행한다. 초안 저장 때문에 revision이 바뀌면 applyProposal의 기존 CONFLICT를 그대로 표시하며 자동 재생성·재적용하지 않는다. 입력의 expectedRevision을 최신 값으로 덮어쓰지 않는다.
  8. 적용 실패 시 모달·선택·원문을 유지한다. 성공 후 proposals.close, 기존 invalidateProject, T03의 안정적 선택 복원을 사용한다. 모달 닫기/원문 유지에는 DB 쓰기를 하지 않는다.
  9. `ProposalReview`의 blockedReason은 optional로 추가하여 toc와 기존 호출부를 깨지 않는다. 공유 권한 함수나 목차 정책을 제작 편의를 위해 완화하지 않는다.

### I03. 취소·scope 전환 후 늦은 결과 차단

- Related Files:
  - `hooks/workspace/use-workspace-proposals.ts` :: `useWorkspaceProposals` — 기존 abort/discard의 요청 세대 보완; modify
  - `services/workspace/WorkspaceProductionService.ts` :: `discardProposal` — 기존 임시 후보 정리; read-only

#### Details

- **Signatures & Types**: 기존 반환의 `propose`, `apply`, `request`, `error`, `start(input:MockRequest):void`, `regenerate():Promise<void>`, `close():void`와 소비자가 쓰는 `propose.data:WorkspaceProposal|undefined`, `propose.isPending`, `propose.error`를 유지한다.
- **Data & Schema Fields**: hook 내부 `generationRef:number=0`, `AbortController|null`, `proposalId:string|null`, `request:MockRequest|null`. 내부 mutation 변수는 `{request:MockRequest,generation:number}`로 묶을 수 있으나 외부에는 기존 데이터 계약으로 노출한다. 영속 모델을 변경하지 않는다.
- **Execution Flow / Logic**:
  1. start/재생성/close/unmount 시 generation을 갱신한다. 새 요청 전 기존 abort와 후보 discard를 수행한다.
  2. service.propose 응답 후 generation과 runtime.isActive를 확인한다. 이미 취소되었거나 대체된 요청이라면 반환 후보 ID를 즉시 discard하고 화면 data로 채택하지 않는다. abort를 보냈다는 이유만으로 응답이 안 온다고 가정하지 않는다.
  3. mutation data를 UI에 노출할 때도 현재 generation인지 확인하여 reset 이후 늦은 성공이 비교 모달을 다시 열지 못하게 한다. 기존 activeWorkspaceRead와 retry:false 정책을 유지한다.
  4. regenerate는 저장한 request의 동일 대상을 최신 상태로 재확인한다. 대상이 없거나 권한이 달라지면 오류를 표시하고 사용자가 다시 선택하게 한다. 이전 프로젝트의 제안을 현재 프로젝트로 바꾸어 제출하지 않는다.
  5. close는 pending 요청과 이미 생성된 임시 후보를 정리하고 비교 UI만 닫는다. 적용 중에는 UI에서 close를 막고, 완료/실패 후 정리한다. 실패·취소를 성공으로 알리지 않는다.

### I04. 통합 검증과 완료 기록

- Related Files:
  - `components/comments/CommentsWorkspace.tsx`, `components/workspace/production/*`, `hooks/workspace/use-production-preview.ts`, `lib/workspace/production/document-editor.ts`, `presentation.ts` — T01~T03 경계 검토; read-only unless regression fix
  - `.memory/reports/2026-11-05-production-editor-panels.md` — 실제 검증 결과·미실시 범위; new planning/work record
  - `.memory/phases/2026-11-05-production-editor-panels/P01-production-editor/phase.md`, `.memory/plans/2026-11-05-production-editor-panels.md`, `.memory/current.md` — 완료 상태; modify after implementation

#### Details

- **Data & Schema Fields**: 보고서는 실행 커맨드·결과·실제 assert 건수·변경 파일·기능 제한·미실시 항목을 구분한다. 계획 단계의 예정 검증을 통과로 쓰지 않는다.
- **Execution Flow / Logic**:
  1. 현재 route→CommentsWorkspace→ProductionScreen→WorkspaceFlow→ProductionWorkspace 연결과 기존 provider 단일성을 정적으로 확인한다. 헤더/PPT/의견 중복, 재귀 import/렌더링, 편집기와 핀 이벤트 충돌 경계를 확인한다.
  2. 문서/Template binding, 기본/등록 미리보기, 실제 출처 버전, 전체 목록/번호, 빈 섹션, snapshot, 고정/권한, 미저장/충돌, AI 취소/적용을 아래 Validation 범위로 검증한다. 발견한 이 기능의 회귀만 같은 Task에서 수정한다.
  3. 전체 타입 검사·lint·build와 diff를 완료한다. 다른 도메인의 기존 오류가 발견되면 근거와 파일을 기록하고 사용자 범위에 없는 리팩터링을 자동 추가하지 않는다. 필수 검사가 실패했으면 통과로 기록하지 않는다.
  4. 보고서에는 기본 16:9가 실제 PPT 출력 기능이 아님, RFP 항목의 원문 미연결, AI mock, 코멘트가 작업 영역 기준인 점을 남긴다. 실제 브라우저/PDF/IME/drag 동작은 검증하지 않았다고 구분한다.

## Acceptance Criteria

- [ ] 단일·다중 선택의 요청 대상과 지시문이 명확하며 시연 AI임을 표시한다.
- [ ] 직접 편집의 초안 보호 후 요청하고, 생성만으로 저장하지 않으며 비교·선택 적용을 제공한다.
- [ ] 요청/적용 전에 전체 대상의 프로젝트·회차·존재·권한·고정을 재확인한다.
- [ ] stale 제안은 자동 덮어쓰기하지 않고 다시 생성/유지를 선택할 수 있다.
- [ ] 취소/프로젝트 전환/새 요청 후 늦은 응답이 예전 모달을 다시 열지 않는다.
- [ ] 목차 AI와 헤더·코멘트의 기존 경계를 유지한다.
- [ ] T01~T03의 제작 기능을 포함한 지정 검증이 통과하고 실제 결과가 보고서에 남는다.

## Validation

- `npm.cmd run typecheck` — 전체 타입 검사 통과.
- `npm.cmd run lint` — 전체 lint 통과. 새 요청 세대·effect·기존 toc 호출의 경고를 확인한다.
- `npm.cmd run build` — production build 통과. 환경·패키지 경고는 실제 영향과 함께 기록한다. 서버를 실행하지 않는다.
- 설치된 tsx/node:assert/strict와 필요 시 fake-indexeddb를 사용한 stdin 인라인 검증: 단일 요청, 섹션을 넘는 다중 요청, 제안 생성 전후 저장본 동일, 선택 item만 적용, 원문 유지 무변경, 대상 중 권한 없는 1개 포함 시 전체 거절, 고정/보관본 거절, 저장 후 stale 제안 거절, 다른 프로젝트/회차 후보 거절, 취소 후 늦게 반환한 후보 discard, 연속 요청 중 최신 결과만 노출, 오류 후 다시 생성. 새 테스트 파일/폴더를 생성하지 않는다.
- 정적 통합 점검: 헤더·코멘트 각 1개, 원시 문서 dirty 보호, 저장본/초안 구분, 전체 순서 사용, 출처의 임의 원문 연결 없음, Template 접근불가의 기본 표시 우회 없음, 동적 클래스의 Tailwind 탐색 경로 `components/workspace` 포함, `data-comment-control`의 제어 요소 한정.
- `git diff --check` — 공백 오류 0. 필요한 staged 파일도 `git diff --cached --check`로 확인한다.
- `tests/` 생성/복원, 브라우저·CUA·E2E·스크린샷·육안 비교·검증용 dev server는 금지한다. 인라인 검사 결과를 실제 IME·포인터 검증으로 설명하지 않는다.

## Commit Message

```text
feat(write): 단일·다중 AI 비교 적용과 제작 통합 검증 완료

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T04-ai-integration

- 중앙 작성 요청과 변경 전후 비교 및 선택 적용 연결
- 취소된 요청과 오래된 제안의 적용을 차단하고 제작 흐름 검증
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

완료 시 Task/phase/plan을 done으로 정리하고 current의 Active Task를 없음으로 갱신한다. 검증 실패·필수 기능 누락이 있으면 완료로 표시하지 않는다. current는 ignored 로컬 파일로 유지하고 지정 한국어 커밋을 만든다. push/배포는 수행하지 않는다.
