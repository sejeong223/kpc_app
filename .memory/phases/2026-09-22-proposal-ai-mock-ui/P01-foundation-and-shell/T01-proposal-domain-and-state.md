# Task: T01 Proposal Domain and State

## Status: done

## Goal
모든 제안서 목 화면이 공유할 최소 domain type, UTF-8 한국어 fixture, 순수 reducer와 transition guard를 구축한다. UI보다 먼저 상태 계약을 고정해 이후 Task가 원본 `App.tsx`처럼 거대한 local state 덩어리를 다시 만들지 않게 한다.

## Decision Summary
- Reference baseline은 `sejeong223/KPC_AI@8f074e5`의 `src/types.ts`, `src/data/mockData.ts`, `src/data/pwinData.ts`다.
- 원본 전체 type을 복사하지 않고 이번 목 UI에서 실제 사용하는 proposal field만 별도 module로 정의한다.
- browser state만 사용하며 API, localStorage, database, AI SDK는 추가하지 않는다.
- state 변경 규칙은 React와 분리한 순수 함수로 만들고 Vitest에서 직접 검증한다.

## Implementation

### I01. Proposal domain model 정의
- Related Files:
  - `types/proposals.ts` :: proposal 화면 공통 type; new
  - External reference `KPC_AI/src/types.ts` at commit `8f074e5` :: field 의미 확인; read-only

#### Details
- **Required unions**:
  ```typescript
  export type ProposalDepartment =
    | "전체"
    | "AI산업본부"
    | "AI사업본부"
    | "컨설팅본부"
    | "교육사업본부"
    | "생산성본부"
    | "CX본부"
    | "자격사업본부";

  export type ProposalStage = "검토 대기" | "검토 중" | "진행" | "진행 안 함";
  export type ProposalWorkflowStep = "setup" | "analysis" | "requirements" | "editor" | "review";
  export type ProposalWorkspaceView =
    | "pipeline"
    | "register"
    | "project-review"
    | "workspace"
    | "library"
    | "settings";
  export type AnalysisStatus = "분석 전" | "분석 중" | "분석 완료";
  export type RequirementStatus = "미반영" | "작성 중" | "반영";
  export type SectionStatus = "작성 대기" | "작성 중" | "검토 요청" | "완료";
  ```
- **Required interfaces**:
  - `ProposalProject`: `id`, `title`, `agency`, `budget:number`, `deadline`, `dDay:number`, `stage`, `department`, `manager`, `teamMembers:string[]`, `pWin:number`, `summary`, `progress:number`, `activeStep`, `workflowMode:"requirements"|"qa"|"blank"`, `analysisStatus`, `lastModified`, `primaryRfpFileName`, `rejectionReason?`.
  - `ProposalDocument`: `id`, `projectId`, `name`, `kind:"RFP"|"참고자료"|"기존 제안서"|"회사소개서"|"기술자료"`, `size`, `pageCount?`, `status:"업로드 완료"|"분석 완료"`, `isPrimary:boolean`.
  - `ProposalAnalysisItem`: `id`, `title`, `content`, `sourcePage`, `sourceQuote`, `tone:"default"|"risk"|"win"`.
  - `ProposalRequirement`: `id`, `projectId`, `category`, `title`, `sourcePage`, `priority:"높음"|"보통"|"낮음"`, `status`, `assignee`, `checked:boolean`.
  - `ProposalSection`: `id`, `projectId`, `number`, `title`, `status`, `assignee`, `reviewer`, `dueDate`, `targetCharacters:number`, `content`, `requirementIds:string[]`, `updatedAt`.
  - `ProposalLibraryItem`: `id`, `title`, `category`, `description`, `fileFormat`, `department`, `size`, `tags:string[]`, `updatedAt`, `useCount:number`.
  - `ProposalWorkspaceState`: `view`, `activeStep`, `selectedProjectId`, `selectedSectionId`, `selectedDepartment`, `searchQuery`, `projects`, `documents`, `requirements`, `sections`, `libraryItems`.
- 모든 배열 field는 필수이고 fixture에서 빈 배열 대신 의미 있는 sample을 제공한다. 날짜는 mock display string이며 실제 Date parsing에 의존하지 않는다.

