# Task: T06 관리자 콘텐츠 폰트 통일

## Status: done

## Goal
어드민 일반 텍스트·입력·버튼이 제작 화면과 동일한 Spoqa Han Sans Neo 계열 폰트를 사용하도록 맞추고 기존 글자 크기와 화면 배치는 유지한다.

## Decision Summary
- v13에는 이미 Spoqa woff2가 내장되어 있다. 관리자에 지정된 system --body-font override만 --dadam-font로 바꾸며 새 폰트 다운로드나 전역 디자인 변경을 하지 않는다.
- 선행: T05 완료.

## Execution Boundary
- 이번 문서는 실행 청사진이다. 사용자가 후속 실행을 요청하기 전에는 구현하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부 HTML/CSS/JS만 허용한다. 앱 TS/TSX/CSS, package.json, .gitignore 및 C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html는 읽기 전용이다.
- 다른 Task의 영역은 유지한다. 공통 함수가 필요하면 기존 호출자의 출력/동작이 유지되도록 범위를 한정한다. 임베디드 폰트·이미지·샘플 데이터 전체를 재생성하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server 검증 금지. 앱 서비스·DB 연결·네트워크 통신·패키지 설치 금지.
- 작업 직전 v13 원문과 해당 Task 밖의 함수·CSS 선언·데이터를 메모리에서 비교 가능한 상태로 보관한다. 전체 파일 포맷 변경 금지. 변경 후 비대상 블록이 유지되는지 diff를 정적 검토한다.
- 이하 타입 선언은 청사진의 계약 설명이다. HTML에는 기존과 같은 순수 JS로 구현하며 타입 파일을 새로 만들지 않는다.

## Implementation

### I01. 관리자 폰트 상속 정리

- Related Files:
  - C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html :: :root --body-font/--dadam-font/--font L2172, .ad L2174, .adm L2179, .u-card L2317, .dept-b L2319, .ad-filter>span L2320, .ad-filter .btn L2325 — modify(관리자 선언만)
  - 같은 파일 :: 내장 @font-face L7, html/body/#app L2173, .inp L2175, button/input/select/textarea L2176, .rg-* L2321 — read-only

#### Details
- **Signatures & Types**: JS 함수 시그니처 변경 없음. CSS font-family 선언만 대상. 일반 텍스트 목표값은 var(--dadam-font).
- **Data & Schema Fields**: --dadam-font = "Spoqa Han Sans Neo","Apple SD Gothic Neo","Malgun Gothic","Noto Sans CJK KR",sans-serif. --font는 이미 이를 가리킨다. --body-font 전역 값은 유지한다. 상태·DTO·저장필드 신규 없음.
- **대상 화면**: pageAdmin(kind)가 보내는 dashboard/users/audit/policy(token 포함), a-ps/a-sk/a-tp 관리자 자산 목록·상세·폼. .ad/.adm 내부 표/카드/필터 및 body 포털 모달(#admmodal/#vismodal/#tplmodal)의 관리자 일반 텍스트를 포함한다. 포털은 #app 밖이므로 root 상속이 실제로 일치하는지 별도 확인한다.
- **Execution Flow / Logic**:
  1. .ad/.adm의 font-family를 --dadam-font로 변경. .u-card/.dept-b/.ad-filter>span/.ad-filter .btn의 명시적 --body-font override도 관리자 범위에서 바꾸거나 상속하도록 정리한다.
  2. body/일반 제작 UI는 이미 --dadam-font이므로 변경하지 않는다. .rg-drop/.rg-title/.rg-sec 등의 시스템 폰트 설정은 요청 대상인 관리자가 아니므로 건드리지 않는다. 등록 화면 입력과 제작 일반 UI의 Spoqa 계열을 통일 기준으로 삼았음을 기록한다.
  3. font-size/line-height/font-weight/색상/행 높이/열 폭/여백/차트 수치는 바꾸지 않는다. .ad의12px/1.625는 유지, 기능별 의도된 크기 계층도 유지.
  4. .mono/.mono-s/.ad-g dd.code 등 실제 코드·ID 표시 전용 monospace와 Skill/Template/슬라이드 미리보기의 자산 설정 폰트는 유지한다. 이들은 일반 관리 콘텐츠가 아니다.
  5. @font-face base64를 재인코딩하거나 폰트 파일을 만들지 않는다. 폰트 로드 실패 시 기존 한국어 fallback을 사용한다.
- **Error & Exception Handling**: 별도 런타임 예외 없음. 테이블/버튼 일부만 다른 폰트가 남으면 전역 * !important 대신 그 명시적 관리자 선언을 수정한다.
- **State Transition & Return**: 상태 변화 없음. 기존 관리자 동작·데이터 그대로.

### I02. CSS cascade 정적 확인
- .ad/.adm/.u-card/.dept-b/.ad-filter의 마지막 유효 선언을 확인한다. body→root→component→form inheritance를 추적한다.
- 관리자 포털에 다른 font-family가 없으면 불필요한 새 규칙을 추가하지 않는다. preview 안의 font-family를 강제로 덮지 않는다.

## Acceptance Criteria
- [x] 관리자 일반 콘텐츠의 명시적 system-font 예외가 정리되고 --dadam-font를 사용한다.
- [x] 글자크기·굵기·행간·레이아웃·기능·데이터 변경이 없다.
- [x] 등록/제작/슬라이드 preview 폰트와 코드 표시용 monospace가 유지된다.
- [x] 내장 @font-face와 v12 원본은 그대로다.

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
rg -n --max-columns 300 --max-columns-preview 'body-font|dadam-font|font-family|\.ad\{|\.adm\{' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
font-family 등장 위치별 변경전/후와 scope를 결과에 기록한다. 브라우저를 실행하지 않으므로 실제 폰트 렌더링이나 줄바꿈 시각 검증을 통과했다고 쓰지 않는다.

## Commit Message
~~~text
docs(html-v13): 관리자 폰트 통일 작업 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T06-admin-font

- 외부 v13 HTML의 변경 범위와 검증 결과 기록
- Task 완료 및 순차 진행 상태 갱신
~~~

외부 HTML은 Git 추적 밖이다. .memory의 이 Task/phase/plan/결과 기록만 명시적으로 stage하며, 이 커밋에 HTML이 포함되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 생략 — 최신 사용자 지시
