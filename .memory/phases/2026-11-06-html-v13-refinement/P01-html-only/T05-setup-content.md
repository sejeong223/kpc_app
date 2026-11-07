# Task: T05 v12 제작 설정 내용 복원

## Status: done

## Goal
제작 설정에 v12의 프롬프트 세트·Skill·Template 내용과 선택/편집 기능을 복원하고 v13 외관을 유지한다.

## Decision Summary
- 프롬프트는 선택 세트의 목차별3열 표로, Skill은 규칙·미리보기·전후·유형별·샘플로, Template은 유형별 레이아웃으로 되돌린다. 프로젝트별 override와 자산 원본은 분리한다.
- 선행: T04 완료. 제품 변경 허용 영역은 아래에서 명시한다.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. 탭별 콘텐츠와 선택

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: wsSetup L5654–5670, bindSetupNew L5671, SU_UI L5642 — modify
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html :: wsSetup L3462–3481, psTableHtml L4165, srcEditCell L4435 — read-only
  - v13 :: passetOf L2866, psPrompt/psEff L2870–2877, psTableHtml L4527, skRulesHtml/skPreview/skPtHtml/skPages/tpDesignHtml L4539–4576, srcEditCell L4722, data-susel/pso handlers L4034–4036 — reuse

#### Details
- **Signatures & Types**:
~~~typescript
type AssetKind = "ps"|"sk"|"tp";
type ProjectAssetSelection = {ps:string;sk:string;tp:string};
type PromptItem = {lv:1|2;t:string;p:string;src?:("prop"|"rel"|"web")[]};
type PromptSet = {id:string;name:string;ver:string;dept?:string;owner?:string;status:string;only?:string[];vis:object;items:PromptItem[]};
type ProjectPromptOverrides = Record<string,Record<string,string>>;
type ProjectSourceOverrides = Record<string,Record<string,("prop"|"rel"|"web")[]>>;
declare function wsSetup(p: object): string;
declare function bindSetupNew(): void;
declare function psTableHtml(x: PromptSet,p?:object): string;
~~~
- **Data & Schema Fields**: PASSET[pid]는 ps/sk/tp id이며 POL 기본값은 유지. PSO[pid][assetId+":"+index]는 string, 누락/빈 문자열은 기존 psPrompt에 따라 원본→대목차 상속, null을 새로 저장하지 않는다. PSRC의 같은 key는 순서 있는 배열, 누락=상속, []=명시적으로 소스 없음. S.suTab이 ps/sk/tp가 아니면 ps, 첫 탭ps. SU_UI.bind/ver 등 기존 데이터는 삭제하지 않고 다른 호출자의 의미를 유지한다.
- array order는 사용자가 선택한 소스 순위다. 프로젝트에서 수정해도 세트 원본 items를 직접 바꾸지 않는다.
- v13 .wk.su-wrap, .su-tabs2, .wk-card.su-c, 기존 padding/gap/색상/버튼/입력 스타일 유지. 탭 내용·순서는 v12 “프롬프트 세트 → Skill → Template”, 기본ps. 가로 탭 배치를 유지하고 v12 빨간 컬러/아이콘 스타일을 전역 이식하지 않는다.
- 탭별 selector는 v12처럼 활성+visCan+프로젝트 only 조건, 전용 자산 먼저. 현재 적용 자산이 비활성이어도 목록에 유지하여 현재값을 잃지 않는다. 유효한 자산이0이면 빈안내. 선택 항목 이름/v번호/부서 또는 owner/“이 프로젝트 전용” 표시.
- v12의 즉시 선택 적용(data-susel) 방식 복원. v13의 변경확인·최신버전재적용·접힌 자세히보기·현재 섹션 수동 프롬프트 매핑/검색 카드는 이 제작 설정 화면에서 제거한다. 기존 helper는 다른 경로 사용 여부를 유지하며 전역 삭제하지 않는다.
- **Execution Flow / Logic**:
  1. S.suTab으로 표시 탭 판단, passetOf(p)로 프로젝트 선택 확보. 기존 선택이 없을 때 첫 유효 항목 fallback. 빈 컬렉션이면 dereference 없이 표시한다.
  2. can(p,'setup') 및 snapshot 제한 검증. data-susel change에서 선택 id가 허용 목록인지 확인하고 PASSET[pid][kind]만 갱신, 탭동기화 후 render. 기존 L4034 핸들러를 사용/보강하되 bindSetupNew로 중복 바인딩하지 않는다.
  3. 적용을 해도 기존 슬라이드/PPT/보관본 내용을 다시 생성하지 않는다. SU_UI.ver가 다른 화면에 필요하면 선택된 id와 ver만 일관되게 갱신한다.
  4. 화면 표시용 모델이 같더라도 자산 원본 PROMPT_SETS/SKILLS/TEMPLATES/POL/다른 프로젝트 PASSET/PSO/PSRC는 변경하지 않는다.

