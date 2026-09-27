# Task: T02 Editor And Work Management

## Status: done

## Goal
원본 제안서 구조 편집, 작성 업무 관리, 내 작업과 3-pane editor 및 자료 연결 modal을 전체 기능과 시각 구조 그대로 이식한다.

## Decision Summary
- 4,915줄 source `EditorView`는 축약하지 않는다. 유지보수를 위한 파일 분리는 허용하되 DOM hierarchy, className, local state, handler 순서와 표시 결과는 변경하지 않는다.
- 분리 파일은 source 내부의 명확한 pane/modal 단위만 허용하며 새로운 디자인 abstraction이나 shadcn 대체는 금지한다.
- source에서 render branch가 있는 구조·업무·내 작업 화면은 현재 navigation 도달성에 관계없이 보존한다.

## Implementation

### I01. 구조와 업무 관리 화면 이식

- Related Files:
  - `components/proposals/authoring/ProposalStructureView.tsx` :: source component; new
  - `components/proposals/authoring/TaskManagementView.tsx` :: source component; replace current task view
  - `components/proposals/authoring/MyTasksView.tsx` :: source component; new
  - `components/proposals/authoring/ProposalTaskManagementView.tsx`; delete after replacement
  - `components/proposals/ProposalWorkspace.tsx` :: structure/tasks/my_tasks render branches; modify
  - `data/proposals/authoring.ts`, `data/proposals/tasks.ts`; read-only
  - External source files with matching names; read-only

#### Details
- **Props Contract**:
  ```typescript
  interface ProposalStructureViewProps {
    onNavigateNext(): void;
    onShowToast(message: string): void;
  }
  interface TaskManagementViewProps {
    onOpenEditor(sectionId: string): void;
    onShowToast(message: string): void;
  }
  interface MyTasksViewProps {
    onOpenTask(taskId: string): void;
    onShowToast(message: string): void;
  }
  ```
- structure의 chapter/sub-item drag state, before/after/inside drop, inline edit, add/delete, undo/redo history와 settings menu를 보존한다.
- task 화면의 table/Kanban toggle, user filter, assignee/status update, aggregate progress와 source toast를 보존한다.
- my tasks의 KPI 4개와 row click editor 이동을 source fixture 그대로 유지한다.

### I02. Editor와 reference modal 이식

- Related Files:
  - `components/proposals/editor/EditorView.tsx` :: source `EditorView`; new/replace
  - `components/proposals/editor/EnterpriseDataModal.tsx` :: source component/data browser; new
  - `components/proposals/editor/SectionReferenceModal.tsx` :: source component; replace
  - `components/proposals/editor/ProposalEditorView.tsx`, `ProposalAssistantPanel.tsx`, `ProposalContentEditor.tsx`, `ProposalSectionNavigator.tsx`; delete after source editor replacement
  - `components/proposals/editor/SectionReferenceDialog.tsx`; delete after source modal replacement
  - `components/proposals/ProposalWorkspace.tsx` :: editor callbacks and selected section; modify
  - External `EditorView.tsx`, `EnterpriseDataModal.tsx`, `SectionReferenceModal.tsx`; read-only source

#### Details
- **Editor Props Contract**:
  ```typescript
  interface EditorViewProps {
    activeProject?: ProposalProject | null;
    uploadedFiles?: UploadedProposalFile[];
    checklistRequirements?: ChecklistRequirement[];
    onUpdateChecklistRequirements?(items: ChecklistRequirement[]): void;
    sections?: ProposalSectionItem[];
    onUpdateSections?(sections: ProposalSectionItem[]): void;
    initialSelectedSectionId?: string | null;
    onNavigateToProjects?(): void;
    onNavigateToProjectRoot?(): void;
    onShowToast(message: string): void;
    onExportDone?(): void;
    userRole?: UserRole;
  }
  ```
- **Reference Modal Contract**:
  ```typescript
  type ReferenceTabType = "internal" | "upload" | "web";
  interface SectionReferenceModalProps {
    isOpen: boolean;
    initialTab?: ReferenceTabType;
    sectionId: string;
    sectionTitle: string;
    config: SectionReferenceConfig;
    onSaveConfig(config: SectionReferenceConfig): void;
    onClose(): void;
    onShowToast(message: string): void;
  }
  ```
- editor의 section tree, selected section, status/author/reviewer, char limit, content, comments, versions, AI actions, formatting toolbar, preview/export와 source 초기값을 모두 보존한다.
- `ALL_SECTION_STATUSES`, `PRESET_AUTHORS`, `PRESET_REVIEWERS`, `INITIAL_PROPOSAL_SECTIONS`의 값과 순서를 바꾸지 않는다.
- reference modal의 internal/upload/web tab, folder/department/search filter, selected IDs, uploaded files, URL list와 save contract를 보존한다.
- `navigator.clipboard`, `document`, textarea selection, drag/drop, timers는 client boundary 안에서만 실행하고 SSR 중 접근하지 않는다.
- source의 conditional hook 위험은 hook 순서를 항상 일정하게 바꾸는 최소 수정만 허용하며 rendered output/state semantics는 유지한다.

## Acceptance Criteria
- [x] 구조 편집과 업무 관리 화면의 모든 control·fixture·toast가 source와 일치한다.
- [x] editor의 3-pane geometry, section data, toolbar, tabs, comments, versions와 AI mock action이 source와 일치한다.
- [x] reference modal 세 tab과 enterprise data 선택 결과가 section config에 동일하게 저장된다.
- [x] checklist와 section state가 이전/다음 화면에서 유지된다.
- [x] source의 browser-only API가 SSR에서 실행되지 않는다.
- [x] 4,915줄을 분리하더라도 screenshot DOM 순서와 className이 달라지지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts tests/lib/proposals/editor-mocks.test.ts` — section/checklist/editor state 통과
- `npm.cmd run typecheck` — editor/ref modal type error 0
- `npm.cmd run lint -- components/proposals/editor components/proposals/authoring components/proposals/ProposalWorkspace.tsx` — hooks 포함 lint error/warning 0
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "structure|tasks|editor|reference"` — source screenshot parity 통과

## Commit Message
```text
feat(proposals): 원본 에디터와 작성 관리 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P03-authoring-workflow
Task: T02-editor-and-work-management

- 제안 구조와 업무 관리 화면 복원
- 원본 3-pane editor와 section 상태 이식
- 사내 자료 업로드 웹 reference modal 보존
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 3b0bd4d
