# Task: T01 common 진입점과 dadam 범용 버튼

## Status: done

## Goal

`import { Button } from "@/components/common"`으로 표준 button을 사용할 수 있고, 기존 dadam 서체/색상/상태를 유지하면서 `tw:` 클래스로 크기와 배치를 조정할 수 있게 한다. 새 common 디렉토리는 이 Task에서 만들며 기존 화면·기존 ui 파일은 교체하거나 이동하지 않는다.

## Decision Summary

- `children` 자유 구성, 기존 `tw:` 접두사, 기본형+primary/ghost/soft/dark/danger, 선택은 `active` 클래스·사용 불가는 네이티브 `disabled`. 버튼이 상태를 자동 관리하지 않는다.
- 기존 `dadamTheme`/`dadamUi`가 디자인 원본이다. 네이티브 button 한 개와 CSS Module을 사용하고 유틸리티보다 낮은 CSS 레이어에 기본 스타일을 둔다. 폰트·테마·API·DB·기존 화면은 바꾸지 않는다.

## Implementation

### I01. common 디렉토리와 표준 버튼 계약

- Related Files:
  - `components/common/Button.tsx` :: `Button`, `ButtonProps` — 표준 버튼; new
  - `components/common/index.ts` :: 공개 export — 공통 진입점; new
  - `components/ui/{ModalFrame,SegmentedControl,ToggleSwitch}.tsx` — 기존 공통 구현, 이동/수정하지 않음; read-only
  - `package.json`, `tsconfig.json` — React19/strict 타입/@ 별칭 유지; read-only

#### Details

- **Signatures & Types**:

```typescript
import type { ComponentPropsWithRef, ReactElement } from "react";
export type ButtonProps = ComponentPropsWithRef<"button">;
export default function Button(props: ButtonProps): ReactElement;
// components/common/index.ts:
// export { default as Button } from "./Button";
// export type { ButtonProps } from "./Button";
```

- **Data & Schema Fields**:
  - 업무 DTO/DB 모델 없음. `ButtonProps`는 React의 표준 HTML button 계약을 그대로 포함한다.
  - `type?: "button" | "submit" | "reset"`: 생략 시 `button`.
  - `children?: ReactNode`: 그대로 렌더링. 내용이 없거나 아이콘만 있는 경우 호출부가 `aria-label`을 제공한다.
  - `className?: string`: CSS Module root와 공백 하나로 결합하며 사용자가 넘긴 문자열을 재작성·정렬·필터링하지 않는다.
  - `style?: CSSProperties`: 기본 CSS 변수 객체 뒤에 병합한다. 사용자 style의 직접 속성이 우선하지만 기본 스타일은 inline width/background로 만들지 않는다.
  - `disabled?: boolean`: 기본 false, native DOM 속성으로 전달.
  - `ref?: Ref<HTMLButtonElement>`: React19 ref prop 그대로 DOM button에 전달. 외부 div나 별도 imperative handle을 만들지 않는다.
  - 나머지 이벤트/폼/접근성 속성: `onClick`, `onKeyDown`, `onFocus`, `name`, `value`, `form`, `formAction`, `formMethod`, `formNoValidate`, `title`, `tabIndex`, `aria-*`, `data-*` 등을 보존한다.
  - 내부 예약 마커 `data-common-button=""`: 새 버튼 식별용. props 전개 뒤에 설정해 항상 유지한다. 이 마커만 호출부의 동일 이름 값을 덮어쓸 수 있음을 문서화한다.
  - `icon`, `label`, `iconPosition`, `variant`, `size`, `active`, `loading`, `as`, `href` 같은 신규 커스텀 prop은 추가하지 않는다. 클래스와 children으로 요구를 충족한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `git status --short`로 기존 작업을 보존한다. 파일이 이미 있으면 해당 구현을 읽어 이 계약과 조정하며 덮어쓰기/중복 생성하지 않는다.
  2. `Button.tsx`에 `use client`를 지정한다. React19를 사용하므로 ref를 props로 받아 DOM에 전달한다. default `type`은 destructuring 또는 동일한 의미의 처리로 `button`이 되도록 한다.
  3. CSS root class와 `className`, I02 기본 CSS 변수와 `style`을 결합한다. 표준 props와 children은 단일 `<button>`으로 전달한다. 자동 children 래퍼·cloneElement·상태 hook·onClick 래퍼·타이머·문서 query를 추가하지 않는다.
  4. `active` 문자열은 CSS에서만 인식한다. 컴포넌트가 active를 분석하여 자동 `aria-pressed`를 넣지 않는다. 선택 상태는 호출부가 같은 값으로 클래스와 `aria-pressed`를 전달한다.
  5. Error & Exception Handling: 새 검증 예외나 이벤트 예외 swallowing을 추가하지 않는다. 이벤트 핸들러의 기존 React 동작과 표준 disabled 제약을 따른다. 렌더 중 네트워크/저장/서버 액션을 실행하지 않는다.
  6. State Transition & Return: 단일 ReactElement 반환, 내부 영속 상태 없음. `index.ts`는 Button/타입만 재내보내고 `use client`나 내부 테마/예시 export를 추가하지 않는다.

