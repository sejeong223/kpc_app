# Task: T01 공용 헤더·프로젝트 선택·메뉴 연결

## Status: done

## Goal

여섯 프로젝트 화면이 하나의 헤더와 선택 상태를 사용하게 한다. 프로젝트 선택 시 헤더·리뷰 메뉴·토스트가 함께 바뀌고, 리뷰/완료한 제안 경로가 열린다. 기존 제작 화면의 핀과 다른 페이지의 헤더는 유지한다.

## Decision Summary

- UI 예시만 구현한다. 기본 `mois`, 대안 `edu`; 선택은 authenticated layout에서 공유하고 새로고침 시 초기화한다. 실제 인증·코멘트 저장·업무 모델은 변경하지 않는다.
- 새 생산 파일은 이 Task에서 config/Provider/ProjectHeader 세 개뿐이다. 기존 Button·WorkspaceHeader를 재사용하고 스타일은 TSX 내부 Griffel로 둔다. T02에서 완성/재작업/이력, T03에서 설정 버튼을 연결한다.
- **tests 폴더·테스트 파일 생성/복원, 브라우저·E2E·스크린샷·dev server 검증 금지.** 팀원 버전 `app/admin-utilities.css` 유지. 이 청사진은 구현 지시이며 현재 계획 단계에서는 실행하지 않는다.
- 근거: 2026-11-03-project-header 결정 D01~D04, D07~D14. HTML은 참고 자료이며 그 저장 스크립트/업무 전체를 이식하지 않는다.

## Implementation

### I01. 예시 데이터와 표시 규칙

