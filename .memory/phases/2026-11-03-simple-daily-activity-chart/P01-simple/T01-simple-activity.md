# T01: 일별 활동 막대 차트 단순화
## Status: done
## 구현 계약
- components/admin/ui/AdminCharts.tsx / AdminSeriesChartProps: variant?:"default"|"simple" 추가. default 동작 유지. simple 막대는 120px 플롯/168px 전체 높이, 단색 막대, 0/최대값 눈금, 처음/중간/끝 날짜, 화면에서 중복 설명 생략(접근성 설명 유지). 빈 데이터/0건/정확한 수치 표 유지.
- components/admin/dashboard/UsageTrendPanel.tsx: auto 히트맵은 activeUsers에만 적용, activities는 simple 일별 막대로 렌더링. 일별 막대 선택에도 simple 적용. 사용자가 명시적으로 선택하는 선 보기와 토큰·사용자 표시 방식 유지.
- 데이터 스키마·집계·권한·의존성 변경 없음. 조회 기간 내 원본 일별 값과 0건 날짜 유지.
## 검증
- npm.cmd run typecheck / lint / build, git diff --check, 분기/원본 값/빈 상태/다른 차트 기본값 정적 검토.
- tests/ 생성·복원·수정/테스트 실행 없음. 브라우저·E2E·dev server 검증 제외.
## 구현 및 검증 결과 (2026-11-03)
- 일별 활동의 기본 표시를 단색 청록 막대로 변경. 기존 공통 차트에 simple 표현을 추가해 낮은 높이, 최대 3개 날짜 눈금, 0/최대 축, 중복 설명 생략 적용. 원본 수치/0건/데이터 표 유지.
- 정적 검토: auto에서 activeUsers만 히트맵, tokens는 기존 주별 합계/원본 표, activities는 원본 일별 막대. 명시적 선 보기 및 다른 차트의 default 옵션/선택 콜백 유지. 빈 배열 분기와 최대값 최소1 처리로 0 나눗셈 방지.
- typecheck/lint/build 및 git diff --check 통과. 기존 baseline-browser-mapping 데이터 갱신 안내는 비차단 경고로 남음. 의존성 변경 없음.
- tests/ 생성·복원·수정/테스트 실행 없음. 브라우저/시각 검증 미실시(지속 사용자 지침). 로컬 단일 커밋, push 없음.
## 커밋
feat(dashboard): 일별 활동을 간결한 막대 그래프로 변경

Plan: 2026-11-03-simple-daily-activity-chart
Phase: P01-simple
Task: T01-simple-activity
