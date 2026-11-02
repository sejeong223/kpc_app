# Plan: 대시보드 스크롤과 정보 구조 개선

- Status: done
- Decision: [결정](../decisions/2026-11-02-dashboard-compact-ux.md)
- Phase: [P01 대시보드 탐색 구조](../phases/2026-11-02-dashboard-compact-ux/P01-compact-dashboard/phase.md)
- Task: [T01 요약·상세 분리와 회귀 검증](../phases/2026-11-02-dashboard-compact-ux/P01-compact-dashboard/T01-compact-dashboard.md)

UI 상태와 조회 상태를 분리하고 기존 집계·권한·데이터 계약을 유지한다. 기존 페이지의 모든 정보를 새 전환 영역에서 접근할 수 있도록 한다. 로컬 회귀 검증 후 프로젝트 규칙에 따라 단일 로컬 커밋한다. push 요청은 없다.

- [x] 구현·검증·기록 완료, 이 계획의 단일 로컬 커밋에 포함
- 결과: 대시보드 신규8개 회귀 검사 및 전체78파일591테스트 통과. typecheck/lint/build/diff 검사 통과. 실제 브라우저·스크롤 길이 측정은 미실시.