### I02. 기존 dadam 값을 버튼 전용 CSS 변수로 연결

- Related Files:
  - `components/common/button-theme.ts` :: `DADAM_BUTTON_STYLE`, `ButtonThemeStyle` — 버튼 내부 전용 테마 어댑터; new
  - `lib/ui/dadam-theme.ts` :: `dadamTheme`, `dadamUi` — 원본; read-only
  - `app/layout-tokens.css` :: `--layout-inline-gap`, `--layout-card-inset` — 간격 원본; read-only
  - `app/globals.css` :: font-face, `--dadam-font-family` — 기존 서체; read-only in this unit
  - `components/providers/{FluentUiProvider,DadamThemeScope}.tsx` — 전역 KPC/부분 dadam 범위; read-only

#### Details

- **Signatures & Types**:

```typescript
import type { CSSProperties } from "react";
export type ButtonThemeStyle = CSSProperties & {
  [name: `--common-button-${string}`]: string | number;
};
export const DADAM_BUTTON_STYLE: Readonly<ButtonThemeStyle>;
```

- **Data & Schema Fields**:
  - I03 상태표에 나오는 모든 테마 키에 대해 `--common-button-${key}` = `dadamTheme[key]`. `transparent`는 색상 토큰이 아닌 CSS 키워드라 매핑 목록에 넣지 않는다.
  - 추가 매핑: `fontFamilyBase`, `fontSizeBase300`, `lineHeightBase300`, `fontWeightSemibold`, `borderRadiusMedium`, `strokeWidthThin`, `durationFaster`, `curveEasyEase`, `colorBrandStroke1`, `colorNeutralBackgroundDisabled`, `colorNeutralForegroundDisabled`, `colorNeutralStrokeDisabled`.
  - `--common-button-control-height` = `dadamUi.controlHeight`.
  - `--common-button-focus-ring` = `dadamUi.focusRing`에서 `tokens.colorBrandStroke1` 참조만 `dadamTheme.colorBrandStroke1`로 치환한 문자열. 현재 `2px solid #0f6cbd`에 해당하지만 값을 직접 복제하지 않는다. `tokens`는 설치된 `@fluentui/react-components` export다.
  - 테마 키 목록은 `as const satisfies readonly (keyof Theme)[]`로 검사하고, `Theme`은 `@fluentui/react-components`의 타입을 사용한다. `Object.fromEntries`의 타입 보완은 위 명시적 CSS 변수 타입으로 한정하며 `any`를 도입하지 않는다.
  - 매핑 객체는 모듈 초기화 시 한 번 만들고 `Object.freeze`한다. 버튼마다 전체 Fluent 테마 수백 개를 펼치지 말고 실제 필요한 키만 포함한다. 원본 theme 객체를 mutate하지 않는다.
