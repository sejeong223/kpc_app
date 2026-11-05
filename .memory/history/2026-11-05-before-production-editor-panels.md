# Current Context

## Active Plan

[프로젝트 공용 헤더·팝업·설정 패널](./plans/2026-11-03-project-header.md)

## Active Phase

[P01 프로젝트 공용 헤더](./phases/2026-11-03-project-header/P01-project-header/phase.md)

## Active Task

없음 — T01~T05 완료.

## Last Completed

[T05 HTML 기준 설정 패널 네 탭·여백·설명 복원](./phases/2026-11-03-project-header/P01-project-header/T05-html-settings.md) — c20fb10

## Previous Plan Last Completed

[T02 사용 예시와 클래스 호환성 검증](./phases/2026-11-02-common-button/P01-common-button/T02-examples-and-validation.md)

## Status

- 2026-11-03 mea 완료: T04/T05 구현·typecheck/변경 파일 ESLint/build/diff 검증 완료. P01 done5/5, 남은 Task 없음.
- T04 e7fc228: 완성본 팝업·모달 HTML 보정 및 선행 동일 헤더 개선 보존. T05 c20fb10: 설정 네 탭의 배치·여백·원문 설명 복원.
- 원본 HTML의 배치·치수·간격·문구·아이콘·컨트롤 종류를 보존하고, 색·폰트·굵기·모서리·상태 표현만 기존 dadam을 적용한다.
- T04: 완성본22px 버튼/아이콘 및 완성·재작업 모달. T05: 설정560px/16px본문/2열폼/입력10px/권한·알림설명·수신버튼·로그4열.
- `DadamInput`은 KPC의 로컬 Fluent 래퍼이며 실제 dadam 원본 컴포넌트가 아니다. root12+input12는 소스상 선언이고 실제 픽셀 측정은 하지 않았다. 사용자 정상 다담 입력창에 문제가 있다고 일반화하지 않는다. 공용 DadamControls와 실제 dadam 저장소는 이번 계획에서 수정하지 않는다.
- 선행 미커밋 `components/common/ProjectHeader.tsx`, `components/layout/WorkspaceHeader.tsx`의 사용자 요청 개선(배경·하단선·600굵기·배지간격·D-day·체크위치·회차칩폰트)을 보존하여 T04에 함께 커밋했다.
- 새 생산파일 없이 기존파일만 보정. HTML 스크립트는 참고이며 실제 저장/다운로드/업무전환 허가가 아니다. tests 금지 및 브라우저 검증 제외 정책 유지.

## Initial Implementation History (T01~T03)

- 2026-11-03 mea 완료. P01/T01~T03 done3/3, 남은 Task 없음.
- T01 d1826e7: 공용 헤더·프로젝트 선택/토스트·리뷰/완료한 제안 메뉴.
- T02 48c4cf5: 완성·재작업 모달과 완성본 팝업.
- T03 55bd26c: 설정 네 탭·draft 수명·최종 통합 정적 검토.
- 각 Task typecheck/lint/build/diff 검사 통과. 브라우저/E2E/스크린샷/dev server 및 실제 키보드·픽셀 검증은 미실시.
- 새 생산 파일은 config/project-header.ts와 common의 ProjectHeader.tsx·ProjectHeaderProvider.tsx·ProjectSettingsDrawer.tsx 네 개다. README/index/module.css/예시/테스트 파일·tests 폴더를 새로 생성하거나 복원하지 않았다.
- 기존 Button·WorkspaceHeader·ModalFrame·DadamControls·팀원 CSS·코멘트 controller·인증 정책은 보존했다. 선택 UI는 실제 인증/코멘트 저장과 별개다.
- 최종 실행 버튼 disabled. 설정 입력은 탭 전환에 유지하고 닫기/프로젝트·메뉴 변경에 폐기한다. 실제 저장·권한 변경·알림 전송·다운로드 없음.
- 프로젝트 변경에도 사용자별 production-preview 코멘트는 그대로다. 프로젝트별 코멘트 분리는 기존 결정대로 범위 밖이다.
- local current는 커밋 제외. 원격 push/배포 없음.

## Previous Header Plan Status (Historical)

