# Plan: KPC dadam 룩앤필 단계적 적용

## Goal

기본형 dadam의 Spoqa 서체, Fluent 파란 강조색, 중립 표면·구분선·상태 표현을 KPC의 사이드바와 활성 메뉴 → 프로필 전체 탭 → 토큰 사용량·신청 창 → 코멘트에 순차 적용한다. 공통 스타일을 재사용하되 로그인과 일반 본문 테마는 그대로 유지한다. 사이드바 계열 T01~T03 검증이 끝나야 T04 코멘트 구현을 시작한다.

## Decisions

- [확정 결정 및 테스트 조건 보완 승인](../decisions/2026-10-30-dadam-look-and-feel.md)
- [지속 검증 정책](../decisions/2026-10-30-task-validation-policy.md): 모든 Task에서 브라우저/E2E/스크린샷·육안 검증과 검증용 dev server 실행 제외. unit/jsdom, typecheck, lint, build, 정적 검토 유지.
- UI 스타일만 변경한다. 메뉴·역할·인증·폼 검증·코멘트 저장 및 권한·좌표 동작을 재설계하지 않는다. 토큰 API·서버 코멘트 동기화·로그인/일반 본문 재디자인은 이번 범위 밖이다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 공통 테마와 사이드바부터 코멘트까지 순차 스타일 적용 | [P01](../phases/2026-10-30-dadam-look-and-feel/P01-ui/phase.md) |

## Task Sequence

| Task | 결과 | 주요 파일 |
| --- | --- | --- |
| T01 | 범위별 dadam 테마·공통 스타일과 완성된 사이드바 활성 상태 | 새 `lib/ui/dadam-theme.ts`, 새 `components/providers/DadamThemeScope.tsx`, `AppShell.tsx`, `NavSidebar.tsx`, `globals.css` |
| T02 | 프로필 진입 버튼·팝오버 전체 탭과 공통 선택 컨트롤 정비 | `components/profile/Profile*.tsx`의 UI 4개, `SegmentedControl.tsx`, `ToggleSwitch.tsx` |
| T03 | 사용량·신청 모달·폼·알림 정비 및 사이드바 계열 완료 검증 | `components/profile/token/*.tsx`, `ModalFrame.tsx`, `app/(authenticated)/layout.tsx` |
| T04 | 코멘트 전체 시각 상태 정비와 세 화면 폭 좌표 회귀 검증 | `components/comments/` UI 8개, `config/comments.ts`, `tests/lib/comments/workspace-ui.test.ts` |

한 UI 스타일 전환 안의 의존 작업이므로 Phase는 하나로 둔다. 공통 테마는 첫 적용 대상인 사이드바와 함께 검증해 사용하지 않는 기반 코드만 남기는 Task를 만들지 않는다. 프로필과 토큰 창은 각각 탭 상태/폼·포털 경계가 있어 별도 Task로 검증한다. T03을 통과해야 사용자가 정한 사이드바 계열 완료 조건이 충족된다.

## Shared Contract

- 기존 로컬 Spoqa 400/500/700 재사용. 기본 본문·입력·버튼 14px/20px/400, 보조 12px/16px, 제목 16px/24px/700; 핀·배지·차트의 작은 크기는 각 Task에서 명시한다.
- 기준 파랑은 기본형 `webLightTheme`의 #0f6cbd, hover #115ea3, pressed #0c3b5e. 다른 dadam CSS의 #3360FE와 혼합하지 않는다.
- 공통 `DadamThemeScope`는 nested FluentProvider로 전체 Theme를 제공하고 기존 렌더러/상태 Provider를 재사용한다. 포털에 복제되는 클래스에는 위치·크기·display:contents를 넣지 않는다. 상세 계약은 각 Task에 반복 수록한다.
- 위험/오류·주의·성공은 브랜드색과 구분한다. 기존 빨간 문자열을 일괄 치환하지 않는다.
- 앱 전역 Provider와 body 서체를 변경하지 않는다. 토큰 창과 Toaster는 별도 scope가 필요하다. 코멘트는 T04에서 자신의 반환 section만 scope로 감싼다.
- 기존 desktop 200/64px·mobile 280px·760/761px 경계, 접힘 헤더 28px, 행 40px/gap 4px와 후속 글자색·구분선 보정을 출발점으로 보존한다.

