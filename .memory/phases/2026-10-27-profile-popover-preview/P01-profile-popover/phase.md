# Phase: P01 사용자 프로필 팝오버와 역할 미리보기

## Goal

공용 컨트롤과 로컬 미리보기 상태를 기반으로 HTML의 프로필 팝오버 3개 탭을 구현한다. 실인증·Azure·DB는 연결하지 않는다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` ✅ | 공용 세그먼트 선택·ON/OFF 스위치 | [T01](./T01-shared-toggle-controls.md) |
| T02 | `done` ✅ | 프로필 시연 상태·역할별 메뉴·안내 화면 경계 | [T02](./T02-profile-preview-state.md) |
| T03 | `done` ✅ | HTML 기준 3탭 팝오버·트리거·모바일·검증 | [T03](./T03-profile-popover-ui.md) |

## Progress

- done: 3/3 (active: 없음)
- T01~T03 구현·자동 검사·독립 테스트 브라우저의 desktop/접힘/모바일 검증 완료. 실제 Azure/인증 연동은 제외.

## Dependencies

T01 → T02 → T03 순서로 실행한다. 각 Task의 코드와 memory 진행 기록만 한국어 커밋 하나로 저장한다. 기존 구분선 미커밋 변경은 보존하고 Task 변경과 분리한다.
