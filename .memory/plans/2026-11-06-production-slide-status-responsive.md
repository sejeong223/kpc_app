# Plan: 제작 슬라이드별 완료·잠금과 반응형 배치

## Goal
선택한 슬라이드만 작성 완료·잠금·해제하고, 출처 패널이 중앙 편집/슬라이드를 덮지 않도록 제작 화면을 개선한다. 이번 단계는 계획만 작성한다.

## Confirmed Scope
- 제작의 완료/해제 대상은 활성 슬라이드 1장이다. 여러 장을 선택했더라도 상태 드롭다운은 활성 슬라이드에만 적용한다.
- 완료 즉시 해당 슬라이드의 본문/저장/AI/템플릿/PPT 반영 등 쓰기를 막고, 같은 소목차의 다른 작성 중 슬라이드는 계속 편집할 수 있다.
- 완료/해제 성공 시 일반 안내 문구(현재 코드: “변경을 반영했습니다.”)는 표시하지 않는다. 오류, 충돌, 미저장 확인은 유지한다.
- 소목차 상태는 자식 슬라이드 전체 완료일 때만 완료로 집계한다. 별도 “목차” 메뉴의 소목차 일괄 조작은 유지한다.
- 기존 완료 데이터는 보존한다. 과거 일괄 완료 중 처음 클릭한 슬라이드를 추정해 자동 해제하지 않는다.
- 사용자 답변: 좁은 화면에서는 출처를 자동으로 접고, 펼치면 중앙 너비도 함께 조정한다.
- 추가 요청: 제작 최초 진입 시 앱의 왼쪽 메뉴 사이드바를 자동으로 접는다. 이후 사용자가 펼치면 사용자 선택을 우선하며 제작 재진입·프로젝트 전환·같은 브라우저 새로고침에도 유지한다. 사용자가 다시 접으면 마지막 선택을 유지한다.
- 사용자 답변: 제조업 예시 편집 본문의 슬라이드별 저장 분리는 이번에 제외한다.
- 담당 표시 2.5px, Dadam 폰트, 배지, 코멘트/설정/회차 UI의 기존 수정은 유지한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | in_progress | 슬라이드 단위 상태·화면 연결·출처 비중첩 배치 | [P01](../phases/2026-11-06-production-slide-status-responsive/P01-production/phase.md) |

## Task Structure
| Task | 작업 | 주요 파일 |
| :--- | :--- | :--- |
| T01 | 슬라이드 상태 모델·이전 데이터 호환·도메인 잠금 | types/workspace-production.ts, lib/workspace/production/{schemas,state-compatibility,domain,permissions,selectors}.ts, services/workspace/WorkspaceProductionService.ts |
| T02 | 활성 슬라이드 상태 UI·잠금·안내 제거 | ProductionWorkspace.tsx, ProductionToolbar.tsx, SlideNavigator.tsx, presentation.ts, 제안/PPT/자산 적용 UI |
| T03 | 출처·중앙 반응형 및 제작 최초 진입 메뉴 접기·사용자 선택 유지 | use-production-panels.ts, 신규 production/panel-layout.ts, ProductionPanels.tsx, ProductionWorkspace.tsx, AppShell.tsx, 신규 use-production-sidebar.ts |

T01 → T02 → T03 순서. 상태 모델/읽기 호환/쓰기 검증은 하나의 원자적 작업으로 묶는다. T01에서는 기존 소목차 조작을 계속 지원해 T02 전에도 컴파일과 기존 동작이 성립한다. T02가 새 슬라이드 명령을 사용한다. T03은 상태 기능과 분리해 너비 산정·레이아웃 회귀를 검증한다.
메뉴 사이드바의 200px↔64px 전환도 제작 컨테이너 너비를 바꾸므로 T03에 함께 포함한다. Phase/Task 수는 1개/3개로 유지한다.

## Completion Criteria
- 같은 담당 소목차의 A만 완료하면 B의 상태·본문·revision은 그대로이고 B는 편집 가능하다.
- A를 해제하면 A만 작성 중이 되며 상단 일반 성공 문구가 없다.
- 새로고침/회차 전환/보관본에서도 슬라이드 상태를 보존하고, 직접 쓰기 요청으로 잠금을 우회할 수 없다.
- 제작 컨테이너 761~1179px에서 출처가 중앙을 덮지 않는다. 자동 접힌 출처를 열면 실제 열 너비를 차지한다.
- 760px 이하에서는 기존 슬라이드/편집/출처 전환을 유지한다. 화면 확대/축소도 실제 컨테이너 너비에 따라 처리한다.
- 메뉴 사이드바는 제작 첫 사용 시 64px 접힌 상태로 시작하고, 사용자가 펼친 뒤에는 저장한 선택을 유지한다. 사용자 선택을 화면 렌더/크기 변경/제작 재진입 때 자동 접기로 덮어쓰지 않는다.
- 기존 프로젝트, 46장 제조업 예시/담당 15장, 파일/댓글/완성본/PPT/권한/폰트를 보존한다.

## Validation Strategy
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/dev server/스크린샷 실행 금지.
- 각 Task의 타입 검사, 대상 lint, Node stdin 상태/너비 불변식 검증을 사용한다. T03 종료 시 build.
- 정적 너비 계산과 렌더링 구조는 검증하되 실제 브라우저 시각 확인 미실시를 명시한다.

## Scope Boundaries
- 설정 권한의 실제 저장/서버 연동, 알림·로그/RFP 연동, Cosmos/프로비저닝/새 패키지/배포/push 제외.
- 제조업 demoPrompt는 계속 소목차에 저장한다. 슬라이드 상태 독립성과 본문 저장 독립성은 별개이며, 후자는 사용자가 제외했다.
- 기존 완료 기록 자동 초기화, 프로젝트 삭제/재시드, PPT 내용 재생성/폰트 변경 제외.
- 모든 현재 미커밋 수정 위에 작업한다. 일괄 stage/reset/restore 및 current.md 강제 stage 금지.

## Decisions / Evidence
- [결정](../decisions/2026-11-06-production-slide-status-responsive.md)
- [근거 및 계획 검증](../reports/2026-11-06-production-slide-status-responsive-planning.md)
- [이전 current](../history/2026-11-06-before-production-slide-status-responsive.md)
