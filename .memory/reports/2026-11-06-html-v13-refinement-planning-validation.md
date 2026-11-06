# Planning Validation: KPC v13 HTML 정비

- Date: 2026-11-06 (Asia/Seoul)
- Scope: 계획 문서 작성 및 읽기 전용 조사. HTML 구현 단계 아님.

## 생성 구조
- Plan 1개: ../plans/2026-11-06-html-v13-refinement.md
- Phase 1개: ../phases/2026-11-06-html-v13-refinement/P01-html-only/phase.md
- Task 8개: T01 헤더, T02 제작 코멘트, T03 검토 뷰어, T04 목차, T05 제작 설정, T06 관리자 폰트, T07 대시보드, T08 리뷰 도구·다중 슬라이드.
- 요청/계획자 해석 결정 문서와 소스 위치/해시 보고서.
- 조사 시작 시 current 원문을 ../history/2026-11-06-before-html-v13-refinement.md에 보존.

## 수행한 검증
1. 모든 Task의 필수 schema(Goal/Decision/Implementation/I01/I02/Types/Fields/Acceptance/Validation/Commit/Progress) 확인: 통과.
2. Plan/Phase/Task의 상대 링크 대상 존재와 Markdown fence 짝 확인: 통과.
   - history의 current 원문은 내용 보존을 위해 상대 링크를 고치지 않았다. 이력 내부 링크는 원래 current의 위치인 .memory/를 기준으로 확인한다.
3. 최초 Task 수7, 모두 pending, phase done0/7 확인: 통과. 추가 리뷰 요청 반영 후 현행 8개 확인은 아래 보완 검증에 기록한다.
4. 두 HTML의 inline JavaScript를 node:vm.Script, CSS를 postcss로 파싱: 통과. jsdom은 outside-only, HTML script 실행과 외부 리소스 로드 없음.
5. Task에 수록한 실제 공통 검증 명령을 실행하여 #app 존재/외부 script 미추가/v12 해시 검사 및 JS/CSS 파싱: 통과.
6. 아래 두 HTML은 계획 시작/종료 전 확인 시 SHA256 동일:
   - v13: a15f1ceecdd5373429f6bf020866532e07e7aaa2e32be2709e46e8e824747e99
   - v12 8: 52dc1322383f79b1e880f9c4b51fbc182d99aafedd40532a5c48acb2f4b011e3

## 동시 작업과 전환 조건
계획 중 별도 실행이 이전 슬라이드 핀 계획의 T01을 af5279e로 커밋하고 T02를 진행했다. 따라서 앱 전체 Git diff가 같다는 검증은 사용하지 않는다. 이 계획 작업에서 수행한 파일 쓰기는 .memory Markdown뿐이다.
사용자는 “기존 실행이 끝난 뒤 전환”을 선택했다. 기존 Plan/Phase/Task 완료와 current의 활성 Task 없음이 확인된 뒤, 직전 current도 별도 history에 보존하고 이 계획의 T01로 전환한다. 다른 실행의 변경을 되돌리거나 완료 처리하지 않는다.

## 범위 확정
사용자는 원문 검색 실동작 신규 구현/HTML 전체 중복 정리 제안에 “요청한 7개만 유지”를 선택했다. 이 두 항목의 추가 Task는 없다. 이후 직접 요청한 리뷰 변경은 T08에 포함한다.

## 미실시
- HTML 구현, 브라우저/CUA/실제 렌더링 비교, 마우스/키보드 실제 UI 테스트.
- 앱 소스 수정, 앱 typecheck/lint/build, 커밋, push, 배포.
- 실제 구현이 없으므로 요청 UI의 완성 또는 동작 검증을 통과했다고 주장하지 않는다.

## Pointer
- 전환 완료: 기존 Plan/Phase done 2/2, Active Task 없음 및 T02 커밋9336674를 확인했다.
- 전환 직전 current를 ../history/2026-11-06-before-html-v13-activation.md에 원문 보존한 뒤 새 HTML 계획 T01로 설정했다.
- 이전 /mea 승인은 새 계획에 승계하지 않는다. HTML 구현은 새 사용자 실행 지시를 기다린다.

## 추가 헤더 요청 계획 보완

- T01에 v12형 업로드 본문 사용량 안내를 상세 구현 단위로 추가하고 기존 회귀 검토를 I03으로 이동했다. 새 Task는 만들지 않았다.
- 모든 작업 헤더에서 4개 중복 메뉴 버튼을 제거하는 DOM 범위와 GNB/설정/실제 업로드 조작의 보존 기준을 명시했다.
- 당시 Plan/Phase/Decisions/current와 조사 기록을 동기화했다. 헤더 보완 시점에는 0/7, T01 pending을 유지했다. 현행 Task 수는 아래 리뷰 보완을 따른다.

## 추가 리뷰 요청 계획 보완

- T08에 상단 3개 버튼 제거, 패널 내용·모바일 접근 보존, 실제 시연 PAGES 보완과 장별 의견/사실검증 연결 조건을 작성했다.
- T03 검토 목록 상세와 T08 작업 메뉴 리뷰를 분리했다. 기존 다중 데이터는 보존하고 누락·단일 시연 섹션에만 실제 페이지를 추가하도록 범위를 정했다.
- Plan/Phase/current/Decisions/소스 기록을 1개 Phase/8개 Task로 동기화했다. T07은 종료 대신 T08로 인계하고 전체 종료 검토는 T08로 이동했다.
- 현행 8개 Task의 필수 schema, 14개 문서의 fence와 24개 링크 대상, 모두 pending, current T01, done0/8, T07→T08 인계를 stdin Python으로 확인: 통과.
- 두 HTML의 SHA256을 다시 확인한 결과 위 원본 해시와 동일했다. git status는 이 계획의 .memory 문서만 표시하며 앱 tracked 변경은 없다.
- 이번 보완에도 HTML 구현·브라우저 검증·커밋은 수행하지 않았다. 실제 다중 슬라이드와 버튼 제거 동작의 검증 완료를 뜻하지 않는다.
