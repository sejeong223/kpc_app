# Task: T02 Remove Daruda Domain And Dependencies

## Status: done

## Goal
새 대시보드·인증·Azure 공통 계층이 준비된 뒤 Daruda 번역 라우트, 목업 관리자 화면, 전용 컴포넌트·자산과 더 이상 쓰이지 않는 패키지를 삭제해 활성 프로젝트를 순수한 범용 템플릿으로 만든다.

## Decision Summary
- 삭제 전 원본은 P01-T01 로컬 Git snapshot에서 복구할 수 있다.
- `components/ui` 전체와 Microsoft 로그인 자산은 유지한다.
- legacy/archive 폴더는 만들지 않고 활성 트리와 최종 배포물에서 Daruda 코드를 완전히 제거한다.

## Implementation

### I01. 번역 및 목업 관리자 route 제거

- Related Files:
  - `app/document-translation/` :: document translation page — 전체 제거; delete
  - `app/text-translation/` :: text translation page — 전체 제거; delete
  - `app/translation-history/` :: translation history page — 전체 제거; delete
  - `app/admin/general/` :: translation environment mock settings — 전체 제거; delete
  - `app/admin/glossary/` :: glossary list/detail mock pages — 전체 제거; delete
  - `app/admin/permissions/` :: non-persistent permission mock page — 전체 제거; delete
  - `app/admin/page.tsx` :: protected generic admin example — 반드시 유지; read-only

