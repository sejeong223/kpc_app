# Phase: P01 dadam UI 단계적 적용

## Status: done

## Goal

공통 테마를 바탕으로 사이드바·프로필·토큰 화면을 먼저 완성하고 코멘트 스타일을 이어서 통일한다. 모든 Task는 KPC 작업트리를 기준으로 하며 범위 밖 본문과 기능 상태를 보존한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 공통 테마 범위와 사이드바 상태 디자인 | [T01](./T01-theme-sidebar.md) |
| T02 | `done` | 프로필 전체 탭과 공통 컨트롤 | [T02](./T02-profile-controls.md) |
| T03 | `done` | 토큰 모달·폼·알림 및 사이드바 계열 완료 | [T03](./T03-token-dialogs.md) |
| T04 | `done` | 코멘트 디자인과 화면 폭별 좌표 회귀 | [T04](./T04-comment-design.md) |

## Execution Rules

- T01 → T02 → T03 → T04 순서. T01~T03 검증 전에는 코멘트 구현에 착수하지 않는다.
- 각 Task는 상세 계약·파일·검증·한국어 커밋 메시지를 자체 포함한다. 완료 시 Task done → 검증 결과/커밋 기록 → phase 진행률/current 다음 포인터를 같은 작업 단위로 동기화한다.
- 모든 Task의 브라우저/E2E/스크린샷·육안 검증 및 dev server 검증을 제외한다. jsdom 테스트는 DOM/이벤트 확인이며 실제 브라우저 렌더링 검증으로 보고하지 않는다.
- 기존 미커밋 변경을 보존하고 Task별 파일을 명시 stage한다. 이전 계획의 남은 문서 변경을 새 기능 변경과 일괄 커밋하지 않는다.

## Progress

- done: 4/4 (active: none)
- sidebar/profile/token milestone: done — T01~T03 회귀 117개 및 typecheck/lint/build 통과
- comment milestone: done — 코멘트103개/최종전체411개 및 typecheck/lint/build 통과
