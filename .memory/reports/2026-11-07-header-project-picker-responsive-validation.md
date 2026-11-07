# 헤더 프로젝트 선택 반응형 — 실행 검증

- Date: 2026-11-07
- Plan: 2026-11-07-header-project-picker-responsive
- Phase/Task: P01-header / T01-fluid-project-picker
- 시작 HEAD: 6d459e7. 기존 미커밋 내용은 이번 계획 문서뿐이었으며 구현 소스의 선행 변경은 없었다.

## 구현 결과

- WorkspaceHeader에 fluidLeading 옵션(default false)을 추가했다. opt-in일 때만 메뉴/leading/표시 제목을 가변 왼쪽 그룹에 넣고 액션은 독립 flex item으로 유지한다.
- 왼쪽 그룹 flex:1 1 20rem/min-width:0/max-width:100%, 액션 flex:0 0 auto/max-width:100%. 바깥 행과 액션 내부의 wrap을 유지한다.
- ProjectHeader의 leading/selector는 flex:1 1 0%로 변경했다. selector width560 및 두 지역 스타일의 모바일 width100%를 제거했다.
- HeaderLoading 및 ProjectHeaderContent 모두 fluidLeading 사용. 기존 기본 헤더 경로에는 wrapper가 추가되지 않는다.
- 이름/메타의 기존 ellipsis/title을 유지했고 역할·회차에 별도 말줄임 텍스트를 적용했다. 역할 최대40%, 회차 최대50%, 트리거 화살표16px/shrink0.
- 공용 버튼, Provider, 저장/프로젝트 선택/회차/PPT/설정 로직 변경 없음.

## 수행한 검증

| 검증 | 결과 |
| :--- | :--- |
| npm.cmd run typecheck | exit0 |
| npx.cmd eslint components/layout/WorkspaceHeader.tsx components/common/ProjectHeader.tsx --max-warnings=0 | exit0 |
| git diff --check | exit0 |
| 구현 두 파일 diff 검토 | 지역 배치/표시만 변경. 이벤트/권한 분기 보존 |
| fluidLeading/flex/760/배지/화살표 rg 및 소스 대조 | 청사진 스타일 계약 일치 |
| aria/title/선택/초안 보호/포커스/회차/설정 rg 및 diff 대조 | 기존 동작과 전체 값 유지 |
| DadamControls.tsx SHA256 | 보호 해시 일치 |
| common/Button, ProjectHeaderProvider, globals.css, FluentUiProvider, files 디렉터리 diff | 변경 없음 |

보호 해시: 56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84.

## 정적 회귀 검토

- 데스크톱 1440/1280/1024 및 사이드바200/64: 필드가 viewport 고정 수치 대신 중첩 flex 영역의 남은 너비를 사용한다. sidebar 계산/상태는 변경하지 않았다.
- 761/760 경계: 메뉴40px은 기존 breakpoint 그대로 나타나되 왼쪽 그룹 안에 있다. leading과 selector의 width100 규칙은 없어졌다.
- 375/320과 긴 보관본/복수 역할: leading 그룹과 자식에 min-width:0, 긴 텍스트/배지 말줄임, 액션 묶음의 max-width100 및 내부 wrap을 확인했다.
- loading/idle/error/ready/unavailable/pending/selecting: 로딩/ready 호출부에 같은 옵션, 기존 disabled와 오류/빈 프로젝트 처리 유지.
- actions 없음/설정만/전체: 기존 조건부 wrapper/버튼 분기 유지. fluidLeading=false에서는 기존 leading 자식과 액션 DOM 배치를 유지한다.
- h1/headingRef/headerRef/sticky 및 WorkspacePage의 기존 ResizeObserver를 보존했다. 새로운 window 분기/측정 상태/useId는 추가하지 않았다.
- 펼친 picker640/max viewport-32, history/settings/회차 대화상자 디자인과 핸들러는 변경하지 않았다.

## 검증 한계와 인접 사항

- 기존 정책에 따라 브라우저/CUA/E2E/dev server/스크린샷과 tests/·임시 검증 파일을 사용하지 않았다. 위 화면 크기 항목은 CSS/구조 정적 검토이며 실제 너비/줄바꿈 임계점/픽셀 측정 결과가 아니다.
- 새로 발견한 범위 밖 필수 수정 사항: 특이사항 없음.
- 기존 FluentProvider theme ID/style hydration 오류는 이번 범위 밖이며 해결 확인 전 상태로 유지한다.
