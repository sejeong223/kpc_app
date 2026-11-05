# Plan: 제작 화면 HTML 예시 프로젝트

- Status: done (1/1)
- Decisions: [확정 사항](../decisions/2026-11-05-production-html-demo.md)
- Phase: [P01 예시 프로젝트](../phases/2026-11-05-production-html-demo/P01-demo/phase.md)

하나의 Task에서 HTML 예시 데이터, 최초 저장, 전용 미리보기, 프로젝트 목록 진입을 연결한다. 기존 제작 화면에서 수동 확인할 수 있는 여섯 장의 편집 가능한 프로젝트를 제공한다.

새 구현 파일은 `config/production-html-demo.ts`, `services/workspace/workspace-demo.ts`, `components/workspace/production/HtmlDemoSlidePreview.tsx`와 같은 위치의 CSS module이다. 공용/shared 디렉토리를 추가하지 않는다. 기존 catalog, bundle 초기화, 두 저장소의 트랜잭션, ProductionPreview 분기에 연결한다.

검증은 타입 검사·전체 lint/build·인라인 저장/편집/출처 검증·diff 검사다. tests/ 및 브라우저 검증은 수행하지 않는다. Task 완료 시 지정 한국어 커밋과 로컬 current 포인터를 갱신한다.

완료: [구현·검증·수동 확인 경로](../reports/2026-11-05-production-html-demo.md). 타입/lint/build 및 stdin 검증 110개 통과.
