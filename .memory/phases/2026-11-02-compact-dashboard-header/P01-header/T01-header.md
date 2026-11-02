# Task: 날짜 필터 축소와 공통 안내 제거
## Status: done
## 구현 계약
- components/ui/DateRangeFilter.tsx: compact?:boolean. 기존 value/presets/error 계약 유지. compact는 small 컨트롤·축소 너비·간격을 사용한다.
- components/admin/ui/AdminPeriodFilter.tsx: 기존 compact를 공통 날짜 필터에 전달한다.
- components/admin/dashboard/DashboardPage.tsx: 활동 로그 링크도 compact 높이로 정렬한다.
- components/ui/DadamControls.tsx: field disabled selector는 input/select/textarea에 한정한다.
- components/layout/WorkspaceHeader.tsx, WorkspacePage.tsx, components/admin/ui/AdminPrimitives.tsx: 설명·예시 안내 props 및 렌더 제거. 해당 JSX 호출부와 사용하지 않는 ASSET_DATA_NOTICE 상수/import도 정리한다.
## 수용 기준
- 기본 날짜 필터는 유지하고 대시보드 헤더는 작은 크기로 표시한다. 날짜 오류·프리셋·접근 가능한 이름을 보존한다.
- 모든 공통 헤더에서 예시 데이터·화면 안내를 렌더하지 않는다. 메뉴/제목 ref/저장 액션/입력값을 유지한다.
## 검증
- 기존 헤더/Skill 편집/화면 라우트 테스트 기대값 수정. 날짜와 대시보드 테스트 재사용. CSS 수치 복제 테스트 추가 없음.
- npm.cmd test -- --maxWorkers=4, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- 브라우저 검증 제외, 테스트 로컬 보관.
## 커밋
fix(ui): 대시보드 날짜 필터 축소와 헤더 안내 제거

Plan: 2026-11-02-compact-dashboard-header
Phase: P01-header
Task: T01-header

## 실행 결과
- DateRangeFilter에 compact 옵션을 추가하고 대시보드에서 전달한다. 날짜 160→132px, 기간 선택 144→112px, 높이 38→32px, 내부 간격 8→4px. compact의 중복 기간 라벨을 제거하되 fieldset legend와 각 입력의 접근 가능한 이름을 유지한다.
- 대시보드 활동 로그 링크도 공통 compact 높이로 정렬했다. 기본 날짜 필터와 날짜 검증·프리셋 동작은 유지한다.
- 공통 헤더의 예시 데이터·화면 안내 버튼·펼침 영역 및 관련 props/상수/import를 제거했다. 모든 공통 헤더 호출부에 적용했다.
- 공통 field의 disabled selector를 실제 input/select/textarea로 한정해 disabled option이 있는 활성 select가 회색으로 보이던 문제를 수정했다.

## 검증 결과
- npm.cmd test -- --maxWorkers=4: **81개 파일, 617개 테스트 통과**.
- 초기 전체 검사에서 제거된 안내 버튼을 클릭하던 제작 코멘트 테스트 1개가 실패했다. 헤더/제목 클릭이 핀을 생성하지 않는 동작으로 기대값을 갱신한 뒤 전체 재검사 통과.
- 기존 헤더·Skill 편집·워크스페이스 라우트·제작 코멘트 테스트를 갱신했다. 날짜 compact/기본 모드의 오류·프리셋 회귀 테스트도 통과했다.
- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check 및 staged diff 검사 통과.
- 테스트는 로컬에서만 보관한다. 브라우저·수동 UI·시각 비교 검증은 지속 정책에 따라 수행하지 않았다.
- 단일 로컬 커밋, 원격 push 없음.
