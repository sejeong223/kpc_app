# Task: T05 HTML 기준 설정 패널 네 탭·여백·설명 복원

## Status: done

## Goal

프로젝트 설정 패널을 HTML의 폭·제목행·탭 위치·2열 폼·입력 여백·권한 표·알림 설명과 수신 버튼·로그4열 구성으로 복원한다. 색상·서체·굵기·모서리·그림자·포커스/disabled 표현은 현재 dadam 테마를 사용하며 실제 저장 없는 기존 draft 수명을 유지한다.

## Decision Summary

- 사용자 지시: HTML의 배치·치수·간격·문구·아이콘·컨트롤 종류를 임의로 생략/추가/교체하지 않는다. dadam은 표현 테마이며 Fluent/KPC 래퍼의 기본 크기가 원본 HTML보다 우선하지 않는다.
- `DadamInput`은 실제 dadam 원본 컴포넌트가 아니라 KPC의 Fluent Input 래퍼다. 사용자 정상 다담 입력창과 혼동하지 않는다. KPC 설정 호출부만 보정하며 공용 DadamControls 및 실제 dadam 저장소는 읽기 전용이다. 새 생산/README/index/CSS/test 파일·tests 폴더와 브라우저 검증은 금지한다.

## Implementation

### I01. 조사 근거와 오른쪽 패널의 구조/치수

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: `ProjectSettingsDrawer`, `useStyles`, Drawer/Tab JSX — modify
  - `components/common/ProjectHeader.tsx` :: settings mount/key/returnFocusRef — read-only
  - `components/ui/DadamControls.tsx` :: `DadamInput`, `DadamCheckbox` — 로컬 wrapper 재사용; read-only
  - `components/common/Button.tsx` :: `Button` — 버튼 재사용; read-only
  - `lib/ui/dadam-theme.ts`, `app/dadam-tokens.css` — 현재 테마; read-only
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html` :: `drawerHtml`2848~2875, CSS111/120~124/141~143/187/204~205/370~371/387~390/1559~1562 — 원본 구조; read-only
  - `node_modules/@fluentui/react-drawer/lib/components/DrawerBody/useDrawerBodyStyles.styles.raw.js`, `DrawerHeader/useDrawerHeaderStyles.styles.raw.js`, `node_modules/@fluentui/react-drawer/lib/shared/useDrawerBaseStyles.styles.raw.js` — Fluent 기본값 확인; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProjectSettingsDrawerProps {
    id: string; project: ProjectHeaderData; onClose: () => void;
    returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  }
  type SettingsTab = "info" | "perm" | "noti" | "log";
  export default function ProjectSettingsDrawer(props: ProjectSettingsDrawerProps): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - props 전부 필수/non-null, ref.current만 null 가능. project는 기존 readonly fixture. 탭 초기값 info.
  - 현재 소스 기준 원인: OverlayDrawer medium592px, DrawerHeader 기본24px 24px 8px, DrawerBody 좌우24px/마지막 자식 하단25px pseudo-class, 사용자 스타일 panel top20/body bottom24가 섞여 있다. 원본은 별개 값이며 다담 원본 디자인이라고 주장하지 않는다.
  - 아래 목표값은 border-box CSS px이며 브라우저 computed style을 측정한 값이 아니다.

  | 부분 | HTML 기준 목표 | 구현 지시 |
  | :--- | :--- | :--- |
  | 패널 | width560px, max-width96vw, top/right/bottom0 | OverlayDrawer 유지, 로컬 surface width/maxWidth 지정; 기존 z4300/backdrop4000 접근성 계약 유지 |
  | 제목줄 | padding14px 16px, gap8px, 1px 하단선 | DrawerHeader 로컬 class로 default padding/column을 덮고 하나의 수평행으로 구성 |
  | 제목 내용 | gear → 프로젝트 설정 → 프로젝트명 → 여유공간 → 닫기 | Settings16Regular를14×14, 제목 dadam16/24·500, 프로젝트명 dadam12/16·400/maxWidth240/ellipsis/title |
  | 닫기 |32×32, padding0, ghost | 기존 CommonButton, Dismiss16Regular14px, 접근성 이름 유지 |
  | 탭줄 | 제목 바로 아래, padding0 10px, gap2px, 하단선1px | **DrawerBody 밖에** TabList를 두어 본문padding 중복/탭 스크롤 이동 방지 |
  | 각 탭 | height38px, padding0 10px, gap6px | Tab에 로컬 class 지정, content/reserved content 글꼴도 dadam12/16·500, 기본 Fluent padding 누적 방지 |
  | 본문 | padding16px, flex1, min-height0, overflow auto | DrawerBody에 로컬 padding16; `:first-child`/`:last-child` padding도16으로 덮어 기본25px 잔존 방지 |
  | tabpanel | 별도padding0, min-width0 | 현재 paddingTop20 제거; focus-visible만 유지 |

  - DrawerHeaderTitle은 현재 column형 프로젝트명/negative action margin을 유발한다. 이번에는 DrawerHeader 안의 일반 heading/span/CommonButton으로 원본 한 줄을 표현하고 기존 `${id}-title`, `${id}-project` id를 유지한다. 불필요한 별도 래퍼 컴포넌트 파일은 만들지 않는다.
  - 제목/프로젝트명만 좁은 화면에서 축약 가능하고 닫기 버튼은 flexShrink0. 네 탭은 원본 순서 기본정보/권한/알림/로그. team/assets는 실제 tabs에 없으므로 추가하지 않는다.
  - 글꼴과 색은 surface에 명시한다: family tokens.fontFamilyBase, body dadamUi.bodySize/bodyLineHeight14/20, meta12/16, weight400/강조500. 원본 빨강은 dadam brand색으로, neutral/stroke/status/focus는 기존 토큰으로 매핑한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: T04 완료 여부와 현재 git diff를 읽고 선행 사용자 수정 보존. 부모는 overlay=settings일 때만 mount하며 pathname/project.id key로 교체한다.
  2. Core Processing: OverlayDrawer modalType=modal, unmountOnClose 및 data-modal-frame 그대로. TabList onTabSelect는 알려진4값만 수용, 각 Tab aria-controls와 panel role/aria-labelledby 유지.
  3. Error & Exception Handling: 창이 좁아도 패널은96vw 이내, 본문/표의 내부 overflow로 처리한다. 탭 콘텐츠가 닫기 버튼을 가리거나 외부 body에 가로스크롤을 만들지 않는다. 새 전역CSS/팀원admin-utilities 변경 금지.
  4. State Transition & Return: Esc/바깥클릭/닫기는 기존 close 콜백 사용. focus trap/연결된 버튼으로 복귀·새 overlay가 열릴 때 focus 강탈 방지 조건 유지.

### I02. 기본정보 2열 폼과 입력란의 과도한 앞 여백 제거

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: `ProjectSettingsDraft`, `createSettingsDraft`, info JSX/useStyles — modify
  - `components/ui/DadamControls.tsx` :: `useStyles.input`, `DadamInput` — read-only
  - `node_modules/@fluentui/react-input/lib/components/Input/useInputStyles.styles.raw.js` :: root/input padding — read-only
  - `C:/Users/김세정/Documents/GitHub/dadam_app/dadam_app/app/(authenticated)/meetings/_components/MeetingListMobileView.tsx` :: Fluent Input 직접 import — 출처 구분 참고만; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type ProjectPermission = "done" | "redo" | "setup" | "assign" | "grant";
  interface ProjectSettingsDraft {
    name: string; organization: string; budgetEok: string; dueDate: string;
    permissionsByMember: Record<string, ProjectPermission[]>;
    notifications: { deadline: boolean; complete: boolean; rework: boolean; comment: boolean; inApp: boolean; email: boolean };
  }
  type InformationField = "name" | "organization" | "budgetEok" | "dueDate";
  function createSettingsDraft(project: ProjectHeaderData): ProjectSettingsDraft;
  // 기존 컴포넌트 내부 콜백 계약
  // changeInformation(field: InformationField, value: string): void
  ```

