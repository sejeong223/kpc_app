# T01: 대시보드 필터 결과를 상단에서 확인
## Status: done
## 구현 계약
- components/admin/dashboard/DashboardPage.tsx: DashboardUiState.rfpView:"records"|"statistics", 기본 records. 공통 WorkspaceActionRow/SegmentedControl로 4개 탭과 보기 전환 배치. RFP 목록은 KPI 바로 다음 콘텐츠. 활동 요약은 관련 활동 탭에 표시.
- RfpSummary.tsx: 선택된 카드 재클릭도 해당 상태를 전달. 상위 콜백에서 등록 구간 해제·첫 페이지·RFP 목록 보기를 설정한다.
- RfpDashboardPanel.tsx → RfpStatisticsPanel.tsx: 차트/분포/부서만 담당. onShowList(query:DashboardQuery)로 차트 선택·목록 보기 연결.
- RfpResultsPanel.tsx: onSelectStatus(status:DashboardQuery["rfpStatus"]) 분리. 구간 해제는 통계에 유지하고 범례 선택은 목록으로 연결.
- RfpRecordsPanel.tsx: rows?:DashboardView["rfps"], error?:string, onRetry(). 조건·결과 요약을 로딩/오류에도 유지. 기존 데이터 표·페이지 재사용. 요청된 초점은 preventScroll:true.
- 서비스·스키마·기존 집계 계약 변경 없음. 등록 기간/권한/가격/10행 조회 유지.
## 수용 기준
- 초기 진입과 상단 카드 선택 시 목록 앞에 차트·부서 표·활동 KPI가 없다.
- 모든 상단 상태 선택/반복 선택은 해당 조건의 목록 1페이지를 바로 표시한다.
- 등록 구간을 선택한 뒤 상단 카드를 누르면 카드 수량과 같은 전체 기간 상태 목록을 보여준다.
- 통계·차트·사용량·사용자 기능을 보존하고, 조회 중에도 목록 조건을 확인/해제할 수 있다.
- 강제 하단 스크롤 없음. 카드 초점 유지, 차트 전환 시 목록 초점 접근성 유지.
## 검증
- 기존 dashboard-ux 테스트를 새 사용자 흐름으로 갱신. 초기 목록/통계 전환·KPI·차트 연결·필터 해제·10행·상태 보존·비동기 로딩/오류·권한 범위를 검증.
- npm.cmd test -- --maxWorkers=4, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- 브라우저/수동 UI/E2E/스크린샷 제외. 테스트 로컬 보관.
## 커밋
fix(ui): 대시보드 상태 선택과 RFP 목록을 가까이 연결

Plan: 2026-11-02-dashboard-direct-results
Phase: P01-results
Task: T01-direct-results

## 완료 및 검증 결과
- RFP 요약 → 탭/목록·통계 전환 → 목록 순서로 표시. 목록·통계 패널 분리, WorkspaceActionRow/SegmentedControl/AdminTable/AdminPager 재사용.
- 카드 선택은 등록 구간을 해제하고 해당 상태 1페이지로 연결. 반복 선택도 같은 상태 유지. 차트/범례 선택은 해당 조건의 목록으로 전환하고 초점은 preventScroll로 이동.
- 동일 기간 요약 쿼리는 목록 필터와 분리하여 조회 지연/실패에도 수량 유지. 초기 동일 키 요청은 React Query가 공유한다. 목록 조건과 재시도/해제 UI는 로딩·오류에도 유지.
- npm.cmd test -- --maxWorkers=4: 84개 파일 / 643개 테스트 통과. 대시보드 12개: 기본 목록, 통계·활동 보존, 차트 연결, 필터 해제, 반복 선택·페이지 초기화, 로딩·실패·재시도, 초점, 권한 범위 포함.
- npm.cmd run typecheck / lint / build 및 git diff --check 통과.
- 기존 Vite 설정 로더·baseline-browser-mapping 경고만 확인. 의존성 변경 없음.
- 사용자 정책에 따라 브라우저·수동 UI·E2E 검증 미실시. 테스트는 로컬 전용으로 유지하고 커밋에서 제외.
