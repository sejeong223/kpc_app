# Task: T05 초기 템플릿 문서와 최종 검증

## Status: pending

## Goal

README를 디자인 없는 범용 Azure 앱 템플릿의 실제 사용법과 일치시키고 남은 코드·잠금 파일·품질 게이트를 검증한다.

## Decision Summary

- README는 한국어 중심으로 유지한다. 기존 인증·Azure·운영 설명은 보존하고 제안서 목업·패리티 검증·shadcn 안내만 제거한다. T04에서 중립화한 이름도 문서에 반영한다.
- 새로운 화면 구현이나 미요청 인프라 재설계는 이 Task에 넣지 않는다.

## Implementation

### I01. 현재 템플릿에 맞는 온보딩 문서

- Related Files:
  - `README.md` :: 빠른 시작, 포함 기능, 환경변수, 스크립트, 디렉터리 안내 — 내용 갱신; modify
  - `.env.example` :: T01 표시값과 T04 캐시 네임스페이스, 기존 인증·Azure 키 — 문서 일치 확인; read-only
  - `package.json` :: T02·T03 이후 script·의존성과 T04 패키지명 — 문서 일치 확인; read-only
  - `app/(authenticated)/page.tsx`, `app/(authenticated)/admin/page.tsx`, `app/auth/login/page.tsx` :: 실제 라우트 — 안내 일치 확인; read-only

#### Details

- **Signatures & Types**:
  ```text
  문서 변경만 수행하며 새 함수·타입·API는 추가하지 않는다.
  보존된 공개 경로: /, /admin, /auth/login, /auth/logout,
  /auth/login/popup, /api/auth/[...nextauth], /api/profile-image.
  ```
- **Data & Schema Fields**:
  - 환경변수 표는 `APP_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_DESCRIPTION`, `AUTH_ENABLED`, `EMBEDDED_MODE`, `AUTH_CACHE_NAMESPACE`, NextAuth/Entra/Redis/iframe/Cosmos/Blob 키를 현재 `.env.example`과 일치시킨다. 새 변수는 만들지 않는다.
- **Execution Flow / Logic**:
  1. 제목을 `# Azure App Template`으로 바꾸고 첫 문단과 포함 기능에서 디자인된 대시보드·shadcn/ui 언급을 제거한다. Next.js, 선택형 Entra ID, Graph, Redis, Cosmos, Blob, 테스트 기반을 설명한다.
  2. 기존 빠른 시작(`npm install`, `.env.example -> .env.local`, `AUTH_ENABLED=false`, `npm run dev`)과 Entra/Redis/Managed Identity/프로비저닝/보안 안내를 유지한다.
  3. `제안서 AI 원본 패리티 목업` 장, 원본 저장소 commit·브라우저 스냅샷 안내, `test:proposal-*` 명령을 제거한다.
  4. 기본 화면은 새 기능의 시작 지점이며 별도 디자인 시스템·샘플 업무 화면이 없다고 적는다. `components/ui` 디렉터리 표 행을 제거하고 `components/auth`, `components/layout`, `config`, `lib/auth`, `services`, `scripts`, `tests`의 실제 역할을 반영한다. 품질 게이트 설명에 명시적 `any`를 ESLint 오류로 처리한다고 적는다.
  5. `app/api/profile-image`와 `lib/pagination.ts`는 재사용 가능한 코드로 남지만 기본 화면에서 호출하지 않음을 구분한다. npm 패키지명과 `AUTH_CACHE_NAMESPACE` 기본값 `azure-app-template`은 복제 시 변경 가능한 프로젝트 식별자로 안내한다. 실제 `.env.local`/배포 환경에 예전 프로젝트 전용 네임스페이스가 명시되어 있다면 별도 갱신이 필요하며, 값을 바꾸면 기존 인증 세션의 재로그인이 예상된다고 적는다. README에 예전 식별자의 정확한 문자열은 남기지 않는다.

### I02. 잠금 파일·활성 참조·전체 품질 검증

