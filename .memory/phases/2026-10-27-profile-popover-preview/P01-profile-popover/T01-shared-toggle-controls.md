# Task: T01 공용 세그먼트 선택과 ON/OFF 스위치

## Status: done

## Goal

사용자 첨부 이미지의 회색 세그먼트 선택과 빨간 ON/OFF 스위치를, 프로필과 다른 화면에서도 사용할 수 있는 공용 TSX 컴포넌트 두 개로 제공한다.

## Decision Summary

- 기존 Fluent UI v9의 RadioGroup/Radio와 Switch를 사용한다. 새 UI 라이브러리·패키지 변경은 없다.
- 컴포넌트는 controlled 방식이며 업무 문구·현재 값·변경 callback을 호출자가 전달한다. TSX 안 makeStyles를 사용하고 CSS 파일을 분리하지 않는다.

## Implementation

### I01. 단일 선택용 SegmentedControl

- Related Files:
  - `components/ui/SegmentedControl.tsx` :: `SegmentedControl`, `SegmentedControlProps`, `SegmentedOption`, `useStyles` — 공용 선택 UI; new
  - `components/providers/FluentUiProvider.tsx` :: `workspaceTheme` — 기존 공급자와 테마 확인; read-only
  - `node_modules/@fluentui/react-radio/dist/index.d.ts` :: `RadioGroupProps`, `RadioProps` — 설치된 버전의 슬롯 계약; read-only
  - `node_modules/@fluentui/react-radio/lib/components/Radio/useRadioStyles.styles.raw.js` :: 입력/label/indicator 기본 스타일 — override 위치; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface SegmentedOption<T extends string> {
    value: T;
    label: string;
    disabled?: boolean;
  }
  export interface SegmentedControlProps<T extends string> {
    ariaLabel: string;
    options: readonly SegmentedOption<T>[];
    value: T;
    onChange(value: T): void;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
  }
  export default function SegmentedControl<T extends string>(
    props: SegmentedControlProps<T>,
  ): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - `ariaLabel`: 필수 접근성 이름, 빈 문자열을 호출부에서 전달하지 않는다.
  - `options`: 변경하지 않는 배열, 값은 중복되지 않는 문자열. 각 option의 label은 실제 사용자 문구이며 기본 disabled는 false다.
  - `value`: options 중 하나의 value. 컴포넌트가 별도 useState로 선택 값을 복제하지 않는다.
  - `disabled=false`, `fullWidth=false`, `className=undefined`. DB·저장 키·프로필 역할은 공용 컴포넌트의 필드가 아니다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: `"use client"`를 선언하고 Fluent `RadioGroup`, `Radio`, `makeStyles`, `mergeClasses`를 import한다. 타입은 React에서 type-only import하거나 React namespace를 사용한다.
  2. Core Processing: RadioGroup에 `layout="horizontal"`, `value`, `disabled`, `aria-label`을 전달한다. 각 Radio의 input에 value/disabled, label 슬롯에 label을 전달한다. onChange의 `data.value: string`은 options에서 찾아 유효하고 활성인 option일 때만 그 option의 타입 T 값으로 callback을 호출한다. 무조건 `as any`로 변환하지 않는다.
  3. Root 디자인: 배경 `#f0f1f3`, radius `9px`, padding `3px`, gap `2px`, 기본 inline-flex·내용 너비. fullWidth일 때 width 100%·display flex, 각 option flex 1·minWidth 0이다.
  4. 각 선택 영역: 높이 `26px`, 좌우 padding `10px`, radius `7px`, font `11.5px / 700`, 텍스트 가운데. 미선택 배경 transparent·색 `#74747d`. 선택 배경 `#fff`·색 `#161616`·shadow `0 1px 2px rgba(0,0,0,.08)`.
  5. Radio의 원형 indicator 슬롯은 숨기되 실제 input은 유지한다. input을 `display:none`/`visibility:hidden`으로 없애지 않는다. 기본 투명 input의 너비를 option 전체(100%)로 맞춰 선택 영역 어디를 눌러도 동작하게 한다. label의 기본 padding/minHeight와 Radio의 기본 세로 배치를 공용 스타일에 맞게 덮어쓴다.
  6. Fluent input의 `:enabled:checked ~ .fui-Radio__label` 및 미선택 색 규칙 때문에 텍스트가 파란색 또는 다른 색으로 되돌아가지 않도록 실제 input/label 슬롯에 스타일을 전달한다. 선택 배경은 현재 value에서 파생한 label class로 결정한다.
  7. Error & Exception Handling: options에서 찾지 못하거나 disabled인 data.value는 무시한다. 외부 입력·HTTP·영구 저장은 없다. disabled는 native RadioGroup/Radio에 전달해 조작 자체를 막는다.
  8. State Transition & Return: 한 그룹에서 한 값만 선택된다. Tab으로 그룹 진입·이탈, 방향키로 옵션 전환, Space 선택은 Radio의 native 동작을 유지한다. `:focus-within` 등으로 빨간 outline 2px을 표시하고 강제 색상 모드에서 포커스를 지우지 않는다.

