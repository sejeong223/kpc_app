# Task: T03 화면 내부 카드·필터·표·입력 영역 이관

## Status: done

## Goal

공통 외곽 안에서도 화면별로 남아 있는 16/20px 카드 패딩, 필터 margin, 표의 이중 패딩을 정리한다. 사용자 설정·활동 로그·대시보드·모델/토큰·Skill·Template·홈/관리자에서 같은 역할은 같은 토큰과 카드 조합을 사용한다.

## Decision Summary

- AppShell과 WorkspacePage는 T02에서 연결돼 있다. 이 Task는 내부 간격만 변경하며 제목/바깥 패딩을 다시 추가하지 않는다.
- 필터/폼은 inset, 표는 flush 카드. PPT 문서의 여백(cm/pt)/SVG/차트 수치/권한/버전/Query는 화면 간격과 구분한다.

## Implementation

### I01. 공통 어댑터·표·페이지 이동·상태

- Related Files:
  - `components/admin/ui/AdminPrimitives.tsx` :: `AdminCard`, `AdminCardProps`, `AdminMetric` — 공통 카드 위임; modify
  - `components/layout/WorkspaceCard.tsx` :: `WorkspaceCard`, `WorkspaceCardSection` — T01 공통 구현; modify (직접 문단 margin 정규화)
  - `components/layout/WorkspaceToolbar.tsx` — T01 공통 필터 flex; read-only
  - `components/admin/ui/AdminTable.tsx` :: `AdminTable` — 셀/empty 간격; modify
  - `components/admin/ui/AdminPager.tsx` :: `AdminPager` — margin 소유 제거; modify
  - `components/admin/ui/AdminPeriodFilter.tsx` :: `AdminPeriodFilter` — Toolbar 적용; modify
  - `components/admin/ui/AdminAsyncState.tsx` :: `AdminAsyncState` — 상태 간격; modify
  - `components/admin/ui/AdminTabs.tsx` :: `AdminTabs` — 별도 외곽 간격이 없는 기존 스크롤 탭; read-only
  - `components/admin/ui/AdminCharts.tsx` :: `AdminSeriesChart`, `AdminBreakdown` — 바깥 안내/데이터표/목록 간격; modify

#### Details

- **Signatures & Types**: 선행 Container 계약 및 어댑터를 아래와 같이 사용한다.

```typescript
interface WorkspaceCardProps {
  title?: string; actions?: React.ReactNode; children: React.ReactNode;
  className?: string; bodyPadding?: "inset" | "flush";
}
interface WorkspaceCardSectionProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  afterHeader?: boolean;
}
interface WorkspaceToolbarProps extends Pick<WorkspaceCardProps, "children" | "className"> {
  align?: "center" | "end";
}
type AdminCardProps = WorkspaceCardProps;
function AdminCard(props: AdminCardProps): React.ReactElement;
```

- AdminCardProps는 전체 Container의 타입 별칭을 사용한다. 독립적으로 같은 속성을 복사하지 않는다. 기존 `AdminTable<Row extends { id:string }>`와 `AdminPagerProps {page:number;total:number;pageSize:number;onChange(page:number):void}`는 API 변경 없이 유지한다.
- **Data & Schema Fields**: 새로운 도메인 타입/DTO 없음. `bodyPadding="inset"`, `afterHeader=false`, Toolbar align=end가 기본값. section/card=12px, control=8px, inline=4px 변수는 `app/layout-tokens.css`가 소유한다.
- **Execution Flow / Logic**:
  1. AdminCard는 WorkspaceCard에 전부 위임한다. 기존 색상/테두리/radius/aria-label/title/actions/className을 보존한다. 기존의 별도 p4/header mb3를 삭제한다.
  2. WorkspaceCard inset body는 flex column/gap section, p card(헤더 있으면 pt0), flush body는 p0/gap0이다. WorkspaceCardSection은 p card/gap section, afterHeader는 pt0이다. 공통 body/section의 **직접 자식 p**만 margin0으로 정규화해 기본 p margin과 gap이 더해지지 않게 한다. 전역 `p {margin:0}` 규칙을 추가하지 않는다.
  3. AdminMetric의 p4→card-inset, gap1→inline-gap. 버튼/선택 aria-pressed/onClick/tone/24px 수치 typography 유지.
  4. AdminTable의 일반 셀 px3/py3는 table-cell-inset을 참조한다. 기존 overflow-x-auto/region/tabIndex/caption/selection/expanded/sort/aria-sort를 그대로 유지한다. empty 문단의 큰 margin만 역할 간격으로 바꾸고 메시지는 보존한다.
  5. AdminPager의 자체 mt3를 제거한다. inset 카드 안에서는 부모 gap, flush 표 뒤에서는 CardSection의 padding이 간격을 제공한다. 내부 gap2/1은 control/inline. 번호 생성·총개수·이전/다음 disabled 로직 그대로다.
  6. AdminPeriodFilter는 WorkspaceToolbar로 감싸고 검증 중 draft/PeriodSchema/maxDate/30·90일/올해/전체 handlers를 그대로 둔다.
  7. AdminAsyncState는 padding=card-inset, gap=section, min-height=empty-min-height. 의미 있는 160px 상태 높이는 유지하며 loading/error/forbidden/empty role, retry를 보존한다. 이미 패딩을 소유하므로 flush body에서 다시 CardSection으로 감싸지 않는다.
  8. AdminTabs는 자체 외곽 간격이 없으므로 부모 WorkspacePage의 section-gap으로 충분하다. Fluent Tab 내부 간격을 덮어쓰지 않고 스크롤 reveal/ref/키보드 구조를 유지한다. AdminCharts의 figcaption/상세표 margin=section/control, breakdown gap=section, 작은 label gap=inline. SVG viewBox720×200, 막대 높이160/208, 수치 비율/버킷 계산·색상은 유지한다. 그래프 데이터표의 compact cell p2는 control-gap이다.
  9. 순수 UI 이동에는 HTTP 예외/롤백 없음. 아래 각 화면의 query state/error notice/서버 권한/command payload와 상태 전이를 보존한다.

