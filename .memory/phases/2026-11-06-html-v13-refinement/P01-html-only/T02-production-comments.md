# Task: T02 제작 화면 코멘트 UI만 개발 화면과 일치

## Status: done

## Goal
제작 화면의 핀 생성·번호·코멘트 팝업·입력·답글·메뉴·크기 조절을 현재 개발 화면 사양으로 바꾸고 나머지 제작 UI는 유지한다.

## Decision Summary
- 개발 working tree(계획 수립 시점)의 Comment* 및 SlideCommentSurface 외형/조작을 단일 HTML에 맞게 이식한다. React/provider/IndexedDB·앱 권한 엔진은 이식하지 않고 HTML COMMENTS 모델에 연결한다.
- 선행: T01 완료. 본 Task는 제작 코멘트 영역만 변경.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. 슬라이드에 붙는 핀 및 생성 도구

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: writeWrap L5679, cmtBlock L5683, pinPopover L5688, bindPinDrag L5705, bindWriteNew L5707 — modify
  - 같은 파일 :: slideHtml L3275의 pins 부분, wsWrite L3262/cmtBlock 연결, multiStack L3696의 코멘트 연결, 전역 핀 click L3771/Escape L5708 — 코멘트 구간만 modify
  - components/comments/CommentCreateButton.tsx, CommentPin.tsx, SlideCommentSurface.tsx, CommentPreview.tsx, CommentPopover.tsx, CommentComposer.tsx, CommentMessage.tsx, CommentActionsMenu.tsx; config/comments.ts; lib/ui/dadam-theme.ts — read-only (미커밋 변경 포함)
  - components/workspace/production/comments/LegacyCommentsArchive.tsx — read-only

#### Details
- **Signatures & Types**:
~~~typescript
type HtmlReply = { id?: string; author: string; at: string; text: string; mentions?: HtmlMention[]; updated?: boolean };
type HtmlMention = { name: string; start: number; end: number };
type HtmlComment = { id: string; sec: string; page?: number; author: string; role: string; text: string; status: "open"|"done"; at: string; round?: number; x?: number; y?: number; replies?: HtmlReply[]; mentions?: HtmlMention[]; updated?: boolean };
type PinDraft = { key: string; x: number; y: number };
type CommentUi = { scope: string|null; drafts: Record<string,string>; sizes: Record<string,{width:number;height:number}>; editing: string|null; confirm: null|{kind:"thread"|"reply";id:string}; numbers: Record<string,number> };
declare function pinPopover(p: object): void;
declare function bindPinDrag(p: object): void;
declare function bindWriteNew(): void;
declare function cmtBlock(p: object, sec: object, pi: number): string;
~~~
- **Data & Schema Fields**: COMMENTS[projectId]:HtmlComment[] 유지. HTML의 status "done"은 개발 UI의 resolved 표시와 매핑하며 전역 데이터를 resolved로 바꾸지 않는다. page 누락=0, round 누락은 기존 의견 표시 규칙 유지. x/y는 0–100 퍼센트이며 앱의 0–1 비율을 그대로 저장하지 않는다. 신규 reply id는 중복 없는 문자열, 기존 reply는 필요할 때 id를 부여한다. 서버/DB/네트워크 없음.
- 새 transient CommentUi(이름 CMT_UI)를 하나 둔다. 기본 scope null, maps {}, editing/confirm null. scope는 projectId:round:secId:pageIndex. 초안 key는 scope:new / scope:reply:commentId / scope:edit:messageId. 팝업 닫기·재렌더 시 입력 유지, 등록 성공 시 해당 초안만 삭제. 번호는 projectId:round:commentId에 처음 한 번 배정하여 삭제·필터 뒤 재번호를 매기지 않는다. 저장 모델의 기존 id/섹션 연결은 보존한다.
- **핀 UI**: 44×44 button hit 영역, 눈에 보이는 핀 24px, 흰 2px 테두리, 50% 50% 50% 2px 모양. Spoqa 10.5px/700 번호를 20×20 SVG 중앙에 배치. 선택 시 1.25배와 4px ring, 초안 흰 바탕·파란 윤곽, 완료 회색. 개발 화면의 숫자 실제 잉크 중앙 정렬(측정 가능할 때 Canvas measureText, 아니면 SVG 중앙 fallback)을 동일하게 적용한다.
- **도구 위치 (2026-11-06 최신 사용자 지시)**: “핀 생성”은 제작의 “작성 중” 상태 드롭다운 바로 왼쪽에 배치한다. 기존 슬라이드 아래 배치 계획보다 최신 사용자 지시를 우선한다. 현재 선택 슬라이드에 연결하고 멀티 선택에서는 클릭한 슬라이드에 정확히 연결한다. 버튼 높이 최소 40px, padding 8px 14px, radius 8px, font 14/20/500, 위 gap 8px. “핀 생성”/“핀 생성 취소”와 도움말. 기존 “이전 의견” 접근은 보존하고 보관함 제목·읽기 전용·본문은 개발 UI에 맞춘다. v13의 제작 cmtBlock 목록은 핀/팝업 방식으로 대체하되 리뷰 화면 cmtBlock 분기는 그대로 둔다. 데이터 삭제 금지.
- 제작 3분할, 썸네일, 슬라이드 HTML 본문/스타일, .ed-wrap 크기/정렬, 출처 패널, 본문 편집·AI·PPT/다운로드 동작은 유지한다. .pin 전역 덮어쓰기 대신 제작 전용 class를 붙여 PM 리뷰 핀에는 영향이 없게 한다.
- **Execution Flow / Logic**:
  1. 생성 도구는 현재 슬라이드 실제 표면에만 연결. 드래프트 비교/과거 보관본/빈 목차/편집 불가이면 생성 불가. 여러 슬라이드가 보일 때 document.querySelector('#slide')로 첫 장을 잡지 말고 .slide[data-skey]의 sec:page가 일치하는 요소를 찾는다.
  2. 표면 클릭 좌표를 getBoundingClientRect 기준 퍼센트로 변환하고 clamp한다. 좌표 끝의 핀 시각 요소는 화면 안에 보정한다. 입력·버튼·분리선 클릭은 핀 생성으로 처리하지 않는다. Enter/Space 표면 선택은 중앙 초안 생성.
  3. 드래그는 5px 이상 움직인 뒤 시작. pointer capture, pointercancel/lostcapture/Escape에 원위치 복원, 완료 후 click 중복 열기 방지. Alt+방향키 1%, Shift 동시 5%. scroll/resize로 표면이 사라지면 팝업을 닫고 초안은 유지.
  4. 제작에만 새 핸들러를 연결하여 기존 L3771 click과 중복 생성되지 않도록 분기한다. 비제작 경로의 기존 핀/리뷰 코멘트는 유지.

