# Phase: P01 제작 화면 본문 통합

- Date: 2026-11-05
- Status: in_progress
- Plan: [제작 편집 패널](../../../plans/2026-11-05-production-editor-panels.md)
- Decision: [확정 인터뷰](../../../decisions/2026-11-05-production-editor-panels.md)
- 상태 의미: T01~T02 구현과 검증 완료, T03 진행.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 구조를 보존하는 문서형 편집기와 초안 보호 | [T01](./T01-document-editor.md) |
| T02 | `done` | 기본/Template 미리보기와 읽기 전용 출처 | [T02](./T02-preview-sources.md) |
| T03 | `in_progress` | 현재 화면의 세 패널·전체 슬라이드 조작 통합 | [T03](./T03-screen-integration.md) |
| T04 | `pending` | 단일·다중 AI 비교 적용 및 통합 검증 | [T04](./T04-ai-integration.md) |

## Progress

- done: 2/4 (active: T03)
- 순서: T01 → T02 → T03 → T04. 각 Task의 지정 검증과 한국어 커밋 후 다음으로 이동한다.
- T01: typecheck, 변경 파일 lint, 인라인 27개 검증 통과.

## Persistent Rules

- 현재 헤더·작업 영역 코멘트·프로젝트/회차/권한 유지. 새 공용 컴포넌트 추출 금지.
- `tests/` 생성·복원과 브라우저/CUA/E2E/스크린샷/dev server 검증 금지.
- `.memory/current.md`는 로컬 ignored 포인터. 과거 완료 Task 재실행·DB 초기화·무관한 코드 삭제·push/배포 금지.
