# Task: T08 리뷰 도구 정리와 섹션별 다중 슬라이드

## Status: done

## Goal
작업 메뉴의 리뷰 화면에서 상단 “섹션 목록 / 사실검증 / 기본 배치” 버튼을 제거하고, 시연 섹션마다 실제 여러 장의 슬라이드가 표시되도록 한다. 섹션 카드의 슬라이드 수와 중앙의 실제 장수가 일치해야 한다.

## Decision Summary
- 사용자 추가 요청이다. 기존 검토 목록의 RFP/AI 분석(T03)과 다른 화면이므로 별도 T08로 분리한다. 선행 T07 완료 후 실행한다.
- “버튼 제거”는 패널 표시·배치 조절 버튼을 뜻한다. 왼쪽 섹션 목록과 오른쪽 사실검증 콘텐츠/기능은 유지한다.
- 이미 6~8장 데이터가 있는 프로젝트는 그대로 보존한다. 슬라이드 데이터가 비거나 1장뿐인 기존 시연 프로젝트에 실제 페이지를 보완한다. 표시 숫자만 변경하지 않는다.

## Execution Boundary
- 현재는 계획 단계다. 사용자 후속 실행 요청 전에는 HTML·앱 코드를 수정하지 않는다.
- 제품 수정은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 내부만 허용한다.
- C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html 및 저장소 앱 TS/TSX/CSS/설정은 읽기 전용이다.
- 이번 Task의 허용 범위는 wsReviewPM의 도구·관련 모바일 접근/패널 표시 조건, 시연용 PAGES 누락 보완, 장수 표시 정합성이다. 공통 헤더·제작 코멘트 UI·목차 모델·권한·문서 원본을 별도 리디자인하지 않는다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/dev server/스크린샷 검증 제외. 구문 검사와 정적 데이터·호출 경로 검토를 사용한다.
- 앱/DB/네트워크/패키지 변경 없음. 타입 선언은 계약 설명이며 HTML에는 기존 순수 JS를 사용한다.

## Implementation

### I01. 리뷰 도구 버튼 제거와 패널 접근 보존

- Related Files:
  - v13 :: 마지막 wsReviewPM(p) L6107–6134, tools L6115–6116, return L6133 — modify
  - v13 :: .rvw-tools/.rvw-desk/.rvw-mob L2445, 모바일 @media L2465 — 필요한 리뷰 전용 규칙만 modify
  - v13 :: bindRvw L3971, factGo L3966 — 모바일 패널 선택 바인딩/이동에 한해 modify
  - v13 :: factOf/factCmt/runFact L3949–3969, pageProject L5425 — read-only/reuse

