# Task: T01 Sidebar And Pipeline

## Status: pending

## Goal
원본 Proposal Sidebar와 pipeline의 Kanban/List UI를 동일한 DOM 구조, className, fixture, stage interaction으로 이식해 `/proposals` 첫 화면이 source screenshot과 일치하게 한다.

## Decision Summary
- source `ProposalNav.tsx`와 `PipelineBoard.tsx`를 축약하지 않고 표시 가능한 모든 control과 상태를 보존한다.
- 현재 summary card/search/select 기반 pipeline은 제거한다. 원본의 department button row, Kanban/List toggle, 4개 stage와 10개 RFP card가 기준이다.
- 접근성 개선을 이유로 원본 markup을 교체하지 않는다. 필수 Next lint 수정은 시각·상호작용 변화가 없는 범위에서만 허용한다.

## Implementation

### I01. Proposal Sidebar source parity

- Related Files:
  - `components/proposals/navigation/ProposalSidebar.tsx` :: `ProposalSidebar`; new from current move/replace
  - `components/proposals/ProposalSidebar.tsx` :: 축약 sidebar; delete after import migration
  - `components/proposals/ProposalWorkspace.tsx` :: sidebar/controller wiring; modify
  - External `KPC_AI/src/components/proposals/ProposalNav.tsx` :: `ProposalNav`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface ProposalSidebarProps {
    currentLnb?: ProposalLnbTab | string;
    activeTab?: ProposalLnbTab | string;
    onLnbChange?(tab: ProposalLnbTab | string): void;
    onSelectTab?(tab: ProposalLnbTab | string): void;
    selectedDepartment?: Department;
    onSelectDepartment?(department: Department): void;
    activeProject?: ProposalProject | null;
    projects?: Array<{ id: string; title: string; agency?: string; dDay?: number }>;
    onSelectProject?(project: ProposalProject): void;
    onExitProject?(): void;
    currentProjectTab?: ProjectSubTab | string;
    onProjectTabChange?(tab: ProjectSubTab | string): void;
    userRole?: UserRole;
    onShowToast?(message: string): void;
  }
  ```
- Main mode는 `제안서 생성`, `제안 목록`, `자료 라이브러리`, `제안 설정`을 source 순서와 208px 폭으로 표시한다.
- Active project mode는 back button, project title/agency, 01 기본설정부터 05 검토, 프로젝트 설정을 source className 그대로 표시한다.
- `analysisStatus !== '분석 완료'`이면 02~05를 잠그고 source toast 문구를 그대로 사용한다.
- source에서 전달만 되고 표시하지 않는 department/projects prop도 public contract parity를 위해 유지한다.

### I02. Pipeline Kanban/List source parity

- Related Files:
  - `components/proposals/pipeline/PipelineBoard.tsx` :: `PipelineBoard`, `STAGES`; replace
  - `components/proposals/pipeline/ProposalStageColumn.tsx`; delete after source board owns stage markup
  - `components/proposals/pipeline/ProposalProjectCard.tsx`; delete after source board owns card markup
  - `components/proposals/ProposalWorkspace.tsx` :: pipeline callbacks; modify
  - `tests/lib/proposals/workspace.test.ts` :: filter/stage/controller regression; modify
  - External `KPC_AI/src/components/proposals/PipelineBoard.tsx`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface PipelineBoardProps {
    userRole?: UserRole;
    rfpList?: RfpItem[];
    projects?: ProposalProject[];
    selectedDepartment?: Department;
    onSelectDepartment?(department: Department): void;
    onUpdateStage?(rfpId: string, newStage: PipelineStage): void;
    onOpenRfpDetail?(rfp: RfpItem): void;
    onSelectProject?(project: ProposalProject): void;
    onStartProposalProcess?(rfp: RfpItem): void;
    onOpenProjectRegister?(): void;
    onShowToast(message: string): void;
  }
  ```
- `STAGES`의 label/color/order는 `검토대기/amber`, `검토중/blue`, `진행/KPC red`, `진행안함/neutral`을 유지한다.
- local state `internalDept`, `internalList`, `draggedRfpId`, `viewType`, `activeStageDropdownId`와 두 prop-sync effect를 그대로 보존한다.
- department button row 6개, Kanban/List icon toggle, `프로젝트 등록` button, source card metadata와 stage action을 모두 유지한다.
- drag/drop의 `dataTransfer` key, 관리자 전용 stage 변경, card/detail/start callbacks와 source toast 문자열을 바꾸지 않는다.
- `setState` effect lint가 source와 충돌하면 reducer/controller에서 prop identity를 안정화하거나 key remount를 사용하되 visible behavior는 바꾸지 않는다.

## Acceptance Criteria
- [ ] Sidebar main/project mode의 크기, 메뉴, active/locked 표현이 source와 일치한다.
- [ ] pipeline initial stage count가 source fixture의 3/3/3/1과 일치한다.
- [ ] department row, Kanban/List toggle과 project registration button이 source 위치에 존재한다.
- [ ] Kanban과 List 양쪽의 card 문구·순서·metadata가 source와 일치한다.
- [ ] drag/drop과 stage dropdown이 source와 같은 state/toast 결과를 만든다.
- [ ] 현재 summary cards, search input, shadcn stage select가 남지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — filter/stage/controller 회귀 통과
- `npm.cmd run typecheck` — Sidebar/Pipeline props와 callback type error 0
- `npm.cmd run lint -- components/proposals/navigation components/proposals/pipeline components/proposals/ProposalWorkspace.tsx` — lint error/warning 0
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "sidebar|pipeline"` — 3개 viewport Kanban/List screenshot parity 통과

## Commit Message
```text
feat(proposals): 원본 사이드바와 파이프라인 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P02-pipeline-and-review
Task: T01-sidebar-and-pipeline

- ProposalNav의 일반·프로젝트 navigation 보존
- 원본 Kanban/List와 10개 fixture 출력 복원
- stage 변경과 작성 진입 동작 동일화
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending