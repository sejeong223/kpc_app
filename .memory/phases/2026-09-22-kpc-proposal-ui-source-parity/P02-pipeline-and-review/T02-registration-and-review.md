# Task: T02 Registration And Review

## Status: done

## Goal
원본 프로젝트 등록 form과 2-column RFP/P-Win 검토 화면, 문서 preview를 동일하게 이식해 등록부터 검토·승인·반려·작성 시작까지 같은 흐름을 제공한다.

## Decision Summary
- source component의 field, 초기값, sample fill, local modal/tab/search/zoom state를 삭제하거나 shadcn form으로 재설계하지 않는다.
- browser file input은 metadata mock으로 유지하고 실제 upload API를 추가하지 않는다.
- source의 관리자 동작은 target `canReview` server 권한으로 제한하되 DOM 위치와 admin baseline은 동일하게 유지한다.

## Implementation

### I01. Project registration과 document preview 이식

- Related Files:
  - `components/proposals/review/ProjectRegistrationView.tsx` :: source `ProjectRegistrationView`; new/replace
  - `components/proposals/review/DocumentPreviewModal.tsx` :: source `DocumentPreviewModal`; new/replace
  - `components/proposals/review/ProposalRegistrationView.tsx`; delete after replacement
  - `components/proposals/review/ProposalDocumentPreviewDialog.tsx`; delete after replacement
  - `components/proposals/ProposalWorkspace.tsx` :: registration callbacks; modify
  - External source files with matching names; read-only

#### Details
- **Props Contract**:
  ```typescript
  interface ProjectRegistrationViewProps {
    onBack?(): void;
    onCancel?(): void;
    onRegisterComplete?(newProject: ProposalProject): void;
    onCompleteRegistration?(newProject: ProposalProject): void;
    onShowToast(message: string): void;
  }

  interface DocumentPreviewModalProps {
    item: ProposalLibraryItem;
    onClose(): void;
    onShowToast(message: string): void;
  }
  ```
- 사업개요 field 10개, source 기본값, `샘플 데이터 자동 입력`, 관련 문서 3개, primary RFP 선택, P/Win 평가 state와 citation을 보존한다.
- 등록 완료와 바로 검토 callback이 source `App.tsx`와 같은 `RfpOpportunity` field/default를 생성한다.
- preview `content/toc/metadata` tab, clipboard, download toast와 fallback content를 그대로 유지한다.
- `previewDoc: any`는 실제 `ProposalLibraryItem | ProjectRelatedDoc | null` union으로 좁히되 렌더 결과를 바꾸지 않는다.

### I02. Two-column project review 이식

- Related Files:
  - `components/proposals/review/ProjectReviewDetail.tsx` :: source `ProjectReviewDetail`; replace
  - `components/proposals/review/ProposalReviewDetail.tsx`; delete after replacement
  - `components/proposals/review/ProposalRejectDialog.tsx`; delete if source inline rejection modal supersedes it
  - `components/proposals/ProposalWorkspace.tsx` :: selected review project/stage callbacks; modify
  - `data/proposals/pwin.ts` :: P/Win and RFP pages; read-only
  - External `KPC_AI/src/components/proposals/ProjectReviewDetail.tsx`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface ProjectReviewDetailProps {
    userRole?: UserRole;
    project: ProposalProject;
    onBack(): void;
    onUpdateProjectStage?(
      projectId: string,
      newStage: PipelineStage,
      extraData?: Partial<ProposalProject>,
    ): void;
    onUpdateProject?(updatedProject: ProposalProject): void;
    onStartProposalWriting?(project: ProposalProject): void;
    onStartProposal?(): void;
    onShowToast(message: string): void;
  }
  ```
- 검토 대기 project를 열 때 `검토 중`으로 자동 전환하는 source effect와 toast를 유지한다.
- 왼쪽 viewer의 문서 선택, page 18 기본값, 64 pages, 검색 match 이동, zoom 100%, single/double view를 보존한다.
- 오른쪽 사업정보, P/Win criteria, 근거 이동, 수정, 승인, 반려 reason modal과 role별 control을 그대로 이식한다.
- 승인된 project만 작성 시작할 수 있고 거절 사유가 project와 RFP 양쪽 state에 반영되는 source 순서를 유지한다.

## Acceptance Criteria
- [ ] 등록 화면 field, sample data, 문서 목록, P/Win 영역이 source와 동일하다.
- [ ] 등록 완료와 바로 검토가 pipeline/RFP state를 source와 동일하게 갱신한다.
- [ ] review 화면의 2-column 비율, toolbar, viewer, P/Win panel과 modal이 source와 일치한다.
- [ ] 검토 대기 진입 시 검토 중 자동 전환이 한 번만 발생한다.
- [ ] 일반 사용자에게 관리자 승인·반려 권한이 노출되지 않는다.
- [ ] 실제 file upload/download/network request는 발생하지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts tests/lib/proposals/review.test.ts` — 등록/stage/review 전이 통과
- `npm.cmd run typecheck` — form/document/review type error 0
- `npm.cmd run lint -- components/proposals/review components/proposals/ProposalWorkspace.tsx` — lint error/warning 0
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "registration|project-review|document-preview"` — source screenshot parity 통과

## Commit Message
```text
feat(proposals): 원본 등록과 검토 화면 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P02-pipeline-and-review
Task: T02-registration-and-review

- 프로젝트 등록 form과 sample fixture 복원
- 2열 RFP 및 PWin 검토 화면 동일화
- 승인 반려와 작성 시작 상태 전이 보존
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 5e14c1a
