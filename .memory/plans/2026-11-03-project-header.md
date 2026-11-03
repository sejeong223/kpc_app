# Plan: 프로젝트 공용 헤더·팝업·설정 패널

- Date: 2026-11-03
- Status: done
- Decisions: [확정 결정](../decisions/2026-11-03-project-header.md)
- 기준 코드: `b443fc079707cf799f1e1362e8c7340d5e950ca7`
- 실행 이력: T01/T02/T03 완료 기록을 보존하고, 2026-11-03 사용자 검토에서 발견한 HTML 불일치를 T04/T05로 보정했다. 총5/5 완료, 남은 Task 없음.

## Goal

AI 분석·파일 업로드·목차·제작 설정·제작·리뷰에서 하나의 프로젝트 헤더를 재사용한다. 프로젝트 선택과 알림 토스트, 재작업·완성 모달, 완성본 팝업, 설정의 네 탭을 UI 범위에서 구현한다. 리뷰와 완료한 제안 메뉴를 추가하되 완료한 제안에는 프로젝트 헤더를 넣지 않는다.

추가 목표: 첨부 HTML의 배치·치수·간격·문구·아이콘·컨트롤 종류를 복원하고 색·글꼴·굵기·모서리·그림자·상태 표현만 기존 dadam 테마로 적용한다. 공용 컴포넌트의 기본 크기를 그대로 쓰는 것을 HTML 재현으로 간주하지 않는다. 후속 사용자 요청으로 확정된 헤더 34px, 프로젝트명 600, 배지 패딩, D-day, 체크 우측 상단, 공용 dadam 폰트는 유지한다.

## Revision Basis — 2026-11-03

- 원본: `C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html`. `openLoopHist`, `confirmDone`, `confirmRedo`, `drawerHtml` 및 관련 CSS를 읽어 비교했다. 스크립트의 저장·다운로드·업무 전환은 새 구현 권한이 아니다.
- 팝업 버튼은 원본 `btn xs`의 높이22/좌우7/아이콘12인데 현재 기본 CommonButton 높이38/좌우12에 아이콘이 없다.
- 설정은 원본 폭560/max96vw/제목14px 16px/본문16px인데 현재 Fluent medium 폭592, 기본 제목24px 24px 8px, 본문 좌우24px에 별도 panel 상단20px가 섞여 있다. 이는 dadam 원본 레이아웃을 따른 결과가 아니다.
- 기본정보 2열→1열, 알림 설명 삭제·수신 버튼→체크박스, 권한 아바타·툴팁 누락, 로그 부가정보를 별도 열로 분리한 차이를 수정한다.
- `DadamInput`은 **KPC가 Fluent Input을 감싼 로컬 래퍼**다. 실제 dadam 앱에 같은 이름의 컴포넌트가 있다는 의미가 아니다. `DadamControls.tsx` root padding12와 Fluent input 기본 padding12가 함께 선언되어 있음을 소스로 확인했으나 브라우저 computed style을 측정하지 않았다. 사용자 정상 다담 입력창 이미지와 혼동하지 않는다.
- 실제 dadam 원본 `dadam_app/dadam_app/app/(authenticated)/meetings/_components/MeetingListMobileView.tsx`는 `@fluentui/react-components`의 Input을 직접 import한다. 이번 계획은 KPC 설정의 입력란만 HTML 기준으로 보정하며 DadamControls 전역 변경을 승인된 것으로 간주하지 않는다.
- 코드 수정 없이 계획만 갱신한다. 기존 미커밋 ProjectHeader.tsx/WorkspaceHeader.tsx 수정은 보존한다.

## Scope and Boundaries

