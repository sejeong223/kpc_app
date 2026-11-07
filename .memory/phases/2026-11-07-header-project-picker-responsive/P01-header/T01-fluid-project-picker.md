# Task: T01 프로젝트 선택 필드 가변 너비와 액션 줄 이동

## Status: done

## Goal

공통 프로젝트 헤더에서 고정 560px 선택 필드를 없앤다. 이름·메타는 각각 한 줄로 표시하고, 메뉴 버튼·프로젝트 선택·회차를 같은 묶음에 유지하면서 공간이 부족할 때 우측 액션을 다음 줄로 이동시킨다.

## Decision Summary

- 사용자 확정: “프로젝트 선택과 회차는 함께 두고, 공간이 부족하면 우측 버튼들을 다음 줄로 이동”. 필드 내부 긴 이름은 말줄임한다.
- Plan: 2026-11-07-header-project-picker-responsive / Phase: P01-header. 한 Task에서 부모 WorkspaceHeader와 자식 ProjectHeader를 함께 수정한다.
- 코드 조사 기준 HEAD: 6d459e7. 작업 시작 시 다른 변경을 확인하고 보존한다. 테스트 폴더/임시 검증 파일/브라우저/CUA/E2E/dev server/스크린샷 금지.
- DadamControls.tsx, common/Button.tsx의 구현과 버튼 디자인은 보호한다. 버튼 리팩토링은 이번 범위가 아니다.

## Implementation

### I01. 공용 헤더에 선택적 가변 leading 배치 제공

- Related Files:
  - components/layout/WorkspaceHeader.tsx :: WorkspaceHeaderProps, useStyles, WorkspaceHeader — modify.
  - components/layout/WorkspacePage.tsx :: WorkspacePageProps, WorkspacePage — read-only; headerRef·stickyHeader 높이 관찰 및 호출 계약 보존.
  - components/layout/WorkspaceNavigation.tsx :: WorkspaceNavigationValue/useWorkspaceNavigation — read-only.
  - components/layout/AppShell.tsx :: useStyles — read-only; 사이드바 200px/64px, 760px 이하 overlay.
  - components/ui/DadamControls.tsx, components/providers/DadamThemeScope.tsx — read-only.

#### Details

- **Signatures & Types**:

~~~typescript
export interface WorkspaceHeaderProps extends Pick<WorkspacePageProps,
  "title" | "showTitle" | "leading" | "actions" | "headingId" | "headingRef"> {
  headerRef?: React.Ref<HTMLElement>;
  sticky?: boolean;
  className?: string;
  /** 왼쪽 영역은 가변 너비, 액션은 남은 공간 부족 시 다음 줄로 배치한다. */
  fluidLeading?: boolean;
}
export default function WorkspaceHeader(props: WorkspaceHeaderProps): React.ReactElement;
~~~

- **Data & Schema Fields**:
  - 신규 UI prop fluidLeading: optional boolean; 기본 false; null 불가; 저장하지 않는다.
  - 기존 title:string, showTitle?:boolean, leading/actions?:React.ReactNode, headingId?:string, headingRef?:React.Ref<HTMLHeadingElement> 그대로.
  - headerRef/sticky/className 변경 없음. 도메인 모델·API·저장 스키마·DB 변경 없음.
  - 신규 스타일 키 fluidLeadingGroup, fluidActions. 공개 데이터 모델이 아닌 지역 makeStyles 클래스.

