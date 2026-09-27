# Task: T01 Setup Analysis Requirements

## Status: done

## Goal
원본 제안서 01 기본설정, 02 분석, 03 체크리스트와 잠금 상태를 동일하게 이식하고 분석 완료 전후 navigation과 공유 checklist state를 연결한다.

## Decision Summary
- source의 화면 전체 markup, local state, 11개 분석 card, checklist fixture와 RFP viewer를 축약하지 않는다.
- file 선택은 metadata mock, 분석은 즉시/timer mock이며 backend나 AI SDK를 추가하지 않는다.
- source에 존재하는 desktop 고정 폭과 breadcrumb를 그대로 유지한다.

## Implementation

### I01. 기본설정과 잠금 상태 이식

- Related Files:
  - `components/proposals/authoring/ProposalSetupView.tsx` :: source `ProposalSetupView`; replace
  - `components/proposals/authoring/RfpAnalysisRequiredState.tsx` :: source `RfpAnalysisRequiredState`; new/replace
  - `components/proposals/ProposalWorkspace.tsx` :: setup/locked routing; modify
  - `components/proposals/review/DocumentPreviewModal.tsx` :: setup document preview; reuse
  - External source files with matching names; read-only

#### Details
- **Props Contract**:
  ```typescript
  interface ProposalSetupViewProps {
    project: ProposalProject;
    onStartAnalysis(): void;
    onShowToast(message: string): void;
  }

  interface RfpAnalysisRequiredStateProps {
    stepTitle?: string;
    stepNumber?: number | string;
    onNavigateToStep1(): void;
    projectName?: string;
  }
  ```
- setup local state의 `creationMethod`, `templateType`, `targetScope`, `language`, `assignee`, `extraDocs`, `previewDoc`와 source 초기값을 유지한다.
- 등록 문서 fallback 2개와 추가 참고자료 1개, source file size/page/uploader/date를 그대로 표시한다.
- RFP 분석 시작 시 active project와 projects 양쪽의 `analysisStatus`를 `분석 완료`로 갱신한 뒤 `ai_analysis`로 이동한다.
- 잠금 화면의 01~05 process indicator, source 문구, CTA를 동일하게 유지한다.

### I02. 분석과 checklist 이식

- Related Files:
  - `components/proposals/authoring/AiAnalysisView.tsx` :: `AiAnalysisView`, `AiAnalysisCardItem`; replace
  - `components/proposals/authoring/RequirementsView.tsx` :: `RequirementsView`, format helpers; replace
  - `components/proposals/ProposalWorkspace.tsx` :: analysis/requirements callbacks; modify
  - `data/proposals/authoring.ts`, `data/proposals/rfp-pages.ts` :: exact fixtures; read-only
  - External source `AiAnalysisView.tsx`, `RequirementsView.tsx`; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  interface AiAnalysisViewProps {
    activeProject?: ProposalProject | null;
    uploadedFiles?: UploadedProposalFile[];
    onNavigateToProjects?(): void;
    onNavigateToProjectRoot?(): void;
    onNavigateNext?(): void;
    onShowToast(message: string): void;
  }

  interface RequirementsViewProps {
    activeProject?: ProposalProject | null;
    requirementsList?: ChecklistRequirement[];
    onUpdateRequirements?(items: ChecklistRequirement[]): void;
    onNavigateToProjects?(): void;
    onNavigateToProjectRoot?(): void;
    onNavigateNext?(): void;
    onShowToast(message: string): void;
  }
  ```
- 분석 화면은 `KPC_AI_ANALYSIS_11_ITEMS`, RFP page preview/search/zoom, card expand/copy/edit/save와 source badge/color를 보존한다.
- checklist는 `INITIAL_KPC_CHECKLIST`의 모든 row, category, checked/completed metadata, source citation, body page와 추가·수정·삭제 dialog를 보존한다.
- `formatRfpPageOnly`와 `formatProposalBodyPage`는 source 알고리즘과 fallback 값을 그대로 유지한다.
- 분석 미완료 또는 document 없음 조건에서 두 화면 모두 `RfpAnalysisRequiredState`를 표시한다.

## Acceptance Criteria
- [ ] 01 화면의 method/template/scope/language/document UI가 source와 일치한다.
- [ ] 분석 완료 전 02~05가 잠기고 source toast와 안내 화면이 표시된다.
- [ ] 11개 분석 card와 RFP viewer의 문구·page citation이 source와 일치한다.
- [ ] checklist row 수·순서·완료 metadata와 CRUD dialog가 source와 일치한다.
- [ ] checklist 변경이 이후 editor에서 같은 state로 관찰된다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — analysis unlock/checklist 공유 state 통과
- `npm.cmd run typecheck` — setup/analysis/requirements type error 0
- `npm.cmd run lint -- components/proposals/authoring components/proposals/ProposalWorkspace.tsx` — lint error/warning 0
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "setup|analysis|requirements|locked"` — source screenshot parity 통과

## Commit Message
```text
feat(proposals): 원본 설정 분석 체크리스트 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P03-authoring-workflow
Task: T01-setup-analysis-requirements

- 기본설정과 분석 잠금 흐름 복원
- 11개 AI 분석 결과와 RFP viewer 이식
- 원본 체크리스트와 상태 공유 보존
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
