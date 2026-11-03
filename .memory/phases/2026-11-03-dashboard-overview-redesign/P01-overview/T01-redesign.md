# T01: 대시보드 전면 개선
## Status: done
## 구현 청사진
- DashboardPage.tsx: 기본 overview 탭 추가. DashboardUiState.rfpView에 departments 추가. 공통 도구 행에서 탭/기간/활동 로그 제공. RFP 상태는 해당 탭에만 작게 표시. summary/data의 실제 사용 탭에 맞는 로딩·오류·재시도 처리. 차트/카드→목록, 부서 요약→부서 표, 활동 요약→트렌드.
- AdminPrimitives.tsx/AdminMetric: variant default|insight 선택적 확장. 기본 외형 보존, insight에 숫자/아이콘/캡션 계층과 공통 Button 사용.
- dashboard/DashboardCard.tsx: WorkspaceCardProps 기반 공통 분석 카드.
- DashboardOverview.tsx: DashboardView·DashboardQuery 및 onShowList(query)/onOpenUsage()/onOpenDepartments() 콜백. 4개 지표, 등록 추이·상태 구성, 부서 요약·활동 요약.
- RfpRegistrationPanel.tsx: 공통 등록 차트 패널. 개요/상세에서 재사용. 실제 등록 구간과 onSelect를 연결.
- RfpStatusPanel.tsx/DepartmentSnapshot.tsx: 집계 상태별 막대와 상위4개 부서 등록 수. 전체/상태/부서 상세 동작 제공.
- DashboardActivitySummary.tsx: 공통 카드 안의 작은 5개 지표, 실제 활동 기간과 보관 제한 표시. 개요/활동 탭 재사용.
- RfpSummary.tsx: 대형 6카드 대신 공통 Button의 상태/수량 칩. RfpStatisticsPanel.tsx에서 부서 표 분리, 등록/분포 패널만 제공.
- RfpResultsPanel.tsx/UsageTrendPanel.tsx/ActivityBreakdownPanel.tsx: 공통 DashboardCard 사용과 시각 계층 정리. 기존 데이터·검색·빈 상태·표·페이지 유지.
- AdminCharts.tsx: 공통 시계열 차트에 간결한 축/막대/영역 선 표현. 실제 값만 사용, 0값과 빈 상태·정확한 데이터 표·키보드 선택 보존. 필요 시 AdminSeriesChart.tsx로 책임 분리.
- 기존 타입 DashboardView/DashboardQuery를 재사용하고 DB/서비스/패키지를 변경하지 않는다.
## 수용 조건
- 초기 개요에는 긴 상세 표가 없고 주요 수량·추이·구성·활동을 구분해 확인한다.
- 상태·등록 구간 선택 시 목록이 화면 상단 콘텐츠로 표시되며 강제 하단 스크롤이 없다.
- 통계/부서/사용자/작업 기능과 10행 페이지·이메일 검색·권한을 보존한다.
- 좁은 화면에서 카드/도구 행이 줄바꿈되고 최소 너비·가로 넘침을 제한한다. 단위·기간·색상 의미가 명확하고 장식 수치를 사용하지 않는다.
## 검증
- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- 정적 기능 매핑: 지표→목록 필터/1페이지, 차트→구간/전체 상태, 보기 전환·기간·개요 격리·오류 재시도·권한·이메일 검색 보존.
- tests/ 생성·복원·추가 없음. 기존 테스트/브라우저·수동 UI·E2E·dev server를 이번 검증으로 주장하지 않는다.
## 커밋
feat(dashboard): 개요 중심 대시보드와 공통 분석 컴포넌트 재설계

Plan: 2026-11-03-dashboard-overview-redesign
Phase: P01-overview
Task: T01-redesign

## 구현 결과
- 기본 화면을 개요로 전환했다. 등록 RFP·진행 중·수주율·토큰의 핵심 4지표 → 등록 추이/상태 구성 → 부서 상위4개/활동 요약 순서로 배치했다. 임의 비교율이나 실시간 상태는 추가하지 않았다.
- DashboardCard·RfpRegistrationPanel·AdminMetric insight를 재사용하고 부서/상태 요약을 별도 컴포넌트로 분리했다. 기존 공통 Button·탭·날짜·표·페이지·색상/간격 토큰을 사용했다.
- RFP 필터는 작은 상태 칩으로 전환하고 목록/추이·분포/부서별을 분리했다. 상단 카드·상태·등록 막대 선택은 목록 1페이지로 바로 연결한다. 등록 차트의 선택은 수량과 일치하도록 전체 상태 기준 해당 구간을 조회한다.
- 등록 차트의 막대·축 표현과 선 차트의 영역 채움/격자를 정리했다. 기존 수치 표·빈 결과·0값·선/막대 전환 유지. 전역 기본 AdminMetric 외형은 유지했다.

| 기존 요소 | 최종 위치 |
| --- | --- |
| 공통 기간·활동 로그 이동 | 5개 탭과 같은 도구 행, 권한에 따라 링크 렌더링 |
| RFP 6개 상태·필터 | 개요의 등록/진행/수주율 + 상태 구성, RFP 탭의 6개 상태 칩 |
| 등록 추이 | 개요와 RFP 추이·분포에서 공통 패널 |
| 분포·범례·수주율·수주 금액·Drop 비율 | RFP 추이·분포 |
| 부서별 수량·수주율·구성 | 개요 상위4개, RFP 부서별 전체 표/10개 페이지 |
| RFP 목록·7열·구간/상태 해제 | RFP 목록, 기존 10개 페이지 |
| 활동 5지표·예상 비용·실제 기간 | 개요/활동 관련 탭의 공통 활동 요약 |
| 일별 활동·Token·활성 사용자 차트 | 사용량 트렌드, 기본 영역 선·막대 전환 |
| 액션·리소스·업무별 상세 | 작업·리소스 탭 |
| 사용자별 집계·이메일/이름/부서 검색·아바타 | 사용자별 현황, 기존 공통 셀·10개 페이지 |

## 검증 결과
- npm.cmd run typecheck / lint / build: 통과. git diff --check 통과.
- 정적 검토: 개요/트렌드/작업/부서 요약은 기간 전체 쿼리, RFP 목록/분포·사용자 검색은 상세 쿼리. 기간 변경 시 구간·페이지 초기화, 상태 선택 시 구간 해제와 목록 1페이지. 각 화면 조회 실패는 해당 쿼리 재시도. 대시보드/활동 로그 권한 조건 유지.
- 키보드 상세 전환의 초점을 유지하고 preventScroll로 불필요한 하단 점프를 방지한다. 반응형 그리드·min-width:0·활동 지표 auto-fit으로 좁은 열 줄바꿈을 정의했다.
- 기존 baseline-browser-mapping 갱신 권고는 빌드 실패가 아니며 패키지를 변경하지 않았다.
- 최신 AGENTS.md에 따라 tests/ 생성·복원·수정 없음. 기존 테스트 실행·브라우저·수동 UI·E2E·dev server 검증은 이번에 수행하지 않았다. 실제 픽셀/스크롤 길이를 측정했다고 주장하지 않는다.
