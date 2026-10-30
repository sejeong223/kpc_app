# Plan: 제작 화면 핀 코멘트

- Date: 2026-10-29
- Status: ready
- Plan ID: 2026-10-29-production-pin-comments
- Workspace: C:/Users/김세정/Documents/GitHub/kpc_app
- Decisions: [확정 설계](../decisions/2026-10-29-production-pin-comments.md)

## Goal

모든 메뉴의 공용 헤더를 정리하고 제작 화면 /workspace/write의 사이드바를 제외한 본문 전체에서 핀 코멘트를 생성·이동·미리보기·답글·멘션·수정·삭제·완료·재개한다. 등록된 데이터는 IndexedDB에 보존되고 미등록 초안은 앱 메모리에만 남는다. 실제 제작 편집기 없이 이 기능의 동작과 저장 복원을 검증한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | in_progress | 도메인 규칙부터 실제 저장·상태 연결·코멘트 UI까지 순차 구현 | [P01](../phases/2026-10-29-production-pin-comments/P01-pin-comments/phase.md) |

## Task Map

| Task | 결과 | 주요 파일 |
| --- | --- | --- |
| T01 | 타입·검증·멘션·소유권·상태 전이를 순수 함수로 검증 | config/comments.ts, lib/comments/{domain,mentions,seed}.ts, tests/lib/comments/{domain,mentions}.test.ts |
| T02 | 네이티브 IndexedDB에 원자적으로 저장·복원 | lib/comments/repository.ts, tests/lib/comments/repository.test.ts, package.json, package-lock.json |
| T03 | 앱 수명의 초안·비동기 상태 및 전체 헤더 제거 | lib/comments/controller.ts, components/comments/CommentsProvider.tsx, AppShell.tsx, AppHeader.tsx 정리, 인증 레이아웃 |
| T04 | 핀·대화·멘션 입력·미리보기·크기 조절을 실제 제작 경로에 연결 | components/comments/* UI, lib/comments/{geometry,format}.ts, 제작 page.tsx, 관련 검증 |

순서: T01 → T02 → T03 → T04. 각 Task의 타입·이전 산출물 계약을 본문에 반복하여 다른 청사진을 추측해 읽지 않아도 실행할 수 있게 한다. 모든 Task는 하나의 로컬 기능을 완성하므로 별도 Phase로 과도하게 나누지 않는다.

## Scope and confirmed follow-up

- 원본 핀: 24px, 빨강 #d7192f, 완료 회색 #9ca3af, 흰 테두리·번호, 왼쪽 아래 꼬리. 새 핀은 흰 배경/빨간 테두리.
- 좌표는 작업 영역의 0~1 상대 좌표. 화면 고정 좌표나 DOM 요소 연결 방식이 아니다.
- 팝업은 비모달, 최대 50vw × 80vh, 작은 화면 예외. 팝업 자체 너비 420px 이상이면 완료 아이콘에 라벨을 표시한다.
- 첫 의견·답글 수정/삭제는 본인만, 핀 이동·완료·재개는 영역의 모든 이용자.
- 가상 사용자 멘션, 최초 한 번만 예시 저장, 전송 성공 데이터의 영구 저장, 초안은 메모리.
- 2026-10-29 계획 중 추가 범위 확인에 사용자는 **프로필 댓글 개수·댓글 알림 연동을 별도 후속 작업으로 유지**한다고 답했다. 이 계획의 Task를 늘리지 않는다.
- 서버 API, Cosmos DB, SQLite, 외부 사용자 검색·알림 발송, 실제 제작 편집기, 실시간 다중 사용자 동기화는 이번 구현 대상이 아니다.

## Architecture and dependencies

- 기존 Next.js 16.0.10 / React 19.2.1 / Fluent UI 9.74.11 / icons 2.0.344 / Griffel 1.7.8을 사용한다.
- config/comments.ts의 공통 모델 → 순수 도메인 함수 → IndexedDB repository → 테스트 가능한 controller → React provider → 제작 UI 순서다.
- 데이터는 사용자 namespace와 고정 surfaceId production-preview로 구분한다. 표시 이름이나 관리자 미리보기 역할을 작성자 식별자로 쓰지 않는다.
- DB: kpc-pin-comments, version 1. stores: surfaces, users, threads, messages. 초기화 표식은 surfaces.seedVersion에 남아 전체 대화 삭제 후에도 예시가 재생성되지 않는다.
- 테스트용으로만 fake-indexeddb 6.2.6을 T02에서 추가한다. 현재 미설치이며 계획 단계에서 설치하지 않는다. 실제 앱은 브라우저 native API를 쓴다.
- [공식 fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB)와 npm registry에서 6.2.6 존재 및 Node >=18 지원을 확인했다. 현재 Node는 v24.19.0이다.
- [IndexedDB 트랜잭션](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)의 완료 이벤트를 성공 기준으로 사용하고, 관련 없는 비동기 작업을 transaction 안에 섞지 않는다.

## Regression boundaries

- AppHeader에 들어 있는 모바일 메뉴 열기 버튼을 셸의 독립 버튼으로 옮긴다. workspace-sidebar-trigger ID는 기존 토큰 모달의 포커스 복귀에도 사용된다.
- 제작 main의 기존 최대 폭1320px/패딩이 핀 영역을 제한하지 않게 하되 다른 화면의 내용 스타일은 유지한다.
- 코멘트 팝업을 기존 ModalFrame으로 구현하면 배경 잠금과 중앙 모달이 되어 요구와 다르다. 자체 비모달 컨테이너와 기존 Fluent 버튼·메뉴를 조합한다.
- account 변경과 늦게 끝난 저장 요청이 새 계정 UI에 섞이지 않게 한다. Strict Mode의 중복 effect에서 샘플을 두 번 넣지 않는다.
- 한글 조합 Enter, 멘션 목록 선택 Enter, 일반 전송 Enter를 구분한다.
- 프로필·알림 고정 예시, 토큰 상태, 실제 인증·역할 가드는 보존한다.

## Validation strategy

- T01: 본문/멘션/소유권/상태 전이 순수 함수 테스트.
- T02: 실제 저장소 구현을 fake-indexeddb로 실행하여 재개방·원자성·초기화·삭제·namespace 분리·충돌 검증.
- T03: 주입한 지연 repository로 controller 경쟁 상태·실패·초안 수명 테스트, 헤더 제거 후 탐색 브라우저 확인.
- T04: 좌표/리사이즈 수학 테스트와 실제 브라우저의 입력·저장·복원·드래그·스크롤·반응형·접근성 검증.
- Windows PowerShell은 npm.ps1 실행이 차단되어 있으므로 npm.cmd / npx.cmd 명령을 사용한다. 실행 정책을 변경하지 않는다.
- 최종 npm.cmd run typecheck / lint / test / build. 이미 통과한 검증은 이후 변경이 영향을 주는 경우에만 반복한다.
- 현재는 문서 작성 단계이며 위 기능 테스트나 UI 검증을 통과했다고 기록하지 않는다.

## Completion and handoff

각 Task에서 검증 통과 → 해당 Task done·커밋 → phase 진행률 및 current 포인터 전진. 커밋은 각 청사진에 지정한 한국어 메시지와 Plan/Phase/Task footer를 사용한다. 계획 단계에서는 커밋하지 않는다.

현재 이전 current 기록은 새 포인터 설정 때 history에 보존한다. 시작점은 P01-T01이다.
