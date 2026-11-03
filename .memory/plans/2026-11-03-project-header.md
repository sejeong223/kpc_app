# Plan: 프로젝트 공용 헤더·팝업·설정 패널

- Date: 2026-11-03
- Status: done
- Decisions: [확정 결정](../decisions/2026-11-03-project-header.md)
- 기준 코드: `b443fc079707cf799f1e1362e8c7340d5e950ca7`
- 실행 완료: T01/T02/T03 구현·검증 완료. Task별 실행 기록과 로컬 current의 커밋 이력을 참고한다.

## Goal

AI 분석·파일 업로드·목차·제작 설정·제작·리뷰에서 하나의 프로젝트 헤더를 재사용한다. 프로젝트 선택과 알림 토스트, 재작업·완성 모달, 완성본 팝업, 설정의 네 탭을 UI 범위에서 구현한다. 리뷰와 완료한 제안 메뉴를 추가하되 완료한 제안에는 프로젝트 헤더를 넣지 않는다.

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
| P01 | `done` | 공용 상태·헤더·메뉴 연결 후 모달/팝업·설정 패널 완성 | [P01](../phases/2026-11-03-project-header/P01-project-header/phase.md) |

## Task Sequence

| Task | 관찰 가능한 결과 | 주요 파일 |
| :--- | :--- | :--- |
| T01 | 여섯 화면의 공용 헤더, 프로젝트 선택/토스트, 리뷰·완료한 제안 메뉴 | 새 config/Provider/ProjectHeader와 기존 layout·AppShell·sidebar·WorkspacePage·route·CommentsWorkspace |
| T02 | 재작업·완성 중앙 모달과 완성본 팝업을 헤더 버튼에서 열고 닫음 | ProjectHeader.tsx |
| T03 | 설정 오른쪽 패널의 네 탭과 임시 입력, 전체 연결 마무리 | 새 ProjectSettingsDrawer.tsx와 ProjectHeader.tsx |

상태와 사이드바를 T01에서 함께 연결해야 메뉴 이동 후에도 프로젝트와 PM 메뉴 표시가 일치한다. 모달과 설정 패널은 서로 다른 UI 단위이므로 별도 Task로 나누되 모두 같은 Phase에서 구현한다. T01/T02의 중간 커밋은 후속 버튼 연결이 남아 있는 단계임을 기록한다.

## Production File Structure

새 생산 파일은 총 네 개다. 파일 안의 스타일·작은 보조 UI는 다시 분리하지 않는다.

| 새 파일 | 책임 |
| :--- | :--- |
| `config/project-header.ts` | 읽기 전용 예시 데이터, 타입, 권한/상태 표시 파생 함수 |
| `components/common/ProjectHeaderProvider.tsx` | 선택 프로젝트의 앱 내 수명, 리뷰 경로 보정, 단일 토스트; Toaster도 같은 파일에서 export |
| `components/common/ProjectHeader.tsx` | WorkspaceHeader 조합, 프로젝트 선택, 네 액션, 완성/재작업 모달·완성본 팝업; 빈 본문용 ProjectHeaderPage도 같은 파일에서 export |
| `components/common/ProjectSettingsDrawer.tsx` | 설정 네 탭과 패널 내부 임시 입력 |

기존 수정 파일은 `app/(authenticated)/layout.tsx`, `app/(authenticated)/workspace/[screen]/page.tsx`, `config/sidebar.ts`, `components/layout/AppShell.tsx`, `NavSidebar.tsx`, `WorkspacePage.tsx`, `components/comments/CommentsWorkspace.tsx`다. 기존 Button·WorkspaceHeader·ModalFrame·코멘트 저장소·인증·테마는 재사용하는 읽기 전용 경계다.

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

## Validation and Execution

- 각 Task 구현 후 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`를 실행한다. 실제 픽셀·브라우저 조작을 검증했다고 보고하지 않는다.
- Task의 Acceptance Criteria를 정적 코드로 확인하고 결과를 기록한다. 기존 실패가 있으면 원인과 본 변경의 관계를 구분하며 검증하지 않은 항목을 통과로 적지 않는다.
- Task별 지정 한국어 커밋을 사용한다. 실행 단계에서만 관련 파일을 명시적으로 stage한다. `.memory/current.md`는 로컬 포인터로 강제 추가/커밋하지 않는다. push·배포는 범위 밖이다.
- [현재 포인터](../current.md)는 P01/T01부터 시작한다. 완료한 이전 계획은 재실행하지 않는다.

## Progress

- done: 3/3
- active: 없음 — 모든 Task 완료