- Related Files:
  - `config/project-header.ts` :: 예시 타입·PROJECT_HEADER_PROJECTS·파생 함수 — 헤더/후속 패널 공통 입력; new
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html` :: PROJECTS/SEED_PEOPLE/LOOP/TOCS/COMMENTS/LOGS — 참고만; read-only
  - `config/sidebar.ts` :: SidebarScreen — 경로 타입과 별개의 프로젝트 상태를 확인; read-only (I04에서 수정)

#### Details

- **Signatures & Types**:

  ```typescript
  export type ProjectHeaderId = "mois" | "edu";
  export type ProjectPermission = "done" | "redo" | "setup" | "assign" | "grant";
  export type ProjectRole = "PM" | "작성자" | "리뷰자";
  export type ProjectStage = "review" | "active" | "done" | "drop";
  export interface ProjectSection {
    readonly id: string; readonly no: string; readonly title: string;
    readonly state: "done" | "doing";
  }
  export interface ProjectVersion {
    readonly round: number; readonly at: string; readonly by: string;
    readonly done: number; readonly doing: number; readonly slides: number;
  }
  export interface ProjectMember {
    readonly id: string; readonly name: string; readonly department: string;
    readonly isPm: boolean; readonly permissions: readonly ProjectPermission[];
  }
  export interface ProjectNotifications {
    readonly deadline: boolean; readonly complete: boolean; readonly rework: boolean;
    readonly comment: boolean; readonly inApp: boolean; readonly email: boolean;
  }
  export interface ProjectLog {
    readonly id: string; readonly name: string; readonly department: string;
    readonly role: string; readonly detail: string; readonly at: string;
  }
  export interface ProjectHeaderData {
    readonly id: ProjectHeaderId; readonly name: string; readonly organization: string;
    readonly dueDate: string; readonly budgetEok: number; readonly stage: ProjectStage;
    readonly roles: readonly ProjectRole[]; readonly permissions: readonly ProjectPermission[];
    readonly round: number; readonly writeState: "writing" | "done";
    readonly sections: readonly ProjectSection[];
    readonly openCommentCount: number; readonly reviewCommentCount: number;
    readonly versions: readonly ProjectVersion[]; readonly members: readonly ProjectMember[];
    readonly notifications: ProjectNotifications; readonly logs: readonly ProjectLog[];
  }
  export interface ProjectHeaderView {
    readonly isPm: boolean; readonly roleLabel: string; readonly roundLabel: string;
    readonly showRound: boolean; readonly showRedo: boolean; readonly showHistory: boolean;
    readonly showComplete: boolean; readonly completeDisabled: boolean;
    readonly doneCount: number; readonly doingCount: number; readonly historyCount: number;
  }
  export const PROJECT_HEADER_PROJECTS: readonly ProjectHeaderData[];
  export function getProjectHeaderData(id: string): ProjectHeaderData;
  export function isProjectPm(project: ProjectHeaderData): boolean;
  export function canProjectAction(project: ProjectHeaderData, permission: ProjectPermission): boolean;
  export function getProjectHeaderView(project: ProjectHeaderData): ProjectHeaderView;
  ```

- **Data & Schema Fields**:
  - 모든 필드는 필수·non-null이다. 빈 목록은 `[]`, 없는 의견 수는 `0`이다. 날짜는 `YYYY-MM-DD`, 이력/로그 시각은 고정 표시 문자열이다. 실시간 Date/랜덤값으로 SSR 결과를 바꾸지 않는다. DB 키/스키마/API를 만들지 않는다.
  - 선택 목록 순서는 `mois`, `edu`. 현재 예시 인물은 정소담이며 로그인 사용자의 실권한이 아니다.

  | 필드 | mois | edu |
  | :--- | :--- | :--- |
  | name | 초거대 AI 기반 맞춤형 지능 행정업무 에이전트 구축 | 지능형 디지털 인재양성 AI 교육 통합 플랫폼 구축 |
  | organization | 행정안전부 | 한국지역정보개발원 |
  | dueDate / budgetEok | 2026-11-04 / 9.8 | 2026-11-20 / 6.2 |
  | stage / roles | active / PM, 작성자, 리뷰자 | active / 작성자, 리뷰자 |
  | permissions | done, redo, setup, assign, grant | assign |
  | round / writeState | 2 / writing | 1 / writing |
  | openCommentCount / reviewCommentCount | 2 / 0 | 0 / 0 |
  | versions | round1, at `2026.10.17 18:20`, by 정소담, done3, doing3, slides42 | [] |

  - `mois.sections`: s11/1.1/사업 배경 및 목적/done, s21/2.1/추진 전략/done, s31/3.1/지능형 RAG 검색 체계/done, s32/3.2/Multi-LLM 행정서식 초안 자동화/doing, s33/3.3/보안 체계 (CSAP 망연계)/doing, s41/4.1/추진 일정 및 WBS/doing.
  - `edu.sections`: s11/1.1/사업 배경 및 목표/done, s21/2.1/교육과정 체계도/doing, s22/2.2/모듈별 학습 목표/doing, s31/3.1/지역 거점 교육 운영/doing, s32/3.2/온라인 학습 플랫폼/doing, s41/4.1/3단계 성과 평가/doing.
  - `mois.members`: sodam/정소담/수석/PM/전체 권한, minsu/김민수/수석/비PM/done·redo·assign, seoyeon/이서연/선임/비PM/assign, sunghoon/박성훈/책임/비PM/빈 권한. `edu.members`: minsu/김민수/수석/PM/전체 권한, sodam/정소담/수석/비PM/assign. department는 참고 HTML의 부서·직급 등 표시용 부가 정보다.
  - 두 프로젝트의 `notifications` 기본 UI 값: deadline/complete/rework/comment/inApp=true, email=false. 사용자 실제 수신 설정과 연결하지 않는다.
  - `mois.logs`: m-log-1/정소담/수석/작성자/`3.3 보안 체계 본문 수정 (자동 저장)`/`2분 전`, m-log-2/김민수/수석/작성자/`의견 등록 · 3.3 보안 체계`/`35분 전`, m-log-3/박성훈/책임/작성자/`의견 등록 · 4.1 추진 일정`/`2시간 전`.
  - `edu.logs`: e-log-1/시스템/-/-/`프로젝트 초기 등록`/`2026.10.01`의 고정 UI 예시 한 건. edu 의견 수·로그·알림 기본값은 이번 UI를 위한 예시이며 실서비스 기록으로 보고하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: ID 조회 실패는 첫 `mois`로 복구한다. 목록 비어 있음/ID 중복이 없도록 상수 정의를 검토한다. round≥1, 통계≥0이며 현재 섹션 상태에서 현재 done/doing 수를 계산한다.
  2. Core Processing: `isProjectPm`은 roles에 PM이 있는지 검사한다. `canProjectAction`은 PM 또는 permissions에 해당 권한이 있는 경우 true다. roleLabel은 PM→작성자→리뷰자 순으로 있는 역할을 ` · `로 조합하고 없으면 stage review는 검토자, 나머지는 참여자다. roundLabel은 writeState done이면 `N차 완성`, writing/round1이면 `1차 작성 중`, 그 외 `N차 재작업 중`이다.
  3. Error & Exception Handling: stage review는 메뉴 `/workspace/review`와 무관하다. 이 stage일 때 showRound/showRedo/showHistory/showComplete 모두 false. 그 외 showRedo는 redo 권한, showComplete는 done 권한, showHistory는 versions.length>0. completeDisabled는 writeState===done. 실제 인증 실패 처리와 섞지 않는다.
  4. State Transition & Return: 순수 파생 함수를 반환한다. 데이터는 읽기 전용이고 mutation·영속화·실제 의견 조회가 없다. 버전 통계는 과거 스냅샷이라 현재 섹션 수에서 다시 계산하지 않는다.

### I02. 앱 수명의 선택 상태와 최신 토스트

- Related Files:
  - `components/common/ProjectHeaderProvider.tsx` :: ProjectHeaderProvider/useProjectHeader/ProjectHeaderToaster — 공유 선택·경로 보정·토스트; new
  - `app/(authenticated)/layout.tsx` :: AuthenticatedLayout — 기존 CommentsProvider 내부에서 AppShell을 새 Provider로 감싸기; modify
  - `components/layout/AppShell.tsx` :: AppShell/mainColumn — 단일 Toaster를 main 뒤 mainColumn 안에 배치; modify
  - `components/profile/token/TokenDialogs.tsx` :: Toast/Toaster 사용 방식 — 기존 기능 수정 없음; read-only
  - `node_modules/@fluentui/react-toast/dist/index.d.ts` :: ToastStatus/ToasterProps — 설치 API 근거; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProjectHeaderContextValue {
    projects: readonly ProjectHeaderData[];
    project: ProjectHeaderData;
    isPm: boolean;
    toasterId: string;
    selectProject: (id: string) => void;
  }
  export default function ProjectHeaderProvider(props: { children: React.ReactNode }): React.ReactElement;
  export function useProjectHeader(): ProjectHeaderContextValue;
  export function ProjectHeaderToaster(): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - Provider 내부 `selectedProjectId: ProjectHeaderId = "mois"`. project/isPm은 파생값이다. 저장소/네트워크는 사용하지 않는다.
  - `toasterId`는 React useId, 활성 toast ID는 ref `string | null`, 새 ID용 증가 counter ref. 같은 Provider/Toaster 인스턴스가 메뉴 이동에도 유지된다. 로컬 overlay 상태는 여기 넣지 않는다.
  - Fluent Toaster는 `inline`, `position="bottom"`, `timeout={2200}`, `limit={1}`. 내부 makeStyles로 fixed bottom64px, left `calc((100vw + var(--nav-sidebar-width, 0px)) / 2)`, translateX(-50%), width max-content, 작은 화면 max-width와 줄바꿈, zIndex5000. 760px 이하 left50%. AppShell의 기존 sidebar 변수(200px/접힘64px)를 상속하고 body로 portal하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: Provider는 FluentUiProvider/ProfilePreviewProvider/AdminRuntimeProvider/CommentsProvider의 기존 순서를 유지하며 AppShell 바깥에 한 번만 둔다. TokenDialogs의 기존 위치/상태는 보존한다. hook은 Provider 밖 사용 시 명확한 오류를 내며 각 페이지에서 임의 기본 Provider를 만들지 않는다.
  2. Core Processing: selectProject는 ID를 정상화하고 현재 ID와 다를 때만 상태를 갱신한다. `현재 프로젝트: {name}`를 Toast/ToastTitle로 표시한다. 활성 toast가 있으면 updateToast로 content/timeout을 갱신하고, 없으면 새 ID로 dispatchToast한다. polite 알림, onStatusChange에서 dismissed/unmounted일 때 같은 ID의 active ref만 비운다. 이미 존재하는 ID를 dispatch로 재사용하면 라이브러리가 무시하므로 고정 ID 재dispatch를 하지 않는다.
  3. Error & Exception Handling: pathname이 `/workspace/review`이고 선택 프로젝트가 비PM이면 effect에서 router.replace(`/workspace/write`)한다. 직접/뒤로가기 진입도 동일하다. 현재 경로가 다른 경우 유지한다. 초기 렌더/동일 ID 재선택/단순 메뉴 이동에는 토스트를 만들지 않는다. 무한 replace나 auth 역할 변경은 없다.
  4. State Transition & Return: 선택한 edu는 리뷰→제작 이동 뒤에도 유지되고 토스트 호스트는 unmount되지 않는다. Provider unmount/새로고침은 mois로 초기화한다. 토스트 dismiss 이후 새로운 선택에는 새 ID를 쓴다. 기존 토큰 Toaster와 ID/상태를 공유하지 않는다.

### I03. 공용 헤더와 기존 헤더 슬롯 연결

- Related Files:
  - `components/common/ProjectHeader.tsx` :: ProjectHeader/ProjectHeaderContent/ProjectHeaderPage — 공용 진입점·팝업·빈 본문 wrapper; new
  - `components/layout/WorkspacePage.tsx` :: WorkspacePageProps/WorkspacePage — 선택적 headerComponent; modify
  - `components/comments/CommentsWorkspace.tsx` :: CommentsWorkspace/useStyles — inline 헤더 교체, 핀 보존; modify
  - `components/layout/WorkspaceHeader.tsx` :: WorkspaceHeaderProps/WorkspaceHeader — leading/actions·mobile·title·sticky 계약; read-only
  - `components/common/Button.tsx` :: Button — native 버튼·primary class·ref 전달; read-only
  - `components/comments/CommentsProvider.tsx` :: useComments — controller.suspendUi 경로; read-only
  - `components/comments/CommentCreateButton.tsx`, `lib/comments/controller.ts` :: 핀 생성·suspendUi — 기존 동작; read-only
  - `lib/ui/dadam-theme.ts`, `app/admin-utilities.css` — 테마와 팀원 소스 범위 보존; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProjectHeaderProps extends Omit<WorkspaceHeaderProps, "leading" | "actions"> {}
  export default function ProjectHeader(props: ProjectHeaderProps): React.ReactElement;
  export function ProjectHeaderPage(props: { title: string; headingId?: string }): React.ReactElement | null;
  // WorkspacePageProps에만 추가. 기본 호출자는 변경하지 않는다.
  headerComponent?: React.ComponentType<WorkspaceHeaderProps>;
  // ProjectHeader.tsx 내부. 후속 Task도 같은 단일 상태를 쓴다.
  type HeaderOverlay = null | "projects" | "history" | "complete" | "redo" | "settings";
  ```