- **Execution Flow / Logic**:
  1. 현재 원본은 `dadamTheme = {...webLightTheme, fontFamilyBase: "var(--dadam-font-family)", fontFamilyNumeric: 같은 값, fontWeightSemibold: 500}`이다. 설치된 webLightTheme의 600을 직접 참조하면 요구 위반이므로 반드시 dadamTheme에서 읽는다.
  2. 글자 크기/줄 높이/모서리는 각각 `dadamTheme.fontSizeBase300`(14px), `lineHeightBase300`(20px), `borderRadiusMedium`(4px)을 참조한다. 이들은 현재 dadamUi의 bodySize/bodyLineHeight/controlRadius가 가리키는 토큰이다. 높이는 dadamUi의32px을 참조한다.
  3. 전용 CSS 변수만 버튼 루트의 style에 넣는다. I03 CSS는 `var(--common-button-...)`를 참조하므로 부모 FluentProvider의 빨간 브랜드값이 유입되지 않는다. 다른 컨트롤이 쓰는 `--colorBrandBackground`나 `--kpc-brand`를 전역 변경하지 않는다.
  4. 기본 디자인의 실제 `fontFamily`, `backgroundColor`, `width`, `height`를 inline style로 넣지 않는다. 변수로만 전달해야 클래스 유틸리티가 해당 속성을 덮어쓸 수 있다.
  5. 새 Provider/DOM wrapper/폰트 파일/외부 요청/별도 palette를 만들지 않는다. 없는 token 키는 타입 검사에서 실패시켜 오타를 발견한다. 런타임의 임의 fallback 팔레트는 만들지 않는다.

### I03. CSS Module의 범위·상태·유틸리티 우선순위

- Related Files:
  - `components/common/Button.module.css` :: `.root`, 범위가 한정된 프리셋/상태 — 스타일; new
  - `components/common/button-theme.ts` :: I02 CSS 변수 — 원본 연결; new

#### Details

- **Signatures & Types**: CSS Module의 공개 class는 `root` 하나다. 프리셋은 `.root:global(.primary)` 같은 결합 selector로 한정한다. 모든 일반 스타일 규칙은 `@layer components` 안에 둔다. 파일 앞에 `@layer theme, base, components, utilities;`를 선언해 CSS 청크 순서가 달라도 동일한 레이어 순서를 보장한다.
- **Data & Schema Fields — 기본 레이아웃**:
  - `appearance:none`, `box-sizing:border-box`, `display:inline-flex`, `align-items:center`, `justify-content:center`, `vertical-align:middle`, `flex-shrink:0`.
  - `width:auto`, `height:var(--common-button-control-height)`, `min-width:0`, `min-height:0`, `margin:0`, `padding:0 var(--layout-card-inset)`, `gap:var(--layout-inline-gap)`.
  - `border-width:var(--common-button-strokeWidthThin)`, `border-style:solid`, border-color는 상태표 사용. 모든 상태에서 border-width를 바꾸지 않는다.
  - `border-radius:var(--common-button-borderRadiusMedium)`, `font-family:var(--common-button-fontFamilyBase)`, `font-size:var(--common-button-fontSizeBase300)`, `line-height:var(--common-button-lineHeightBase300)`, `font-weight:var(--common-button-fontWeightSemibold)`.
  - `text-align:center`, `text-decoration:none`, `white-space:nowrap`, `user-select:none`, `cursor:pointer`, `box-shadow:none`.
  - transition은 background-color/border-color/color, duration=`durationFaster`, timing=`curveEasyEase`의 전용 변수. reduced-motion이면 transition 없음. 자식 SVG/텍스트의 크기/순서를 강제하는 descendant 규칙은 넣지 않는다.
- **Data & Schema Fields — 상태표**:

아래 각 칸은 순서대로 **배경 / 글자 / 테두리**의 정확한 `dadamTheme` 키다. 전용 CSS 변수 이름은 해당 키에 `--common-button-`를 붙인다.

