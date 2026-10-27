# Phase: P01 Fluent UI 사이드바와 메뉴 이동

## Goal

제공된 HTML의 최종 사이드바만 재현하고 메뉴별 안내 화면으로 이동시킨다. 개발에서는 전체 미리보기, 인증 활성 환경에서는 서버 인가를 유지한다. 프로필 모달·실제 업무 기능은 제외한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` ✅ | Fluent UI 의존성·테마·서버 렌더링 설정 | [T01](./T01-fluent-foundation.md) |
| T02 | `in_progress` 🔵 | 최종 15개 메뉴 카탈로그·안내 라우트·권한 테스트 | [T02](./T02-menu-routes.md) |
| T03 | `pending` | 사이드바 UI·셸·헤더 통합과 최종 검증 | [T03](./T03-sidebar-ui.md) |

## Dependencies

`T01 → T02 → T03` 순서로 실행한다. 세 Task는 같은 사이드바 기능의 준비·라우팅·표현 단위이므로 Phase를 추가로 나누지 않는다. 각 Task는 빌드 가능한 변경을 만들고 단독 검증·커밋 후 다음으로 전진한다.

## Progress

- done: 1/3 (active: T02)
- T01 구현·검증 완료, T02 실행 준비
