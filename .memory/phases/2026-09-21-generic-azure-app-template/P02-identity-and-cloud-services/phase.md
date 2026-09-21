# Phase: P02 Identity And Cloud Services

## Goal
Daruda에 결합된 인증·캐시·Azure 서비스 계층을 기능별로 선택 가능한 범용 서버 모듈로 바꾸고 보안 경계를 테스트로 고정한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` ✅ | 인증서·시크릿 자격 증명 팩토리와 메모리/Redis MSAL 캐시 구현 | [T01](./T01-entra-credentials-and-session-cache.md) |
| T02 | `in_progress` 🔵 | 선택형 AuthService, Entra App Roles, 서버 접근 가드 구현 | [T02](./T02-optional-auth-service-and-rbac.md) |
| T03 | `pending` | 인증 API·프록시·로그인 화면·팝업 메시지 보안 일반화 | [T03](./T03-auth-routes-proxy-and-popup-security.md) |
| T04 | `pending` | Managed Identity 우선 Cosmos DB·Blob Storage 클라이언트와 명시적 프로비저닝 구현 | [T04](./T04-generic-azure-data-clients.md) |

## Progress
- done: 1/4 (active: T02)