### I02. 팝업·입력·답글·메뉴

- Related Files: 위 HTML :: .cpop* L1988–1993, pinPopover/bindWriteNew — modify. 전용 .production-comment-* 범위 사용.
#### Details
- 기본 360×360px, 최소 320×240px, viewport 16px 여유 내 clamp. 흰 배경/1px border/radius 8px/shadow, 본문 Spoqa 14/20/400. 제목 “새 코멘트” 또는 “코멘트 N” 16/24/700, 헤더 최소48px, 좌우16px.
- 헤더 오른쪽: 본인 root 수정·대화 전체 삭제 메뉴(⋯), 반영 완료/다시 열기 체크, 닫기. 폭420px 미만은 상태 변경 아이콘만 표시하고 aria-label 유지. 작성자 이름 14px/700, 시간 12px 오른쪽, 수정 시 “수정됨”, 원본 개발 메시지와 같이 불필요한 아바타는 넣지 않는다.
- 본문은 스크롤, 입력 footer는 위12/좌16/우20/아래20px. 입력 높이56–120px 자동조절, resize none, padding10px. 전송32×32 파란 버튼, 빈/공백 입력 비활성. Enter 등록, Shift+Enter 줄바꿈, 조합 중 Enter는 등록하지 않음.
- 멘션은 @뒤 이름 필터 최대6명, 프로젝트 참여자 이름으로 표시, 위쪽 listbox, 상하 선택·Enter 확정·Escape 닫기. 문자열은 esc 처리한 뒤 멘션 구간만 강조하고 사용자의 HTML을 실행하지 않는다. 수정·삭제·답글은 작성자 기반의 HTML UI 가드와 현재 회차/읽기 전용 조건을 재확인한다.
- 기존 의견의 답글은 시간순 보존. 본인 메시지 수정/취소, 대화 전체 또는 답글 삭제는 팝업 안 확인 단계로 처리. 취소 시 내용 불변, 대화 삭제는 그 id의 root/답글/핀만 제거. 완료된 의견은 답글 disabled, 다시 열면 활성.
- e/s/se 크기 조절 핸들(너비8px, 높이8px, 모서리24px), 방향키16px/Shift32px, ESC 드래그 취소. 좁은 viewport는 최소 크기보다 화면 여유를 우선. 팝업 외부 클릭/닫기는 초안을 보존하고 핀 또는 생성 버튼으로 focus 복원.
- render()가 DOM을 다시 만들므로 body에 만든 팝업·윈도우 이벤트·ResizeObserver·hover timeout은 render/프로젝트 변경 때 해제하여 중복 누적하지 않는다. 기존 production 전역 Arrow 키가 팝업/메뉴 키 입력을 소비하지 않도록 코멘트 영역에서 이벤트를 차단한다.

