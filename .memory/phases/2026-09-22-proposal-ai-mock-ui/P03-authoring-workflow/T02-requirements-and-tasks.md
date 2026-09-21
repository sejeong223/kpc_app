# Task: T02 Requirements and Tasks

## Status: pending

## Goal
03 요구사항 checklist와 제안서 section별 작성 task 관리 화면을 구현한다. 분석 fixture에서 추출된 요구사항을 filter·추가·수정·완료 처리하고, section 담당자·검토자·상태·마감일을 한 상태 모델로 연결한다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5`의 `RequirementsView.tsx`, `TaskManagementView.tsx`, `MyTasksView.tsx`다.
- 원본의 중복 task model 대신 `ProposalSection`을 작성 task의 source of truth로 사용한다.
- CSV export만 browser Blob으로 제공하며 server 저장은 하지 않는다.
- 분석 완료 guard를 유지한다.

## Prerequisite Contract
- `ProposalRequirement[]`과 `ProposalSection[]`은 selected project id로 filter한다.
- reducer는 requirement add/update/delete/toggle와 section assignment/status update action을 지원한다.

## Implementation

### I01. Requirement checklist
- Related Files:
  - `components/proposals/authoring/ProposalRequirementsView.tsx` :: step 03 main view; new
  - `components/proposals/authoring/RequirementEditorDialog.tsx` :: add/edit form; new
  - `components/proposals/ProposalWorkspace.tsx` :: `workspace/requirements` outlet; modify
  - `types/proposals.ts`, `lib/proposals/workspace.ts` :: requirement actions; modify
  - `tests/lib/proposals/workspace.test.ts` :: requirement CRUD tests; modify

#### Details
- **Signature**:
  ```typescript
  interface ProposalRequirementsViewProps {
    project: ProposalProject;
    requirements: ProposalRequirement[];
    dispatch: React.Dispatch<ProposalWorkspaceAction>;
    onNavigate(step: ProposalWorkflowStep): void;
  }
  ```
- header는 총 요구사항, 반영, 작성 중, 미반영 count와 completion rate를 표시한다.
- filter는 category, priority, status, text search를 지원한다.
- table column은 check, requirement id/title, category, RFP page, priority, assignee, status, actions다.
- check toggle은 `checked`와 status를 일관되게 바꾼다: checked → `반영`, unchecked from 반영 → `미반영`.
- add/edit dialog required fields는 title/category/sourcePage/priority/assignee다. delete는 confirm dialog를 거친다.
- CSV export는 UTF-8 BOM, quoted cell escaping을 적용하고 selected project title을 안전한 filename으로 정규화한다.
- 다음 button은 editor step으로 이동한다. 요구사항이 0개면 확인 dialog를 먼저 표시하지만 이동 자체는 허용한다.

### I02. Section task management
- Related Files:
  - `components/proposals/authoring/ProposalTaskManagementView.tsx` :: section task table/board; new
  - `components/proposals/ProposalSidebar.tsx` :: project 보조 menu `작성 관리`; modify
  - `lib/proposals/workspace.ts` :: section assignment/status update; modify

#### Details
- sidebar의 numbered step은 유지하고 `04 제안서 작성` 아래 보조 link로 `작성 관리`를 제공한다. 별도 workflow step을 만들지 않는다.
- task summary는 총 section, 완료, 검토 요청, 지연 mock count, 전체 글자 수/목표 글자 수를 표시한다.
- table은 section number/title, assignee, reviewer, status, deadline, current/target character progress를 표시한다.
- assignee/reviewer/status는 accessible select로 즉시 update한다. deadline은 native date input으로 update한다.
- row “집필 열기”는 해당 section id를 selected editor section으로 저장하고 editor step으로 이동한다.
- status별 filter와 “내 작업” toggle을 제공하되 mock current user는 `정소담`이다.

## Acceptance Criteria
- [ ] requirement count와 filter 결과가 state에서 계산된다.
- [ ] add/edit/delete/toggle이 immutable reducer action으로 동작한다.
- [ ] CSV가 한국어와 comma/quote를 손상시키지 않는다.
- [ ] section task의 담당자·검토자·상태·마감일을 변경할 수 있다.
- [ ] task에서 선택한 section으로 editor가 열린다.
- [ ] requirement와 task 화면 모두 분석 완료 guard를 따른다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — requirement CRUD와 section update 통과
- `npm.cmd run typecheck` — dialog/table/action type error 0
- `npm.cmd run lint -- components/proposals/authoring/ProposalRequirementsView.tsx components/proposals/authoring/RequirementEditorDialog.tsx components/proposals/authoring/ProposalTaskManagementView.tsx components/proposals/ProposalSidebar.tsx components/proposals/ProposalWorkspace.tsx lib/proposals/workspace.ts tests/lib/proposals/workspace.test.ts` — error/warning 0
- `rg -n "dangerouslySetInnerHTML|\bany\b" components/proposals/authoring/ProposalRequirementsView.tsx components/proposals/authoring/ProposalTaskManagementView.tsx` — unsafe rendering/type 없음

## Commit Message
```text
feat(proposals): 요구사항과 작성 업무 관리 추가

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P03-authoring-workflow
Task: T02-requirements-and-tasks

- 요구사항 checklist와 편집 dialog 구현
- section 기반 작성 업무와 담당자 상태 연결
- UTF-8 CSV export 및 workflow navigation 추가
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
