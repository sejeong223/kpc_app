# Phase: P01 common 버튼과 사용 계약

- Date: 2026-11-02
- Status: done
- Plan: [dadam 범용 공통 버튼](../../../plans/2026-11-02-common-button.md)
- Decision: [공통 버튼 결정](../../../decisions/2026-11-02-common-button.md)

## Goal

기존 dadam 룩앤필을 그대로 참조하는 공통 버튼을 `components/common/`에 제공하고, 크기·배치·색상의 클래스 조절 및 표준 버튼 동작을 검증한다. 기존 화면 교체·기존 ui 컴포넌트 이동은 하지 않는다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | common 진입점·dadam 버튼·상태 스타일·DOM 검증 | [T01](./T01-common-button-core.md) |
| T02 | `done` | 사용 예시·개발 가이드·CSS 생성과 호환성 검증 | [T02](./T02-examples-and-validation.md) |

## Dependencies and Validation

- T01 검증/커밋 완료 후 T02를 실행한다. 병렬 에이전트 작업은 요청되지 않았다.
- 브라우저/E2E/스크린샷·dev server는 제외한다. 필요한 DOM 검사는 로컬 `tests/`에서 실행하고 Git에는 넣지 않는다.
- typecheck/lint/build 및 CSS 생성/레이어 정적 검토 결과와 실제로 미실시한 브라우저 검증을 구분한다.
- `.memory/current.md`는 로컬 전용으로 다음 Task를 가리키며 커밋하지 않는다.
- Task마다 한국어 메시지와 Plan/Phase/Task footer를 사용한다. phase 상태만으로 구현 완료를 주장하지 않는다.

## Progress

- done: 2/2 (active: 없음)
- T01/T02 구현·검증 완료. 로컬 DOM/스타일31개, typecheck/lint/build 통과. [실행 보고서](../../../reports/2026-11-02-common-button.md).
