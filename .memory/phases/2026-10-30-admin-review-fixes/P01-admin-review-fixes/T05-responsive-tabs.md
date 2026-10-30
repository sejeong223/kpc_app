# Task: T05 모바일 공통 탭 내부 스크롤

## Status: done

## Goal
320px와 390px 대시보드에서도 문서 폭이 화면을 넘지 않으며 모든 탭을 클릭·키보드로 이용할 수 있게 한다.

## Decision Summary
- F04. 공통 TabList를 폭이 제한된 가로 스크롤 컨테이너로 감싼다. 탭명·순서·URL 상태·Fluent 키보드 선택 동작을 유지한다.
- T04 후 순차 실행. Tailwind로 레이아웃 처리, Fluent CSS 임의 전역 덮어쓰기 금지. 중간 커밋 보류.

## Implementation

### I01. 공통 탭의 폭·포커스 처리
- Related Files:
  - `components/admin/ui/AdminTabs.tsx` :: `AdminTabs` — overflow와 활성 탭 표시; modify
  - `components/admin/dashboard/DashboardPage.tsx`, `components/admin/users/UsersPage.tsx`, `components/admin/policy/ModelTokenPage.tsx` — 동일 컴포넌트 사용처; read-only
  - `app/admin-theme.css` — 기존 공통 토큰; read-only

#### Details
- Signatures & Types: 공개 계약은 변경하지 않는다.
```typescript
interface AdminTabsProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(value: T): void;
}
function AdminTabs<T extends string>(props: AdminTabsProps<T>): React.ReactElement;
```
- Data & Schema Fields: 추가 서버/서비스 데이터 없음. 로컬 ref는 HTMLDivElement|null. 선택 value는 부모가 관리한다. 표시용 선택값 복제나 URL 중복 상태를 만들지 않는다.
- Execution Flow / Logic:
  1. outer container에 `tw:min-w-0 tw:max-w-full tw:overflow-x-auto`와 부모 폭에 맞는 너비를 적용한다. 내부 TabList는 내용이 필요로 하는 폭을 갖되 outer 밖으로 문서 폭을 확장하지 않는다.
  2. 기존 TabList `aria-label`, selectedValue, 옵션 존재 확인 후 onChange를 유지한다. 탭을 숨기거나 모바일에서 다른 메뉴로 대체하지 않는다.
  3. 탭 focus 이벤트와 외부 value 변경 이후 활성 탭이 컨테이너 밖이면 가로 scrollLeft만 필요한 거리로 조정한다. 수직 페이지 스크롤을 강제로 이동시키지 않는다. label/value 변경에 따라 활성 탭을 찾을 때 DOM의 role/aria-selected를 활용하고 문자열 CSS selector 삽입을 피한다.
  4. tab 키·좌우 화살표 등 실제 Fluent 탐색을 보존한다. 불필요한 wrapper tab stop이나 별도 키보드 핸들러를 중복 추가하지 않는다.
  5. 스크롤바 자체를 숨기지 않고 브라우저 기본 표시를 사용한다. 데스크톱에서 스크롤이 필요 없으면 기존 모양을 유지한다.
- Errors/Return: options가 비거나 value에 해당하는 요소가 없으면 스크롤만 생략한다. 다른 탭으로 임의 전환하지 않는다.

### I02. 실제 레이아웃 검사
- 별도 CSS 문자열 존재 테스트는 작성하지 않는다. T07의 실제 브라우저 측정으로 검증한다.
- 화면: `/workspace/skills`, `/workspace/templates`, `/workspace/users`, `/workspace/policy?tab=tokens`, `/workspace/dashboard`, `/workspace/audit`.
- 해상도: 1440×900, 1024×768, 768×1024, 390×844, 320×568, 1024×500.
- 각 기본 화면에서 `document.documentElement.scrollWidth <= innerWidth + 1` 확인. 표의 의도된 내부 overflow는 허용한다.
- 대시보드 320/390에서 마지막 탭을 클릭하고 키보드로 이동한다. 활성 탭 사각형이 스크롤 영역 안에 들어오는지, 탭 내용이 실제 바뀌는지, page scrollX가 0인지 확인한다.
- 사용자 설정과 모델·토큰 탭도 좁은 화면·역할별 옵션 감소 시 확인한다. 화면 넓히기/좁히기로 선택값을 초기화하지 않는다.

## Acceptance Criteria
- [x] 모바일 대시보드 문서 폭 449px 재현이 해소된다.
- [x] 모든 탭은 내부 스크롤로 도달하고 포커스/선택된 탭이 보인다.
- [x] 공통 사용처와 URL/키보드 동작에 회귀가 없다.

## Validation
- `npm.cmd run typecheck` 및 `npm.cmd run lint` — exit 0.
- 브라우저에서 320×568 대시보드 폭·마지막 탭·키보드 확인 후 Progress 기록.
- T07의 `npm.cmd run test:admin-review -- --grep "탭|반응형"` — 36개 화면 조합과 탭 상호작용 통과.

## Commit Message
```text
fix(admin): 모바일 공통 탭의 가로 넘침과 접근성 개선

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Task: T05-responsive-tabs

- 탭 내부 스크롤로 문서 폭 제한
- 활성 탭과 키보드 포커스 가시성 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 검증: typecheck, lint 통과. 실제 폭·활성 탭·키보드 검사는 T07 독립 브라우저로 확인한다.

- 최종 확인: T07 실제 브라우저: 36개 조합과 320/390px 탭 2개 시나리오 통과. 즉시 scrollLeft 보정이 Fluent 선택/포커스 처리로 되돌아가 requestAnimationFrame 이후 보정하도록 수정했다. 방향키 포커스 이동 후 Enter 선택이라는 기존 동작을 유지한다.
