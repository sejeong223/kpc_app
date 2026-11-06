# Task: T01 지정 커밋의 공통 프로젝트 헤더 복원

## Status: done

## Goal
6개 작업 메뉴의 헤더를 d1826e75a6843362527d6658e53329c7477927c5의 간결한 프로젝트 선택·회차·작업 버튼 구조로 맞춘다. 자료 개수 제한 안내는 v12처럼 파일 업로드 본문 맨 위로 옮기고, 파일 업로드/목차/제작 설정/제작 중복 이동 버튼은 공통 헤더에서 모두 제거한다.

## Decision Summary
- 외형과 표시 구조는 지정 커밋에서 고정하고, v13의 실제 프로젝트 목록과 기존 완료·재작업·설정 이벤트는 유지한다. 권한 모델과 샘플 데이터를 과거 앱 데이터로 바꾸지 않는다.
- 사용자 추가 지시: 자료 사용량은 삭제하지 않고 v12의 본문 안내 막대로 복원한다. 헤더의 4개 메뉴 이동 버튼은 어느 작업 탭에서도 출력하지 않는다. 이 보완은 기존 T01에 포함하며 별도 Task를 만들지 않는다. 전체 Task 수는 추가 리뷰 요청을 반영한 Plan을 따른다.
- 선행 Task 없음.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. 공통 렌더러 및 선택 팝업

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: projectHeader(p) L5409–5424, pageProject() L5425, .ph* L1846–1860/L2392 — modify
  - 같은 파일 :: myRoles L3701, loopOf L3714, can L5398, openProject L2909, setCur, popAt/closePop L3524 — reuse
  - components/common/ProjectHeader.tsx, components/layout/WorkspaceHeader.tsx, config/project-header.ts **@ d1826e75a6843362527d6658e53329c7477927c5** — read-only

#### Details
- **Signatures & Types**:
~~~typescript
type HeaderTab = "analysis" | "files" | "toc" | "setup" | "write" | "review";
type HeaderProject = { id: string; name: string; org: string; due: string; status: string; pm: string; team: string[] };
declare function projectHeader(p: HeaderProject): string;
declare function openHeaderProjectPicker(anchor: HTMLElement, p: HeaderProject): void;
~~~
- **Data & Schema Fields**: 기존 PROJECTS/MY_PROJ, S.pid/tab, LOOP[p.id]의 round:number/state:"writing"|"done"/hist:Array를 유지. 새 영구 데이터 없음. 팝업 선택은 S.pid에 반영. 헤더 역할 문자열은 myRoles(p)의 PM → 작성자 → 리뷰자 순서; 해당 역할 없으면 검토자/참여자. 전역 관리자 역할을 프로젝트 역할 대신 표시하지 않는다. 권한 판단 can(p,k)는 그대로 쓴다.
- **표시 계약**:
  - 프로젝트 선택은 native select 대신 2줄 button. 첫 줄 프로젝트명(말줄임+title), 둘째 줄 기관명 · 마감 YYYY.MM.DD. 내부 오른쪽 역할 pill과 아래 화살표.
  - 선택 버튼 width 360px/max-width 100%, min-height 40px, height auto, padding 4px 10px, gap 10px. 제목 14px/20px/500, 메타 12px/16px/400. 모바일 기존 .ph-sel width 100% 유지하되 마지막 min-height 46px 오버라이드는 제거/교정한다.
  - 역할 pill 2px 8px, 원형 반경, 기존 dadam accent soft/ink. 외부 회차 pill은 검토 중(status=review) 숨김; 1차 작성 중 / N차 재작업 중 / N차 완성.
  - 오른쪽 순서: 34×34 재작업 아이콘 → 완성본 N(이력이 있을 때) → 체크 아이콘+완성 → 설정 아이콘+설정. 텍스트 액션은 높이 34px, 좌우 12px, gap 6px, 헤더 요소 간 8px.
  - 재작업 버튼 접근성 이름은 다음 회차 수를 포함한 “N차 재작업 시작”. 현재의 “재작업” 텍스트 버튼은 아이콘으로 변경.
  - 현재 v13 헤더의 프로젝트 번호, 별도 PM/참여자/예산/진행 집계, 화면별 headerUsage/headerLinks는 공통 헤더에서 제거한다. projectHeader의 screen 계산과 leadActs 안 screen 삽입을 없앤다. CSS로 숨기기만 하지 않고 공통 헤더 DOM에서 .ph-usage/.ph-links를 출력하지 않는다.
  - “파일 업로드 / 목차 / 제작 설정 / 제작” 4개 중복 이동 버튼은 files/toc/setup/write뿐 아니라 analysis/review를 포함한 6개 탭에서 공통 헤더에 넣지 않는다. GNB 메뉴는 유지한다. “설정” 프로젝트 액션과 파일 본문의 실제 추가/업로드 버튼은 제거 대상이 아니다.
  - 자료 개수·용량 안내는 I02에 따라 파일 업로드 본문에 한 번만 표시한다. 업로드 검증/파일 목록/추가/삭제/회차/우선순위 기능은 유지한다.
  - 팝업 너비 360px/max calc(100vw - 32px), 최대 높이 min(480px, calc(100svh - 100px)), padding 8px, radius 8px. “내가 참여 중”, MY_PROJ에 속한 프로젝트만, 항목마다 이름·역할·기관·마감, 선택 체크. title은 텍스트를 escape한다.
