# Task: T01 Reference Parity Harness

## Status: done

## Goal
`KPC_AI@8f074e5`의 실제 브라우저 출력을 고정된 screenshot baseline과 화면 manifest로 저장해 이후 Task가 “비슷한 UI”가 아니라 동일 UI를 구현했는지 자동 판별할 수 있게 한다.

## Decision Summary
- 원본 checkout `C:\Users\김세정\Documents\GitHub\KPC_AI`는 read-only reference로 사용하며 commit `8f074e51f7a16db063ef5206e6ac927c6e87c2a4`를 검증한다.
- Playwright Chromium과 `toHaveScreenshot`을 사용한다. baseline은 동일 Windows/Chromium 환경에서 원본을 실행해 생성하고 target에서는 update 없이 비교한다.
- 원본에 없는 mobile UI를 새 기준으로 만들지 않는다. 1920x1080, 1440x900, 1280x800 desktop viewport를 기준으로 한다.

## Implementation

### I01. 원본 화면 manifest와 visual test 기반 구축

- Related Files:
  - `package.json` :: scripts/devDependencies — `@playwright/test`, `test:proposal-visual`, `test:proposal-reference` 추가; modify
  - `package-lock.json` :: Playwright dependency lock; modify
  - `playwright.config.ts` :: Chromium, viewport, screenshot threshold, baseURL 설정; new
  - `tests/visual/proposals/proposal-parity.spec.ts` :: 원본과 target에서 공통 실행할 interaction/screenshot scenario; new
  - `tests/visual/proposals/README.md` :: reference commit, capture/compare 명령과 포트; new
  - `tests/visual/proposals/proposal-screen-manifest.md` :: 화면·진입 action·기대 heading/modal 목록; new
  - `tests/visual/proposals/proposal-parity.spec.ts-snapshots/*.png` :: 원본 capture baseline; new generated artifacts
  - External `KPC_AI/src/App.tsx`, `src/components/common/Header.tsx`, `src/components/proposals/*`; read-only

#### Details
- **Configuration Contract**:
  ```typescript
  interface ProposalVisualEnvironment {
    baseURL: string;
    referenceCommit: "8f074e51f7a16db063ef5206e6ac927c6e87c2a4";
    viewports: readonly [
      { width: 1920; height: 1080 },
      { width: 1440; height: 900 },
      { width: 1280; height: 800 },
    ];
  }
  ```
- **Manifest Scenarios**:
  - `header-proposal-active`: 제안서 AI를 선택한 Header와 profile badge/dropdown.
  - `pipeline-kanban`, `pipeline-list`: 기본 부서 전체, 정확한 stage count와 10개 fixture.
  - `project-registration`, `project-review`: 등록 form과 2-column RFP/P-Win 검토.
  - `setup`, `analysis`, `requirements`, `structure`, `tasks`, `editor`, `matrix`.
  - `library`, `settings`, 각 화면에서 실제 열 수 있는 modal/dropdown.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `git -C <reference> rev-parse HEAD`가 고정 hash와 다르면 capture를 중단한다.
  2. Core Processing: 원본 Vite를 3001에서 실행하고 `제안서 AI`를 눌러 각 상태까지 사용자 action으로 이동한 뒤 animation을 끄고 screenshot을 생성한다.
  3. Error & Exception Handling: selector는 source의 stable id와 visible Korean label을 우선하며 임의 timeout으로 통과시키지 않는다. 도달 불가능 branch는 manifest에 `source-unreachable`로 기록한다.
  4. State Transition & Return: baseline 생성 후 원본 working tree가 변경되지 않았음을 `git status --short`로 확인한다.

### I02. Screenshot 판정 규칙 고정

- Related Files:
  - `playwright.config.ts` :: `expect.toHaveScreenshot`; new
  - `tests/visual/proposals/proposal-parity.spec.ts` :: deterministic setup; new

#### Details
- screenshot은 full page가 아니라 Header 56px와 proposal workspace viewport를 포함한 1개 viewport image로 비교한다.
- `animations: "disabled"`, caret hide, device scale factor 1, Chromium 고정으로 변동을 줄인다.
- 최대 허용치는 `maxDiffPixelRatio: 0.005`로 두며 문구·fixture·layout 차이를 masking하지 않는다.
- 날짜와 D-day는 source fixture 문자열을 사용하고 현재 시각을 계산하지 않는다.
- 원본의 toast/timer 화면은 fake timer가 아니라 action 직후 source와 동일한 안정 시점에서 캡처한다.

## Acceptance Criteria
- [ ] reference HEAD가 `8f074e5`인지 검사하지 않으면 baseline update가 실행되지 않는다.
- [ ] 3개 viewport와 모든 manifest scenario의 baseline이 생성된다.
- [ ] 원본 source에서 visual suite가 통과하고 원본 working tree는 clean 상태다.
- [ ] target mismatch는 실패로 보고되며 baseline 자동 갱신으로 숨겨지지 않는다.
- [ ] 다른 GNB category content screenshot은 생성하지 않는다.

## Validation
- `git -C "C:\Users\김세정\Documents\GitHub\KPC_AI" rev-parse HEAD` — 정확히 `8f074e51f7a16db063ef5206e6ac927c6e87c2a4`
- `npm.cmd run typecheck` — visual test/config type error 0
- `npm.cmd run lint -- playwright.config.ts tests/visual/proposals` — lint error/warning 0
- `$env:KPC_REFERENCE_URL='http://127.0.0.1:3001'; npm.cmd run test:proposal-reference` — 원본 baseline 생성과 manifest scenario 통과

## Commit Message
```text
test(proposals): 원본 UI 시각 기준선 고정

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P01-parity-foundation
Task: T01-reference-parity-harness

- KPC_AI 8f074e5 화면 manifest 기록
- Playwright screenshot parity 환경 추가
- 원본 commit 검증과 baseline 갱신 절차 고정
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: included in task commit