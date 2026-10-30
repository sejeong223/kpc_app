# Current Context

## Active Plan

[KPC dadam 룩앤필 단계적 적용](./plans/2026-10-30-dadam-look-and-feel.md)

## Active Phase

[P01 dadam UI 단계적 적용](./phases/2026-10-30-dadam-look-and-feel/P01-ui/phase.md)

## Active Task

없음 — 모든 Task 완료.

## Last Completed

[T04 코멘트 디자인과 좌표 회귀](./phases/2026-10-30-dadam-look-and-feel/P01-ui/T04-comment-design.md)

## Status

- Plan/P01/T01~T04 완료: done4/4. 전체411개 테스트, 코멘트103개, typecheck·전체 lint·build 통과. 남은 실행 Task 없음.
- 커밋: T01 3fa09e4 / T02 b8761d5 / T03 3f56457. T04는 이 완료 기록을 포함한 커밋이며 git log --grep=Task: 로 조회할 수 있다.
- 확정: 기본형 dadam, 파란 강조색, 활성 메뉴 포함. 공통 스타일을 대상 화면에만 적용한다.
- 실행 순서: T01 공통 테마·사이드바 → T02 프로필 전체 탭 → T03 토큰 모달·알림 → T04 코멘트 디자인. T03 검증·커밋까지 마쳐야 코멘트 구현에 착수한다.
- 사용자 승인 추가: T04의 기존 코멘트 UI 가상 측정값220px을 현재 펼침200/접힘64/모바일0 조건으로 보완하고 좌표·팝업·저장 보존을 검증한다.
- [확정 결정](./decisions/2026-10-30-dadam-look-and-feel.md). KPC의 기능·권한·데이터를 유지하는 UI 변경이며 토큰 승인 API·코멘트 서버 동기화·로그인/일반 본문 재디자인은 범위 밖이다.

## Persistent Validation Policy

- 사용자 지시(2026-10-30): **브라우저 검증은 앞으로 모든 Task에서 제외한다.**
- [지속 검증 정책](./decisions/2026-10-30-task-validation-policy.md)을 이번 계획과 이후 계획 전환 시에도 유지한다.
- unit/기존 및 필요한 jsdom DOM 테스트·타입 검사·lint·build·정적 코드 검토를 수행한다. 브라우저/E2E/스크린샷·육안 확인·native IME/터치 실기 확인과 검증용 dev server 실행은 하지 않는다.
- 미실시를 통과로 기록하지 않고, 브라우저 검증 제외를 완료 차단 사유나 별도 대기 Task로 남기지 않는다.

## Worktree / Commit Boundary

- 기존 사이드바 최초 구현은 f573ce5. 접힘 헤더28px·글자색·divider 후속 보정은 이번 T01 변경에 함께 포함했다.
- 이전 핀 코멘트 T03/T04/phase/plan/report와 이전 사이드바 T01의 미커밋 문서는 보존한다. `git add .`로 새 Task 커밋에 일괄 포함하지 않는다.
- 새 계획의 decision/plan/phase/Task/current/history 문서는 T01 커밋에 명시 경로로 포함할 수 있다. 각 Task는 지정한 한국어 커밋 메시지와 Plan/Phase/Task footer를 사용한다.
- 토큰 mock/코멘트 IndexedDB를 디자인 변경 중 실제 서버 연동으로 바꾸지 않는다. dadam 저장소는 읽기 참고만 한다.

## Next Step (IMPORTANT)

활성 계획의 실행을 모두 마쳤다. 새 요청 전까지 추가 구현하지 않는다. 토큰 실제 승인 API·코멘트 서버 동기화·로그인과 일반 본문 재디자인은 이번 완료 범위에 포함하지 않았다.

완료 결과는 각 Task의 Execution Result에 기록했다. 기존 무관한 미커밋 메모 문서는 보존했다.

## Previous Context

- [포인터 전환 전 current 원문](./history/2026-10-30-before-dadam-look-and-feel.md). 원문의 상대 링크는 원래 `.memory/current.md` 위치 기준이다.
- [dadam 사이드바 규격·서체 — 완료](./plans/2026-10-30-dadam-sidebar-layout-typography.md). 신규 계획은 기존 완료 Task를 다시 실행하지 않고 현재 상태를 확장한다. 기존 “활성 전용 디자인 제외”는 새 결정에서 포함으로 변경되었다.
- [제작 핀 코멘트 — 완료](./plans/2026-10-29-production-pin-comments.md). 기존 기능을 보존하고 이번 T04는 디자인·승인된 테스트 조건만 정비한다.
- [토큰 모달 — 완료](./plans/2026-10-27-token-usage-request-modals.md), [프로필 팝오버 — 완료](./plans/2026-10-27-profile-popover-preview.md).
