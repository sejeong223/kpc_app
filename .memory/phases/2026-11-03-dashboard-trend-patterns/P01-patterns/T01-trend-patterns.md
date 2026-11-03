# T01: 히트맵과 주별 Token 차트
## Status: done
## 구현 계약
- lib/admin/chart-data.ts: ChartPoint에 표용 tableLabel?:string 추가, CalendarChartWeek extends Pick<ChartPoint,id|label>(days:(ChartPoint|null)[]), WeeklyChartPoint extends ChartPoint(from,to,days) 정의. 날짜/비음수/중복 날짜 검증, UTC 날짜 연산으로 주차 정렬 및 월요일 기준 주별 합계 생성. 0과 누락 구분, 입력 불변 유지.
- components/admin/ui/AdminChartDataTable.tsx: 기존 정확한 수치 표를 공통화. label/points/unit/summary 속성. 기본 동작 유지.
- components/admin/ui/AdminCalendarHeatmap.tsx: 주차×요일 표, 날짜별 공통 Button/색 강도/값 표시, 빈칸·0·빈 기간 처리. 호버/선택한 날짜의 정확한 값, 방향키/Home/End로 이동하는 단일 탭 진입점, 강도 범례·전체 일별 표 제공. 좁은 화면에서는 차트 영역만 가로 스크롤.
- components/admin/ui/AdminCharts.tsx: 공통 데이터 표 사용 및 축 단위 줄바꿈 방지. 등록 차트 등의 기본 동작 유지.
- components/admin/dashboard/UsageTrendPanel.tsx: auto 기본은 활동·활성 사용자 히트맵/Token 주별 합계. 일별 막대·선 선택 유지. 주별 표의 정확한 기간과 별도 원본 일별 표 유지.
## 수용 기준
- 추천 모드에서 톱니 선과 90개의 좁은 Token 막대가 보이지 않는다.
- 원본 일별 값, 0건 날짜, 합계, 조회 범위가 보존되며 부분 주와 0건/자료 없음이 구별된다.
- 활성 사용자는 일별 값을 그대로 표시하며 주별 고유 인원처럼 합산하지 않는다.
- 색상뿐 아니라 값·범례·표로 읽을 수 있고 날짜 확인은 마우스/키보드/버튼 선택을 지원한다.
## 검증
- npm.cmd run typecheck / lint / build, git diff --check, 정적 데이터·날짜 경계·키보드 이동 검토.
- tests/ 생성·복원·수정/실행 없음. 브라우저·E2E·dev server 검증 제외. 미실시 검증을 통과로 표기하지 않는다.
## 구현 및 검증 결과 (2026-11-03)
- 기본 패턴 보기에서 활동/활성 사용자 히트맵과 주별 Token 합계 막대 적용. 기존 일별 막대/선 보기 유지. 조회 범위/집계 원본/다른 탭 변경 없음.
- 공통 AdminCalendarHeatmap, AdminChartDataTable 및 월요일 기준 날짜 계산 함수를 추가. 기존 공통 버튼, 차트 팔레트, PeriodSchema 날짜 검증 재사용. 의존성 변경 없음.
- 히트맵은 선택/호버한 날짜의 정확한 수치, 단일 Tab 진입점과 방향키/Home/End, 0건/집계값 없음 구분 및 원본 수치 표 제공. 기간 변경 시 선택한 날짜가 사라지면 마지막 실제 날짜로 복귀. 좁은 화면의 넘침은 차트 영역 내부에서 처리.
- 주별 Token은 입력에 존재하는 각 날짜를 정확히 한 번 합산. 표/툴팁에 첫 실제 날짜~마지막 실제 날짜를 표시하며, 첫/마지막 부분 주를 7일로 추정하지 않음. 원본 일별 표 별도 유지. 활성 사용자는 일별 고유 인원을 그대로 표시하고 합산하지 않음.
- typecheck/lint/build 및 git diff --check 통과. build의 기존 baseline-browser-mapping 갱신 안내는 비차단 경고로 남음.
- 정적 검토: 입력 날짜 정렬은 배열 복사본으로 처리, 잘못된 날짜·중복 날짜·음수/비유한 수치 거부. UTC 요일 연산으로 월/연도 경계에서 주차 분리, 빈 배열·전체 0건 및 null 칸에서 0 나눗셈 방지. 기존 등록 막대의 선택 콜백 유지.
- tests/ 생성·복원·수정/테스트 실행 없음. 브라우저·E2E·시각 검증 미실시(지속 사용자 지침). 로컬 단일 커밋, push 없음.
## 커밋
feat(dashboard): 사용량 추이를 히트맵과 주별 토큰 차트로 개선

Plan: 2026-11-03-dashboard-trend-patterns
Phase: P01-patterns
Task: T01-trend-patterns
