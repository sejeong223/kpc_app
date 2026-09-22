# Task: T02 Final Parity Gate

## Status: pending

## Goal
현재 축약형 제안서 구현과 임시 compatibility layer를 제거하고, 원본과 target의 모든 Header·Sidebar·Proposal UI 상태가 시각·문구·데이터·상호작용 면에서 동일함을 자동·수동 검증한다.

## Decision Summary
- pixel parity 실패를 “Next.js 차이”로 무시하지 않는다. framework wrapper 외 DOM/className/content 차이는 구현 결함으로 수정한다.
- source에서 도달 불가능한 import-only UI는 최종 bundle에 넣지 않는다. `App.tsx`가 render하는 proposal branch는 모두 유지한다.
- parity 완료 후에만 기존 축약 type/fixture/component를 삭제한다.

## Implementation

### I01. Legacy 제거와 directory boundary 확정

- Related Files:
  - `components/proposals/ProposalWorkspace.tsx` :: source proposal composition root만 유지; modify
  - `components/proposals/**/*` :: 현재 축약 component와 사용되지 않는 compatibility file 제거; modify/delete
  - `data/proposals/mock-data.ts` :: legacy fixture/export 제거; modify/delete
  - `lib/proposals/editor-mocks.ts`, `review.ts`, `workspace.ts` :: source controller가 대체한 축약 helper 제거 또는 실제 공용 순수 helper만 유지; modify/delete
  - `types/proposals.ts` :: legacy alias 제거, source-equivalent contract만 유지; modify
  - `tests/lib/proposals/*.test.ts` :: 최종 symbol/path와 source behavior로 정리; modify
  - `README.md` :: source parity 범위, reference commit, target directory와 mock 한계; modify

#### Details
- **Final Import Rules**:
  ```text
  app/(authenticated)/proposals -> components/proposals + auth service
  components/proposals -> components/common|ui + hooks/proposals + data/proposals + lib/proposals + types/proposals
  hooks/proposals -> data/proposals + lib/proposals + types/proposals
  lib/proposals -> types/proposals
  components/ui -> no proposal imports
  ```
- `ProposalPlaceholder`, 현재 `ProposalPipelineBoard`, `ProposalRegistrationView`, `ProposalReviewDetail`, `ProposalEditorView`, 축약 review/library dialog 이름과 import가 0건이어야 한다.
- `OpportunitySearch`, `RfpDetail`, `RfpUploadView`, `ProposalProjectsList` UI는 source에서 import-only/dead이므로 만들지 않는다.
- `ProposalConvertModal`은 source JSX에 있지만 open action이 연결되지 않은 상태까지 동일하게 보존하거나 manifest에서 unreachable 근거와 함께 제외한다. 임의로 활성화하지 않는다.
- 중첩 `<main>`은 source DOM과 동일하게 application landmark가 하나만 남도록 shell만 `<main>`, proposal/editor 내부는 `<div>`로 둔다.

### I02. 전체 parity와 회귀 검증

- Related Files:
  - `tests/visual/proposals/proposal-parity.spec.ts` :: 전체 manifest scenario 비교; modify
  - `tests/visual/proposals/proposal-parity.spec.ts-snapshots/*.png` :: immutable source baselines; read-only
  - `tests/config/app.test.ts`, `tests/lib/auth/*.test.ts`; existing regression; modify only when route structure assertion changes
  - `README.md` :: 실행/검증 명령과 source-of-truth 제한; modify

#### Details
- **Visual Matrix**:
  - Viewports: 1920x1080, 1440x900, 1280x800.
  - Header: proposal active, profile open, notifications/settings/role states.
  - Sidebar: general, active project, locked/unlocked.
  - Pipeline: Kanban/List, each department, stage dropdown and drag result.
  - Intake: registration default/sample/preview/P-Win; review viewer/search/zoom/approve/reject.
  - Workflow: setup, locked, analysis, checklist, structure, tasks, editor, reference modal, matrix, fact check.
  - Support: library default/filter/import/preview, settings all tabs.
- screenshot 외에 heading, button label, fixture count, active tab, toast text와 state transition을 assertion한다.
- 원본/target 모두 새 browser context와 같은 viewport/device scale에서 시작하고 local state를 scenario마다 초기화한다.
- screenshot 차이가 0.5%를 넘으면 해당 Task를 완료하지 않으며 baseline을 target 결과로 덮어쓰지 않는다.

## Acceptance Criteria
- [ ] Header, Sidebar와 manifest의 모든 Proposal UI screenshot이 source baseline 허용 오차 내에서 통과한다.
- [ ] source/target의 visible Korean text, project count/order와 interactive state가 일치한다.
- [ ] 축약 UI, fixture, compatibility alias와 dead import가 남지 않는다.
- [ ] 다른 GNB category content와 Google AI/motion dependency가 추가되지 않는다.
- [ ] 기존 auth/admin/proxy 동작과 production build에 회귀가 없다.
- [ ] README가 “참고 재구성”이 아니라 `KPC_AI@8f074e5` proposal UI parity임을 정확히 설명한다.

## Validation
- `npm.cmd run test` — 전체 Vitest suite 통과
- `npm.cmd run typecheck` — type error 0
- `npm.cmd run lint` — repository lint error/warning 0
- `Get-ChildItem app,components,data,hooks,lib,types -Recurse -Include *.ts,*.tsx | Select-String -Pattern 'ProposalPlaceholder|ProposalPipelineBoard|ProposalRegistrationView|ProposalReviewDetail|ProposalEditorView|@google/genai|from ["'']motion["'']'` — legacy/금지 dependency 0건
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — production build 성공
- `$env:KPC_TARGET_URL='http://127.0.0.1:3000'; npm.cmd run test:proposal-visual` — 전체 visual matrix 통과
- `git -C "C:\Users\김세정\Documents\GitHub\KPC_AI" status --short` — source repository 변경 0건

## Commit Message
```text
test(proposals): 원본 UI 전체 패리티 검증 완료

Plan: 2026-09-22-kpc-proposal-ui-source-parity
Phase: P04-support-and-parity
Task: T02-final-parity-gate

- 축약 UI와 임시 compatibility layer 제거
- 전체 제안서 화면 screenshot parity 검증
- 인증 회귀와 source-of-truth 범위 문서화
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending