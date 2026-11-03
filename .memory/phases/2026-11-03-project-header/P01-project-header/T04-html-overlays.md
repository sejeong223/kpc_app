# Task: T04 HTML 기준 완성본 팝업·완성/재작업 모달 보정

## Status: done

## Goal

완성본 팝업과 완성/재작업 중앙 모달에서 누락된 아이콘·작은 버튼·내용 계층을 복원한다. HTML의 구조와 치수를 유지하며 기존 dadam 스타일을 적용한다. 여섯 메뉴가 같은 공용 구현을 사용한다.

## Decision Summary

- 사용자 2026-11-03 지시: HTML은 배치/치수/간격/문구/아이콘 기준, dadam은 색/서체/굵기/모서리/그림자/상태 기준이다. 동작은 기존 UI 전용·최종 실행 disabled를 유지한다.
- 새 생산 파일·README·index·module.css·테스트 파일·tests 폴더를 만들지 않는다. 브라우저/E2E/스크린샷/dev server 검증 금지. 기존 미커밋 헤더 개선은 보존한다.

## Implementation

### I01. 원본 대조 기준과 수정 경계

- Related Files:
  - `components/common/ProjectHeader.tsx` :: `useStyles`, `ProjectHeaderContent` — 팝업/모달 JSX 및 로컬 스타일; modify
  - `components/ui/ModalFrame.tsx` :: `ModalFrameProps`, `ModalFrame` — 선택적 스타일 슬롯만 추가; modify
  - `components/common/Button.tsx` :: `Button` — native 공용 버튼; read-only
  - `config/project-header.ts` :: `ProjectHeaderData`, `getProjectHeaderView` — 현재 fixture/권한; read-only
  - `lib/ui/dadam-theme.ts`, `app/dadam-tokens.css` — 현재 테마; read-only
  - `components/layout/WorkspaceHeader.tsx` — 이전 사용자 요청의 className 전달 수정 보존; read-only
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html` :: `openLoopHist`(3095), `confirmDone`(3083), `confirmRedo`(3089), CSS 64~69/391~395/470~483/1601~1606/1737 — 시각 참고; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type HeaderOverlay = null | "projects" | "history" | "complete" | "redo" | "settings";
  interface ProjectSection { readonly id: string; readonly no: string; readonly title: string; readonly state: "done" | "doing" }
  interface ProjectVersion { readonly round: number; readonly at: string; readonly by: string; readonly done: number; readonly doing: number; readonly slides: number }
  type OverlayProject = Pick<ProjectHeaderData, "id" | "name" | "round" | "writeState" | "stage" | "roles" | "permissions" | "sections" | "openCommentCount" | "reviewCommentCount" | "versions">;
  function getProjectHeaderView(project: ProjectHeaderData): ProjectHeaderView;
  ```

