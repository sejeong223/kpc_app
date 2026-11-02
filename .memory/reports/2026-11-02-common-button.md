# 실행 결과: dadam 공통 버튼

- Date: 2026-11-02
- Status: done
- Plan: [2026-11-02-common-button](../plans/2026-11-02-common-button.md)
- Phase: P01-common-button, done2/2
- 실행 요청: `/mea`에 따라 T01 → T02 순차 구현·검증·Task별 한국어 커밋.
- 최신 후속 수정: 사용자 지시로 구현과 스타일을 `Button.tsx` 한 파일에 통합했다. 아래 T01/T02 표는 초기 이력이며, 현재 구조와 검증 결과는 마지막 후속 수정 항목을 따른다.

## 구현 결과

| 파일 | 변경과 이유 |
| --- | --- |
| `components/common/Button.tsx` | 표준 button props/children/ref 전달, 기본 type=button으로 의도치 않은 제출 방지 |
| `components/common/Button.module.css` | 기본형과 primary/ghost/soft/dark/danger, 선택/hover/pressed/disabled/focus, 고대비·reduced-motion 대응 |
| `components/common/button-theme.ts` | 기존 dadamTheme의 사용 token만 전용 CSS 변수로 연결해 폰트·500 굵기·파란 브랜드를 재사용 |
| `components/common/index.ts` | `Button`과 `ButtonProps` 공개 진입점 |
| `app/admin-utilities.css` | components TS/TSX의 완전한 `tw:` 클래스가 생성되도록 탐색 경로 연결 |
| `app/globals.css` | 기존 레이어 밖 font/focus 규칙에서 새 버튼만 제외해 dadam/유틸리티 우선순위 보장 |
| `components/common/Button.examples.tsx` | 프리셋·아이콘 배치·크기·선택/disabled·색상·외부 form·ref 예시 |
| `components/common/README.md` | common 디렉토리 규칙과 공개 API/상태/클래스 사용법 |

```tsx
import { Button } from "@/components/common";

<Button className="primary tw:h-8 tw:px-4" onClick={save}>
  저장
</Button>
```

- 폰트/팔레트의 원본은 기존 `lib/ui/dadam-theme.ts`와 전역 dadam 서체 변수다. 새 폰트/Provider/상태 관리 도구를 추가하지 않았다.
- `active`는 호출부가 유지하는 선택 표시이고 `disabled`는 실제 실행 차단이다. 토글 호출부가 같은 선택값으로 `aria-pressed`를 전달한다.
- 기본 디자인은 components CSS 레이어, 사용처 `tw:`는 utilities 레이어다. 클래스 문자열 순서나 inline width/background 고정에 기대지 않는다.
- 기존 화면의 Button import와 ui/layout 파일 위치는 유지했다. 새 메뉴/route/카탈로그, API/DB/권한 변경은 없다.
- 초기 사용 문서 `README.md`와 `Button.examples.tsx`는 후속 사용자 요청으로 제거했다. 현재 사용 방식은 마지막 후속 수정 항목을 따른다.

## 검증 결과

| 단계 | 명령/검사 | 결과 |
| --- | --- | --- |
| T01 | `npm.cmd run test -- tests/common/button.test.ts --maxWorkers=2` | 1파일 10개 통과 |
| T01 | `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` | 통과 |
| T02 최종 | `npm.cmd run test -- tests/common/button.test.ts tests/common/button-styles.test.ts --maxWorkers=2` | 2파일 31개 통과: DOM/예시14, 스타일17 |
| T02 최종 | `npm.cmd run typecheck` | 예시/ref/표준 props 포함 통과 |
| T02 최종 | `npm.cmd run lint` | 통과 |
| T02 최종 | `npm.cmd run build` | Next 프로덕션 빌드 성공, 기존 route 구성 유지 |
| CSS | 실제 Tailwind 입력을 PostCSS로 메모리 컴파일 | 크기/배치/상태 색상 클래스 생성 및 utilities 레이어 확인 |
| CSS | CSS Module 범위·테마 참조·기존 font/focus 예외 검사 | 모든 참조 연결, 기본 스타일의 레이어/선택자 격리 확인 |
| 범위 | common import 검색 | 실제 업무 화면 사용처 추가 없음, 예시만 사용 |
| Git | `git diff --check`, `git diff --cached --check`, stage 경로 검사 | 통과, tests/current 제외 |

