# Decisions: Azure 템플릿 디자인 초기화

- Date: 2026-10-26
- Source: 사용자의 `/memory-plan` 요청, 템플릿 식별자·ESLint 범위 후속 결정 및 현재 저장소 조사
- Status: 이번 계획의 범위 결정

## D01. 최종 산출물

- **Chosen**: 현재 제안서 AI 목업과 시각 디자인을 제거하고, Next.js 앱 라우터·인증·Azure 서비스가 동작하는 최소 프로젝트 템플릿을 남긴다.
- **Rationale**: 최종 화면이 크게 바뀌었으므로 현재 화면을 새 디자인의 출발점으로 삼지 않는다.

## D02. 화면의 최소 경계

- **Chosen**: `/`, `/admin`, `/auth/login`, `/auth/logout`, `/auth/login/popup`의 기능적 라우트와 접근 제어는 유지한다. 화면은 시맨틱 HTML과 브라우저 기본 표시만 사용하며 앱 고유 색상, 레이아웃 셸, 로고, 아이콘, 테마, 토스트, shadcn/ui를 제거한다.
- **Rationale**: 인증을 켠 배포에서도 로그인·로그아웃·관리자 권한 확인이 실제로 가능해야 한다.

## D03. 재사용할 기반

- **Chosen**: 환경 검증, Entra ID/NextAuth, 역할 검사, 팝업·iframe 보안, Redis 캐시, Graph 및 프로필 이미지 API, Cosmos DB·Blob Storage 클라이언트, 프로비저닝 CLI, 범용 페이지네이션 함수와 관련 단위 테스트를 보존한다.
- **Rationale**: 이 코드는 화면 디자인과 독립적인 범용 프로젝트 기반이다.

## D04. 제거할 범위

- **Chosen**: `/proposals` 라우트, 제안서 컴포넌트·타입·fixture·상태·테스트, 원본 패리티 스냅샷과 Playwright 설정, 모든 `components/ui` 컴포넌트 및 전용 디자인 의존성을 제거한다. 관련 공개 자산 예외와 NextAuth 로고 스타일도 정리한다.
- **Rationale**: 파일만 지우고 import, 테스트, 의존성, 보안 예외를 남기면 초기 템플릿이 빌드되지 않거나 불필요한 동작을 갖게 된다.

## D05. 템플릿 명칭과 이력

- **Chosen**: 표시용 기본 앱 이름과 `.env.example` 설명을 중립적으로 바꾸고 npm 패키지명과 `AUTH_CACHE_NAMESPACE`의 기본값을 모두 `azure-app-template`로 통일한다. 완료된 과거 `.memory` 문서는 이력으로 보존하고 `current.md`만 새 계획으로 전환한다.
- **Rationale**: 사용자가 기존 `kpc_app` 식별자도 범용 템플릿 범위에 포함하도록 요청했다. 캐시 네임스페이스 변경은 기존 세션 키와 쿠키 이름을 바꾸므로 기존 로그인 세션 재인증이 예상된다.

## D06. 타입 안전성 기본값

- **Chosen**: `eslint.config.mjs`의 전역 `@typescript-eslint/no-explicit-any: off` 설정을 없애고 TypeScript 소스에 이 규칙을 `error`로 적용한다.
- **Rationale**: 템플릿의 품질 게이트에서 명시적 `any`를 새로 허용하지 않는다. 현재 명시적 `any`는 삭제 대상인 제안서 소스에만 있으므로 도메인 제거 후 적용한다.

## Previous decision relationship

- 이 결정은 [2026-09-21-generic-azure-app-template.md](./2026-09-21-generic-azure-app-template.md)의 D03, D19, D20(대시보드 셸·shadcn/ui·중립 테마)을 사용자의 새 요청 범위에서 대체한다.
- 같은 문서의 인증·Azure·환경·보안·테스트 결정은 유지한다.
