# Task: T02 제안서 목업과 시각 회귀 자료 제거

## Status: pending

## Goal

현재 화면에만 쓰이는 `/proposals` 기능, 샘플 데이터, 테스트·스냅샷을 전부 삭제하여 저장소에 범용 프로젝트 기반만 남긴다.

## Decision Summary

- T01에서 전역 셸이 제안서 타입·컴포넌트에서 분리된 상태를 전제로 한다.
- 제안서 원본 패리티 자료는 새 디자인의 기준이 아니므로 실행 코드와 테스트 자산을 함께 삭제한다. 과거 `.memory` 이력은 보존한다.

## Implementation

### I01. 제안서 라우트·컴포넌트·상태·타입·fixture 삭제

- Related Files:
  - `app/(authenticated)/proposals/page.tsx` :: `ProposalPage` — 제안서 라우트 제거; delete
  - `components/proposals/ProposalWorkspace.tsx` :: `ProposalWorkspace` — 제안서 조립 화면; delete
  - `components/proposals/navigation/ProposalSidebar.tsx` :: `ProposalSidebar` — 전용 내비게이션; delete
  - `components/proposals/pipeline/PipelineBoard.tsx` :: `PipelineBoard` — 파이프라인 화면; delete
  - `components/proposals/authoring/AiAnalysisView.tsx`, `MyTasksView.tsx`, `ProposalSetupView.tsx`, `ProposalStructureView.tsx`, `RequirementsView.tsx`, `RfpAnalysisRequiredState.tsx`, `TaskManagementView.tsx` :: 각 파일의 동명 화면 심볼 — 작성 화면 7개; delete
  - `components/proposals/editor/EditorView.tsx`, `SectionReferenceModal.tsx` :: 각 파일의 동명 화면 심볼 — 편집 화면 2개; delete
  - `components/proposals/review/DocumentPreviewModal.tsx`, `FactCheckModal.tsx`, `ProjectRegistrationView.tsx`, `ProjectReviewDetail.tsx`, `RequirementsMatrix.tsx` :: 각 파일의 동명 화면 심볼 — 검토 화면 5개; delete
  - `components/proposals/support/EnterpriseDataModal.tsx`, `ProposalLibrary.tsx`, `ProposalSettingsView.tsx` :: 각 파일의 동명 화면 심볼 — 자료실·설정 화면 3개; delete
  - `components/common/Toast.tsx` :: `Toast`, `ToastContainer` — 전용 알림; delete
  - `hooks/proposals/useProposalWorkspace.ts` :: `useProposalWorkspace` — 제안서 React 상태; delete
  - `lib/proposals/workspace.ts`, `lib/proposals/review.ts` :: `createSourceProposalWorkspaceState`, `sourceProposalWorkspaceReducer` 및 검토 헬퍼 — 제안서 상태·검토 로직; delete
  - `types/proposals.ts` :: `ProposalProject`, `ProposalSectionItem`, `GnbTab` 등 — 제안서 타입 전체; delete
  - `data/proposals/authoring.ts`, `library.ts`, `projects.ts`, `pwin.ts`, `rfp-pages.ts`, `tasks.ts` :: `INITIAL_*`, `SAMPLE_*` fixture — 샘플 데이터 6개; delete

#### Details

- **Signatures & Types**:
  ```typescript
  // 삭제 대상 공개 표면: ProposalPage(), ProposalWorkspace(props),
  // useProposalWorkspace(), createSourceProposalWorkspaceState(),
  // sourceProposalWorkspaceReducer(state, action), ProposalProject,
  // ProposalSectionItem, GnbTab 및 types/proposals.ts의 모든 export.
  ```
- **Data & Schema Fields**:
  - 제안서 fixture(`SAMPLE_PROJECTS`, `SAMPLE_RFPS`, `INITIAL_*`), `ProposalProject`/`RfpItem`/`UploadedProposalFile` 필드 및 React 세션 상태를 모두 제거한다. DB 스키마·마이그레이션은 존재하지 않는다.
