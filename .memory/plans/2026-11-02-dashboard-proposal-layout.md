# Plan: 기획 HTML 기준 대시보드 재구성

- Status: done
- Decision: [결정](../decisions/2026-11-02-dashboard-proposal-layout.md)
- Phase: [P01 기획 구성 반영](../phases/2026-11-02-dashboard-proposal-layout/P01-proposal-layout/phase.md)
- Task: [T01 구성 교체](../phases/2026-11-02-dashboard-proposal-layout/P01-proposal-layout/T01-dashboard-layout.md)

기획 정보 순서·차트·표 배치와 기존 데이터/권한을 유지한다. 코드와 원본에서 설계 분기를 확인했다. 구현 후 회귀 검증·기록·단일 로컬 커밋한다.

- 완료: 기획 순서·KPI11개·차트/분포/부서/목록 및4개 분석 탭 반영.
- 검증: 대시보드10개 테스트, 관련4파일24개 테스트, 전체78파일593개 테스트, typecheck/lint/build 통과. 브라우저 검증 미실시.
- 단일 로컬 커밋에 코드·결정·계획·실행 기록 포함. tests는 로컬에만 보관. push하지 않는다.
