# Plan: dadam 범용 공통 버튼과 common 디렉토리

- Date: 2026-11-02
- Status: done
- Feature: common-button
- 기준 코드: `b3d0341`. 계획 시작 시 미추적 `2026-11-02-common-button.md` 결정 문서만 있었고 추적 앱 소스 변경은 없었다.
- T01/T02 구현·자동 검증 완료. [실행 보고서](../reports/2026-11-02-common-button.md)에 결과와 검증 경계를 기록했다.
- 실행 후 사용자 지시 D13으로 구현을 `Button.tsx` 하나에 통합하고 후속 요청으로 README도 제거했다. 아래 디렉토리/Task 구성은 초기 실행 이력이며, 현재 파일 구조와 직접 import 방식은 결정 D13을 따른다.

## Goal

`components/common/`에서 가져다 쓸 수 있는 범용 `Button`을 제공한다. 기본 폰트·색·모서리는 기존 dadam 테마를 그대로 참조하고, 크기·배치·색상은 `tw:` 클래스로 조절한다. 기존 화면의 버튼과 `components/ui`의 파일 위치는 유지한다.

완료 결과는 기본형 및 다섯 프리셋, 선택·disabled·hover·누름·키보드 포커스 상태, 자유로운 아이콘/텍스트 배치, 표준 button 속성/DOM ref 전달, 타입 검사 가능한 예시와 사용 문서다. 로컬 DOM/스타일 생성 검사와 typecheck/lint/build로 검증한다.

## Decisions and Boundaries

- [인터뷰 결정 및 계획 단계 추가 지시](../decisions/2026-11-02-common-button.md).
- `active`는 선택 유지, 표준 `disabled`는 클릭 불가다. 선택값과 `aria-pressed`는 사용처가 함께 관리한다.
- 기본형 + `primary`, `ghost`, `soft`, `dark`, `danger` 중 하나를 클래스에 넣는다. 레이아웃은 `tw:w-*`, `tw:h-*`, `tw:p-*`, `tw:gap-*` 등으로 조절한다.
- 서체/색 숫자의 새 원본을 만들지 않는다. `dadamTheme`, `dadamUi`, 기존 `--dadam-font-family`와 layout 변수에서 버튼용 CSS 변수로 연결한다.
- `components/common/`만 신설한다. 기존 ui/layout 파일 이동, 화면 버튼 이관, 전역 테마 교체, 새 라우트/카탈로그, DB/API 변경, 라이브러리 추가는 없다.
- 컴포넌트는 네이티브 `button` 한 개를 렌더링한다. 불필요한 Provider/래퍼, 내부 선택 상태, 비동기 작업 제어, 링크 다형성은 추가하지 않는다.
- 계획 결과는 `.memory/` 문서뿐이다. 앱 소스/설정/테스트의 실제 변경은 실행 단계로 남긴다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | common 버튼 구현과 사용 계약 검증 | [P01](../phases/2026-11-02-common-button/P01-common-button/phase.md) |

## Task Roadmap

| Task | 결과 | 주 변경 파일 |
| --- | --- | --- |
| T01 | common 진입점·표준 버튼·dadam 상태 스타일과 DOM 계약 | `components/common/{Button.tsx,Button.module.css,button-theme.ts,index.ts}`, `app/{admin-utilities.css,globals.css}` |
| T02 | 타입 검사 가능한 예시·사용 가이드와 CSS 생성/우선순위 검증 | `components/common/{Button.examples.tsx,README.md}`, 로컬 `tests/common/button-styles.test.ts`, `.memory/reports/2026-11-02-common-button.md` |

T01 → T02 순차 실행한다. 하나의 UI 모듈이므로 Phase는 하나다. 버튼을 먼저 무스타일 껍데기로 나누면 공개한 계약이 성립하지 않으므로 테마/상태/CSS 탐색/기본 동작을 T01에서 함께 마친다. T02는 완성된 API를 실제 사용 패턴으로 검증하고 문서를 넘기는 별도 단위다. 로컬 DOM 검사는 T01부터 포함하며 테스트만 마지막에 몰아두지 않는다.

## Final Directory Contract

```text
components/common/
  Button.tsx           # default Button + ButtonProps
  Button.module.css    # components layer, root 범위 안의 프리셋/상태
  button-theme.ts      # 기존 dadamTheme → 버튼 전용 CSS 변수 연결
  index.ts             # named Button/타입만 export, 예시는 export하지 않음
  Button.examples.tsx  # 앱 라우트에 연결하지 않는 타입 검사 가능한 예시
  README.md            # 공개 API·예시·디렉토리 규칙
tests/common/          # 실행 단계에서 만드는 로컬 전용 검증, Git 제외
  button.test.ts
  button-styles.test.ts
```

공개 사용법은 `import { Button } from "@/components/common"`. 직접 경로 default import도 가능하다. 내부 테마 매핑과 CSS 모듈을 공개 barrel에서 내보내지 않는다. `index.ts` 자체에 `use client`를 넣어 향후 모든 공통 컴포넌트를 클라이언트로 강제하지 않는다.

## Validation Policy