DOM에서는 기본 type의 제출 방지, explicit submit/reset, 외부 form 연결, disabled 클릭 차단, children/속성/ref 보존, 선택값 동기화와 예시 포커스 흐름을 확인했다. 스타일 검사는 생성 CSS의 구조와 원본 dadam 값 참조를 확인하며 숫자/색상을 복제한 스냅샷을 만들지 않았다.

## 검증 경계와 인접 사항

- [사용자 지속 정책](../decisions/2026-10-30-task-validation-policy.md)에 따라 브라우저/E2E/스크린샷·검증용 dev server는 실행하지 않았다. DOM/CSS compiler 검증을 실제 픽셀 배치·모바일 터치 검증으로 보고하지 않는다.
- 아직 기존 route에서 Button을 import하지 않는다. Next 빌드는 기존 앱 영향과 타입 검증이며, 새 버튼의 사용 클래스 생성은 별도 PostCSS 검사로 확인했다. 앱 화면에 배포된 것으로 표현하지 않는다.
- 로컬 테스트 정책에 따라 `/tests/`를 `.git/info/exclude`에 보완했다. `tests/common/button.test.ts`, `button-styles.test.ts`는 이 작업 폴더에만 있고 커밋하지 않는다. 새 clone/CI에서 이 로컬 테스트가 자동 재현되지 않는 제한은 유지된다.
- `.memory/current.md`도 기존 정책대로 로컬 전용이다. 기존 current 원문은 history에 보존했다.
- 기존 Vite 설정의 향후 native loader 경고와 baseline-browser-mapping 데이터 노후 경고가 있다. 검증을 막지 않았으며 이번 버튼 작업에서 의존성 갱신을 하지 않았다.
- 추가 업무 기능 결함·보안 결함은 발견하지 않았다. 기존 화면의 중복 버튼 스타일, 전체 테마 통합 및 기존 ui 디렉토리 이관은 이전 범위 결정에 따라 별도 후속으로 남겼다.

## 커밋과 완료 상태

- T01: `bb8b06b` — `feat(common): dadam 스타일의 범용 버튼과 공통 디렉토리 추가`.
- T02: 이 보고서를 포함하는 `docs(common): 공통 버튼 사용 예시와 스타일 검증 가이드 추가` 커밋. `git log -1 --format="%h %s" --grep="Task: T02-examples-and-validation"`로 정확한 hash를 조회할 수 있으며 로컬 current와 최종 응답에도 기록한다.
- Task별 커밋은 Plan/Phase/Task footer를 포함한다. 원격 push·외부 게시/배포는 수행하지 않는다.
- 모든 Task 완료 후 phase/plan은 done2/2, 로컬 current의 Active Task는 없음으로 정리한다.

## 후속 직접 수정: Button.tsx 단일 파일 통합

- 사용자 지시: “module.css도 필요없어... 그냥 button.tsx 안에 다 합쳐줘.”
- 구현·기존 dadam 값 참조·상태 CSS를 `components/common/Button.tsx`에 모았다. 별도 CSS 변수 매핑 객체도 제거하고 dadamTheme/dadamUi를 스타일에서 직접 참조한다.
- `Button.module.css`, `button-theme.ts`, `Button.examples.tsx`, `index.ts`를 제거했고 후속 요청으로 `README.md`도 제거했다. common에는 `Button.tsx`만 남는다.
- 가져오기: `import Button from "@/components/common/Button"`. 표준 props/ref, children, tw 클래스 조절, active/disabled 계약은 유지한다.
- 기존 `makeStaticStyles`로 등록하며 새 Provider나 라이브러리를 추가하지 않았다. 기본 스타일은 기존처럼 components 레이어에 있어 utilities가 우선한다.
- 최종 로컬 검사: 2파일26개 통과(DOM9·스타일17). 제거된 예시/내보내기 전용 검사는 없애고 CSS 등록·레이어·기존 테마값 검사를 단일 파일 구조에 맞췄다. 클래스 조절은 메모리 안의 호출부 후보로 Tailwind를 컴파일해 검증했다.
- 실제 production 모드 React 서버 렌더링도 확인했다. 버튼2개가 단일 style 요소를 공유하며 레이어 CSS와 버튼 마커가 포함됐다. Griffel 렌더러별 중복 등록 방지도 로컬 검사에서 통과했다.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` 통과. 브라우저 검증은 기존 정책대로 제외했다.
- 이 후속 수정은 사용자 요청에 따라 별도 커밋으로 기록한다. 초기 두 커밋의 이력은 그대로 유지한다.
