# Task: T02 완성·재작업 모달과 완성본 팝업

## Status: done

## Goal

공용 헤더의 재작업·완성·완성본 버튼을 누르면 현재 예시 프로젝트에 대응하는 중앙 모달 또는 목록 팝업을 열고 닫는다. 실제 업무 처리는 수행하지 않으며 최종 실행 버튼은 모두 비활성이다.

## Decision Summary

- 선행 T01은 공유 프로젝트 상태와 여섯 화면의 ProjectHeader를 연결한다. 이 Task는 `components/common/ProjectHeader.tsx` 안에서 UI를 확장하며 새 생산 파일을 만들지 않는다.
- 중앙 모달은 기존 ModalFrame, 이력 팝업은 Fluent Popover, 새 액션은 common/Button을 재사용한다. 설정 버튼은 T03에서 연결한다. 색/폰트는 dadam, 우측 네 액션은34px를 유지한다.
- API·저장·실제 완성/재작업·다운로드·가짜 성공 토스트는 제외한다. 예시 통계와 실제 코멘트 DB를 합치지 않는다.
- **tests 폴더·테스트 파일 생성/복원, 브라우저·E2E·스크린샷·dev server 검증 금지.** `app/admin-utilities.css`·Button·ModalFrame·코멘트 저장소·인증은 변경하지 않는다.
- 근거: 2026-11-03-project-header 결정 D05/D07/D09~D14. HTML의 confirmDone/confirmRedo/openLoopHist 및 LOOP·섹션 구조를 UI 참고로만 사용한다.

## Implementation

### I01. 헤더 버튼과 단일 오버레이 상태 연결

- Related Files:
  - `components/common/ProjectHeader.tsx` :: ProjectHeaderContent/HeaderOverlay — 버튼 연결·호출 버튼 ref·닫기; modify
  - `config/project-header.ts` :: ProjectHeaderData/getProjectHeaderView/canProjectAction — 기존 읽기 전용 입력; read-only
  - `components/common/ProjectHeaderProvider.tsx` :: useProjectHeader — 같은 앱의 선택 프로젝트; read-only
  - `components/common/Button.tsx` :: Button — native disabled·ref·기본/primary; read-only
  - `components/comments/CommentsProvider.tsx`, `lib/comments/controller.ts` :: useComments/controller.suspendUi — 코멘트 UI 정리; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // ProjectHeader.tsx에 이미 있는 상태. 중복 상태/Provider를 만들지 않는다.
  type HeaderOverlay = null | "projects" | "history" | "complete" | "redo" | "settings";
  // 사용하는 기존 config 타입/함수
  type ProjectPermission = "done" | "redo" | "setup" | "assign" | "grant";
  interface ProjectSection {
    readonly id: string; readonly no: string; readonly title: string;
    readonly state: "done" | "doing";
  }
  interface ProjectVersion {
    readonly round: number; readonly at: string; readonly by: string;
    readonly done: number; readonly doing: number; readonly slides: number;
  }
  type CompletionProject = Pick<ProjectHeaderData,
    "id" | "name" | "stage" | "roles" | "permissions" | "round" | "writeState" |
    "sections" | "openCommentCount" | "reviewCommentCount" | "versions">;
  function canProjectAction(project: ProjectHeaderData, permission: ProjectPermission): boolean;
  function getProjectHeaderView(project: ProjectHeaderData): ProjectHeaderView;
  // 내부 콜백의 계약. 선언만 문서화하며 새 public API를 만들 필요는 없다.
  function openOverlay(next: Exclude<HeaderOverlay, null>): void;
  function closeOverlay(): void;
  ```

- **Data & Schema Fields**:
  - ProjectHeaderData의 관련 필드: id=`mois|edu`, name:string, stage=`review|active|done|drop`, roles=readonly (`PM|작성자|리뷰자`)[], permissions=readonly ProjectPermission[], round:number, writeState=`writing|done`, sections=readonly ProjectSection[], openCommentCount/reviewCommentCount:number, versions=readonly ProjectVersion[]. 모두 필수·non-null이다.
  - getProjectHeaderView는 isPm/roleLabel/roundLabel/showRound/showRedo/showHistory/showComplete/completeDisabled/doneCount/doingCount/historyCount를 반환한다. showRedo는 stage≠review이면서 PM 또는 redo 권한, showComplete는 stage≠review이면서 PM 또는 done 권한, showHistory는 stage≠review이면서 versions.length>0. completeDisabled는 writeState===done이다.
  - 기본 mois: round2/writing, PM·작성자·리뷰자, 완료 섹션3/작성 중3, 미처리 의견2, 리뷰 의견0, 1차 완성본1개. edu: round1/writing, 비PM/assign만, 완료1/작성 중5, 의견0, 이력0. 현재 상수에는 already-done/stage-review 사례가 없어도 조건 구현은 포함한다. 검증을 위해 새 시연 상태나 버튼을 추가하지 않는다.
  - redo/complete/history 호출 버튼 ref는 `React.RefObject<HTMLButtonElement | null>`. overlay 상태는 ProjectHeaderContent 내부에만 둔다. 부모는 pathname/project.id key로 내부 컴포넌트를 재생성하므로 메뉴/선택 변경 시 닫힌다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기존 표시 조건과 disabled를 유지한다. UI 열기 함수도 해당 액션의 표시/활성 조건을 확인한다. stage review 또는 권한 없는 액션을 별도 단축키 등으로 열지 않는다.
  2. Core Processing: 허용된 헤더 클릭은 기존 공통 열기 함수에서 controller?.suspendUi() 후 단일 overlay를 설정한다. selector/이력/모달이 동시에 열리지 않는다. aria-haspopup/expanded/controls와 고유 ID로 호출 대상/상태를 연결한다.
  3. Error & Exception Handling: close는 overlay=null만 수행한다. ModalFrame의 Esc/백드롭/포커스 복귀를 재사용하고 추가 전역 listener를 만들지 않는다. history 팝업 Esc는 capture에서 전파를 막아 기존 코멘트 Esc와 중복되지 않게 한다. 닫기 시 연결된 호출 버튼만 focus하며 메뉴/프로젝트 변경으로 제거된 버튼에는 focus하지 않는다.
  4. State Transition & Return: 닫은 뒤 round/versions/permissions/섹션·의견 수는 그대로다. 프로젝트 변경 토스트 이외에 새 성공 알림은 없다. 완료/재작업 최종 버튼은 handler가 없는 native disabled이며 overlay를 닫거나 다음 단계로 이동시키지 않는다.

### I02. 완성 중앙 모달

- Related Files:
  - `components/common/ProjectHeader.tsx` :: 완성 모달 JSX/내부 작은 목록 표현/useStyles — 현 회차 통계·섹션 목록; modify
  - `components/ui/ModalFrame.tsx` :: ModalFrame — 중앙 모달 계약; read-only
  - `components/common/Button.tsx` :: Button — 취소·N차 완성; read-only
  - `lib/ui/dadam-theme.ts` :: dadamUi, Fluent tokens — 표면·간격·타이포 기준; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // 기존 ModalFrame 사용에 필요한 props. 원본 파일/전역 동작은 변경하지 않는다.
  interface CompletionFrameInput {
    open: boolean; title: string; subtitle?: string; width?: number;
    contentKey: string; children: React.ReactNode; footer: React.ReactNode;
    onClose: () => void;
  }
  // 모든 값은 현재 project와 view에서 파생; 별도 상태로 복제하지 않는다.
  type CompletionSummary = {
    doneCount: number; doingCount: number; total: number;
    openCommentCount: number; progress: number;
  };
  ```

