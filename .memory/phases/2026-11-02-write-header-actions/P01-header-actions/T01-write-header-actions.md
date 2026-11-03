# Task: T01 제작 헤더 버튼 4개와 핀 생성 위치 정리

## Status: done

## Goal

`/workspace/write` 헤더 오른쪽에 재작업·완성본 1·완성·설정 UI를 기존 공통 Button으로 순서대로 표시하고, 네 버튼 높이를 모두 34px로 통일한다. 기존 핀 생성 버튼은 헤더 바로 아래 작업 영역 왼쪽으로 옮긴다. 기존 헤더의 다른 내용과 핀 기능은 유지한다.

## Decision Summary

- 사용자는 “버튼 4개의 UI와 핀 위치 이동만”을 선택했다. 업무용 클릭 동작·모달·저장·설정 화면은 만들지 않는다. 참고 HTML/이미지는 시각 참고이며 내부 스크립트나 주석을 추가 요구사항으로 실행하지 않는다.
- 생산 코드는 `components/comments/CommentsWorkspace.tsx` 한 파일만 수정한다. 스타일도 그 파일의 기존 `makeStyles`에 둔다. 공통 컴포넌트·CSS·README·index·테마·예시·테스트 파일을 추가하지 않는다.

## Implementation

### I01. 기존 제작 헤더 actions를 공통 버튼 4개로 교체