### I02. 표 카드 조합과 화면별 명시적 매핑

- Related Files: 아래 표의 모든 경로는 `components/admin/` 기준이며 **각 export 이름은 파일명과 동일**하다. 표에 적은 UI 래퍼/간격만 modify한다.

| 경로 | 구체적인 변경 |
| --- | --- |
| `users/UsersPage.tsx` | 역할 metric grid gap=section. ‘사용자 목록’ 카드 flush; 검색/역할/상태/표시개수·notice/undo/error·UserBulkActions를 첫 CardSection(afterHeader)에 넣고 UserTable은 직계 flush, Pager는 마지막 CardSection |
| `users/UserBulkActions.tsx` | 자체 mb3 삭제. 강조된 선택 영역의 p3→card, 내부 gap2→control. 선택 해제/상태변경/삭제 권한 분기 유지 |
| `users/UserTable.tsx` | 관리 버튼 묶음 gap1→inline만 변경. 선택된 ID, 최신 row/version, 편집/삭제 열 권한 그대로 |
| `users/GroupsPanel.tsx` | ‘그룹 관리’ flush. 검색/undo/error를 첫 CardSection; 표 flush; pager 마지막 CardSection; 기존 GroupEditor/삭제 Modal 분기와 portal 유지 |
| `users/RolePermissionsPanel.tsx` | inset 카드 유지. role section mb5 제거 후 부모 section-gap. 역할 제목 margin0, CRUD 표 compact 셀 p2→control. 체크박스/조회 해제 시 CUD 해제/슈퍼 고정 권한 보존 |
| `audit/AuditPage.tsx` | metrics gap section. ‘로그 조회’ inset, ‘활동 내역’ flush; status/error Section, AuditTable flush, pager Section |
| `audit/AuditFilters.tsx` | 바깥 gap3→section, 각 필터 행→Toolbar. 기간/사용자/작업/리소스/성공실패 검색·초기화 그대로 |
| `audit/AuditDetail.tsx` | 상세 dl grid gap3→section, dt/dd 문단 margin0. 원문 값/마스킹/내보내기 의미 변경 없음 |
| `dashboard/DashboardPage.tsx` | 2개 metrics grid gap3→section. 공통 조회 기간 inset, 탭/누적기간 경고 유지 |
| `dashboard/RfpDashboardPanel.tsx` | 그래프/분포 inset, grid gap4/3→section. ‘부서별 RFP 현황’과 ‘RFP 목록’만 flush; RFP pager는 Section. 버킷/상태 클릭과 page reset 보존 |
| `dashboard/ActivityBreakdownPanel.tsx` | 3개 분포 카드 grid gap4→section; 카드 안은 공통 inset |
| `dashboard/UsageTrendPanel.tsx` | 차트 종류 액션 묶음은 Toolbar align=center+끝 정렬. 각 차트 inset, 3개 차트와 상태 값 그대로 |
| `dashboard/UserActivityPanel.tsx` | ‘사용자별 활동’ 카드 flush. 검색은 기존 header actions 유지, 사용자 집계 표에 추가 래퍼 패딩 없음 |
| `policy/ModelTokenPage.tsx` | 탭/자식 사이 WorkspacePage 간격 사용. 별도 마진 중복만 제거, 요청 탭/URL/슈퍼·부서 관리자 분기 유지 |
| `policy/ModelDefaultsPanel.tsx` | inset, 업무별 셀 p4→card, grid gap3→section. ‘변경 저장’/초안/실패 유지 |
| `policy/PricingPanel.tsx` | ‘모델별 단가와 환율’ flush. 적용 시점 설명은 첫 Section(afterHeader), 단가표 flush, 환율 폼/notice/error는 마지막 Section 안의 Toolbar. 행 단가 draft/fx version/충돌 불러오기 보존 |
| `policy/TokenOverviewPanel.tsx` | 조회기간/부서/정책은 inset, metric grid gap section. 개인별 토큰 카드 flush: 검색/안내 Section, TokenAccountsTable flush. 모델별 비용 카드 flush: ModelCostTable 직계 |
| `policy/TokenAccountsTable.tsx` | 행 조작/입력 주변 control/inline gap만 통일. 수량 파싱·부서 범위·권한/편집 동작 그대로 |
| `policy/ModelCostTable.tsx` | AdminTable 구성 유지. 자체 래퍼 간격이 있으면 부모 중복만 제거 |
| `policy/TokenPolicyForm.tsx` | form grid gap3→section, 입력/액션 묶음 gap control. 할당/알림/정책값 검증 그대로 |
| `policy/TokenRequestsPanel.tsx` | ‘토큰 추가 신청’ flush, notice/error Section(afterHeader), AdminTable 직계. 승인/거절 중 disabled·권한·pending count 유지 |
| `assets/AssetListPanel.tsx` | Skill/Template 두 목록 모두 flush. mb4 필터를 Section(afterHeader)+Toolbar로 대체, 표 직계, pager Section. 모든 `data-asset-*`와 grant/capabilities 조건 유지 |
| `assets/AssetVisibilityField.tsx` | fieldset p3→card, 후보 grid gap3→section, 칩 gap1→inline, 내부 margin2→control. 선택된 공개 대상/전체 공개/미선택 비공개 뜻 유지 |
| `assets/AssetVersionBadge.tsx` | 버전/상태 묶음 gap1→inline, 배지 안 px2/py1→control/inline. 적용 버전과 최신 버전 문구 그대로 |

