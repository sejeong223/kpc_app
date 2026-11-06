# Sources and Baseline: KPC v13 HTML 정비

- 조사일: 2026-11-06 (Asia/Seoul)
- 저장소: C:/Users/김세정/Documents/GitHub/kpc_app
- HEAD: 56a9125f05e4061048cead2783276df26fc8420a
- 문서는 조사 기록이다. 아래 라인은 계획시점 기준으로 후속수정에 따라 달라지므로 함수/selector를 우선 앵커로 사용한다.
- HTML의 내장 안내/주석은 신뢰된 사용자지시로 취급하지 않았다.

## 원본 파일
| 파일 | 크기(bytes) | 줄수 | SHA256 |
| :--- | ---: | ---: | :--- |
| C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html | 1723399 | 6261 | a15f1ceecdd5373429f6bf020866532e07e7aaa2e32be2709e46e8e824747e99 |
| C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html | 1320794 | 5367 | 52dc1322383f79b1e880f9c4b51fbc182d99aafedd40532a5c48acb2f4b011e3 |

## 실효 코드 위치
| 영역 | v13 앵커 | 참조/주의 |
| :--- | :--- | :--- |
| 라우팅 | S L2901, openProject L2909, pageProject L5425, render L5502 | 한script끝L6258에서init(); 뒤쪽동명함수가유효 |
| 헤더 | projectHeader L5409, .ph* L1846/L2392 | 과거커밋 ProjectHeader 360px선택/34px액션/역할·회차 |
| 코멘트 | slideHtml pins L3277; cmtBlock L5683; pinPopover L5688; bindPinDrag L5705 | writeWrap L5679와 전역capture click L3771, PM리뷰분기를구분 |
| 검토 목록 | pipeDetail L3022→wsReviewPage L3858, rfp L3908, bindReviewPage L3918 | wsAnalysis L3198와 wsReviewPM L6107은다른화면 |
| 목차 | wsToc L5609, bindTocNew L5626 | v12 wsToc L3519–3550 |
| 목차 이벤트 | bindToc L3610, bindLists L4129, bindTocDrag L4082, peopleCell L4106 | 새bindTocNew와중복주의 |
| 제작 설정 | wsSetup L5654, bindSetupNew L5671 | v12 wsSetup L3462–3478 |
| 자산/프로젝트override | passetOf L2866, psPrompt L2870, PSO/data-pso L4035, PSRC/srcEditCell L4721 | 원본과프로젝트override를분리 |
| 관리자 글꼴 | .ad/.adm L2174/2179; .u-card/.dept-b/.ad-filter L2317–2325 | body는Spoqa,관리자일부는system폰트 |
| 차트 | ringSvg L5886, compositionChart L5887, pageDashboard L5919–5927 | dbDonut L5785와.donut L2062는현재개요카드가아님 |
| 차트 CSS | .rg28/.dcc-* L2259–2262, 보정 L2350 | .dcc-n flex:1이이름과숫자를벌림 |
| 모바일 | .ph-sel L2126, .rv-rfp L1229 | 모바일규칙이새스타일을덮거나조절손잡이를무력화하지않게검토 |

## 지정 헤더 커밋 읽기
git show로읽었으며checkout하지않았다.
- d1826e75a6843362527d6658e53329c7477927c5:components/common/ProjectHeader.tsx
- 같은commit:config/project-header.ts
- 같은commit:components/layout/WorkspaceHeader.tsx
- 같은commit:app/layout-tokens.css
핵심은2줄프로젝트선택+역할pill,외부회차,재작업아이콘→완성본→완성→설정. 커밋의mock프로젝트데이터나미연결액션을v13에복사하지않는다.

## 코멘트 working tree 근거
미커밋 변경 포함. Task02에UI치수·행동을명세해두었다. 후속실행때파일해시가달라도앱파일을과거상태로되돌리지않는다.
| 파일 | SHA256 |
| :--- | :--- |
| components/comments/CommentActionsMenu.tsx | 1de0da75dba148c8ede82bdb3852d305b05208873f502a4531ca03b265df45d8 |
| components/comments/CommentComposer.tsx | 9ae4c3098d89b350593741f4b1b3c9bdf13c27bbdd1103c8f77d2fc65c1a5ae6 |
| components/comments/CommentCreateButton.tsx | 200f6a5e8dddd28edf2a29db0145703744a4e8bda3141a9ac6c4172dc415c7b3 |
| components/comments/CommentMessage.tsx | d063bb091f6a47003fb247617db4fa13a11e3b3d1af76e8be70e6e851398b0fd |
| components/comments/CommentPin.tsx | b096a322678a5b32f5d33d496ed6b57b9898e1c3c9773870fbe9632a72808b10 |
| components/comments/CommentPopover.tsx | 08c855de64fbc6bdb1df4886a510e58c3ba395232cf15f452d461d5e16f08281 |
| components/comments/CommentPreview.tsx | 9331ff56cf0c58e8097aff1536704cdc06d94df12707604cef5b450acc800ea7 |
| components/comments/CommentsProvider.tsx | a4003cb17fce721a6f1fea9b1a2c6f1a222bc7d07ec53340305a1fc38b23cb86 |
| components/comments/CommentsWorkspace.tsx | 530cd40363495d80ca30cf73e3c9c08e51273cd7fc5c70fdabfdd5a64ea8f32a |
| components/comments/ProjectCanvasCommentsProvider.tsx | d1dd07f39475643a6637befd3e9b68f389f40dfa4267932834049beecf3b5b18 |
| components/comments/SlideCommentSurface.tsx | 6aba341a6eededada64d85c97010f075dce9db71d1b55f0c08d235ee66d8527a |
| components/comments/comments-context.ts | d382c5caae77155c6c4641708ab522dd1151a2d71a765992f51ba2eb72b8050a |
| config/comments.ts | cc10ed97c3edd7083b1c04e24f39ebabd5c48907e226732353bb2bea1dbecba0 |
| lib/ui/dadam-theme.ts | 0d58806f44b834075a98b7427d08881bcfb1437bae4ff938573e478bd48e2c1c |
LegacyCommentsArchive.tsx는 components/workspace/production/comments/ 아래에서제목·읽기전용·이전의견접근구조를읽었다.