- **Data & Schema Fields**:
  - title=`{round}차 완성`, subtitle=프로젝트명, contentKey=`{id}:complete:{round}`, width560 기본. total=sections.length, progress=total===0 ? 0 : doneCount/total. 미처리 의견은 project.openCommentCount다.
  - 위쪽에 작성 완료·작성 중·미처리 의견 세 통계, 작성 진행률, 아래 섹션 no/title와 상태를 표시한다. HTML 의미를 유지하고 빨간 accent/별도 폰트를 복제하지 않는다.
  - mois 목록은 1.1 사업 배경 및 목적/2.1 추진 전략/3.1 지능형 RAG 검색 체계(done), 3.2 Multi-LLM 행정서식 초안 자동화/3.3 보안 체계 (CSAP 망연계)/4.1 추진 일정 및 WBS(doing). config에 있는 현재 배열을 그대로 사용한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: open은 overlay===complete일 때만 true다. `writeState === done`은 헤더의 완성 버튼 disabled이므로 새 모달을 열지 못한다. 의견 수를 CommentsProvider/store에서 읽지 않는다.
  2. Core Processing: ProgressBar 또는 같은 Fluent의 접근성 진행 표시를 max1/value progress로 렌더링하고 `작성 완료 N / 전체 M` 텍스트를 함께 둔다. 목록은 색만으로 구분하지 않고 `작성 완료`/`작성 중`을 읽을 수 있게 한다. 긴 목록은 ModalFrame의 본문 스크롤 영역을 사용한다.
  3. Error & Exception Handling: total0은 NaN 대신0과 `표시할 섹션이 없습니다.`를 표시한다. 임의 임계치로 완성을 허용하거나 완료 상태를 변경하지 않는다. 모달 닫기는 기존 ModalFrame에 맡겨 핀 코멘트의 data-modal-frame 계약을 유지한다.
  4. State Transition & Return: footer에는 CommonButton `취소`(onClose), primary CommonButton `{round}차 완성`(disabled)만 둔다. 비활성 버튼에 onClick/aria-disabled만을 쓰지 않고 실제 disabled를 적용한다.