- **Data & Schema Fields**:
  - name/organization/dueDate 원본 string 복사, budgetEok는 UI 임시 문자열이다. HTML처럼 첫 표시 `${project.budgetEok}억원`으로 초기화한다. 실제 project.budgetEok:number는 수정하지 않는다. draft 이름/예산/날짜를 저장하거나 파싱·정규화할 후속 기능은 없다.
  - permissionsByMember는 각 permissions 배열 복사(PM은 전체5개), notifications는 새 객체 복사. 모든 필드 non-null; 입력 중 빈 문자열 허용. 새 API/DB 스키마 없음.
  - 필드 순서/표현: 1행 `제안 프로젝트명`/`발주 기관`, 2행 `사업 예산`/`제출 마감일`, 3행 전체폭 `진행 상태`. grid `repeat(2,minmax(0,1fr))`, gap12px 14px; field gap5px; 상태 grid-column1/-1, 내부gap8px.
  - 각 입력은 HTML과 같은 **text 입력**. 임의로 추가된 number spinner/step/min, date 달력, 우측 contentAfter 단위 및 라벨 `(억원)` 제거. 예산은 `9.8억원`처럼 텍스트 안에 단위를 포함한다. 원본 HTML은 날짜도 type미지정 text이며, 입력값 예시는 ISO 문자열 그대로다. 원본에 없는 입력 UI를 새로 만들지 않는다.
  - 입력 높이32px/minHeight32px, width100%, box-sizing border-box. 텍스트 크기는 기존 dadam body14/20, color/border/radius/focus는 DadamInput 재사용.
  - **패딩을 한 곳에서만 적용**: 설정 로컬 `styles.input` root 좌우10px/상하0. 같은 로컬 class의 `& .${inputClassNames.input}`에 paddingLeft0/paddingRight0, margin0/minWidth0를 지정한다. root10+내부0 = HTML10이며 border1은 별도다. Fluent의 content 유무에 따른 입력 padding까지 덮도록 descendant class를 사용한다. 글로벌 DadamControls/토큰은 수정하지 않는다.
  - KPC DadamInput root12 + Fluent medium input combined12 선언은 소스상 중첩 원인이다. **실제 다담의 padding24px 또는 padding0px라고 단정하지 않는다.** 사용자 이미지의 실제 DOM/computed style은 확인하지 않았고 원본 dadam 앱에는 DadamInput이라는 이름이 없다.
  - 진행 상태 배지 height20/padding0 7/radius는 dadam. active일 때 CommonButton `진행안함으로 전환` + Dismiss16Regular12px, height26/padding0 9px, marginLeft auto. drop일 때 `진행 중으로 되돌리기` primary26px/9px. 둘 모두 disabled. stage review/done 기존 정확한 레이블과 상태 노출 조건 유지; 기본 두 fixture active.
  - HTML의 dropWhy/dropAt는 현재 fixture에 없는 선택 데이터이고 실제 상태전환은 범위 밖이다. 사유/저장 위치를 거짓으로 채워 넣거나 새 상태전환 기능을 만들지 않는다. 값이 없는 조건부 문구를 표시하지 않는 것은 HTML 자체의 조건과 일치한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: draft 초기화는 useState의 lazy initializer 한 번. parent key/unmount로 프로젝트·메뉴 변경/닫기 시 새 초기값을 얻는다.
  2. Core Processing: 위4개 field와 label htmlFor/id를 유지하고 changeInformation에 raw string 전달. 동일 draft로 탭 이동 중 값 유지. 원본2열을 임의1열로 만들지 않는다.
  3. Error & Exception Handling: 긴 문자열은 input 기본 내부 가로 스크롤로 처리하고 셀minWidth0. native text 입력으로 조합중/미완성 숫자를 삭제하지 않는다. actual save 검증/성공토스트 없음.
  4. State Transition & Return: UI draft만 변경. 헤더 이름/사이드바 권한/프로젝트 데이터는 그대로이며 close하면 폐기된다.

