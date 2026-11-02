# Phase: P01 디자인·알림 보완

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `pending` | 앱 공통 알림(AppToaster·useAppToast) + 레이아웃 1줄 연결 | [T01](./T01-app-toast.md) |
| T02 | `pending` | 드롭존·파일 목록·검토자 선택 부품을 레퍼런스 모양으로 | [T02](./T02-parts-design.md) |
| T03 | `pending` | 등록 화면 폼 디자인 + 알림 4종 연결 + 화면 문구 정리 | [T03](./T03-page-design-notify.md) |

## Progress
- done: 0/3 (active: T01)

## Phase Rules
- 브라우저 검증 제외([정책](../../../decisions/2026-10-30-task-validation-policy.md)), `tests/` 폴더·테스트 파일 작성 제외. 검증은 `npm.cmd run typecheck`·`npm.cmd run lint`·`npm.cmd run build` + Task별 동작 검토 포인트(코드 확인).
- 색: 강조색은 `--kpc-brand`(파랑)·`--kpc-brand-soft`·`--kpc-brand-ink`. 레퍼런스 빨강(`#d7192f`·`#c91c2b`·`#fff0f2`·`#fff8f9`·`#f3c7cd`) 사용 금지. AI 의미 색(노랑 `#fffdf3`/`#ecd98f`, 보라 `#6b3fc4`/`#f4effe`)과 어두운 버튼·알림(`#303238`/`#1d1e22`)은 결정 D01·D02 값 그대로.
- 스타일 방식: **Fluent 컴포넌트(Button·Input·Textarea·Select·Badge·Toast 등)의 모양을 바꿀 때는 `makeStyles`(Griffel)로 만든 className을 넘긴다.** Fluent 스타일이 런타임에 나중 주입되어 같은 우선순위의 Tailwind(`tw:`) 클래스를 이길 수 있기 때문이다. 일반 HTML 요소(div·ul·span 등)는 기존처럼 `tw:` 유틸리티를 쓴다. 레퍼런스 CSS 클래스명(`.drop`·`.btn` 등)을 전역 CSS로 복사하지 않는다.
- 공통 영역 수정은 T01의 `app/(authenticated)/layout.tsx` 1줄(+import)과 `app/admin-utilities.css`의 `@source` 1줄로 제한한다. 다른 화면 코드는 건드리지 않는다.
- 원격 반영(rebase 후): `WorkspacePage`의 `dataNotice` prop은 삭제되었고 등록 화면은 `showTitle`을 쓴다. 헤더 안내 문구를 되살리지 않는다.
- Windows 셸에서는 `npm.cmd`.
