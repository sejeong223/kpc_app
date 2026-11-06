# Task: T03 검토 목록의 원문 확대와 AI 분석 너비 조절

## Status: done

## Goal
검토 목록 상세의 “RFP 원문 · AI 분석” 화면에서 원문 검색 왼쪽에 줌 도구를 넣고 원문/분석 경계에서 분석 패널 너비를 바꿀 수 있게 한다.

## Decision Summary
- 첨부 첫 이미지는 축소–100%–확대, 둘째는 원형 좌우 화살표가 있는 경계 드래그 손잡이로 해석한다. 작업 메뉴의 AI 분석(wsAnalysis)이나 PM 리뷰(wsReviewPM)를 수정하지 않는다.
- 선행: T02 완료. 제품 변경 허용 영역은 아래에서 명시한다.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. 검토 원문 전용 줌

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: wsReviewPage L3858, rfp 블록 L3908–3910, bindReviewPage L3918, .rv-rfp* L1218–1229 — modify
  - 같은 파일 :: pipeDetail L3022, rfpPages L3234, flashRfp L3241 — read-only/reuse
  - 첨부 이미지: dark strip의 돋보기− / 100% / 돋보기+ — visual reference only

#### Details
- **Signatures & Types**:
~~~typescript
type ReviewViewState = { zoom: number; analysisWidth: number };
declare const REVIEW_VIEW: Record<string, ReviewViewState>;
declare function reviewViewOf(pid: string): ReviewViewState;
declare function setReviewZoom(pid: string, percent: number): void;
declare function bindReviewViewer(p: {id:string}): void;
declare function clampReviewAnalysisWidth(requested: number, containerWidth: number): number;
~~~
- **Data & Schema Fields**: REVIEW_VIEW[projectId]의 zoom 기본100, 50≤zoom≤200, step10; analysisWidth 기본380(px), 최소280. 키가 없으면 기본값. 영구 저장 없음, 같은 페이지 세션에서 탭 이동 후 보존, 프로젝트별 분리. 기존 S.anSplit, localStorage kpc-v13-an-split과 독립한다.
- 원문 toolbar 순서: 문서 아이콘/“RFP 사업정보” → 여유 → 줌 컨트롤 → 기존 검색 → 페이지 표시. 줌 group 28px 높이, 축소/확대 button 각각28px, 가운데 44px의 “100%” 버튼(100으로 복원), icon14px. 첨부처럼 짙은 남색 배경/밝은 아이콘, 가운데 수치 배경만 한 단계 밝게. 키보드 접근과 “원문 축소”, “원문 배율 초기화”, “원문 확대” label, 한계에서 해당 버튼 disabled.
- #rfp-view는 기존 스크롤 뷰포트로 유지. rfpPages(p)의 결과만 새 .rv-rfp-pages로 감싸고 zoom=percent/100을 적용한다. toolbar/검색/분석 텍스트는 확대하지 않는다. 100%에서 원본 .rfp-page 스타일 그대로. .rfp-page와 mark[data-an] ID/속성 유지.
- **Execution Flow / Logic**:
  1. S.route=pipeline, S.pd가 있고 S.rvTab=rv-rfp인 경우만 바인딩. DOM이 없으면 반환.
  2. 버튼 클릭 때 입력값 finite 확인→50~200 clamp→상태·배율 표시/disabled·wrapper zoom만 갱신. render() 전체 호출로 분석 접힘과 검색 입력을 잃지 않는다. 문서의 스크롤 상대 위치는 가능한 범위에서 보존한다.
  3. 잘못된 값은100으로 복원. 확대 문서는 스크롤 영역 안에서 넘침 허용, 바깥 페이지의 가로 overflow를 만들지 않는다.
  4. 줌 값 변경 후 AI 분석 항목 클릭이 flashRfp의 해당 원문 mark로 이동하는 구조를 보존한다. 원문 검색 실동작 신규 구현은 범위 밖.

### I02. 분석 너비 조절 손잡이

- Related Files: 같은 HTML :: wsReviewPage의 .rv-rfp-v/.rv-rfp-a 경계, bindReviewViewer, 검토 전용 CSS — modify. bindSplit()/bindW3()는 read-only.
#### Details
- 데스크톱 .rv-rfp에 원문(minmax(0,1fr)) / 분리선8px / 분석(var(--review-analysis-width,380px))의 3열 구조. 원문 최소320px, 분석 최소280px. 실제 상한은 min(680, containerWidth−8−320). 전체폭이 최소합608 미만이면 드래그를 비활성화하고 적층한다.
- 기존 viewport max1240px 적층 정책 유지: .rv-rfp 1열/height auto, 원문 스크롤 height560px, 분석 full width, 손잡이 숨김. 데스크톱으로 복귀할 때 상태를 실제 container폭에 맞춰 clamp한다. 이전 2열 CSS가 새 3열을 덮지 않게 검토 전용 마지막 규칙을 정리한다.
- 분리선은 role=separator, aria-orientation=vertical, tabIndex0, aria-controls로 두 패널 연결, min/max/now 수치를 px로 제공. 중앙에 지름26px 흰 원, 얇은 회색 테두리, 좌우 화살표, hit영역24px와 col-resize cursor. 인접 콘텐츠를 가리지 않게 경계에만 배치한다.
- pointerdown에서 시작 rect/폭 기록→pointer capture→pointermove에 분석폭=container.right−clientX(분리선 위치 보정) clamp→CSS 변수만 변경. 왼쪽 이동하면 분석이 커진다. pointerup 확정, cancel/Escape 원복, capture/listener 해제. doubleclick380px, ArrowLeft +16px/ArrowRight −16px, Shift32px, Home 최소/End 최대.
- ResizeObserver와 창 resize 시 clamp, render로 노드 교체되면 observer/capture/event 정리. 분석 accordion 펼침 상태, 기존 검토 의견·사업개요·PWin 탭 동작을 유지한다.

## Acceptance Criteria
- [x] 검토 목록 상세 RFP 탭 검색 왼쪽에 축소/배율/확대가 있고 원문 문서만50–200% 조절된다.
- [x] AI 분석 경계의 원형 좌우 손잡이와 pointer/키보드/reset 처리, 최소폭·반응형 방어가 정의되어 있다.
- [x] 같은 프로젝트 탭 이동 시 줌/폭을 보존하고 다른 프로젝트·작업 AI 분석의 상태와 섞이지 않는다.
- [x] 기존 원문 mark 연결 및 검토 의견, 검색 입력 마크업, 다른 작업 화면은 유지된다.

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
rg -n --max-columns 300 --max-columns-preview 'REVIEW_VIEW|reviewViewOf|setReviewZoom|bindReviewViewer|review-analysis-width|rv-rfp-pages' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
정적 상태표: 배율50/100/200·범위 밖 입력, 폭608/960/1280과 viewport1240 경계, pointer cancel·키보드·프로젝트 전환. rfpPages/flashRfp의 기존 속성 연결을 추적한다.

## Commit Message
~~~text
docs(html-v13): 검토 원문 확대와 분석 너비 조절 작업 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T03-review-viewer-controls

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 다음 실행 포인터 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 문서의 Git 이력 참조