#### Details

- 카드 조합의 기준: `AdminCard(bodyPadding="flush") → CardSection(afterHeader, 필터·공지) → 기존 Table → CardSection(Pager)`. title 없는 카드의 첫 Section은 afterHeader=false다. 중간 Section이 없는 단독 표 카드는 header와 Table만 둔다.
- 필터가 권한/조건으로 없으면 비어 있는 Section을 남기지 않는다. loading/error는 공통 AdminAsyncState가 패딩을 소유하며 table/pager를 중복 렌더하지 않는다.
- Toolbar 외곽에 mb/mt를 남겨 부모 gap과 중복하지 않는다. 표 셀 안에서 아이콘/보조정보가 한 열을 구성하는 소규모 들여쓰기와 실제 콘텐츠 읽기 폭은 별도 역할을 유지한다.
- 검색 변경 시 page1/선택 초기화, 정렬 방향, pagination clamping, CSV 다운로드, 실행취소, grants read/update/delete 조건을 바꾸지 않는다. 개별 서비스/hook 수정은 이 Task에 필요하지 않다.

### I03. Skill 입력과 Template 작업 화면

- Related Files: 모두 modify하되 지정한 외부 UI 레이아웃만 변경한다.
  - `components/admin/skills/SkillEditorPage.tsx` :: `SkillEditorPage`
  - `components/admin/skills/SkillRuleFields.tsx` :: `SkillRuleFields`
  - `components/admin/templates/workbench/TemplateWorkbench.tsx` :: `TemplateWorkbench`
  - `components/admin/templates/workbench/TemplateWorkList.tsx` :: `TemplateWorkList`
  - `components/admin/templates/workbench/TemplateApplyOptions.tsx` :: `TemplateApplyOptions`
  - `components/admin/templates/workbench/SharedDesignEditor.tsx` :: `SharedDesignEditor`
  - `components/admin/templates/workbench/TemplateResultsPanel.tsx` :: `TemplateResultsPanel`
  - `config/skill-options.ts`, `lib/admin/assets/schemas.ts`, `lib/pptx/`, `types/admin-assets.ts`, `services/admin/TemplateWorkService.ts`, `components/admin/skills/SkillStylePreview.tsx`, `components/admin/templates/workbench/TemplateSlidePreview.tsx` — 문서/변환 엔진 계약; read-only