### I03. 재작업 중앙 모달

- Related Files:
  - `components/common/ProjectHeader.tsx` :: 재작업 모달 JSX/섹션 분류 — 다음 회차 안내; modify
  - `components/ui/ModalFrame.tsx`, `components/common/Button.tsx` — 기존 모달·버튼; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  type ReworkSummary = {
    nextRound: number;
    fixedSections: readonly ProjectSection[];
    reworkSections: readonly ProjectSection[];
    reviewCommentCount: number;
    currentRoundIncomplete: boolean;
  };
  ```

- **Data & Schema Fields**:
  - nextRound=project.round+1, fixedSections는 state done, reworkSections는 state doing, currentRoundIncomplete=writeState!==done.
  - title=`{nextRound}차 재작업 시작`, subtitle=project.name, contentKey=`{id}:redo:{nextRound}`. 읽기 전용 섹션 목록 두 그룹 `작성 완료로 고정`/`다시 작업`을 만든다. 체크로 섹션 상태를 변경하거나 재작업 대상 편집 기능을 추가하지 않는다.
  - reviewCommentCount>0일 때만 `리뷰 코멘트 N건이 제작으로 전달됩니다.` 안내를 표시한다. 기본 fixture0에서는 숨긴다. 이 문구는 참고 UI이며 실제 전송은 없다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: showRedo 조건을 만족해야 open한다. 현재 회차 미완성이라도 재작업 모달 열기는 허용한다(HTML처럼 경고만 표시).
  2. Core Processing: currentRoundIncomplete이면 현재 `{round}차`가 아직 완성되지 않았다는 경고를 dadam 경고 표현으로 표시한다. 각 그룹에 섹션 no/title와 개수를 보여준다. 완료 그룹과 재작업 그룹은 현재 sections의 순서를 보존한다.
  3. Error & Exception Handling: 빈 그룹은 `해당 섹션 없음`을 표시한다. 저장된 완성본을 생성하거나 기존 코멘트를 전달/삭제하지 않는다. 실제 review draft 개수나 IndexedDB에 접근하지 않는다.
  4. State Transition & Return: footer는 CommonButton `취소`, primary CommonButton `{nextRound}차 재작업 시작`(disabled)이다. modal close 외 상태 변경 없음. 완료 칩/이력 개수/사이드바는 그대로 유지된다.

### I04. 완성본 이력 팝업

- Related Files:
  - `components/common/ProjectHeader.tsx` :: history Popover/완성본 항목 — 버튼 아래 읽기 전용 목록; modify
  - `config/project-header.ts` :: ProjectVersion — 과거 통계; read-only
  - `node_modules/@fluentui/react-popover/dist/index.d.ts` :: Popover/PopoverTrigger/PopoverSurface — 설치 API; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // project.versions를 복사한 뒤 내림차순 정렬; 원본 readonly 배열 mutation 금지
  type VersionList = readonly ProjectVersion[];
  // Popover open/onOpenChange는 기존 HeaderOverlay의 history 값으로 제어한다.
  ```

- **Data & Schema Fields**:
  - 각 항목: `{round}차 완성본`, at/by, 작성 완료done/작성 중doing/슬라이드slides, `보기`/`PPT` 버튼. mois의 1차 이력은 `2026.10.17 18:20`·정소담·완료3·작성 중3·42슬라이드다.
  - historyCount는 versions.length. 0이면 헤더 버튼과 팝업을 표시하지 않는다. 회차 내림차순으로 `[...versions].sort(...)`하고 정렬 키는 round를 사용한다. DOM key는 project.id와 round 조합이다.
  - selector와 같은 Fluent Popover 구조로 header history 버튼 아래/end에 배치한다. role dialog/이름 `완성본 이력`, 제한된 높이/overflowY auto, 좁은 화면 maxWidth 제약과 본문 줄바꿈을 해당 파일 Griffel로 둔다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 표시된 history 버튼에서만 열린다. trigger는 CommonButton을 PopoverTrigger(disableButtonEnhancement)로 감싸 ref/aria를 전달한다.
  2. Core Processing: 최신부터 항목을 표시한다. 팝업 내부 `보기`/`PPT`도 CommonButton으로 렌더링하고 native disabled를 지정한다. 다른 UI를 여는 handler/download href/URL 생성은 없다.
  3. Error & Exception Handling: Esc/외부 클릭으로 닫고 연결된 trigger로 포커스를 복귀한다. PopoverSurface에 접근성 label/id를 부여하고 키보드 focus가 팝업 내용에 진입하도록 Fluent 기능을 사용한다. 배열이 비게 되는 예외는 빈 팝업을 계속 유지하지 않고 표시 조건에 따라 렌더링하지 않는다.
  4. State Transition & Return: popup 닫기는 overlay만 초기화한다. 새 프로젝트/경로에서는 부모 key 변경으로 이전 이력 popup이 정리된다. Provider의 선택 프로젝트/토스트는 유지한다.