- **현 구조와 원인**:
  - WorkspaceHeader 바깥 header는 column이고 안쪽 toolbar div는 flex-wrap:wrap이다.
  - 그 안에 모바일 메뉴, leading, 표시 제목, actions가 현재 각각 형제다.
  - 모바일 메뉴는 760px 이하에서 40px로 나타난다. 선택 영역이 width:100%이면 메뉴와 같은 줄에 들어갈 공간이 없어 별도 줄로 밀린다.
  - 따라서 단순히 selector 너비를 100%로 바꾸거나 바깥 flex-wrap을 전부 끄는 방식은 사용하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation:
     - 기존 hasToolbar/heading/navigation 판정 및 기본 prop 값을 유지한다. fluidLeading 기본값 false를 함수 매개변수에서 처리한다.
     - 내부 너비를 window.innerWidth/useEffect/ResizeObserver로 계산하는 상태는 추가하지 않는다. SSR와 최초 클라이언트 트리는 동일한 prop에 따라 동일하게 생성한다.
  2. Core Processing:
     - 기존 메뉴 버튼 + leading + showTitle일 때 heading을 하나의 React fragment인 leadingContent로 구성한다. 버튼 생성 코드를 중복 작성하지 않는다.
     - fluidLeading=false: 기존대로 leadingContent를 toolbar에 직접 출력한다. DOM wrapper를 추가하지 않고 기존 액션 클래스/줄바꿈을 유지한다.
     - fluidLeading=true: leadingContent를 한 개 div.fluidLeadingGroup에 넣어 toolbar의 왼쪽 flex item으로 출력한다. 메뉴는 이 묶음 안에 들어가며 오른쪽 actions wrapper는 이 묶음의 형제로 남는다.
     - fluidLeadingGroup: display:flex; alignItems:center; flexWrap:nowrap; gap:var(--layout-control-gap); flex:1 1 20rem; minWidth:0; maxWidth:100%.
     - 20rem은 “왼쪽 묶음의 줄 배치 선호 기준”이다. 선택 필드의 고정 width/min-width가 아니다. flex-grow/shrink와 min-width:0 때문에 한 줄에서 남은 너비를 채우고, 단독 줄에서는 그 줄의 너비까지 줄어든다.
     - toolbar의 기존 flex-wrap:wrap을 유지한다. 왼쪽 선호 기준 + 액션 고유 너비 + gap을 수용하지 못하면 액션 묶음이 다음 줄로 간다. 사이드바 상태에 따른 실제 가용 너비가 배치에 반영되며 viewport 고정 breakpoint로 액션을 숨기지 않는다.
     - fluidActions: flex:0 0 auto; maxWidth:100%. 기존 ml-auto와 내부 flex-wrap:wrap 유지. 왼쪽과 같은 줄에서 액션 그룹을 억지로 축소하지 않고, 독립 행에서도 화면보다 넓어지지 않게 그룹 내부 버튼 줄바꿈을 허용한다.
     - 클래스 결합은 명시적 className/mergeClasses로 한다. ProjectHeader에서 공용 header의 “첫 div/직접 자식 div”를 찾아 덮어쓰는 구조 의존 CSS는 추가하지 않는다.
  3. Error & Exception Handling:
     - CSS와 prop 확장이라 새 예외/API 오류 없음. 원래 메뉴 토글·disabled·키보드 포커스 동작을 유지한다.
     - leading/actions가 없을 때 빈 새 액션 wrapper를 만들지 않는다. navigation=null인 독립 헤더도 정상 출력한다.
  4. State Transition & Return:
     - 상태 변경 없음. 메뉴 열기 버튼 id/aria-controls/aria-expanded/onClick, h1 위치/접근성, headerRef/sticky 전달은 기존과 동일하다.
     - 기존 WorkspacePage의 ResizeObserver는 header 높이 변경을 계속 반영한다. 별도 높이 고정·overflow:hidden을 헤더 전체에 추가하지 않는다.

### I02. 프로젝트 선택 버튼과 회차의 축소 계약 적용

- Related Files:
  - components/common/ProjectHeader.tsx :: useStyles, ProjectPicker, HeaderLoading, ProjectHeaderContent — modify.
  - components/common/ProjectHeader.tsx :: ProjectHeader, ProjectHeaderPage — 동작 보존.
  - components/common/Button.tsx :: Button/useButtonStyles — read-only; 기본 flex-shrink:0.
  - components/common/ProjectHeaderProvider.tsx :: HeaderState/useProjectHeader/selectProject — read-only.
  - types/workspace-header.ts :: WorkspaceProjectPickerItem/WorkspaceHeaderModel — read-only.
  - lib/workspace/production/header-selectors.ts :: getHeaderRoundLabel — read-only.
  - components/comments/CommentsWorkspace.tsx :: ProjectHeader 직접 호출 — read-only.

