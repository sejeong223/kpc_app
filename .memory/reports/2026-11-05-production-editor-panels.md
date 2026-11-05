# 제작 화면 구현 완료 기록

- Plan: 2026-11-05-production-editor-panels
- Workspace: C:/Users/김세정/Documents/GitHub/kpc_app
- 기준 커밋: 8158744
- 실행 요청: 사용자 `$mea` — 활성 포인터의 남은 T01~T04 순차 실행
- 최종 상태: 완료 — T01~T04 done 4/4

## 결과

기존 `/workspace/write`의 헤더와 작업 영역 코멘트 아래에 전체 슬라이드 목록, 문서형 편집과 저장본 미리보기, 읽기 전용 출처를 연결했다. 새 공용 컴포넌트·CSS·패키지·DB 스키마는 추가하지 않았다.

- 목록: 장→소목차→슬라이드 순서와 번호, 단일/Ctrl·Command/Shift 선택, 우클릭·더보기, 추가·복제·복사·붙여넣기·이동·삭제·기존 undo.
- 편집: 제목·리딩 메시지·문단·목록·표·기존 이미지, 명시적 반영, Template 연결 보조 설정, 원시 입력과 충돌 보호.
- 표시: 같은 저장본을 중앙과 썸네일에 표시. Template 미연결은 기본 960×540/16:9, Template 접근 실패는 오류로 표시. 가시 영역 근처에서 조회하고 이미지 Blob URL을 소비자별로 해제한다.
- 출처: 소목차/명시 참조 RFP와 참조 자료. 정확한 프로젝트·회차·asset·version이 일치하는 원문만 연다. 보관본에 현재 자료를 보충하지 않는다.
- 시연 AI: 단일·다중 대상 요청, 생성 전후 비교, 선택 적용, 원문 유지, 다시 생성, 전체 대상 권한 확인, 오래된 제안과 취소 후 늦은 결과 차단.
- 패널: 기존 Dadam/레이아웃 토큰, 내부 스크롤, 접기·크기 변경·작은 화면 전환, 사용자 namespace별 설정 복원.

## Task와 커밋

| Task | 결과 | 커밋 |
| --- | --- | --- |
| T01 | 문서형 편집기·구조 변환·초안/Template 연결 보존 | cf2a22f |
| T02 | 기본/Template 미리보기·저장 이미지·읽기 전용 출처 | 23388bf |
| T03 | 기존 코멘트 화면에 세 패널과 전체 슬라이드 조작 통합 | 5aac83f |
| T04 | 중앙 AI 비교 적용·취소 보완·최종 통합 검증 | 이 보고서를 포함한 `Task: T04-ai-integration` 커밋 |

## 실제 실행한 검증

| 검사 | 결과 |
| --- | --- |
| `npm.cmd run typecheck` | 통과 |
| Task별 `npx.cmd eslint <변경 파일>` | 통과 |
| `npm.cmd run lint` | 전체 통과 |
| `npm.cmd run build` | 최종 소스 기준 production build 통과 |
| `git diff --check` | 통과 |
| `git diff --cached --check` | 통과 |

인라인 검증은 리터럴 PowerShell here-string을 `node --import tsx -`에 전달했다. 새 검증 파일이나 tests/ 폴더를 만들지 않았다.

| 묶음 | 집계 assertion | 내용 |
| --- | ---: | --- |
| T01 | 27 | 문서 왕복·ID·빈 문자열·한글·목록/표 명령·불변성·미지원 붙여넣기·초안 회차 충돌 |
| T02 | 34 | 전체 순서/번호·출처 중복/정확한 버전·미연결 RFP·fingerprint·이미지 대상/권한/버전·쓰기 0회 |
| T03 | 27 | 두 섹션의 추가/복제/이동/삭제·마지막 슬라이드·undo·권한 혼합·회차/보관본 거절·정적 연결 |
| T04 요청 수명 | 20 | 실제 React/Query 훅과 지연 응답 대역으로 취소·연속 요청·오류 후 재생성·다른 scope·unmount 후보 폐기 |
| T04 서비스/회귀 | 33 | 실제 서비스+인메모리 저장소로 단일/다중 제안·생성 시 무변경·선택 적용·권한/고정/보관본/stale 거절·실제 코멘트 1건 보존·연속 빈 줄 |
| T04 문서 UI 상태 | 6 | jsdom/React와 UI 대역으로 입력 dirty·반영 후 재렌더 초기화·키보드 이미지 선택·읽기 전용 속성 |
| 합계 | 147 | 성공 실행에서 집계한 검증 수 |

