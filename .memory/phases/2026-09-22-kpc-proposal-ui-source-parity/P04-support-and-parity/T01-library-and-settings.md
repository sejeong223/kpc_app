# Task: T01 Library And Settings

## Status: done

## Goal
원본 제안 자료 관리, 사내 저장소 연계, 문서 preview와 제안 설정 전체 tab을 동일한 fixture·local state·권한 동작으로 이식한다.

## Decision Summary
- 현재 44줄 library와 50줄 settings 축약 화면은 source의 전체 화면으로 교체한다.
- source의 local mock 설정과 자료 import/delete는 persistence 없이 유지한다.
- 설정의 admin control은 source 시각을 보존하되 target의 server-derived `canReview`를 최종 권한으로 사용한다.

## Implementation

### I01. Proposal library와 enterprise data 이식

- Related Files:
  - `components/proposals/support/ProposalLibrary.tsx` :: source `ProposalLibrary`; new/replace
  - `components/proposals/support/EnterpriseDataModal.tsx` :: source component; new
  - `components/proposals/review/DocumentPreviewModal.tsx` :: shared source preview; reuse
  - `components/proposals/support/ProposalLibraryView.tsx`, `EnterpriseLibraryDialog.tsx`, `ProposalLibraryPreviewDialog.tsx`; delete after replacement
  - `data/proposals/library.ts` :: source `SAMPLE_LIBRARY_ITEMS`, `ENTERPRISE_KNOWLEDGE_BASE`; read-only
  - `components/proposals/ProposalWorkspace.tsx` :: library route callback; modify
  - External `KPC_AI/src/components/proposals/ProposalLibrary.tsx`, `EnterpriseDataModal.tsx`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface ProposalLibraryProps {
    activeProject?: ProposalProject;
    onShowToast(message: string): void;
  }
  ```
- categories는 `전체`, `방법론`, `기존 제안서`, `회사 소개`, `수행 사례`, `인력 정보`, `인증 및 증빙`, `기술역량` 순서를 유지한다.
- source `SAMPLE_LIBRARY_ITEMS`로 시작하고 title/description/department/tag search와 category filter를 동일하게 적용한다.
- enterprise modal의 folder/department/search/relevance filter, checkbox selection과 duplicate 방지, import order를 보존한다.
- preview의 content/toc/metadata tab, copy/download toast와 delete 동작을 보존한다.

### I02. Proposal settings 전체 tab 이식

- Related Files:
  - `components/proposals/support/ProposalSettingsView.tsx` :: source component; replace
  - `types/proposals.ts` :: source-local settings item type 중 공유가 필요한 type만 이동; modify if required
  - `components/proposals/ProposalWorkspace.tsx` :: active project/update/role props; modify
  - External `KPC_AI/src/components/proposals/ProposalSettingsView.tsx`; read-only source

#### Details
- **Props Contract**:
  ```typescript
  interface ProposalSettingsViewProps {
    activeProject?: ProposalProject | null;
    onUpdateProject?(updated: ProposalProject): void;
    userRole?: UserRole;
    onShowToast(message: string): void;
  }
  ```
- tab은 `members`, `templates_skills`, `ai_policy`, `activity_logs`, `cost_usage`, `notifications`를 source 순서로 유지한다.
- templates/skills sub-tab, team member CRUD/role/status, AI policy/model, activity filters, cost usage, notification switches의 초기 fixture와 local state를 그대로 유지한다.
- `TeamMemberItem`, `TemplateItem`, `SkillItem`, `ActivityLogItem`의 field/union/default를 source와 동일하게 유지한다.
- admin-only mutation은 `userRole` 표시 state와 별개로 `canReview`가 false면 실행되지 않게 adapter에서 차단한다.

## Acceptance Criteria
- [x] library category, search, card, import modal, preview와 delete 결과가 source와 일치한다.
- [x] settings의 6개 tab과 templates/skills sub-tab 내용이 source와 일치한다.
- [x] fixture의 이름·부서·날짜·사용량·token/cost 값이 source와 일치한다.
- [x] 일반 사용자가 admin-only 설정을 저장할 수 없다.
- [x] 새로고침 시 source와 같이 initial mock state로 돌아간다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — library import와 project settings state 통과
- `npm.cmd run typecheck` — library/settings type error 0
- `npm.cmd run lint -- components/proposals/support data/proposals/library.ts` — lint error/warning 0
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual -- --grep "library|settings"` — source screenshot parity 통과

## Commit Message
```text
feat(proposals): 원본 자료실과 제안 설정 이식

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P04-support-and-parity
Task: T01-library-and-settings

- 제안 자료 관리와 사내 저장소 연계 복원
- 문서 preview와 자료 상태 동작 보존
- 원본 제안 설정 전체 tab 이식
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