- 2026-11-02 `/mea` 구현 완료. 단일 Phase/Task, done 1/1. typecheck/lint/build와 정적 diff 검토 통과. 남은 Task 없음.
- 사용자가 확인한 범위는 버튼 4개의 UI와 핀 위치 이동뿐이다. 업무 버튼의 클릭 동작·팝업·설정 화면·저장 기능은 제외한다.
- 재작업 → 완성본 1 → 완성 → 설정을 기존 공통 Button으로 표시하고 설정 기준 34px 높이로 통일한다. 완성만 primary, 나머지는 기본형이며 기존 dadam 색·폰트를 사용한다.
- 핀 생성은 헤더 아래 작업 영역 왼쪽으로 기존 인스턴스를 이동한다. 나머지 헤더·코멘트 이벤트·좌표·포커스 계약은 유지한다.
- 유일한 생산 코드 대상은 `components/comments/CommentsWorkspace.tsx`. 같은 파일의 Griffel 스타일을 사용하며 팀원 버전 `app/admin-utilities.css` 및 공통 컴포넌트 원본은 수정하지 않는다.
- 기준 코드 `f2139807e815f902fded5e7bb2a5cb9ac5f94d3a`. [확정 결정과 기본값](./decisions/2026-11-02-write-header-actions.md)에 따라 구현했다. 테스트 파일/폴더 생성·복원 및 브라우저 검증은 수행하지 않았다.
- T01 커밋: `9785ddd` — `feat(write): 제작 헤더 버튼 4개 추가 및 핀 생성 위치 정리`. 지정한 Plan/Phase/Task footer를 포함하며 stage 공백·파일 범위 검사를 통과했다. 커밋 후 Git 작업 트리는 clean이다.

## Previous Plan Status (Historical)

- 2026-11-02 /mea 실행 완료. Plan/P01/T01~T02 done2/2, 남은 Task 없음.
- T01 `bb8b06b`: dadam 범용 버튼·common 진입점·상태 CSS·소스 탐색/전역 선택자 보완. 로컬 DOM10개와 typecheck/lint/build 통과.
- T02 `4ce93c1`: 타입 검사 가능한 사용 예시·README·최종 보고서. 최종 DOM/예시14개+스타일17개 총31개, typecheck/lint/build/diff/stage 검사 통과.
- 후속 사용자 지시: module.css 등을 없애고 버튼 구현·스타일을 `components/common/Button.tsx` 하나로 통합했다. 테마/CSS/예시/index 파일과 이후 요청한 README도 제거했다. common에는 Button.tsx만 남으며 이전 T01/T02의 파일 분리는 역사적 기록으로 보존한다.
- 후속 검증: 로컬26개(DOM9·스타일17), 실제 production SSR의 버튼2개/스타일1개 등록, typecheck/lint/build/diff 검사 통과. 이후 사용자 요청으로 단일 파일 통합·부속 파일 삭제·tests 생성 금지 규칙을 `71210d6`에 커밋했다. 커밋 전 diff/stage 검사를 통과했으며 원격 push는 수행하지 않았다.
- [실행 보고서](./reports/2026-11-02-common-button.md)에 실제 검증 결과와 로컬 테스트/브라우저 미실시 경계를 기록했다. 브라우저/E2E/스크린샷/dev server는 실행하지 않았다.
- [확정 결정](./decisions/2026-11-02-common-button.md)의 D11에 최신 사용자 지시를 기록했다: 폰트 등 기존 dadam 룩앤필을 그대로 참조하고 새 공통 컴포넌트는 `components/common/`에 둔다.
- 공통 Button과 사용 예시만 제공한다. 기존 화면 버튼 교체 및 기존 `components/ui`·`components/layout` 컴포넌트의 이동은 이번 범위가 아니다.
- 사용 방식: `import Button from "@/components/common/Button"`; `tw:` 클래스로 크기/배치/색 조절, children 자유 구성, 기본형과 primary/ghost/soft/dark/danger.
- `active`는 선택 유지, 표준 `disabled`는 클릭 불가. 호출부가 상태값과 aria-pressed를 관리한다. 기본 type은 button이며 form/ref/표준 속성을 전달한다.

## Execution Order

1. T04: HTML 기준 완성본 팝업22px버튼/아이콘·완성/재작업 모달 보정. ProjectHeader.tsx와 ModalFrame 선택적 스타일 슬롯.
2. T05: HTML 기준 설정 패널 네 탭·여백·설명 복원. ProjectSettingsDrawer.tsx와 알림 fixture 초기값.

위 순서로 구현·typecheck/변경 파일 ESLint/build·정적 검토 및 한국어 커밋을 완료했다. 완료 T01~T05 및 이전 write-header-actions/common-button 등을 다시 실행하지 않는다.

## Persistent Validation Policy