- **Data & Schema Fields**:
  - 기존 필드는 전부 필수/non-null. `id`는 mois/edu, `round` 숫자, `writeState` writing/done, `stage` review/active/done/drop. members/notifications/logs는 이 Task 수정 대상이 아니다.
  - view의 doneCount/doingCount/historyCount 및 showRedo/showHistory/showComplete/completeDisabled를 그대로 사용한다. 섹션/이력 정렬·집계 원본을 수정하지 않는다.
  - 시작 시 git status/diff를 읽는다. ProjectHeader의 흰 배경/1px 하단선, 폰트400, 프로젝트명600, 역할/회차 패딩2px7px/3px9px, D-day와 선택 체크 우측상단, WorkspaceHeader className 전달이 미커밋일 수 있다. 이를 덮어쓰거나 이전 HEAD로 복원하지 않는다.
  - 프로젝트 선택기 모양은 후속 직접 요청이 반영된 상태로 유지한다. 이번 보정은 history/complete/redo에 한정하며 selector의 폭·내용·체크·D-day를 역사 HTML로 되돌리지 않는다.
  - dadam 매핑: `tokens.fontFamilyBase`; 본문 dadamUi.bodySize/bodyLineHeight(14/20), 보조·xs 버튼 dadamUi.metaSize/metaLineHeight(12/16), 제목 dadamUi.titleSize/titleLineHeight(16/24), 숫자 tokens.fontSizeBase500(20). 일반400/강조tokens.fontWeightSemibold(현재500), 기존 프로젝트명만600. 원본의 별도 폰트·700~850 굵기를 그대로 복사하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 단일 overlay 및 pathname/project.id key, controller.suspendUi, 호출 버튼 ref/aria를 확인하고 유지한다.
  2. Core Processing: 아래 치수표를 컴포넌트 내부 Griffel로 적용한다. CommonButton의 전역 기본값을 바꾸지 않는다. common은 Tailwind 스캔 대상이 아니므로 새 `tw:` 클래스에 의존하지 않는다.
  3. Error & Exception Handling: HTML 스크립트를 실행/복사하거나 HTML 전체를 주입하지 않는다. 원본에 없는 저장 토스트·다운로드·API·타이머를 추가하지 않는다.
  4. State Transition & Return: UI 열기/닫기만 기존 상태를 변경한다. 실제 완료/재작업/보기/PPT는 native disabled를 유지한다.

### I02. 완성본 팝업과 작은 버튼

