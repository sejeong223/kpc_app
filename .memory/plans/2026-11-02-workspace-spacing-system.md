# Plan: 업무 화면 공통 여백과 페이지 구조

- Date: 2026-11-02
- Status: done
- Plan ID: `2026-11-02-workspace-spacing-system`
- 기준 코드: `d07b9a2` (계획 단계에서 앱 코드 변경 없음)
- 결정: [workspace-spacing-system](../decisions/2026-11-02-workspace-spacing-system.md)
- 검증 정책: [모든 Task에서 브라우저 검증 제외](../decisions/2026-10-30-task-validation-policy.md)

## Goal

로그인 후 홈(`/`), 관리자 진입(`/admin`), `/workspace/*`에서 같은 역할의 여백을 하나의 CSS 설정 원본으로 관리한다. 일반 화면의 바깥 네 면은 12px, 영역 사이와 카드 내부는 12px, 조작 묶음은 8px/4px로 시작한다. 스크린샷은 밀도 참고이며 픽셀 단위 일치를 검증했다고 표현하지 않는다.

공통 작은 제목·모바일 메뉴·주요 액션을 같은 헤더로 묶고, 긴 설명은 펼침 안내로 옮긴다. 본문 하단 앱 이름/‘나만의 업무 공간’ 푸터와 1320px 중앙 폭 제한을 제거한다. 데이터가 적어 자연스럽게 남는 화면 빈 공간은 그대로 둔다.

## Scope and Decisions

| 구분 | 포함 범위와 보존 조건 |
| --- | --- |
| 일반 페이지 | `/`, `/admin`, RFP 등록·검토 목록·AI 분석·파일 업로드·목차·제작 설정·프롬프트 세트의 기존 빈 화면 |
| 관리자 업무 | 사용자/그룹/역할 CRUD, 대시보드, 활동 로그, 모델·토큰 탭, Skill 목록·입력·조회, Template 목록·적용 테스트 |
| 제작 | 캔버스는 전체 면적 유지, 헤더만 공통 규칙. 핀 좌표의 원점·저장 형식·드래그/팝업 계산 보존 |
| 오버레이 | 기존 ModalFrame과 프로필/코멘트 팝업의 바깥·영역 간 간격을 별도 역할로 중앙 관리. 팝업 크기·좌표 정책 유지 |
| 상태 | 로딩/오류/조회 전용에도 제목과 모바일 메뉴 유지. 오류·권한·저장 상태를 접힌 설명 안에 넣지 않음 |
| 제외 | 로그인/인증 화면, 전역 색상·서체 교체, 새 업무 기능, DB/API/서비스 계약, PPT 문서 서식·좌표값, 새 패키지 |

홈과 `/admin`은 계획 중 인접 문제로 발견해 질문했고, 사용자가 포함을 선택했다(D09). 추가 승인 대기 항목은 없다. 나머지 테마 통합·미구현 메뉴 기능·Skill 프로젝트/변경이력은 기존 후속 범위를 유지한다.

## Architecture

1. `app/layout-tokens.css`가 수치의 원본이다. `app/globals.css`에서 한 번 import하고 `dadamUi`는 CSS 변수 문자열을 참조한다. DOM 밖의 Fluent 포털에도 상속되도록 `:root`에 선언한다.
2. `AppShell`이 일반 페이지 바깥 패딩을 **한 번만** 소유한다. `WorkspacePage`는 제목과 자식 영역 간 간격만, `WorkspaceCard`는 카드 내부만 소유한다.
3. `WorkspaceNavigation` context는 메뉴 버튼의 ID/열림 상태/토글만 전달한다. 인증·React Query·프로필·CommentsProvider를 추가하지 않는다. 기존 AppShell 상태와 포커스/스크롤 잠금을 그대로 사용한다.
4. `WorkspaceHeader`는 제목·뒤로 이동·짧은 데이터 안내·주요 액션·설명 펼침을 제공한다. `AdminPage`는 호환 어댑터다. Skill은 같은 헤더를 sticky로 쓰고 실제 높이 변화로 미리보기 상단 위치를 맞춘다.
5. 카드는 기본 inset 본문과 flush 표 본문을 명시적으로 구분한다. 표의 필터/알림/페이지 이동만 `WorkspaceCardSection`에 넣고 표 자체에는 이중 패딩을 넣지 않는다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 공통 설정 → 헤더와 셸 동시 전환 → 화면 내부 이관 → 오버레이·회귀·인계 | [P01](../phases/2026-11-02-workspace-spacing-system/P01-shared-workspace-layout/phase.md) |

T01~T04를 순차 실행하고 전체 검증을 완료했다. 결과와 예외는 [실행 보고서](../reports/2026-11-02-workspace-spacing-system.md)에 기록했다.

## Task Roadmap

| Task | 결과 | 주요 파일 |
| --- | --- | --- |
| T01 | 공통 여백 원본과 페이지/헤더/카드 API | `app/layout-tokens.css`, `components/layout/Workspace*.tsx`, `lib/ui/dadam-theme.ts` |
| T02 | 모든 페이지를 같은 헤더·셸로 전환 | `AppShell.tsx`, `AdminPrimitives.tsx`, `AdminScreenRouter.tsx`, 홈/관리자/동적 route, `SkillEditorPage.tsx`, `CommentsWorkspace.tsx` |
| T03 | 필터·표·카드·폼의 중복 간격 제거 | 관리자 ui/users/audit/dashboard/policy/assets/skills/templates, 홈·관리자 내부 카드 |
| T04 | 오버레이 간격과 회귀 검증·사용 가이드 | `ModalFrame.tsx`, 프로필/코멘트 팝업, 기존 E2E 소스 기대 정리, `.memory/reports` |