| 프리셋 | 기본 | hover | 누르는 동안 | 선택 유지 |
| --- | --- | --- | --- | --- |
| 기본형 | colorNeutralBackground1 / colorNeutralForeground2 / colorNeutralStroke2 | colorNeutralBackground1Hover / colorNeutralForeground2Hover / colorNeutralStroke1Hover | colorNeutralBackground1Pressed / colorNeutralForeground2Pressed / colorNeutralStroke1Pressed | colorBrandBackground2 / colorBrandForeground2 / colorBrandStroke1 |
| primary | colorBrandBackground / colorNeutralForegroundOnBrand / colorBrandBackground | colorBrandBackgroundHover / colorNeutralForegroundOnBrand / colorBrandBackgroundHover | colorBrandBackgroundPressed / colorNeutralForegroundOnBrand / colorBrandBackgroundPressed | colorBrandBackgroundSelected / colorNeutralForegroundOnBrand / colorBrandBackgroundSelected |
| ghost | transparent / colorNeutralForeground2 / transparent | colorNeutralBackground2Hover / colorNeutralForeground2Hover / transparent | colorNeutralBackground2Pressed / colorNeutralForeground2Pressed / transparent | colorBrandBackground2 / colorBrandForeground2 / colorBrandStroke1 |
| soft | colorBrandBackground2 / colorBrandForeground2 / colorBrandStroke2 | colorBrandBackground2Hover / colorBrandForeground2Hover / colorBrandStroke2Hover | colorBrandBackground2Pressed / colorBrandForeground2Pressed / colorBrandStroke2Pressed | colorBrandBackground2Hover / colorBrandForeground2 / colorBrandStroke1 |
| dark | colorNeutralBackgroundInverted / colorNeutralForegroundInverted / colorNeutralBackgroundInverted | colorNeutralBackgroundInvertedHover / colorNeutralForegroundInverted / colorNeutralBackgroundInvertedHover | colorNeutralBackgroundInvertedPressed / colorNeutralForegroundInverted / colorNeutralBackgroundInvertedPressed | colorNeutralBackgroundInvertedSelected / colorNeutralForegroundInverted / colorNeutralBackgroundInvertedSelected |
| danger | colorStatusDangerBackground3 / colorNeutralForegroundOnBrand / colorStatusDangerBackground3 | colorStatusDangerBackground3Hover / colorNeutralForegroundOnBrand / colorStatusDangerBackground3Hover | colorStatusDangerBackground3Pressed / colorNeutralForegroundOnBrand / colorStatusDangerBackground3Pressed | colorStatusDangerBackground3Pressed / colorNeutralForegroundOnBrand / colorStatusDangerBackground3Pressed |

- root에 내부 역할 변수 `--_button-bg`, `--_button-fg`, `--_button-border` 및 hover/pressed/selected의 같은 세 속성을 정의한다. 프리셋 selector는 이 역할 변수만 위 표로 변경하고 상태 selector가 실제 background-color/color/border-color를 적용한다. 이를 통해 프리셋 selector와 상태 selector의 우선순위가 경쟁하지 않게 한다.
- `--_button-hover-bg`, `--_button-hover-fg`, `--_button-hover-border`, `--_button-pressed-*`, `--_button-selected-*`로 이름을 통일한다. 내부 변수는 공개 API로 export하지 않는다.
- **Execution Flow / Logic**:
  1. 기본값과 프리셋 역할 변수 선언 후 실제 상태 규칙 순서는 기본 → `.root:enabled:hover` → `.root:global(.active):enabled` → `.root:enabled:active` → focus-visible → disabled다. 선택된 버튼에 마우스를 올려도 선택 표시는 유지되고, 누르는 순간에는 pressed 색을 보여준다.
  2. 선택 유지 규칙은 선택 표의 색과 `inset 0 0 0 var(--common-button-strokeWidthThin) currentColor` 그림자를 적용한다. 추가 외부 border/width 변경 없이 선택됨을 구별한다. pressed 전환에서 선택 그림자를 불필요하게 제거하지 않는다.
  3. disabled는 모든 프리셋에서 `colorNeutralBackgroundDisabled` / `colorNeutralForegroundDisabled` / `colorNeutralStrokeDisabled`, opacity1, box-shadow:none, cursor:not-allowed. 활성 전용 규칙들은 반드시 enabled 조건을 갖는다.
  4. focus-visible은 `outline:var(--common-button-focus-ring)`와 `outline-offset:2px`. 일반 focus에서 항상 outline을 없애는 전역 규칙을 추가하지 않는다.
  5. `@media (forced-colors: active)` 안에서는 각 실제 상태 selector와 같은 specificity로 시스템 `ButtonFace`/`ButtonText`를 사용한다. 선택은 Highlight 테두리와 안쪽1px outline(offset -3px), disabled는 GrayText, focus-visible은 마지막에2px Highlight outline(offset2px)을 사용한다. `forced-color-adjust:auto`, 고대비에서 box-shadow:none. 포커스 규칙이 선택 outline에 가려지지 않게 한다.
  6. 전역 `.active/.primary/.danger` selector, 레이어 밖 색상/크기 선언, 스타일 충돌 해결용 `!important`를 만들지 않는다. 사용자 유틸리티가 components 레이어보다 높은 utilities 레이어에서 크기·배치·색상을 덮어쓰게 한다.
  7. 기본 패딩 때문에 `tw:w-4`만으로 매우 좁게 만들면 내용이 맞지 않을 수 있다. 아이콘 전용 예시에서는 `tw:p-0`와 작은 아이콘 크기를 함께 사용한다. 컴포넌트가 className을 파싱해 패딩을 자동 변경하지 않는다.
  8. 실패 처리/상태 저장 없음. CSS 문법 오류는 build 또는 T02 CSS 검사에서 수정한다. 원본 HTML의 빨간색·모서리 수치를 복제하지 않는다.