## Acceptance Criteria

- [x] mois의 재작업은 `3차 재작업 시작`, 완성은 `2차 완성`, 이력은 1차 스냅샷을 표시한다. 현재 섹션/의견 통계와 과거 버전 통계를 혼합하지 않는다.
- [x] 완성 모달은 통계3개·진행률·각 섹션 상태, 재작업은 미완성 경고·두 섹션 그룹·양수일 때 리뷰 의견 안내를 포함한다.
- [x] history는 회차 최신순이며 보기/PPT는 disabled다. N차 완성/N차 재작업 시작도 disabled이고 업무 상태/저장/토스트를 바꾸지 않는다.
- [x] 권한 없는 edu에서 redo/complete/history를 임의로 열 수 없다. stage review는 해당 묶음 숨김, already-done은 완성 열기 disabled다.
- [x] 기존 selector와 새 overlay가 동시에 열리지 않는다. Esc/취소/외부 클릭·모달 포커스 계약을 재사용하고 핀 저장에는 영향이 없다.
- [x] 프로젝트/메뉴 변경 시 열린 UI는 정리되고 선택 프로젝트는 유지된다. 설정 연결만 T03에 남았음을 기록한다.
- [x] 새 생산 파일 없이 ProjectHeader.tsx 안에서 구현하며 common Button/ModalFrame/팀원 CSS를 수정하지 않는다.

## Validation

- `npm.cmd run typecheck` — readonly 버전/섹션, ModalFrame/Popover/ProgressBar props 통과.
- `npm.cmd run lint` — hooks/콜백/unused imports 통과.
- `npm.cmd run build` — Fluent portal/client 경계·앱 빌드 통과.
- `git diff --check` — 공백/충돌 마커 없음.
- `git diff -- components/common/ProjectHeader.tsx` — overlay 허용 조건, 단일 상태, 안전한 빈 배열/분모0, 최종 버튼 native disabled/handler 부재를 정적으로 확인.
- `git diff --name-only`와 `git status --short` — Task 파일 범위, 테스트·별도 CSS·README 신규 생성 없음. `.memory/current.md`는 커밋 제외.
- 정적 확인 사례: PM writing/done, 비PM, stage review, versions0/복수, sections0/혼합, reviewCommentCount0/양수, close 후 재열기, route/project 교체. fixture를 바꾸는 새 테스트 파일은 만들지 않는다. 브라우저/실제 키보드·픽셀 검증은 미실시로 기록한다.

## Commit Message

```text
feat(project-header): 완성·재작업 모달과 완성본 팝업 연결

Plan: 2026-11-03-project-header
Phase: P01-project-header
Task: T02-completion-overlays

- 현재 프로젝트의 섹션 통계와 회차별 완성본 표시
- 기존 모달·공통 버튼을 재사용하고 최종 실행 비활성화
- 헤더 오버레이 수명과 코멘트 포커스 계약 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 48c4cf5

검증 후 이 Task의 생산 변경과 .memory 진행 기록만 명시적으로 stage한다. local current는 강제 추가/커밋하지 않는다. 완료 시 phase/plan 진행률과 current를 T03으로 전진한다. push·배포는 하지 않는다.

## Execution Record — 2026-11-03

- typecheck/lint/build/diff 공백 검사 통과. 생산 변경은 ProjectHeader.tsx 한 파일이다.
- ModalFrame 두 개와 Fluent Popover를 단일 overlay 상태로 연결했다. 예시 통계/섹션/과거 버전 구분, 내림차순 복사 정렬, 분모0·빈 목록·리뷰 의견0/양수·권한/완성/stage 조건을 정적으로 확인했다.
- 최종 완성·재작업·보기/PPT 버튼은 native disabled이며 실행 handler·저장·성공 알림이 없다. 설정 연결은 T03에 남아 있다.
- 기존 ModalFrame·Button·코멘트 controller·팀원 CSS 변경 없음. 설치된 Popover의 autofocus 경로와 history 컨테이너의 tabIndex=-1을 확인했다.
- 테스트 파일/폴더·브라우저·E2E·스크린샷·dev server 미사용. 실제 픽셀/키보드 조작 검증은 수행하지 않았다.
- 범위 밖 신규 결함: 특이사항 없음.