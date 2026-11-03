# Task: T03 프로젝트 설정 네 탭과 통합 마무리

## Status: done

> 2026-11-03 사용자 검토 후 보정 청사진은 [T05 HTML 설정 패널 보정](./T05-html-settings.md)이다. 이 Task의 완료/커밋 기록은 최초 구현 이력이다. 1열 폼·Fluent 기본 패딩·알림 설명 누락·수신 체크박스·로그5열은 후속 T05에서 HTML 기준으로 수정한다. 공용 DadamInput은 KPC 래퍼이며 실제 dadam 원본 컴포넌트로 혼동하지 않는다. 현재 포인터는 T04→T05이고 T03을 재실행하지 않는다.

## Goal

공용 헤더의 설정 버튼에서 오른쪽 패널을 열어 기본정보·권한·알림·로그를 확인하고 임시 입력을 조작한다. 탭 이동에는 입력을 유지하고 닫기·프로젝트/메뉴 변경에는 초기화하며 실제 저장이나 업무 상태 변경은 하지 않는다.

## Decision Summary

- 선행 T01/T02는 공용 헤더·선택 상태·토스트·메뉴와 중앙 모달/이력 팝업을 구현한다. 이 Task는 새 `components/common/ProjectSettingsDrawer.tsx` 하나와 기존 ProjectHeader.tsx만 생산 코드 수정 대상으로 한다.
- Fluent OverlayDrawer·TabList/Tab, 기존 DadamInput/DadamCheckbox, common/Button을 사용한다. 스타일은 패널 TSX 안의 Griffel과 dadam 토큰으로 관리한다. 별도 README/index/CSS/테마/example 파일을 만들지 않는다.
- 선택 프로젝트 fixture는 읽기 전용이다. draft 입력으로 헤더·리뷰 메뉴·실제 권한·알림·로그를 바꾸지 않는다. 저장 버튼/저장 확인/성공 알림을 새로 만들지 않고 업무 상태 전환 버튼은 native disabled다.
- **tests 폴더·테스트 파일 생성/복원, 브라우저·E2E·스크린샷·dev server 검증 금지.** 최종 검증은 타입/lint/build·정적 코드 검토다. 실제 픽셀/키보드 조작을 통과했다고 기록하지 않는다.
- 근거: 2026-11-03-project-header 결정 D01/D05~D14. HTML openSettings의 네 탭을 참고하되 저장 핸들러/전역 데이터 변경을 이식하지 않는다.

## Implementation