#### Details

- **Signatures & Types** (새 데이터 계약 없이 유지):

~~~typescript
export type ProjectHeaderProps = WorkspaceHeaderProps;
function ProjectPicker(props?: {
  open?: boolean;
  onOpenChange?(open: boolean): void;
  disabled?: boolean;
}): React.ReactElement;
function HeaderLoading(props: ProjectHeaderProps): React.ReactElement;
function ProjectHeaderContent(props: ProjectHeaderProps & {
  header: Extract<HeaderState, { status: "ready" }>;
  unavailable: boolean;
}): React.ReactElement;
~~~

위 반환 타입은 기존 추론 타입을 설명한다. 형식 통일만을 위한 무관한 서명 재작성은 하지 않는다.

- **Data & Schema Fields**:
  - WorkspaceProjectPickerItem 유지: id/name/number:string; organization/departmentName/dueDate:string|null; roleLabels:HeaderProjectRole[].
  - HeaderProjectRole은 PM/작성자/리뷰자/참여자/슈퍼 관리자 리터럴. 역할 값·순서·권한을 변환하지 않는다.
  - 회차 표시: currentRound/displayedRound:number, phase는 기존 상태, snapshotId:string|null, snapshotKind:complete|unfinished|null. getHeaderRoundLabel 결과를 그대로 출력한다.
  - picker 상태 {open:boolean, openedAt:number, error:string|null}, selecting:boolean, overlay 및 round 상태는 변경하지 않는다.
  - 신규 UI 문자열/DB 필드 없음. 전체 회차 문자열을 title에도 제공할 때 지역 const roundLabel로 기존 selector 결과를 재사용한다.

- **스타일 계약**:

| 대상 | 변경/유지할 규칙 |
| :--- | :--- |
| leading | display:flex; flex:1 1 0%; flex-wrap:nowrap; align-items:center; gap:8px; min-width:0; max-width:100%; 기존 760px 이하 width:100% 제거 |
| selector | width:auto; flex:1 1 0%; min-width:0; max-width:100%; flex-wrap:nowrap; white-space:nowrap. 기존 width:560px 및 760px 이하 width:100% 제거 |
| selector 외형 | height:auto/min-height:40px/padding:4px 10px/column-gap:10px/text-align:left와 Dadam 색·글꼴·선 유지 |
| summary | 기존 flex:1, min-width:0, column, gap:2px 유지 |
| name/meta | 기존 각각 nowrap/overflow:hidden/text-overflow:ellipsis 유지. 제목14/20/500, 메타12/16/400, 원문 title 유지 |
| selectorChevron (신규) | 트리거의 ChevronDown16Regular에만 width/height:16px, flex-shrink:0 적용 |
| selectorRole (신규) | 트리거 역할 배지에만 max-width:40%, min-width:0 적용. 공용 badge의 색/패딩/flex-shrink:0 유지 |
| badgeText (신규) | 배지 안 텍스트 span에 display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap |
| roundBadge | 기존 패딩 유지; max-width:50%; min-width:0. 외곽 badge의 flex-shrink:0 유지하고 안에 badgeText span 삽입 |