- **Data & Schema Fields**:
  - ProjectHeader는 공유 project와 pathname을 읽고 내부 ProjectHeaderContent를 `${pathname}:${project.id}` key로 렌더링한다. 내부 overlay 초기값 null. route/project가 바뀌면 내부 UI만 unmount/reset된다. 전체 Provider/CommentsProvider를 이 key로 감싸지 않는다.
  - `ProjectHeaderContent`는 props를 WorkspaceHeader로 전달하고 leading/actions만 구성한다. headerRef·headingRef·sticky도 빠짐없이 전달한다. 화면에 h1/모바일 메뉴가 하나씩만 생겨야 한다.
  - 선택기는 CommonButton 하나 안에 프로젝트명/기관·마감/역할/chevron을 span으로 구성한다. 2줄 높이 약40px, minWidth0/유연한 width, 이름 ellipsis+title. 날짜는 점 표기로 변환하며 실시간 D-day는 추가하지 않는다. 중첩 button 금지.
  - 우측 액션: ArrowCounterclockwise16Regular, History16Regular, Checkmark16Regular, Settings16Regular. 높이/minHeight34px·boxSizing border-box·공통 padding12px/gap6px, redo만 width/minWidth34px/padding0. 아이콘만 있는 redo는 aria-label/title=`{round+1}차 재작업 시작`을 제공한다. primary는 완성만. 기존 Button의 border/font/radius/focus를 덮어씌우지 않는다.
  - roundLabel은 dadam 토큰으로 칩 표시. 헤더 네 액션 노출은 getProjectHeaderView만 기준으로 한다. 설정은 항상 노출한다. T01은 selector만 연결하며 후속 세부 액션에 가짜 모달/성공 알림/추가 disabled를 넣지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: WorkspacePage에서 headerComponent를 구조 분해해 헤더 props로 흘리지 않는다. 기본값은 WorkspaceHeader다. 선택 컴포넌트를 JSX로 렌더링하고 기존 heading ref/sticky prop을 전달한다. ResizeObserver와 root/CSS 변수·cleanup은 유지한다.
  2. Core Processing: selector는 Fluent controlled Popover+PopoverTrigger(disableButtonEnhancement)+PopoverSurface로 아래/start에 연다. 열기 공통 경로에서 `useComments()`의 controller가 존재하면 suspendUi()를 호출하고 overlay를 하나만 설정한다. popup은 `role="dialog"`, 접근성 이름 `프로젝트 선택`, `내가 참여 중` 제목, 각 항목 CommonButton에 현재 항목 aria-pressed를 둔다. 항목은 이름/역할/기관/마감/현재 선택 표시를 포함한다. 검색은 추가하지 않는다. 항목 클릭 시 selectProject(id), popup닫기를 수행하며 같은 ID는 닫기만 한다.
  3. Error & Exception Handling: Fluent의 위치/포커스 기능을 재사용한다. trigger에 aria-haspopup/expanded/controls, popup 고유 ID, native 키보드 Tab/Enter/Space 및 Esc/외부 클릭 닫기를 연결한다. Esc capture에서 전파를 막아 뒤의 코멘트 Esc와 충돌하지 않게 한다. 닫기는 연결된 호출 버튼으로 포커스를 되돌리고, route/project 변경으로 제거된 노드를 focus하지 않는다. overlay가 없을 때는 키보드/포커스를 가로채지 않는다.
  4. State Transition & Return: ProjectHeaderPage는 WorkspacePage의 headerComponent로 새 헤더를 제공하고 children=null을 유지한다. 비PM review 경로에서는 null을 반환해 redirect 전 잘못된 화면을 보여주지 않는다. CommentsWorkspace는 기존 WorkspaceHeader와 네 버튼 JSX/미사용 icon/style/import를 교체한다. 기존 intro의 data-comment-control, surface ref/section, canvasTools와 핀 생성, 코멘트 이벤트/좌표/scroll은 보존한다. 긴 이름·좁은 화면에서 기존 flex-wrap을 사용하고 전역 WorkspaceHeader 스타일은 변경하지 않는다.

