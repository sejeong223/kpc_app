# Task: T04 v12 목차 내용과 조작 복원

## Status: done

## Goal
목차 화면의 항목·표·담당자 조작·행정 체크리스트를 v12 기준으로 복원하면서 v13의 외곽 배치와 디자인 토큰을 유지한다.

## Decision Summary
- v12 wsToc의 데이터 표시/조작을 이식하고 v13 .wk/.wk-card/.wt/.btn/.inp 스타일을 유지한다. 목차·의견·슬라이드 데이터 전체를 과거 스냅샷으로 덮지 않는다.
- 선행: T03 완료. 제품 변경 허용 영역은 아래에서 명시한다.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. 목차 표·합계·AI 조작

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: wsToc L5609–5625, bindTocNew L5626–5639, .wk/.wt L1863 이후 — modify
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html :: wsToc L3519–3550, tocAi L3553–3558 — read-only
  - v13 :: tocOf/stateOf/sectionsOf L2843–2849, tocSnap/tocRestore L3539, bindToc L3610, tocAi/insSec/insCh/bindTocDrag L4071–4095, peopleCell/bindAsgInline/bindLists L4098–4134 — reuse

#### Details
- **Signatures & Types**:
~~~typescript
type TocChapter = { id:string; t:string };
type TocSection = { id:string; ch:string; t:string };
type TocData = { ch:TocChapter[]; secs:TocSection[] };
type TocState = Record<string,["todo"|"doing"|"done",string]>;
type ChecklistItem = {t:string; src?:string; done:boolean; who?:string[]; by?:string; at?:string};
declare function wsToc(p: object): string;
declare function bindTocNew(): void;
~~~
- **Data & Schema Fields**: TOCS[pid]는 기존 TocData, stateOf(p)[sid]는 상태와 주담당이다. ASGX[pid+":"+sid]는 추가 담당 string[], REVS의 같은 key는 리뷰 담당 string[], CHECKS_P[pid]는 ChecklistItem[]이다. 신규 영구 모델 없음. 새 장/절 id는 중복이 없고 t는 빈 문자열 금지, 상태 기본값은 ["todo",ME]. 파생 no/chT는 sectionsOf에서 계산하며 저장하지 않는다.
- **v12 내용 복원 명세**:
  - 표는8열: 번호 / 목차 / 담당자 / 리뷰자 / 상태 / 슬라이드 / RFP 반영 / 의견. v13 전용 “관리”9번째 열을 제거한다.
  - 대목차는 ROMAN I/II..., 접기, 완료cd/all, 장 이름. 소목차는 s.no, 이름, 복수 담당/리뷰자 avatar chip, 상태 “작성 중/작성 완료”, 페이지수 N장, 반영 full/total, 미처리 의견수.
  - 목차 제목 클릭은 제작의 해당 절로 이동. 편집은 hover(키보드 focus-within에도 표시)의 위/아래 추가·이름 변경·삭제, 대목차 더블클릭, 인라인 이름 입력+저장. 상태는 v12처럼 표시만 하며 제작에서 변경. v13의 상태 select/관리 열 이동 select/담당 모달은 목차에서 제거.
  - footer 합계: 대목차수·섹션수, 완료done/total, 합계슬라이드수, RFP full/total, 미처리 의견수.
  - AI 내용은 “RFP 기반 목차 추천” 버튼, placeholder “예) 100페이지로 만드는 목차로 만들어줘.”, 자연어 입력과 “수정”. v12 추천은 시연 toast, 자연어 수정은 tocAi로 소목차1개 추가+undo. v13 제안 비교 모달/Mock 설명은 목차에서 호출하지 않는다. 실제 AI 연결은 하지 않는다.
