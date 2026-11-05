# Task: T07 제작 화면 높이 제한과 패널 내부 스크롤

## Status: done

## Goal

제작 화면의 세 패널이 헤더 아래 남은 viewport 높이 안에 배치되고, 목록·중앙·출처의 긴 내용이 전체 페이지 높이를 늘리지 않도록 한다. 기존 헤더와 코멘트 기능을 유지한다.

## Decision Summary

- Plan: `2026-11-05-production-editor-panels`, Phase: `P01-production-editor`. T06 완료 후 실행. D13과 T05/T06의 최종 DOM 구성을 기준으로 한다.
- T03의 높이 수동 계산과 최소420px 정책을 폐기하고 제작 경로에서만 상위 셸부터 패널까지 flex 높이를 연결한다. 전역 body overflow를 막는 방식, 코멘트 surface clipping, 새 공용 컴포넌트는 사용하지 않는다.

## Implementation

### I01. 제작 전용 viewport 높이와 헤더/본문 연결

- Related Files:
  - `components/layout/AppShell.tsx` :: `useStyles`, `AppShell` — modify, `/workspace/write` 조건에 한정.
  - `components/comments/CommentsWorkspace.tsx` :: `useStyles.surface`, `intro`, `CommentsWorkspace` — modify, 높이/안내 배치에 한정.
  - `components/workspace/production/ProductionScreen.tsx` :: `ProductionScreen`, `ActiveProductionScreen` — modify.
  - `components/workspace/shared/WorkspaceFlow.tsx` — read-only. 현재 fragment가 ProductionWorkspace를 직접 반환하므로 중간 wrapper 추가 불필요.
  - `components/common/ProjectHeaderProvider.tsx` :: `ProjectHeaderToaster` — read-only. fixed toaster라 정상 문서 높이에 포함되지 않는다.

#### Details

- **Signatures & Types**: 기존 AppShell/CommentsWorkspace/ProductionScreen public props와 runtime/context 계약을 유지한다. 새 hook·서비스·persisted field 없음. `const isProduction = pathname === "/workspace/write"`를 해당 컴포넌트 내부에서 파생한다.
- **Data & Schema Fields**: 화면 높이는 CSS에서만 계산한다. 기존 `CommentPoint { xRatio:number; yRatio:number }`, surface ref, measurement, runtime selection/round는 변경하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `AppShell` root와 mainColumn의 기본 `minHeight:"100svh"`, productionContent의 같은 최소 높이를 함께 확인한다. 일부 자식만 `min-height:0`으로 바꾸면 상위 최소 높이가 그대로 남으므로 같은 Task에서 수정한다.
  2. 제작 경로 전용 root variant를 추가해 `height:100dvh; min-height:0`으로 제한한다. mainColumn 제작 variant는 `height:100%; min-height:0`과 기존 flex-column을 사용한다. productionContent는 `flex:1 1 0%; min-height:0; min-width:0; display:flex; flex-direction:column; padding:0`으로 한다. 다른 메뉴에는 기존 root/main/content 스타일이 그대로 적용되어 자연스러운 페이지 스크롤을 유지한다. `document.body.style.overflow`를 제작 화면용으로 추가하지 않는다.
  3. CommentsWorkspace surface는 `flex:1 1 0%; min-height:0; min-width:0; display:flex; flex-direction:column; position:relative; overflow:visible`로 바꾼다. 예전 자체 `minHeight:100svh`를 제거한다. 코멘트 surface 전체가 동일 좌표 기준으로 남아야 한다.
  4. intro의 ProjectHeader·코멘트 도구·로딩·회차 충돌 안내는 그대로 유지한다. intro는 `flex-shrink:0; min-height:0; max-height:50%; overflow-y:auto; overscroll-behavior:contain`으로 긴 안내가 전체 viewport를 밀어내지 못하게 한다. 일반 높이에서는 원래 크기로 보이며 상한은 작은 높이/긴 안내에만 작동한다. 기존 `state.error && !state.view` 안내도 intro 안으로 이동해 같은 상한을 적용한다. 헤더 버튼이나 코멘트 동작을 재구성하지 않는다.
  5. ProductionScreen root는 `flex:1 1 0%; min-height:0; min-width:0; display:flex; flex-direction:column; box-sizing:border-box`로 한다. 현재 좌우/bottom page-inset은 이 내부 박스에 포함한다. ActiveProductionScreen의 반환 fragment를 같은 flex/min-height 계약의 wrapper로 바꾸고 WorkspaceFlow가 차지할 공간을 남긴다.
  6. 선택 notice/actionError/query error는 내용이 있는 경우에만 전용 영역으로 묶고 `flex-shrink:0; min-height:0; max-height:30%; overflow-y:auto`로 제한한다. 로딩/empty/error/forbidden처럼 본문이 없는 분기도 동일 남은 높이 안에서 `overflow:auto`로 표시한다. 정보·재시도 버튼을 잘라서 숨기지 않는다.
  7. Error & Exception Handling: 높이 때문에 reconnect/선택 복구가 unmount되거나 key가 바뀌지 않아야 한다. 기존 query last-good, accessDenied, readOnlyError, runtime.navigate 초안 guard는 유지한다.
  8. State Transition & Return: 창 높이/헤더 메시지 변화는 CSS flex가 다시 계산한다. 앱 상태·문서 원본·헤더 기능에 변화가 없다.

