# Plan: 제작 화면 HTML 외 조작 요소 정리

- Status: done (1/1)
- Decisions: [결정](../decisions/2026-11-05-production-html-controls.md)
- Phase: [P01](../phases/2026-11-05-production-html-controls/P01-controls/phase.md)

T01 한 개로 제작 본문의 불필요한 조작 요소와 연결된 화면 전용 상태를 제거한다. 기존 파일 안에서 변경하며 공용 컴포넌트/디렉토리/새 구현 파일을 추가하지 않는다. HTML에 있는 우클릭 메뉴·입력/반영·카드 클릭 동작을 유지한다. typecheck/lint/build 및 stdin 검증 후 한국어 커밋한다.

완료: [변경 내용 및 검증 보고서](../reports/2026-11-05-production-html-controls.md). 타입/lint/build 및 84개 인라인 검증 통과.
