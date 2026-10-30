# 제작 핀 코멘트 검증 기록

2026-10-29, 로컬 Node 24.19.0 / Windows. 기능 구현 완료, 실제 브라우저 검증 대기.

## 자동 검증

| 검증 | 결과 |
| --- | --- |
| npm.cmd test | 33개 파일, 404개 테스트 통과 |
| npm.cmd run typecheck | 통과 |
| npm.cmd run lint | 통과 |
| npm.cmd run build | Next 16 프로덕션 빌드 통과 |
| git diff --check | 통과 |
| 마지막 테스트 도우미 effect 정리 후 | 영향받는 셸 DOM 테스트3개와 전체 lint 재통과 |

- 도메인/멘션, IndexedDB 트랜잭션과 초기화/재개방/실패 롤백, controller 초안 수명/동시 저장/충돌을 단위 테스트로 검증했다.
- UI 통합16개는 실제 React 컴포넌트·controller·IndexedDbCommentRepository를 실행하며 DOM은 jsdom, DB 엔진은 격리 fake-indexeddb다. 실제 사용자 저장소를 지우거나 변경하지 않았다.
- UI 통합은 생성, 멘션 선택, IME 이벤트 Enter 미등록, Shift+Enter, 답글/수정/삭제, 완료/재개, 실패 입력 보존, revision 충돌, hover, 키보드 resize, 드래그 최종 저장/취소를 포함한다.
- geometry와 UI 크기 테스트로 1440×900/1024×500/390×844/320×568의 가용 영역 및 최대 크기 계산을 확인했다. 이는 실제 화면의 시각적 검증이 아니다.
- 셸 DOM 테스트3개는 공용 헤더 제거, 독립 모바일 메뉴 열기/Escape/스크롤·inert 복원, 기존 토큰 사용량 및 신청 모달 닫기 시 독립 메뉴 버튼의 포커스 복귀를 확인한다.

## 실제 브라우저 검증 — 미완료

Computer Use는 Windows Chrome의 현재 URL을 충분히 확인하지 못해 화면 읽기를 안전 차단하고 UI 자동화를 종료했다. 실제 브라우저 화면을 확인한 기록이나 스크린샷은 없다. UI 도구를 다른 자동화 경로로 우회하지 않았다.

남은 확인:

1. 계획의 네 가지 viewport에서 핀 모양·팝업 간격·본문/입력 스크롤·멘션 목록 잘림·완료 라벨을 육안 확인.
2. 실제 마우스/터치 drag와 resize, native 한글 IME, 키보드 Tab 순환 및 포커스 확인. jsdom은 브라우저 배치와 Fluent Tabster의 native 포커스 이동을 완전히 재현하지 않는다.
3. 실제 브라우저에서 새로고침/창 재진입 후 내용·좌표·완료 상태·수정/삭제 복원 및 최초 seed 중복 없음 확인.
4. 실제 브라우저의 콘솔/hydration 오류, 모바일 사이드바·프로필·토큰 모달의 겹침과 포커스 확인.

## 핵심 구현과 이어서 작업할 때 알아야 할 점

- `CommentsWorkspace.tsx`: 제작 본문 전체를 핀 surface로 사용하고 UI 이벤트를 controller에 전달한다. 저장 좌표는 `{ xRatio, yRatio }`라서 사이드바 폭이나 창 크기가 바뀌어도 같은 상대 위치를 유지한다.
- `CommentPopover.tsx`: `rect.width >= 420`일 때 완료 라벨을 표시한다. `getPopupLimits`가 데스크톱 50vw/80vh 및 좁은 화면 예외를 적용한다. 비모달 팝업을 body portal로 옮기면 sidebar의 inert 경계를 벗어날 수 있다.
- `CommentComposer.tsx`: `nativeEvent.isComposing`/229 및 composition 상태를 먼저 검사한다. 멘션 선택/닫기 직후의 selection 이벤트가 목록을 다시 열지 않게 보호한다. `onChange`는 초안만 바꾸고 전송할 때만 DB에 쓴다.
- `controller.ts`: 저장 시 제출 초안 revision을 캡처하여 늦은 결과가 새 입력을 지우지 않게 한다. DB 성공 이후만 snapshot을 갱신한다. 수정 충돌은 자동 덮어쓰지 않고 최신 내용 확인 후 명시적으로 rebase한다.
- `CommentsProvider.tsx`: 레이아웃 수명으로 초안을 유지하며 계정 ID가 바뀌면 controller를 분리한다. 페이지 안에 Provider를 중복 마운트하지 않는다.
- 테스트를 위해 jsdom27.4.0을 devDependency로 추가했다. 실제 앱 런타임에는 UI/drag 라이브러리를 추가하지 않았다.

## 범위 밖 발견/유지 사항

- npm 설치 audit은 기존 T02 기록과 동일하게 취약점25건(낮음1/보통7/높음14/심각3)을 보고했다. 일괄 의존성 업데이트는 수행하지 않았다.
- 기존 Vite config native loader 예고와 baseline-browser-mapping 갱신 경고가 있다. 기능 검증은 통과했으며 별도 의존성 정리 항목이다.
- 프로필 댓글 수·알림은 사용자 결정대로 고정 예시를 유지한다. 실제 서버 공유/외부 멘션 알림·로그인/Azure 서비스 검증은 이번 범위가 아니다.
