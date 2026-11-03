# Phase: P01 RFP 등록 화면

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | RFP 상수·zod 스키마·폼 상태 순수 로직 | [T01](./T01-rfp-domain-form.md) |
| T02 | `done ✅` | 사용자 식별 + IndexedDB 저장소 | [T02](./T02-rfp-repository.md) |
| T03 | `done ✅` | 업로드 드롭존·파일 목록·검토자 선택 컴포넌트 | [T03](./T03-upload-reviewer-components.md) |
| T04 | `done ✅` | 등록 화면 조립·라우트 연결·전체 검증 | [T04](./T04-register-page-route.md) |

## Progress
- done: 4/4 (Phase 완료)

## Phase Rules
- 브라우저 검증 제외 ([정책](../../../decisions/2026-10-30-task-validation-policy.md)). 자동 검증만 사용.
- `tests/` 폴더와 테스트 파일을 만들지 않는다(사용자 지시, 결정 D09). 각 Task의 '동작 검토 포인트'는 구현 후 코드로 직접 확인한다.
- 검증 명령은 `npm.cmd run typecheck`·`npm.cmd run lint`·`npm.cmd run build`. 테스트 파일이 없으므로 `npm.cmd test`는 실행하지 않는다.
- 스타일: Fluent UI v9 컴포넌트 + `tw:` 접두 Tailwind 유틸리티 + `--kpc-*`·`--layout-*` 변수. 레퍼런스 HTML의 색(`#d7192f` 등)·CSS 클래스를 복사하지 않는다.
- Windows 셸에서는 `npm.cmd`로 실행한다.
