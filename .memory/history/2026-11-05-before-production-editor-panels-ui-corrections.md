# Current Context

## Active Plan

[제작 화면 슬라이드 목록·문서 편집·출처 패널](./plans/2026-11-05-production-editor-panels.md)

## Active Phase

[P01 제작 화면 본문 통합](./phases/2026-11-05-production-editor-panels/P01-production-editor/phase.md)

## Active Task

없음 — 활성 계획 T01~T04 모두 완료.

## Status

- 2026-11-05 mea 실행 완료. done 4/4, 남은 Task 없음.
- T01 문서 편집기: cf2a22f
- T02 미리보기·출처: 23388bf
- T03 현재 화면 통합: 5aac83f
- T04 AI 비교 적용·통합 검증: fc246ca
- 전체 typecheck/lint/build·diff·인라인 검증 147개 통과.
- [완료 보고서](./reports/2026-11-05-production-editor-panels.md)

## Execution Order

1. T01 문서형 편집기·구조 변환·초안 보호.
2. T02 기본/Template 미리보기·저장 이미지·읽기 전용 출처.
3. T03 현재 화면의 세 패널·전체 슬라이드 조작·초안 통합.
4. T04 단일·다중 AI 비교 적용·최종 통합 검증.

각 청사진의 검증과 한국어 커밋을 완료한 뒤 다음 Task로 전진한다. 이전 완료 계획은 다시 실행하지 않는다.

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

- [전환 직전 current 원문](./history/2026-11-05-before-production-editor-panels.md)을 바이트 그대로 복사했고 SHA-256 일치를 확인했다. 원문 속 상대 링크는 이전 current.md 위치 기준이다.
- 이전 포인터의 공용 헤더 계획 T01~T05는 완료 상태였다. 마지막 기록은 T05 c20fb10이다. 완료 작업을 다시 실행하지 않는다.
- 역사 문서의 UI 전용 mock·전역 코멘트 설명은 당시 기록이다. 이번 계획은 현재 코드와 2026-11-04/2026-11-05 결정의 통합 프로젝트·회차 저장을 기준으로 한다.
- 실제 AI/RAG, RFP 원문 연결 모델, Template 없는 PPT 출력, 슬라이드별 코멘트 이관, 이전 코드 일괄 삭제는 이번 범위 밖이다.

## Next Step (IMPORTANT)

실행할 Task가 없다. 이 계획을 다시 구현하지 않는다. 새 요청이 오면 해당 범위의 인터뷰/계획부터 진행한다.

완료 범위: 기존 헤더·작업 영역 코멘트 유지, 전체 슬라이드 목록, 문서형 편집, 기본/Template 미리보기, 읽기 전용 출처, 단일/다중 시연 AI 비교·선택 적용.

제한: 실제 브라우저/IME/핀/드래그 실측 미실시. AI는 mock, RFP 파일 연결 모델과 Template 없는 PPT 출력은 후속 범위다. tests/ 생성·복원, push·배포는 수행하지 않았다.
