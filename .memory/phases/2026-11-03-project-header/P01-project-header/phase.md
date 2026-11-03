# Phase: P01 프로젝트 공용 헤더

- Plan: [2026-11-03-project-header](../../../plans/2026-11-03-project-header.md)
- Decisions: [확정 결정](../../../decisions/2026-11-03-project-header.md)
- Status: in_progress
- 실행 순서: T01 → T02 → T03. 단계별 구현·검증·한국어 커밋 후 포인터를 전진한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 예시 모델·공유 선택·공용 헤더·토스트·리뷰/완료한 제안 메뉴 | [T01](./T01-shared-header-and-navigation.md) |
| T02 | `in_progress` | 재작업/완성 모달과 완성본 팝업, 최종 실행 비활성 | [T02](./T02-completion-overlays.md) |
| T03 | `pending` | 설정 네 탭과 임시 입력 수명, 전체 통합 확인 | [T03](./T03-settings-drawer.md) |

## Phase Acceptance

- [ ] 여섯 메뉴에서 같은 헤더와 선택 상태를 사용한다. 완료한 제안은 프로젝트 헤더 없이 기본 탐색만 제공한다.
- [ ] 선택 변경 토스트와 비PM 리뷰 경로 보정이 서로 충돌하지 않는다.
- [ ] 네 액션이 결정된 모달/팝업/패널을 연다. 최종 업무 버튼은 비활성이다.
- [ ] 설정 네 탭의 임시 입력은 탭 이동에 유지되고 닫기/프로젝트·메뉴 변경에 초기화된다.
- [ ] 기존 핀·인증·전역 스타일을 보존한다. tests 생성 및 브라우저 검증을 하지 않는다.

## Progress

- done: 1/3 (active: T02)
- T01 commit: Task T01 완료 커밋
- T02 commit: pending
- T03 commit: pending