- Related Files:
  - `components/common/ProjectHeader.tsx` :: history Popover, `styles.popup`, `styles.version`, 버튼 행 — modify
  - `components/common/Button.tsx` — reuse/read-only
  - `@fluentui/react-icons` :: `Eye16Regular`, `ArrowDownload16Regular` — 설치된 export 확인 완료; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // 새로운 props/컴포넌트/영속 모델은 만들지 않는다.
  type VersionList = readonly ProjectVersion[];
  // Button은 기존 ComponentPropsWithRef<"button"> 계약, className/children/disabled 사용.
  ```

- **Data & Schema Fields**:

  | 항목 | 원본/목표 | 현재 차이와 처리 |
  | :--- | :--- | :--- |
  | 팝업 | 폭300px, padding6px, max-height70vh | selector 공용 폭360/padding8을 건드리지 않고 history용 class를 나중에 merge |
  | 제목 | `회차별 완성본`, margin0/padding8px 9px 4px | popupTitle 전체를 변경하지 말고 history용으로 보정 |
  | 이력 항목 | padding10px 12px, 1px 윗선, 세로gap2px | 현재12px 8px/gap6 수정 |
  | 내용 | `{round}차 완성본`, `{at} · {by}`, `작성 완료 {done} · 작성 중 {doing} · 슬라이드 {slides}장` | 문구·순서 유지 |
  | 버튼 행 | gap4px, margin-top6px | 공용 row gap8과 분리 |
  | 보기 | 눈 아이콘 → `보기` | Eye16Regular를12×12px/aria-hidden으로 추가 |
  | PPT | 다운로드 아이콘 → `PPT` | ArrowDownload16Regular를12×12px/aria-hidden으로 추가 |
  | 두 버튼 | border-box 높이/min-height22px, padding0 7px, icon/text gap6px | CommonButton 기본38px/좌우12px 덮어쓰기; width auto, font12/line16, 기존 dadam radius/color |

  - 팝업 좁은 화면 maxWidth는 기존 `calc(100vw - 32px)`를 유지해 화면 밖 이탈을 막는다. 원본 300px은 목표 폭이며 maxWidth보다 커지지 않는다.
  - disabled는 아이콘 생략 근거가 아니다. 모든 시각 요소를 그대로 두고 공용 비활성 색만 적용한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: view.showHistory는 stage review가 아니고 versions.length>0일 때만 true. 기존 PopoverTrigger/ref/aria 유지.
  2. Core Processing: `[...project.versions].sort((a,b)=>b.round-a.round)`로 최신순 표시한다. 위 전용 클래스와 아이콘을 기존 CommonButton에 지정한다.
  3. Error & Exception Handling: 버전0이면 버튼과 팝업을 표시하지 않는다. icon-only 접근성 이름으로 보기/PPT의 텍스트를 중복 읽게 만들지 않는다.
  4. State Transition & Return: Esc/바깥 클릭은 closeHistory, 연결된 trigger만 focus. 보기/PPT 클릭 handler·href·다운로드 생성 없음.

### I03. ModalFrame의 호출부별 간격 지정

- Related Files:
  - `components/ui/ModalFrame.tsx` :: `ModalFrameProps`, 기존 `useStyles` 및 JSX — modify
  - `components/common/ProjectHeader.tsx` :: 두 ModalFrame 호출 — modify

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ModalFrameProps {
    open: boolean; title: string; subtitle?: string; width?: number;
    contentKey: string; children: React.ReactNode; footer: React.ReactNode;
    onClose(): void;
    slotClassNames?: Partial<Record<"header" | "body" | "footer", string>>;
  }
  export default function ModalFrame(props: ModalFrameProps): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - slotClassNames는 선택/non-null string 값들, 생략 시 기존 스타일 그대로다. 새 런타임 상태 없음.
  - ModalFrame에 mergeClasses를 import하고 세 DOM slot에 `mergeClasses(styles.slot, slotClassNames?.slot)` 순서로 적용한다. styles 자체의 기본 값·다른 사용처·전역 토큰을 바꾸지 않는다.
  - ProjectHeader의 두 모달에 `width={520}`. 원본에 없는 `subtitle={project.name}`는 제거하며 ModalFrame의 optional aria-describedby 처리가 유지된다.
  - header padding16px 18px 12px/gap10px; body padding14px 18px/gap12px; footer padding12px 18px/gap8px/justifyContent flex-end. maxWidth/maxHeight·포커스·scroll/focus restoration은 기존 ModalFrame 그대로다.
  - 모달 하단 버튼은 원본 btn 크기인 높이32px/padding0 12px/gap6px로 호출부에서 지정한다. 기존 header action34와 별도 클래스다. 완성 실행 버튼 앞 Checkmark16Regular(12×12) 추가; 재작업 실행은 원본대로 텍스트만. 취소는 활성, 실행은 disabled.
- **Execution Flow / Logic**:
  1. Precondition & Validation: props 추가는 기존 모든 호출부가 생략 가능해야 한다. width 기본560을 전역 변경하지 않는다.
  2. Core Processing: Header 로컬 Griffel의 세 클래스를 두 모달에 전달한다. 기존 close32×32와 Dialog/반환 포커스를 재사용한다.
  3. Error & Exception Handling: classname 문자열 덧붙이기 대신 mergeClasses로 동일 CSS 속성 우선순위를 확정한다. portal 자식 descendant selector 우회나 전역 `.fui-DialogContent` 수정 금지.
  4. State Transition & Return: open/contentKey/onClose 수명 및 data-modal-frame/data-modal-body 계약 유지. 화면 전환 후 사라진 버튼으로 focus하지 않는다.

### I04. 완성/재작업 본문의 누락 및 임의 변경 복원

- Related Files:
  - `components/common/ProjectHeader.tsx` :: complete/redo JSX, stats/sections/rework styles — modify
  - `@fluentui/react-icons` :: Checkmark16Regular, Comment16Regular, Warning16Regular, LockClosed16Regular — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type CompletionSummary = { doneCount: number; doingCount: number; total: number; openCommentCount: number; progress: number };
  type ReworkSummary = { nextRound: number; reviewCommentCount: number; currentRoundIncomplete: boolean; fixedSections: readonly ProjectSection[]; reworkSections: readonly ProjectSection[] };
  ```

