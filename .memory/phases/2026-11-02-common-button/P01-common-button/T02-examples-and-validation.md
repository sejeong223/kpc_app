# Task: T02 사용 예시와 클래스 호환성 검증

## Status: done

## Goal

완성된 공통 버튼을 개발자가 예시대로 가져다 쓸 수 있도록 타입 검사 가능한 예시와 README를 제공하고, 기존 dadam 테마 참조·Tailwind 클래스 생성·스타일 우선순위를 검증한다. 기존 화면에 새 버튼을 연결하거나 새 페이지를 만들지 않는다.

## Decision Summary

- T01 완료/커밋이 선행 조건이다. 공개 API는 `import { Button } from "@/components/common"`, 타입은 `ComponentPropsWithRef<"button">`, 기본 type은 button, 자유로운 children/className과 native disabled/ref를 지원한다.
- 기존 dadam 서체/500 굵기·색상 토큰을 그대로 사용한다. 기본형+primary/ghost/soft/dark/danger 및 active가 있고, `tw:` 클래스로 크기·배치·색상을 조절한다. 예시는 개발용 소스이며 앱 라우트와 public barrel에는 연결하지 않는다.

## Implementation

### I01. 타입 검사 가능한 실제 사용 예시

- Related Files:
  - `components/common/Button.examples.tsx` :: 아래 네 가지 예시 함수 — 개발자 참고; new
  - `components/common/index.ts` :: `Button`, `ButtonProps` — 공개 진입점; read-only
  - `components/common/Button.tsx` :: 표준 Button — 선행 구현; read-only, 발견된 계약 결함의 최소 수정만 허용
  - `components/common/button-theme.ts`, `Button.module.css` — 선행 테마/상태; read-only, 검증 실패 시 이 계약 범위의 최소 수정만 허용
  - `app/`, 기존 `components/admin|profile|comments|layout|ui/` — 실제 사용처 연결하지 않음; read-only

#### Details

- **Signatures & Types**:

```typescript
import type { ReactElement } from "react";
export function ButtonPresetExamples(): ReactElement;
export function ButtonLayoutExamples(): ReactElement;
export function ButtonStateExamples(): ReactElement;
export function ButtonFormExample(): ReactElement;
```

- `use client` 파일이며 `Button`은 common public 경로에서 import한다. React useState/useRef/useId와 기존 Fluent icons만 사용한다. React19+TypeScript strict에서 컴파일되는 소스여야 한다.
- **Data & Schema Fields**:
  - Preset 예시: 추가 클래스 없음/primary/ghost/soft/dark/danger 여섯 개. 각 프리셋 이름은 완전한 리터럴로 유지한다. `variant` 같은 별도 prop을 만들지 않는다.
  - State 예시: `selected:boolean=false`. 버튼 클릭 시 예시 부모가 값을 반전하고 동일한 값으로 active 클래스와 aria-pressed를 지정한다. 별도로 disabled primary와 active+disabled 버튼을 보여준다.
  - Form 예시: `formId:string=useId()`, `inputId:string=useId()`, `inputRef:RefObject<HTMLInputElement|null>`, `buttonRef:RefObject<HTMLButtonElement|null>`, `submitted:boolean=false`. input은 label과 연결하고 form event는 preventDefault하여 외부 제출/탐색을 하지 않는다.
  - 서버 데이터/영속 상태/네트워크 요청 없음. 예시 상태는 마운트 동안만 존재한다. 공통 Button 내부로 state를 이동하지 않는다.
