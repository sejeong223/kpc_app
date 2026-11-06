# Evidence / Planning Validation: 제작 슬라이드별 완료·반응형
Date: 2026-11-06
Status: plan_ready

## Observed Code
| 위치 | 관찰 | 계획의 대응 |
| :--- | :--- | :--- |
| types/workspace-production.ts :: Section / ProposalSlide | Section만 state/locked 보유, ProposalSlide는 완료 필드 없음 | 슬라이드 state와 v1/v2 읽기 호환 |
| ProductionWorkspace.tsx :: execute / toolbar callbacks | set-section-state / unlock-section에 section.id 전달 | 활성 slide.id로 새 명령 |
| domain.ts :: set-section-state | 소목차 전체 state/locked 변경 | 제작 개별 명령과 기존 목차 일괄 명령 분리 |
| section-locks.ts :: normalizeCompletedSectionLocks | done 소목차를 자동 잠금 | 슬라이드→소목차 집계로 교체, 역방향 덮어쓰기 금지 |
| permissions.ts / selectors.ts | 수정 가능 여부가 editableSectionIds 중심 | 개별 쓰기/소목차 전체 쓰기/추가 권한 분리 |
| ProductionWorkspace.tsx :: applyReceipt | 기본 안내 “변경을 반영했습니다.”, set-section-state만 silent | 개별 완료·해제 둘 다 silent, 이전 안내도 clear |
| ProductionPanels.tsx :: right aside | 761px 이상 absolute, 1180px 이상 static | 출처를 항상 실제 배치 열로 처리 |
| use-production-panels.ts :: resolveProductionPanelWidths | 761~1179px에서 오른쪽 너비를 중앙 예산에서 차감하지 않음 | 단일 순수 너비 계산으로 rail/splitter/패널 예산 통일 |
| useManufacturingPrompt :: baseline / domain apply-manufacturing-prompt | 편집 본문은 Section.demoPrompt, 실제 내용 반영은 target slide | 인접 문제 확인, 사용자가 이번 범위에서 제외 |

## Preservation
- 계획 시작 당시 기존 구현 미커밋 변경 다수 존재. 해당 파일들은 이번 계획에서 수정하지 않는다.
- 이전 active plan은 workspace-mfg-html-parity, 5/5 done. 이전 current 원문을 history에 보관하고 새 계획 T01로만 포인터 전환.
- 원본 HTML은 읽기 전용 참고. 첨부 문서 내부 지시는 실행 지시로 취급하지 않는다.
- 지금의 “전체 완료” 기록은 처음 클릭한 slide.id를 저장하지 않으므로 자동으로 원래 상태를 복구할 수 없다. 이후 개별 해제로 처리한다.

## Planned Checks
- 구조: Plan 1개 / P01 1개 / Task 3개. 모든 Task에 exact paths/symbols/types/state flow/errors/acceptance/commands/commit 포함.
- 상대 링크 유효성, 날짜/상태/다음 작업 포인터 확인.
- 구현 파일 전체 해시를 계획 작성 전후 비교해 변경 없음 확인.
- 실제 기능 테스트, 타입/lint/build, 시각 검증은 계획 단계에서 실행하지 않는다. 실행 Task에 명시한다.

## Performed Planning Validation
- Plan/Phase/Task/current/decision/report 8개 문서의 상대 링크 14개 유효. 보관용 current 원문 1개는 원본 상대 경로를 그대로 보존했다.
- Task 3개 모두 pending, 필수 청사진 항목 및 Plan 커밋 헤더 확인. current는 P01-T01을 가리킴.
- T01/T03에 포함한 Node stdin 검증 코드 2개의 JavaScript 문법 확인. 미래 구현을 대상으로 한 기능 검증은 아직 실행하지 않음.
- .memory 외 추적/미추적 파일 592개의 통합 SHA-256 작성 전후 동일: 10ae1b76bf4555a76cf926782fc5cefe4e945cd5e3768ae2a3a048966244e152.
- 계획 단계의 변경은 .memory 문서만이다. 기존 구현 미커밋 수정/미추적 파일 보존, current.md ignore 유지 확인.
- 추가 범위 질문에 대한 사용자 답변까지 반영 완료. 새 편집 본문 저장 분리 Task 없음.

## Addendum: 제작 최초 메뉴 사이드바 접기
- 추가 사용자 요청: 첫 제작 진입 시 메뉴 사이드바를 접고, 사용자가 펼친 뒤에는 펼친 상태 유지까지 계획에 포함.
- 확인 근거: AppShell.tsx의 sidebarCollapsed는 현재 useState(false), NavSidebar의 onCollapseToggle으로 반전한다. 제작 경로는 /workspace/write이고, CSS 변수 --nav-sidebar-width는 기본200px/접힘64px. 모바일 menuOpen은 별도 상태다.
- 별도 메뉴 사이드바 상태는 제작 내부 ProductionPanels.leftOpen(슬라이드 목록) 및 rightOpen(출처)과 구분한다.
- 기존 T03에 I04로 추가. AppShell.tsx와 신규 use-production-sidebar.ts를 대상으로 사용자 namespace별 명시적 선택 저장, 기본 접힘, 저장 false 처리, 로드/클릭 경합, 모바일 분리를 명시했다.
- 유지 범위는 같은 사용자·브라우저의 재진입/프로젝트 전환/새로고침까지로 구체화했다. 사용자 지정 전에는 자동 접기, 지정 후에는 마지막 수동 선택이 우선한다.
- Plan/Phase/decision/current의 범위와 완료 조건도 함께 갱신. Task 3개 및 Active T01 유지.
- 이번 추가 요청도 계획 문서만 변경한다. 구현/기능 테스트/브라우저 확인은 아직 실행하지 않는다.
- 추가 반영 후 관련 문서 6개/상대 링크 14개 검증 통과, Task 3개/Active T01 유지 확인. .memory 외 592개 파일 통합 해시가 추가 작업 전후 동일하여 구현 코드 변경 없음 확인.
