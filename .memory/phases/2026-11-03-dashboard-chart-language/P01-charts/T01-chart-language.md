# T01: 데이터별 차트와 팔레트 적용
## Status: done
## 구현 계약
- app/admin-theme.css / config/dashboard-charts.ts: 차트 전용 토큰·의미별 색·ID 기반 분류 색 매핑. 기존 상태 색/전역 브랜드색 유지.
- lib/admin/chart-data.ts: ChartSegment(Pick<NamedCount,id|label|count>+color+optional failures), 구성 요약 함수(상위5+기타, 합계/실패 보존).
- components/admin/ui/AdminCompositionChart.tsx: SVG Ring(기본/compact) 및 도넛/누적 띠+수량·비율·실패 범례. 빈 합계 처리. 범례는 선택 콜백 유무에 따라 공통 Button 또는 정적 행.
- AdminCharts.tsx: 시계열 color/area 선택적 속성, 기존 기본값 보존. AdminBreakdown dot 표현 및 ID 색 옵션. 필요 시 AdminDotTrack.tsx로 공통 점·선 분리.
- RfpStatusPanel.tsx: 기존 5상태 버튼을 링/범례로 변경, 선택→동일 조건 RFP 목록 유지.
- DepartmentSnapshot.tsx: 공통 점 트랙과 부서 ID 색, 상위4/전체 부서 이동 유지.
- DashboardOverview.tsx/DashboardActivitySummary.tsx: 진행·Token 카드와 요약 아이콘의 의미별 색을 차트와 연결.
- UsageTrendPanel.tsx/DashboardPage.tsx: auto|bar|line 선택 상태. auto는 활동 청록 영역·Token 보라 막대·활성 사용자 황토색 선. 실제 일별 데이터와 수치 표 유지.
- ActivityBreakdownPanel.tsx: 액션 도넛/리소스 누적 띠와 전체 분류 펼침(10개 페이지), 업무 상세 dot. 전체 자료 기준 척도 유지.
- UserActivityPanel.tsx: 총 활동/성공률 셀을 compact Ring으로 표현. success=activities-failures, 활동 없을 때 —. 사용자의 숫자 열·검색/페이지 유지.
- AdminSeriesChart 막대 간격은 포인트 수에 비례해 제한해 90일/좁은 컨테이너에서도 고정 간격 누적으로 넘치지 않게 한다.
## 수용 기준
- 4개 화면에서 데이터에 맞는 복수 차트 형태·팔레트를 확인할 수 있다.
- 색상·순위·페이지와 무관하게 분류 정체성이 유지되고 색에만 의미를 의존하지 않는다.
- 구성 합계/기타 수량, 사용자 성공/실패·0건, 기간/필터, 키보드 목록 이동 및 기존 통계가 정확하다.
## 검증
- npm.cmd run typecheck / lint / build, git diff --check, 정적 데이터 매핑·0건·분류 요약·콜백 검토.
- tests/ 생성·복원·수정 없음. 브라우저·E2E·dev server 검증 제외. 기존 테스트 결과를 이번 통과 결과로 쓰지 않는다.
## 구현 및 검증 결과 (2026-11-03)
- 개요: RFP 상태 구성 도넛/선택 가능한 범례, 부서별 점 트랙 적용. 기간별 등록 막대/구간별 목록 이동 유지. 진행·Token 지표 및 활동 요약 아이콘의 의미별 색 연결.
- 작업·리소스: 액션 도넛, 리소스 누적 띠, 업무 상세 점 트랙. 요약은 전체 자료를 기준으로 상위5+기타로 구성하며 전체 항목/실패 수/10개 페이지를 펼쳐 확인 가능.
- 사용량: 추천 기본 모드(활동 청록 영역, Token 보라 막대, 활성 사용자 황토색 선). 전체 막대/선 전환, 원본 일별 수치 표 유지.
- 사용자: 전체 활동 수 + 성공/실패 링 + 성공률. 활동 없으면 중립 링/—. 검색, 이메일/아바타, 기존 모든 수치 열, 10명 페이지 유지.
- typecheck, lint, build, git diff --check 통과. build의 baseline-browser-mapping 데이터 갱신 안내는 비차단 경고로 남음. 의존성 변경 없음.
- 정적 검토: 구성 요약이 원본 배열을 변경하지 않고 전체 합계와 실패 수를 보존함. RFP 5개 표시 상태의 합계는 원본 6상태 전체 합계와 동일(검토+작성=진행). 상태 선택 시 기간 유지/구간 해제/첫 페이지/목록 포커스 연결 유지.
- 정적 검토: 사용자 activities/events와 failures/failure events가 같은 집계 범위이며 outcome이 success|failure이므로 차감으로 성공 건수 계산 가능. 빈 데이터/0건에서 0 나눗셈 방지. 모든 분류에 숫자·범례/접근성 설명 제공.
- 정적 검토: 부서/분류 색은 ID로 고정, 업무 상세는 리소스 ID 기준. 상세 페이지의 점 척도는 전체 항목 최댓값 기준. 90일 막대 간격 합계는 컨테이너 너비의 40% 미만으로 제한.
- tests/ 생성·복원·수정/테스트 실행 없음. 브라우저/E2E/시각 검증 미실시(지속 사용자 지침). 로컬 단일 커밋, push 없음.
## 커밋
feat(dashboard): 의미별 팔레트와 도넛·점·추이 차트 적용

Plan: 2026-11-03-dashboard-chart-language
Phase: P01-charts
Task: T01-chart-language
