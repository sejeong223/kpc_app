# Task: T01 Proposal Pipeline Board

## Status: pending

## Goal
원본 `PipelineBoard`의 부서별 제안 기회 현황과 네 단계 kanban을 현재 workspace state에 연결한다. 사용자는 검색·부서 filter·card 상세 진입이 가능하고, 관리자 mock 권한에서는 drag 또는 명시적 stage menu로 상태를 변경할 수 있다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5/src/components/proposals/PipelineBoard.tsx`와 `src/data/mockData.ts`다.
- pipeline은 table이 아니라 원본 기본 4-column board를 우선 구현한다.
- mouse drag만 강제하지 않고 card의 stage select/menu로 동일 기능을 제공해 keyboard 접근성을 보장한다.
- 모든 변경은 P01 reducer에만 반영되고 server request는 발생하지 않는다.

## Prerequisite Contract
- `ProposalWorkspace`는 `state`, `dispatch`, `canReview:boolean`을 소유한다.
- `ProposalStage` 순서는 `검토 대기` → `검토 중` → `진행` → `진행 안 함`이다.
- `filterProposalProjects(state)`가 search와 department를 함께 적용한다.

## Implementation

### I01. Pipeline header, filters, summary 구축
- Related Files:
  - `components/proposals/pipeline/ProposalPipelineBoard.tsx` :: `ProposalPipelineBoard`; new
  - `components/proposals/ProposalWorkspace.tsx` :: `pipeline` outlet 연결; modify
  - `components/ui/select.tsx`, `components/ui/input.tsx`, `components/ui/button.tsx` :: 기존 primitive; read-only

#### Details
- **Signature**:
  ```typescript
  interface ProposalPipelineBoardProps {
    state: ProposalWorkspaceState;
    dispatch: React.Dispatch<ProposalWorkspaceAction>;
    canReview: boolean;
  }
  ```
- content는 `bg-[#F8F9FA] p-4 lg:p-6`, header title `제안 목록`, 설명, `새 프로젝트 등록` red primary button을 가진다.
- summary row는 전체 project 수, 진행 project, 검토 중 project, 30일 이내 마감 수를 계산해서 4개 compact card로 표시한다.
- toolbar는 search input과 `ProposalDepartment` select를 제공하고 reducer의 `set-search-query`, `set-department`를 dispatch한다.
- 선택된 filter 결과가 없으면 검색어/부서 초기화 button이 있는 empty state를 표시한다.
- 등록 button은 `{ type:"navigate", view:"register" }`를 dispatch한다.

### I02. Four-stage board와 project card
- Related Files:
  - `components/proposals/pipeline/ProposalStageColumn.tsx` :: stage column; new
  - `components/proposals/pipeline/ProposalProjectCard.tsx` :: compact card와 accessible stage menu; new
  - `lib/proposals/workspace.ts` :: stage group selector; modify
  - `tests/lib/proposals/workspace.test.ts` :: group/filter/stage tests; modify

#### Details
- **Signatures**:
  ```typescript
  interface ProposalStageColumnProps {
    stage: ProposalStage;
    projects: ProposalProject[];
    canReview: boolean;
    onOpen(projectId: string): void;
    onMove(projectId: string, stage: ProposalStage): void;
  }

  export function groupProjectsByStage(
    projects: readonly ProposalProject[],
  ): Record<ProposalStage, ProposalProject[]>;
  ```
- desktop은 `grid-cols-4`, 작은 화면은 horizontal snap scroll을 사용하며 각 column 최소 폭은 280px다.
- column header는 stage label/count와 다음 accent를 사용한다: 대기 neutral, 검토 blue, 진행 KPC red, 진행 안 함 slate.
- card는 title, agency, budget label, deadline/D-day, manager avatar initial, P/Win progress, team count를 표시한다.
- card click/Enter는 project를 선택하고 `project-review`로 이동한다. 내부 menu click은 event propagation을 막는다.
- `draggable={canReview}`와 native `dragstart/dragover/drop`을 지원하되, 관리자 card에는 `aria-label="단계 변경"` select/menu도 제공한다.
- 일반 사용자는 stage 변경 UI를 보지 않고 card 상세 열람만 가능하다.
- `진행` card의 “제안서 작성” quick action은 project 선택 후 `workspace/setup`으로 이동한다. 다른 stage에서는 review detail로 이동한다.

## Acceptance Criteria
- [ ] 네 pipeline stage와 각 count가 fixture와 일치한다.
- [ ] search와 department filter가 동시에 적용된다.
- [ ] 관리자 stage 변경이 reducer를 통해 즉시 다른 column에 반영된다.
- [ ] 일반 사용자는 stage를 변경할 수 없지만 상세 화면에 진입할 수 있다.
- [ ] keyboard만으로 card 열기와 관리자 stage 변경이 가능하다.
- [ ] 빈 filter 결과에 복구 가능한 empty state가 보인다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — filter/group/stage regression 통과
- `npm.cmd run typecheck` — props/action union type error 0
- `npm.cmd run lint -- components/proposals/pipeline components/proposals/ProposalWorkspace.tsx lib/proposals/workspace.ts tests/lib/proposals/workspace.test.ts` — error/warning 0
- `@('검토 대기','검토 중','진행','진행 안 함','새 프로젝트 등록') | ForEach-Object { if (-not (rg -l --fixed-strings $_ components/proposals/pipeline)) { throw "missing pipeline marker: $_" } }` — core labels 존재

## Commit Message
```text
feat(proposals): 제안 파이프라인 보드 구현

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P02-pipeline-and-review
Task: T01-proposal-pipeline-board

- 부서와 검색 필터가 있는 4단계 kanban 추가
- 제안 카드 상세 진입과 관리자 단계 변경 연결
- pipeline selector 및 reducer 회귀 테스트 보강
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
