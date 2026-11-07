# Task: T07 RFP 상태 구성 도넛과 항목 정렬

## Status: done

## Goal
대시보드 개요의 RFP 상태 구성 카드에서5개 항목의 이름–건수 간격을 좁히고 큰 굵은 도넛과 항목 묶음을 중앙 배치한다.

## Decision Summary
- 실제로 쓰는 compositionChart/ringSvg를 수정 대상으로 삼고 RFP 상태 카드 전용 variant를 추가한다. 오래된 dbDonut/.donut 또는 다른 통계 차트를 일괄 변경하지 않는다.
- 선행: T06 완료.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. RFP 상태 카드 전용 차트 variant

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: pageDashboard L5919–5927, compositionChart L5887, ringSvg L5886, .dcc* L2259–2262/L2350 — modify
  - 같은 파일 :: dashView L5908, rfpCountsOf L5859, RFP_COL/RFP_LB, DBQ/toList/showStatus — read-only/reuse
  - 같은 파일 :: dbDonut L5785/.donut L2062, compact .rg8 및 다른 compositionChart 호출 — 유지

#### Details
- **Signatures & Types**:
~~~typescript
type ChartSegment = {id:string;label:string;count:number;color:string;failures?:number};
type CompositionOptions = {variant?: "default"|"rfp-status"};
declare function ringSvg(label:string,segs:ChartSegment[],compact?:boolean,options?:CompositionOptions):string;
declare function compositionChart(label:string,segs:ChartSegment[],kind:string,onSelect?:((id:string)=>void),options?:CompositionOptions):string;
~~~
- kind의 실제 기존 문자열 호출(예: stack 등)이 있으면 그대로 허용하고 기존 kind==='donut' 분기 외에는 현재 동작을 보존한다. 타입 설명 때문에 기존 호출 문자열을 변경하지 않는다.
- **Data & Schema Fields**: rows의5개 id/표시/집계 유지: progress=review+writing “진행 중”, submitted “제출·결과 대기”, won “수주”, lost “수주 실패”, dropped “진행 안 함”. count는 실제 기간조회 값이며 예시 “10건”을 하드코딩하지 않는다. color=기존 RFP_COL. percent=count/sum*100, 전체0이면0.0%. 차트 상태 데이터 신규 없음.
- pageDashboard overview의 “RFP 상태 구성” compositionChart 호출에만 options.variant=rfp-status. figure에 .rfp-status 추가, SVG 차트에도 구분 class를 붙인다. 다른 호출의 options 생략 동작은 기존과 동일.
- **수치 기본값(계획자 선택)**:
  - 표시 도넛 112→176px, viewBox 0 0 160 160 유지. 중심80/80, r60, stroke-width28(기존 r62/18). 바깥 반지름74이므로 SVG 안6px 여유가 남는다. 중앙 건수25px/600, “전체 건수”12px, 내부 원 반지름46px(60−14) 안에 들어가도록 y76/98 기준. 기존 compactN 포맷 유지.
  - 배경 ring과 색 arc의 r/stroke-width 동일. segment percentage는 pathLength100, 누적 dashoffset 유지, 시작−90도. 비율 왜곡을 막기 위해 넓은 round linecap/임의 gap은 넣지 않는다. 색은 기존 유지.
  - 그룹 grid는 176px + max-content, gap24px, justify-content:center, align-items:center, max-width100%, margin-inline:auto. 차트와 범례를 하나의 묶음으로 카드 안 중앙에 둔다.
  - 범례 각 행은 dot8px / label112px / value max-content의 grid, column-gap8px, padding4px6px. .dcc-n flex:1 제거는 .rfp-status 아래에서만 적용. 이름 칸이 카드 남는 폭을 채우지 않게 하여 이름과 숫자 사이8px 기준의 작은 여유를 만든다. 긴 문구는 label열 안에서 자연스럽게 줄바꿈, 숫자 오른쪽 정렬, 비율은 건수 아래 기존 형태.
  - 5행 모두 동일 grid 규칙. 행간4px 유지. 항목 전체 클릭 타깃·hover/focus를 유지한다.
  - 카드 가용폭440px 미만은 도넛 위/범례 아래 중앙 정렬. 전용 figure에 container query를 적용하거나 해당 카드 폭을 기준으로 동일한 조건을 구현한다. 범례 최대폭100%, label열 minmax(0,112px)으로 좁은 화면 overflow 방지. 페이지 전체 폭 기준 breakpoint만으로 좁은2열 카드를 놓치지 않는다.
- **Execution Flow / Logic**:
  1. 기존 dashView에서 기간 필터 집계를 받아5개 rows 생성.
  2. 해당 variant만176/28 규격으로 출력. 기본/compact chart는112/18/32 등 기존값 유지.
  3. 전체0이면 빈데이터 메시지+중립 배경ring+중앙0, 모든 label/count 유지. 0분모·NaN/Infinity·음수stroke 방지. 한 항목100%도 완전한ring.
  4. 항목 클릭은 showStatus(s.id)→toList({status:s,bucket:null}), DBQ.tab=rfp/rfpView=records/page=1 유지. 차트 크기 변경 때문에 필터·조회기간·합계 산식은 바꾸지 않는다.

### I02. 선행 변경 정적 검토와 T08 인계
- Related Files: v13의 T01–T07 허용 구간 + .memory 각 Task 기록 — inspect/update records only.
- 6개 작업탭의 헤더는 T01 하나로 연결; 코멘트 CSS/이벤트는 제작전용; 검토 줌·split은 pipeline 상세전용; 목차/설정 내용은 v12와 대조; 관리자폰트 변경은 family만; 도넛variant는 개요의 RFP카드만.
- v12 원본 해시, 앱 코드의 작업 전후 비변경, 외부 script추가 없음, 내장폰트/비대상 샘플데이터 보존을 확인한다. 다른 Task에서 요구된 비대상 UI를 이번 Task에서 편의상 정리하지 않는다.
- T01–T07 결과 기록에 실제 실행한 검증 범위를 적고 T07 완료 시 phase7/8, current Active Task는 T08로 전진한다. 추가 리뷰 요청이 남아 있으므로 이 단계에서 plan을 done 처리하지 않는다. 최종 통합 검토·종료는 T08에서 수행한다.

## Acceptance Criteria
- [x] RFP 상태 카드5개행의 이름–건수 간격이 좁은 고정열로 일관되고 데이터/클릭 연결을 유지한다.
- [x] 도넛이176px·stroke28의 두꺼운 형태이고 차트+항목이 중앙 그룹으로 배치된다.
- [x] 빈데이터/단일100%/긴문구/좁은카드가 처리되며 다른차트 기본값은 유지된다.
- [x] T01–T07 검증 기록·v12/앱 비변경 확인이 끝나고 미실시 브라우저 검증을 명시하며 T08로 인계한다.

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
rg -n --max-columns 300 --max-columns-preview 'function ringSvg|function compositionChart|rfp-status|RFP 상태 구성|dcc-n|stroke-width' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
정적 데이터 추적: counts=[10,5,3,2,0] 합20/50%, all0/0.0%, one100%, 작은조각·긴label. 옵션없는 일반ringSvg와 compact 및 작업·리소스/부서통계 호출의 출력구조는 기존과 동일한지 확인한다. 색상·숫자·필터 산식은 손대지 않는다.

## Commit Message
~~~text
docs(html-v13): RFP 상태 구성 차트 검증 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T07-dashboard-composition

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 순차 진행 상태 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 생략 — 최신 사용자 지시