### I04. 여섯 화면과 사이드바의 동일한 프로젝트 상태

- Related Files:
  - `config/sidebar.ts` :: SidebarScreen/SidebarIcon/SidebarNavigationContext/sidebarGroups/getVisibleSidebarGroups — 두 메뉴·PM 조건; modify
  - `components/layout/NavSidebar.tsx` :: icon map/NavSidebar — 새 아이콘·공유 isPm; modify
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: WorkspaceScreenPage — 화면 분기; modify
  - `lib/auth/guards.ts`, `lib/auth/roles.ts`, `components/profile/PreviewRoleBoundary.tsx` — 인증 경계; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // 기존 union에 추가
  // SidebarScreen: "review" | "done"
  // SidebarIcon: "review" | "completed"
  // 기존 SidebarNavigationContext에 추가; 생략 시 리뷰 미노출
  isProjectPm?: boolean;
  // 함수의 기존 시그니처는 유지
  getVisibleSidebarGroups(context: SidebarNavigationContext): SidebarNavigationGroup[];
  ```

- **Data & Schema Fields**:
  - project 그룹에서 제작 뒤 `navigationItem("review", "리뷰", "review")`, `navigationItem("done", "완료한 제안", "completed")` 순서로 추가한다. requiredRole을 새로 지정하지 않는다.
  - NavSidebar 아이콘 map에 EyeRegular/DocumentCheckmarkRegular를 연결한다. 기존 `satisfies Record<SidebarIcon,...>`를 유지한다. 펼침/접힘/모바일은 동일한 filtered groups를 쓴다.
  - 분석/파일/목차/제작 설정/리뷰는 ProjectHeaderPage, 제작은 CommentsWorkspace, 완료한 제안은 기본 WorkspacePage(null 본문)다. 등록·검토 목록·관리자는 기존 분기를 유지한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 현재 authEnabled/authenticated/roles/previewRole 분기는 보존한다. 새 PM 조건은 기존 권한 필터를 통과한 항목에 추가로 적용한다. `review`만 `context.isProjectPm === true`일 때 유지한다. done이나 관리자 메뉴에는 이 조건을 적용하지 않는다.
  2. Core Processing: NavSidebar가 useProjectHeader().isPm을 읽어 기존 context에 추가한다. getSidebarItemByScreen/getSidebarItemByPathname는 기존 파생 목록으로 두 경로를 인식하므로 별도 라우트 파일은 만들지 않는다.
  3. Error & Exception Handling: 서버 page의 notFound·requireRole·tokens redirect·AdminScreenRouter·PreviewRoleBoundary는 유지한다. 서버에서 UI 예시 PM을 인증으로 검사하지 않는다. 비PM review 접근은 Provider+ProjectHeaderPage의 클라이언트 표시/이동 규칙만 적용한다.
  4. State Transition & Return: PM mois는 리뷰가 보이고 edu는 리뷰가 사라진다. review에서 edu 선택 시 write로 replace하며 edu 선택/토스트는 유지한다. done은 프로젝트 헤더가 없지만 접근성 제목과 모바일 메뉴 열기는 기존 WorkspacePage로 남긴다.

## Acceptance Criteria

- [x] 새 생산 파일은 config/project-header.ts, ProjectHeaderProvider.tsx, ProjectHeader.tsx 세 개다. 예시/테마/index/README/CSS/test를 추가하지 않는다.
- [x] 초기 mois는 PM·작성자·리뷰자/2차 재작업 중/완성본1/네 액션이다. edu는 작성자·리뷰자/1차 작성 중/설정만 표시하고 리뷰 메뉴는 없다.
- [x] 프로젝트 변경 시 이름·기관·날짜·역할·칩·버튼이 한 상태에서 파생되고 최신 토스트 한 건이 뜬다. 동일 항목은 닫기만, 빠른 변경은 토스트 갱신, 메뉴 이동은 선택 유지다.
- [x] 리뷰에서 edu로 전환하거나 비PM review 경로에 진입하면 제작 replace, 리뷰 화면 미노출, toast 유지다. 실제 관리자 권한은 바뀌지 않는다.
- [x] 분석/파일/목차/제작 설정/제작/리뷰의 헤더가 각각 한 개다. done은 프로젝트 헤더 없이 기본 탐색만 있다.
- [x] 공통 버튼의 기존 높이/테마를 전역 변경하지 않고 해당 헤더 액션만34px다. 새 Griffel 스타일은 common/comments의 Tailwind 탐색 여부와 무관하다.
- [x] stage review/이미 완성/이력0/roles빈값/잘못된 ID 분기를 정적으로 확인한다. 별도 시연 토글이나 새 프로젝트를 추가하지 않는다.
- [x] 핀 위치·surface·좌표·기존 IndexedDB·인증·기존 헤더 슬롯이 보존된다. T02/T03 연결 전이라는 중간 상태를 결과에 기록한다.

## Validation

- `npm.cmd run typecheck` — props/import/SidebarIcon·Screen/readonly fixture 타입 통과.
- `npm.cmd run lint` — 새 상태/콜백/효과와 미사용 기존 헤더 import 정리 통과.
- `npm.cmd run build` — server/client 경계·SSR·라우트 빌드 통과.
- `git diff --check` — 공백/충돌 마커 문제 없음.
- `git diff --name-only` 및 `git status --short` — 이 Task의 명시 파일과 .memory 진행 기록만 확인. 무관한 변경은 포함하지 않는다.
- `git diff -- app/admin-utilities.css components/common/Button.tsx components/layout/WorkspaceHeader.tsx lib/comments/controller.ts` — 이 Task 변경이 없어야 한다.
- `rg -n 'indexedDB|localStorage|sessionStorage|fetch\(' config/project-header.ts components/common/ProjectHeaderProvider.tsx components/common/ProjectHeader.tsx` — 새 저장/통신 호출 없음(미일치 exit1은 정상).
- AC의 조건/메뉴/포커스/오버레이 수명은 정적 코드·diff로 확인한다. 테스트 파일·폴더나 브라우저를 만들거나 실행하지 않는다. 실제 키보드·픽셀 검증은 미실시로 기록한다.

## Commit Message

```text
feat(project-header): 공용 프로젝트 헤더와 메뉴 선택 상태 연결