정적 검토에서는 현재 라우트 유지, 본문에 헤더/PPT/이전 슬라이드 코멘트 중복 없음, 안정적인 편집기 key, navigate 취소 후 선택 변경 없음, 저장본/초안 분리, Template binding 필터, Tailwind의 `components/workspace` 탐색, 실제 제어 요소에 한정한 `data-comment-control`을 확인했다.

## 변경을 이해하기 위한 노트

### T01

- `document-editor.ts`는 DOM과 기존 `SlideContent` 사이를 변환한다. `readSlideDocument(root, previous)`가 실패하면 원시 입력을 남기고 반영을 막는다.
- `SlideContentEditor.tsx`는 입력마다 DOM을 다시 만들지 않아 커서를 보존한다. `use-slide-draft.ts`는 삭제되거나 종류가 바뀐 블록의 Template 연결만 제거한다.
- 블록 ID는 `bindings[].key`와 연결되므로 텍스트 수정 때 새 ID를 만들면 안 된다.

### T02

- `productionPreviewFingerprint(view, slide)`에는 content/template/usedSettings/사용 자산 상태가 들어간다. 전체 프로젝트 revision을 넣지 않아 코멘트 저장만으로 PPT를 재생성하지 않는다.
- `loadSlideImage({slideId, blockId, expected, ...})`는 대상 슬라이드의 이미지 참조를 검증한다. UI에서 임의 Blob ID를 읽는 통로를 만들지 않았다.
- RFP 원문 파일은 현재 모델로 특정할 수 없다. 유사 파일명으로 연결하지 않는다.

### T03

- 선택과 후처리는 `runtime.navigate(async () => { ...commitSelection(...) })` 안에 있다. navigate가 취소되어도 resolve되므로 `.then(setSelected)`로 성공을 추정하면 안 된다.
- 편집기 key는 프로젝트/보관본/슬라이드다. revision·회차·권한을 넣으면 외부 변경 시 초안을 잃는다.
- 원시 입력과 한글 조합 시작도 초안 revision을 고정한다. 외부 삭제/회차 변경/권한 회수에는 입력을 보존하고 저장을 막는다.

### T04

- `generationRef`는 요청 순번이다. `input.generation !== generationRef.current`이면 늦게 온 후보를 `discardProposal`로 정리한다. abort만으로 응답이 사라진다고 가정하지 않는다.
- 적용 요청은 제안의 `baseRevision`을 유지한다. 최신 revision으로 바꿔 보내면 사용자가 비교하지 않은 내용에 제안을 덮어쓸 수 있다.
- 함께 보완한 통합 경계: 연속 빈 줄 보존, 반영 직후 재렌더에서도 편집기 초기화 완료, 키보드 이미지 선택, 이미지 URL 폐기 상태, 기존 `--kpc-muted` 색상 토큰, 자료 조회 중의 중립적인 카드 제목.

## 한계와 미실시 범위

- 기본 16:9는 화면 미리보기다. Template 없는 PPT 출력 기능을 추가하지 않았다.
- AI는 기존 mock이다. 실제 모델/RAG/파일 분석·과금은 연결하지 않았다.
- RFP 항목은 현재 모델의 원문 미연결 상태를 표시한다. 실제 file 출처만 원문을 연다.
- 코멘트는 작업 영역 전체 좌표 기준이다. 슬라이드별 코멘트로 이관하지 않았다.
- 브라우저·CUA·E2E·스크린샷·검증용 dev server를 실행하지 않았다. 실제 반응형 배치·핀 위치·한글 IME·드래그·PDF/이미지 렌더링을 검증했다고 주장하지 않는다. jsdom 검사는 실제 브라우저 검증과 다르다.
- 빌드에서 기존 `baseline-browser-mapping` 데이터가 오래되었다는 경고가 나왔다. 빌드 차단 오류는 아니며, 이 작업에서 패키지는 변경하지 않았다. 필요하면 의존성 유지보수 작업에서 갱신할 수 있다.
- 그 외 범위 밖 결함 발견: 특이사항 없음. 저장 데이터 초기화·기존 파일 일괄 삭제·push·배포는 하지 않았다.

## T05~T07 UI 수정 — 2026-11-05

