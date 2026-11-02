# Task: DADAM 입력 UI 통일
## Status: done
## 구현 계약
- app/dadam-tokens.css, app/globals.css, app/admin-theme.css: 색상·입력 높이·테두리·모서리·포커스 단일 원본.
- lib/ui/dadam-theme.ts, components/providers/FluentUiProvider.tsx: DADAM 테마 공용화.
- components/ui/DadamControls.tsx: Fluent Props를 재사용하는 Button/Input/Select/Textarea/Checkbox, ref와 슬롯·이벤트 보존, default/compact 크기 및 disabled/invalid/mixed/키보드 상태.
- components/ui/DateRangeFilter.tsx: value:{from:string,to:string}, presets:{id,label,from,to}[], onChange, maxDate, error. 날짜 2개와 기간 select, label·오류 연결 및 반응형 배치.
- components/admin/ui/AdminPeriodFilter.tsx: 기존 PeriodSchema 검증·draft 보존, 공통 날짜 UI 사용.
- components/admin/assets/AssetVisibilityField.tsx: 정렬된 선택 목록·선택 수·공개 상태 안내, 기존 props와 상태 계약 유지.
- components/admin 하위, components/layout/WorkspaceHeader.tsx: 공통 입력 컴포넌트 import로 교체.
- components/ui/SegmentedControl.tsx: 동일한 토큰으로 선택 상태와 높이 통일.
## 수용 기준
- 관리자 메뉴의 같은 종류 컨트롤을 단일 파일에서 수정 가능.
- 일반 입력 38px, compact 32px 및 날짜 너비 확보. 전체 테두리와 파란 선택/포커스 상태.
- 날짜 입력·프리셋·오류, 체크박스 label/mixed/disabled, 폼 submit/ref, 공개 대상 변경, 기존 관리자 기능 회귀 검증.
- 불필요한 별도 패키지 설치·데이터 계약 변경 없음.
## 검증
- 적절한 로컬 jsdom 동작 테스트, 전체 npm.cmd test, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- CSS 수치 복제 테스트 없음. 브라우저·E2E·시각 검증 제외, 테스트 로컬만 보관.
## 커밋
feat(ui): DADAM 공통 폼 컴포넌트와 필터 디자인 통일

Plan: 2026-11-02-dadam-form-controls
Phase: P01-controls
Task: T01-controls

## 실행 결과
- app/dadam-tokens.css를 높이·글꼴 크기·색상·테두리·모서리·포커스의 공통 원본으로 추가했다. 기본 입력/버튼은 38px, small은 32px, large는 44px 기준이며 텍스트 줄바꿈은 허용한다.
- DadamInput/Select/Textarea/Button/Checkbox를 구현했다. Fluent의 native 입력, Field 연결, 슬롯, ref, controlled 이벤트, disabled/mixed 상태를 유지한다. Checkbox의 tile 변형과 Button의 aria-pressed 선택 상태를 제공한다.
- 관리자 컴포넌트와 WorkspaceHeader 48개 파일의 직접 컨트롤 import를 공통 컴포넌트로 변경했다. AdminPeriodFilter는 별도로 공통 DateRangeFilter에 연결했다. 대시보드의 활동 로그 링크도 같은 토큰으로 높이를 맞췄다.
- 기간 필터는 날짜 2개+기간 선택으로 일원화했다. 기존 프리셋과 날짜 검증을 유지하고 오류를 양쪽 입력에 연결한다. 공개 범위는 부서/그룹/사용자별 영역·선택 수·선택 배경·스크롤로 구성했다.
- 전역 FluentProvider와 기존 DADAM 영역이 같은 테마를 사용한다. 기존 brand CSS 토큰도 파란 공통 토큰을 참조하며 오류·위험 의미 색상은 유지한다. SegmentedControl도 공통 높이와 파란 선택 상태를 사용한다.
- components/ui를 Tailwind 소스 경로에 추가했다. 새 라이브러리 설치나 데이터·권한·서비스 변경은 없다.

## 검증 결과
- 관련 화면·입력 검증: 3개 파일 24개 테스트 통과.
- 최종 전체 npm.cmd test -- --maxWorkers=4: **81개 파일, 617개 테스트 통과**.
- 초기 전체 동시 실행에서 기존 token-dialog-ui 테스트의 5초 timeout과 후속 act 오류가 발생했다. 해당 파일+공통 입력 테스트를 별도 실행해 9개 통과했고, 동시 실행 수를 줄인 전체 재실행도 통과했다. 테스트 제한 시간이나 검증 조건은 완화하지 않았다.
- 새 테스트의 FormData 대상 타입과 슬롯 속성 타입을 수정한 뒤 npm.cmd run typecheck 통과.
- npm.cmd run lint, npm.cmd run build, git diff --check 및 staged diff 검사 통과.
- tests/components/dadam-controls.test.ts의 6개 테스트는 폼 제출/Field·ref·슬롯, 체크박스 label·mixed·disabled, 선택 버튼, compact/일반 날짜 필터 오류·복구, 공개 대상 변경 계약을 검증한다. CSS 수치를 복제하는 테스트는 추가하지 않았다.
- 테스트는 기존 정책대로 로컬에서만 보관한다. 브라우저·수동 UI·E2E·스크린샷 비교는 수행하지 않았으므로 실제 렌더링의 시각적 일치까지 검증한 것으로 간주하지 않는다.

## 유지보수
- 디자인 수치 변경: app/dadam-tokens.css.
- Fluent 테마 연결: lib/ui/dadam-theme.ts.
- 입력 표현/공통 상태: components/ui/DadamControls.tsx. 기존 Fluent Props를 그대로 전달하며 체크박스는 variant="tile"로 선택 영역에 사용한다.
- 날짜 범위 배치: components/ui/DateRangeFilter.tsx. 업무별 기간 검증은 AdminPeriodFilter에 유지한다.
- 단일 로컬 커밋, 원격 push 없음.
