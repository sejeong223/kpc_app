# Task: T01 대시보드 구성 교체

## Status: done

## 파일·심볼·모델

- `components/admin/dashboard/DashboardPage.tsx`: 헤더 우측 기간, 두 KPI 섹션과4개 탭. 하위보기 제거. `DashboardUiState`: departmentPage/userPage/focusRfpList/chartKind/breakdownPages. 분류 페이지 Record<"actions" | "resources" | "details", number>.
- 같은 폴더 `RfpSummary.tsx` 신규, `DashboardActivitySummary.tsx`: 지표의 아이콘·단위·캡션·실제 집계 안내.
- `RfpDashboardPanel.tsx`, `RfpResultsPanel.tsx` 신규, `RfpDepartmentsPanel.tsx`, `RfpRecordsPanel.tsx`: 1.4:1 차트 배치, 분포/수주율/금액/Drop, 부서 구성, 필터 칩·목록10개.
- `rfp-presentation.ts` 신규: RfpStatus별 색상·순서·수주율/구성 항목.
- `UsageTrendPanel.tsx`: 활동과 토큰/활성 사용자2열, 공통 막대/선.
- `ActivityBreakdownPanel.tsx`: 액션/리소스2열과 업무 상세, 분류별10개 페이지·전체척도.
- `UserActivityPanel.tsx`: 활동 비율 막대·실패 강조. 검색 입력 초점과10개 페이지 유지.
- `components/admin/ui/AdminPrimitives.tsx`: AdminMetric optional icon/unit/색상. 기존 기본 출력 보존.
- `AdminPeriodFilter.tsx`: optional compact 모드(날짜/프리셋 select), 공통 PeriodSchema 검증, 기존 기본 모드 유지.
- `AdminCharts.tsx`: 누적 막대 추가, 차트 높이·축 눈금 개선, 정확한 수치 표 유지.
- `DashboardQuery`/`DashboardView`와 서비스/스키마/권한은 기존 타입 유지.

## 수용 조건

- 초기 RFP에 KPI11개/등록·분포/부서 표/목록을 함께 표시한다.
- 구간 선택 후 분포·목록 갱신, 상태 선택은 구간 유지. KPI·부서는 전체 기간 기준. 개별 필터 해제, 기간 변경 시 페이지 초기화.
- 최근90일 안내,0건/오류/재시도/권한/검색 초점 유지. 원본 하드코딩 사용자수/단가/최대6부서는 복사하지 않는다.
- 공통 여백, 반응형, 접근성. 고정 세로 스크롤 추가 없음.

## 검증

- 로컬 `tests/components/admin/dashboard-ux.test.ts`: 구성/분포·0건/필터/페이지 독립성/3개 추이·집계/검색 초점/권한·오류/기간 입력.
- `npm.cmd test -- tests/components/admin/dashboard-ux.test.ts tests/lib/admin/selectors.test.ts tests/lib/admin/chart-data.test.ts tests/integration/admin-mock-workflow.test.ts`
- `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`, `git diff --cached --check`.
- 브라우저/E2E/스크린샷/dev server 제외. tests는 stage하지 않는다. 픽셀 동일성·스크롤 높이 측정을 주장하지 않는다.

## 커밋

```text
refactor(dashboard): 기획 HTML 기준 지표와 차트·목록 구성 재정비

Plan: 2026-11-02-dashboard-proposal-layout
Phase: P01-proposal-layout
Task: T01-dashboard-layout
```

## 실행 결과

| 기획 HTML 요소 | 구현 |
| --- | --- |
| 헤더 우측 날짜·프리셋·활동 로그 | 공통 기간 컴포넌트 compact 모드, 조건부 로그 링크 |
| RFP6개·활동5개 KPI | 공통 AdminMetric 아이콘/단위/캡션, 모든 탭에서 확인 |
| 등록 추이·결과 분포 1.4:1 | 넓은 화면2열, 좁은 화면1열; 기간 구간 선택 연동 |
| 누적 분포·범례·비율 | 공통 AdminStackedBar 및 상태 버튼; 수주율/금액/Drop |
| 부서별 현황·결과 구성 | 등록 수 정렬, 전체 허용 부서10개 페이지, 같은 색상 구성 막대 |
| RFP 목록 | 같은 화면에 배치, 독립적인10개 페이지, 구간/상태 표시·개별/전체 해제 |
| 사용량 트렌드 | 활동 차트와 토큰/활성 사용자2열, 공통 막대/선, 정확한 수치 펼침 |
| 작업·리소스 상세 | 액션/리소스2열, 업무 상세2열 목록, 분류별10개 페이지·동일 척도 |
| 사용자별 현황 | 활동 막대/실패 강조,10개 페이지, 검색 중 입력 초점 보존 |

- 등록 구간·범례 선택은 화면을 자동 이동시키지 않는다. 명시적인 목록 이동 버튼에만 초점 이동을 연결했다. KPI 클릭은 RFP 탭으로 전환하고 상태 필터를 적용한다.
- 서비스/스키마/권한/집계 코드는 변경하지 않았다. 원본의 고정 토큰 단가·사용자 수·상위6부서 제한은 복사하지 않았다. 이메일은 현재 DTO에 없어 이름/부서 검색을 유지했다. 기존 예상 비용도 보존했다.
- 공통 카드/간격·표·탭·페이지·버튼을 재사용했다. 차트의0값은 높이0으로 표시하며 선 차트는 막대와 같은 높이를 사용한다. 새 의존성과 전역 여백 변경은 없다.
- 검증 통과: 관련4파일24개 테스트 → 전체78파일593개 테스트, typecheck, lint, Next16 프로덕션 build. 새 구성 기준 대시보드10개 테스트는 순서/집계 비율/필터/독립 페이지/빈 결과/기간 오류/권한/재시도/검색 초점을 다룬다.
- 첫 타입 검사에서 이전 테스트 props와 빈 페이지 fixture의 totalPages 누락을 확인하고 수정했다. 수정 후 타입 검사와 전체 테스트가 통과했다.
- Vite 설정 loader와 baseline-browser-mapping의 기존 경고는 실패가 아니다. 의존성 변경은 하지 않았다.
- 사용자 정책에 따라 브라우저/E2E/스크린샷/dev server는 미실시했다. 실제 화면의 픽셀 일치나 스크롤 길이는 측정하지 않았다.
- tests는 로컬에만 보관하며 커밋에 포함하지 않는다. 구현14파일 및 결정/계획/Phase/Task4파일을 단일 로컬 커밋한다. 실제 hash는 current와 완료 응답에 기록한다.