사용자가 지적한 상단 텍스트 토글, 편집 입력의 식별성, 기본 배치 버튼, 페이지 전체 스크롤 문제를 기존 계획에 추가하여 순차 구현했다. 최초 T01~T04 기록은 이력으로 보존한다.

| Task | 커밋 | 결과 |
| --- | --- | --- |
| T05 | 53555be | 패널 헤더 접기 아이콘·접힌 rail·모바일 아이콘 전환, 상단 토글/기본 배치 버튼 제거 |
| T06 | 15c2aaa | 편집 입력→반영→문서 도구, AI/Template보다 직접 편집 우선, 상태별 안내 |
| T07 | 이 보고서를 포함한 Task: T07-viewport-scroll 커밋 | 제작 셸부터 높이 연결, 패널 내부 스크롤, 오류/undo 내부 배치 |

새 공용 컴포넌트·구현 파일·의존성·DB/서비스 변경 없음. 기존 구현8개 파일을 수정했다.

### 검증

- Task별 typecheck/변경 파일 lint/diff, 최종 전체 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` 통과.
- T05 실제 ProductionPanels/useProductionPanels + UI 대역:19개. 토글/포커스/aria 연결/DOM 유지/모바일과 데스크톱 상태 독립/너비와 namespace 복원.
- T06 실제 SlideContentEditor/document-editor + UI 스타일 대역:16개. 입력 순서·구조와 ID 보존·dirty/readonly/busy/error/reset/도구 펼침 중 DOM 유지.
- T07 실제 AppShell/ProductionScreen + context/query/UI 대역:10개. 경로 한정 variant, 안내/오류/접근 거부 중 Flow 유지 및 권한 전달.
- 합계45개. stdin으로만 실행, 새 테스트 파일/폴더 없음. CSS 수치 복제 테스트나 jsdom 레이아웃 측정 없음.
- 각 Task Execution Record에 반응형/선택 상태/높이 경계 정적 검토표 기록. 실제 브라우저 배치·scrollbar·핀·IME·드래그 실측은 미실시.

### 핵심 변경과 알아야 할 점

- `ProductionPanels.tsx`는 `left(toggleButton)`/`right(toggleButton)`으로 상태와 제목 행을 연결한다. `SlideNavigator.tsx`와 `SourcePanel.tsx`는 전달받은 아이콘을 고정 헤더에 배치하고 본문만 스크롤한다. 접기 때 JSX 트리를 제거하지 않아 중앙 초안과 좌우 DOM을 보존한다.
- `SlideContentEditor.tsx`는 입력을 항상 펼치고 `<details><summary>문서 도구</summary>…</details>`만 기본으로 접는다. title/lead/blocks 변환과 원시 DOM 수명은 그대로다.
- `ProductionWorkspace.tsx`는 기존 ActiveSlide에 `aiControls`/`aiFeedback`을 전달해 직접 편집 다음에 보이게 한다. 편집 세션 key와 dirty guard를 유지했고 다중 선택에서 한 장씩 편집하는 버튼도 기존 chooseSlide를 거친다.
- `AppShell.tsx`는 `isProduction`일 때만 root/column/main의 높이를 제한한다. `CommentsWorkspace.tsx`, `ProductionScreen.tsx`, `ProductionWorkspace.tsx`, `ProductionPanels.tsx`까지 `flex: 1; min-height: 0`을 연결한다. 자식 overflow만 지정하면 상위의 기본 최소 크기 때문에 페이지가 계속 늘어날 수 있어 부모도 함께 수정했다.
- 코멘트 surface의 `overflow: visible`, 비율 좌표·핀 측정·팝업 위치는 유지한다. scrollbar를 없애려고 전역 body나 코멘트 surface를 잘라내면 팝업/핀을 가릴 수 있다.
- 헤더 기능·선택 provider·서비스 권한·저장 모델·원문 버전·AI 검토/적용 계약은 변경하지 않았다. 새 데이터나 예시 슬라이드를 자동 생성하지 않는다.

### 범위 밖 발견

기존 baseline-browser-mapping의 데이터 갱신 경고는 빌드 성공과 함께 남아 있다. 이번 UI 범위에서 패키지를 변경하지 않았으며 필요 시 의존성 유지보수에서 다룬다. 그 외 특이사항 없음. push/배포·DB 초기화·브라우저 검증·tests/ 생성/복원은 수행하지 않았다.