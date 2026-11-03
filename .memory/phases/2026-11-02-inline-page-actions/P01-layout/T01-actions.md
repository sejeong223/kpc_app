# T01: 탭·섹션 제목과 우측 액션 결합
## Status: done
## 구현
- components/layout/WorkspaceActionRow.tsx: WorkspaceCardProps에서 children/actions/className을 Pick한 props. Tailwind 공통 여백과 flex-wrap, 좌측 최소 너비·우측 정렬·좁은 폭 줄바꿈.
- components/admin/users/UsersPage.tsx: AdminPage.actions 제거, WorkspaceActionRow 안의 AdminTabs 및 사용자 탭 액션으로 이전. 다운로드/추가/권한/탭 상태 그대로 유지.
- components/admin/dashboard/RfpSummary.tsx: actions?:ReactNode 추가, 공통 행의 좌측 제목과 우측 액션 구성.
- components/admin/dashboard/DashboardPage.tsx: 날짜 필터/활동 로그 링크를 RfpSummary.actions로 이전. 기간 변경 상태 초기화·권한 검사·KPI 순서 유지.
- 새 데이터 타입·스키마·API 없음.
## 수용 기준
- 넓은 화면에서 각 대상 액션이 탭 또는 RFP 현황 제목과 같은 행 우측에 배치된다.
- 두 화면의 별도 데스크톱 헤더 줄이 제거되고 모바일 메뉴·접근성용 제목은 유지된다.
- 좁은 폭에서는 액션이 겹치지 않고 줄바꿈된다. 탭 가로 스크롤은 유지된다.
## 검증
- 기존 dashboard-ux 테스트의 날짜 필터 위치 조회만 새 영역으로 갱신.
- npm.cmd test -- --maxWorkers=4, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- 브라우저/수동 UI/스크린샷/E2E 제외. 테스트 파일 로컬 보관. 단순 CSS를 복제하는 신규 테스트 없음.
## 커밋
fix(ui): 사용자 설정과 대시보드 상단 액션 행 통합

Plan: 2026-11-02-inline-page-actions
Phase: P01-layout
Task: T01-actions

## 실행 결과
- WorkspaceActionRow의 좌측 콘텐츠·우측 액션 구조를 두 화면에서 재사용한다. 컨테이너 너비가 부족하면 행/액션이 줄바꿈되고 탭은 기존 가로 스크롤을 유지한다.
- UsersPage의 내보내기/추가 버튼을 탭 우측으로 이동했다. 사용자 탭에서만 표시되고 기존 권한·이벤트를 유지한다.
- 대시보드의 날짜 필터/활동 로그 링크를 RfpSummary 제목 우측으로 이동했다. 기간 변경 시 목록/차트 페이지 초기화, 로그 조회 권한, KPI 및 상세 탭 순서를 유지했다.
- 두 AdminPage에서 actions를 제거하여 공통 헤더의 기존 규칙에 따라 데스크톱 헤더 공간이 사라진다. 모바일 메뉴와 접근성용 h1은 그대로 유지한다.
## 검증 결과
- npm.cmd test -- --maxWorkers=4: **83개 파일/632개 테스트 통과**.
- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build 통과.
- 빌드 CSS에서 공통 행의 flex-[1_1_16rem] 규칙이 flex:16rem으로 정상 생성됨을 정적으로 확인했다.
- 기존 Vite/baseline-browser-mapping 비차단 경고 유지. git diff --check 통과.
- 기존 날짜 필터 테스트의 DOM 위치 조회만 갱신. 신규 테스트 없음. 테스트 파일은 로컬 보관한다.
- 브라우저·스크린샷·수동 UI/E2E 검증 미실시. 단일 로컬 커밋, push 없음.
