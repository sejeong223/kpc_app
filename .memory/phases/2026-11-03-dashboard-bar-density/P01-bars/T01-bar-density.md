# T01: 막대 폭·간격·구간 이동 공통화
## Status: done
## 구현 계약
- components/admin/ui/AdminBarChart.tsx: AdminBarChartProps(label,points,unit,color?,selectedId?,onSelect?,compact?) 정의. 넓은 막대/상단 값/기간 라벨/전체 자료 기준 축. ResizeObserver로 구간당 약64px 확보, 최대14개 표시. 이전/다음 공통 Button, 현재 인덱스/기간 표시. 기본 최신 구간, 초기 selectedId가 있으면 해당 구간을 포함. 날짜 ID 기준 끝 구간 상태로 크기 변경 시 날짜 유지, 빈 값/0건/누락된 anchor 처리, observer 정리.
- components/admin/ui/AdminCharts.tsx: AdminSeriesChartProps extends Omit<AdminBarChartProps,compact>에 kind/area/variant 추가. 막대 분기를 공통 컴포넌트로 위임. 기간 첫/마지막 ID key로 조회 범위 변경 시 초기화. 전체 수치 표·선 그래프·RFP 선택 콜백 유지.
- 데이터 스키마/집계/API/권한/의존성 변경 없음. 모든 날짜·0건·원본 수치 보존, 현재 화면에 없는 항목은 이전/다음으로 조회.
## 검증
- npm.cmd run typecheck / lint / build, git diff --check.
- 정적 검토: 이전/다음 끝 경계, 첫 부분 구간, 크기/기간 변경, selectedId, 전체 기준 고정 축, 클릭 원본 ID·전체 표 유지, 빈 데이터/0건.
- tests/ 생성·복원·수정/테스트 실행 없음. 브라우저·E2E·dev server 검증 제외.
## 구현 및 검증 결과 (2026-11-03)
- 공통 AdminBarChart로 일별 활동/토큰/RFP 막대를 통합. 최대44px 단색 기둥, 상단 수치, 모든 표시 구간의 라벨, 옅은 가로 보조선 적용. 숫자 축은 전체 기간의 최댓값을 올림한 고정 척도 사용.
- 약64px 구간 폭과 최대14개를 기준으로 화면 크기에 맞게 표시 개수 조정. 기본 최신 구간, 이전/다음 이동 및 현재 범위/전체 개수 제공. 원본 값/0건은 집계·제거하지 않고 전체 수치 표도 유지.
- 정적 검토: 90개/14칸의 이전 이동은 끝 인덱스 90→76→62→48→34→20→6, 이후 처음 구간에서 멈춤. 다음 이동은 전체 개수로 제한. 모든 구간에 접근 가능하며 0건도 수치 라벨로 표시.
- 정적 검토 중 선택된 첫 항목/화면 확장 시 일부 데이터가 숨는 경계를 수정: 전체가 들어가면 항상 전체 표시, 초기 선택 구간도 표시 개수만큼 확보. 기간 key 변경 시 새 조회 범위로 초기화. observer/animation frame/resize listener 정리 확인.
- 기존 원본 ID 선택/선택 해제 콜백, 전체 자료 표, 선/히트맵 및 데이터 서비스 유지. 소스 변경은 AdminBarChart 추가와 AdminCharts 연결로 제한.
- typecheck, 전체 lint 및 최종 변경 파일 lint, 최종 build, git diff --check 통과. 기존 baseline-browser-mapping 데이터 갱신 안내는 비차단 경고로 남음. 의존성 변경 없음.
- tests/ 생성·복원·수정/테스트 실행 없음. 브라우저·E2E·시각 검증 미실시(지속 사용자 지침). 로컬 단일 커밋, push 없음.
## 커밋
feat(dashboard): 넓은 막대와 반응형 구간 탐색 적용

Plan: 2026-11-03-dashboard-bar-density
Phase: P01-bars
Task: T01-bar-density