배지 제한은 매우 긴 복수 역할이나 “N차 미완성 이력 · 읽기 전용”이 프로젝트 필드의 공간을 전부 차지하지 않게 한다. 문구를 바꾸거나 숨기지 않으며 전체 문자열 title과 기존 접근성 텍스트를 유지한다. 숫자나 표시 상태를 하드코딩하지 않는다. 일반 popup의 optionStatus나 badge에 트리거 전용 축소 규칙을 전파하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation:
     - HeaderLoading과 ProjectHeaderContent의 두 WorkspaceHeader 호출 모두 fluidLeading을 명시적으로 켠다. 기존 props spread 뒤에 명시하여 호출부 유무와 무관하게 프로젝트 헤더의 규칙을 일치시킨다.
     - HeaderLoading의 props.leading과 props.actions, ready 헤더의 leading/actions 전달을 보존한다.
  2. Core Processing:
     - 선택 필드 width만 바꾸지 않고 위 leading/selector flex를 같이 적용한다. common/Button의 flex-shrink:0은 selector의 지역 flex shorthand로 덮어쓴다.
     - ProjectPicker의 selected 역할 문자열은 기존 join(" · ") 결과 유지. outer span에 기존 badge + selectorRole, 안쪽 span에 badgeText 적용. title 유지.
     - 회차 span은 선택 버튼과 같은 leading 안에 유지한다. roundLabel 전체를 title로 제공하고 안쪽 badgeText에 그대로 출력한다.
     - 드롭다운 내부 목록의 640px 및 최대 calc(100vw - 32px), 항목 클릭/역할/마감일은 그대로 둔다. 변경 대상은 접힌 트리거다.
     - 우측 재작업/완성본/완성/설정의 표시 조건·순서·크기·문구·disabled 상태·이벤트를 그대로 전달한다.
  3. Error & Exception Handling:
     - pending/selecting/빈 pickerItems에서 disabled 유지. state:error에서도 기존 오류 표시와 선택 경로 보존.
     - 선택 실패 시 기존 picker.error를 유지하고 상태를 임의로 성공으로 바꾸지 않는다.
     - 프로젝트 선택 시 choice.choose 초안 보호, runtime.isActive 확인, 포커스 복귀 및 댓글 UI suspend 처리를 건드리지 않는다.
  4. State Transition & Return:
     - 로딩→ready, 프로젝트 전환, 읽기 전용 snapshot/완성 상태 등에서 레이아웃 규칙만 동일하게 적용한다.
     - actions 개수 변화에 따른 행 이동은 CSS가 담당한다. 렌더링 중 window 분기, 새 useId/상태/ResizeObserver 또는 CSS 길이 측정 코드를 추가하지 않는다.

### I03. 회귀 범위와 검증 기록

- Related Files:
  - .memory/reports/2026-11-07-header-project-picker-responsive-validation.md — new, 실행 단계 검증 결과.
  - .memory/plans/2026-11-07-header-project-picker-responsive.md, 같은 phase.md와 본 Task — 진행률 갱신.
  - .memory/current.md — 실행 완료 포인터 갱신; ignored, 강제 stage 금지.

#### Details

- 다음은 정적 검토 매트릭스다. 자동 실측 결과로 기록하지 않는다.
  - 1440/1280/1024px: 사이드바 펼침200px/접힘64px 각각에서 왼쪽 그룹이 남은 너비를 사용하며 과거 560px를 강제하지 않는 구조.
  - 761/760px: 모바일 메뉴 등장/사이드바 overlay 전환 시 메뉴와 leading이 한 그룹이며 width100% 규칙으로 밀리지 않는 구조.
  - 375/320px: 왼쪽 그룹이 한 행까지 줄어들고 액션은 다음 행; 더 긴 snapshot 회차/복수 역할은 말줄임, 버튼은 줄바꿈으로 접근 가능.
  - 긴 제조업 프로젝트명, 공백 없는 긴 제목·기관명, 메타 null, 복수 역할, 1차/다차 재작업/완성/보관본 표시.
  - actions 없음/설정만/모든 액션, loading/idle/error/ready/unavailable/pending/selecting.
  - 기본 WorkspaceHeader(fluidLeading 미지정)의 기존 DOM, 메뉴 표시 조건, h1/aria/props 및 sticky ref 유지.
- 브라우저/CUA/E2E/dev server/스크린샷은 기존 정책상 실행하지 않는다. jsdom은 실제 CSS 레이아웃을 계산하지 못하므로 너비·줄바꿈 실측 통과 근거로 사용하지 않는다.
- 본 Task는 레이아웃 변경이며 새로운 테스트 파일이나 구현을 그대로 복제한 테스트는 만들지 않는다. 아래 타입/lint와 소스·diff 검토 결과를 보고서에 남긴다.

## Acceptance Criteria

