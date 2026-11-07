# Plan: 헤더 프로젝트 선택 필드 반응형 너비

## Goal

공통 프로젝트 헤더의 선택 필드가 고정 560px 대신 헤더에서 사용할 수 있는 너비에 맞춰 늘어나고 줄어들도록 한다. 프로젝트명과 기관·부서·마감일은 각각 한 줄 말줄임을 유지한다. 프로젝트 선택과 회차는 함께 표시하고, 공간이 부족하면 우측 작업 버튼 묶음이 다음 줄로 이동한다.

- Date: 2026-11-07
- Status: done (1/1)
- Decisions: [요구사항과 확정 배치](../decisions/2026-11-07-header-project-picker-responsive.md)
- Evidence: [코드 조사와 검증 계획](../reports/2026-11-07-header-project-picker-responsive-planning.md)
- 계획 승인 후 사용자 mea 요청으로 T01 구현·검증을 완료했다. [실행 검증](../reports/2026-11-07-header-project-picker-responsive-validation.md).

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 프로젝트 헤더의 가변 너비와 버튼 줄 이동 | [P01](../phases/2026-11-07-header-project-picker-responsive/P01-header/phase.md) |

## Task Boundaries

| Task | 결과 | 구현 대상 |
| :--- | :--- | :--- |
| T01 | 선택 필드가 남은 너비를 사용하고 프로젝트·회차를 유지한 채 액션 묶음만 줄 이동 | components/layout/WorkspaceHeader.tsx, components/common/ProjectHeader.tsx |

부모 행의 공간 배분과 자식 버튼의 축소는 같은 레이아웃 계약이다. 한쪽만 먼저 바꾸면 공용 버튼의 flex-shrink:0 또는 760px 이하 width:100%가 남아 줄바꿈 문제가 지속되므로 1 Phase / 1 Task로 구현·검증한다.

## Confirmed Scope

1. 접힌 상태의 프로젝트 선택 필드가 대상이다. 펼친 프로젝트 목록 팝업의 기존 640px / 최대 뷰포트-32px 규칙은 유지한다.
2. 필드는 너비 고정값을 제거하고 남은 공간을 채운다. 긴 제목과 메타는 각각 한 줄 말줄임, 전체 값 title/접근성 정보 유지.
3. 좁은 화면에서는 메뉴 열기 버튼 + 프로젝트 선택 + 회차를 같은 왼쪽 묶음에 둔다. 우측 액션 묶음이 먼저 다음 줄로 이동한다.
4. 아주 좁아 액션 묶음 자체도 한 줄에 들어가지 않으면 그 묶음 안에서만 버튼을 줄바꿈한다. 버튼은 숨기거나 잘라내지 않는다.
5. 파일 업로드·제작 설정·목차·제작·리뷰 등의 ProjectHeader 호출부에 같은 규칙을 적용한다. 로딩/빈 프로젝트/오류 상태의 선택 필드도 동일 규칙.
6. 기본 WorkspaceHeader 사용처의 DOM과 기본 레이아웃은 유지하고, 선택적 fluidLeading 옵션을 ProjectHeader에서만 켠다.
7. 공용 Button 및 DadamControls 구현은 수정하지 않는다. 필요한 flex-shrink 보정은 ProjectHeader.selector의 지역 스타일로만 한다.

## Exclusions

- 이전에 보고한 파일 화면 리팩토링 4개 후보는 이번 계획에 포함하지 않는다.
- 버튼 통합/공용 컨트롤 리팩토링, 프로젝트 데이터·권한·저장·회차 전환 로직 변경 없음.
- 펼친 picker/history 팝업 크기나 설정창 디자인 재작업 없음.
- 별도 FluentProvider hydration 오류는 미해결 기록 유지. CSS 반응형 변경으로 해결됐다고 판단하지 않는다.
- 파일 메뉴의 한 줄 3열, 제작의 슬라이드 상태·편집·사이드바 최초 접기 등 기존 완료 작업 보존.

## Validation Policy

- 기존 정책: tests/ 생성·복원, 임시 검증 파일, 브라우저/CUA/E2E/dev server/스크린샷 검증 금지.
- 타입 검사·변경 파일 lint·diff·정적 레이아웃/이벤트 검토로 검증한다. 실제 렌더링이나 픽셀 일치를 확인했다고 보고하지 않는다.
- 실행 시 T01의 정확한 검증 커맨드를 따른다. 브라우저 실측이 없으므로 줄 이동 경계의 실제 픽셀값은 검증 한계로 남긴다.
- T01 완료 시 계획/phase/Task 진행률을 갱신하고 청사진의 한글 커밋을 만든다. current.md는 ignore 유지, 강제 stage 금지.

## Progress

- done: 1/1
- active: 없음
- [전환 전 current](../history/2026-11-07-before-header-project-picker-responsive.md)
