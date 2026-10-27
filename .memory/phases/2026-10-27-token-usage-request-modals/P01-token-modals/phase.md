# Phase: P01 사용량 분석·토큰 신청 모달

## Goal

고정 사용량을 분석 화면에 표시하고, 추가 신청을 검증해 로컬 승인 대기로 등록하는 흐름을 공용 Fluent UI 모달로 제공한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 사용량 데이터·신청 모델·Provider·단위 검증 | [T01](./T01-token-preview-model.md) |
| T02 | `done ✅` | 공용 모달·두 화면·프로필 연결·키보드/모바일 검증 | [T02](./T02-token-modal-ui.md) |

## Progress

- done: 2/2 (active: 없음)
- 선행 조건: 완료된 프로필 팝오버 기능. T02는 T01의 타입·Provider API를 사용한다.
- T01 82f2428, T02는 이 완료 기록과 같은 커밋. 구현·검증 완료, 남은 Task 없음.
- typecheck/lint/build/전체304개 테스트 및 독립 Chrome의 데스크톱·모바일·키보드 동작 검증 완료.

## References

- [Plan](../../../plans/2026-10-27-token-usage-request-modals.md)
- [Decision](../../../decisions/2026-10-27-token-usage-request-modals.md)
