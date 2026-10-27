# Current Context

## Active Plan

[Fluent UI 기반 KPC 사이드바와 메뉴 이동](./plans/2026-10-27-kpc-sidebar-ui.md)

## Active Phase

[P01 Fluent UI 사이드바와 메뉴 이동](./phases/2026-10-27-kpc-sidebar-ui/P01-sidebar-navigation/phase.md)

## Active Task

[T03 Fluent UI 사이드바·셸·헤더 통합](./phases/2026-10-27-kpc-sidebar-ui/P01-sidebar-navigation/T03-sidebar-ui.md)

## Status

- MEA 자동 연속 실행 중, T01·T02 구현·검증 완료
- P01: done 2/3, Active Task T03
- 확정 결정: [사이드바 범위·Fluent UI·개발 미리보기](./decisions/2026-10-27-kpc-sidebar-ui.md)
- 이전 `dadam_app` 참고 스타일 전면 변경 요청은 사용자 지시로 중단. 해당 구현 변경 없음.
- 일반 7개·관리자 8개 메뉴와 안내 URL만 구현하며 프로필 모달·실제 업무 기능은 제외한다.
- 인증 비활성에서는 전체 메뉴와 안내 화면 미리보기, 활성 환경에서는 기존 진입 가드와 Admin 서버 인가 유지.
- 새 사이드바 및 수정하는 셸·헤더 스타일은 같은 TSX의 Fluent `makeStyles` / `useStyles` / `mergeClasses`로 관리한다. CSS module은 추가하지 않는다.

## Next Step (IMPORTANT)

T03 청사진을 읽고 `NavSidebar`, `AppShell`, `AppHeader`에 Fluent UI와 메뉴 이동을 연결한다. 반응형·접힘·프로필 표시를 완성하고 전체 검증한다. `/mea`에 따라 자동으로 이어간다.

## Previous Plan

[Azure 템플릿 디자인 초기화 — 완료](./plans/2026-10-26-azure-template-design-reset.md)

Microsoft 로그인과 기본 앱 진입·홈 복원 이력은 [템플릿 셸과 로그인 정정](./decisions/2026-10-26-template-shell-login-correction.md)에 보존한다. 새 계획 때문에 과거 완료 상태나 이력을 다시 열지 않는다.
