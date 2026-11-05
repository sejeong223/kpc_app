# Current Context

## Active Plan

[제작 화면 슬라이드 목록·문서 편집·출처 패널](./plans/2026-11-05-production-editor-panels.md)

## Active Phase

[P01 제작 화면 본문 통합](./phases/2026-11-05-production-editor-panels/P01-production-editor/phase.md)

## Active Task

없음 — T01~T07 모두 완료.

## Status

- 2026-11-05 mea 완료. done 7/7, 남은 Task 없음.
- T05 53555be, T06 15c2aaa, T07 f28da2b. UI 수정 검증45개(19+16+10) 통과. T01~T04는 완료 이력으로 보존한다.
- T01 문서 편집기: cf2a22f
- T02 미리보기·출처: 23388bf
- T03 현재 화면 통합: 5aac83f
- T04 AI 비교 적용·통합 검증: fc246ca
- 최초 T01~T04의 전체 typecheck/lint/build·diff·인라인 검증147개 통과. T07 최종 전체 typecheck/lint/build/diff도 통과했다.
- [완료 보고서 — 최초 통합 및 UI 수정](./reports/2026-11-05-production-editor-panels.md)

## Execution Order

1. T05 패널 헤더 접기 아이콘·접힌 세로 영역·상단 토글/기본 배치 버튼 제거.
2. T06 중앙 상단의 명확한 편집 입력·직접 편집 우선 순서·상태별 안내.
3. T07 제작 화면 높이 제한·패널 내부 스크롤·최종 통합 검증.

위 순서는 모두 완료되었다. T01~T07과 이전 완료 계획은 다시 실행하지 않는다.

## Revised UI Contract

- D11~D13 및 T05~T07이 기존 상단 텍스트 토글·기본 배치 버튼·편집 배치·최소420px 높이 계산을 대체한다.
- 좌우 패널은 헤더 아이콘으로 접고 rail에서 펼친다. 기본 배치 버튼을 없애며 separator Home 너비 복원은 유지한다.
- 중앙 상단에 편집 입력과 반영 동작을 명시한다. 문서 구조·dirty/IME·권한·회차 보호를 보존한다. 빈 섹션을 다른 섹션으로 자동 전환하거나 샘플 슬라이드를 만들지 않는다.
- 전체 페이지 높이를 늘리지 않도록 제작 경로의 셸부터 flex/min-height를 연결한다. 코멘트 surface/팝업 좌표계와 헤더 기능은 유지한다.
- 수정할 구현 파일은 기존8개이며 새 구현 파일/공용 컴포넌트/shared 디렉토리는 만들지 않는다.

## Persistent Validation Policy

- 사용자 지시: tests/ 폴더를 생성·복원하지 않는다. 임시·Git 제외 검증 목적도 금지한다. 기존 테스트 삭제도 임의로 하지 않는다.
- 모든 Task에서 브라우저·CUA·E2E·스크린샷/육안 비교·검증용 dev server·실제 IME/포인터 검증을 제외한다.
- Windows의 npm.cmd/npx.cmd를 사용한다. Task별 typecheck/변경 파일 lint/필요한 기존 도구 인라인 검증, 최종 전체 lint/build/diff 검사를 수행한다.
- 인라인 검증은 stdin으로 실행하며 검증 파일·폴더를 새로 만들지 않는다. 실제로 실행하지 않은 검증은 통과로 적지 않는다.
- [지속 정책](./decisions/2026-10-30-task-validation-policy.md)과 AGENTS.md가 과거 청사진의 상충 지시보다 우선한다.

## Commit Boundary

- Task마다 지정된 한국어 커밋 메시지와 Plan/Phase/Task footer를 사용한다.
- .memory/current.md는 기존 ignored 로컬 포인터이며 강제 stage/커밋하지 않는다.
- 관련 파일만 명시적으로 stage한다. git add .로 무관한 변경을 포함하지 않는다. push/배포 요청은 없다.
- 저장된 프로젝트·자료·회차·코멘트를 초기화하거나 DB를 삭제/재생성하지 않는다.

## Previous Context

- [최초 계획 전환 직전 current 원문](./history/2026-11-05-before-production-editor-panels.md)을 보존한다. 원문 속 상대 링크는 이전 current.md 위치 기준이다.
- [UI 수정 계획 전 current 원문](./history/2026-11-05-before-production-editor-panels-ui-corrections.md)을 바이트 그대로 복사하고 SHA-256 일치를 확인했다. T01~T04 완료 상태가 기록되어 있다.
- 이전 포인터의 공용 헤더 계획 T01~T05는 완료 상태였다. 마지막 기록은 T05 c20fb10이다. 완료 작업을 다시 실행하지 않는다.
- 역사 문서의 UI 전용 mock·전역 코멘트 설명은 당시 기록이다. 이번 계획은 현재 코드와 2026-11-04/2026-11-05 결정의 통합 프로젝트·회차 저장을 기준으로 한다.
- 실제 AI/RAG, RFP 원문 연결 모델, Template 없는 PPT 출력, 슬라이드별 코멘트 이관, 이전 코드 일괄 삭제는 이번 범위 밖이다.

## Next Step (IMPORTANT)

실행할 Task가 없다. 이 계획을 다시 구현하지 않는다. 새 요청이 오면 해당 범위의 결정/계획부터 진행한다.

기존 완료 범위: 헤더·작업 영역 코멘트 유지, 전체 슬라이드 목록, 문서형 편집, 기본/Template 미리보기, 읽기 전용 출처, 단일/다중 시연 AI 비교·선택 적용. UI 수정 T05~T07도 완료되었다. 패널 헤더 아이콘/rail, 편집 입력 우선 배치, 기본 배치 버튼 제거, 제작 화면 높이/내부 스크롤을 적용했다.

제한: 실제 브라우저/IME/핀/드래그 실측 미실시. AI는 mock, RFP 파일 연결 모델과 Template 없는 PPT 출력은 후속 범위다. tests/ 생성·복원, push·배포는 수행하지 않았다.
