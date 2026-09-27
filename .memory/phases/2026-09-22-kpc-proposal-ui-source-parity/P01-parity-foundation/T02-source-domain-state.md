# Task: T02 Source Domain State

## Status: done

## Goal
원본 `App.tsx`의 proposal 관련 state, type, fixture와 callback 전이를 의미 변경 없이 현재 프로젝트에 이식해 모든 후속 UI가 동일 데이터를 렌더링할 수 있게 한다.

## Decision Summary
- 현재 임의 작성된 6개 project fixture와 축약 type을 원본 10개 project/RFP 계약으로 대체한다.
- 외부 AI나 persistence는 추가하지 않는다. 원본의 client-only state와 timer 기반 mock을 그대로 유지한다.
- 원본 `App.tsx` 전체를 복사하지 않고 proposal state만 `hooks/proposals/useProposalWorkspace.ts`, 순수 변환만 `lib/proposals`에 둔다.

## Implementation

### I01. Source-equivalent type과 fixture 이식

- Related Files:
  - `types/proposals.ts` :: proposal navigation, pipeline, review, authoring, library type 전체; modify
  - `data/proposals/projects.ts` :: `INITIAL_RFPS`, `SAMPLE_RFPS`, `SAMPLE_PROJECTS`; new
  - `data/proposals/pwin.ts` :: `DEFAULT_PWIN_ITEMS`, `REJECTION_REASONS`, `SAMPLE_RFP_PAGES`; new
  - `data/proposals/rfp-pages.ts` :: `SAMPLE_RFP_DOCUMENT_PAGES`; new
  - `data/proposals/authoring.ts` :: `INITIAL_PROJECT_FILES`, `SAMPLE_REFERENCE_MATERIALS`, `KPC_AI_ANALYSIS_11_ITEMS`, `RFP_ONLY_DOCUMENTS`, `INITIAL_KPC_CHECKLIST`, `INITIAL_PROPOSAL_SECTIONS`, `INITIAL_PROPOSAL_STRUCTURE`; new
  - `data/proposals/library.ts` :: `SAMPLE_LIBRARY_ITEMS`, `ENTERPRISE_KNOWLEDGE_BASE`; new
  - `data/proposals/tasks.ts` :: `SAMPLE_TASKS`; new
  - `data/proposals/mock-data.ts` :: 기존 재설계 fixture 제거 또는 source module re-export만 유지; modify
  - External `KPC_AI/src/types.ts`, `src/data/mockData.ts`, `src/data/pwinData.ts`, `src/data/rfpDocumentPages.ts`, relevant component constants at `8f074e5`; read-only

#### Details
- **Required Type Families**:
  ```typescript
  type ProposalLnbTab = /* source union을 값 변경 없이 이식 */;
  type ProjectSubTab = /* source union을 값 변경 없이 이식 */;
  type Department = /* source union을 값 변경 없이 이식 */;
  type PipelineStage = /* source union을 값 변경 없이 이식 */;
  interface RfpItem { /* source fields and optionality 그대로 */ }
  interface RfpOpportunity { /* source fields and optionality 그대로 */ }
  interface ProposalProject { /* source fields and optionality 그대로 */ }
  interface PWinEvaluationItem { /* source fields and optionality 그대로 */ }
  interface ProposalSectionItem { /* source fields and optionality 그대로 */ }
  interface ChecklistRequirement { /* source fields and optionality 그대로 */ }
  interface UploadedProposalFile { /* RfpUploadView export와 동일 */ }
  ```
- **Required Symbols**:
  - Navigation/access: `GnbTab`, `UserRole`, `ProposalLnbTab`, `ProjectSubTab`, `Department`.
  - Pipeline/review: `PipelineStage`, `RfpItem`, `RfpOpportunity`, `ProposalProject`, `ProjectRelatedDoc`, `ProposalDocumentType`, `PWinEvaluationItem`.
  - Authoring: `DocumentItem`, `RfpAnalysisStatus`, `ProposalWorkflowType`, `ProposalStoryboard`, `EditorVersion`, `ProposalComment`, `ProposalOutlineItem`, `ProposalSectionItem`, `SectionStatusType`, `ChecklistRequirement`.
  - Library/reference/task: `ProposalLibraryItem`, `LibraryItem`, `SectionReferenceConfig`, `SectionReferenceFileItem`, `ProposalSectionTask`, `ProposalTaskStatus`.