### I02. 이진 설정용 ToggleSwitch

- Related Files:
  - `components/ui/ToggleSwitch.tsx` :: `ToggleSwitch`, `ToggleSwitchProps`, `useStyles` — 공용 ON/OFF UI; new
  - `node_modules/@fluentui/react-switch/dist/index.d.ts` :: `SwitchProps`, `SwitchSlots`, `SwitchOnChangeData` — 설치된 API; read-only
  - `node_modules/@fluentui/react-switch/lib/components/Switch/useSwitchStyles.styles.raw.js` :: checked 이동량·input 위치·기본 트랙 — 크기 override 근거; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ToggleSwitchProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange(checked: boolean): void;
    disabled?: boolean;
    className?: string;
  }
  export default function ToggleSwitch(props: ToggleSwitchProps): React.ReactElement;
  ```

- **Data & Schema Fields**:
  - label과 checked, onChange는 필수다. description/className은 undefined 가능, disabled 기본 false다.
  - description이 있으면 React useId로 만든 설명 id와 `aria-describedby`를 연결한다. native label 연결은 Fluent Switch의 id/htmlFor를 유지한다.
  - 별도 저장 상태·권한·이메일 발송 필드를 만들지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: `"use client"`와 Fluent `Switch`를 사용한다. `checked`와 `onChange(_, data) => onChange(data.checked)` 계약을 유지한다.
  2. Core Processing: 왼쪽 label/description, 오른쪽 track으로 한 줄 배치한다. labelPosition은 before, root width 100%·alignItems center·gap 10px·position relative다. label 글자 12px/700, 설명 10.5px·`#74747d`다.
  3. 트랙: width `34px`, height `20px`, radius `10px`, border 0, padding `2px`, margin 0, flexShrink 0. OFF `#d4d6db`, ON `#d7192f`, enabled hover ON `#c31429`. 첨부 이미지와 HTML `.pf-tg`를 기준으로 한다.
  4. indicator 슬롯의 children을 `aria-hidden`인 흰 원형 span으로 지정한다. 손잡이는 `16 × 16px`, shadow `0 1px 2px rgba(0,0,0,.2)`다. OFF translateX(0), ON translateX(14px)로 설정한다. Fluent 기본 `40px` 트랙의 checked transform을 남기지 않는다.
  5. 투명 input은 트랙 위치에 맞춰 right 0·left auto·width 34px·height 20px로 조정하고 수직 가운데에 둔다. label은 htmlFor로 활성화되어 문구 클릭도 동작한다. indicator가 입력을 가로채지 않도록 Fluent의 pointer-events none을 유지한다.
  6. 체크/hover 색은 기본 Fluent의 `:checked ~ .fui-Switch__indicator` 규칙보다 실제로 우선하는 input 슬롯 스타일로 지정한다. 손잡이 이동 150ms, 배경 전환 150ms. reduced-motion에서는 애니메이션을 끈다. disabled에서는 Fluent disabled 색·native disabled 동작을 유지한다.
  7. Error & Exception Handling: disabled이면 callback이 발생하지 않는다. uncontrolled defaultChecked와 controlled checked를 동시에 사용하지 않는다. 외부 호출·HTTP 예외는 없다.
  8. State Transition & Return: 변경 요청만 상위에 전달하고 전달받은 checked로 렌더링한다. Space와 label 클릭, 접근성 이름·checked·disabled 상태를 유지한다. 팝오버 전용 문구나 profile import는 없다.

