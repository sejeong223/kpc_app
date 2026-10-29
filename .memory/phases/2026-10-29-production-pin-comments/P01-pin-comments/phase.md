# Phase: P01 제작 핀 코멘트

- Date: 2026-10-29
- Status: in_progress
- Plan: [제작 화면 핀 코멘트](../../../plans/2026-10-29-production-pin-comments.md)
- Decisions: [확정 설계](../../../decisions/2026-10-29-production-pin-comments.md)

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | done | 데이터 타입·본문·멘션·권한·상태 전이 | [T01](./T01-comment-domain.md) |
| T02 | done | IndexedDB 저장소와 초기화·원자성 검증 | [T02](./T02-indexeddb-repository.md) |
| T03 | in_progress | 초안·비동기 controller/Provider와 전체 헤더 정리 | [T03](./T03-comment-state-and-shell.md) |
| T04 | pending | 제작 핀·팝업·멘션·크기 조절 및 실제 브라우저 검증 | [T04](./T04-pin-comment-ui.md) |

## Progress

- done: 2/4 (active: T03)
- T01·T02 도메인·멘션·저장소 45개 테스트와 타입·ESLint 검증 통과.
- 순서: T01 → T02 → T03 → T04.

## Completion criteria

저장된 코멘트·좌표·상태가 재접속 후 복원되고, 초안은 새로고침하면 사라진다. 회색 완료 핀의 열람·재개, 본인 내용 관리 및 타인 핀 상태 조작, 팝업 최대 크기/라벨 전환, 모바일 탐색과 기존 토큰 모달 포커스를 확인한다.

## Scope note

프로필 댓글 개수·알림의 새 DB 연동은 사용자가 계획 중 별도 후속으로 유지하기로 했다. 별도 Task로 추가하지 않는다.