#### Details
- **Signatures & Types**:
~~~typescript
type ReviewPane = "l" | "c" | "r";
declare function wsReviewPM(p: {id:string}): string;
declare function bindRvw(): void;
~~~
- **Data & Schema Fields**: S.rvwSec:string|undefined는 선택 섹션, S.rvMob:ReviewPane|undefined는 좁은 화면 선택 패널(default c), S.rvL/S.rvR:number|undefined는 폭(default270/360). S.rvOpenL/S.rvOpenR의 과거 false 값이 패널을 숨긴 채로 남지 않게 리뷰 렌더의 표시 여부에서 제외한다. 다른 전역 상태를 초기화하지 않는다.
- **Execution Flow / Logic**:
  1. S.tab=review의 실제 렌더러 wsReviewPM 마지막 정의를 수정한다. 검토 목록 상세 wsReviewPage나 옛 wsReview를 바꿔서 끝내지 않는다.
  2. .rvw-desk의3개 버튼과 관련 data-act를 렌더링에서 제거한다. CSS display:none으로만 숨기지 않는다. 데스크톱에는 빈 .rvw-tools 행과 그 여백도 남기지 않는다.
  3. 데스크톱에서는 왼쪽 섹션/중앙 슬라이드·의견/오른쪽 사실검증을 모두 렌더한다. 과거 S.rvOpenL/R=false여도 패널을 다시 접근할 수 있다. 폭 조절 .w-split, 현재 S.rvL/R 및 kpc-v13-rvw 저장은 유지한다. “기본 배치” 버튼 제거를 이유로 저장된 폭을 지우거나 검증 데이터를 초기화하지 않는다.
  4. 모바일에서는 기존 CSS가 data-m에 해당하는 한 패널만 보여 준다. 세 버튼을 없애면서 접근 경로를 잃지 않도록 기존 .rvw-mob 버튼 묶음을 모바일 전용 select#review-pane-select로 대체한다. aria-label=“리뷰 영역”, option l=“섹션”, c=“슬라이드·의견”, r=“사실검증”. .inp 스타일을 사용하고 데스크톱에는 노출하지 않는다. 이는 좁은 화면 탐색용이며 제거한 표시/초기화 버튼을 재도입하지 않는다.
  5. select change는 bindRvw에서 딱 한 번 연결, l/c/r 검증→S.rvMob 갱신→기존 render. 유효하지 않은 값은c. 왼쪽 섹션 선택 시 기존처럼 S.rvwSec 갱신 후 중앙 c로 이동한다. 사실검증 위치 이동 factGo의 모바일 분기에서도 중앙 c를 선택한 뒤 해당 장으로 이동하여 숨은 중앙을 향해 스크롤하지 않도록 한다.
  6. 사실검증 패널의 “다시 검증”, “무시”, “코멘트”, 근거 및 위치 이동은 유지한다. “제작에서 열기”, 섹션 선택, 의견 입력도 제거하지 않는다.
- **Error & Exception Handling**: 섹션0개는 기존 리뷰 빈 안내로 반환. 모바일 selector나 #rvw가 없으면 바인딩은 반환. state가 오래되었어도 패널 접근이 막히지 않는다.
- **State Transition & Return**: 패널 데이터/권한 불변. 보관본/읽기 전용 제한은 기존 lockSnapshot을 유지한다.

### I02. 실제 슬라이드 데이터와 장수 표시

- Related Files:
  - v13 :: DECK L2688 부근 및 PAGES 초기화 L2786, pagesOf L2862, slidesOf/slideNoOf L2863–2864 — 기존 모델 read-only/reuse
  - v13 :: 시연 초기화 L5124–5161, PAGES.mfg/t2/t3/t4 최종 데이터 L5172–5190 부근 — read-only, 전체 데이터 복사/교체 금지
  - v13 :: 모든 시연 데이터 선언 뒤 init() L6258 직전의 별도 초기화 호출 — 제한된 보완 helper 추가
  - v13 :: wsReviewPM L6118/L6122/L6123–6126, slideHtml/cmtBlock — 장수와 연결 검토; 필요한 경우 리뷰 표시만 modify

