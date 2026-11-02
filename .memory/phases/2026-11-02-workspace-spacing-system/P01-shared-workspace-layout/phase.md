# Phase: P01 공통 업무 레이아웃

- Status: done
- Plan: [2026-11-02-workspace-spacing-system](../../../plans/2026-11-02-workspace-spacing-system.md)
- Decisions: [업무 화면 여백](../../../decisions/2026-11-02-workspace-spacing-system.md)

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | CSS 간격 원본과 페이지·헤더·카드·메뉴 context 계약 | [T01](./T01-spacing-foundation.md) |
| T02 | `done` | 셸과 모든 페이지 헤더 동시 전환, 모바일·캔버스 기능 보존 | [T02](./T02-unified-shell-header.md) |
| T03 | `done` | 화면별 카드·필터·표·폼 이관, 이중 패딩 제거 | [T03](./T03-screen-spacing-migration.md) |
| T04 | `done` | 오버레이 간격, 전체 자동 회귀 검증, 문서·단일 커밋 | [T04](./T04-overlays-regression-handoff.md) |

## Progress

- done: 4/4 (active: 없음)
- 구현: T01~T04 완료. 전체 76파일575테스트/typecheck/lint/build 통과.
- Commit: batch (Plan 헤더로 git log 조회). 요청한 문구를 포함한 단일 병합 커밋.
- 원격 테스트 삭제 유지·로컬 보관 결정에 따라 병합했으며 앱 소스는 그대로 보존했다.

## Execution Rules

- 홈(`/`)·`/admin` 추가 포함은 사용자 확정 사항이다. `/admin` 서버 권한 가드를 유지한다.
- `AppShell`만 페이지 바깥 패딩 소유. T01에서 아직 기존 페이지를 부분 전환하지 않는다.
- 한 Task의 검증 통과 후 해당 Status/Progress와 이 표·current 포인터를 갱신한다.
- 각 Task는 자체에 경로/API/검증을 포함한다. 후속 구현에서 이 계획 밖 업무 로직을 고치지 않는다.
- 모든 Task에서 브라우저 검증 제외. [지속 정책](../../../decisions/2026-10-30-task-validation-policy.md)에 따라 단위/jsdom/typecheck/lint/build만 실행하며 미실시 브라우저 검사를 통과로 기록하지 않는다.
