# Phase: P01 슬라이드 핀 연결 및 중앙 배치

- Plan: [제작 화면 슬라이드 핀 및 중앙 편집 레이아웃](../../../plans/2026-11-05-production-slide-pin-layout.md)
- Status: in_progress
- Decisions: [확정 결정](../../../decisions/2026-11-05-production-slide-pin-layout.md)

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 슬라이드에 연결된 핀 저장·생성·표시와 기존 자료 보존 | [T01](./T01-slide-bound-comments.md) |
| T02 | `in_progress` | 편집 높이 축소와 중앙 외곽 카드·제목 정리 | [T02](./T02-compact-editor-layout.md) |

## Progress

- done: 1/2 (active: T02)
- 실행 순서: T01 → T02. 병렬 구현하지 않는다.
- T01 완료 시 current.md를 T02로 전진한다. T02 완료 시 Active Task를 없음으로 설정하고 이 Phase와 Plan을 done으로 갱신한다.
- 각 Task의 구현·검증 완료 후 한국어 커밋을 남긴다. current.md는 강제 stage하지 않는다.

## 공통 검증 제약

- tests/ 디렉토리 생성·복원 금지.
- 브라우저/CUA/E2E/dev server/스크린샷 검증 금지.
- 타입/lint/build/정적 검토와 디렉토리를 만들지 않는 stdin 검증 사용.
- 기존 의견 자료, 헤더 본체, 현재 권한과 미저장 입력 보호 유지.
