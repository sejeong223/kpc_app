# Current Context

## Active Plan

[제작 화면 슬라이드 핀 및 중앙 편집 레이아웃](./plans/2026-11-05-production-slide-pin-layout.md)

## Active Phase

[P01 슬라이드 핀 연결 및 중앙 배치](./phases/2026-11-05-production-slide-pin-layout/P01-slide-pin-layout/phase.md)

## Active Task

[T01 슬라이드에 연결된 핀 저장·생성·표시](./phases/2026-11-05-production-slide-pin-layout/P01-slide-pin-layout/T01-slide-bound-comments.md)

## Status

- 계획 및 상세 청사진 작성 완료. 구현 시작 준비 완료.
- done: 0/2. T01 pending → T02 pending 순서로 실행한다.
- 이번 단계에서는 `.memory/` 문서만 작성했다. 구현 코드·앱 데이터 변경, 앱 테스트 및 커밋은 수행하지 않았다.

## Next Step (IMPORTANT)

T01 청사진을 읽고 `config/comments.ts`, `types/workspace-production.ts`, `lib/comments/domain.ts`, `lib/workspace/production/canvas-schemas.ts`의 슬라이드 연결 계약부터 구현한다. 같은 Task에서 저장·controller·실제 슬라이드 표면 연결까지 끝내고 검증한다. T01 완료 후 T02로 포인터를 전진한다.

## Persistent Policy

- tests/ 생성·복원 및 브라우저/CUA/E2E/dev server/스크린샷 검증 금지.
- 타입/lint/build·정적 검토와 stdin 검증 사용. UI의 실제 브라우저 확인은 사용자 수동 테스트 범위다.
- 기존 데이터·DB·헤더 본체 보존. 이번 계획에서 승인한 의견 변경은 슬라이드 연결, 기존 연결 없는 의견 숨김, 생성 영역·버튼 위치·집계 정합성에 한정한다.
- 기존 댓글 작성·답글·멘션·권한·회차·초안 보호 유지. 구 의견 체계 전면 통합·DB 초기화 금지.
- Task마다 한국어 커밋. `.memory/current.md` 강제 stage 금지. push/배포 없음.
- 명시적인 다음 실행 요청 전에는 계획 문서만 작성한다.

## Decisions

[확정 결정](./decisions/2026-11-05-production-slide-pin-layout.md)

## Previous Context

[이번 계획 전 current 원문](./history/2026-11-05-before-production-slide-pin-layout.md).
이전 HTML 외 버튼 정리 Task는 56a9125로 완료, HTML 예시 프로젝트는 f71575c로 완료되어 재실행하지 않는다.
