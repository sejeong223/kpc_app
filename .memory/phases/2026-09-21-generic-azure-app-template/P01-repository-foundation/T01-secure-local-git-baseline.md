# Task: T01 Secure Local Git Baseline

## Status: done

## Goal
실제 비밀값과 불필요한 CodeBurn 번들을 Git에 넣지 않은 상태로 로컬 `main` 저장소를 초기화하고, 다음 Task가 Daruda 코드를 삭제하기 전에 복구 가능한 원본 애플리케이션 기준점을 만든다.

## Decision Summary
- 원격 저장소 없이 `C:\Users\김세정\kpc_app\.git`에 로컬 Git 이력을 만든다.
- `.env.development`는 삭제하거나 내용을 바꾸지 않고 Git에서 제외한다.
- CodeBurn CLI 전체와 Product API 샘플은 기준점에 포함하지 않지만, Daruda 앱 소스는 이 Task에서 삭제하지 않는다.

## Implementation

### I01. 민감 파일 제외 규칙 강화

- Related Files:
  - `.gitignore` :: env/generated ignore rules — 실제 환경파일과 빌드 결과가 최초 커밋에 포함되지 않도록 보강; modify
  - `.env.development` :: current local secrets — 파일 존재와 ignore 여부만 확인하며 내용·값은 출력하지 않음; read-only

#### Details
- **Required Ignore Rules**:
  - 루트 의존성 및 생성물: `/node_modules`, `/.next/`, `/coverage/`, `/out/`, `/build/`.
  - 모든 실제 환경파일: `.env*`.
  - 공개 템플릿 예외: `!.env.example`.
  - 인증서·개인키: `*.pem`, `*.pfx`, `*.key`.
  - 기존 로그·Vercel·TypeScript 생성물 규칙은 유지한다.
- **Execution Flow / Logic**:
  1. `.env.development`의 값은 읽거나 출력하지 않는다.
  2. `.gitignore`의 기존 `.env*.local` 규칙을 `.env*`와 `!.env.example` 조합으로 교체한다.
  3. `git check-ignore .env.development`가 경로를 반환하는지 확인한 후에만 최초 staging을 허용한다.
  4. `.env.development`가 물리적으로 남아 있는지 별도로 확인한다.
- **Error & Exception Handling**:
  - ignore 검증 실패 시 `git init` 이후라도 `git add` 또는 커밋 단계로 진행하지 않는다.
  - 비밀값을 터미널, Task 문서, `.env.example`에 복사하지 않는다.

### I02. CodeBurn·샘플 콘텐츠 제거

- Related Files:
  - `.codeburn/` :: bundled CLI/runtime — 데스크톱 앱 사용 결정에 따라 전체 제거; delete
  - `.agents/skills/codeburn/` :: CodeBurn agent skill — 전체 제거; delete
  - `CODEBURN-SETUP.md` :: CodeBurn setup document — 제거; delete
  - `PROJECT-MEMORY-README.md` :: 중복 스타터 및 CodeBurn 안내 — 제거; delete
  - `examples/` :: Product API workflow examples — 제거; delete
  - `.agents/skills/grill-me/` :: requirements interview skill — 유지; read-only
  - `.agents/skills/memory-plan/` :: planning skill — 유지; read-only
  - `.agents/skills/memory-execute/` :: execution skill — 유지; read-only
  - `.agents/skills/visualize/` :: visualization skill — 유지; read-only
  - `AGENTS.md` :: project memory workflow — 유지; read-only

#### Details
- **Deletion Boundary**:
  - 삭제 대상은 위 다섯 경로로 한정한다.
  - `app/`, `components/`, `services/`, `utils/`, `public/`의 Daruda 앱 파일은 원본 스냅샷을 위해 그대로 둔다.