#### Details

- **Signatures & Types**: 기존 `SkillRules`, `SkillDraft`, `TemplateWork/WorkView`, `ResultQuery {scope,slideIndex,filter,query}`와 각 component props 그대로. UI 토큰은 CSS string만 사용하며 저장된 데이터에 추가하지 않는다.
- SkillEditorPage form/root/2열 grid의 gap5/3→section. 1번 기본정보 fieldset 및 9번 공개 범위의 p4→card, 소규모 입력/actions gap→control. T02의 공통 header/heading ref/formId/dirty guard/preview 실측 offset 유지.
- SkillRuleFields 2~8번 fieldset 각각 p4→card, section gap5→section, 입력 grid gap3→section, 라벨/컨트롤 gap→control. fieldset/legend/aria-invalid/name/disabled/옵션을 유지한다. 상속 option과 59select+4checkbox=63개 서식 필드는 하나도 숨기거나 합치지 않는다.
- 8번 페이지 유형 표는 기존 최소폭720px/overflow-x-auto를 유지한다. 표 셀의 UI 여백은 table-cell/compact 역할로 통일하되 `mg.*`, `gap.*`, `table.padV/padH`, cm/pt 값은 그대로다. `config/skill-options.ts`의 0.5cm/12pt 등을 CSS 간격으로 치환하지 않는다.
- TemplateWorkbench 상태 박스 p3→card, 2열 grid gap4→section. 현재 적용설정/마스터·레이아웃 카드 inset 유지. 재적용·다운로드·닫기·불변 snapshot/새 버전 알림을 변경하지 않는다.
- TemplateWorkList는 inset 카드; 안내 p margin0, li py3→card, row/actions gap2→control. 작업 열기/버리기 콜백 유지.
- TemplateApplyOptions는 group gap section, checkbox 행 gap control, fieldset p card. 선택 슬라이드/문서보존/제외/보호 설정값 유지.
- SharedDesignEditor는 외곽 gap section/inset card, 세부 필드 gap control, details 간격 control. 공유 변경 예약/해제, 허용 appearance/position/fill 조건과 cm 입력값 보존.
- TemplateResultsPanel root gap4→section. 비교 슬라이드/2열 미리보기 사이의 mt3는 부모 gap과 중복하지 않게 제거. 결과 filters→Toolbar, 결과 article p3→card, 목록 gap2→control. inset 카드 안 pager는 부모 gap을 사용한다. warnings/details 여백은 section/control로 연결한다. scope/filter/page20/선택된 요소/상세 그룹 결과·미지원 사유 보존.
- readonly에 대한 버튼/폼 노출은 지금과 동일해야 한다. 스냅샷 버전이나 상태전이 로직을 간격 변경 편의상 바꾸지 않는다.

### I04. 홈과 관리자 내부 패널

- Related Files:
  - `app/(authenticated)/page.tsx` :: `DashboardPage`, `componentStyles` — 홈 패널; modify
  - `app/(authenticated)/admin/page.tsx` :: `AdminPage`, `componentStyles` — 관리자 패널; modify

#### Details

- 두 페이지의 T02 WorkspacePage는 유지한다. 내부 자체 panel/header/body를 WorkspaceCard로 이관한다. title은 각각 ‘내 워크스페이스’, ‘관리자 워크스페이스’; ‘기본 공간’/‘Admin’ badge는 actions에 유지한다.
- 홈 기존 empty-state의 min-height400/350과 padding56/24·40/20을 제거한다. 공통 empty-min-height를 사용하고 부모 카드가 패딩을 소유한다. 장식 그림116×100/회전/SVG/앞뒷장 좌표는 유지하되 그림과 문구 사이 margin28은 section-gap으로 바꾼다.
- ‘워크스페이스가 준비되었습니다’, 빈 콘텐츠 설명, ‘모든 업무를 위한 하나의 시작점’, 메뉴 안내 문구는 보존한다. panel-footer의 강제 높이50과 caption mt22는 제거하고 일반 문단/영역 gap으로 배치한다. 홈 전용 footer는 AppShell 앱이름 footer와 혼동하지 않는다.
- 관리자 content padding32/28 및 header24/28은 제거하고 공통 Card가 소유한다. ‘관리자 권한이 확인되었습니다’와 후속 설명은 본문에 유지한다. requireRole 위치는 그대로다.
- 불필요해진 heading/panel/spacing CSS만 삭제하고 그림의 도형·색상 CSS는 남긴다. 공통 카드 adoption 외의 전역 테마 변경은 하지 않는다.