### I03. 권한 탭의 이름행·PM 표시·설명 복원

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: `permissionColumns`, perm JSX, permission styles — modify
  - `config/project-header.ts` :: `ProjectMember`, `canProjectAction` — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProjectMember { readonly id: string; readonly name: string; readonly department: string; readonly isPm: boolean; readonly permissions: readonly ProjectPermission[] }
  type PermissionColumn = { value: ProjectPermission; label: string; description: string };
  const permissionColumns: readonly PermissionColumn[];
  function canProjectAction(project: ProjectHeaderData, permission: ProjectPermission): boolean;
  // changePermission(memberId: string, permission: ProjectPermission, checked: boolean): void
  ```

- **Data & Schema Fields**:

  | value | label | 원본 description (열 title) |
  | :--- | :--- | :--- |
  | done | 완성 | 작성이 끝났다고 보고 완성 처리 |
  | redo | 재작업 | 파일 업로드부터 다시 진행 (작성 완료 섹션은 고정) |
  | setup | 제작 설정 | 제작 설정의 프롬프트 세트 · Skill · Template 선택과 프로젝트 프롬프트 수정 |
  | assign | 담당 지정 | 목차 담당자 · 리뷰자 지정 |
  | grant | 권한 부여 | 이 화면에서 다른 사람에게 권한 부여 |

  - 첫 열명은 `이름`. 표 width100%/minWidth0/table-layout fixed, 첫열34%, 나머지균등. 첫열좌측/나머지중앙. thead padding9px 4px/white-space normal, tbody padding11px 12px; 표1px divider dadam stroke. 긴 이름은 셀 안에서 축약/title, 열 자체는 화면 밖 확장하지 않는다.
  - 이름 셀은 avatar → 강조이름 → PM배지 수평gap8. 원본 avatar22×22/circle/2px 표면색border, 첫글자 `member.name[0]`(빈 이름 ?), title 전체이름. 임의 원본 PEOPLE 색을 새 데이터로 복사하지 말고 dadam brand background/foreground로 표시한다. 이름행의 현재 별도 부서줄은 제거하며 데이터 자체는 보존한다.
  - PM은 별도 배지 `PM`(height20/padding0 7/dadam brand); `이름 · PM` 텍스트로 합치지 않는다. member.department는 이 탭 원본에 표시되지 않으며 로그에서 부가정보로 표시한다.
  - 체크박스는 DadamCheckbox 그대로, 이 표의 local selector `checkboxClassNames.indicator`에16×16/margin0, root minHeight16/padding0/justifyContent center, hidden input의 hit target16px를 중앙에 맞춘다. 기본 DadamCheckbox의 minHeight32/indicator margin7px8px가 셀에 더해지지 않게 한다. focus/disabled/label 연결 유지.
- **Execution Flow / Logic**:
  1. Precondition & Validation: canEditPermissions=canProjectAction(project,"grant")로 원본 권한 판단. draft 권한 변경으로 스스로 권한을 얻지 않는다.
  2. Core Processing: PM은5개 모두 checked/disabled. 비PM 행은 권한 있을 때만 수정하며 unknown member/PM/권한없음 요청은 반환. add는 중복제거, remove는 해당값만 제외.
  3. Error & Exception Handling: members=[] 기존 빈 안내 유지. title 외에 접근성 설명이 필요하면 해당 description을 열 aria-label에 결합하고 시각적으로 새 도움말 블록을 추가하지 않는다.
  4. State Transition & Return: permissionsByMember만 변경, 탭전환 유지/close초기화. 실제 인증·header/sidebar 노출과 분리.

### I04. 알림 네 설명과 수신 방식 선택 버튼

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: `notificationFields`, `deliveryFields`, noti JSX, checkbox/segment styles — modify
  - `config/project-header.ts` :: `notifications` 예시 기본값 — email만 원본 선택 상태로 수정; modify
  - `components/ui/DadamControls.tsx`, `components/common/Button.tsx` — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type NotificationField = keyof ProjectSettingsDraft["notifications"];
  type NotificationEvent = "deadline" | "complete" | "rework" | "comment";
  type DeliveryField = "inApp" | "email";
  const notificationFields: readonly { value: NotificationEvent; label: string; description: string }[];
  const deliveryFields: readonly { value: DeliveryField; label: string }[];
  // changeNotification(field: NotificationField, checked: boolean): void
  ```

