# Plan: 제작 헤더 우측 버튼 4개

- Date: 2026-11-02
- Status: done
- Decisions: [버튼 UI 범위와 구현 기본값](../decisions/2026-11-02-write-header-actions.md)
- 기준 코드: `f2139807e815f902fded5e7bb2a5cb9ac5f94d3a`

## Goal

`/workspace/write`의 기존 헤더 오른쪽에 재작업·완성본 1·완성·설정 버튼을 공통 Button으로 표시한다. 네 버튼은 설정 버튼 기준 34px 높이와 기존 dadam 룩앤필을 사용한다. 핀 생성 버튼은 헤더 아래 왼쪽으로 옮기고 기존 핀 기능과 헤더 나머지를 보존한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 제작 화면 한 파일에서 버튼 UI·핀 위치 정리와 검증 | [P01](../phases/2026-11-02-write-header-actions/P01-header-actions/phase.md) |

## Task 구성과 이유

- T01 하나로 버튼 표시·핀 이동·검증을 끝낸다. 모두 같은 `CommentsWorkspace`의 헤더 actions 교체에 속하며, 나누면 중간 단계에 핀 버튼이 중복되거나 사라질 수 있다.
- 수정할 생산 파일은 `components/comments/CommentsWorkspace.tsx`뿐이다. 공통 `Button.tsx`, `WorkspaceHeader.tsx`, `CommentCreateButton.tsx`, dadam 토큰은 읽고 재사용한다.
- 새 생산 파일이나 공통 컴포넌트 계층을 추가하지 않는다.

## Scope

- 포함: 버튼 4개와 아이콘·접근성 이름, 모두 34px 높이, 완성만 `primary`, 핀 생성 위치 이동, 기존 동작 회귀 방지.
- 제외: 업무용 버튼 클릭 동작·팝업·설정 화면·완성본 저장·프로젝트/회차/권한 모델·API·DB·다른 헤더 내용 및 다른 메뉴 변경.
- `완성본 1`은 정적 UI 표시이며 실제 저장 데이터가 아니다.
- HTML의 설정 높이는 34px, 완성 32px, 재작업 36px로 서로 다르므로 설정 기준 34px로 통일한다.

## Validation Policy

- 구현 후 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`를 실행한다.
- `tests/` 및 테스트 파일을 만들거나 복원하지 않는다. 브라우저·E2E·스크린샷·검증용 dev server를 실행하지 않는다.
- 타입/빌드 통과와 실제 시각 검증을 구분해 기록한다. 계획 단계에는 위 구현 검증을 실행하지 않는다.

## 인접 사항

`comments` 폴더가 Tailwind 탐색에서 빠져 있지만 이번에 필요한 크기/배치는 같은 파일의 Griffel 스타일로 처리할 수 있다. 사용자 지시로 선택한 `app/admin-utilities.css`의 팀원 설정을 유지하며 별도 Task로 확대하지 않는다.

## 실행 결과 — 2026-11-02

- `/mea` 실행으로 P01/T01 done 1/1, 남은 Task 없음. 실제 검증 기록은 T01의 Execution Result에 있다.
- `CommentsWorkspace.tsx` 한 파일에서 버튼 UI 4개·34px 높이·핀 생성 위치 이동을 완료했다. typecheck/lint/build와 정적 diff 검토를 통과했다.
- 테스트 파일/폴더와 새 생산 파일은 만들지 않았다. 브라우저 검증은 정책에 따라 미실시했으며 실제 시각 검증 통과로 기록하지 않는다.
- 업무용 클릭 동작은 합의한 제외 범위다. 남은 오류나 추가 범위 변경은 없다.