### I02. Mock fixture와 상태 전이 구현
- Related Files:
  - `data/proposals/mock-data.ts` :: `MOCK_PROPOSAL_PROJECTS`, `MOCK_PROPOSAL_DOCUMENTS`, `MOCK_ANALYSIS_ITEMS`, `MOCK_REQUIREMENTS`, `MOCK_PROPOSAL_SECTIONS`, `MOCK_LIBRARY_ITEMS`; new
  - `lib/proposals/workspace.ts` :: initial state, reducer, selector, guard; new
  - `tests/lib/proposals/workspace.test.ts` :: state regression test; new

#### Details
- fixture는 최소 6개 project를 네 stage에 분산하고, reference main sample인 “KPC Enterprise AI 플랫폼 구축” 진행 project를 포함한다.
- **Reducer contract**:
  ```typescript
  export type ProposalWorkspaceAction =
    | { type: "navigate"; view: ProposalWorkspaceView; step?: ProposalWorkflowStep }
    | { type: "select-project"; projectId: string }
    | { type: "set-department"; department: ProposalDepartment }
    | { type: "set-search-query"; query: string }
    | { type: "add-project"; project: ProposalProject; documents: ProposalDocument[] }
    | { type: "update-stage"; projectId: string; stage: ProposalStage; rejectionReason?: string }
    | { type: "add-document"; document: ProposalDocument }
    | { type: "remove-document"; documentId: string }
    | { type: "set-workflow-mode"; projectId: string; mode: ProposalProject["workflowMode"] }
    | { type: "set-analysis-status"; projectId: string; status: AnalysisStatus }
    | { type: "toggle-requirement"; requirementId: string }
    | { type: "add-requirement"; requirement: ProposalRequirement }
    | { type: "update-requirement"; requirementId: string; changes: Partial<ProposalRequirement> }
    | { type: "delete-requirement"; requirementId: string }
    | { type: "select-section"; sectionId: string }
    | { type: "update-section"; sectionId: string; changes: Partial<ProposalSection> }
    | { type: "import-library-item"; item: ProposalLibraryItem };

  export function createInitialProposalWorkspaceState(): ProposalWorkspaceState;
  export function proposalWorkspaceReducer(
    state: ProposalWorkspaceState,
    action: ProposalWorkspaceAction,
  ): ProposalWorkspaceState;
  export function getSelectedProposalProject(state: ProposalWorkspaceState): ProposalProject | null;
  export function canOpenProposalStep(project: ProposalProject, step: ProposalWorkflowStep): boolean;
  export function filterProposalProjects(state: ProposalWorkspaceState): ProposalProject[];
  ```
- `select-project`는 존재하지 않는 id에서 state를 변경하지 않는다.
- `workspace` 진입은 선택 project의 stage가 `진행`일 때만 허용한다. `analysis` 이후 단계는 `analysisStatus === "분석 완료"`일 때만 열린다.
- reducer는 input state와 중첩 배열을 mutate하지 않는다.
- test는 initial clone 독립성, 부서·검색 filter, project 추가, stage 승인/반려, step guard, requirement toggle, section partial update를 검증한다.

## Acceptance Criteria
- [ ] proposal UI에 필요한 type이 한 module에 있고 `any`가 없다.
- [ ] fixture 한국어가 UTF-8로 정상 저장되고 네 pipeline stage가 모두 표시 가능하다.
- [ ] reducer가 pipeline → review → approved workspace 흐름을 순수하게 표현한다.
- [ ] 잘못된 project/step 접근이 기존 state를 훼손하지 않는다.
- [ ] 외부 API·SDK·storage dependency가 추가되지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — state transition test 전체 통과
- `npm.cmd run typecheck` — type error 0
- `npm.cmd run lint -- types/proposals.ts data/proposals/mock-data.ts lib/proposals/workspace.ts tests/lib/proposals/workspace.test.ts` — error/warning 0
- `rg -n "@google/genai|fetch\(|localStorage|sessionStorage|\bany\b" types/proposals.ts data/proposals lib/proposals tests/lib/proposals` — 허용하지 않은 dependency/API/type 결과 없음

## Commit Message
```text
feat(proposals): 제안서 목업 도메인 상태 구성

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P01-foundation-and-shell
Task: T01-proposal-domain-and-state

- 제안서 프로젝트와 작성 단계 타입 정의
- deterministic fixture와 순수 reducer 추가
- 상태 전이 및 접근 조건 테스트 작성
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `e18d0cd005d4c49ae04b4ae159e22c2bfdb98b4e`