### I01. 오른쪽 패널 연결과 draft 수명

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: ProjectSettingsDrawer/useStyles/draft — 패널과 네 탭; new
  - `components/common/ProjectHeader.tsx` :: ProjectHeaderContent/settings overlay — 설정 버튼 연결; modify
  - `config/project-header.ts` :: ProjectHeaderData/ProjectMember/ProjectNotifications/ProjectLog/canProjectAction — 예시 입력; read-only
  - `components/common/ProjectHeaderProvider.tsx` :: useProjectHeader — 기존 선택 상태; read-only
  - `components/common/Button.tsx`, `components/ui/DadamControls.tsx` :: CommonButton/DadamInput/DadamCheckbox — 기존 UI; read-only
  - `node_modules/@fluentui/react-drawer/dist/index.d.ts` :: OverlayDrawer/DrawerHeader/DrawerHeaderTitle/DrawerBody — 설치 API; read-only
  - `components/comments/CommentsProvider.tsx`, `lib/comments/controller.ts` :: controller.suspendUi — 핀 UI 정리 계약; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProjectSettingsDrawerProps {
    id: string;
    project: ProjectHeaderData;
    onClose: () => void;
    returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  }
  export default function ProjectSettingsDrawer(props: ProjectSettingsDrawerProps): React.ReactElement;
  // 이하 타입은 같은 Drawer 파일 내부. 별도 barrel/type 파일을 만들지 않는다.
  type SettingsTab = "info" | "perm" | "noti" | "log";
  interface ProjectSettingsDraft {
    name: string;
    organization: string;
    budgetEok: string;
    dueDate: string;
    permissionsByMember: Record<string, ProjectPermission[]>;
    notifications: {
      deadline: boolean; complete: boolean; rework: boolean;
      comment: boolean; inApp: boolean; email: boolean;
    };
  }
  function createSettingsDraft(project: ProjectHeaderData): ProjectSettingsDraft;
  ```

- **Data & Schema Fields**:
  - config에서 import하는 `ProjectPermission`은 `done|redo|setup|assign|grant`다. ProjectHeaderData 관련 필드는 모두 필수·non-null: id=`mois|edu`, name/organization/dueDate:string, budgetEok:number, stage=`review|active|done|drop`, roles=readonly (`PM|작성자|리뷰자`)[], permissions=readonly ProjectPermission[], members=readonly ProjectMember[], notifications=ProjectNotifications, logs=readonly ProjectLog[].
  - ProjectMember는 readonly id/name/department:string, isPm:boolean, permissions:readonly ProjectPermission[]. ProjectNotifications는 readonly deadline/complete/rework/comment/inApp/email:boolean. ProjectLog는 readonly id/name/department/role/detail/at:string. 여기서 타입을 재선언해 실제 config와 분기시키지 않는다.
  - draft는 fixture와 다른 객체/권한 배열을 새로 만든다. budgetEok만 입력 중 빈 문자열을 보존하려고 String(project.budgetEok)로 시작한다. 나머지 문자열과 알림 플래그를 복사하고 각 member.id의 권한 배열도 복사한다. PM의 권한은 다섯 개 전부로 만든다.
  - 초기 tab=info. `useState(() => createSettingsDraft(project))`로 패널 mount당 한 번 초기화한다. 탭별 컴포넌트가 unmount되어도 draft는 상위 Drawer에 둬 유지한다.
  - 부모는 기존 `HeaderOverlay = null|projects|history|complete|redo|settings`의 settings일 때만 Drawer를 mount한다. 부모 ProjectHeaderContent는 `${pathname}:${project.id}` key로 수명을 관리한다. Drawer를 계속 숨겨 둔 채 draft를 유지하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 설정 버튼은 stage/권한과 무관하게 항상 표시한다. open 전에 기존 `controller?.suspendUi()`로 코멘트 팝업/핀 모드만 닫는다. 기존 단일 overlay 상태를 사용해 selector/이력/중앙 모달과 중첩되지 않는다.
  2. Core Processing: OverlayDrawer는 open=true, position=end, size=medium, modalType=modal로 연결한다. 기본 폭592px에 maxWidth100vw/좁은 화면 대응을 같은 파일 스타일로 둔다. DrawerHeader/DrawerHeaderTitle에 `프로젝트 설정`과 프로젝트명, CommonButton 닫기 아이콘을 두고 DrawerBody에 탭·본문을 넣는다. 내용은 영역 안에서 스크롤한다.
  3. Error & Exception Handling: onOpenChange의 open=false(외부 클릭/Esc)는 onClose로 통일한다. 패널 root에 열린 동안 `data-modal-frame`을 붙여 기존 코멘트 Esc 처리와 공존하고 Esc capture 전파 충돌을 방지한다. Fluent의 modal focus trap을 유지하며 close 시 returnFocusRef.current가 document에 연결된 경우만 포커스를 복귀한다. unmount된 옛 프로젝트/메뉴 버튼으로 포커스를 강제 이동하지 않는다. 새 전역 focus/keydown 시스템은 만들지 않는다.
  4. State Transition & Return: 닫기/취소는 부모 overlay=null로 unmount하고 draft를 버린다. 다시 열면 선택 fixture로 초기화된다. 프로젝트/경로 변경도 부모 key 때문에 같은 초기화 결과다. 공유 Provider·fixture·코멘트·토스트에는 쓰지 않는다. 기존 ModalFrame 수준에 맞게 surface zIndex4300/backdrop4000을 패널 슬롯 스타일로 맞추되 전역 z-index 정책을 바꾸지 않는다.

### I02. 기본정보·권한 탭

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: info/perm 패널·draft 갱신 — 임시 입력/권한 표; new
  - `components/ui/DadamControls.tsx` :: DadamInput/DadamCheckbox — 입력·체크 스타일; read-only
  - `config/project-header.ts` :: canProjectAction — 원본 프로젝트 기준 편집 허용; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type InformationField = "name" | "organization" | "budgetEok" | "dueDate";
  // 다음 콜백은 Drawer 내부; 새로운 데이터 서비스/저장 API는 없다.
  function changeInformation(field: InformationField, value: string): void;
  function changePermission(memberId: string, permission: ProjectPermission, checked: boolean): void;
  // canEditPermissions는 매번 원본 project에서 파생한다.
  // canProjectAction(project, "grant") === PM 또는 원본 grant 권한
  ```

