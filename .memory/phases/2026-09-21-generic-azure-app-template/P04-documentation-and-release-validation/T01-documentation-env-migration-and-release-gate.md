# Task: T01 Documentation Env Migration And Release Gate

## Status: pending

## Goal
범용 템플릿의 설치·인증·Azure 사용법을 한국어 README로 제공하고, 기존 secret 파일을 변경하거나 노출하지 않은 채 현재 로컬 개발에서 인증·팝업 모드를 활성화한 다음 전체 lint·typecheck·test·build 품질 게이트를 통과시킨다.

## Decision Summary
- `.env.development`의 기존 secret 값은 그대로 보존하며 Git에 추가하지 않는다.
- 공개 `.env.example`은 모든 새 키와 안전한 기본값을 설명한다.
- 현재 머신의 “인증 및 임베디드 모드 활성” 값은 ignored `.env.development.local` override에 두어 secret migration을 피한다.

## Implementation

### I01. 로컬 환경 override와 공개 환경 계약 마무리

- Related Files:
  - `.env.development` :: existing local secrets — 내용/값을 출력하거나 수정하지 않음; read-only
  - `.env.development.local` :: current-machine non-secret overrides — 신규 생성, Git ignored; new
  - `.env.example` :: public environment reference — 설명·그룹·기본값 정리; modify
  - `.gitignore` :: env policy — `.env*` + `!.env.example` 최종 확인; modify only if missing

#### Details
- **Local Override Fields**:
  ```dotenv
  AUTH_ENABLED=true
  EMBEDDED_MODE=true
  APP_ENV=development
  AUTH_CACHE_NAMESPACE=kpc_app
  AZURE_USE_MANAGED_IDENTITY=false
  NEXT_PUBLIC_APP_NAME=KPC App
  NEXT_PUBLIC_APP_DESCRIPTION=사내 업무 애플리케이션
  ```
  - 위 값은 secret이 아니며 현재 개발 환경에서 popup 로그인을 활성화하기 위한 local-only 설정이다.
  - 기존 `.env.development`의 `MSAL_*`, `NEXTAUTH_*`, Cosmos/Blob 값은 읽어 출력하거나 새 파일로 복사하지 않는다.
- **Public `.env.example` Sections**:
  1. App: `APP_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_DESCRIPTION`.
  2. Auth feature flags: `AUTH_ENABLED=false`, `EMBEDDED_MODE=false`, `AUTH_CACHE_NAMESPACE=kpc_app`.
  3. NextAuth/Entra: URL, secret, tenant/client, certificate PFX/password 또는 client secret. 값은 비운다.
  4. Redis: URL, cluster mode; production auth에서 필수임을 주석으로 설명한다.
  5. Embedded CSP: comma-separated `IFRAME_ALLOWED_DOMAINS`.
  6. Azure data: managed identity flag, Cosmos endpoint/name/key, Blob account name/key.
  - `MSAL_CERT_PFX`, `NEXTAUTH_SECRET`, Redis/Azure keys에 실제 또는 예시처럼 보이는 유효 credential을 넣지 않는다.
- **Safety Verification**:
  - Task 시작과 끝의 `.env.development` SHA-256을 비교해 동일함을 확인하되 hash 자체 외 파일 내용을 출력하지 않는다.
  - `.env.development.local`과 `.env.development` 모두 `git check-ignore` 결과에 포함돼야 한다.
  - `git ls-files`에는 `.env.example`만 나타나야 한다.

### I02. 한국어 README 재작성

- Related Files:
  - `README.md` :: template onboarding and operations guide — create-next-app 기본 문서를 한국어 템플릿 문서로 교체; modify

#### Details
- **Required Sections**:
  1. 프로젝트 소개: Daruda가 아닌 `KPC App` 범용 Azure 사내 앱 템플릿임을 설명.
  2. 포함 기능: 선택형 Entra/NextAuth, App Roles, popup/iframe, Redis cache, Graph profile, Cosmos/Blob factories, shadcn UI, Vitest.
  3. 요구사항: 지원 Node/npm 버전은 설치된 Next.js 16과 package engine 기준으로 표기; Windows PowerShell/Git Bash 명령 차이.
  4. 빠른 시작(인증 off): 의존성 설치, `.env.example` 복사, `AUTH_ENABLED=false`, `npm run dev`.
  5. Entra ID 설정: redirect URI, App Roles `User`/`Admin`, Graph application permission/admin consent, certificate 또는 secret 중 하나.
  6. 환경변수 표: 필수 조건, secret 여부, development/production 차이. 실제 값 없음.
  7. popup/iframe: `EMBEDDED_MODE`, cross-site cookie, CSP allowlist, browser popup 허용 요구.
  8. Redis: development memory fallback은 process 재시작 시 소실되며 production auth에서는 Redis 필수.
  9. Azure data services: Managed Identity 우선, local key fallback, runtime은 리소스를 생성하지 않음.
  10. Cosmos provisioning: `npm run azure:cosmos:provision -- --container <id> --partition-key </path>` 예제와 required RBAC.
  11. scripts: dev/build/start/lint/typecheck/test/test:watch/provision.
  12. 주요 디렉터리: `app`, `components/ui`, `config`, `lib/auth`, `services`, `scripts`, `tests`, `.memory`.
  13. 보안 주의: `.env*` commit 금지, role server check, same-origin popup message.
  14. 프로젝트 메모리 워크플로: `/grill-me` → `/memory-plan` → `/memory-execute`의 용도만 간단히 안내.