- Related Files:
  - `package-lock.json` :: `packages[""].dependencies`, `devDependencies` — package.json 일치 확인; read-only
  - `vitest.config.ts` :: Vitest test include — 인증·Azure·페이지네이션 테스트 유지 확인; read-only
  - `eslint.config.mjs` :: `@typescript-eslint/no-explicit-any` 오류 정책 — T04 설정 유지 확인; read-only
  - `config/env.schema.ts`, `config/azure.ts`, `proxy.ts`, `lib/auth/*`, `services/*`, `scripts/provision-cosmos.ts` :: 인프라 기반 보존 확인; read-only
  - `tests/config/*`, `tests/lib/auth/*`, `tests/lib/pagination.test.ts`, `tests/services/*`, `tests/scripts/*`, `tests/app/api/profile-image.test.ts` :: 범용 테스트 보존 확인; read-only

#### Details

- **Signatures & Types**:
  ```text
  변경 대상 공개 심볼 없음. 보존 기준:
  parseServerEnv(process.env): ServerEnv,
  requireRole(requiredRole, callbackUrl): Promise<Session>,
  getCosmosConfig(env): CosmosConfig,
  getBlobConfig(env): BlobConfig,
  getPaginationItems(input): PaginationItem[].
  ```
- **Data & Schema Fields**:
  - `ServerEnv`의 기존 인증·Redis·Azure 필드와 `.env.example` 키는 모두 유지한다. `package-lock.json.packages[""]`는 `package.json` 직접 의존성과 일치해야 한다.
- **Execution Flow / Logic**:
  1. `npm.cmd ci`로 잠금 파일과 설치 가능성을 확인한다. 의존성 설치 실패가 네트워크 문제라면 원인을 기록하고 lockfile 불일치와 구별한다.
  2. 전체 단위 테스트, 타입 검사, ESLint, 인증 비활성 프로덕션 빌드를 실행한다. 빌드 환경에서 `AUTH_ENABLED=false`, `EMBEDDED_MODE=false`를 명시해 Azure 자격 증명 없이 실행 가능한지 검증한다.
  3. 활성 소스·테스트·설정·README에서 `proposals`, `Proposal`, `제안서`, `@/components/ui`, `microsoft.svg`, `tailwindcss`, `test:proposal`, `kpc_app` 참조가 없는지 확인한다. 이력용 `.memory`와 lockfile의 간접 패키지 이름은 검색 범위에 넣지 않는다.
  4. 모든 검증 성공 후에만 Task 상태·phase 진행률·`current.md`를 memory-execute 규칙에 따라 갱신한다. 계획 단계에서는 검증이나 커밋을 실행하지 않는다.

## Acceptance Criteria

- [ ] README의 기능, 명령, 디렉터리 설명이 남은 파일과 일치한다.
- [ ] 직접 의존성과 lockfile이 일치하며 Azure 인증 없이 새 설치·테스트·빌드가 가능하다.
- [ ] 제안서·디자인 참조는 활성 코드·설정·테스트에서 사라지고 과거 `.memory`는 보존된다.
- [ ] README가 `azure-app-template` 기본 식별자와 기존 세션 재인증 영향을 설명한다.

## Validation

- `npm.cmd ci` — package-lock 기반 설치 성공.
- `npm.cmd run test` — 남은 모든 Vitest 테스트 통과.
- `npm.cmd run typecheck` — TypeScript 오류 없음.
- `npm.cmd run lint` — ESLint 오류 없음.
- `$env:AUTH_ENABLED = 'false'; $env:EMBEDDED_MODE = 'false'; npm.cmd run build` — Azure·Redis 없이 Next.js 프로덕션 빌드 성공.
- `rg -n 'proposals|Proposal|제안서|@/components/ui|microsoft\.svg|tailwindcss|test:proposal|kpc_app' app components config lib services tests package.json README.md` — 매치 없음(검색 명령의 종료 코드 1이 기대값).

## Commit Message

```text
docs(template): 디자인 없는 Azure 초기 템플릿 안내 정리

Plan: 2026-10-26-azure-template-design-reset
Phase: P01-template-cleanup
Task: T05-document-and-validate

- README를 실제 남은 기능과 환경 설정에 맞게 갱신
- 전체 테스트·정적 검사·인증 비활성 빌드 검증
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
