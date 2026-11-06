# Current Context

## Active Plan

[HTML v13 공통 헤더·제작 화면 적용](./plans/2026-11-06-workspace-html-v13-parity.md)

## Active Phase

[P01 공통 헤더·제작 UI 적용](./phases/2026-11-06-workspace-html-v13-parity/P01-workspace-ui/phase.md)

## Active Task

없음. 사용자 완성본/PPT 요청 T05 포함 전체 5개 Task 완료.

## Status

- done: 5/5. T01(71dfb7c)·T02(4f1141a)·T03(adcb5f7)·T04(a0ce499)·T05(fc936ef) 구현·검증·커밋 완료.
- 사용자 $mea 요청의 전체 계획 실행 완료.
- 사용자 확정: HTML의 화면 구성·문구·조작을 적용하고 현재 프로젝트 데이터 유지.
- 추가 범위 확인 완료: 설정 알림·활동 로그와 RFP 원문 신규 연결은 제외.

## Next Step (IMPORTANT)

진행할 Task 없음. T05까지 typecheck·lint·build와 실제 다운로드/6장 PPT/기존 저장본 보존 등13조건 검증 완료. 브라우저 시각·마우스 검증은 미실시다. 다음 사용자 요청을 기다린다.

## Persistent Policy

- tests/ 생성·복원 금지. 브라우저/CUA/E2E/dev server/스크린샷 검증 제외.
- 기존 typecheck/lint/build와 정적 이벤트·권한·소스 검토를 사용한다. 미실시 시각 검증을 통과로 쓰지 않는다.
- HTML은 read-only UI 참조다. 현재 프로젝트·슬라이드·댓글·자료·회차·권한·저장소를 예시 데이터로 덮어쓰지 않는다.
- 코멘트 추가 버튼은 제작의 작성 상태 선택 바로 왼쪽에 둔다.
- 기존 다른 계획과 미커밋 변경 보존. 일괄 stage/reset/restore 금지.
- current.md는 ignore 유지, 강제 stage 금지. push/배포 없음.
- 이번 계획에 Cosmos DB/프로비저닝/패키지 변경은 없다.
- T04 사용자 추가 요청으로 전체 목 프로젝트 마감일·부서 표시 데이터를 채웠다. 저장된 본문은 유지한다.
- T05 사용자 추가 요청으로 완성 이력이 없는 HTML 예시만1차 완성본/PPT를 추가하고 기존 내용을2차 작업으로 보존한다. 이미 완성 이력이 있는 예시와 일반 프로젝트는 변경하지 않는다.

## Decisions

[범위·설계 결정](./decisions/2026-11-06-workspace-html-v13-parity.md)
[원본·현재 앱 비교](./reports/2026-11-06-workspace-html-v13-parity-sources.md)
[계획 검증](./reports/2026-11-06-workspace-html-v13-parity-planning-validation.md)

## Previous Context

[전환 전 current 원문](./history/2026-11-06-before-workspace-html-v13-parity.md).
이전 HTML 정비 계획은 전체8/8 완료, Active Task 없음이었다. 해당 계획의 외부 HTML 수정·커밋 생략·실행 기록은 보존하며 재실행하지 않는다. 이전 /mea 실행 승인은 새 계획에 자동 승계하지 않는다.