- **Command Presentation**:
  - Git Bash/macOS/Linux 예시는 `npm ...`.
  - PowerShell 실행 정책이 `npm.ps1`을 막는 경우 `npm.cmd ...`, `npx.cmd ...`를 사용한다고 troubleshooting에 명시한다.
- **Forbidden Content**:
  - 번역/용어집/Daruda 기능 설명, CodeBurn CLI 설치, Product API 샘플 링크, 실제 tenant/client/endpoint/secret.

### I03. 활성 소스·Git·dependency 릴리스 감사

- Related Files:
  - 전체 tracked source/config/docs :: final residue and secret audit — 발견된 계획 범위 내 결함만 최소 수정; modify if required
  - `package.json`, `package-lock.json` :: dependency consistency — final npm graph 확인; modify only through npm if required

#### Details
- **Residue Audit**:
  - 활성 코드, public asset 이름, package metadata, README에서 case-insensitive `daruda`, `다루다`, `translation`, `번역`, `glossary`, `용어집`, `raccoon`, `CodeBurn`, `.codeburn` 결과가 없어야 한다.
  - `.memory/decisions`, `.memory/plans`, `.memory/phases`는 역사적 근거이므로 residue scan에서 제외한다.
  - `.agents/skills/codeburn`, `.codeburn`, starter `examples`, `CODEBURN-SETUP.md`, `PROJECT-MEMORY-README.md`가 없어야 한다.
- **Secret Audit**:
  - `git ls-files` 결과에 `.env.development`, `.env.development.local`, `*.pfx`, `*.pem`, `*.key`가 없어야 한다.
  - `.env.example`에 빈 값 또는 설명용 non-secret default만 있는지 key 단위로 검사한다.
  - 테스트 fixture의 가짜 secret 문자열도 실제 credential 형태를 모방하지 않는다.
- **Dependency Audit**:
  - `npm.cmd ls --depth=0`가 missing/invalid package 없이 종료한다.
  - 직접 import되는 `@azure/msal-node`, `@azure/core-auth`, `server-only`, `zod`가 direct dependency다.
  - 제거 대상 `dayjs`, `react-dropzone`, `nuqs`, `parse-url`이 direct dependency가 아니다.
  - Next/React/NextAuth major는 결정한 기존 버전으로 유지된다.

### I04. 전체 품질 게이트와 인증 비활성 빌드

- Related Files:
  - 전체 구현 및 테스트 :: final validation — 검증 실패 원인이 계획 범위 안일 때만 수정; modify if required

#### Details
- **Validation Order**:
  1. `npm.cmd run lint` — error/warning 0.
  2. `npm.cmd run typecheck` — TypeScript error 0.
  3. `npm.cmd run test` — 모든 Vitest test 통과, 외부 Azure/Redis 연결 0.
  4. 현재 PowerShell process에서 `$env:AUTH_ENABLED='false'`, `$env:EMBEDDED_MODE='false'`를 설정하고 `npm.cmd run build` 실행.
  5. build 후 두 process env override를 제거한다.
  6. build output에 Azure credential/Redis 연결 시도나 secret value가 나타나지 않는지 확인한다.
- **Failure Handling**:
  - Google font/network, Windows execution policy, missing external service처럼 코드 밖 원인은 원문과 재현 command를 기록한다.
  - lint/type/test 실패는 disable하거나 무시하지 말고 원인 파일을 수정한다.
  - build를 통과시키기 위해 인증 기본값을 true로 바꾸거나 dummy secret을 넣지 않는다.
- **Final State**:
  - 이 Task의 표준 commit 이후 `git status --short`가 clean이어야 한다. ignored local env와 `.next`는 status에 나타나지 않는다.

## Acceptance Criteria
- [ ] `.env.development` 내용은 변경되지 않고 `.env.development.local`이 현재 개발용 auth/embedded non-secret override를 제공한다.
- [ ] 실제 env 두 파일은 ignored이고 `.env.example`만 추적 가능하다.
- [ ] README가 한국어로 빠른 시작, Entra/Redis/Azure/iframe, scripts, 보안 및 메모리 워크플로를 설명한다.
- [ ] 활성 코드·자산·manifest·README에서 Daruda/번역/CodeBurn 잔재가 없다.
- [ ] Git tracked files에 secret 환경파일이나 인증서/키가 없다.
- [ ] npm dependency tree, lint, typecheck, unit tests, auth-disabled production build가 모두 통과한다.

## Validation
- `git check-ignore .env.development .env.development.local` — 두 local env 경로 출력
- `git ls-files .env.development .env.development.local '*.pfx' '*.pem' '*.key'` — 결과 없음
- `git ls-files .env.example` — `.env.example` 출력
- `@('.codeburn','.agents/skills/codeburn','CODEBURN-SETUP.md','PROJECT-MEMORY-README.md','examples') | ForEach-Object { if (Test-Path $_) { throw "legacy tooling remains: $_" } }` — 오류 없이 종료
- `rg -n -i "daruda|다루다|translation|번역|glossary|용어집|raccoon|codeburn|\.codeburn" app components config const lib services utils types scripts tests public proxy.ts package.json package-lock.json README.md` — 결과 없음
- `npm.cmd ls --depth=0` — missing/invalid dependency 없음
- `npm.cmd run lint` — error/warning 0
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run test` — 모든 test 통과
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — 외부 서비스 없이 production build 성공

## Commit Message
```text
docs(template): finalize onboarding and release checks

Plan: 2026-09-21-generic-azure-app-template
Phase: P04-documentation-and-release-validation
Task: T01-documentation-env-migration-and-release-gate

- document Korean setup for optional auth and Azure integrations
- activate local popup auth without exposing existing secrets
- pass lint, typecheck, unit tests, dependency audit, and production build
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