## Acceptance Criteria
- [x] 개발 UI 규격의 핀·번호·상태 드롭다운 왼쪽 생성 버튼·팝업·입력·메뉴·크기 조절이 제작 범위에만 적용된다.
- [x] 등록/답글/수정/삭제/완료/다시 열기와 멘션 선택이 기존 COMMENTS에 연결되고 공백·IME·읽기 전용 방어가 있다.
- [x] 멀티 슬라이드/스크롤/줌/재렌더에서 코멘트의 sec/page와 위치·초안이 혼동되지 않는다.
- [x] 제작 비코멘트 마크업·CSS와 PM 리뷰 코멘트 분기, 기존 의견 데이터가 유지된다.

## Validation

### 공통 검증 명령
작업 디렉터리: C:/Users/김세정/Documents/GitHub/kpc_app. 기존 node_modules의 jsdom/postcss 사용. 다음 PowerShell stdin 명령은 파일을 만들지 않고 HTML을 파싱하며, HTML 스크립트 자체는 실행하지 않는다.

~~~powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
@'
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const postcss = require('postcss');
const dir = path.join(os.homedir(), 'Downloads');
const file = path.join(dir, 'KPC_제안서_UI_v13.html');
const reference = path.join(dir, 'KPC_제안서_UI_v12 8.html');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha(reference), '52dc1322383f79b1e880f9c4b51fbc182d99aafedd40532a5c48acb2f4b011e3');
const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { runScripts: 'outside-only' });
const doc = dom.window.document;
assert.ok(doc.querySelector('#app'));
assert.equal(doc.querySelectorAll('script[src]').length, 0);
for (const el of doc.querySelectorAll('script:not([src])')) new vm.Script(el.textContent, { filename: 'v13-inline.js' });
for (const el of doc.querySelectorAll('style')) postcss.parse(el.textContent);
console.log('HTML/inline JS/CSS parse OK; reference unchanged; v13 SHA256=' + sha(file));
dom.window.close();
'@ | node -
git diff --stat
git status --short
~~~

- 기대 결과: exit code 0, 구문 검사 통과, v12 해시 동일. 새 외부 script 의존성이 없다.
- git 결과에는 기존 사용자의 변경이 이미 있으므로 clean을 기대하지 않는다. 작업 전 목록과 비교해 이번 Task가 앱 파일을 추가 변경하지 않았는지 확인한다.
- 구문 검사는 실제 클릭/레이아웃/브라우저 폰트 렌더링을 보증하지 않는다. 아래 Task별 정적 수용 검토 결과와 미실시 범위를 별도로 기록한다.
- 결과는 .memory/reports/2026-11-06-html-v13-refinement-TNN.md에 실제 Task 번호, 전후 v13 해시, v12 해시, 허용 변경 구간, 실행 명령·결과로 기록한다. 통과하지 않은 동작을 통과로 쓰지 않는다.

### Task별 정적 검사
~~~powershell
rg -n --max-columns 300 --max-columns-preview 'function pinPopover|function bindPinDrag|function cmtBlock|CMT_UI|data-skey|production-comment' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
정적 흐름: 2장 각각 생성 → 닫고 재열기 → 답글 → 본인 수정/취소 → 삭제 취소/확정 → 완료/재열기. 빈 입력/IME, viewport 최소 크기, 5px 드래그 임계치, readonly, 초안 보존, double binding 여부를 추적한다. API/IndexedDB 구현으로 확대하지 않는다.

## Commit Message
~~~text
docs(html-v13): 제작 코멘트 UI 정비 작업 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T02-production-comments

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 다음 실행 포인터 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 문서의 Git 이력 참조