- **Execution Flow / Logic**:
  1. `ButtonPresetExamples`는 여섯 프리셋을 같은 의미의 짧은 한국어 텍스트로 표현한다. danger는 삭제처럼 위험 동작 이름으로 구분한다.
  2. `ButtonLayoutExamples`에는 아래 패턴을 실제 JSX로 모두 넣는다. 문서에만 문자열로 넣고 끝내지 않는다.
     - 텍스트만, 왼쪽 아이콘+텍스트, 텍스트+오른쪽 아이콘, 양쪽 아이콘: children 순서로 구성.
     - `tw:flex-col tw:h-auto tw:py-2` 세로 배치. 아이콘과 텍스트를 따로 감싸거나 직접 넣되 다른 interactive 요소는 넣지 않는다.
     - `tw:w-full tw:justify-between` 전체 폭 양끝 정렬, `tw:justify-start` 왼쪽 배치, 중앙 기본형. `text-align`만 바꿔 flex 항목이 움직이는 것처럼 설명하지 않는다.
     - 기본 높이32px에 `tw:h-10 tw:px-4 tw:gap-2`를 지정한 사용자 크기 예시.
     - `tw:w-4 tw:h-5 tw:p-0` 아이콘 전용 작은 크기 예시. 내부 아이콘은 `tw:w-3 tw:h-3 tw:shrink-0`, aria-hidden. 버튼에 aria-label="닫기". 이 작은 예시를 일반 모바일 권장 조작 크기로 소개하지 않는다.
     - `tw:h-auto tw:whitespace-normal tw:px-3 tw:py-2 tw:text-left` 긴 텍스트 예시. 내용/크기에 맞는 여백을 호출부에서 결정한다.
  3. 아이콘은 기존 `@fluentui/react-icons`의 `AddRegular`, `ChevronRightRegular`, `Dismiss12Regular` 등 현재 프로젝트에서 확인된 export를 사용한다. 장식 아이콘에는 aria-hidden을 넣고 `currentColor`를 상속한다. 별도 폰트·색상 정의·SVG 전역 크기 규칙을 추가하지 않는다.
  4. `ButtonStateExamples`는 일반 실행 버튼과 토글을 구분한다. 토글 className은 `"soft " + (selected ? "active" : "")`처럼 고정 후보만 결합한다. 일반 실행 버튼에 aria-pressed를 자동 부여하지 않는다.
  5. 색상 변경 예시는 `soft`와 다음 완전한 리터럴을 사용한다: `tw:bg-emerald-50 tw:text-emerald-900 tw:border-emerald-700 tw:enabled:hover:bg-emerald-100 tw:[&.active:enabled]:bg-emerald-200 tw:disabled:bg-slate-100 tw:disabled:text-slate-400`. 예시 색은 사용처의 명시적 덮어쓰기이며 dadam 기본값을 바꾸지 않는다. enabled 조건을 넣어 disabled 선택/hover 색이 다시 살아나지 않게 한다.
  6. `ButtonFormExample`은 label/input/form과 form 외부의 submit/reset 버튼을 둔다. submit/reset은 `form={formId}`로 연결한다. onSubmit은 preventDefault 후 submitted=true, onReset은 submitted=false. 결과는 `role="status"`로 알린다.
  7. 같은 Form 예시의 일반 Button은 type을 생략하고 inputRef.current?.focus()를 실행해 기본 버튼이 제출하지 않음을 보여준다. buttonRef는 예시의 실제 Button에 연결하고 별도 일반 Button에서 buttonRef.current?.focus()를 호출하는 예시로 native ref 전달을 보여준다. 자동 focus effect는 만들지 않는다.
  8. Error & Exception Handling: 예시는 외부 작업을 실행하지 않아 네트워크/업무 예외가 없다. ref는 null 안전 호출을 사용한다. hooks 순서를 지키고 이벤트 밖에서 상태를 변경하지 않는다.
  9. State Transition & Return: 각각 독립적으로 렌더링 가능한 ReactElement 반환. 예시 함수는 common/index.ts에서 재export하지 않는다. 앱 페이지·메뉴·route에 연결하지 않는다.

### I02. common 디렉토리 규칙과 개발자 사용 가이드

- Related Files:
  - `components/common/README.md` :: common 목적·Button 사용법 — 개발 문서; new
  - `components/common/Button.examples.tsx` :: 실행 가능한 예시 — 문서 원본; read-only

#### Details

