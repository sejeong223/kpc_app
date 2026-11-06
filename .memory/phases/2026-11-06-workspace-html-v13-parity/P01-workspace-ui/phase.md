# Phase: P01 공통 헤더·제작 UI 적용

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 공통 헤더·프로젝트 선택·호출부 적용 | [T01](./T01-shared-header.md) |
| T02 | `done` | 제작 3열 패널·슬라이드 목록·출처 적용 | [T02](./T02-production-panels.md) |
| T03 | `done` | 중앙 편집·코멘트 위치·다중 선택 통합 | [T03](./T03-production-editor.md) |

## Progress

- done: 3/3 (active: 없음)

## Constraints

- UI와 조작을 HTML v13에 맞추고 현재 프로젝트 데이터는 유지한다.
- 각 Task 완료 시 검증 결과와 지정 파일만 커밋하고, 이 표·Plan·로컬 current를 순차 갱신한다.
- `.memory/current.md`는 ignore를 유지하며 강제 stage하지 않는다.
- `tests/` 생성·복원 및 브라우저 검증 제외. 미실시 시각 검증을 통과로 기록하지 않는다.
- 기존 HTML 정비 계획과 외부 HTML은 수정하지 않는다.