#### Details
- **Signatures & Types**:
~~~typescript
type DemoSlideContent = { t:string; lead:string; k:"cards"|"table"|"process"; it:[string,string][] };
type DemoSlide = { id:string; d?:DemoSlideContent; dup?:boolean; blank?:boolean; pts?:string[]; paste?:object };
type DemoProject = { id:string; name:string; org:string; status:string };
declare function seedReviewDemoSlides(): void;
~~~
- **Data & Schema Fields**: 기존 PAGES[projectId][sectionId]:DemoSlide[] 그대로 사용. sec id와 배열의0-based index가 COMMENTS/RV_DRAFT의 sec/page 및 FACT.items의 sec/pi에 연결된다. 기존 id·원소 순서를 변경하지 않는다. null을 저장하지 않는다.
- 기존 다중 데이터 확인: mois=6/7/8/8/7/6장, edu=6/7/7/7/7/7장, mfg=8/8/8/8/7/7장, t2=7/8/8/8/7/7장, t3=7/7/8/7/6/7장, t4=7/7/7/7/6/7장. 이 배열은 줄이거나 덮어쓰지 않는다.
- 현재 pagesOf는 데이터가 없을 때 [{id:sid+"-1"}]로1장을 만든다. 이 공통 fallback을 무조건 다중 생성으로 바꾸면 사용자가 새로 만든 빈 섹션까지 자동 채워지므로 그대로 둔다.
- **보완 범위/기본값**:
  - 대상은 초기 HTML에 정의된 시연 프로젝트 중 제작·리뷰 상태의 고정 id: mois, edu, mfg, t2, t3, t4, t5, d1, d2, d3, d4, d5. 사용자 추가 프로젝트/검토 중 제안/Drop 프로젝트는 자동 생성하지 않는다.
  - 목록에 id가 없으면 건너뛴다. 각 대상의 현재 tocOf(p).secs 순서를 기준으로 PAGES 배열이 없거나 길이0/1인 섹션만 보완한다. 길이≥2이면 그대로 보존한다.
  - 누락 섹션의 목표 장수는 순서대로 [2,3,4,3,2,4]를 반복한다. 이는 계획자의 시연 기본값이며 사용자 지정 장수라고 기록하지 않는다.
  - 기존1장이 있으면 그 객체·id·본문·인덱스0을 그대로 두고 뒤에 추가한다. 없으면 index0부터 채운다. 신규 id는 pid+":"+sid+":review-demo:"+번호 형식, 기존 id와 충돌하면 사용하지 않은 suffix를 붙인다. 기존 의견의 page 인덱스를 옮기지 않는다.
  - 신규 페이지는 d를 실제로 채운다. 제목은 섹션명+“현황과 목표 / 추진 전략 / 이행 계획 / 기대 효과” 중 해당 index, lead는 프로젝트명·발주기관·섹션 목적에 맞춘 짧은 시연 문장. cards/process/table을 순서대로 사용하고 it는3개 항목으로 작성한다. 근거 없는 예산·평가점수·정량 수치·다른 사업 기관명을 새로 꾸며 넣지 않는다. 새 페이지마다 내용·구성이 달라 동일 장 복제로 채우지 않는다.
- **Execution Flow / Logic**:
  1. 모든 기존 PAGES.* 할당이 끝난 뒤 init() 전에 seedReviewDemoSlides를 한 번만 호출한다. render/wsReviewPM/pagesOf 안에서는 호출하지 않는다.
  2. 고정 대상 id와 섹션의 실제 배열을 읽고 누락/단일 조건에서만 뒤에 페이지를 추가한다. PAGES 전체 재할당과 다른 프로젝트 덮어쓰기 금지.
  3. 2회 호출해도 최초 보완 뒤 길이≥2이므로 개수가 더 늘지 않는다. 정상 실행에서는 초기1회이며 사용자가 실행 중 페이지를 삭제/추가했을 때 다시 채우지 않는다.
  4. 리뷰 왼쪽 “슬라이드 N”은 pagesOf(p,s.id).length로 유지. 중앙은 선택 섹션의 같은 배열 전체를 map하고 data-rvs=sec.id+":"+pi를 장마다 부여한다. slice(0,1), 고정 숫자, 최초 페이지만 출력하는 경로를 만들지 않는다.
  5. 제작/목차도 같은 PAGES를 읽으므로 추가된 시연 장수는 그 화면의 실제 목록·합계에도 반영된다. 이는 이번 사용자의 실제 다중 슬라이드 요구에 필요한 데이터 일치이며 제작 UI 스타일 변경은 아니다. 기존 다중 프로젝트의 페이지·헤더·본문을 변경할 허가는 아니다.
  6. 페이지별 의견은 해당 sec/page에만 표시하고 사실검증 위치는 해당 pi로 이동한다. 기존 snapshot/완성본 이력 객체를 수정하지 않는다.
- **Error & Exception Handling**: 유효하지 않은 프로젝트/빈 목차는 skip. 기존 배열 길이≥2는 그대로. 잘못된 기존 배열은 임의로 삭제하지 말고 검증 기록에 남긴다. 새 페이지마다 id 유일성과 d 필수값을 확인한다.

