# Phase: P01 사용량 분석·토큰 신청 모달

## Goal

고정 사용량을 분석 화면에 표시하고, 추가 신청을 검증해 로컬 승인 대기로 등록하는 흐름을 공용 Fluent UI 모달로 제공한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 사용량 데이터·신청 모델·Provider·단위 검증 | [T01](./T01-token-preview-model.md) |
| T02 | `in_progress 🔵` | 공용 모달·두 화면·프로필 연결·키보드/모바일 검증 | [T02](./T02-token-modal-ui.md) |

## Progress

- done: 1/2 (active: T02)
- 선행 조건: 완료된 프로필 팝오버 기능. T02는 T01의 타입·Provider API를 사용한다.
- T01 구현 및 typecheck/lint/대상96개 테스트 통과. T02 화면 구현 진행.

## References

- [Plan](../../../plans/2026-10-27-token-usage-request-modals.md)
- [Decision](../../../decisions/2026-10-27-token-usage-request-modals.md)
