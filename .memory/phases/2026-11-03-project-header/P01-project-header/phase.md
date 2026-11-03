# Phase: P01 프로젝트 공용 헤더

- Plan: [2026-11-03-project-header](../../../plans/2026-11-03-project-header.md)
- Decisions: [확정 결정](../../../decisions/2026-11-03-project-header.md)
- Status: done
- 실행 순서: T01 → T02 → T03 완료 이력 보존. 후속 T04 → T05도 구현·검증·한국어 커밋을 완료했다. 남은 Task 없음.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 예시 모델·공유 선택·공용 헤더·토스트·리뷰/완료한 제안 메뉴 | [T01](./T01-shared-header-and-navigation.md) |
| T02 | `done` | 재작업/완성 모달과 완성본 팝업, 최종 실행 비활성 | [T02](./T02-completion-overlays.md) |
| T03 | `done` | 설정 네 탭과 임시 입력 수명, 전체 통합 확인 | [T03](./T03-settings-drawer.md) |
| T04 | `done` | HTML 기준 완성본 팝업·완성/재작업 모달 보정 | [T04](./T04-html-overlays.md) |
| T05 | `done` | HTML 기준 설정 패널 네 탭·여백·설명 복원 | [T05](./T05-html-settings.md) |

## Phase Acceptance

- [x] 여섯 메뉴에서 같은 헤더와 선택 상태를 사용한다. 완료한 제안은 프로젝트 헤더 없이 기본 탐색만 제공한다.
- [x] 선택 변경 토스트와 비PM 리뷰 경로 보정이 서로 충돌하지 않는다.
- [x] 네 액션이 결정된 모달/팝업/패널을 연다. 최종 업무 버튼은 비활성이다.
- [x] 설정 네 탭의 임시 입력은 탭 이동에 유지되고 닫기/프로젝트·메뉴 변경에 초기화된다.
- [x] 기존 핀·인증·전역 스타일을 보존한다. tests 생성 및 브라우저 검증을 하지 않는다.
- [x] HTML의 완성본 버튼22px·아이콘과 모달 구조/치수/문구를 복원한다.
- [x] 설정 폭560/max96vw·본문16px·2열 폼·입력란 단일10px 여백을 지정한다.
- [x] 네 알림 설명·수신 방식 버튼·권한 아바타/툴팁·로그4열을 원본과 대조한다.
- [x] 원본에 없는 문구/필드/컨트롤 추가와 누락이 없는지 T04/T05 대조표를 항목별 확인한다. 실제 픽셀 검증은 미실시로 기록한다.

## Progress

- done: 5/5 (active: 없음)
- T01 commit: d1826e7
- T02 commit: 48c4cf5
- T03 commit: 이 phase를 완료 처리한 커밋 (Task: T03-settings-drawer footer)
- T04 commit: e7fc228
- T05 commit: 이 Task 완료 커밋 (Task: T05-html-settings footer)
