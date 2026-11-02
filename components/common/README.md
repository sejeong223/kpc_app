# common

화면의 업무 상태에 의존하지 않는 재사용 UI를 둡니다. 새 컴포넌트는 이 디렉토리에 만들고 공개 API를 `index.ts`에서 내보냅니다. 기존 `components/ui`와 `components/layout`의 파일은 현재 위치를 유지합니다.

| 파일 | 역할 |
| --- | --- |
| `Button.tsx` | 표준 HTML button, 기본 type과 props 전달 |
| `Button.module.css` | 버튼에 한정된 기본 배치·프리셋·상태 |
| `button-theme.ts` | 기존 dadam 테마에서 버튼용 CSS 변수 연결 |
| `index.ts` | 공개 Button과 ButtonProps |
| `Button.examples.tsx` | 타입 검사 가능한 배치·상태·폼 예시 |

## 기본 사용

```tsx
import { Button } from "@/components/common";

<Button className="primary tw:h-8 tw:px-4" onClick={save}>
  저장
</Button>
```

`ButtonProps`는 React의 `ComponentPropsWithRef<"button">`입니다. `children`, `className`, `disabled`, `type`, `style`, `ref`, 이벤트, `aria-*`, `data-*`, 폼 관련 속성을 그대로 전달합니다. 직접 가져올 때는 `import Button from "@/components/common/Button"`을 사용합니다.

기본 폰트·글자 크기·굵기·모서리·색상은 기존 [dadam 테마](../../lib/ui/dadam-theme.ts)를 참조합니다. Spoqa Han Sans Neo와 현재 dadam 버튼의 14px/20px/500 기준을 사용하므로 호출부에서 폰트를 다시 지정할 필요가 없습니다. 간격은 [기존 layout 변수](../../app/layout-tokens.css)를 사용합니다. 다른 부모 테마 안에서도 버튼의 기본 dadam 스타일을 유지합니다.

## 프리셋

프리셋은 하나만 골라 클래스에 넣습니다. 크기와 배치 클래스는 함께 사용할 수 있습니다.

| 클래스 | 용도 |
| --- | --- |
| 생략 | 기본·보조 실행 |
| `primary` | 파란 강조, 저장 등 주요 실행 |
| `ghost` | 투명 배경, 도구·닫기 |
| `soft` | 옅은 파란 강조 |
| `dark` | 진한 중립 배경 |
| `danger` | 삭제 등 위험 동작 |

## 크기·배치·아이콘

아이콘과 텍스트는 `children`에 원하는 순서로 넣습니다. 별도의 `icon`, `iconPosition`, `label`, `variant`, `size` 속성은 없습니다.

```tsx
import { AddRegular, ChevronRightRegular, Dismiss12Regular } from "@fluentui/react-icons";

<Button className="primary tw:h-10 tw:px-4 tw:gap-2">
  <AddRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
  추가
</Button>

<Button className="tw:w-full tw:justify-between">
  <span>다음 단계</span>
  <ChevronRightRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
</Button>

<Button className="soft tw:flex-col tw:h-auto tw:py-2">
  <AddRegular aria-hidden="true" className="tw:w-4 tw:h-4 tw:shrink-0" />
  <span>세로 배치</span>
</Button>

<Button className="ghost tw:w-4 tw:h-5 tw:p-0" aria-label="닫기">
  <Dismiss12Regular aria-hidden="true" className="tw:w-3 tw:h-3 tw:shrink-0" />
</Button>
```

기본 높이는 기존 dadam의 32px, 너비는 내용 기준입니다. `tw:w-*`, `tw:h-*`, `tw:px-*`, `tw:gap-*` 등으로 변경합니다. 작은 아이콘 버튼에서는 패딩과 아이콘 크기도 함께 줄입니다. 위 16×20px 예시는 작은 크기 지정법이며 일반 모바일 조작 크기의 권장값은 아닙니다.

`tw:justify-start`는 flex 항목을 왼쪽에 배치하고, `tw:justify-between`은 항목을 양끝에 배치합니다. `tw:text-left`는 글자 정렬입니다. 긴 텍스트에는 `tw:h-auto tw:whitespace-normal tw:px-3 tw:py-2 tw:text-left`처럼 줄바꿈과 높이를 함께 지정합니다.

아이콘만 있는 버튼에는 의미 있는 `aria-label`을 넣고 장식 아이콘에는 `aria-hidden`을 지정합니다. 버튼 내부에 다른 버튼·링크·입력 요소를 넣지 않습니다.

## 선택과 사용 불가

