# Phase: P01 HTML 헤더·제작 제조업 예시

## Status: in_progress

## Plan

[상위 계획](../../../plans/2026-11-06-workspace-mfg-html-parity.md)

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 제조업 46장·목차·배정·초기 상태 분리 | [T01](./T01-manufacturing-fixture.md) |
| T02 | `done` | 제작 상태·편집·미리보기·출처 시연 | [T02](./T02-production-demo.md) |
| T03 | `done` | 공통 헤더·회차 확인창·완성본 목록 | [T03](./T03-header-rounds.md) |
| T04 | `done` | 설정 4탭 임시 조작 시연 | [T04](./T04-settings-demo.md) |
| T05 | `in_progress` | 제조업 완성본/PPT 연결·통합 검증 | [T05](./T05-completion-ppt.md) |

## Progress

- done: 4/5 (active: T05)
- 순차 구현 중. 외부 연동 경계가 없는 하나의 UI 변경이므로 단일 Phase로 유지한다.
- 각 Task 완료 시 typecheck/lint 및 청사진의 검증을 기록하고, Task별 한국어 커밋 후 이 표와 current 포인터를 갱신한다.
- 정책: tests/ 금지, 브라우저/CUA/E2E/dev server/스크린샷 제외, 현재 프로젝트 보존, 기존 다른 변경 미포함, current 강제 stage 금지.