- 기존 `components/common/Button.tsx`, dadam 색·폰트·포커스·비활성 표현을 사용한다. 우측 네 버튼은 34px, 재작업은 34×34px다.
- `mois`/`edu` 예시 프로젝트를 공유 React 상태로 선택한다. 메뉴 이동 시 유지하고 새로고침 시 `mois`로 초기화한다. 변경 토스트는 2200ms 동안 최신 선택 한 건만 표시한다.
- 선택 프로젝트의 PM 여부로 리뷰 메뉴를 표시한다. 비PM의 리뷰 진입은 제작으로 replace한다. 실제 인증·관리자 역할은 변경하지 않는다.
- 모든 최종 업무 실행 버튼은 native disabled다. 설정 입력은 패널이 열려 있는 동안만 유지하며 저장·헤더 반영·실제 권한 변경을 하지 않는다.
- 새 API·DB·IndexedDB·localStorage·sessionStorage·외부 라이브러리·다운로드·업무 처리 루프는 제외한다.
- 기존 핀 생성은 헤더 아래 왼쪽에 유지한다. 코멘트 surface/ref·저장 데이터·좌표는 바꾸지 않는다. 헤더의 프로젝트 선택은 코멘트 저장소를 전환하지 않는다.
- `app/admin-utilities.css`는 팀원 버전을 유지한다. 새 스타일은 컴포넌트 내부 Griffel로 작성한다. README·index·example·별도 CSS/테마 파일을 만들지 않는다.
- **tests 폴더·테스트 파일 생성/복원 금지. 브라우저·E2E·스크린샷·dev server 검증 제외.** 각 Task는 typecheck/lint/build 및 정적 검토로 검증한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 기존 연결 유지 및 HTML 기준 팝업·설정 디자인 보정 | [P01](../phases/2026-11-03-project-header/P01-project-header/phase.md) |

## Task Sequence

| Task | 관찰 가능한 결과 | 주요 파일 |
| :--- | :--- | :--- |
| T01 | 여섯 화면의 공용 헤더, 프로젝트 선택/토스트, 리뷰·완료한 제안 메뉴 | 새 config/Provider/ProjectHeader와 기존 layout·AppShell·sidebar·WorkspacePage·route·CommentsWorkspace |
| T02 | 재작업·완성 중앙 모달과 완성본 팝업을 헤더 버튼에서 열고 닫음 | ProjectHeader.tsx |
| T03 | 설정 오른쪽 패널의 네 탭과 임시 입력, 전체 연결 마무리 | 새 ProjectSettingsDrawer.tsx와 ProjectHeader.tsx |
| T04 (done) | 완성본 작은 버튼·아이콘, 완성/재작업 모달의 원본 배치·내용 복원 | ProjectHeader.tsx, ModalFrame.tsx의 선택적 스타일 슬롯 |
| T05 (done) | 설정 패널 치수·2열 폼·입력 여백·권한/알림/로그 구성 복원 | ProjectSettingsDrawer.tsx, config/project-header.ts의 알림 예시 기본값 |

상태와 사이드바를 T01에서 함께 연결해야 메뉴 이동 후에도 프로젝트와 PM 메뉴 표시가 일치한다. 모달과 설정 패널은 서로 다른 UI 단위이므로 별도 Task로 나누되 모두 같은 Phase에서 구현한다. T01/T02의 중간 커밋은 후속 버튼 연결이 남아 있는 단계임을 기록한다.

보정도 두 Task로 나눈다. T04는 헤더의 팝업/중앙 모달, T05는 별도 파일에 있는 설정 패널 전체를 담당한다. 같은 패널의 여백과 탭 내용을 따로 나누면 중간 단계에 레이아웃이 섞이므로 T05에서 함께 검증한다. 완료된 T01~T03을 되돌려 재실행하거나 새 Phase를 만들지 않는다.

## Production File Structure

새 생산 파일은 총 네 개다. 파일 안의 스타일·작은 보조 UI는 다시 분리하지 않는다.

| 새 파일 | 책임 |
| :--- | :--- |
| `config/project-header.ts` | 읽기 전용 예시 데이터, 타입, 권한/상태 표시 파생 함수 |
| `components/common/ProjectHeaderProvider.tsx` | 선택 프로젝트의 앱 내 수명, 리뷰 경로 보정, 단일 토스트; Toaster도 같은 파일에서 export |
| `components/common/ProjectHeader.tsx` | WorkspaceHeader 조합, 프로젝트 선택, 네 액션, 완성/재작업 모달·완성본 팝업; 빈 본문용 ProjectHeaderPage도 같은 파일에서 export |
| `components/common/ProjectSettingsDrawer.tsx` | 설정 네 탭과 패널 내부 임시 입력 |

기존 수정 파일은 `app/(authenticated)/layout.tsx`, `app/(authenticated)/workspace/[screen]/page.tsx`, `config/sidebar.ts`, `components/layout/AppShell.tsx`, `NavSidebar.tsx`, `WorkspacePage.tsx`, `components/comments/CommentsWorkspace.tsx`다. 기존 Button·WorkspaceHeader·ModalFrame·코멘트 저장소·인증·테마는 재사용하는 읽기 전용 경계다.