### I04. 기존 CSS 진입점의 최소 변경

- Related Files:
  - `app/admin-utilities.css` :: `@source` — 공통 사용처의 클래스 생성; modify
  - `app/globals.css` :: 기존 button font/focus 선택자 — 새 버튼 한정 충돌 해소; modify
  - `app/layout.tsx`, `postcss.config.mjs`, `components/providers/FluentUiProvider.tsx` — 기존 설정/연결; read-only

#### Details

- **Signatures & Types**: TS API 없음. prefix(tw), source(none), 기존 theme/base/components/utilities 레이어 순서와 Preflight 미도입 상태를 유지한다.
- **Data & Schema Fields**:
  - `admin-utilities.css`의 기존 `@source "../components/admin";`, `@source "../components/layout";` 두 줄을 `@source "../components/**/*.{ts,tsx}";` 한 줄로 교체한다.
  - `@source "../hooks/admin";`, `@source "./";`와 Tailwind theme/utilities import는 그대로 유지한다. 설치된 scanner에서 ts/tsx glob은 읽기 전용으로 확인했다.
  - README/첨부 HTML/테스트는 새 소스 범위에 들어가지 않는다. 미래 사용처도 컴포넌트 ts/tsx 파일이면 포함된다. 유틸리티 문자열은 완전한 리터럴로 작성한다.
  - globals의 `button, input, select, textarea { font: inherit; }`에서 button만 `button:not([data-common-button])`로 변경한다.
  - globals의 `button:focus-visible, a:focus-visible { outline: 3px solid #a5b4fc; outline-offset: 4px; }`에서 button만 `button:not([data-common-button]):focus-visible`로 변경한다.
- **Execution Flow / Logic**:
  1. 기존 import·font-face·root 변수·input/select/textarea·링크·cursor·reduced-motion 규칙과 수치는 유지한다.
  2. 새 컴포넌트가 항상 내부 data 마커를 갖기 때문에 기존 레이어 밖 font/focus 규칙이 새로운 components 레이어의 dadam 스타일을 덮어쓰지 않는다.
  3. CSS Module은 Button에서 import한다. globals에 Button.module.css를 중복 import하거나 새 route/페이지에서 억지로 Button을 사용하지 않는다.
  4. 인증 Provider·업무 라우트·기존 Button import는 변경하지 않는다. 기존 컴포넌트의 스타일/동작 문제를 이번 Task에 함께 고치지 않는다.

### I05. 로컬 DOM 계약 검증과 Git 경계

- Related Files:
  - `tests/common/button.test.ts` :: 표준 button 계약 검사 — 로컬 전용; new
  - `.git/info/exclude` 또는 `git rev-parse --git-path info/exclude` 결과 경로 — 기존 로컬 테스트 정책 보완; local-only modify if needed
  - `vitest.config.ts`, `.gitignore` — 기존 설정; read-only

