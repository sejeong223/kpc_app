# Plan: Azure 템플릿 디자인 초기화

## Goal

현재의 KPC 제안서 화면과 모든 시각 디자인 자산·라이브러리를 제거하고 패키지·인증 캐시 식별자와 ESLint 정책을 범용 템플릿에 맞춘다. 완료 시 인증을 끄고 Azure 자격 증명 없이 `/`를 빌드·실행할 수 있고, 인증을 켠 배포에서는 로그인·로그아웃·Admin 접근 제어와 Azure 공통 서비스가 유지된다. 활성 소스·테스트·패키지에 제안서 목업, 디자인 의존성, `kpc_app` 식별자, 전역 `no-explicit-any` 비활성화가 없어야 한다.

## Source Decisions

- [이번 범위 결정](../decisions/2026-10-26-azure-template-design-reset.md)
- [기존 Azure 템플릿 기반 결정](../decisions/2026-09-21-generic-azure-app-template.md) 중 인증·인프라·검증 항목

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` ✅ | 제안서·디자인 제거, 템플릿 식별자·ESLint 정리, 전체 검증 | [P01](../phases/2026-10-26-azure-template-design-reset/P01-template-cleanup/phase.md) |

## Boundaries

- 유지: Next.js/React, `app/api/auth`, `app/api/profile-image`, `config/env*`, `config/azure.ts`, `proxy.ts`, `lib/auth`, `services`, `utils`의 인증·Azure 보조 함수, `scripts/provision-cosmos.ts`, `lib/pagination.ts` 및 해당 테스트.
- 제거: 제안서 도메인 전체, 앱 고유 셸·디자인, UI primitive, 시각 회귀 테스트와 스냅샷, 사용하지 않는 프런트엔드 의존성.
- 과거 `.memory/plans`, `.memory/phases`, `.memory/decisions`는 수행 이력으로 보존한다. 새 계획 실행 포인터만 갱신한다.

## Completion Criteria

- `AUTH_ENABLED=false`, `EMBEDDED_MODE=false`에서 `/` 프로덕션 빌드가 Azure·Redis 없이 성공한다.
- `/proposals` 라우트와 관련 도메인 파일, 시각 스냅샷·Playwright 스크립트가 없다.
- 로그인·로그아웃·팝업·관리자 예시가 기본 HTML로 동작하며 `Admin` 서버 역할 검사는 유지된다.
- Tailwind, shadcn, Radix, 아이콘·토스트·테마 패키지와 전용 CSS/자산이 제거되고 잠금 파일이 일치한다.
- npm 패키지명과 캐시 기본 네임스페이스는 `azure-app-template`이며 관련 쿠키·Redis 키 테스트가 새 값으로 통과한다.
- TypeScript 파일의 명시적 `any`는 ESLint 오류가 되고 활성 코드에 해당 위반이 없다.
- `npm.cmd run test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`가 통과한다.