- **스타일/레이아웃 경계**: 외곽 .wk와 기존 목차/AI/체크리스트 카드 구획·폭·간격을 유지한다. .wt 테이블, v13 파란 버튼/입력, 8px radius, 현재 폰트를 사용하고 v12 CSS 전체를 복사하지 않는다. 내용 변경으로 불필요해진 v13 요약/PPT버전/관리 조작은 제거하며 v12 합계를 표 footer에 둔다.
- **Execution Flow / Logic**:
  1. 현재 프로젝트/목차 없을 때 colspan8 빈 안내. 장/절 없는 경우 AI 수정은 명시적 안내 후 return, undefined chapter를 참조하지 않는다.
  2. 데이터는 기존 tocOf/stateOf/sectionsOf에서 읽는다. 참조 v12의 전역 TOCS/SEED/PAGES/COMMENTS를 복사하지 않는다.
  3. 기존 v12 호환 data-ren/data-ren-ok/data-dbl-ren/data-tdrag/data-trow/peopleCell을 활용. bindToc/bindLists가 이미 호출되므로 bindTocNew와 tocDragNew를 함께 바인딩하지 않는다. TOC 화면의 이벤트 소유자를 하나로 정한다. 제작 목차 사이드바의 bindToc 분기는 그대로 유지.
  4. 현재 can(p,'outline')/can(p,'assign'), S.snap, lockedFor/secLocked를 조작 노출과 핸들러 내부에서 유지한다. 고정 섹션 이동/이름/삭제를 금지하고 고정 자식이 있는 장 삭제 방어. 참조본에서 약한 권한 체크를 그대로 들여오지 않는다.
  5. 추가→이름편집→번호 재계산, 드래그→부모 관계·순서 갱신, 삭제→기존 toastUndo/tocRestore. 번호는 별도 고정 값으로 저장하지 않는다. 삭제 시 코멘트/PAGES를 추가 삭제하는 로직을 넣지 않는다.
  6. 자연어 Enter는 IME 조합 중 제외. 기존 bindLists에 Enter가 있으므로 새 중복 listener로 두 번 추가하지 않는다.

### I02. 행정 체크리스트와 담당자 편집
- Related Files: 같은 HTML :: wsToc checklist, peopleCell/toggleSel/bindAsgInline/bindLists/addCheck/ownChecks — reuse/목차 범위 modify.
#### Details
- v12의5열: 확인 / 항목 / 담당자 / 확인 기록 / 삭제. 항목 근거 src는 제목 옆 메타로 표시. v13의 별도 근거·관리 열과 체크리스트 편집 모달은 이 화면에서 사용하지 않는다.
- 제목 “행정 체크리스트”와 완료/전체 count. 하단 “항목 추가 · Enter” 입력+추가버튼. checkbox는 done/by/at 갱신, 취소/삭제undo는 해당 항목만 복원.
- 담당자는 인라인 다중선택, 검색/상하/Enter/Backspace/Escape 지원. 주담당 최소1명 규칙 유지, 리뷰자0명은 허용. 입력 focusout/render 루프 및 popup 선택 mousedown과 blur 충돌 방지.
- 빈 목록·빈장에서도 열 수/합계와 추가 동작을 유지한다. 체크리스트 데이터 모델은 다른 검토 화면과 공유하므로 값의 의미·키를 바꾸지 않는다.

## Acceptance Criteria
- [x] 목차8열·footer합계·v12형 조작/AI/체크리스트5열이 복원되어 있다.
- [x] 카드 외곽 배치와 v13 디자인 토큰/색상/입력/표 스타일이 유지된다.
- [x] 기존 권한·고정·스냅샷 제한과 다른 제작/검토 화면을 보존한다.
- [x] 드래그·Enter·이름편집·담당자·체크리스트에 중복 이벤트가 없으며 샘플 데이터 전체 교체가 없다.

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
rg -n --max-columns 300 --max-columns-preview 'function wsToc|function bindTocNew|function bindLists|function tocAi|data-lck|data-tdrag|data-toc-st' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
v12의 열/버튼/합계를 표로 대조. 구조변경 전후 sec id와 PAGES/COMMENTS 연결 불변, 최초빈목차·빈장·locked·담당최소1명·일반사용자·snapshot 조건을 추적한다. 이름 변경 Enter/blur는 한 번만 저장되어야 한다.

## Commit Message
~~~text
docs(html-v13): v12 목차 내용 복원 작업 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T04-toc-content

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 다음 실행 포인터 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 생략 — 최신 사용자 지시