- **Execution Flow / Logic**:
  1. 선택된 프로젝트가 없으면 기존 pageProject fallback을 유지한다. 헤더는 6개 탭에서 동일 렌더러를 사용한다.
  2. 선택 열기 전 제작 코멘트의 transient 팝업/핀 배치 모드를 닫되 저장된 의견과 입력 초안을 지우지 않는다. 팝업 클릭이 기존 document outside-click에 즉시 닫히지 않게 event 경계를 맞춘다.
  3. 선택 시 S.snap=null, setCur(id), openProject(id,S.tab). 기존 탭 권한 fallback과 hash 연결 유지. 닫기/Escape/선택 후 살아 있는 선택 버튼으로 focus 복원.
  4. 완료/재작업/설정/완성본은 confirmDone/confirmRedo/openSettings/openLoopHist를 그대로 연결한다. 과거 커밋에서 액션이 미연결이었다는 이유로 v13의 기능을 제거하지 않는다.
  5. 보관본 복귀 버튼은 기존 .snap-bar에 유지/배치하여 공통 헤더 외형을 흐리지 않고 읽기 전용 회차에서 현재 작업으로 돌아올 수 있게 한다. 검토 중 회차·완성·재작업 숨김, 완료 상태 완성 disabled, 권한별 액션 노출 유지.
  6. 기존 #ph-project change 핸들러 L5469는 button 팝업과 중복 실행되지 않게 해당 핸들러만 교체/제거한다. 다른 select 이벤트는 유지.

### I02. v12 방식의 파일 업로드 본문 사용량 안내

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: wsFiles(p) L5566–5573, .up-lim/.bar L1175–1176, UP_LIMIT L4203, RM_LIMIT L5967 — 본문 안내 마크업·전용 스타일만 modify; 한도 상수 및 업로드 로직은 read-only
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html :: pageProject L2508–2521, wsFiles L3448–3459(특히 L3458) — read-only
  - 사용자가 추가 메시지에서 부른 “KPC 제안서 작성 AI v12_8.html”은 앞서 지정한 위 v12 참고본으로 해석했다. Downloads에서 확인한 실제 파일명은 KPC_제안서_UI_v12 8.html이다.