위 파일 목록은 T01~T03 이력이다. 보정 T04/T05는 새 생산 파일 없이 기존 파일만 수정한다. ModalFrame에는 호출부별 `slotClassNames` 선택적 속성만 추가하고 기존 기본 모양/포커스/닫기 계약은 보존한다. DadamControls·Button·WorkspaceHeader·팀원 CSS는 보정 중 읽기 전용이며 기존 미커밋 사용자 요청 수정도 되돌리지 않는다.

## Regression Boundaries

1. WorkspacePage는 선택적 headerComponent 슬롯만 추가한다. 기본 화면의 헤더·접근성 제목·모바일 메뉴·sticky 측정은 그대로 유지한다.
2. 헤더/사이드바는 같은 Provider를 쓴다. PM은 예시 프로젝트 역할이며 AppRole/ProfilePreview의 인증 조건을 대체하지 않는다.
3. 오버레이를 열 때 기존 코멘트 controller의 suspendUi만 사용한다. 데이터 삭제·namespace 변경·프로젝트별 migration은 하지 않는다.
4. 새 선택/경로에서는 열린 오버레이와 설정 draft만 초기화한다. 공유 선택 상태를 페이지와 함께 초기화하지 않는다.
5. common/comments는 현재 Tailwind 탐색 대상이 아니다. 새 스타일에 `tw:` 클래스의 우연한 생성 결과를 의존하지 않는다.
6. 최종 실행 버튼은 disabled이며 성공 토스트나 임의 업무 상태 변경을 붙이지 않는다. 헤더의 열기 버튼까지 일괄 비활성화하지 않는다.

## Adjacent Findings

- 코멘트는 사용자별 `production-preview` surface에 저장된다. 헤더 프로젝트를 바꿔도 코멘트는 유지된다. 결정 D13에서 이미 제외한 프로젝트별 저장소 설계를 이번 Task로 추가하지 않는다.
- 실제 업무 프로젝트/권한 모델과 이번 예시 데이터를 합치지 않는다. 관리자 프로젝트 참조·전체 Tailwind 설정 정리·기존 버튼 체계 통합도 범위 밖이다.
- KPC DadamInput 전역 여백 정리는 다른 사용처까지 바꿀 수 있다. 사용자는 실제 다담 입력창에는 문제가 없다고 정정했다. 원본 다담과 KPC 래퍼를 구분하며, 다른 화면의 결함이나 전역 수정 필요성이 입증됐다고 기록하지 않는다. 이번에는 설정 호출부의 로컬 스타일만 보정한다.

## Validation and Execution

- 각 Task 구현 후 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`를 실행한다. 실제 픽셀·브라우저 조작을 검증했다고 보고하지 않는다.
- Task의 Acceptance Criteria를 정적 코드로 확인하고 결과를 기록한다. 기존 실패가 있으면 원인과 본 변경의 관계를 구분하며 검증하지 않은 항목을 통과로 적지 않는다.
- Task별 지정 한국어 커밋을 사용한다. 실행 단계에서만 관련 파일을 명시적으로 stage한다. `.memory/current.md`는 로컬 포인터로 강제 추가/커밋하지 않는다. push·배포는 범위 밖이다.
- [현재 포인터](../current.md)의 Active Task는 없다. T04 → T05 순서로 구현·검증·커밋을 완료했으며 완료 Task와 이전 계획은 재실행하지 않는다.

## Progress

- done: 5/5
- active: 없음

## Revision Execution — 2026-11-03

- T04 e7fc228: 완성본 팝업/모달 보정과 선행 동일 헤더 수정 보존. T05는 Task: T05-html-settings footer의 완료 커밋이다.
- 두 Task 각각 typecheck·변경 파일 ESLint·build·diff 검사를 통과했다. HTML 원문/치수와 JSX/Griffel을 대조했고 브라우저/실제 픽셀 검증은 미실시다.
- 공용 Button·DadamControls·팀원 CSS·실제 dadam 저장소 변경 없음. 새 생산파일/README/index/CSS/test 파일·tests 폴더 없음. 실제 저장/전송/다운로드는 제외한 UI 범위다.
