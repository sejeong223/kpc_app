# Plan: 범용 Azure 사내 앱 템플릿

## Goal
Daruda 번역 도메인과 목업 UI를 제거하고, 인증을 끈 상태에서도 로컬 실행이 가능하면서 필요 시 Entra ID·Microsoft Graph·Redis·Cosmos DB·Blob Storage를 안전하게 활성화할 수 있는 재사용 가능한 Next.js 사내 앱 템플릿을 만든다. 완료 기준은 민감정보가 Git에서 제외되고, CodeBurn 및 번역 잔재가 없으며, 단위 테스트·타입 검사·ESLint·인증 비활성 프로덕션 빌드가 모두 통과하는 것이다.

## Source Decision
- [2026-09-21-generic-azure-app-template.md](../decisions/2026-09-21-generic-azure-app-template.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` ✅ | 민감정보를 제외한 로컬 Git 기준점을 만들고 환경설정·테스트 기반을 구축 | [P01](../phases/2026-09-21-generic-azure-app-template/P01-repository-foundation/phase.md) |
| P02 | `done` ✅ | 선택형 Entra 인증, 역할 검사, 팝업 로그인 보안과 Azure 공통 클라이언트를 일반화 | [P02](../phases/2026-09-21-generic-azure-app-template/P02-identity-and-cloud-services/phase.md) |
| P03 | `done` ✅ | 설정 기반 중립 대시보드 셸로 교체하고 Daruda 도메인 코드·의존성을 제거 | [P03](../phases/2026-09-21-generic-azure-app-template/P03-generic-application-shell/phase.md) |
| P04 | `done` ✅ | 한국어 온보딩 문서와 로컬 환경 마이그레이션을 완료하고 전체 품질 게이트 검증 | [P04](../phases/2026-09-21-generic-azure-app-template/P04-documentation-and-release-validation/phase.md) |

## Completion Criteria
- 실제 `.env.development`는 로컬에 남아 있으나 Git에서 추적되지 않고, 공개 가능한 `.env.example`만 버전 관리된다.
- `AUTH_ENABLED=false`와 `EMBEDDED_MODE=false`에서는 Azure·Redis 자격 증명 없이 대시보드가 빌드되고 실행된다.
- `AUTH_ENABLED=true`에서는 인증서 또는 클라이언트 시크릿 중 정확히 하나를 사용하며 운영 환경의 Redis 누락을 시작 단계에서 거부한다.
- `Admin` 역할이 없는 사용자의 관리자 접근은 무한 리다이렉트 없이 계정 전환 가능한 로그인 화면으로 이동한다.
- Cosmos DB·Blob Storage 클라이언트는 Managed Identity 우선, 로컬 키 대체 방식이며 런타임에 리소스를 암묵적으로 생성하지 않는다.
- 활성 코드와 패키지에서 Daruda·번역·CodeBurn 잔재가 제거된다.
- `npm.cmd run test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`가 모두 성공한다.