#### Details
- **Signatures & Types**: 기존 wsFiles(p):string의 본문 return만 보완한다. 신규 함수나 저장 모델은 필요 없다.
- **Data & Schema Fields**: 표시 개수 n=FILES.length, 최대 개수=UP_LIMIT.projFiles(현재30), 파일당 크기=UP_LIMIT.fileMB(현재50MB), 문서 권장 분량=UP_LIMIT.pages(현재300쪽). 기존 RM_LIMIT.slots=30/bytes=50×1048576 및 checkUpload/rmInvalid 등 검증 규칙은 변경하지 않는다. 현재 회차 개수가 아니라 v12처럼 전체 FILES 개수를 표시한다.
- **Execution Flow / Logic**:
  1. wsFiles의 .wk 루트에 files-workspace 범위 class를 붙이고 첫 자식으로 .up-lim 안내 막대를 출력한다. 위치는 공통 헤더 밖, 업로드 회차와 자료 카테고리 목록 위다.
  2. 내용 순서는 “자료 N / 30개” → 사용량 막대 → “파일당 50MB · 문서당 300쪽 권장”. 숫자는 위 상수를 읽고 샘플 개수를 하드코딩하지 않는다. progress는 max가 양수일 때 clamp(n/max×100,0,100), 잘못된 max에는0으로 처리한다. 시각 막대 외에 텍스트와 접근성 이름으로 현재/최대 개수를 전달한다.
  3. 이미 남아 있는 .up-lim/.bar 구조를 활용하고 v13의 현재 폰트·배경·테두리·파란 계열 토큰을 따른다. v12 CSS 전체를 가져오지 않는다. 좁은 폭에서는 .files-workspace > .up-lim만 flex-wrap:wrap/white-space:normal 처리하고 막대가 줄어들거나 다음 줄로 배치되도록 min-width:0을 보장한다. 다른 filesPanel의 .up-lim 스타일은 변경하지 않는다.
  4. 기존 알림 nt, 삭제 되돌리기 un, 회차 block, 파일 카테고리와 순서를 유지한다. .f-note의 “자료의 참조 순서는 왼쪽부터 적용됩니다.”는 유지하되 새 막대와 중복되는 문서당300쪽 안내만 제거한다. headerUsage의 “이 브라우저에 저장”을 공통 헤더나 새 사용량 막대에 다시 끼워 넣지 않는다. 기존 업로드 모달의 안내는 그대로 둔다.
  5. 파일 추가/삭제/되돌리기의 기존 render()에서 n과 막대가 다시 계산된다. 새 event listener/interval을 만들지 않는다. 자료0개/한도30개/한도 초과 데이터에서도 표시가 깨지지 않게 하고 실제 허용 한도를 늘리거나 삭제하지 않는다.

### I03. 범위 및 회귀 정적 검토
- headerLinks/headerUsage 함수 자체와 다른 호출자는 불필요하게 삭제하지 않는다.
- shared .btn/.inp 전역을 수정하지 않고 .ph 내부에 한정한다.
- 최초/재작업/완성/검토/스냅샷/비PM 조건의 결과와 6개 탭 선택 흐름을 분기별로 추적한다.
- .ph 안에는 업로드 사용량/메뉴 이동 nav가 없고 .files-workspace 본문에는 사용량 안내가 정확히 한 개임을 확인한다. 헤더를 고친 뒤 T04/T05에서 같은 이동 링크를 다시 넣지 않는다.

## Acceptance Criteria
- [x] 6개 메뉴가 하나의 projectHeader를 사용하고 지정 커밋의 선택 버튼·역할·회차·액션 순서가 구현되어 있다.
- [x] 기관·마감이 선택 버튼 내부 둘째 줄에 있고 v13의 추가 메타/업로드 사용량/중복 이동 링크가 헤더에 없다.
- [x] 6개 작업 탭 모두 공통 헤더에 “파일 업로드 / 목차 / 제작 설정 / 제작” 이동 버튼이 없고 GNB·프로젝트 설정·실제 업로드 조작은 유지된다.
- [x] 파일 업로드 본문 맨 위에 v12처럼 “자료 N / 30개”·진행 막대·“파일당 50MB · 문서당 300쪽 권장”이 한 번 표시되고 추가/삭제/되돌리기 후 갱신된다.
- [x] 선택/Escape/focus, 기존 완료·재작업·이력·설정, 읽기 전용 복귀 동작을 연결한 코드가 유지된다.
- [x] 앱의 현재 ProjectHeader 및 권한·저장 데이터는 변경되지 않는다.

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
rg -n --max-columns 300 --max-columns-preview 'function projectHeader|openHeaderProjectPicker|ph-project|ph-sel|function pageProject|function wsFiles|files-workspace|up-lim|headerUsage|headerLinks|UP_LIMIT|RM_LIMIT' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
정적 분기 검토표: analysis/files/toc/setup/write/review × 검토·1차·2차·완성·보관본. 새 아이콘이 FI에 없다면 이 HTML 내 SVG만 추가하고 패키지/아이콘 파일은 수정하지 않는다.
사용량 검토표: n=0/15/30/31에서 표시 개수는 실제값, 막대는0/50/100/100%. projectHeader의 마지막 유효 정의에서 headerUsage/headerLinks 호출이 사라지고 wsFiles의 마지막 유효 정의에만 안내가 붙는지 확인한다. 함수 이름이 파일에 남아 있다는 이유만으로 실패 처리하지 않는다.

## Commit Message
~~~text
docs(html-v13): 공통 헤더 복원 작업 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T01-shared-header

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 다음 실행 포인터 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 문서의 Git 이력 참조