- [x] 선택 필드 고정 width560 및 모바일 width100 규칙이 제거되고, flex를 통해 부모 남은 너비로 늘고 줄어든다.
- [x] 메뉴·프로젝트 선택·회차는 동일한 왼쪽 묶음이고, 공간 부족 시 우측 액션 묶음이 먼저 다음 줄로 이동한다.
- [x] 이름과 메타는 각각 한 줄 말줄임이며 전체 값 title/접근성 정보가 보존된다.
- [x] 복수 역할·긴 보관본 회차가 선택 필드 공간을 전부 잠식하지 않고, 트리거 화살표는 축소되지 않는다.
- [x] 로딩/오류/빈 프로젝트와 ready 경로에 같은 배치를 사용한다.
- [x] 일반 WorkspaceHeader 기본 배치/DOM, sticky 높이 관찰, 모든 헤더 이벤트·권한·읽기 전용 상태가 유지된다.
- [x] 공용 버튼/Provider/전역 CSS/프로젝트 데이터/파일 3열/제작 기능 변경이 없다.
- [x] 아래 검증이 통과하고 시각 검증 미실시와 별도 hydration 미해결을 정확히 기록한다.

## Validation

워크스페이스 루트의 PowerShell에서 순차적으로 결과를 확인한다.

1. `git status --short` — 시작 시 변경 목록 기록, 타 작업 덮어쓰기 금지.
2. `npm.cmd run typecheck` — exit0.
3. `npx.cmd eslint components/layout/WorkspaceHeader.tsx components/common/ProjectHeader.tsx --max-warnings=0` — exit0.
4. `git diff --check` — whitespace 오류 없음.
5. `git diff -- components/layout/WorkspaceHeader.tsx components/common/ProjectHeader.tsx` — I01~I02 외 이벤트/도메인 로직 변경 없음.
6. `rg -n 'fluidLeading|fluidActions|flex|width|760|selectorRole|badgeText|selectorChevron' components/layout/WorkspaceHeader.tsx components/common/ProjectHeader.tsx` — 스타일 계약 수동 대조. 모든 width를 삭제하는 검증이 아니다. popup640/아이콘16/액션34 등 유지되는 값과 구분한다.
7. `rg -n 'aria-|title=|selectProject|suspendUi|chooseSnapshot|round.open|settingsRef|pending|selecting|unavailable' components/common/ProjectHeader.tsx components/layout/WorkspaceHeader.tsx` — 접근성/이벤트 유지 정적 검토.
8. 보호 파일 및 변경 범위:

~~~powershell
if ((Get-FileHash -LiteralPath 'components/ui/DadamControls.tsx' -Algorithm SHA256).Hash -ne '56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84') { throw 'DadamControls changed' }
git diff --name-only
git diff -- components/common/Button.tsx components/common/ProjectHeaderProvider.tsx app/globals.css components/providers/FluentUiProvider.tsx components/workspace/files
~~~

마지막 diff는 이번 작업으로 인한 변경 없음. 시작 시 기존 타 작업 변경이 있으면 baseline과 구분해 기록한다. 타입/lint 통과만으로 실제 반응형 픽셀 동작 또는 Fluent hydration 해결을 주장하지 않는다.

## Commit Message

~~~text
fix(header): 프로젝트 선택 필드를 가용 너비에 맞춰 배치

Plan: 2026-11-07-header-project-picker-responsive
Phase: P01-header
Task: T01-fluid-project-picker

- 프로젝트 선택의 고정 너비와 축소 제한을 지역 스타일로 해제
- 메뉴와 프로젝트·회차는 묶고 공간 부족 시 액션을 다음 줄에 배치
- 기본 헤더와 공용 버튼 및 프로젝트 동작 유지
~~~

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 본 Task 식별자를 가진 완료 커밋 (해시는 current.md에 기록)

검증 후 Task/phase/plan을 done(1/1)으로 갱신하고 구현 2개 파일·이번 계획 문서·실행 기록만 명시적으로 stage하여 한글 커밋한다. current는 모든 Task 완료로 전진하고 커밋 해시를 기록한다. push/배포/패키지 추가/인프라 작업 없음.