- **Execution Flow / Logic**:
  1. 각 삭제 대상의 절대 경로를 `Resolve-Path`로 구한 뒤 모두 `C:\Users\김세정\kpc_app` 아래인지 검사한다.
  2. `.codeburn`과 `examples`처럼 재귀 삭제하는 경로는 검증된 `-LiteralPath`만 `Remove-Item -Recurse -Force`에 전달한다.
  3. 유지 대상 네 스킬과 `AGENTS.md`가 여전히 존재하는지 확인한다.
- **Error & Exception Handling**:
  - 하나라도 워크스페이스 밖으로 해석되면 삭제를 중단한다.
  - glob 또는 계산된 미검증 경로로 재귀 삭제하지 않는다.

### I03. 로컬 Git 저장소 초기화

- Related Files:
  - `.git/` :: local repository metadata — `main` 브랜치로 신규 생성; new
  - 전체 워크스페이스(ignored files 제외) :: initial snapshot candidates — 최초 Task 커밋에서 추적; read-only until commit

#### Details
- **Commands & Preconditions**:
  - `git --version`이 성공하고 글로벌 `user.name`, `user.email`이 설정되어 있음을 재확인한다.
  - 저장소가 아직 없을 때만 `git init -b main`을 실행한다. 이미 초기화됐다면 현재 브랜치와 커밋 유무를 검사하고 기존 이력을 덮어쓰지 않는다.
- **Execution Flow / Logic**:
  1. I01과 I02가 모두 검증된 후 저장소를 초기화한다.
  2. `git status --short --untracked-files=all`에서 `.env.development`, `.next`, `node_modules`가 나타나지 않는지 확인한다.
  3. `app/document-translation/page.tsx`, `services/AuthService.ts`, 현재 결정·계획 문서가 snapshot 후보로 나타나는지 확인한다.
  4. Task 검증 통과 후 Memory Execute의 표준 커밋 단계에서 아래 Commit Message로 최초 커밋한다.
- **State Transition & Return**:
  - Task 종료 시 로컬 Git 저장소가 존재하고 Daruda 원본 앱은 첫 커밋으로 복구 가능해야 한다.

## Acceptance Criteria
- [x] `.env.development`는 디스크에 남아 있고 `git check-ignore` 결과에 포함된다.
- [x] `.codeburn`, `.agents/skills/codeburn`, `CODEBURN-SETUP.md`, `PROJECT-MEMORY-README.md`, `examples`가 제거된다.
- [x] `grill-me`, `memory-plan`, `memory-execute`, `visualize`, `AGENTS.md`는 유지된다.
- [x] 로컬 Git 저장소의 기본 브랜치가 `main`이며 기존 Daruda 앱 소스가 최초 snapshot 후보에 포함된다.
- [x] `.env.development`, `.next`, `node_modules`는 Git status에 나타나지 않는다.
- [x] TypeScript 기준선 검사가 통과한다. 기존 번역 컴포넌트 ESLint 오류는 P03-T02 삭제 전까지 알려진 기준선으로 기록한다.

## Validation
- `git rev-parse --is-inside-work-tree` — `true` 출력
- `git branch --show-current` — `main` 출력
- `git check-ignore .env.development` — `.env.development` 출력
- `if (-not (Test-Path '.env.development')) { throw 'local env was removed' }` — 오류 없이 종료
- `@('.codeburn','.agents/skills/codeburn','CODEBURN-SETUP.md','PROJECT-MEMORY-README.md','examples') | ForEach-Object { if (Test-Path $_) { throw "not removed: $_" } }` — 오류 없이 종료
- `@('.agents/skills/grill-me','.agents/skills/memory-plan','.agents/skills/memory-execute','.agents/skills/visualize','AGENTS.md') | ForEach-Object { if (-not (Test-Path $_)) { throw "missing: $_" } }` — 오류 없이 종료
- `npx.cmd tsc --noEmit` — exit code 0

## Commit Message
```text
chore(repo): create secure local baseline

Plan: 2026-09-21-generic-azure-app-template
Phase: P01-repository-foundation
Task: T01-secure-local-git-baseline

- exclude local secrets from version control
- remove CodeBurn and starter sample artifacts before snapshot
- initialize the local main branch with the original app source
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