- 사용자 최신 지시(2026-11-02): **앞으로 `tests/` 폴더를 절대 생성·복원하지 않는다.** 로컬 전용/Git 제외/임시 검증도 예외가 아니다. AGENTS.md와 [지속 정책 D04](./decisions/2026-10-30-task-validation-policy.md)에 기록했으며 이전 Task의 생성 지시보다 우선한다.
- 사용자 지시(2026-10-30): **모든 Task에서 브라우저 검증 제외**. [지속 정책](./decisions/2026-10-30-task-validation-policy.md)을 유지한다.
- 기존 타입 검사·lint·build·정적 CSS/코드 검토 등을 활용하며 검증을 위해 tests 폴더를 만들지 않는다. 브라우저/E2E/스크린샷·육안 비교·native IME/터치 실기·검증용 dev server는 실행하지 않는다.
- jsdom/빌드/메모리 CSS compiler 검증을 실제 픽셀 배치나 화면 검증으로 보고하지 않는다. 미실시 항목을 통과로 적지 않으며 브라우저 제외를 별도 대기 Task로 남기지 않는다.
- Windows에서는 npm.cmd/npx.cmd를 사용한다. 과거 전체 테스트 숫자를 이번 실행 결과로 복사하지 않는다.

## Local Tests and Commit Boundary

- 과거 [테스트 정책 D10](./decisions/2026-11-02-workspace-spacing-system.md)의 로컬 보관 기록은 보존한다. 앞으로의 tests 생성·복원은 최신 금지 지시를 따르며, 기존 폴더/파일 삭제는 별도 요청이 있을 때 처리한다.
- T01에서 `/tests/` 로컬 Git 제외 규칙을 보완했고 테스트 파일은 Git에 포함하지 않았다. 2026-11-02 사용자 삭제 요청으로 `tests/common/button.test.ts`, `tests/common/button-styles.test.ts`를 삭제했다. 빈 `tests/common/`과 `tests/` 폴더 삭제는 도구 정책에 차단되어 남아 있다. 테스트 파일·폴더를 생성하거나 복원하지 않는다. 로컬 current도 커밋하지 않는다.
- `.memory/current.md`는 기존 `/.memory/current.md` ignore를 유지하는 로컬 전용 포인터다. 강제 추가·커밋하지 않는다.
- Task별 지정 한국어 메시지와 Plan/Phase/Task footer로 커밋한다. 관련 파일만 명시적으로 stage하고 `git add .`로 테스트/current/무관한 변경을 포함하지 않는다.
- 이번에는 push 요청이 없다. 이전 여백 작업의 단일 커밋/push 지시는 그 계획의 완료된 작업에만 적용한다.

## Next Step (IMPORTANT)

활성 계획의 모든 Task를 완료했다. 새 요청을 기다린다. 실제 업무 저장/프로젝트별 코멘트 분리는 별도 범위이며 tests 생성/복원 금지와 브라우저 검증 제외 정책을 유지한다.

## Previous Context

- 직전 [common-button 계획](./plans/2026-11-02-common-button.md)은 done2/2이며 단일 파일 통합 및 tests 생성 금지는 `71210d6`에 기록했다. 이후 팀원 변경 병합은 `f213980`이고 `admin-utilities.css`는 팀원 버전으로 유지한다.
- [이번 전환 직전 current 원문](./history/2026-11-02-before-common-button.md). 원문을 그대로 복사해 SHA-256 일치를 확인했다. 원문 내부 상대 링크는 원래 `.memory/current.md` 위치 기준이다.
- 이전 포인터의 [dadam 룩앤필 계획](./plans/2026-10-30-dadam-look-and-feel.md)은 완료 상태다. Last Completed는 [T04 코멘트 디자인과 좌표 회귀](./phases/2026-10-30-dadam-look-and-feel/P01-ui/T04-comment-design.md). 다시 실행하지 않는다.
- [업무 화면 여백 계획](./plans/2026-11-02-workspace-spacing-system.md)도 계획/phase 기준 done4/4다. [기존 실행 보고서](./reports/2026-11-02-workspace-spacing-system.md)의 구현·검증과 테스트 로컬 보관 정책을 참고하며 과거 상태를 덮어쓰지 않는다.
- 과거 병합·코멘트 저장·관리자 권한·사이드바·프로필·토큰 계약은 보존한 current 원문과 관련 계획에 남아 있다. 현재 프로젝트 공용 헤더 계획에서도 실제 업무 저장·인증 계약은 변경하지 않는다.