- **Data & Schema Fields**:
  - 기본정보: `제안 프로젝트명`(text), `발주기관`(text), `사업 예산`(number, min0, step0.1, 억원 단위), `제출 마감일`(date)과 `진행 상태`(읽기 전용 표시). 필드는 label/htmlFor/고유 id를 연결한다. 입력 값을 강제로 저장하거나 패널을 닫지 않는다.
  - stage 표시: review=`진행 검토 중`, active=`진행 중`, done=`완료`, drop=`진행안함`. active에 `진행안함으로 전환`, drop에 `진행으로 되돌리기` CommonButton을 disabled로 표시한다. review/done에서 신규 업무 전환 CTA를 추가하지 않는다.
  - 권한 열 순서: done=완성, redo=재작업, setup=제작 설정, assign=담당 지정, grant=권한 부여. 행에는 이름·부서/직급·PM 표시를 넣는다. 각 checkbox의 접근성 label은 `{이름} {권한명}`이다.
  - 기본 mois: PM 정소담 전체 권한, 김민수 done/redo/assign, 이서연 assign, 박성훈 없음. edu: PM 김민수 전체 권한, 현재 예시 사용자 정소담 assign만. mois의 현재 사용자는 PM, edu는 비PM이고 grant도 없다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기본정보는 UI 입력 허용 범위다. 아직 저장이 없으므로 새로운 필수값 검증/서버 오류/저장 확인을 추가하지 않는다. 날짜/숫자의 기본 input 동작을 사용하되 빈 문자열도 draft로 보존한다.
  2. Core Processing: 모든 갱신은 setDraft의 함수형 갱신으로 해당 필드/배열만 복사한다. PM 행은 항상 모두 checked+disabled. 다른 행은 원본 project의 PM/grant이면 변경 가능, 아니면 disabled다. checkbox data.checked는 `=== true`로 boolean화하고 중복 권한을 추가하지 않는다.
  3. Error & Exception Handling: 존재하지 않는 memberId, PM 행 변경, 편집 권한 없는 변경은 handler에서도 무시한다. UI가 disabled이기만 하고 handler가 무조건 원본을 수정하는 구조를 만들지 않는다. 현재 자신의 grant 체크를 바꿔도 원본 권한 판정/사이드바/헤더는 달라지지 않는다.
  4. State Transition & Return: info↔perm↔다른 탭 이동에도 draft 입력은 유지한다. PM 행을 해제할 수 없고 edu에서는 권한 표 전체를 읽기 전용으로 본다. 설정 이름 변경 후 닫아도 헤더는 원래 이름이며 재열면 원본 값이다.

