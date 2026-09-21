# Task: T02 Registration and Review

## Status: pending

## Goal
신규 RFP 프로젝트 등록 화면과 RFP 문서·P/Win 정보를 나란히 확인하는 2열 검토 화면을 구현한다. 등록된 project가 `검토 대기`에서 시작해 관리자 검토·승인 또는 반려를 거쳐 작성 workflow로 진입하는 mock lifecycle을 완성한다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5`의 `ProjectRegistrationView.tsx`, `ProjectReviewDetail.tsx`, `DocumentPreviewModal.tsx`, `pwinData.ts`다.
- upload는 file metadata만 memory에 저장하고 binary upload/object URL/API는 사용하지 않는다.
- P/Win은 fixture 기반 설명 가능한 점수이며 실제 AI 계산을 표방하지 않는다.
- 승인·반려 button은 `canReview=true`일 때만 제공한다.

## Prerequisite Contract
- `ProposalWorkspaceView`의 `register`, `project-review`, `workspace`를 사용한다.
- `add-project`, `update-stage`, `select-project`, `navigate` action이 존재한다.
- project가 `진행`일 때만 `workspace/setup` 진입이 허용된다.

## Implementation

### I01. 신규 project 등록 form과 document metadata
- Related Files:
  - `components/proposals/review/ProposalRegistrationView.tsx` :: registration form; new
  - `components/proposals/review/ProposalDocumentPreviewDialog.tsx` :: fixture preview; new
  - `types/proposals.ts` :: `ProposalRegistrationDraft`, `ProposalReviewCriterion`; modify
  - `data/proposals/mock-data.ts` :: sample RFP pages/PWin criteria; modify
  - `components/proposals/ProposalWorkspace.tsx` :: register outlet; modify

#### Details
- **Types**:
  ```typescript
  export interface ProposalRegistrationDraft {
    title: string;
    agency: string;
    department: Exclude<ProposalDepartment, "전체">;
    budget: number;
    deadline: string;
    manager: string;
    summary: string;
  }

  export interface ProposalReviewCriterion {
    id: string;
    category: string;
    score: number;
    maxScore: number;
    rationale: string;
    sourcePage: number;
    sourceQuote: string;
  }
  ```
- required field는 title, agency, department, deadline, manager, primary RFP다. submit 전에 inline error와 첫 error focus를 제공한다.
- input file은 `.pdf,.doc,.docx,.hwp`를 accept하고 `name`, human-readable `size`, `isPrimary`만 state에 저장한다. file 내용은 읽거나 전송하지 않는다.
- “샘플 데이터 불러오기”는 KPC reference fixture를 form과 document list에 채운다.
- 등록 완료 시 unique id를 생성해 stage `검토 대기`, pWin fixture 평균, progress 0, activeStep `setup`, analysisStatus `분석 전` project를 dispatch하고 pipeline으로 돌아간다.
- dialog preview는 선택 문서 이름, page count, summary, 목차, sample page text를 표시하며 실제 PDF renderer는 사용하지 않는다.

### I02. RFP/P-Win 2열 검토와 stage decision
- Related Files:
  - `components/proposals/review/ProposalReviewDetail.tsx` :: review workspace; new
  - `components/proposals/review/ProposalRejectDialog.tsx` :: reason form; new
  - `components/proposals/ProposalWorkspace.tsx` :: review outlet/transition; modify
  - `lib/proposals/workspace.ts` :: selected project transition selectors; modify
  - `tests/lib/proposals/workspace.test.ts` :: approval/rejection lifecycle; modify

#### Details
- desktop은 left 58% RFP viewer, right 42% review panel이고 작은 화면에서는 vertical stack이다.
- left viewer는 page selector, previous/next, text search와 fixture page content를 제공한다. P/Win criterion 클릭 시 해당 source page로 이동하고 quote를 강조한다.
- right panel은 project summary, stage badge, P/Win total, 4개 criterion score/rationale, 핵심 요구사항/위험, 관리자 의견 textarea를 표시한다.
- stage별 administrator action:
  1. `검토 대기`: `검토 시작` → `검토 중`.
  2. `검토 중`: `진행 승인` → `진행`; `진행 안 함` → reject dialog.
  3. reject dialog는 사유 필수이며 confirm 시 stage와 `rejectionReason`을 저장한다.
  4. `진행`: `제안서 작성 시작` → selected project를 유지하고 `workspace/setup`으로 이동한다.
- 일반 사용자는 review 정보를 read-only로 보고 stage action 대신 상태 안내를 본다.
- back action은 pipeline으로 돌아가되 selected project는 유지해 card를 다시 열 수 있게 한다.

## Acceptance Criteria
- [ ] sample 또는 직접 입력으로 신규 project를 등록할 수 있다.
- [ ] file binary를 읽거나 전송하지 않고 metadata만 mock state에 저장한다.
- [ ] 2열 검토 화면에서 RFP page와 P/Win 근거를 함께 확인할 수 있다.
- [ ] 관리자만 대기 → 검토 → 승인/반려를 실행할 수 있다.
- [ ] 승인 project만 01 문서 설정 화면으로 이동한다.
- [ ] 반려 사유 누락 시 confirm되지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — 등록/승인/반려 lifecycle 통과
- `npm.cmd run typecheck` — form, dialog, reducer type error 0
- `npm.cmd run lint -- components/proposals/review components/proposals/ProposalWorkspace.tsx types/proposals.ts data/proposals/mock-data.ts lib/proposals/workspace.ts tests/lib/proposals/workspace.test.ts` — error/warning 0
- `rg -n "FileReader|readAsDataURL|fetch\(|FormData|URL\.createObjectURL" components/proposals/review` — binary/API upload 구현 없음
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — production build 성공

## Commit Message
```text
feat(proposals): 제안 등록과 검토 흐름 구현

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P02-pipeline-and-review
Task: T02-registration-and-review

- 신규 RFP 프로젝트 등록 form과 문서 preview 추가
- P/Win 근거를 포함한 2열 검토 화면 구성
- 관리자 승인과 반려 상태 전이 연결
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