- **Data & Schema Fields**:
  - 기존 project/view에서 파생한다. total0이면 progress0, `reviewCommentCount>0`일 때만 안내, `writeState!==done`일 때만 미완성 경고. 기본 mois는 round2/writing, done3/doing3/openComment2/reviewComment0/이력1; edu는 round1, 이력0. 데모 화면을 더 만들지 않는다.
  - 완료 통계: 3열 gap8, 각 카드 border1/패딩10px 12px, 수치20px. `작성 중`이 양수이면 수치를 dadam warning foreground로 표시한다. 임의 회색 배경 대신 dadam 기본 표면, border/radius는 기존 토큰.
  - 완료 진행바: 높이6px, margin12px 0, 성공 색은 dadam success 토큰. Fluent ProgressBar `thickness="large"`와 필요한 로컬 rail/bar 슬롯 클래스를 써6px로 확정한다. `aria-label`/`aria-valuetext` 보존. 원본에 없는 별도 `작성 완료 N / 전체 M` 시각 텍스트 제거(aria-valuetext로 계속 제공).
  - 완료 목록: 바깥 border1/radius dadam, maxHeight260/overflowY auto. 행 padding7px 10px/gap8, no → 제목 → 상태 순서, 상태 marginLeft auto/flex none. 제목 ellipsis + title 속성으로 전체값 제공. 작성 완료 success, 작성 중 warning. 빈 목록 기존 안내 유지.
  - 재작업 리뷰 안내: Comment16Regular12px, `리뷰 코멘트 N건` 강조 + `이 제작으로 전달됩니다`, padding10px 12px/gap6/margin-bottom12. dadam brand background2/foreground2.
  - 재작업 경고: Warning16Regular12px, 원문 `{round}차를 완성하지 않고 재작업합니다. {round}차 완성본은 남지 않습니다.`, padding8px 10px/gap6/margin-bottom10, dadam warning 배경/글자.
  - 재작업 그룹: 원본2열 gap14, 제목 `고정 (작성 완료)` 앞 LockClosed16Regular12px + 중립 개수 배지 / `다시 작업 (작성 중)` + brand 개수 배지. 제목 margin16px 0 8px/gap6. 개수배지는 height17/min-width17/padding0 5px, 글꼴은 dadam meta12/16. 기존 `작성 완료로 고정`/`다시 작업` 축약을 원문으로 되돌린다.
  - 재작업 섹션은 줄 padding3px 0, no + 제목 ellipsis/title, **완료 목록용 border/행padding을 재사용하지 않는다**. 빈 그룹 텍스트는 원본 `없음`. 완성/재작업 wrapper에 중복 gap/margin을 더하지 않는다(원본 margin만 있는 경계는 부모 gap0).
  - 기존 작은 화면(480px 이하) 그룹1열 보정은 접근성을 위해 유지하며 데스크톱2열 원본을 바꾸지 않는다. 새 설명/프로젝트 부제목/불필요한 배너 추가 금지.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 실제 코멘트 데이터와 예시 통계를 섞지 않는다. view.showComplete/showRedo 및 disabled 조건 유지.
  2. Core Processing: 위 문구/아이콘/치수표 각각을 JSX·Griffel과 대응시킨다. 텍스트가 있는 아이콘은 aria-hidden=true.
  3. Error & Exception Handling: 섹션0/의견0의 분기와 긴 제목을 보존한다. snapshot 이력의 통계는 현재 sections에서 재계산하지 않는다.
  4. State Transition & Return: 취소/닫기는 overlay만 정리. 완료/재작업 버튼은 native disabled이며 데이터·메뉴·토스트를 바꾸지 않는다.

## Acceptance Criteria

- [x] 완성본 팝업300px/6px, 항목10px12px/gap2, 버튼22px/7px 및 눈/다운로드12px 아이콘을 소스상 확인한다.
- [x] 완성/재작업 모달520px, 본문14px18px, 하단32px 버튼 오른쪽 배치, 완성 체크 아이콘을 확인한다.
- [x] 원본 통계/진행바/목록 및 재작업 안내·경고·잠금 아이콘/정확한 그룹명을 확인한다.
- [x] 임의 부제목·진행률 캡션을 제거하되 aria 이름과 상태 설명은 유지한다.
- [x] ModalFrame 새 prop 생략 시 기존 모든 다른 사용처의 렌더링 기본값이 유지된다.
- [x] 헤더34px·배경/하단선·폰트/굵기·배지 간격·D-day·체크 우측상단 및 선택/권한/토스트/핀 계약 보존.
- [x] 새 생산/테스트/README/index/CSS 파일 없음. 브라우저 검증을 했다고 보고하지 않음.

