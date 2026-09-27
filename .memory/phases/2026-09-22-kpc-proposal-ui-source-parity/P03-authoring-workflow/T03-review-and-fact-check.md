# Task: T03 Review And Fact Check

## Status: done

## Goal
원본 05 검토 및 완성 화면과 fact-check modal을 동일하게 이식해 editor section 상태를 검색·필터·교정·출력하는 최종 흐름을 완성한다.

## Decision Summary
- 현재 간략한 review summary를 source `RequirementsMatrix` 전체 UI로 교체한다.
- source의 사실 검증은 정규식 기반 mock이므로 실제 AI/API로 바꾸지 않는다.
- 원본의 잘못된 회사명·인물명·기간 fixture도 검출 결과 parity를 위해 임의 교정하지 않는다.

## Implementation

### I01. Requirements matrix와 출력 이식

- Related Files:
  - `components/proposals/review/RequirementsMatrix.tsx` :: source component; new
  - `components/proposals/review/ProposalReviewView.tsx`; delete after replacement
  - `components/proposals/review/ProposalDocumentPreview.tsx`; delete after source inline document rendering replacement
  - `components/proposals/ProposalWorkspace.tsx` :: matrix callbacks; modify
  - External `KPC_AI/src/components/proposals/RequirementsMatrix.tsx`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface RequirementsMatrixProps {
    activeProject?: ProposalProject | null;
    sections?: ProposalSectionItem[];
    uploadedFiles?: UploadedProposalFile[];
    onUpdateSections?(sections: ProposalSectionItem[]): void;
    onNavigateToProjects?(): void;
    onNavigateToProjectRoot?(): void;
    onShowToast(message: string): void;
    onOpenEditorSection?(sectionId: string): void;
  }
  ```
- 분석 미완료/document 없음이면 05단계 잠금 화면을 표시한다.
- search, match navigation, all/written/unwritten filter, section status, full document, edit 이동, export/print UI를 source markup과 className 그대로 보존한다.
- `INITIAL_PROPOSAL_SECTIONS` fallback과 외부 sections controlled update 계약을 유지한다.

### I02. Fact-check modal 이식

- Related Files:
  - `components/proposals/review/FactCheckModal.tsx` :: source component and rule engine; new
  - `components/proposals/review/ProposalFactCheckDialog.tsx`; delete
  - `lib/proposals/review.ts` :: source와 중복되는 축약 helper 제거 또는 source rule의 순수 helper로 교체; modify
  - `tests/lib/proposals/review.test.ts` :: source rules, replacement, section navigation; modify
  - External `KPC_AI/src/components/proposals/FactCheckModal.tsx`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface FactCheckModalProps {
    isOpen: boolean;
    onClose(): void;
    sections: ProposalSectionItem[];
    onUpdateSections?(sections: ProposalSectionItem[]): void;
    onOpenEditorSection?(sectionId: string): void;
    onShowToast(message: string): void;
  }
  ```
- `FactCheckRule`, `FactCheckIssue`, `FactPassedItem`, `FactBaseline` field와 source 기본 baseline을 유지한다.
- company/person/project/passed tab, scan loading, issue context, 개별/전체 교정, settings UI와 source regex 목록을 보존한다.
- correction은 immutable section update를 수행하고 editor 이동 시 선택 section ID를 controller에 저장한다.

## Acceptance Criteria
- [x] 05 화면의 검색·filter·document·status·출력 control이 source와 일치한다.
- [x] source fixture에서 fact-check issue count와 category별 결과가 동일하다.
- [x] 개별/전체 교정 후 section content와 issue count가 source와 동일하게 갱신된다.
- [x] issue의 editor 이동이 정확한 section을 선택한다.
- [x] print/download는 source와 같은 browser mock이며 server persistence를 추가하지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/review.test.ts tests/lib/proposals/workspace.test.ts` — fact rule/correction/navigation 통과
- `npm.cmd run typecheck` — matrix/fact-check type error 0
- `npm.cmd run lint -- components/proposals/review lib/proposals/review.ts tests/lib/proposals/review.test.ts` — lint error/warning 0
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "matrix|fact-check"` — source screenshot parity 통과

## Commit Message
```text
feat(proposals): 원본 검토와 팩트체크 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P03-authoring-workflow
Task: T03-review-and-fact-check

- 요구사항 matrix와 전체 문서 검토 복원
- 원본 정규식 fact-check와 교정 흐름 이식
- editor section 이동과 출력 동작 연결
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