- **Data & Schema Fields**:

  | value | 원문 label | 원문 description |
  | :--- | :--- | :--- |
  | deadline | 제출 마감 리마인더 | 7일 전 · 3일 전 · 1일 전 · 당일 |
  | complete | 완성 알림 | PM 및 프로젝트 참여자에게 |
  | rework | 재작업 시작 알림 | 작성 중 섹션 담당자에게 |
  | comment | 의견 등록 알림 | 담당 작성자에게 |

  - notificationFields 네 개를 원문 순서로 유지한다. 각 label/description을 DadamCheckbox label 슬롯의 두 줄 span으로 렌더링한다. 기존 `알림 항목` legend/fieldset border/padding12는 HTML에 없으므로 제거한다.
  - 행은 원본 .ck처럼 display flex/align-start, padding9px 2px/border-bottom1px/gap9px. indicator16px/margin2px 0 0/align-self flex-start. label padding/margin0, 제목 dadam14/20·500, 설명 dadam12/16·400/secondary color. 숨은 input 영역을 indicator 위치에 맞추고 라벨 클릭/Space 기본동작 유지. 설명 id를 input aria-describedby에 연결해 보조 설명을 접근 가능하게 한다.
  - 네 행 뒤 제목 `수신 방식`: margin16px 0 8px. 그 아래 인접 버튼 묶음 padding3/gap2/dadam neutral background/radius. CommonButton 두 개 label `앱 내 알림`/`이메일`, height26/padding0 10, border0, font dadam meta12/16. on은 neutral white/foreground1/shadow2, off transparent/secondary color, focus는 공용버튼 유지.
  - 수신 방식은 **다중 선택**, radio/single-value SegmentedControl로 바꾸지 않는다. 두 버튼 각각 `aria-pressed`=draft.inApp/email, className active 상태 + 전용 스타일로 원본선택 모양. 둘 다 on/off 가능하며 한쪽 클릭으로 다른쪽을 바꾸지 않는다.
  - HTML은 네 이벤트 checked 및 두 수신 버튼 on. 현재 fixture notifications.email=false만 true로 맞춘다. 나머지5개true 유지. 이것은 UI 예시 초기상태이며 실제 이메일 수신설정 변경이나 발송이 아니다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: notificationFields로4개, deliveryFields로2개를 타입 분리해 잘못된 field를 그룹에 넣지 않는다.
  2. Core Processing: checkbox는 data.checked===true, 버튼은 해당 boolean 반전. setDraft 이전 상태를 복사해 해당 key만 수정한다.
  3. Error & Exception Handling: 설명 줄을 좁은 화면에서 자동줄바꿈한다. 알림 항목의 label 전체 클릭을 위해 nested label이나 nested input을 만들지 않는다. 외부메일/토스트/저장 처리 없음.
  4. State Transition & Return: 탭 이동시6개값 유지, 닫기/프로젝트·메뉴 변경 시 폐기. reopen시fixture에서 다시 시작.