### I03. 알림·로그 탭과 키보드 탐색

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: noti/log·TabList/Tab·tabpanel — 임시 수신 설정/예시 이력; new
  - `components/ui/DadamControls.tsx` :: DadamCheckbox — 알림 UI; read-only
  - `components/common/Button.tsx` :: Button — 패널 닫기·비활성 업무 액션; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type NotificationField = keyof ProjectSettingsDraft["notifications"];
  function changeNotification(field: NotificationField, checked: boolean): void;
  // 탭 값은 SettingsTab(info|perm|noti|log)만 허용한다.
  // Fluent TabList onTabSelect의 data.value를 이 union으로 좁힌다.
  ```

- **Data & Schema Fields**:
  - 알림 체크박스: deadline=`제출 마감 리마인더`, complete=`완성`, rework=`재작업 시작`, comment=`의견 등록`. 별도 수신 방식 그룹에 inApp=`앱 내 알림`, email=`이메일`. 둘 다 선택 가능한 boolean이며 강제 최소 한 개 규칙은 추가하지 않는다.
  - 기본 예시 플래그는 두 프로젝트 모두 deadline/complete/rework/comment/inApp=true, email=false다. 입력은 draft만 바꾼다. 실제 계정 이메일/알림 권한 요청을 읽거나 전송하지 않는다.
  - 로그 열은 이름, 부서·직급, 권한, 변경 내역, 일시. source는 현재 project.logs다. 날짜/본문을 고정 표시하며 정렬·검색·추가·편집·삭제 기능을 새로 만들지 않는다.
  - mois 로그는 정소담의 보안 체계 본문 수정/김민수·박성훈의 의견 등록 3건, edu 로그는 프로젝트 초기 등록 1건이다. 자기 draft 조작을 로그에 추가하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: TabList의 accessible label=`프로젝트 설정 탭`, 각 Tab에 id, 선택 panel에 role=tabpanel/aria-labelledby와 고유 id를 연결한다. Fluent TabList/Tab으로 화살표·Home/End 등 기본 키보드 탐색을 재사용하며 disabled 최종 액션과 탭을 혼동하지 않는다.
  2. Core Processing: 선택한 하나의 panel을 표시하고 draft는 Drawer 상위 state에서 유지한다. checkbox 이벤트로 notifications 객체를 복사해 한 flag만 갱신한다. 로그는 native table/th scope=col을 사용하고 overflowX가 패널 내부에서만 생기도록 한다. 긴 변경 내역은 줄바꿈한다.
  3. Error & Exception Handling: 잘못된 탭 값은 무시해 현재 탭을 유지한다. 로그가 없으면 명시적 빈 상태를 표시한다. 표 셀은 JSX 문자열로만 렌더링하고 참고 HTML 문자열을 dangerouslySetInnerHTML로 주입하지 않는다.
  4. State Transition & Return: 알림 변경은 패널을 닫으면 폐기된다. 로그는 항상 fixture 그대로다. 닫기 CommonButton은 aria-label을 제공하며 focus ring/disabled/폰트는 공통 dadam 스타일을 사용한다. Tab/Input/Checkbox의 기존 Fluent/Dadam 컴포넌트 내부 버튼까지 별도 구현으로 갈아끼우지 않는다.

### I04. 전체 연결의 정적 회귀 확인

- Related Files:
  - `components/common/ProjectHeader.tsx`, `ProjectSettingsDrawer.tsx` :: 오버레이 연결 — 이 Task 범위 내 보완; modify/new
  - `components/common/ProjectHeaderProvider.tsx`, `config/project-header.ts` :: 상태/예시 — 최종 확인; read-only
  - `components/layout/WorkspacePage.tsx`, `WorkspaceHeader.tsx`, `AppShell.tsx`, `NavSidebar.tsx`, `config/sidebar.ts` :: 헤더/메뉴/토스트 통합 — 최종 확인; read-only
  - `app/(authenticated)/layout.tsx`, `app/(authenticated)/workspace/[screen]/page.tsx`, `components/comments/CommentsWorkspace.tsx` :: 적용 화면·핀 — 최종 확인; read-only
  - `app/admin-utilities.css`, `components/common/Button.tsx`, `components/ui/ModalFrame.tsx`, `lib/comments/controller.ts` :: 변경 금지 경계; read-only

#### Details

- **Signatures & Types**:
  - 새 공개 타입/서비스를 추가하지 않는다. ProjectHeader는 WorkspaceHeaderProps의 leading/actions를 제외한 props를 받고 기존 refs/sticky를 전달한다. ProjectHeaderPage는 title/headingId만 받아 빈 본문 화면에 공용 헤더를 연결한다. Shared Provider에는 project/projects/isPm/selectProject/toasterId만 있으며 draft를 올리지 않는다.
- **Data & Schema Fields**:
  - 아래 표는 정적 검토 시나리오다. 브라우저 자동화나 새 테스트 파일을 만드는 지시가 아니다.

  | 조건/행동 | 코드에서 확인할 결과 |
  | :--- | :--- |
  | 최초 mois / 메뉴 이동 | PM·2차 재작업·완성본1, 여섯 화면에서 같은 선택 |
  | edu 선택 | 이름/기관/마감/역할/버튼 갱신, 최신 토스트2200ms, 리뷰 숨김 |
  | review에서 edu 선택 / 비PM review 직접·뒤로가기 | write replace, 선택/토스트 유지, 잘못된 리뷰 화면 미노출 |
  | 동일 프로젝트 재선택 / 빠른 연속 변경 | 전자는 목록만 닫기, 후자는 이전 toast 갱신 |
  | stage review / writeState done / 이력0 | 업무 묶음 숨김 / 완성 열기 비활성 / 완성본 숨김 |
  | 설정 info 수정→탭 이동→복귀 | draft 유지, 헤더/권한 원본 유지 |
  | 패널 닫기→재열기 / 프로젝트·메뉴 변경 | draft·열린 overlay 초기화, 선택 상태는 메뉴 이동에 유지 |
  | PM 행 / PM·grant 없는 사용자 | PM 행 전부 checked/disabled, 편집 불가 사용자의 다른 행도 disabled |
  | 오버레이 열기/닫기 | 기존 핀 UI만 suspend, 저장 데이터 유지, Esc·포커스 계약 보존 |
  | 완료한 제안 / 등록·검토 목록·관리자 | 프로젝트 헤더 없음, 기존 제목/모바일 탐색/인증 유지 |
  | 완성·재작업·보기/PPT·상태 전환 | 최종 실행 disabled, 저장·다운로드·성공 토스트·회차 변경 없음 |

- **Execution Flow / Logic**:
  1. Precondition & Validation: T01/T02가 검증·완료된 상태에서 이 Task를 수행한다. 통합 검토 중 범위 밖 문제가 보이면 기록하고 이미 제외한 코멘트 프로젝트 분리/인증/전역 테마 리팩터링을 추가하지 않는다.
  2. Core Processing: 이번 Drawer와 헤더 연결을 포함해 위 표의 state/props 경로를 정적으로 따라간다. sidebar/AppShell과 페이지가 별도 Provider를 사용하지 않는지, Toaster가 route 변화에 unmount되지 않는지 확인한다. 모든 신규 action은 common Button, 우측34px 규칙을 유지한다.
  3. Error & Exception Handling: 이 Task 연결로 생긴 오류는 해당 두 파일 안에서 수정한다. 선행 Task의 실제 오류가 발견되면 필요한 최소 수정 파일/사유/검증을 실행 기록에 명시하며 무관한 파일을 묶지 않는다. 기존 빌드 경고를 없애려고 패키지 업데이트를 추가하지 않는다.
  4. State Transition & Return: 성공 시 세 Task 모두 done, phase/plan 완료, current Active Task 없음으로 갱신한다. 보고에는 UI 예시·저장 제외·프로젝트 전환 시 코멘트 유지·브라우저 미검증을 남긴다. 구현이 실제로 끝나기 전에 완료 상태로 표시하지 않는다.

## Acceptance Criteria

- [x] 설정 버튼이 오른쪽 모달형 패널을 열고 네 탭을 모두 표시한다. 모달/팝업과 중복되지 않고 Esc/외부 클릭/닫기와 focus trap/복귀가 연결된다.
- [x] 기본정보 입력, 권한 조건부 체크, 알림 플래그 조작, 읽기 전용 로그가 현재 fixture와 일치한다. label/id·탭/표 의미 구조가 있다.
- [x] draft는 탭 전환에 유지, 닫기/프로젝트·경로 변경에 폐기된다. 이름/권한 조작이 헤더·사이드바·실제 데이터에 반영되지 않는다.
- [x] PM 행은 전부 checked/disabled, 비PM/grant 없음이면 타인 권한도 수정 불가다. 상태 전환은 native disabled이며 저장/성공 토스트가 없다.
- [x] 새 생산 파일은 Drawer 하나다. 전체 기능의 새 생산 파일 총수는 config·Provider·ProjectHeader·Drawer 네 개다.
- [x] 여섯 화면 적용·done 예외·리뷰 PM 이동·toast·pin·인증·팀원 CSS 경계를 정적으로 확인한다. 테스트/브라우저 금지 정책을 지킨다.

## Validation

- `npm.cmd run typecheck` — Drawer 슬롯/ref·TabValue 좁히기·draft/readonly fixture 타입 통과.
- `npm.cmd run lint` — state 초기화/checkbox 콜백·hooks 통과.
- `npm.cmd run build` — 앱 빌드·server/client 경계 통과.
- `git diff --check` — 공백/충돌 마커 없음.
- `git diff --name-only` 및 `git status --short` — 이번 Task 파일/.memory 진행 기록만 확인. tests/README/index/별도 CSS 없음.
- `rg -n 'indexedDB|localStorage|sessionStorage|fetch\(|dangerouslySetInnerHTML' components/common/ProjectHeader.tsx components/common/ProjectHeaderProvider.tsx components/common/ProjectSettingsDrawer.tsx config/project-header.ts` — 새 저장/통신/HTML 주입 없음(미일치 exit1 정상).
- I04 표를 정적 코드로 검토하고 실제로 수행한 typecheck/lint/build 결과만 기록한다. UI 실기·픽셀·모바일 터치·IME·실제 키보드 검증은 수행하지 않는다. 반복 검사는 새 변경/실패가 생겼을 때만 한다.

## Commit Message

```text
feat(project-header): 프로젝트 설정 패널 네 탭 구현

