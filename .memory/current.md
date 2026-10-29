# Current Context

## Active Plan

[제작 화면 핀 코멘트](./plans/2026-10-29-production-pin-comments.md)

## Active Phase

[P01 제작 핀 코멘트](./phases/2026-10-29-production-pin-comments/P01-pin-comments/phase.md)

## Active Task

[T03 코멘트 상태 연결과 공용 헤더 정리](./phases/2026-10-29-production-pin-comments/P01-pin-comments/T03-comment-state-and-shell.md)

## Status

- P01: done2/4. T01·T02 완료, T03 실행 준비.
- MEA 자동 실행 중. T01 cae7075: 모델·멘션·권한 규칙. T02: IndexedDB 저장소 및 초기화·트랜잭션·복원. 합계 45개 테스트·타입·ESLint 검증 완료.
- 결정: [2026-10-29 제작 핀 코멘트](./decisions/2026-10-29-production-pin-comments.md).
- 순서: T01 도메인·멘션 → T02 IndexedDB → T03 controller·Provider·전체 헤더 정리 → T04 핀·코멘트 UI 및 브라우저 검증.
- 공용 헤더는 모든 메뉴에서 제거한다. 모바일 메뉴 열기 버튼은 독립 배치하고 workspace-sidebar-trigger ID 및 기존 토큰 모달 포커스 연결을 유지한다.
- 제작 영역 전체 상대 좌표 핀, 24px 빨강/완료 회색, 비모달 popup 최대50vw×80vh, popup 너비420px의 완료 라벨 전환.
- 본인 글만 수정/삭제, 모든 이용자 핀 이동·완료·재개. 답글·가상 사용자 멘션, 최초 한 번 예시 저장. 미등록 초안은 메모리, 등록 데이터는 IndexedDB.
- 프로필 댓글 개수/알림 연동은 계획 중 사용자 답변에 따라 별도 후속으로 유지한다. Task를 임의 추가하지 않는다.
- Windows 검증 명령은 npm.cmd/npx.cmd 사용. npm.ps1 실행 정책을 바꾸지 않는다. 테스트용 fake-indexeddb6.2.6 설치는 T02 구현 때만 수행한다.
- 기존 프로필/토큰 스타일·실제 인증/역할·Azure 연결은 보존한다. 이 계획은 브라우저 IndexedDB 작업이며 Cosmos DB 변경은 없다.

## Next Step (IMPORTANT)

T03 청사진을 읽고 controller·CommentsProvider·전체 헤더 제거와 모바일 메뉴 이동을 구현한다. 초안 수명·저장 경쟁 상태·기존 탐색과 포커스를 검증하고 T04로 전진한다.

사용자 명령이 /memory-execute 또는 current 보고 이어서 해줘이면 한 Task를 수행한다. /mea이면 이 워크스페이스의 현재 계획에 남은 Task 전부를 순서대로 수행한다.

## Previous Context

- [이전 current 전체 보존 기록](./history/2026-10-29-before-production-pin-comments.md)
- [사용량 상세 분석과 토큰 추가 신청 모달 — 완료](./plans/2026-10-27-token-usage-request-modals.md): T01 82f2428, T02 f6ea9a1 및 후속 사용자 UI 보정 완료. 기존 테스트/브라우저 기록은 이전 이력이며 새 코멘트 기능 검증을 대신하지 않는다.
- [프로필 팝오버 계획 — 완료](./plans/2026-10-27-profile-popover-preview.md)
- [Cosmos DB 스킬 세팅 — 완료](./plans/2026-10-27-cosmosdb-skill-setup.md)
