# Plan: 목록 기본 조회 개수 10개

- Status: done
- Decision: [결정](../decisions/2026-11-02-admin-pagination-default.md)
- Phase: [P01 공통 페이지 크기](../phases/2026-11-02-admin-pagination-default/P01-page-size/phase.md)
- Task: [T01 기본값·선택값 연결](../phases/2026-11-02-admin-pagination-default/P01-page-size/T01-ten-items.md)

기존 페이지 처리에 공통10개 기본값을 적용하고 로그의 선택기를 정합하게 수정한다. 데이터 스키마·권한·CSV 범위는 유지한다. 기존 관련 회귀 검사와 typecheck/lint/build로 검증한 뒤 단일 로컬 커밋한다. 별도 push 요청은 없다.

- [x] 구현·검증·기록 완료, 이 계획의 단일 로컬 커밋에 포함
- 결과: 관련8파일38테스트·typecheck·lint·build·diff 검사 통과. 브라우저 검증 미실시.
