# Task: T02 Quality and Documentation

## Status: done

## Goal
KPC header와 제안서 전체 화면을 desktop/mobile에서 사용할 수 있게 마무리하고, keyboard/accessibility·auth regression·production build를 검증한 뒤 README에 목 UI 사용법과 한계를 기록한다.

## Decision Summary
- 새 test framework나 screenshot dependency를 추가하지 않고 기존 Vitest, ESLint, TypeScript, Next build를 사용한다.
- responsive는 desktop 정보 밀도를 유지하되 mobile에서 header menu, proposal nav drawer, horizontal table/board scroll로 기능 손실을 막는다.
- placeholder와 dead route를 제거하고 workspace view renderer를 exhaustive하게 만든다.

## Implementation

### I01. Responsive and accessibility hardening
- Related Files:
  - `components/layout/AppHeader.tsx` :: mobile GNB/profile behavior; modify
  - `components/proposals/ProposalWorkspace.tsx` :: mobile nav trigger/exhaustive outlet; modify
  - `components/proposals/ProposalSidebar.tsx` :: desktop/sidebar and mobile dialog reuse; modify
  - `components/proposals/ProposalPlaceholder.tsx` :: 모든 실제 view 연결 후 제거; delete
  - `components/proposals/**/*` :: labels, focus, overflow audit; modify as required
  - `app/globals.css` :: print rules, reduced-motion, scrollbar utilities; modify

#### Details
- 1024px 미만에서는 desktop proposal sidebar를 숨기고 content header의 “메뉴 열기” button으로 modal/drawer navigation을 제공한다.
- header GNB는 768px 미만에서 menu button으로 접고, brand와 profile trigger는 항상 남긴다.
- kanban/table은 column을 억지로 축소하지 않고 `overflow-x-auto`와 visible scroll affordance를 사용한다.
- editor는 desktop 3-pane, tablet two-pane tabs, mobile single-pane tab switch로 바뀌며 현재 section/draft state를 잃지 않는다.
- 모든 icon-only button은 `aria-label`, dialog는 title/description, active nav는 `aria-current`, tabs는 shadcn Tabs semantics를 사용한다.
- modal open 시 focus trap/return은 기존 Radix Dialog에 맡기고 custom document listener를 새로 만들지 않는다.
- KPC red text/background 조합은 작은 text에서 충분한 contrast를 유지하도록 pale red background에서 dark red text를 사용한다.
- `prefers-reduced-motion`에서 non-essential transition/animation을 끈다.
- `ProposalWorkspace` view/step switch는 `assertNever` 또는 exhaustive `switch`를 사용한다. 남은 placeholder/dead branch는 삭제한다.

### I02. Regression tests and usage documentation
- Related Files:
  - `tests/config/app.test.ts` :: header/proposal/admin navigation; modify
  - `tests/lib/proposals/workspace.test.ts` :: end-to-end reducer lifecycle; modify
  - `tests/lib/proposals/editor-mocks.test.ts` :: deterministic editor helpers; modify
  - `tests/lib/proposals/review.test.ts` :: summary/export helpers; modify
  - `README.md` :: `/proposals` 실행 방법, mock scope, reference attribution; modify

#### Details
- reducer integration test는 initial pipeline → project 선택 → review 시작 → 승인 → setup → 분석 완료 → requirement 반영 → section 작성 완료 → review summary 순서로 한 scenario를 실행한다.
- config test는 일반 proposal navigation과 Admin role-only route가 섞이지 않는지 검증한다.
- README는 다음을 명시한다: `npm.cmd run dev`, `/proposals`, auth enabled/disabled 동작, mock data reset 조건(새로고침), 지원 화면, 실제 API/AI/file persistence가 없다는 한계, reference repository/commit.
- 로그인 UI, callback URL, popup message, proxy/access policy test를 전체 validation에 포함해 shell 변경 회귀를 막는다.
- source audit에서 Vite-only import, `@google/genai`, reference email/name hard-code가 인증 활성 사용자 UI에 노출되지 않는지 확인한다. auth disabled mock identity는 명시적으로 허용한다.

## Acceptance Criteria
- [x] desktop에서 reference의 header/sidebar/information density를 유지한다.
- [x] mobile에서 모든 main view와 5단계 workflow에 접근 가능하다.
- [x] keyboard focus, button label, dialog title, active navigation semantics가 존재한다.
- [x] placeholder와 unreachable/dead proposal view가 남지 않는다.
- [x] 전체 reducer lifecycle과 helper test가 통과한다.
- [x] 기존 로그인·권한·proxy test와 production build가 통과한다.
- [x] README가 목 UI 실행법과 비영속성/비AI 한계를 정확히 설명한다.

## Validation
- `npm.cmd run test` — 전체 Vitest suite 통과
- `npm.cmd run typecheck` — type error 0
- `npm.cmd run lint` — repository lint error/warning 0
- `rg -n "ProposalPlaceholder|@google/genai|from ['\"]vite|VITE_" app components data lib types package.json` — placeholder/Vite/Google AI 잔재 없음
- `rg -n "dangerouslySetInnerHTML|contentEditable" components/proposals` — unsafe editor rendering 없음
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — auth-disabled production build 성공
- `npm.cmd run test -- tests/lib/auth/callback-url.test.ts tests/lib/auth/login-message.test.ts tests/lib/auth/access-policy.test.ts tests/lib/auth/proxy-policy.test.ts tests/config/app.test.ts` — auth/navigation regression 통과

## Commit Message
```text
test(proposals): 제안서 목업 품질과 사용 안내 완성

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P04-support-and-quality
Task: T02-quality-and-documentation

- mobile navigation과 editor 반응형 동작 보강
- 접근성 및 전체 proposal lifecycle 회귀 검증
- 목 UI 실행법과 비영속성 범위 문서화
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