```tsx
const [selected, setSelected] = useState(false);

<Button
  className={selected ? "soft active" : "soft"}
  aria-pressed={selected}
  onClick={() => setSelected((value) => !value)}
>
  필터 선택
</Button>

<Button className="primary" disabled>저장 불가</Button>
<Button className="soft active" aria-pressed={true} disabled>
  선택됨 · 변경 불가
</Button>
```

- `active` 클래스는 선택이 유지되는 상태입니다. 선택값은 사용처에서 관리하고 같은 값으로 `aria-pressed`도 전달합니다.
- CSS `:active`는 마우스/키보드로 누르는 순간입니다. 선택 유지와 다른 상태입니다.
- `disabled` 속성은 실제 클릭·제출을 막습니다. `className="disabled"`나 `aria-disabled`만으로는 막히지 않습니다.
- 일반 실행 버튼은 `aria-pressed`를 생략합니다. Button은 내부 선택 상태나 자동 토글을 갖지 않습니다.

탭·라디오·스위치에는 각 요소의 키보드·선택 규칙이 필요합니다. 기존 `SegmentedControl`과 `ToggleSwitch`의 역할을 이 버튼으로 대체하지 않습니다.

## 상태별 색상 조절

아래는 같은 `selected` 값을 사용하면서 사용처에서 색을 바꾸는 예시입니다. 기본 dadam 테마는 변경하지 않습니다.

```tsx
<Button
  className={
    "soft tw:bg-emerald-50 tw:text-emerald-900 tw:border-emerald-700 " +
    "tw:enabled:hover:bg-emerald-100 tw:[&.active:enabled]:bg-emerald-200 " +
    "tw:disabled:bg-slate-100 tw:disabled:text-slate-400" +
    (selected ? " active" : "")
  }
  aria-pressed={selected}
  onClick={() => setSelected((value) => !value)}
>
  필터 선택
</Button>
```

기본 배경 클래스는 여러 상태의 배경에 영향을 줄 수 있습니다. 특정 상태만 바꾸려면 hover/active/disabled 조건을 함께 사용합니다. 위 예시는 선택·hover에 `enabled` 조건을 넣어 비활성 색을 보존합니다.

기본 스타일은 CSS `components` 레이어에 있고 `tw:` 유틸리티는 더 높은 `utilities` 레이어에 있습니다. 클래스 문자열의 앞뒤 순서로 우선순위를 정하는 방식이 아닙니다. 같은 속성의 유틸리티를 여러 개 나열하지 말고 조건별로 하나를 선택하세요. 직접 `style={{ width: ... }}`로 지정한 속성은 해당 속성의 클래스보다 우선합니다.

Tailwind는 components의 TS/TSX와 기존 앱 소스를 탐색합니다. 클래스는 `tw:w-4`처럼 완전한 문자열로 작성해야 하며 `tw:w-${width}` 같은 런타임 조립은 자동 생성되지 않습니다. 반응형 표기는 `tw:sm:w-auto`처럼 사용합니다.

## 폼과 DOM 참조

기본 `type`은 `button`입니다. 폼 제출/초기화에는 명시적인 `type`을 지정합니다. 버튼이 폼 바깥에 있어도 `form` 속성으로 연결할 수 있습니다.

```tsx
const formId = useId();
const submitRef = useRef<HTMLButtonElement>(null);

<form id={formId} onSubmit={handleSubmit}>
  <label htmlFor={`${formId}-title`}>제목</label>
  <input id={`${formId}-title`} name="title" />
</form>
<Button ref={submitRef} type="submit" form={formId} className="primary">제출</Button>
<Button type="reset" form={formId}>초기화</Button>
<Button onClick={() => submitRef.current?.focus()}>제출 버튼에 포커스</Button>
```

`ref`는 실제 `HTMLButtonElement`를 가리킵니다. `useId`, `useRef`, `useState`와 이벤트 예시는 클라이언트 컴포넌트에서 사용합니다. 내부 마커 `data-common-button`은 전역 기본 스타일과 구분하기 위한 예약 속성입니다.

## 예시와 검증

[Button.examples.tsx](./Button.examples.tsx)의 네 함수를 참고하세요. 예시는 TypeScript 검사에 포함되며 앱 라우트나 공통 public export에는 연결하지 않았습니다.

로컬 `tests/common/`에서 DOM 동작과 실제 Tailwind CSS 생성·레이어 범위·테마 참조를 검사합니다. 테스트는 프로젝트 정책에 따라 Git에서 제외됩니다.

```powershell
npm.cmd run test -- tests/common/button.test.ts tests/common/button-styles.test.ts --maxWorkers=2
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

브라우저/E2E/스크린샷 검증은 기존 사용자 정책에 따라 수행하지 않았습니다. DOM·CSS compiler·빌드 검증과 실제 화면에서의 배치 검증은 구분합니다.