- **Signatures & Types**: 문서에 `ButtonProps = ComponentPropsWithRef<"button">`와 default 직접 import/public named import를 설명한다. 허용되지 않는 prop을 지원 예시로 넣지 않는다.
- **Data & Schema Fields**: 지원 프리셋 표, 상태 의미 표, 파일 역할 표. 색상 hex/폰트 파일을 복제하는 테마 표는 만들지 않는다. 디자인 수정 원본은 `lib/ui/dadam-theme.ts`, 기존 layout CSS 변수임을 안내한다.
- **Execution Flow / Logic**:
  1. common에는 화면/업무 상태에 의존하지 않는 재사용 UI를 둔다. `Button.tsx`+CSS Module+내부 theme adapter를 설명하고 공개 export는 index에서 관리한다. 기존 ui/layout 파일의 대규모 이사는 이번 작업에 포함하지 않았음을 짧게 명시한다.
  2. 기본 사용 → 프리셋 → 크기/배치 → 아이콘 → 선택/disabled → 상태 색 덮어쓰기 → form/ref 순서로 I01의 실제 소스와 일치하는 짧은 예시를 넣는다. 대부분의 사용처는 기본 dadam 서체/굵기를 그대로 쓰도록 설명한다.
  3. `active`와 CSS `:active`를 구분한다. active는 선택 유지, :active는 누르는 순간이다. native disabled를 사용해야 실행이 막히며 `className="disabled"` 또는 aria-disabled만으로 차단되지 않는다.
  4. 토글에서는 부모가 같은 값으로 active와 aria-pressed를 관리한다. 일반 버튼은 선택 state가 없다. 탭/라디오/스위치를 Button 하나로 대체하지 않는다.
  5. utility 클래스는 `tw:` 접두사와 완전한 리터럴을 사용한다. `tw:w-${width}` 같은 런타임 조립이 자동 생성된다고 설명하지 않는다. 반응형은 `tw:sm:...` 표기를 사용한다.
  6. 기본 디자인은 components 레이어, 명시적 클래스는 utilities 레이어다. className 문자열 순서가 CSS 우선순위라는 오해를 방지한다. 직접 inline style은 해당 속성을 클래스보다 강하게 고정할 수 있음을 설명한다.
  7. 기본 배경 유틸리티는 여러 상태에 영향을 줄 수 있다. 특정 상태만 변경할 때 enabled/disabled/active selector가 필요하며 I01 색상 예시를 사용한다.
  8. 좁은 아이콘 버튼은 폭/높이뿐 아니라 패딩·아이콘 크기도 함께 조정한다. 기본 min-width 강제는 없고 긴 내용은 호출부가 줄바꿈/높이 조절을 선택한다.
  9. 아이콘 전용 버튼의 aria-label, 장식 아이콘 aria-hidden, 폼의 기본 type=button, 명시적 submit/reset/form, native ref 전달을 설명한다. 내부 마커 data-common-button은 예약 속성임을 명시한다.
  10. 개발 검증은 로컬 tests/common, typecheck/lint/build다. 해당 예시는 앱 화면에 자동으로 노출되지 않으며 브라우저 검증은 이번 사용자 정책상 수행하지 않았다고 구분한다.

### I03. 실제 Tailwind 입력과 스타일 우선순위 검사

- Related Files:
  - `tests/common/button-styles.test.ts` :: 테마/생성 CSS/범위 계약 — 로컬 전용; new
  - `tests/common/button.test.ts` :: I01 예시·form·선택 회귀 보완 — 로컬 전용; modify
  - `app/admin-utilities.css`, `app/globals.css` :: 소스 탐색 및 기존 전역 선택자 — read-only, 계약 위반 확인 시 최소 수정
  - `components/common/{Button.module.css,button-theme.ts,Button.examples.tsx}` — 검증 대상; read-only, 계약 위반 확인 시 최소 수정
  - `vitest.config.ts`, `postcss.config.mjs`, `package.json` — 기존 설정·의존성; read-only