### I02. 세 패널 높이와 안내/되돌리기 내부 배치

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ProductionWorkspace`, `center` — modify.
  - `components/workspace/production/ProductionPanels.tsx` :: `ProductionPanels`, 높이 effect — modify.
  - `components/workspace/production/SlideNavigator.tsx`, `SourcePanel.tsx` — read-only, T05의 고정 헤더/본문 스크롤 구조 확인.
  - `components/workspace/shared/WorkspaceUndoNotice.tsx` — read-only, 기존 undo 계약 재사용.
  - `components/comments/CommentPin.tsx`, `CommentPopover.tsx`, `CommentPreview.tsx`, `lib/comments/geometry.ts` — read-only.

#### Details

- **Signatures & Types**: T05의 `ProductionPanelsProps` render slot 계약과 T06 ActiveSlide 슬롯을 유지한다. 삭제 대상은 `height` state와 측정 전용 root ref/effect/import이며 separator의 포인터 ref 및 focus ref는 유지한다.
- **Data & Schema Fields**: `ProductionPanelState`, `EditingSession`, undo의 actorId/afterRevision/expiresAt와 비활성 조건을 그대로 사용한다. 코멘트 저장 좌표·revision을 레이아웃 수정으로 갱신하지 않는다.
- **Execution Flow / Logic**:
  1. 현재 `ProductionPanels`의 `height=620`, `Math.max(420, ...)`, window/visualViewport listener와 header ResizeObserver 전체를 제거한다. 새 JS 높이 보정·숫자 빼기를 만들지 않는다. CSS 너비 변수는 유지한다.
  2. ProductionWorkspace root와 ProductionPanels container는 `flex:1 1 0%; min-height:0; min-width:0; display:flex; flex-direction:column`을 갖는다. 모바일 제어 행은 `flex-shrink:0`, 패널 row는 `flex:1 1 0%; min-height:0; min-width:0; position:relative`를 갖는다.
  3. T05의 좌우 aside는 min-height0/min-width0이며 제목을 제외한 본문만 overflow-y:auto다. 중앙 section은 min-height0/min-width0/flex1/overflow-y:auto/overscroll-contain을 유지한다. 긴 문서 입력은 T06의 최대180px 안에서 스크롤하고, 긴 미리보기/여러 슬라이드/AI 내용은 중앙 panel 안에서 스크롤한다. 중앙의 추가 고정 최소 높이를 만들지 않는다.
  4. ProductionWorkspace의 error/notice를 패널 바깥 위에서 중앙 내용 맨 앞으로 옮긴다. 패널 밖에 있던 undo fieldset은 중앙 내용 끝으로 옮긴다. fieldset의 기존 `disabled={busy || !!session?.dirty || readOnly}`와 data-comment-control은 유지한다. `WorkspaceUndoNotice`가 null일 때 빈 wrapper의 바깥 여백이 화면 높이를 늘리지 않도록 fieldset은 margin0, 자식이 있을 때만 내부 간격을 준다. undo 만료/actor/revision 조건을 상위에서 중복 구현하지 않는다.
  5. 패널의 border/padding은 box-sizing:border-box와 현재 토큰을 사용한다. 40px rail, separator, gap과 min-width0이 가로 넘침을 만들지 않는지 검토한다. 761~1179px 출처 overlay는 패널 row의 높이를 따른다.
  6. ModalFrame, FilePreviewDialog, ProposalReview, 코멘트 pins/preview/popover는 스크롤 내용 밖의 기존 위치/portal 연결을 유지한다. CommentsWorkspace의 surface에서 ProductionScreen 다음에 있는 핀을 panel overflow 안으로 이동하지 않는다. surface/상위 셸에 transform·contain:paint·overflow:hidden/clip을 추가하지 않는다.
  7. 기존 코멘트 측정은 surface ResizeObserver와 document capture scroll/window resize를 사용하므로 새 panel scroll도 감지한다. 이 listener/ratio 계산/keepPinInsideSurface/팝업 위치 코드를 삭제하거나 새 slide 좌표계로 바꾸지 않는다. 저장된 핀을 픽셀값으로 재저장하지 않는다.
  8. Error & Exception Handling: 긴 오류, 회차 충돌 초안, undo, 다중 미리보기는 자기 scroll 영역에서 접근 가능해야 한다. 내용을 가려 scrollbar만 없애는 구현을 완료로 처리하지 않는다.
  9. State Transition & Return: window/header 변경, 패널 접기, undo 나타남/만료, notice 상태 변화가 모두 동일 flex 경계 안에 머문다. 초안·선택·패널 설정은 유지한다.

## Acceptance Criteria

- [x] 제작 경로만 root→main→surface→screen→workspace→panels의 높이 제한/min-height0 연결이 완성되어 있다.
- [x] 최소420px과 viewport 높이 측정 effect가 제거되고 오류/undo/여백을 패널 밖에 누적하지 않는다.
- [x] 목록·출처 헤더는 스크롤 밖, 세 영역의 긴 본문은 각각 내부 스크롤로 접근 가능하다.
- [x] 작은 높이·긴 헤더 안내·오류/undo 표시·좁은 폭에도 내용을 단순 clipping하는 처리가 없다.
- [x] 기존 헤더 기능·코멘트 좌표/이벤트·dirty 입력 보호·선택/출처 기능은 보존된다.
- [x] 다른 메뉴의 스크롤 정책, 영속 데이터, shared/공용 컴포넌트, DB/서비스는 변경하지 않는다.

## Validation

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- 정적 레이아웃 검토표를 작성한다: 각 부모/자식의 height/flex/min-height/overflow, 일반/작은 높이, 760/761/1179/1180px 경계, 좌우 open/closed, 긴 오류/회차 안내/undo 유무, 중앙 긴 미리보기. overflow 소유자가 명확하고 제작 밖 경로에 조건이 퍼지지 않았는지 확인한다.
- 검토할 기능 경계: DOM key/dirty guard/readonly 조건 유지, 코멘트 surface는 overflow visible, 핀/팝업은 panel 외부, 실제 버튼·separator만 data-comment-control. `git diff -- components/comments components/layout components/workspace/production`으로 변경 범위를 점검한다.
- 필요 시 stdin jsdom으로 컴포넌트 연결·상태 전환을 검증할 수 있으나 jsdom scrollHeight/offsetHeight를 실제 CSS 레이아웃 검증에 사용하지 않는다. 기존 코드의 높이 수치를 그대로 assert하는 테스트는 금지한다.
- 브라우저/CUA/E2E/스크린샷/dev server/실제 IME·포인터 검증 및 `tests/` 생성·복원 금지. 따라서 실제 화면의 scrollbar/핀 위치/반응형 실측은 미실시로 기록한다. 타입/lint/build 통과를 HTML의 시각적 일치 증거로 과장하지 않는다.

## Commit Message

```text
fix(write): 제작 화면 높이를 제한하고 패널 내부 스크롤 적용

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T07-viewport-scroll