### I05. 로그4열과 최종 누락 대조

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: log JSX/table styles — modify
  - `config/project-header.ts` :: `ProjectLog`, project.logs — read-only (이력 데이터 변경 없음)

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProjectLog { readonly id: string; readonly name: string; readonly department: string; readonly role: string; readonly detail: string; readonly at: string }
  ```

- **Data & Schema Fields**:
  - 필드는 전부 필수 string, 각 project.logs는 readonly다. HTML LOGS 전역 목록을 모든 프로젝트에 복제하지 않고 현재 프로젝트별 fixture를 유지한다.
  - 컬럼은 `이름 | 권한 | 변경 내역 | 일시` 네 개. 첫 셀에 강조name와 보조department를 나란히 넣는다. 현재 `부서·직급` 별도열을 제거하되 정보 자체는 첫셀로 이동한다.
  - th padding9px 12px/td11px 12px, divider1px. 원본 table.tbl width100%/minWidth880px(703행)를 로그표에 적용하고 **표 컨테이너 안에서만 가로스크롤**한다. 권한표는 원본 .perm-tbl override대로 minWidth0/fixed이며 로그표와 동일 클래스 하나로 폭을 묶지 않는다. 일시는 nowrap, header는 sticky top0/z1/neutral background.
  - 기존 empty message는 logs=[]에만 유지. 검색/필터/정렬/페이저/다운로드 등 HTML 설정 로그에 없는 UI 추가 금지.
- **Execution Flow / Logic**:
  1. Precondition & Validation: logs는 현재 project에서 읽으며 입력draft와 혼합하지 않는다.
  2. Core Processing: key=log.id, 모든 문자열을 React text로 렌더링한다. 번호·열 추가 없이 원본4열에 매핑한다.
  3. Error & Exception Handling: 데이터 부재 시 빈 안내, 긴 detail/department는 원본이 허용한 줄바꿈. 원본 문자열을 dangerouslySetInnerHTML로 주입하지 않는다.
  4. State Transition & Return: 로그는 읽기전용. 최종 검토에서 I01~I05 치수/문구/아이콘과 HTML을 대조하고 예외(기존 권한정책/disabled/draft/테마/좁은화면)만 기록한다. 임의로 차이를 “다담 적용”으로 처리하지 않는다.

## Acceptance Criteria

- [x] 설정 폭560/max96vw, 제목 한 줄14px16px/gear, 탭 본문 밖, 본문16px/panel0을 소스로 확인한다.
- [x] 기본정보2열/gap12px14px, label gap5, input32px/root10+slot0. 다른 입력창과 실제 dadam 코드 변경 없음.
- [x] HTML 원문 라벨/예산단위/text 입력을 유지하고 불필요한 달력·number spinner·분리단위·중복단위 라벨을 제거한다.
- [x] 권한 이름행의 avatar22/PM배지, 체크16, 첫열34%/나머지중앙, 원문5개툴팁이 있다.
- [x] 알림4개 정확한 제목/설명과 수신 방식2개 다중 선택 버튼이 있다. 원본에 없는 fieldset/legend 제거.
- [x] 알림6개초기true, 탭이동유지/닫기초기화, 실제 저장·헤더/권한/발송에 미반영.
- [x] 로그4열, 부서정보 첫셀 유지, 표 내부 가로스크롤/권한표 폭과 분리.
- [x] PM/grant 조건, Tab/label/aria/포커스/오버레이·코멘트 경계 유지.
- [x] 새 생산파일/테스트/README/index/별도CSS 없음. T04 포함 헤더 기존후속수정 회귀 없음.

## Validation

- `npm.cmd run typecheck` — Drawer/Tab/input/checkbox 슬롯·boolean key·draft 타입 통과.
- `npx.cmd eslint components/common/ProjectSettingsDrawer.tsx config/project-header.ts` — 변경파일 lint 통과.
- `npm.cmd run build` — 앱 빌드 통과.
- `git diff --check` — 공백/충돌마커 없음.
- `git diff --name-only` 및 `git status --short` — 이번파일/.memory만 수정; 기존 미커밋 보존 확인.
- `rg -n '7일 전|PM 및 프로젝트 참여자에게|작성 중 섹션 담당자에게|담당 작성자에게|aria-pressed|description|inputClassNames|checkboxClassNames' components/common/ProjectSettingsDrawer.tsx` — 문구/슬롯 연결을 찾고 I01~I05의 수치/구조표와 실제 JSX·스타일을 정적으로 대조한다. 단순 검색 일치만으로 완료하지 않는다.
- `rg -n 'indexedDB|localStorage|sessionStorage|fetch\(|dangerouslySetInnerHTML' components/common/ProjectSettingsDrawer.tsx config/project-header.ts` — 신규통신/저장/HTML주입 없음. 미일치 exit1 정상.
- 기존6개헤더/완료한제안예외·모달disabled·draft·권한·알림·기존미커밋헤더개선을 정적검토한다. 새 테스트파일/폴더 및 브라우저/E2E/스크린샷/dev server를 만들거나 실행하지 않는다. 실제픽셀/IME/터치/키보드 검증 미실시 명시.

## Commit Message

```text
fix(project-header): HTML 기준 설정 패널 구성과 설명 복원