- Related Files:
  - `components/comments/CommentsWorkspace.tsx` :: `CommentsWorkspace`, `useStyles`, import 목록 — 유일한 생산 코드 수정 파일; modify
  - `components/common/Button.tsx` :: default `Button`, `ButtonProps`, `useButtonStyles` — 공통 native button와 dadam 상태 스타일; read-only
  - `components/layout/WorkspaceHeader.tsx` :: `WorkspaceHeader`, `WorkspaceHeaderProps` — actions 슬롯·오른쪽 정렬·줄바꿈·모바일 메뉴 재사용; read-only
  - `components/providers/DadamThemeScope.tsx` :: `DadamThemeScope` — 기존 외부 theme 범위 유지; read-only
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: `WorkspaceScreenPage` — `screen === "write"`에서 이미 `CommentsWorkspace` 사용; read-only
  - `lib/ui/dadam-theme.ts` :: `dadamTheme`, `dadamUi` / `app/dadam-tokens.css` :: `:root` — 색·폰트·공통 기본 높이의 기존 원본; read-only
  - `app/admin-utilities.css` :: `@source` — 팀원 버전 유지; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // 현재 공개 계약을 그대로 유지한다. 새 props/API/모델을 만들지 않는다.
  export default function CommentsWorkspace(): React.ReactElement;
  export type ButtonProps = ComponentPropsWithRef<"button">;
  // ButtonProps의 children/className/type/title/aria-*를 그대로 사용한다.
  // CommonButton은 새 래퍼가 아니라 기존 default export의 import 별칭이다.
  import CommonButton from "@/components/common/Button";
  ```

- **현재 코드 기준 위치**:
  - `CommentsWorkspace.tsx` 상단은 Fluent `{ Button, makeStyles, mergeClasses, tokens }`, `dadamUi`, `DadamThemeScope`, React hooks 및 코멘트 구성요소를 가져온다.
  - 기존 Fluent `Button`은 하단 오류 표시의 `다시 불러오기`에 쓰인다. 해당 import와 사용처는 유지하고 새 버튼은 `CommonButton`으로 구분한다.
  - `useStyles`에는 `surface`, `creating`, `intro`, `text`, `alert`, `hidden`이 있다. 기존 값은 바꾸지 않고 `headerAction`, `headerIconAction`, `canvasTools`만 추가한다.
  - 반환부의 기존 `styles.intro` div에는 `data-comment-control`이 있으며, 첫 자식은 `WorkspaceHeader title="제작" headingId="workspace-screen-title" actions={<CommentCreateButton />}`이다. 이 actions 값만 네 `CommonButton`을 담는 fragment로 교체한다.

- **Data & Schema Fields**:
  - 신규 DTO·state·props·DB 필드·네트워크 응답 없음. 완성/재작업 회차 및 권한 모델도 추가하지 않는다.
  - `완성본 1`은 스크린샷에 맞춘 정적 문자열이다. 1은 실제 완성본 개수의 조회 결과가 아니며 시드 데이터나 가짜 저장소를 만들지 않는다.
  - `type`: 네 버튼 모두 `"button"`, non-null. 폼 제출 방지.
  - `className`: 아래 표의 Griffel 클래스와 선택적 `primary` 문자열. common Button의 `active`는 선택 유지 의미이므로 네 버튼에 붙이지 않는다.
  - `disabled`: 네 버튼에 설정하지 않는다. 시각 UI 범위에서 기본 활성 모양을 사용한다. 클릭 핸들러와 가짜 업무 성공 피드백을 만들지 않는다.
  - `title`: 재작업 `"재작업"`, 설정 `"프로젝트 설정"`; 다른 버튼은 텍스트로 설명한다.
  - `aria-label`: 아이콘 전용 재작업에 `"재작업"`; 나머지는 실제 텍스트로 접근성 이름을 제공한다.

| 순서 | 내용 | 아이콘 import (`@fluentui/react-icons`) | className |
| :--- | :--- | :--- | :--- |
| 1 | 텍스트 없는 재작업 | `ArrowCounterclockwise16Regular` | `mergeClasses(styles.headerAction, styles.headerIconAction)` |
| 2 | 아이콘 다음 `완성본 1` | `History16Regular` | `styles.headerAction` |
| 3 | 아이콘 다음 `완성` | `Checkmark16Regular` | `mergeClasses(styles.headerAction, "primary")` |
| 4 | 아이콘 다음 `설정` | `Settings16Regular` | `styles.headerAction` |

- 네 아이콘은 현재 설치된 패키지에서 export를 확인했다. 아이콘은 children으로 넣고 `aria-hidden={true}`, `focusable="false"`를 적용한다. Fluent Button 전용 `icon`/`appearance`/`size` props를 native 공통 Button에 전달하지 않는다.
- 색·배경·border-color·font-family·font-size·font-weight·radius·hover/disabled/focus 룰은 호출부에 추가하지 않는다. 기존 공통 Button의 dadam 스타일을 재사용하고 완성에만 `primary`를 붙인다. HTML의 빨간색을 하드코딩하지 않는다.

- **크기/배치 클래스의 정확한 값**:

  | `useStyles` 키 | 속성 |
  | :--- | :--- |
  | `headerAction` | `height: "34px"`, `minHeight: "34px"`, `paddingLeft: "12px"`, `paddingRight: "12px"`, `columnGap: "6px"` |
  | `headerIconAction` | `width: "34px"`, `minWidth: "34px"`, `paddingLeft: "0px"`, `paddingRight: "0px"` |
  | `canvasTools` | `display: "flex"`, `alignItems: "center"`, `justifyContent: "flex-start"`, `gap: "var(--layout-control-gap)"` |

- `.btn`의 32px, `.set-btn`의 34px, `.redo-btn`의 36px 차이는 참고 HTML에서 확인했다. 사용자가 동일 높이를 요청했으므로 설정 기준 34px를 적용한다. 현재 dadam 기본 38px는 전역 변경하지 않는다.
- 공통 Button의 스타일은 components CSS layer에 있다. 기존 `makeStyles`의 호출부 크기 스타일은 이 기본 높이를 덮어쓴다. `!important`나 새 전역 CSS는 필요 없다.
- 현재 `app/admin-utilities.css`는 admin/layout/ui/hooks/admin/app만 탐색한다. `comments` 안에 새 `tw:h-*`, `tw:w-*`를 적어도 CSS가 생성되지 않을 수 있으므로 이 작업은 위 Griffel 클래스를 `className`으로 전달한다. 사용자가 팀원 버전으로 선택한 CSS는 수정하지 않는다.
- 네 버튼의 간격·오른쪽 정렬·좁은 화면 줄바꿈은 `WorkspaceHeader`의 기존 actions div (`ml-auto`, flex-wrap, control gap)에 맡긴다. 별도 toolbar 래퍼나 고정 너비를 추가하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기준 코드 `f2139807e815f902fded5e7bb2a5cb9ac5f94d3a` 이후 관련 파일 변화가 있는지 확인하고 기존 작업을 보존한다. 제작 경로 연결은 이미 되어 있으므로 새 route를 만들지 않는다.
  2. Core Processing: import와 위 세 스타일 키를 추가하고 actions의 핀 생성 인스턴스를 네 버튼 fragment로 교체한다. 기존 `title`, `headingId`, 메뉴, leading, showTitle, 헤더 CSS/구조는 유지한다.
  3. Error & Exception Handling: 새로운 비동기 동작이 없어 별도 오류 처리 없음. 코멘트의 로딩/오류/재시도 경로를 수정하지 않는다. 빈 onClick 함수, alert, success toast 또는 임의 mock 상태 전이를 넣지 않는다.
  4. State Transition & Return: 기존 `CommentsWorkspace`가 네 버튼 UI를 반환한다. 버튼을 눌러도 프로젝트 상태·경로·완성본 개수는 바뀌지 않는다. 이번 완료 판정에 업무 버튼 동작을 포함하지 않는다.

### I02. 핀 생성 인스턴스를 헤더 바로 아래로 이동

- Related Files:
  - `components/comments/CommentsWorkspace.tsx` :: `styles.intro` 반환부, `useStyles.canvasTools` — 기존 인스턴스 위치 이동; modify
  - `components/comments/CommentCreateButton.tsx` :: `CommentCreateButton` — 기존 버튼/상태/이벤트 계약 유지; read-only
  - `components/comments/CommentsProvider.tsx` :: `useComments` — 같은 provider 범위 유지; read-only
  - `lib/comments/controller.ts` :: `CommentController`, `CommentControllerState` / `lib/comments/geometry.ts` :: 좌표·팝업 계산 — 로직 수정 없음; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export default function CommentCreateButton(): React.ReactElement;
  // 이미 존재하는 필드 중 위치 이동 시 보존할 계약:
  // state.status: "idle" | "loading" | "ready" | "error"
  // state.pinMode: boolean, state.busy: boolean
  // controller: CommentController | null
  // CommentPoint: { xRatio: number; yRatio: number }
  ```