#### Details

- **Signatures & Types**:

```typescript
// 로컬 테스트 helper 계약; production export가 아님
import type { Root } from "postcss";
async function compileProjectUtilities(): Promise<Root>;
```

- **Data & Schema Fields**:
  - 테스트 루트: `fileURLToPath(new URL("../../", import.meta.url))` (`tests/common/*.test.ts` 기준).
  - 실제 입력 경로: root의 `app/admin-utilities.css`, `app/globals.css`, `components/common/Button.module.css`.
  - 현재 앱 CSS는 `@layer theme, base, components, utilities`, prefixed Tailwind theme/utilities, source(none), components ts/tsx glob과 hooks/admin·app 소스 경로다. Button.module.css는 components 레이어이며 프리셋/상태는 root로 한정된다.
  - `DADAM_BUTTON_STYLE`은 기존 dadamTheme의 사용 token만 `--common-button-${key}`로 매핑한다. fontFamilyBase는 기존 dadam 변수, 굵기는500이다. 크기/배경 직접 inline 값이 아니라 변수만 전달한다.
- **Execution Flow / Logic**:
  1. `tests/`의 로컬 Git 제외가 유지되는지 확인한다. 필요한 테스트만 추가하고 옛 전체 테스트 복원/새 테스트 도구 설치/전역 Vitest 설정 변경은 하지 않는다.
  2. 스타일 테스트는 기본 node 환경을 사용한다. 설치된 `postcss`와 `@tailwindcss/postcss`로 실제 `app/admin-utilities.css` 문자열을 처리한다. plugin 옵션의 base는 repository root, optimize=false, process 옵션의 from은 실제 CSS 절대 경로다. `result.root`를 반환한다. output 파일/to를 지정하지 않아 메모리에서만 컴파일한다.
  3. I01 예시 소스에 실제 쓰인 아래 후보가 생성 CSS에 있고 utilities 레이어 아래에 선언되는지 검사한다: `tw:w-4`, `tw:h-5`, `tw:p-0`, `tw:flex-col`, `tw:justify-between`, `tw:gap-2`, `tw:h-auto`, `tw:whitespace-normal`, disabled 색상, `tw:enabled:hover:bg-emerald-100`, `tw:[&.active:enabled]:bg-emerald-200`.
  4. CSS selector의 escape와 nested rule을 고려해 PostCSS AST의 rule/ancestor/declaration을 검사한다. CSS 전체 문자열 snapshot이나 특정 공백/압축 순서에 의존하지 않는다. 테스트 코드에만 존재하는 `tw:w-[12345px]` 후보는 생성되지 않아야 한다. 실제 components source가 검증되는 것이며 테스트 폴더를 스캔하도록 바꾸지 않는다.
  5. Button.module.css를 parse하여 기본 크기/색상/상태 rule이 모두 components 레이어 안에 있는지, 선언된 레이어 순서가 utilities보다 앞인지 검사한다. 프리셋 rule에 local root가 결합되고 전역 독립 `.primary/.active/.danger` rule과 important 우회가 없는지 확인한다. 이것은 CSS 숫자 복제가 아니라 사용처 덮어쓰기와 범위 격리 계약을 검증한다.
  6. source의 `--common-button-*` 참조가 DADAM_BUTTON_STYLE에 모두 존재하는지 검사한다. 내부 `--_button-*`와 기존 `--layout-*`는 구분한다. 색/폰트 token은 원본 dadamTheme 값과 비교하고 hex snapshot으로 두 번째 원본을 만들지 않는다. `--common-button-focus-ring`은 원본 dadamUi.focusRing과 brand 토큰 치환 결과에 대응한다.
  7. globals를 parse하여 새 button이 기존 unlayered font/focus rule에서만 제외되었는지 확인한다. 기존 input/select/textarea, 링크 focus, cursor, font-face와 theme 원본은 유지돼야 한다. 예상 selector만 문자열 검색하는 것으로 전체 CSS 우선순위를 계산했다고 주장하지 않는다. source diff와 layer 구조 검사를 함께 기록한다.
  8. style test의 import로 DOM이 필요해지는 디자인을 만들지 않는다. theme adapter는 함수 hook/DOM 없이 로드 가능해야 한다. jsdom DOM 파일에서는 예시의 토글 클릭 → active/aria-pressed 동기화, disabled 클릭 차단, explicit form submit/reset, 버튼 ref 포커스를 추가 검증한다.
  9. Error & Exception Handling: 컴파일·타입·누락 token·미생성 클래스는 실패로 처리한다. 후보 생성 실패를 해결하기 위해 safelist 전역 추가·모든 파일 스캔·앱 route 생성으로 우회하지 않는다. 해당 source 경로/리터럴/스타일만 고친 뒤 영향을 받은 검사를 재실행한다.
  10. State Transition & Return: 출력은 테스트 결과뿐이며 앱 파일/페이지를 테스트 중 수정하지 않는다. 브라우저/E2E/스크린샷/렌더링 측정은 수행하지 않는다. jsdom getComputedStyle 결과로 CSS 레이어/레이아웃 적용을 증명하지 않는다.

