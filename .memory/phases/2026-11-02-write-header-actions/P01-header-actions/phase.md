# Phase: P01 제작 헤더 버튼과 핀 배치

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 공통 버튼 4개를 34px로 표시하고 핀 생성은 헤더 아래로 이동 | [T01](./T01-write-header-actions.md) |

## Progress

- done: 1/1 (active: 없음)
- 2026-11-02 `/mea` 구현 완료. typecheck/lint/build 및 정적 diff 검토 통과. 남은 Task 없음.
- 생산 코드 변경 대상: `components/comments/CommentsWorkspace.tsx` 한 파일.
- 네 업무 버튼은 UI만 구현한다. 기존 핀 생성 동작은 유지한다.
- `tests/` 생성·복원 및 브라우저 검증 금지. 타입 검사·lint·build·정적 diff 검토를 사용한다.