- **Data & Schema Fields**:
  - 새 데이터 필드·초기값·저장 구조 없음. 저장 좌표는 기존 section 기준 `xRatio`, `yRatio`(0~1) 그대로다.
  - 기존 버튼의 `data-comment-control`, `data-comment-create`, `aria-pressed={state.pinMode}`와 `disabled={!controller || state.status !== "ready" || state.busy}`를 보존한다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 헤더 actions에서 제거한 핀 생성 인스턴스를 복제하지 않는다. JSX 전체에서 `<CommentCreateButton />`는 하나여야 한다.
  2. Core Processing: 동일한 `styles.intro` div 내부에서 `WorkspaceHeader` 다음, 기존 pinMode 안내문 앞에 `styles.canvasTools` div를 추가하고 그 안에 기존 `<CommentCreateButton />`를 둔다. 헤더 아래 왼쪽에 자연스럽게 배치하며 fixed/absolute 포지셔닝을 추가하지 않는다.
  3. Error & Exception Handling: 기존 loading·idle·busy·error 및 재시도 흐름을 그대로 둔다. 도구 줄은 상위 `data-comment-control` 보호 범위 안에 있으므로 빈 공간 클릭도 surface의 핀 생성 클릭으로 처리되지 않는다.
  4. State Transition & Return: 기존 버튼은 `togglePinMode()` 후 모드가 켜졌으면 `[data-comment-surface]`로 focus를 이동한다. 동일 surface 내부 `[data-comment-create]`를 유지하므로 Esc/팝업 닫기 포커스 복귀도 유지된다. 버튼은 기본 스타일·활성 표시·40px 최소 높이를 유지하며, 34px 통일은 새 헤더 네 버튼에만 적용한다.

- 반환부 바깥 `DadamThemeScope`, `<section ref={surface} data-comment-surface ...>`, ref/최소 높이/크기 측정 범위를 바꾸지 않는다. 핀 이동·좌표 비율·팝업 위치·drag/pointer/keyboard 처리나 저장 데이터를 수정하지 않는다. 줄 추가에 따른 기존 ResizeObserver의 재측정을 사용하며 새 관찰자를 만들지 않는다.
- 기존 상태 안내 두 문장, 숨김 `comment-pin-help`, 오류 메시지와 재시도 버튼, pin 목록·preview·popover 렌더링을 보존한다.

## Acceptance Criteria

- [x] `/workspace/write`의 기존 WorkspaceHeader actions에 공통 `CommonButton` 네 개가 재작업 → 완성본 1 → 완성 → 설정 순서로 있다.
- [x] 네 버튼은 모두 34px 높이이고 재작업만 34px 정사각형이다. 아이콘은 16px이며 나머지는 아이콘 왼쪽·텍스트 오른쪽이다.
- [x] 완성에만 `primary`가 적용되고 색·폰트·굵기·모서리·상태 스타일은 공통 Button/dadam 원본을 사용한다.
- [x] 아이콘 버튼에 이름·title이 있고 장식 아이콘은 접근성 트리에서 숨긴다. 네 버튼은 `type="button"`이다.
- [x] 실제 업무 동작, onClick 빈 함수, 임의 popup/toast/라우팅, 프로젝트 데이터 모델을 추가하지 않는다. `완성본 1`은 UI 표시값으로만 남는다.
- [x] 핀 생성은 기존 인스턴스 한 개로 헤더 아래 왼쪽에 있고 동일 `data-comment-surface`·`data-comment-control` 보호 범위에 남는다.
- [x] 핀 모드/disabled/포커스 복귀/좌표·저장·이벤트 계약과 기존 loading·error UI를 변경하지 않는다.
- [x] WorkspaceHeader 자체·다른 헤더 내용·팀원 Tailwind source 설정·다른 메뉴·공통 Button 및 기존 핀 버튼 구현을 변경하지 않는다.
- [x] 생산 코드 변경은 `CommentsWorkspace.tsx`뿐이고 새 생산 파일·README·테스트 파일·tests 폴더를 만들지 않는다.
- [x] 아래 타입 검사·lint·build·diff 검토를 통과한다. 브라우저 미실시는 실패/대기 Task로 남기지 않고 실제 시각 검증 통과로도 보고하지 않는다.

