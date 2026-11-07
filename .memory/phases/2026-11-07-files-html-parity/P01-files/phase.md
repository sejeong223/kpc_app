# Phase: P01 파일 업로드 화면·팝업 일치

- Plan: [2026-11-07-files-html-parity](../../../plans/2026-11-07-files-html-parity.md)
- Status: in_progress
- Dependencies: 기존 파일 저장/조회·Dadam 공용 UI 재사용. 새 백엔드나 선행 외부 작업 없음.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 회차별 표시·완성본 예외·성공 안내 정리 | [T01](./T01-round-display-feedback.md) |
| T02 | `done` | 사용량·목록·카드·되돌리기 HTML 스타일 | [T02](./T02-list-html-style.md) |
| T03 | `done` | 파일 추가·설정·웹 링크 입력 팝업 | [T03](./T03-reference-dialogs.md) |
| T04 | `in_progress` | 실제 미리보기·삭제·미저장 확인과 통합 검증 | [T04](./T04-preview-confirmation.md) |

## Progress

- done: 3/4 (active: T04)
- T01 → T02 → T03 → T04 순차 실행. 구현·검증·한글 커밋·진행률/포인터 갱신을 Task마다 수행한다.

## Gates

- 기존 참조/원본/보관 데이터와 실제 권한 유지.
- `DadamControls.tsx`, 전역 Provider/테마, 공통 버튼 리팩토링 제외.
- tests/ 및 임시 검증 파일, 브라우저·CUA·E2E·dev server·스크린샷 검증 없음.
- 시각 동일성 확인을 주장하지 않고 타입/lint/정적·stdin 검증 결과를 분리하여 보고한다.
