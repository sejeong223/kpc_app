# Plan: Login UI Restore

## Goal
`610711a` 커밋의 인디고 아이콘·영문 문구·Microsoft outline button 구성을 메인 로그인 화면에 복원하되, 현재의 callback·popup·권한 검증 동작과 의존성 정리 상태를 유지한다.

## Source Decision
- [2026-09-21-login-ui-restore.md](../decisions/2026-09-21-login-ui-restore.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 기존 로그인 표현을 복원하고 현재 인증 보안 경계를 회귀 검증 | [P01](../phases/2026-09-21-login-ui-restore/P01-login-ui-restore/phase.md) |

## Completion Criteria
- 일반 로그인 화면에 기존 `Languages` 아이콘, 영문 안내, Microsoft 로고 button이 표시된다.
- 권한 부족·popup 차단 안내는 현재 한국어 문구와 동작을 유지한다.
- callback sanitization과 popup origin/source 검증 테스트가 통과한다.
- `nuqs`, `useQueryState`, 구 popup message 처리를 다시 도입하지 않는다.
- lint, typecheck, 관련 단위 테스트, 인증 비활성 빌드가 통과한다.