### I05. 기능·조합 검증

- Related Files:
  - `tests/components/admin/skill-reference.test.ts` — 63개 필드/값/readonly 계약; read-only
  - `tests/components/admin/skill-access.test.ts`, `tests/components/admin/template-access.test.ts` — 권한/표 조작; modify (필요한 조합 검증만)
  - `tests/components/admin/skill-editor-layout.test.ts` — T02 폼 유지 검사; read-only
  - `tests/integration/skill-template-workflow.test.ts`, `tests/lib/admin/`, `tests/lib/pptx/` — 기존 도메인 회귀; read-only

#### Details

- 기존 access 테스트의 실제 AssetListPanel 렌더에 대해 표 이름/버튼의 유무가 래퍼 변경 후에도 동일한지 유지한다. 필요한 경우 jsdom click으로 검색·정렬·다음 page callback의 값과 불허 버튼 미렌더만 보강한다. 카드 DOM 구조를 그대로 복제하는 테스트는 만들지 않는다.
- 63개 field/name/options, 조회 전용63개 disabled 및 필드가 details로 접히지 않는 계약을 유지한다. 페이지 설명을 접는 것과 설정 항목을 숨기는 것은 다르다.
- 결과 panel의 pager 부모 변경이 page/scope/filter callback을 바꾸지 않는지 기존 integration 및 template-results 검사로 확인한다. 도메인 결과 fixture를 새 여백에 맞춰 수정하지 않는다.
- 정적 검토에서 위 파일별 변경 목록과 실제 diff를 대조한다. `gap-*`, p/m 숫자 검색 결과는 의미를 분류한다. 도형 크기/표 최소폭/아이콘 크기/스크롤 높이까지 12px로 바꾸는 일괄 정규식을 쓰지 않는다.

## Acceptance Criteria

- [x] AdminCard는 공통 구현 하나를 사용하고 표 카드는 필터/표/pager의 패딩 소유가 분리된다.
- [x] 위 목록에 있는 화면 내부 간격이 역할 변수로 연결되고 page padding을 중복하지 않는다.
- [x] 홈/관리자 자체 24~56px 영역 여백·과도한 empty 높이는 공통 기준으로 바뀐다.
- [x] Skill 63개 필드·Template 분석/재적용·CRUD·필터·페이지 이동·상태 안내가 보존된다.
- [x] 문서 cm/pt·SVG/차트 비율·코멘트 좌표·서비스 계약 diff가 없다.

## Validation

- `npm.cmd test -- tests/components/admin tests/components/layout tests/integration/skill-template-workflow.test.ts tests/lib/admin tests/lib/pptx`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `git diff --check`
- 정적 검토: `rg -n 'tw:(gap-[3456]|p-[456]|m[bt]-[3456])' components/admin`의 잔여를 역할별 분류한다. 단순 검색0개를 통과 기준으로 삼지 않는다.
- [브라우저 제외 정책](../../../decisions/2026-10-30-task-validation-policy.md) 유지. T04에서 최종 build/전체 테스트를 수행한다. 이 Task의 jsdom 통과는 실제 화면 픽셀 검증이 아니다.

## Commit Message

```text
refactor(layout): 업무 카드와 표·폼 간격을 공통 기준으로 이관

Plan: 2026-11-02-workspace-spacing-system
Phase: P01-shared-workspace-layout
Task: T03-screen-spacing-migration

- 관리자·Skill·Template의 카드/필터/표 중복 패딩 제거
- 홈·관리자 패널과 폼 간격을 역할 토큰으로 연결
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: batch (Plan 헤더로 git log 조회)
- 다음 Task: `T04-overlays-regression-handoff.md`. 통과 후 Status/Phase/current 갱신.

## 실행 기록

- 2026-11-02: 지정31개파일110개 테스트 및 typecheck/lint/diff 검사 통과.
- 레이아웃 역할에 해당하는 Tailwind 유틸리티만 지정 파일 목록에서 이관했다. 문서/스키마/서비스/변환 엔진은 변경하지 않았다. SkillStylePreview는 외부 aside 패딩/제목 간격만 추가 이관했다.
- 잔여 p4/gap3는 T04의 Template 팝업 대상이다.