#### Details

- **Signatures & Types**: 현재 Vitest는 `tests/**/*.test.ts`, node 환경, `@` 별칭을 사용한다. 테스트 파일에 `// @vitest-environment jsdom`을 지정하고 React `createElement`/`act`, `react-dom/client`의 `createRoot`로 렌더링한다. 새 테스트 라이브러리나 전역 환경 변경은 하지 않는다. React act 환경 플래그를 테스트 동안 설정하고 teardown에서 복구한다.
- **Data & Schema Fields**: 메모리 DOM만 사용한다. 제출 횟수/클릭 횟수는 테스트 로컬 숫자, 선택값은 테스트 부모의 boolean, ref는 `createRef<HTMLButtonElement>()`이다. 실제 네트워크·폼 탐색은 하지 않는다.
- **Execution Flow / Logic**:
  1. 현재 `tests/`와 적용되는 로컬 제외 규칙이 없다. 테스트를 만들기 전에 `git rev-parse --git-path info/exclude`로 경로를 얻고 `/tests/` 규칙이 없으면 기존 내용을 보존해 추가한다. 공유 `.gitignore` 수정·원격 테스트 복원·`git add -f`는 하지 않는다.
  2. 테스트마다 host/root를 만들고 act 안에서 render/click/unmount한다. jsdom에서 지원하지 않는 실제 키보드 기본 행동·레이아웃을 통과로 주장하지 않는다. 렌더된 native tag와 disabled 속성, 실행 차단을 검증한다.
  3. 필수 시나리오:
     - 일반 버튼을 form 안에 렌더링하고 `.click()`해도 submit 이벤트가 발생하지 않는다. 클릭 핸들러는 한 번 실행된다.
     - `type="submit"`과 form 연결은 submit 이벤트를 발생시키며 테스트에서 preventDefault한다. `type="reset"`은 reset 이벤트와 기존 input 기본값 복원을 확인한다.
     - disabled 버튼은 `.click()`해도 클릭/제출을 실행하지 않는다. active+disabled 조합도 동일하다.
     - 자식 텍스트/span/SVG의 순서와 개수를 유지하고 외부 wrapper가 없다. 전달한 className은 보존된다.
     - title/name/value/id/data-* 및 aria-label/aria-pressed/form 속성이 보존된다. 일반 버튼은 aria-pressed를 자동으로 갖지 않는다.
     - DOM ref는 실제 HTMLButtonElement를 가리킨다. ref.focus() 후 activeElement를 확인하고 unmount 후 null이 된다.
     - 호출부의 active/aria-pressed 값을 rerender하면 함께 바뀐다. Button 자체 클릭만으로 active를 자동 토글하지 않는다.
     - style의 명시적 width 같은 전달값을 유지하면서 DADAM_BUTTON_STYLE의 전용 변수가 존재한다. 부모가 빨간 브랜드 CSS 변수를 갖더라도 루트 매핑은 기존 dadamTheme 값을 유지한다. 실제 색상의 계산값은 jsdom으로 단정하지 않는다.
     - default 직접 import와 common named import가 같은 컴포넌트를 제공한다.
  4. 테스트 끝에는 DOM/spy/act 환경을 복구한다. 테스트 소스는 로컬에 보관하며 Task 커밋에 포함하지 않는다. 테스트가 없는 새 checkout에서 과거 전체 검사가 수행됐다고 기록하지 않는다.

## Acceptance Criteria