### I04. 완료 보고와 포인터 정리

- Related Files:
  - `.memory/reports/2026-11-02-common-button.md` :: 구현/검증/제약 기록; new
  - `.memory/plans/2026-11-02-common-button.md` :: 완료 상태; modify
  - `.memory/phases/2026-11-02-common-button/P01-common-button/phase.md` :: done2/2; modify
  - `.memory/phases/2026-11-02-common-button/P01-common-button/T02-examples-and-validation.md` :: Status/결과; modify
  - `.memory/current.md` :: Active Task 없음/Last Completed T02 — 로컬 전용; modify

#### Details

- **Signatures & Types**: 새 런타임 API 없음. 문서 상태는 pending/in_progress/done 기존 workflow를 따른다.
- **Data & Schema Fields**: 보고서에 수정 파일, 공개 import, 프리셋/상태/레이아웃 계약, 정확히 실행한 명령/테스트 수/성공·실패, 실제 commit hash 또는 pending, 미실시 검증, 로컬 테스트 경로를 기록한다.
- **Execution Flow / Logic**:
  1. T01/T02의 최종 소스를 기준으로 지정 검증을 실행한다. 기존 작업의575개 등 과거 숫자는 이번 테스트 수로 복사하지 않는다.
  2. 실제 업무 페이지에는 Button을 적용하지 않았고 existing ui/layout 파일을 이동하지 않았음을 보고한다. CSS compiler 검증과 실제 화면 검증을 구별한다.
  3. 새 clone/CI에는 로컬 테스트 파일이 없다는 제한을 기록한다. 테스트 파일 공유 정책을 이번 작업에서 변경하지 않는다.
  4. 모든 필수 검증 통과 후 T02 Status/phase/plan을 done으로 기록하고 한국어 Task 커밋을 만든다. current는 Active Task 없음과 마지막 완료 링크로 갱신하지만 stage하지 않는다.
  5. 검증이 실패하면 원인/결과를 기록하고 원래 계약 안에서 수정한다. 무관한 의존성 업데이트/전역 테마 변경/추가 화면 이관으로 확장하지 않는다.

## Acceptance Criteria

- [x] 네 개의 예시 함수가 public Button을 사용하고 typecheck를 통과한다. 앱 route/메뉴에는 연결되지 않는다.
- [x] 프리셋/아이콘 조합/크기/세로/양끝/줄바꿈/선택+disabled/색상 override/form/ref의 실제 예시가 있다.
- [x] README가 예시와 같은 API를 설명하며 active와 disabled, 상태 색 덮어쓰기, 소스 스캔과 기본 type을 정확히 구분한다.
- [x] 기존 dadam 원본을 참조하고 새 폰트/팔레트/전역 theme 변경이 없다.
- [x] 실제 Tailwind 입력에서 common 예시의 클래스를 생성하고, CSS 범위/레이어/토큰 참조 검사와 DOM 회귀가 통과한다.
- [x] 전체 typecheck/lint/build가 통과하고 변경된 코드는 common·허용된 CSS 접점 범위에 한정된다.
- [x] 로컬 테스트/current는 커밋에서 제외하고 보고서에 실제 자동 검증과 브라우저 미실시를 구분했다.
- [x] phase/plan 완료, current 다음 실행 없음으로 정리했다.