T01 → T02 → T03 → T04 순차 실행한다. 하나의 UI 리팩터링이므로 Phase를 추가로 나누지 않는다. 모바일 버튼만 먼저 이동하면 공통 헤더가 없는 상태 화면에서 메뉴가 사라지므로 셸 전환과 모든 페이지 헤더 연결은 T02에서 함께 끝낸다.

## Validation Strategy

- T01: 공통 헤더의 안내 펼침·외부 form 연결·메뉴 context 및 카드 접근성 jsdom 검사, typecheck/lint/build. Tailwind의 layout 소스 탐색 포함을 확인한다.
- T02: 기존 shell-ui/workspace-ui와 route/권한 검사, Skill 저장/이탈 보호, 인증된 홈·관리자 헤더. DOM 구조가 바뀌는 동작을 검사한다.
- T03: 기존 Skill 63개 필드 계약, 관리자 권한/선택/페이지 이동, Template 버전·작업 상태 검사를 유지한다. 변경한 조합에 한해 필요한 DOM 상호작용 검사를 추가한다.
- T04: 전체 `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`. 최종 변경 이후 통과한 결과를 기록한다.
- 지속 정책에 따라 **브라우저 E2E, 수동 브라우저, Computer Use, 스크린샷 비교, native IME/터치, 검증용 dev server 실행은 모든 Task에서 제외**한다. jsdom은 실제 렌더링·픽셀·터치를 보장하지 않는다.
- 과거 E2E에 있는 ‘제목이 메뉴 버튼 아래’ 기대는 새 헤더 구조와 충돌하므로 소스만 고친다. 실행하지 않고 ‘통과’라고 기록하지 않는다.
- CSS 숫자 복사 테스트·대량 스냅샷·새 시각 테스트 도구는 추가하지 않는다. 권한, 포커스, 저장/미저장 동작처럼 실제 회귀 위험이 있는 경계를 검사한다.

## Execution and Commit

- 최초 계획 단계에서는 앱 코드를 변경하지 않았다. 이후 사용자가 `/memory-execute`로 모든 Task 구현·단일 커밋·push를 명시적으로 요청했다.
- 실행 시 기존 ‘모든 Task 완료 후 한 번 커밋’ 선호를 유지한다. 각 Task는 검증 통과 후 `done`, `commit: deferred (batch)`로 기록하고 포인터를 전진한다. 실패한 검증은 면제하지 않는다.
- T04 후 전체 변경과 사용자 변경을 구분해 이 계획의 파일만 명시적으로 stage한다. 기존 충돌/수정이 있으면 보존하며 기능을 추정해 덮어쓰지 않는다.
- 각 Task의 Commit Message는 변경 의도 기록 및 개별 커밋 요청 시 사용할 템플릿이다. 기본 실행에서는 아래 단일 커밋을 사용한다.

```text
refactor(layout): css 여백 및 공통 디자인 컴포넌트 통합

Plan: 2026-11-02-workspace-spacing-system
Phase: P01-shared-workspace-layout
Task: T01-spacing-foundation, T02-unified-shell-header, T03-screen-spacing-migration, T04-overlays-regression-handoff

- 홈·관리자·업무 페이지의 여백과 모바일 헤더를 공통화
- 표·폼·오버레이의 간격 역할을 분리하고 기존 동작 보존
- 비브라우저 회귀 검증과 디자인 컴포넌트 가이드 기록
```

- `.memory/current.md`는 기존 `.gitignore`에 포함된 로컬 포인터다. 강제 stage하거나 ignore 정책을 바꾸지 않는다.
- 실행 중 확인한 원격 테스트 삭제는 사용자 선택 D10에 따라 유지한다. `tests/`는 로컬에 보존하고 검증하며 Git에는 포함하지 않는다. 기존 로컬 Skill 커밋과 원격 이력을 병합해 일반 push한다.

## Risks and Handoff

- 헤더를 옮길 때 고정 버튼을 남기면 같은 ID가 두 개 생긴다. 성공/로딩/오류에서 페이지 헤더 하나만 렌더한다.
- 메뉴가 열리면 헤더도 본문과 함께 inert가 된다. 닫기는 기존 사이드바/배경 버튼으로 하고 Escape 후 새 헤더 버튼으로 포커스를 되돌린다.
- 모바일 버튼 줄바꿈은 sticky 높이를 바꾼다. Skill 미리보기에 고정 64/96px 오프셋을 남기지 않는다.
- 임시 저장 경고는 ‘예시’로만 줄이지 않는다. 새로고침 시 초기화된다는 뜻은 항상 보인다.
- 캔버스 표면에 일반 패딩을 적용하거나 PPT cm/pt 값에 UI CSS 변수를 넣으면 기존 문서가 달라진다. 이 두 수치 체계는 수정 대상이 아니다.
- 결과 보고서와 HTML 가이드에 토큰 조정 위치, 표 카드 조합, 예외, 실제 검증 범위를 남긴다. 현재 계획 생성 시점에는 해당 결과물이 완성됐다고 기록하지 않는다.

## Completion

- [x] T01~T04 done 및 검증 결과 기록
- [x] Plan/Phase/Task/current 동기화
- [x] 한 번의 구현 커밋에 포함 (batch, Plan 헤더로 조회)
- [x] 여백 역할·컴포넌트 사용법 HTML 및 최종 보고서 작성