## Validation

- `npm.cmd run typecheck` — 아이콘·슬롯 props·Fluent ProgressBar 타입 통과.
- `npx.cmd eslint components/common/ProjectHeader.tsx components/ui/ModalFrame.tsx` — 변경 파일 lint 통과.
- `npm.cmd run build` — 공용 ModalFrame 호출부 포함 앱 빌드 통과.
- `git diff --check` — 공백/충돌 마커 없음.
- `git diff --name-only` 및 `git status --short` — 시작 시 미커밋 작업을 보존하며 허용 범위만 수정했는지 확인.
- `rg -n 'Eye16Regular|ArrowDownload16Regular|Comment16Regular|Warning16Regular|LockClosed16Regular|slotClassNames|width=\{520\}' components/common/ProjectHeader.tsx components/ui/ModalFrame.tsx` — 연결 위치 확인 후 위 치수표/문구표를 실제 스타일 및 JSX와 정적으로 대조한다. 문자열 존재만으로 완료 판정하지 않는다.
- 신규 테스트 파일/폴더, 브라우저/E2E/스크린샷/dev server 없음. 정적 CSS 검토와 실제 computed style/픽셀 검증을 구분한다.

## Commit Message

```text
fix(project-header): HTML 기준 완성본 팝업과 모달 디자인 복원

Plan: 2026-11-03-project-header
Phase: P01-project-header
Task: T04-html-overlays

- 완성본 작은 버튼과 원본 아이콘·간격 복원
- 완료·재작업 모달 내용과 치수를 맞추고 다담 스타일 유지
- 다른 ModalFrame 사용처의 기본 동작과 스타일 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 완료 커밋 (Task: T04-html-overlays footer)

실행 전 미커밋 diff를 기록하고 사용자 선행 수정은 보존한다. Task 관련 경로/hunk만 명시적으로 stage하며 `git add .` 금지. `.memory/current.md`는 로컬 전용으로 커밋하지 않는다. T04 완료 후 phase done4/5, current T05로 전진한다. push/배포 없음.

## Execution Record — 2026-11-03

- typecheck, 변경 파일 ESLint, production build, git diff --check 통과. HTML openLoopHist/confirmDone/confirmRedo 및 치수표와 JSX/Griffel을 정적으로 대조했다.
- 완성본 팝업300px/패딩6px, 버튼22px/좌우7px/아이콘12px 복원. 모달520px와 본문14px18px, 버튼32px/오른쪽 정렬, 리뷰·경고·잠금 아이콘 및 원문 그룹/통계/목록을 적용했다.
- ModalFrame에는 선택적 header/body/footer 클래스만 추가했다. 기존 기본값/다른 호출부/포커스·코멘트 계약은 유지했다.
- 동일 헤더의 선행 미커밋 사용자 요청 수정(배경/하단선/글꼴/600/배지/D-day/체크 위치)을 보존하여 포함한다. 이에 필요한 WorkspaceHeader의 기존 className 전달 변경도 함께 보존하며 새로운 변경은 하지 않았다.
- 미커밋 상태였던 같은 계획의 결정/보정 청사진과 진행 문서를 포함한다. 무관한 소스 변경 없음. 새 생산파일/README/index/CSS/test 파일·tests 폴더 없음.
- 실제 픽셀·키보드·브라우저/E2E/스크린샷/dev server 검증 미실시. 기존 baseline-browser-mapping 데이터 경고는 빌드를 막지 않으며 관련 없는 의존성 변경은 하지 않았다. 범위 밖 신규 결함: 특이사항 없음.