## Validation

작업 디렉토리는 `C:/Users/김세정/Documents/GitHub/kpc_app`. 실제 코드 변경 후 다음을 실행한다.

- `git check-ignore -v tests/common/button.test.ts tests/common/button-styles.test.ts .memory/current.md` — 로컬 제외 확인.
- `npm.cmd run test -- tests/common/button.test.ts tests/common/button-styles.test.ts --maxWorkers=2` — DOM/예시 및 실제 CSS compiler 검사 통과.
- `npm.cmd run typecheck` — 예시의 JSX·표준 props·아이콘/ref 타입 포함 오류 없음.
- `npm.cmd run lint` — 문서 외 TS/TSX 전체 검증 통과.
- `npm.cmd run build` — 기존 앱 빌드 성공. Button 미사용 route의 빌드와 별도 CSS compiler 검사 범위를 보고서에서 구별.
- `git diff --check` 및 `git diff --cached --check` — 공백/충돌 문제 없음.
- `rg -n --glob '*.tsx' --glob '*.ts' '@/components/common' app components` — common 예시 외 기존 화면에 새 import가 생기지 않음. export 내부 경로는 상대 경로 사용.
- `git diff --cached --name-only` — tests/current/무관한 화면·테마 변경이 포함되지 않음.
- README와 예시의 클래스/prop 이름을 대조한다. 브라우저·Playwright·스크린샷·검증용 dev server는 실행하지 않는다.

## Commit Message

```text
docs(common): 공통 버튼 사용 예시와 스타일 검증 가이드 추가

Plan: 2026-11-02-common-button
Phase: P01-common-button
Task: T02-examples-and-validation

- 아이콘 배치와 선택·비활성 및 폼 사용 예시 제공
- 실제 Tailwind 클래스 생성과 dadam 스타일 참조 검증
- common 디렉토리 사용 규칙과 자동 검증 결과 기록
```

예시/README·필요한 최소 계약 수정·보고서/진행 문서만 명시적으로 stage한다. tests/current는 stage하지 않으며 자동 push하지 않는다. Task별 커밋 후 실제 hash를 기록한다.

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일을 포함하는 T02 커밋. 실제 hash는 로컬 current 및 Task footer로 조회한다.

## Execution Result

- Date: 2026-11-02
- Button.examples.tsx의 네 함수와 common README를 작성했다. 표준 Button의 상태/아이콘/크기/색/폼/ref 계약을 실제 JSX와 설명에 함께 반영했다.
- 기존 route·메뉴·업무 화면의 Button import는 변경하지 않았다. T01 공통 버튼 구현은 추가 수정 없이 예시/스타일 검사를 통과했다.
- 로컬 DOM/예시14개와 CSS 검사17개, 총2파일31개 통과. 실제 Tailwind 입력의 메모리 컴파일에서 크기·배치·hover/선택/disabled 색상 클래스 생성을 확인했다.
- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, diff/stage 검사 통과. 기존 앱 route 구성 유지.
- 브라우저/E2E/스크린샷/dev server는 사용자 정책에 따라 미실시. CSS 구조 검증과 실제 화면 검증을 구분한다.
- tests/current는 로컬 전용으로 유지했다. 추가 업무/보안 결함은 발견하지 않았고 기존 Vite/브라우저 기준 데이터 경고의 의존성 갱신은 범위 밖으로 남겼다.
- [최종 보고서](../../../reports/2026-11-02-common-button.md)에 구현·검증·제약과 커밋 조회 방법을 기록했다.