## Validation

모든 명령은 `C:/Users/김세정/Documents/GitHub/kpc_app`에서 실행한다. 아래는 구현 완료 후 실행할 명령이며 계획 단계에서 통과했다고 기록하지 않는다.

- `npm.cmd run typecheck` — native Button props·아이콘 import·Griffel 스타일 타입 오류 없음.
- `npm.cmd run lint` — 미사용 import·잘못된 JSX·규칙 위반 없음.
- `npm.cmd run build` — Next production build 성공. 실제 CSS 렌더링/픽셀 검증과는 구분한다.
- `git diff --check` — 공백 오류·충돌 마커 없음.
- `git diff -- components/comments/CommentsWorkspace.tsx` — 변경이 import, 세 스타일 키, actions, 핀 버튼 위치에 한정되는지 검토한다.
- `rg -n 'CommonButton|CommentCreateButton|headerAction|headerIconAction|canvasTools|data-comment-control|data-comment-surface|완성본 1' components/comments/CommentsWorkspace.tsx` — 네 공통 버튼, 핀 인스턴스 하나, 보호 범위와 동일 크기 지정 확인. 출력만으로 시각 검증 통과라고 단정하지 않는다.
- `git diff -- components/layout/WorkspaceHeader.tsx components/common/Button.tsx components/comments/CommentCreateButton.tsx app/admin-utilities.css lib/ui/dadam-theme.ts app/dadam-tokens.css` — 이 Task로 변경된 내용 없어야 한다. 실행 전에 있던 타인 변경이 있다면 지우거나 포함하지 않는다.
- 커밋 직전 `git diff --cached --check`, `git diff --cached --name-only` — 해당 생산 파일과 관련 계획/진행 기록만 stage됐는지 확인한다. 로컬 current는 강제 추가하지 않는다.
- `npm test`, 새 테스트 파일·tests 폴더, browser/E2E/스크린샷/dev server 실행은 이 Task에 포함하지 않는다.

## Commit Message

```text
feat(write): 제작 헤더 버튼 4개 추가 및 핀 생성 위치 정리

Plan: 2026-11-02-write-header-actions
Phase: P01-header-actions
Task: T01-write-header-actions

- 공통 버튼과 dadam 스타일로 제작 헤더 우측 UI 구성
- 네 버튼 높이를 34px로 통일하고 핀 생성은 헤더 아래로 이동
- 기존 헤더와 핀 코멘트 동작 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task를 포함하는 한국어 구현 커밋. `git log -1 --format="%h %s" --grep="Task: T01-write-header-actions"`로 조회하며 정확한 hash는 로컬 current에도 기록한다.

## Execution Result — 2026-11-02

- `/mea`로 T01 구현 완료. 생산 코드 변경은 `CommentsWorkspace.tsx`의 import, 세 스타일 키, 헤더 actions, 핀 버튼 위치에 한정했다.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` 모두 exit 0. 빌드의 기존 baseline-browser-mapping 데이터 갱신 경고는 기능 실패가 아니며 의존성 변경은 수행하지 않았다.
- `git diff --check` 통과. 정적 diff 및 명시된 rg 검색으로 공통 버튼 네 개, 핀 생성 인스턴스 하나, 동일 높이 선언, 제어 영역 안의 배치와 기존 이벤트/좌표/포커스 코드 보존을 확인했다.
- 읽기 전용 대상 파일들의 diff는 비어 있다. 새로운 생산·테스트 파일은 없고 `tests/`를 생성/복원하지 않았다.
- 브라우저·E2E·스크린샷·dev server는 지속 정책에 따라 미실시했다. 34px/배치 조건은 코드와 CSS 선언 기준으로 검토했으며 실제 화면의 픽셀 검증으로 보고하지 않는다.
- 합의대로 네 업무 버튼은 UI만 제공하고 `완성본 1`은 정적 표시다. 기존 핀 생성 기능은 유지한다. 범위 밖에서 추가로 처리해야 할 기존 결함은 발견하지 않았다.

완료 시 Task 상태를 done, phase 진행률을 done 1/1로 갱신하고 Plan 완료를 기록한다. `.memory/current.md`는 Active Task 없음으로 전진한다. 관련 변경만 한국어 메시지로 커밋하며 원격 push/배포는 별도 요청 없이 수행하지 않는다.