Plan: 2026-11-03-project-header
Phase: P01-project-header
Task: T05-html-settings

- 설정 패널 여백과 기본정보 2열·입력 간격 보정
- 권한 표시와 알림 설명·수신 버튼·로그 4열 복원
- 다담 스타일과 임시 입력 수명 및 실제 저장 제외 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 완료 커밋 (Task: T05-html-settings footer)

검증 후 관련 파일만 명시적으로 stage해 한국어로 커밋한다. current는 로컬 전용이며 강제 추가하지 않는다. T05 완료 시 plan/phase를 done5/5, current Active Task를 없음으로 갱신하며 이전 T01~T03/T04 이력을 보존한다. push/배포는 수행하지 않는다.

## Execution Record — 2026-11-03

- typecheck, 변경 파일 ESLint, production build, git diff --check 통과. HTML drawerHtml 및 치수·문구표를 각 JSX/Griffel 규칙과 정적으로 대조했다.
- 패널560/max96vw, 제목행14px16px/gear, 본문 밖38px탭, 본문16px/panel0 적용. DrawerBody 마지막 자식의 Fluent 기본 패딩도 로컬 클래스에서 보정했다.
- 기본정보2열/gap12px14px, 입력32px/root10px+내부input0px 적용. 원본 라벨·텍스트 예산단위·text 입력으로 복원했다. KPC 공용 DadamControls 및 실제 dadam 저장소는 변경하지 않았다.
- 권한 이름열34%/아바타22px/PM배지/체크16px 및 5개 설명을 복원했다. 알림4개 원문 제목·설명과 앱 내 알림/이메일 다중 선택 버튼을 적용하고 UI fixture 기본값6개true로 맞췄다.
- 로그4열로 부서 정보를 이름 옆에 유지했다. 원본 로그 최소폭880px는 표 컨테이너 안에서 스크롤하고 권한표는 minWidth0/fixed로 분리했다.
- draft 불변복사/함수형 업데이트, PM/grant 제한, 탭전환 유지/닫기·프로젝트·메뉴 변경 초기화, 실제 저장·발송·다운로드 제외를 확인했다. 앞서 완료한 T04와 기존 헤더 개선은 보존했다.
- 새 생산/README/index/CSS/test 파일 및 tests 폴더 없음. 브라우저/E2E/스크린샷/dev server·실제 픽셀/IME/키보드 조작은 미실시다. 타입·빌드 및 소스 대조를 실제 화면 검증으로 보고하지 않는다.
- 기존 baseline-browser-mapping 경고는 빌드를 막지 않아 의존성은 변경하지 않았다. 범위 밖 신규 결함: 특이사항 없음. 다른 화면의 입력란 전역 수정은 수행하지 않았다.