- 제작 전용 셸과 본문의 남은 높이를 flex로 연결
- 오류와 되돌리기를 중앙 패널 안에 배치하고 코멘트 경계 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서를 포함한 Task: T07-viewport-scroll 커밋

최종 검증 후 관련 파일과 Task/phase/plan 기록을 한국어 커밋한다. phase7/7, plan done, 로컬 ignored current의 Active Task 없음으로 갱신한다. 기존 완료 보고서에 `T05~T07 UI 수정` 절을 추가해 변경·검증·실측 한계를 구분한다. 이전147개 검증을 새 수정의 실행 결과로 계산하지 않는다. force stage·push/배포·DB 초기화 금지.

## Execution Record

- AppShell의 제작 전용 root/column/content variant에 viewport 높이와 min-height0 연결. 다른 경로의 스타일은 유지.
- CommentsWorkspace는 flex column/min-height0, intro는 최대50%와 내부 스크롤. 오류를 intro에 포함하며 기존 핀/팝업/좌표계는 그대로 유지.
- ProductionScreen의 정상/알림/로딩/empty/error 분기도 남은 높이 안에 배치. ProductionWorkspace의 오류/undo는 중앙 스크롤 안으로 이동. 빈 fieldset 여백 제거, 기존 undo guard 유지.
- ProductionPanels의 최소420px·height620·viewport/header 측정 effect 제거. 너비·접기 상태와 separator는 유지.
- 전체 typecheck/lint/build·diff 검사 통과. 실제 AppShell/ProductionScreen 및 context/query/UI 대역을 사용하는 stdin React/jsdom10개 검증 통과: 제작 경로 전용 스타일, notice/error/denied 시 Flow DOM 보존, 읽기 전용/접근 거부 전달, 다른 메뉴에서 제작 variant 해제, body lock 추가 없음.

