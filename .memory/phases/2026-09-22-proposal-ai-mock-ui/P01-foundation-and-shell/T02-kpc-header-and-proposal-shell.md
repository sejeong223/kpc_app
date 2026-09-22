# Task: T02 KPC Header and Proposal Shell

## Status: done

## Goal
원본 KPC AI global header와 contextual proposal sidebar를 현재 Next.js App Router shell에 이식하고 `/proposals` route에서 공통 workspace state와 content outlet을 제공한다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5`의 `src/components/common/Header.tsx`, `src/components/proposals/ProposalNav.tsx`, `src/App.tsx:351-422`다.
- 기존 `/auth/*` full-screen 예외와 session/role 기반 관리자 노출은 유지한다.
- global left `AppSidebar` 대신 56px top header를 사용하고, proposal sidebar는 `/proposals` 내부에서만 표시한다.
- 미구현 GNB는 disabled가 아니라 클릭 가능한 “준비 중” mock item으로 두되 현재 route를 변경하지 않는다.

## Prerequisite Contract
- P01-T01의 `ProposalWorkspaceState`, `ProposalWorkspaceAction`, `createInitialProposalWorkspaceState`, `proposalWorkspaceReducer`, `canOpenProposalStep`을 그대로 사용한다.
- `sonner`의 `toast`와 현재 `Session`/`AppRole` type을 재사용한다.

## Implementation

### I01. Global KPC header와 app shell 전환
- Related Files:
  - `components/layout/AppHeader.tsx` :: `AppHeader`; new
  - `components/layout/AppShell.tsx` :: top-header shell로 변경; modify
  - `components/layout/AppSidebar.tsx` :: 더 이상 사용하지 않는 global sidebar; delete
  - `config/app.ts` :: `HeaderNavigationItem`, header navigation metadata; modify
  - `tests/config/app.test.ts` :: proposal/admin navigation visibility 회귀; modify
  - `app/globals.css` :: KPC red token과 workspace surface token; modify

#### Details
- **Signature**:
  ```typescript
  interface AppHeaderProps {
    authEnabled: boolean;
    session: Session | null;
  }
  export default function AppHeader(props: AppHeaderProps): React.ReactElement;
  ```
- header는 `fixed top-0 z-40 h-14 w-full border-b bg-white`, 내부 최대 폭 `1920px`, 좌측 32px KPC red logo + “KPC AI” + “Enterprise”, 우측 GNB + profile trigger 구조를 사용한다.
- GNB 순서는 `Knowledge AI`, `AI Worker`, `제안서 AI`, `Custom AI`, `AI Agent`, `AI Community`다. `/`와 `/proposals`만 실제 Link이며 나머지는 `toast.info("준비 중인 목업 메뉴입니다.")`를 표시한다.
- pathname `/proposals`에서 “제안서 AI” 하단 2.5px red indicator를 표시한다. `/`는 “Knowledge AI”가 active다.
- profile dropdown은 session이 있으면 name/upn/role을, auth-disabled이면 “정소담 / AI사업본부 / 목업 사용자”를 표시한다. Admin role일 때만 `/admin` link를 노출한다.
- auth enabled session은 기존 `/api/profile-image` avatar와 `signOut({ callbackUrl: "/", redirect: true })`를 유지한다.
- `AppShell`은 `/auth`에서 header 없이 기존 full-screen main을 반환하고, 나머지는 `AppHeader` + `pt-14 min-h-screen` content로 렌더링한다.
- `config/app.ts`는 현재 Admin server-side 보안 의미를 바꾸지 않는다. proposal 항목은 일반 app route이며 auth enabled 시 proxy 보호를 따른다.

### I02. Proposal workspace와 contextual sidebar
- Related Files:
  - `app/proposals/page.tsx` :: server page entry; new
  - `components/proposals/ProposalWorkspace.tsx` :: reducer owner와 view outlet; new
  - `components/proposals/ProposalSidebar.tsx` :: main/project navigation; new
  - `components/proposals/ProposalPlaceholder.tsx` :: 후속 Task 전 안전한 placeholder; new

#### Details
- **Signatures**:
  ```typescript
  export default function ProposalPage(): Promise<React.ReactElement>;

  interface ProposalWorkspaceProps {
    canReview: boolean;
  }

  interface ProposalSidebarProps {
    state: ProposalWorkspaceState;
    dispatch: React.Dispatch<ProposalWorkspaceAction>;
  }

  export default function ProposalWorkspace(
    props: ProposalWorkspaceProps,
  ): React.ReactElement;
  ```
- `ProposalWorkspace`만 `"use client"`이며 `useReducer`로 state를 소유한다. page는 server component에서 auth-disabled이면 demo를 위해 `canReview=true`, auth-enabled이면 session의 `Admin` role 여부를 `canReview`로 전달한다. route 보호 자체는 기존 proxy가 담당한다.
- layout은 `h-[calc(100vh-3.5rem)] flex overflow-hidden bg-[#F8F9FA]`; sidebar는 desktop `w-60 shrink-0 border-r bg-white`, content는 `min-w-0 flex-1 overflow-auto`다.
- project 미선택 또는 main view에서는 “제안서 생성” 아래 `제안 목록`, `자료 라이브러리`, `제안 설정`을 표시한다.
- project workspace에서는 back button, project title/agency/D-day, `01 문서 설정`, `02 AI 분석`, `03 요구사항`, `04 제안서 작성`, `05 검토 및 완성`, divider, `프로젝트 설정`을 표시한다.
- step은 `canOpenProposalStep`으로 잠금 상태를 결정하며 잠긴 item은 `aria-disabled=true`, Lock icon, 설명 title을 가진다.
- 후속 화면 component가 아직 없는 view는 `ProposalPlaceholder`에서 현재 제목과 “다음 Task에서 구현 예정”을 표시해 route가 깨지지 않게 한다.

## Acceptance Criteria
- [ ] 모든 비-auth route에 KPC header가 표시되고 auth page에는 표시되지 않는다.
- [ ] `/proposals`에서 reference와 동일한 header red accent와 240px proposal sidebar 구성이 보인다.
- [ ] proposal main menu와 project 5-step menu가 state에 따라 전환된다.
- [ ] 잠긴 step은 keyboard/click으로 진입하지 못하고 설명을 제공한다.
- [ ] 관리자 link·logout·profile image는 기존 session/role 정책을 유지한다.
- [ ] 기존 `AppSidebar` 의존성이 남지 않는다.

## Validation
- `npm.cmd run test -- tests/config/app.test.ts tests/lib/proposals/workspace.test.ts` — navigation/state test 통과
- `npm.cmd run typecheck` — server/client boundary와 props type error 0
- `npm.cmd run lint -- app/proposals components/layout components/proposals/ProposalWorkspace.tsx components/proposals/ProposalSidebar.tsx components/proposals/ProposalPlaceholder.tsx config/app.ts tests/config/app.test.ts` — error/warning 0
- `rg -n "AppSidebar" app components config` — 결과 없음
- `@('KPC AI','Enterprise','Knowledge AI','AI Worker','제안서 AI','Custom AI','AI Agent','AI Community') | ForEach-Object { if (-not (Select-String -LiteralPath 'components/layout/AppHeader.tsx' -SimpleMatch $_)) { throw "missing header marker: $_" } }` — header marker 존재
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — production build 성공

## Commit Message
```text
feat(layout): KPC 헤더와 제안서 작업공간 추가

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P01-foundation-and-shell
Task: T02-kpc-header-and-proposal-shell

- KPC AI 전역 헤더와 profile menu 구성
- 제안서 전용 sidebar 및 5단계 navigation 연결
- 기존 인증 route와 관리자 role 노출 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