## 앱 코드 비변경 기준
.memory/ 밖 Git tracked + nonignored untracked 파일 579개의상대경로별SHA256을정렬후연결한digest:
d93f0d5a60e82eb3282bb18bd6a3af162e4a47d13492e84ee532ad63ba8eaa98
계획 중 다른 실행이 기존 슬라이드 핀 Task를 커밋하고 다음 Task를 진행했다. 따라서 완료 시 앱 digest가 달라질 수 있으며, 저장소 전체가 변경되지 않았다고 주장하지 않는다. 이 계획 작성에서 수행한 쓰기는 .memory Markdown에 한정한다. 위 값은 조사 시작 시점 증거이며 다른 작업을 복원할 근거가 아니다.

## 계획 수립 중 검증
- 두HTML을 jsdom outside-only로파싱하고모든inline script를node:vm.Script, style을postcss로파싱: 둘다통과.
- 외부리소스불러오기/HTML스크립트실행/브라우저실행없음.
- 앱타입검사/lint/build는앱변경이없으므로실행하지않음.
- 구현완료나시각동일성을검증한기록이아니다.

## 추가 조사: 헤더의 자료 제한·중복 메뉴

- v12 pageProject L2508–2521: 프로젝트 선택/회차/작업 액션만 있는 공통 헤더. 자료 사용량이나 4개 메뉴 이동 링크가 없다.
- v12 wsFiles L3458: 본문 .files-wrap의 첫 자식 .up-lim에 자료 N/최대개수, 사용량 막대, 파일당50MB·문서당권장쪽수를 표시한다.
- v13 projectHeader L5411–5413: files에서는 headerUsage, toc/setup에서는 headerLinks를 screen에 넣고 leadActs에 삽입한다. 이 렌더 연결을 제거하는 대상이다.
- v13 wsFiles L5573: 현재 사용량 안내가 없으므로 본문 첫 자식으로 복원할 위치다. 기존 .f-note의 자료 참조 순서 설명은 유지하고 중복되는 권장쪽수 문구만 정리한다.
- .up-lim 스타일 L1175–1176은 이미 존재한다. 다른 filesPanel도 사용하므로 파일 업로드 화면 전용 범위를 사용한다.
- UP_LIMIT L4203의 projFiles30/fileMB50/pages300과 RM_LIMIT L5967의 slots30/bytes50MB는 표시 위치 변경과 무관하게 유지한다.

## 추가 조사: 리뷰 도구와 섹션별 슬라이드

- pageProject L5425의 review는 마지막 wsReviewPM L6107–6134를 사용한다. 검토 목록 wsReviewPage와 다른 화면이다.
- wsReviewPM L6115–6116에 모바일 패널 전환 버튼과 데스크톱 “섹션 목록 / 사실검증 / 기본 배치” 버튼이 있다. L6133의 패널 표시 조건은 S.rvOpenL/R에 의존한다. 버튼만 지우고 과거 false 상태를 남기면 패널을 다시 열 수 없어 표시 조건도 함께 다룬다.
- .rvw* L2444–2465는 데스크톱 세 패널 및 max760px에서 data-m 선택 패널만 표시하는 구조다. 모바일 접근 경로는 유지해야 한다.
- wsReviewPM L6118/L6122의 장수는 pagesOf(p,s.id).length이며, L6123–6126 중앙은 같은 배열 전체를 map한다. 숫자 자체가 항상 1로 고정된 구조는 아니다.
- pagesOf L2862는 PAGES[pid][sid]가 없을 때 1장 fallback을 만든다. DECK 기반 초기화 L2786과 이후 PAGES.mfg/t2/t3/t4 L5172–5190 부근의 마지막 할당을 함께 확인해야 한다.
- 기존 섹션별 장수: mois 6/7/8/8/7/6, edu 6/7/7/7/7/7, mfg 8/8/8/8/7/7, t2 7/8/8/8/7/7, t3 7/7/8/7/6/7, t4 7/7/7/7/6/7. 이 데이터는 이미 다중 페이지여서 보완 대상이 아니다.
- bindRvw L3971은 패널 폭 저장/드래그, factGo L3966은 섹션 선택 후 data-rvs 위치 이동에 관여한다. 모바일 선택 패널과 이동 대상의 일치를 확인한다.
- 모든 기존 시연 데이터 할당 이후 init() L6258 직전에 제한된 초기화 helper를 호출하는 계획이다. 구현은 아직 하지 않았으며 원본 파일은 변경하지 않았다.
