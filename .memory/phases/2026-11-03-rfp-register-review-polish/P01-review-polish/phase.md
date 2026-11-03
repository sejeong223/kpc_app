# Phase: P01 RFP 등록 화면 리뷰 보완

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 공통 `WorkspaceCard`에 `titleMeta` 추가, "* 필수 n/5"를 제목 옆으로 | [T01](./T01-card-title-meta.md) |
| T02 | `in_progress 🔵` | 공통 알림을 "항상 하나·바꿔치기·2.2초 재시작"으로 | [T02](./T02-single-toast.md) |
| T03 | `pending` | 공통 `PersonAvatar`·`PersonCheckList` + 후보 데이터 `role`·`photoUrl`·정렬 함수 | [T03](./T03-person-parts.md) |
| T04 | `pending` | `ReviewerPicker`에 공통 부품·정렬·레퍼런스 열림 방향 연결 | [T04](./T04-reviewer-picker.md) |

## Progress
- done: 1/4 (active: T02)

## Phase Rules
- 브라우저 검증 제외([정책](../../../decisions/2026-10-30-task-validation-policy.md)), `tests/` 폴더·테스트 파일 작성 제외. 검증은 `npm.cmd run typecheck`·`npm.cmd run lint`·`npm.cmd run build` + Task별 동작 검토 포인트. 순수 함수 확인이 필요하면 **세션 scratchpad**에 `.mts` 스크립트를 만들어 `npx.cmd tsx --tsconfig tsconfig.json <파일>`로 실행한다(import는 `file:///C:/Users/박수호/kpc_app/...` 절대 URL).
- 버튼·입력 부품은 원격 공통 부품(`components/common/Button`, `components/ui/DadamControls`)을 쓴다(2026-11-03 사용자 결정 유지).
- 스타일 방식: Fluent 컴포넌트 모양은 `makeStyles` className, 일반 HTML 요소는 `tw:`. `components/ui`·`components/rfp`·`components/layout`은 이미 Tailwind `@source`에 포함되어 있다(새 폴더를 만들지 않는다).
- 공통 부품(`WorkspaceCard`·`AppToast`·`components/ui/Person*`)은 **추가형 변경**만 한다. 새 prop을 쓰지 않는 기존 화면의 DOM·스타일이 바뀌면 안 된다.
- 색: 강조색은 `--kpc-brand` 계열, 레퍼런스 빨강 금지. 역할 배지는 레퍼런스 `.b-plain` 회색(`#f4f5f7`/`#e8e9ec`/`#55585f`).
- Windows 셸에서는 `npm.cmd`. Git Bash에서 CSS 이스케이프 검색은 `grep -oF` 고정 문자열로.