### I02. 프롬프트 표·Skill·Template 세부
- Related Files: 같은 HTML :: psTableHtml/psPrompt/psEff/srcEditCell 및 sk*/tpDesignHtml — 기존 함수 우선 재사용. 관리자 자산 상세 호출에 영향 주지 않는다.
#### Details
- 프롬프트: “목차명 / 프롬프트 / 소스 우선순위”3열, 대목차Roman/소목차번호/계층 표시. p를 전달한 psTableHtml(x,p)를 사용해야 textarea와 프로젝트override가 나타난다. “이 프로젝트에서 고친 프롬프트 N개 · 세트 원본은 바뀌지 않습니다”를 값이 있는 override 개수로 표시.
- 소목차 원문이 비고 override도 비면 “상속 · [실제 상속 문장]”. 입력 textarea data-pso, rows2, 권한 없으면readonly. 기존 input/focusout L4035–4036를 재사용하고 이벤트 안에서도 프로젝트/설정탭/권한을 검사. 재렌더 후 caret/스크롤 손실 방지.
- 소스는 제안 관련(prop) / 유관(rel) / 웹(web) toggle. 선택 순서1/2/3, 해제 후 나머지 재번호, 빈[]는명시적없음. 배열 clone 후 PSRC만 갱신. 부모상속/기본값 표시 유지.
- Skill: “공통 규칙” skRulesHtml, “안내선 · 눈금선 배치” skPreview, “넘침 · 겹침 방지” 적용전/적용후 예시, “페이지 유형별 규칙” skPtHtml, “샘플 페이지” skPages. v12 L3472–3474의 내용 구성 모두 유지하며 v13 카드 안에 배치한다. 디자인/샘플 미리보기의 자체 폰트는 자산 설정을 따른다.
- Template: “페이지 유형별 레이아웃” tpDesignHtml 전체. 업로드/Template 편집기의 콘텐츠는 변경하지 않는다.
- 사용 가능한 항목0, 비활성 현재값, 제한된 공개범위, 프로젝트 전용, 원본 문장 있음/없음, override 있음/빈 문자열, 부모 없음/소스[]에 대해 표시와 동작의 분기를 정적으로 검토한다.

## Acceptance Criteria
- [x] v12의3개 탭별 본문 항목이 빠짐없이 노출되고 기본ps와 직접 선택 적용이 연결된다.
- [x] 프롬프트3열에서 프로젝트override·상속·소스순서가 동작하도록 기존 모델/이벤트에 연결된다.
- [x] 원본자산·다른프로젝트·기존슬라이드·보관본은 변경되지 않는다.
- [x] v13 카드/탭/입력 스타일과 현재권한을 보존하며 old/new 이벤트가 중복되지 않는다.

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
rg -n --max-columns 300 --max-columns-preview 'function wsSetup|function bindSetupNew|data-susel|dataset.*pso|function psTableHtml|function srcEditCell|S.suTab' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
내용 대조: ps 표3열/override수/상속, sk 5종 세부, tp 레이아웃. 입력 경로별 실제 쓰기 대상이 PSO/PSRC/PASSET인지를 추적하고 PROMPT_SETS items 변경이 없는지 확인.

## Commit Message
~~~text
docs(html-v13): v12 제작 설정 복원 작업 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T05-setup-content

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 다음 실행 포인터 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 생략 — 최신 사용자 지시
