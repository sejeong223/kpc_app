# Task: T01 요약·상세 분리와 회귀 검증

## Status: done

## 파일·심볼·계약

- `components/admin/dashboard/DashboardPage.tsx`: 기존 4개 탭/기간을 상단에 배치. `RfpView = "overview" | "list" | "departments"`, `UsageMetric = "activities" | "tokens" | "activeUsers"`, `BreakdownKind = "actions" | "resources" | "details"`와 각 페이지/초점 요청은 UI state로 관리. 조회 DTO는 기존 `DashboardQuery` 유지.
- `DashboardActivitySummary.tsx` (같은 폴더 신규): `view?: DashboardView`의 총 활동/활성 사용자/AI 생성/다운로드/토큰·예상비용 5개 지표와 실제 집계 기간 안내. 로딩 중에도 지표 틀 유지.
- `RfpDashboardPanel.tsx`: 6개 RFP 지표를 이 탭 내부로 이관. 요약/목록/부서별 전환. 요약은 추이·분포를 큰 화면2열로 배치하고 선택 구간 통계4개를 dl로 유지. 지표/차트 클릭은 조회 조건 설정 후 목록 이동.
- `RfpRecordsPanel.tsx` (신규): 기존 RFP 표/페이지/필터 표시. 드릴다운 완료 후 접근 가능한 목록 region에 초점. 조회는 기존 서버식 page result 사용.
- `RfpDepartmentsPanel.tsx` (신규): 기존 부서 표를 기존 paginate와 DEFAULT_PAGE_SIZE로 10개씩 표시. 조회 기간 전체 집계 의미·열 유지.
- `UsageTrendPanel.tsx`: 선택 지표 하나만 렌더. 차트 종류와 지표 선택을 분리하며 정확한 데이터 표 유지.
- `ActivityBreakdownPanel.tsx`: 집계 기준 선택, 로컬10개 페이지, 큰 화면2열 막대 목록. 레이블과 실패 건수 유지.
- `UserActivityPanel.tsx`: `view?: DashboardView`, page/onPageChange 및 error/onRetry props. 입력은 조회 중에도 렌더 유지, 허용된 결과를10개로 paginate. 검색 변경 시 부모에서 page1.
- `components/admin/ui/AdminCharts.tsx`: `AdminBreakdownProps`에 optional `columns?: 1 | 2`, `maxCount?: number` 추가. 기본값은 기존1열과 자동척도. 페이지 처리하는 활동 집계만2열·전체척도 사용.
- 기존 `config/pagination.ts`, `AdminTabs`, `SegmentedControl`, `AdminTable`, `AdminPager`, `WorkspaceCardSection`, `AdminPeriodFilter`, `paginate`를 재사용한다.

## 보존·오류 처리

- `DashboardQuery`/`DashboardView` 스키마·서비스·집계 함수·금액 계산·인증/권한 변경 없음. UI state를 데이터 모델에 저장하지 않는다.
- 메인 탭 이동 후 선택 지표/차트 종류/상세 페이지를 유지한다. 기간 변경은 bucket/RFP·사용자·부서·집계 페이지를1로 초기화한다.
- 로딩/오류/권한 없음 구분. 데이터 조회 실패 시 재시도 제공. stale 데이터와 오류가 함께 있으면 오류를 표시한다.
- 90일 활동 집계와 RFP 전체 기간의 차이를 해당 탭에서 명시한다. 부서 표는 bucket/status 필터가 아닌 공통 기간 기준임을 표시한다.
- 자동 드릴다운 후 목록 초점을 복원하고, 키보드 선택 가능한 기존 탭/라디오/버튼을 사용한다. 카드 내부 고정 세로 스크롤은 추가하지 않는다.

## 검증

- 로컬 `tests/components/admin/dashboard-ux.test.ts`: 기본 요약만 렌더, 상태/차트→목록 필터·초점, 탭 상태 보존, 단일 차트·종류, 집계·사용자·부서10개 페이지/검색·기간 초기화, 검색 입력 포커스, 권한과 오류 재시도.
- `npm.cmd test -- tests/components/admin/dashboard-ux.test.ts tests/lib/admin/selectors.test.ts tests/lib/admin/chart-data.test.ts tests/integration/admin-mock-workflow.test.ts`
- `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`
- `git diff --check`, `git diff --cached --check`
- 브라우저/E2E/스크린샷/dev server 미실시. 실제 픽셀 높이나 스크롤 감소율을 측정했다고 표현하지 않는다.

## 커밋

```text
refactor(dashboard): 요약 중심 탐색으로 스크롤과 정보 밀도 개선

Plan: 2026-11-02-dashboard-compact-ux
Phase: P01-compact-dashboard
Task: T01-compact-dashboard

- RFP 요약과 목록·부서 현황을 분리하고 조건별 탐색 연결
- 사용량·활동 집계를 선택형 차트와 10개 페이지로 정리
- 기존 집계·권한·검색·접근성을 유지하고 로컬 회귀 검증
```

## 완료

- [x] 구현
- [x] 검증
- [x] 기록·이 Task의 단일 로컬 커밋에 포함
- commit: Plan 헤더로 git log 조회

## 실행 기록

- 공통 조회 영역의 별도 제목 높이를 줄이고4개 탭을 지표 앞에 배치했다. 모든 탭에 반복되던11개 지표를 RFP6개/활동5개로 나눴다.
- RFP 첫 화면에서 추이·분포와 선택 구간 통계를 제공하고 표는 목록/부서별 보기로 분리했다. 지표·차트 선택 시 조건을 유지한 목록으로 이동하며 데이터 도착 후 목록 region에 초점을 준다. 등록 구간·상태는 각각 해제하거나 함께 초기화할 수 있다.
- 사용량의3개 세로 차트를 선택 지표1개로 전환했다. 막대/선·정확한 수치 표와 탭 이동 후 상태를 유지한다.
- 활동 집계 기준 선택과10개 페이지를 적용했다. 다음 페이지에서도 전체 분류의 최대값을 척도로 사용하여 막대 비율이 바뀌지 않는다.
- 사용자·부서 표는10개씩 표시하고 검색/기간 변경 시 첫 페이지로 돌아간다. 사용자 검색 입력은 조회 중에도 같은 DOM으로 유지하여 입력·초점을 보존한다.
- 서비스/lib/config 변경 없음. 기존 권한 범위와 계산식/집계 기간/반환 DTO를 유지했다. 공통 여백·카드·탭·라디오·표·페이지 컴포넌트를 재사용했다.
- 검증: 신규 대시보드8테스트 통과. 전체78파일591테스트·typecheck·lint·Next 프로덕션 build·diff 검사 통과. 초기 테스트의 Fluent 탭 폭 측정용 중복 텍스트 선택자를 수정한 후 전체 검사했다.
- 테스트 파일은 기존 결정대로 로컬에만 보관한다. 브라우저/E2E/스크린샷/dev server는 미실시이며 실제 픽셀 높이·스크롤 감소율을 측정하지 않았다.
- 인접 개선: 접근 조회 중의 권한 없음 표시를 로딩과 구분했고, 캐시 데이터가 있는 재조회 실패도 명시한다. 기존 Vite loader와 baseline-browser-mapping 경고는 검사 실패가 아니며 의존성 수정은 하지 않았다.
- 소스9파일과 결정/계획/Phase/Task 문서를 단일 로컬 커밋한다. 기존 2bdb593 커밋을 유지하며 push는 하지 않는다. 실제 hash는 로컬 current와 완료 응답에 기록한다.