- [지속 검증 정책](../decisions/2026-10-30-task-validation-policy.md)에 따라 브라우저/E2E/스크린샷/육안 비교·검증용 dev server는 제외한다.
- 현재 `tests/`가 없다. 필요한 로컬 검사만 만들며 기존 수백 개 테스트가 존재하거나 이번에 통과했다고 기록하지 않는다. [이전 테스트 정책 D10](../decisions/2026-11-02-workspace-spacing-system.md)은 유지한다.
- 현재 로컬 제외 규칙도 빠져 있으므로 T01에서 `git rev-parse --git-path info/exclude`의 파일에 `/tests/`가 있는지 확인하고 없으면 추가한다. 공유 `.gitignore`와 원격 테스트 정책은 바꾸지 않는다.
- T01: `npm.cmd run test -- tests/common/button.test.ts --maxWorkers=2`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`.
- T02: `npm.cmd run test -- tests/common/button.test.ts tests/common/button-styles.test.ts --maxWorkers=2`와 typecheck/lint/build/diff. 스타일 검사는 실제 Tailwind 입력을 메모리에서 컴파일하며 브라우저 레이아웃 검증으로 보고하지 않는다.
- CSS 모듈이 실제 업무 route에서 아직 import되지 않으므로 Next 빌드만으로 공통 버튼 CSS 배포까지 검증했다고 주장하지 않는다. 이번 범위는 재사용 기반이며 기존 화면 연결은 후속이다.
- 의미 있는 검증: 기본 type의 실수 제출 방지, explicit submit/reset, disabled 실행 차단, 자식/표준 속성/ref 보존, 사용처 선택값 동기화, 클래스 생성 및 우선순위, 기존 전역 규칙과 테마 보존.

## Regression Controls

- Tailwind의 뒤쪽 클래스 문자열만으로 우선순위가 보장되지 않는다. `components` 레이어의 버튼 기본값을 `utilities`보다 낮게 둔다.
- `globals.css`의 레이어 밖 `font: inherit`와 포커스 규칙은 새 `data-common-button`만 제외한다. 나머지 버튼/입력/링크는 같은 규칙을 유지한다.
- 원본 `webLightTheme`는 굵기600이지만 현재 `dadamTheme`는500이다. 새 컴포넌트는 dadamTheme를 참조한다.
- KPC 빨간 전역 테마가 버튼에 유입되지 않도록 자체 루트의 전용 CSS 변수로 dadam 값을 연결한다. 기본 디자인을 inline background/width로 고정하지 않아 유틸리티 조정을 허용한다.
- 선택+disabled일 때 클릭 불가와 중립 disabled 표현이 유지되고, hover·누름 규칙은 `:enabled`에만 적용된다.
- 작은 폭 지정 시 패딩/아이콘 크기도 호출부에서 조절한다. `min-width`로 폭을 강제하거나 아이콘 크기를 전역 SVG 선택자로 바꾸지 않는다.

## Commit and Pointer Policy

- Task별 청사진의 한국어 메시지와 Plan/Phase/Task footer로 한 번씩 커밋한다. 이전 여백 작업의 단일 커밋·push 지시는 그 계획에 한정되며 이번 계획에 이월하지 않는다.
- `.memory/current.md`는 로컬 전용·Git 제외를 유지한다. `git add -f`나 `git add .`로 포인터/테스트/무관한 변경을 섞지 않는다.
- T01 커밋에는 이 계획 관련 결정/계획/phase/Task/history 문서와 T01 앱 소스만 명시적으로 포함할 수 있다. T02도 자기 범위 파일과 진행 기록만 포함한다. 자동 push는 하지 않는다.
- 이전 current 원문은 [전환 전 기록](../history/2026-11-02-before-common-button.md)에 보존한다. 해당 원문의 상대 링크는 원래 `.memory/current.md` 위치 기준이다.
- 이전 current가 가리키던 dadam 작업과 별도 여백 계획은 완료된 기록으로 유지하며 다시 실행하지 않는다.

## Adjacent Findings — 이번 범위에 추가하지 않음

- 기존 화면의 중복 버튼 스타일과 KPC/dadam 이중 테마는 이미 인터뷰에서 보고했다. 사용자가 기존 화면 유지를 선택했으므로 전체 이관/테마 통합 Task를 추가하지 않는다.
- 기존 SegmentedControl/ToggleSwitch는 별도 의미·키보드 계약이 있으므로 이번 버튼으로 대체하거나 common으로 이동하지 않는다.
- 원격 테스트 부재로 새 clone/CI에서 로컬 검사 전체를 바로 재현할 수 없다. 기존 정책을 유지하며 테스트 공유 복원은 요청받지 않았다.
- 새 업무 경로 오류나 보안 결함은 이번 읽기 탐색에서 확정하지 않았다. 필요성이 확인되지 않은 인접 정리로 작업을 늘리지 않는다.

## Plan Completion

- [x] T01 done, 공개 컴포넌트와 스타일 계약 검증
- [x] T02 done, 사용 예시·가이드·검증 보고서 완료
- [x] phase/plan/current 진행 기록 정리