- [x] `components/common/`의 Button·CSS Module·테마 연결·public index가 생성되고 공개 타입을 사용할 수 있다.
- [x] 기존 dadamTheme의 서체/14px/20px/500·모서리·상태 토큰을 참조한다. 새 팔레트/폰트/Provider가 없다.
- [x] 기본형과 다섯 프리셋 및 선택/hover/pressed/disabled/focus/forced-colors 규칙이 버튼 범위 안에 있다.
- [x] 네이티브 button 속성/ref/children이 보존되고 기본 type으로 실수 제출을 방지한다.
- [x] 모든 기본 크기·배치·색 스타일은 utilities보다 낮은 레이어이며 inline 직접 디자인 값으로 덮어쓰기를 막지 않는다.
- [x] Tailwind 탐색은 components의 ts/tsx를 포함한다. 기존 전역 font/focus 규칙은 새 버튼만 제외한다.
- [x] 기존 화면의 버튼 사용처·ui/layout 파일 위치·전역 폰트/테마값은 유지된다.
- [x] 로컬 DOM 검사와 타입/lint/build가 통과하며 tests/current를 stage하지 않는다.

## Validation

작업 디렉토리는 `C:/Users/김세정/Documents/GitHub/kpc_app`. Windows에서는 아래 `.cmd` 명령을 사용한다. 코드 변경 후 순서대로 실행한다.

- `git check-ignore -v tests/common/button.test.ts .memory/current.md` — 둘 다 로컬 제외 정책이 적용됨.
- `npm.cmd run test -- tests/common/button.test.ts --maxWorkers=2` — I05 시나리오 통과.
- `npm.cmd run typecheck` — 표준 props/ref·테마 token 키·CSS import 타입 오류 없음.
- `npm.cmd run lint` — 전체 lint 통과, any/미사용 import 없음.
- `npm.cmd run build` — 기존 업무 앱 프로덕션 빌드 성공. 아직 사용처가 없는 Button의 CSS 번들 포함까지 증명하지는 않음.
- `git diff --check` — 공백/충돌 표식 문제 없음. 신규 소스는 명시적으로 stage 후 `git diff --cached --check`도 확인.
- `git diff -- app/globals.css app/admin-utilities.css` — I04 선택자/소스 경로 외 변경 없음.
- `git diff --cached --name-only` — 테스트/로컬 current/무관한 파일이 포함되지 않음.
- CSS 상태표와 원본 theme 매핑을 정적으로 대조한다. 브라우저/E2E/스크린샷/dev server는 실행하지 않는다. T02가 실제 CSS 생성 검사를 추가한다.

## Commit Message

```text
feat(common): dadam 스타일의 범용 버튼과 공통 디렉토리 추가

Plan: 2026-11-02-common-button
Phase: P01-common-button
Task: T01-common-button-core

- 기존 dadam 테마를 참조하는 버튼과 common 진입점 구성
- 선택·비활성 상태와 tw 클래스 조절 및 표준 버튼 속성 지원
- 기존 화면을 유지하면서 CSS 우선순위와 로컬 DOM 계약 검증
```

이 Task의 앱 파일과 관련 `.memory` 결정/계획/phase/Task/history만 명시적으로 stage한다. `.memory/current.md`, `tests/`, `.git/info/exclude`는 커밋하지 않는다. 검증 통과 후 Task Status를 done으로 기록하고 phase/plan 진행률 및 로컬 current를 T02로 전진한다. 자동 push는 하지 않는다.

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: bb8b06b

## Execution Result

- Date: 2026-11-02
- common Button/public index, dadam 전용 CSS 변수 연결, 프리셋/상태 CSS를 구현했다. 기존 화면 사용처와 ui/layout 파일 위치는 유지했다.
- app/admin-utilities.css의 탐색 범위를 components TS/TSX로 연결하고 globals의 font/focus 규칙에서 새 버튼만 제외했다.
- 로컬 tests/common/button.test.ts: 1파일 10개 검사 통과. 기본 type·외부 form submit/reset·disabled·자식/속성/ref·선택 제어·테마 변수 전달을 확인했다.
- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check 통과. 빌드 route 구성은 기존과 동일하다.
- 브라우저/E2E/스크린샷/dev server는 기존 정책에 따라 미실시. 실제 CSS 생성과 예시 검증은 T02에서 수행한다.
- /tests/ 로컬 Git 제외 규칙을 보완했다. tests/current는 커밋 대상에서 제외한다.
- 기존 Vite 설정의 향후 loader 경고와 baseline-browser-mapping 데이터 노후 경고는 유지했다. 오류는 없으며 무관한 의존성 갱신은 하지 않았다.