Plan: 2026-11-03-project-header
Phase: P01-project-header
Task: T03-settings-drawer

- 기본정보·권한·알림·로그를 오른쪽 설정 패널로 제공
- 패널 내부 임시 입력과 권한별 편집 조건 적용
- 저장 없는 UI 범위와 공용 헤더·메뉴·코멘트 연결 검증
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task를 완료 처리한 커밋 (Task: T03-settings-drawer footer로 식별)

검증 후 관련 파일만 명시적으로 stage하고 지정 한국어 메시지로 커밋한다. current는 로컬 전용이며 강제 추가/커밋하지 않는다. 완료 시 phase/plan을 done3/3으로, current Active Task를 없음으로 갱신한다. 원격 push·배포는 수행하지 않는다.

## Execution Record — 2026-11-03

- typecheck/lint/build 및 diff 공백 검사 통과. UI 연결 후 focus 보완까지 최종 lint/build로 확인했다.
- 새 생산 파일은 ProjectSettingsDrawer.tsx 하나다. 헤더의 설정 버튼에 id/aria 연결과 단일 settings overlay를 추가했다. 전체 새 생산 파일은 config·Provider·ProjectHeader·Drawer 네 개다.
- 기본정보·권한·알림 draft는 useState(() => createSettingsDraft(project))로 패널별 생성한다. 원본 배열/알림 객체를 복사하고 탭 전환에 유지, 닫기/메뉴·프로젝트 변경의 unmount에 폐기한다. PM/grant 판정은 원본 project에만 의존한다.
- OverlayDrawer의 modal focus trap/외부 클릭과 Esc 닫기를 연결하고 연결된 호출 버튼만 복귀한다. 연속 오버레이 전환에서 이전 팝업의 예약 포커스가 새 오버레이를 방해하지 않도록 열린 overlay marker를 확인한다.
- I04의 전체 조건 표를 정적으로 검토했다: 여섯 화면 적용/done 예외, PM와 비PM/직접 리뷰 진입, 공유 선택/토스트 수명, 실제 인증 분리, 최종 실행 disabled, draft 미반영, 기존 핀 surface·코멘트 저장 보존.
- 기존 Button·WorkspaceHeader·ModalFrame·DadamControls·팀원 CSS·코멘트 controller 변경 없음. 새 저장/통신/HTML 주입 없음. README/index/module.css/example/test 파일·tests 폴더를 생성하거나 복원하지 않았다.
- 브라우저/E2E/스크린샷/dev server 및 실제 픽셀·키보드 조작은 검증하지 않았다. 기존 baseline-browser-mapping 데이터 경고는 빌드를 막지 않으며 관련 없는 의존성 업데이트는 수행하지 않았다.
- 범위 밖 신규 결함: 특이사항 없음. 기존 코멘트가 사용자별 production-preview에 남는 제한은 결정 D13대로 유지했다.