- **Execution Flow / Logic**:
  1. Precondition & Validation: source 파일은 `git show 8f074e5:<path>`로 읽고 working tree/stash 버전을 사용하지 않는다.
  2. Core Processing: field 이름, optionality, union literal, fixture 순서와 문자열을 UTF-8로 그대로 옮긴다. 파일 분리는 export 위치만 바꾸며 값은 바꾸지 않는다.
  3. Error & Exception Handling: mojibake가 발견되면 브라우저에 표시되는 UTF-8 source 문자열과 대조하고 임의 번역·교정하지 않는다.
  4. State Transition & Return: 기존 축약 UI가 compile되어야 하므로 교체 중 필요한 legacy alias는 이 Task 안에서만 명시적으로 제공하고 P04 T02에서 제거한다.

### I02. Proposal controller 이식

- Related Files:
  - `hooks/proposals/useProposalWorkspace.ts` :: `useProposalWorkspace`, `ProposalWorkspaceController`; new
  - `lib/proposals/workspace.ts` :: source callback에서 공통으로 쓰는 순수 update helper; modify
  - `tests/lib/proposals/workspace.test.ts` :: source initial state와 transition 회귀; modify
  - External `KPC_AI/src/App.tsx` lines containing proposal state/callbacks; read-only

#### Details
- **Controller State**:
  ```typescript
  interface ProposalWorkspaceController {
    activeProposalLnb: ProposalLnbTab;
    selectedDepartment: Department;
    projects: ProposalProject[];
    rfpList: RfpOpportunity[];
    activeProject: ProposalProject;
    selectedReviewProject: ProposalProject | null;
    projectFilesMap: Record<string, UploadedProposalFile[]>;
    checklistRequirements: ChecklistRequirement[];
    proposalSections: ProposalSectionItem[];
    selectedEditorSectionId: string | null;
    convertModalOpen: boolean;
    rfpToConvert: RfpOpportunity;
    toastMessage: string | null;
    // source App.tsx proposal callbacks with the same argument/return contracts
  }
  ```
- `activeProposalLnb` 기본값은 source의 `pipeline`, `activeProject`는 `SAMPLE_PROJECTS[2]`, `selectedReviewProject`는 `SAMPLE_PROJECTS[0]`이다.
- `projectFilesMap` 초기값은 source의 `'proj-1': INITIAL_PROJECT_FILES`를 유지한다.
- project 등록, 검토 시작, stage 변경, 작성 시작, 분석 완료, checklist/section update, toast callback의 실행 순서를 source `App.tsx`와 같게 한다.
- `getFilesForProject()`가 source와 같은 default RFP file과 `SAMPLE_REFERENCE_MATERIALS`를 반환하게 한다.

## Acceptance Criteria
- [x] source와 target의 initial RFP/project/task/library/section/checklist 개수와 순서가 일치한다.
- [x] 대표 project title, agency, budget, deadline, P/Win, manager가 source와 일치한다.
- [x] controller 기본 선택값과 projectFilesMap이 source `App.tsx`와 일치한다.
- [x] 등록·검토·stage·분석·section callback 이후 state가 source와 일치한다.
- [x] `@google/genai`, network request, storage dependency가 추가되지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts tests/lib/proposals/editor-mocks.test.ts tests/lib/proposals/review.test.ts` — source fixture/state/helper 회귀 통과
- `npm.cmd run typecheck` — source-equivalent type과 legacy adapter type error 0
- `npm.cmd run lint -- types/proposals.ts data/proposals hooks/proposals lib/proposals tests/lib/proposals` — lint error/warning 0
- `Select-String -Path data/proposals/*.ts,hooks/proposals/*.ts -Pattern '@google/genai|fetch\(|localStorage|sessionStorage'` — 허용하지 않은 runtime dependency 0건

## Commit Message
```text
refactor(proposals): 원본 제안서 데이터와 상태 계약 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P01-parity-foundation
Task: T02-source-domain-state

- KPC_AI 원본 proposal type과 fixture 보존
- App proposal state와 callback을 controller hook으로 분리
- 원본 초기값과 전이 회귀 테스트 추가
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `ebd7bb99f72f6f3b93ee55326de63b0042abb3d2`
