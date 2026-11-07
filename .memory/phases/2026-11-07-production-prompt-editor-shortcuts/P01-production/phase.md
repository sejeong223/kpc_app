# Phase: P01 제작 통프롬프트·단축키

## Plan

[제작 통프롬프트 편집기·슬라이드 단축키](../../../plans/2026-11-07-production-prompt-editor-shortcuts.md)

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 메뉴 단축키 표시·실행 및 목록 이동 방향 | [T01](./T01-context-menu-shortcuts.md) |
| T02 | `in_progress` | 슬라이드별 통프롬프트·로컬 배치 저장 계약 | [T02](./T02-slide-prompt-domain.md) |
| T03 | `pending` | 단일 통프롬프트 편집기 적용·중복 경로 정리 | [T03](./T03-unified-prompt-editor.md) |
| T04 | `pending` | 담당자 상태 변경 제한·완료 프롬프트 접기/보기 | [T04](./T04-assignee-slide-status.md) |

## Progress

- done: 1/4 (active: T02)
- T01 구현·검증 완료. mea로 T02 계속 실행.

## Shared Constraints

- 입력은 구역 구분 없는 한 개 통프롬프트. 원문과 배치 결과를 슬라이드별로 저장.
- 버튼 리팩토링 제외. 승인된 ↑/↓ 이동 수정 포함.
- 비담당 슬라이드 상태 드롭다운 및 개별 고정 해제는 PM/관리자도 불가. 본문 편집 권한은 기존 기준 유지.
- 완료 프롬프트는 기존 회색 토큰+점선, 기본 접힘, 읽기 전용 보기. 전송·별도 고정 해제 버튼 제거, 비담당 완료 select 글자는 disabled 회색.
- `tests/` 생성·복원 금지. 브라우저/CUA/E2E/dev server/스크린샷 제외.
- 코드 작업은 실행 명령을 받은 뒤 시작한다. Task마다 검증 후 한국어 커밋.