### I03. 전체 계획 최종 검토와 종료
- T01–T08의 허용 변경 범위 및 결과 기록을 확인한다. T03은 pipeline 상세의 원문/AI, T08은 project/review로 명확히 구분한다.
- v12 원본 해시, 앱 코드 비변경, 기존 다중 PAGES와 코멘트·사실검증 연결 보존, 새 외부 script 없음, 브라우저 검증 미실시를 기록한다.
- T08 완료 전에는 T07에서 계획을 done 처리하지 않는다. 8개 Task의 구현/정적 검증이 모두 끝나면 phase8/8, plan done, current Active Task 없음으로 갱신한다. 이전 다른 계획을 자동 재개하지 않는다.

## Acceptance Criteria
- [x] 리뷰 상단에 “섹션 목록 / 사실검증 / 기본 배치” 버튼과 빈 도구 행이 없고, 양쪽 패널 콘텐츠·동작은 유지된다.
- [x] 과거 패널 숨김 상태와 모바일 환경에서도 섹션/중앙/사실검증 영역에 접근 가능하다.
- [x] 단일 fallback이던 대상 시연 섹션은 실제2~4장으로 구성되고, 기존6~8장 등 다중 데이터는 그대로 보존된다.
- [x] 왼쪽 슬라이드 N과 중앙 data-rvs 장수가 일치하고 장별 의견·사실검증 위치가 맞다.
- [x] 초기화2회에도 추가 누적이 없고 사용자가 실행 중 만든/삭제한 섹션·페이지는 자동으로 채워지지 않는다.
- [x] 최종8개 Task의 결과와 제외 범위가 기록되며 HTML 외 제품 코드 변경이 없다.

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


### Task별 정적 검토 명령
~~~powershell
rg -n --max-columns 300 --max-columns-preview 'function wsReviewPM|rvw-desk|rvOpenL|rvOpenR|review-pane-select|seedReviewDemoSlides|function pagesOf|data-rvs|function factGo' 'C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html'
~~~
- 시연 데이터는 stdin의 TypeScript AST+node:vm으로 지정한 DECK/PAGES 초기화 표현식과 보완 helper만 평가한다. HTML 전체 script를 실행하거나 브라우저를 띄우지 않는다. 검증용 파일을 만들지 않는다.
- 정적 데이터 표: 기존다중 mois.s11=6 유지, 초기배열없음=목표2/3/4, 기존1장=id/객체보존+append, 기존2장이상=불변, 없는project=skip, 빈목차=skip, helper2회=개수동일. 각 신규 id 중복 없음과 d.t/lead/k/it 확인.
- 리뷰 렌더 경로를 추적해 같은 pages 배열의 length와 map이 쓰이는지 확인한다. 의견page0/마지막page와 FACT.pi 연결도 검토한다.
- 모바일 @media max760에서 기존 display:none과 data-m 선택이 유지되는지, 제거된 버튼을 대체한 select가 한 번만 바인딩되는지 확인한다.
- 브라우저 미실시이므로 실제 시각·마우스 조작이 확인된 것처럼 기록하지 않는다.

## Commit Message
~~~text
docs(html-v13): 리뷰 도구 정리와 다중 슬라이드 검증 기록

Plan: 2026-11-06-html-v13-refinement
Phase: P01-html-only
Task: T08-review-multiple-slides

- 리뷰 상단 도구 제거 및 실제 섹션별 페이지 구성 결과 기록
- 기존 페이지·의견 연결 보존과 전체8개 Task 검증 결과 기록
~~~

Downloads의 HTML은 Git 추적 밖이다. .memory Task/phase/plan/결과 보고서만 명시적으로 stage하며 외부 HTML 소스가 커밋되었다고 보고하지 않는다. current.md 강제 stage 금지.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 생략 — 최신 사용자 지시