| 높이 연결 지점 | 높이/축소 계약 | 넘치는 내용의 처리 |
| --- | --- | --- |
| AppShell production root | 100dvh, min-height0 | 전역 clipping 없음 |
| mainColumn → main | 100% → flex1, min-height0 | 제작 경로에만 적용 |
| CommentsWorkspace surface | flex1/min-height0/overflow visible | 핀·팝업은 패널 밖 기존 좌표 유지 |
| intro | 내용 높이, 최대50%, shrink0 | 긴 회차/오류 안내 자체 스크롤 |
| ProductionScreen → ActiveScreen | flex1/min-height0, 여백은 border-box 내부 | 안내 최대30% 자체 스크롤, 빈/오류 상태 별도 스크롤 |
| Workspace → Panels → row | flex1/min-height0/min-width0 | 부모 남은 높이를 그대로 사용 |
| 좌우 panel | 제목 shrink0, 본문 flex1/min-height0 | 본문만 스크롤, 접힌 상태 rail |
| 중앙 panel | flex1/min-height0/overflow-y:auto | 직접 편집·AI·미리보기·오류·undo 내부 스크롤 |
| 문서 입력 | 최소48/최대180px | 문서 자체 내부 스크롤 |

- 정적 경계 검토: 760px까지 한 패널, 761~1179px 출처 overlay, 1180px부터3열; 닫힌 좌우는40px rail. 최대 열 너비320+420px과 separator/gap을 제외한 중앙은 min-width0으로 축소 가능. 브라우저 폭과 container 폭은 구분한다.
- 일반 높이에서는 intro가 내용 크기만 사용하고, 작은 높이/긴 안내에는 max-height와 내부 스크롤이 적용된다. 오류/undo는 panel 밖 추가 높이를 만들지 않는다. 목록/다중 슬라이드/출처 원문이 길어져도 해당 panel이 스크롤을 소유한다.
- 정적 기능 검토: ProjectHeader/route/runtime/서비스/schema 변경 없음. 코멘트 capture scroll/ResizeObserver·ratio 계산/핀 동작 유지. ModalFrame/원문/AI 비교와 코멘트 팝업은 기존 portal 또는 panel 밖 위치 유지. 편집기 key와 쓰기/undo 비활성 조건 유지.
- 학습: `flex: "1 1 0%", minHeight: 0`은 남은 높이를 배분하고 자식이 내용보다 작아질 수 있게 한다. 자식에 overflow만 추가하면 상위 min-height가 전체 페이지를 계속 늘릴 수 있다.
- 제한: 실제 scrollbar/반응형/핀 위치/IME·포인터 실측은 사용자 지속 정책에 따라 미실시. jsdom 수치를 실제 레이아웃 측정으로 사용하지 않았다.
- 요청 밖 발견: 기존 baseline-browser-mapping 데이터 경고가 build에서 반복됨. 빌드는 성공했고 이번 범위에서 패키지를 갱신하지 않음. 별도 의존성 유지보수 시 검토 권장. 그 외 특이사항 없음.