- **Execution Flow / Logic**:
  1. T01 완료를 확인한 뒤 위 라우트와 `components/proposals` 20개 파일, `data/proposals` 6개, `hooks/proposals` 1개, `lib/proposals` 2개, `types/proposals.ts`를 삭제한다.
  2. `components/common/Toast.tsx`는 T01 이후 제안서 작업공간만 참조하므로 함께 삭제한다.
  3. 새 `/proposals` 대체 페이지나 리다이렉트는 만들지 않는다. 삭제 후 해당 경로는 Next.js 404가 된다.
  4. `lib/pagination.ts`는 제안서 전용이 아닌 순수 범용 함수이므로 유지한다.

### I02. 화면 패리티 검증기와 패키지 정리

- Related Files:
  - `tests/lib/proposals/workspace.test.ts`, `tests/lib/proposals/review.test.ts` :: 제안서 상태·검토 테스트; delete
  - `tests/visual/proposals/README.md`, `proposal-screen-manifest.md`, `proposal-parity.spec.ts` :: 원본 패리티 안내·스펙; delete
  - `tests/visual/proposals/proposal-parity.spec.ts-snapshots/*.png` :: 해당 디렉터리의 제안서 스냅샷 69개; delete
  - `playwright.config.ts` :: `defineConfig` 기반 원본/대상 프로젝트 설정; delete
  - `package.json` :: `scripts`, `devDependencies` — Playwright 스크립트·패키지 제거; modify
  - `package-lock.json` :: npm 잠금 파일 — 패키지 변경 반영; modify
  - `vitest.config.ts` :: `tests/**/*.test.ts` 포함 패턴 — 나머지 테스트 범위 확인; read-only

#### Details

- **Signatures & Types**:
  ```json
  {
    "scripts": {
      "test:proposal-reference": "REMOVE",
      "test:proposal-visual": "REMOVE"
    },
    "devDependencies": { "@playwright/test": "REMOVE" }
  }
  ```
- **Data & Schema Fields**:
  - Playwright 스냅샷과 manifest는 현재 제안서 화면에만 대응한다. Vitest의 인증·환경·Azure·페이지네이션 테스트는 그대로 둔다.
- **Execution Flow / Logic**:
  1. `tests/visual/proposals` 전체를 삭제한다. `playwright.config.ts`가 이 폴더만 대상으로 하므로 설정과 두 npm script를 제거한다.
  2. `package.json`에서 `@playwright/test`만 이 Task의 의존성 삭제 대상으로 삼고 `npm.cmd install --package-lock-only --ignore-scripts`로 `package-lock.json`을 동기화한다.
  3. `README.md`의 제안서 안내는 T04에서 갱신한다. 인증, Azure, `lib/pagination.ts`, `app/api/profile-image/route.ts`는 건드리지 않는다.
  4. 테스트 실패 시 삭제된 제안서 import를 활성 코드에서 찾아 연결을 끊는다. 무관한 인증·Azure 로직을 제거하지 않는다.

## Acceptance Criteria

- [ ] `/proposals` 라우트와 제안서 타입·상태·fixture·컴포넌트·테스트가 활성 소스에서 사라진다.
- [ ] Playwright 설정, 제안서 스냅샷, `test:proposal-*` script와 `@playwright/test`가 없다.
- [ ] 범용 페이지네이션과 기존 인증·Azure 테스트는 통과한다.

## Validation

- `npm.cmd run test` — 제안서 테스트 삭제 후 모든 남은 Vitest 테스트 통과.
- `npm.cmd run lint` — 활성 코드의 미사용 제안서 import 없음.
- `$env:AUTH_ENABLED = 'false'; $env:EMBEDDED_MODE = 'false'; npm.cmd run build` — 삭제된 라우트 참조 없이 프로덕션 빌드 성공.
- `npm.cmd run typecheck` — 빌드가 생성한 최신 Next 타입 기준 통과.
- `rg -n 'proposals|Proposal' app components config lib services tests package.json` — 활성 영역에서 매치 없음(종료 코드 1이 기대값).

## Commit Message

```text
refactor(template): 제안서 목업과 시각 회귀 자료 제거

Plan: 2026-10-26-azure-template-design-reset
Phase: P01-template-cleanup
Task: T02-remove-proposal-mock

- 제안서 라우트와 전용 데이터·상태·컴포넌트 삭제
- 패리티 스냅샷과 Playwright 의존성 정리
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