### I03. 범위와 후속 연결

- Related Files:
  - `package.json`, `package-lock.json`, `app`, `config`, `components/layout/NavSidebar.tsx` — 이 Task에서는 변경하지 않음; read-only

#### Details

- 신규 컨트롤 두 개만 추가한다. 데모를 위해 임시 페이지·임시 설정 라우트를 만들지 않는다. 실제 호출부는 T03에서 추가하며 T01은 export 가능한 상태로 typecheck/lint가 독립 통과해야 한다.
- `.module.css`·별도 스타일 파일·배럴 index를 필요 없이 추가하지 않는다. 단순 색/px 값을 그대로 검증하는 단위 테스트도 만들지 않는다. 실제 키보드·클릭·크기 검증은 T03에서 마운트된 화면으로 수행한다.
- 기존 사이드바 divider 미커밋 변경은 이 Task에 포함하지 않는다.

## Acceptance Criteria

- [x] 프로필을 import하지 않는 범용 SegmentedControl/ToggleSwitch 두 파일을 만들었다.
- [x] 모든 상태는 props로 제어되고 native radio/switch 의미와 키보드 접근성을 유지한다.
- [x] 회색 트랙·흰 선택 영역, 빨간 ON·흰 손잡이의 크기·색·이동량 계약을 만족한다.
- [x] Fluent 기본 슬롯 크기·색·손잡이 이동량을 함께 덮어써 보이지 않는 입력 영역이 어긋나지 않는다.
- [x] 새 패키지·CSS 파일·임시 페이지 없이 typecheck와 파일 lint가 통과한다.

## Validation

- `npm run typecheck` — TSX와 generic props, Fluent 슬롯 타입 오류 없음.
- `npx --no-install eslint components/ui/SegmentedControl.tsx components/ui/ToggleSwitch.tsx` — 두 신규 파일 lint 통과.
- `git diff --check` — Task의 공백 오류 없음. 기존 사용자 변경은 별도로 보존한다.
- T03 실제 화면 검증 대상으로 선택/disabled/방향키/Space/label 클릭/34×20 트랙·14px 이동을 기록한다. 현재 Task에서 브라우저 확인을 한 것처럼 표시하지 않는다.

## Commit Message

```text
feat(ui): 공용 세그먼트 선택과 토글 스위치 추가

Plan: 2026-10-27-profile-popover-preview
Phase: P01-profile-popover
Task: T01-shared-toggle-controls

- Fluent Radio와 Switch를 사용하는 controlled 공용 컨트롤 추가
- 목업의 선택 배경과 빨간 스위치 스타일 및 접근성 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task의 변경·완료 기록을 포함한 동일 커밋(Plan/Phase/Task 식별자로 조회)

## Execution Result — 2026-10-27

- 공용 RadioGroup 기반 SegmentedControl과 Switch 기반 ToggleSwitch를 추가했다. controlled props로 업무 상태와 분리했다.
- 슬롯별 label/input/indicator 스타일을 지정하고 스위치 트랙34×20·손잡이16·checked 이동14px을 함께 맞췄다.
- `npm.cmd run typecheck`, 파일 대상 ESLint, `git diff --check` 통과. Windows에서는 실행 정책을 바꾸지 않고 npm.cmd/npx.cmd를 사용한다.
- 실제 클릭·키보드·화면 크기 확인은 호출부가 연결되는 T03에서 수행한다. 현재 시점에 브라우저 검증 완료라고 표시하지 않는다.
- 기존 NavSidebar 구분선 변경·패키지·기존 앱 코드는 수정하지 않았다. 추가 범위 밖 결함은 확인하지 않았다.