Plan: 2026-11-03-project-header
Phase: P01-project-header
Task: T01-shared-header-and-navigation

- 여섯 화면에 공통 버튼을 사용하는 프로젝트 헤더 적용
- 프로젝트 선택과 최신 토스트 및 PM 리뷰 메뉴 조건 연결
- 리뷰·완료한 제안 메뉴 추가와 기존 핀 영역 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task를 완료 처리한 커밋 (Task: T01-shared-header-and-navigation footer로 식별)

검증 후 관련 파일만 명시적으로 stage한다. local 전용 `.memory/current.md`는 강제 추가/커밋하지 않는다. 완료 시 phase/plan 진행률과 current를 T02로 전진한다. push·배포는 하지 않는다.

## Execution Record — 2026-11-03

- typecheck/lint/build 및 diff 공백 검사 통과. 역할·회차·이력·빈값 조건과 여섯 화면/리뷰 이동/동일 선택/토스트 갱신 경로를 정적으로 검토했다.
- WorkspacePage는 headerComponent 컴포넌트 슬롯을 JSX로 렌더링한다. ref를 임의 render 콜백에 넘기지 않아 React ref 접근 규칙을 지키고 기존 headerRef/sticky 계약을 유지한다.
- Fluent Toaster의 inline 위치 스타일을 고려해 offset.vertical=64와 sidebar margin 보정으로 본문 중앙을 맞췄다. 기존 Toaster/토큰 기능은 변경하지 않았다.
- 기존 Button·WorkspaceHeader·ModalFrame·팀원 CSS·코멘트 controller 변경 없음. 저장/통신 호출 추가 없음.
- T01에서는 선택기만 연결했다. 완성/재작업/이력은 T02, 설정은 T03에서 연결한다. 테스트 파일/폴더와 브라우저·E2E·스크린샷·dev server는 사용하지 않았다.
- 범위 밖 신규 결함: 특이사항 없음. 기존 코멘트가 프로젝트별로 분리되지 않는 한계는 결정 D13대로 유지했다.