## Validation Strategy

- T01: 실제 Fluent Provider/Portal의 테마 격리 jsdom 테스트 + 기존 사이드바·셸 테스트 + typecheck/lint/build.
- T02: 기존 프로필 상태/권한·토큰·셸 테스트를 재사용하고 슬롯/콜백 보존 정적 검토 + typecheck/lint. 스타일만 수정하는 Task에 별도 테스트를 신설하지 않는다.
- T03: 실제 프로필→토큰 창→신청·알림→포커스 흐름, 기존 상태 검증 + 전체 관련 테스트·typecheck/lint/build. 통과 후 T04 허용.
- T04: 기존 코멘트 단위/저장/DOM 테스트와 펼침·접힘·모바일 좌표 회귀 + 최종 전체 테스트·typecheck/lint/build.
- 계획 작성에서는 테스트를 실행하지 않았다. 검증 수치나 성공 여부는 실행 때 기록한다. 스타일 값을 복사한 테스트나 새 브라우저 도구는 추가하지 않는다.

## Existing Worktree / Commit Boundary

- 최초 사이드바 구현 커밋은 f573ce5. `NavSidebar.tsx`의 접힘 시작점·일반 글자색·구분선 후속 수정은 아직 작업트리에 있다. T01이 이 파일의 현재 상태를 이어받아 함께 커밋한다. reset/checkout으로 덮지 않는다.
- 이전 핀 코멘트 계획의 T03/T04/phase/plan/report와 이전 사이드바 T01 문서에는 기존 미커밋 기록이 있다. 새 Task 커밋에 `git add .`로 섞지 않는다.
- 새 결정·Plan·phase·Task·current·history 문서는 T01 커밋에서 명시 경로로 포함할 수 있다. 이후 Task는 자신의 구현·테스트·진행 문서만 stage한다.
- 이전 current의 원문은 [history](../history/2026-10-30-before-dadam-look-and-feel.md)에 보존한다. history의 상대 링크는 원래 current 위치 기준이다.

## Adjacent Findings

- 사용자 승인으로 T04 포함: 코멘트 UI 가상 측정의 220px 고정값을 200/64/0 조건으로 보완. 별도 Task는 만들지 않는다.
- 이미 인터뷰에서 범위 밖으로 확정: 토큰 실승인 API·코멘트 서버 동기화·실제 멘션 발송, 로그인과 다른 본문 화면의 재디자인.
- 계획 수립에서 별도의 보안 결함이나 깨진 경로를 확정하지 않았다. 새 결함 발견 시 해당 근거로 보고하며 임의 확장하지 않는다.

## Completion

- done: 2/4
- T01~T04가 각자 검증·한국어 커밋·진행 문서 동기화를 마치면 Plan done.
- `/memory-execute`는 current의 한 Task, `/mea`는 이 계획의 남은 Task를 순차 실행한다. 이번 계획 작성은 구현 실행 요청이 아니다.

## Planning Validation (2026-10-30)

- Plan/decision/current/phase/Task 8개 문서의 링크19개, Task4개의 필수 섹션·커밋 footer·코드 블록·파일 경로를 정적으로 확인했다. 새로 만들 구현/테스트 파일4개는 아직 생성하지 않았다.
- 이전 current를 history에 원문 그대로 보존했으며 SHA-256 일치를 확인했다.
- 계획 시작 전후 NavSidebar SHA-256이 동일하다. 이번 작업의 변경은 `.memory/` 문서뿐이며 기존 구현/미커밋 변경을 보존했다.
- 문서 공백 검사와 git diff check 통과. 앱 테스트/typecheck/lint/build 및 브라우저 검증은 계획 단계에서 실행하지 않았다.