#### Details
- **Deletion Boundary**:
  - `app/admin` 자체를 재귀 삭제하지 않는다. P03-T01의 `app/admin/page.tsx`가 남아야 한다.
  - `app/auth`, `app/api`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`는 유지한다.
- **Execution Flow / Logic**:
  1. 각 삭제 target을 절대 경로로 resolve하고 워크스페이스 내부인지 확인한다.
  2. 명시된 하위 route만 `-LiteralPath`로 제거한다.
  3. `rg`로 새 config/sidebar/page에서 삭제 route import/link가 없는지 확인한다.
- **Postcondition**:
  - 유효 page routes는 `/`, `/admin`, `/auth/*`, `/api/auth/*`, `/api/profile-image`다.

### I02. 도메인 컴포넌트·유틸리티·자산 제거

- Related Files:
  - `components/translation/` :: RaccoonHero, LanguageSelector, HistoryTable, FileUploader — 전체 제거; delete
  - `components/admin/` :: permission mock table/filter/dialog — 전체 제거; delete
  - `lib/dayjs.ts` :: glossary-only Korean date setup — 제거; delete
  - `public/raccoon.png` :: Daruda mascot — 제거; delete
  - `public/file.svg` :: unused create-next-app asset — 제거; delete
  - `public/globe.svg` :: unused create-next-app asset — 제거; delete
  - `public/next.svg` :: unused create-next-app asset — 제거; delete
  - `public/vercel.svg` :: unused create-next-app asset — 제거; delete
  - `public/window.svg` :: unused create-next-app asset — 제거; delete
  - `public/M365.png` :: Microsoft login logo — 유지; read-only
  - `app/favicon.ico` :: generic favicon — 유지; read-only
  - `components/ui/` :: selected reusable shadcn components — 전체 유지; read-only except prior pagination change

#### Details
- **Execution Flow / Logic**:
  - 제거 전 `rg`로 각 자산과 module의 남은 import/reference가 삭제 대상 내부에만 있는지 확인한다.
  - `components/ui/progress.tsx`, `textarea.tsx`, `table.tsx`, `tabs.tsx` 등 현재 dashboard에서 사용하지 않는 범용 primitive도 사용자 결정에 따라 유지한다.
  - `public/M365.png`는 popup/redirect 로그인 공통 UI가 사용하므로 삭제하지 않는다.
- **Safety**:
  - `components`나 `public` 상위 폴더 전체 재귀 삭제를 금지한다.
  - 삭제된 파일은 P01 snapshot commit에서 복구 가능함을 확인한 뒤 진행한다.

### I03. 도메인/미사용 npm 의존성 제거

- Related Files:
  - `package.json` :: unused dependencies — `dayjs`, `react-dropzone`, `nuqs`, `parse-url` 제거; modify
  - `package-lock.json` :: lock graph — npm uninstall 결과 동기화; modify
  - `components/providers.tsx` :: NuqsAdapter already removed in T01 — 사용처 0 확인; read-only
  - `utils/redis.ts` :: native URL parser already used in P02-T01 — parse-url 사용처 0 확인; read-only

#### Details
- **Preconditions**:
  - `rg`에서 `dayjs`, `react-dropzone`, `nuqs`, `parse-url` import가 0인지 확인한다.
  - 사용처가 남아 있으면 package를 먼저 제거하지 않고 해당 reference가 계획된 대체 구현인지 검토한다.
- **Commands**:
  - `npm.cmd uninstall dayjs react-dropzone nuqs parse-url`로 `package.json`, lockfile, root `node_modules`를 함께 동기화한다.
  - 수동 JSON 편집과 별도 lockfile 편집을 섞지 않는다.
- **Retained Dependencies**:
  - Azure Cosmos/Identity/Storage, Microsoft Graph, NextAuth, MSAL, Redis, Redlock, node-forge, Zod.
  - 모든 현재 shadcn primitive가 요구하는 Radix packages.
  - `next-themes`는 `components/ui/sonner.tsx`, `sonner`는 Toaster가 사용하므로 유지한다.
- **Version Constraint**:
  - Next.js 16, React 19, NextAuth 4 major를 이 Task에서 업그레이드하지 않는다.

### I04. 도메인 잔재 및 전체 정적 검사

- Related Files:
  - 전체 활성 앱 소스와 `package*.json` :: Daruda/domain residue scan — 검사 후 잔여 import만 최소 수정; modify if required

#### Details
- **Search Scope**:
  - 포함: `app`, `components`, `config`, `const`, `lib`, `services`, `utils`, `types`, `proxy.ts`, `package.json`, `package-lock.json`, `public` filename.
  - 제외: `.git`, `.memory`의 역사/계획 문서, `.env.development`, `node_modules`, `.next`.
- **Forbidden Terms/Paths**:
  - case-insensitive `daruda`, `다루다`, `translation`, `번역`, `glossary`, `용어집`, `raccoon`.
  - deleted routes/components imports.
- **Known Baseline Resolution**:
  - 기존 `FileUploader`의 declaration-before-use ESLint error는 파일 삭제로 제거돼야 한다.
  - CodeBurn dist에서 발생하던 수천 개 lint 경고는 P01-T01 삭제로 없어야 한다.
  - `components/ui/pagination.tsx`의 unused `itemsPerPage` warning은 P03-T01 실제 계산으로 없어야 한다.

## Acceptance Criteria
- [x] 번역 세 route와 번역/목업 관리자 하위 route가 존재하지 않는다.
- [x] `components/translation`, `components/admin`, `lib/dayjs.ts`, mascot 및 unused starter assets가 제거된다.
- [x] generic `/admin` page, 모든 `components/ui`, `M365.png`, favicon은 유지된다.
- [x] `dayjs`, `react-dropzone`, `nuqs`, `parse-url`가 manifest와 lockfile direct dependency에서 제거된다.
- [x] 활성 소스와 package metadata에서 Daruda/번역/용어집/너구리 문자열이 0이다.
- [x] 전체 lint, typecheck, unit tests가 통과한다.

## Validation
- `@('app/document-translation','app/text-translation','app/translation-history','app/admin/general','app/admin/glossary','app/admin/permissions','components/translation','components/admin','lib/dayjs.ts','public/raccoon.png') | ForEach-Object { if (Test-Path $_) { throw "not removed: $_" } }` — 삭제 대상 없음
- `@('app/admin/page.tsx','components/ui','public/M365.png','app/favicon.ico') | ForEach-Object { if (-not (Test-Path $_)) { throw "required file missing: $_" } }` — 유지 대상 존재
- `rg -n -i "daruda|다루다|translation|번역|glossary|용어집|raccoon" app components config const lib services utils types proxy.ts package.json package-lock.json public` — 결과 없음
- `npm.cmd run lint` — error/warning 0
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run test` — 모든 단위 테스트 통과

## Commit Message
```text
refactor(template): remove Daruda domain code

Plan: 2026-09-21-generic-azure-app-template
Phase: P03-generic-application-shell
Task: T02-remove-daruda-domain-and-dependencies

- delete translation and mock administration features
- remove mascot assets and domain-only packages
- retain reusable UI primitives and Microsoft login assets
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
