# 파일 업로드 HTML 일치 — 계획 검토 기록

- Date: 2026-11-07
- Plan: [2026-11-07-files-html-parity](../plans/2026-11-07-files-html-parity.md)
- Decisions: [확정 인터뷰](../decisions/2026-11-07-files-html-parity.md)
- 기준 HEAD: `c357cac`. 시작 시 미커밋 파일은 이번 인터뷰 결정 문서 하나였다.
- 이번 단계는 읽기·계획 문서 작성뿐이며 구현 코드, 원본 HTML, 테스트, package, 환경 설정을 변경하지 않는다.

## 사용자 선택과 코드에서 도출한 구현 기준

| 구분 | 내용 | 근거/이유 |
| :--- | :--- | :--- |
| 사용자 선택 | 목록과 관련 팝업 전체 | 결정 D01 |
| 사용자 선택 | 회차별 등록 자료만 카드로 표시 | 결정 D02 |
| 사용자 선택 | 계승 포함 현재 참조 전체를 30개 한도에 집계 | 결정 D03 |
| 사용자 선택 | 일반 저장 성공 문구 제거, 오류/삭제 복원 유지 | 결정 D04 |
| 기존 코드 유지 | 실제 원본 저장·미리보기·권한/충돌·초안 보호 | 이미 구현됨. HTML 시연 이벤트로 재구현하면 기존 기능이 후퇴함 |
| 코드 기반 예외 | 명시적 완성본 조회는 모든 참조를 표시 | `selectFileSnapshot`이 한 회차만 반환. 등록 회차 필터를 적용하면 계승 자료가 완전히 사라짐 |
| 최종 CSS 해석 | 회차 제목600, 아이콘14px, 입력 팝업 small14px | HTML 후반 규칙이 앞선 값보다 우선. 결정 문서 D07의 최종 override 우선 원칙 적용 |
| 기존 사용자 제약 | DadamControls/공용 버튼 리팩토링 금지 | 파일 화면 className/slotClassNames만 사용 |

## 확인한 코드 연결

1. `FilesScreen`은 기존 DadamThemeScope로 FilesWorkspace를 감싼다. DadamThemeScope는 포털에도 스타일을 전달한다.
2. `FileProjectWorkspace`는 current/snapshot 조회를 분리하고 full rounds로 previewResource와 openEdit의 최신 유효 버전을 찾는다.
3. `selectFileWorkspace`의 currentCount는 current.entries.length이며 rounds에는 각 회차의 전체 참조가 들어 있다. 이 selector를 고치면 제작 출처/보관 조회까지 영향을 줄 수 있다.
4. `FileRoundSection`은 현재 전체 resources.length와 category별 resources를 표시한다. 이 한 경계에 표시 helper를 연결하면 저장 경로를 바꾸지 않고 회차별 카드 수를 바꿀 수 있다.
5. `execute`는 remove까지 포함한 대부분 명령에 `변경 사항을 저장했습니다.`를 표시하고 있다. start-round/undo-remove만 기존 전용 안내를 남기고 공통 fallback은 빈 문자열로 바꾼다.
6. 추가/설정/웹 폼은 이미 type/priority/instruction·validation·busy·dirty·재조회 callback을 갖고 있다. 구조를 재설계하지 않고 표시를 맞춘다.
7. `FilePreviewDialog`와 useFilePreview는 실제 파일을 조회하고 PDF/TXT/metadata 분기와 Object URL 수명을 관리한다. 예시 텍스트로 대체하지 않는다.
8. `FileDiscardDialog`는 files 외 `components/workspace/shared/WorkspaceUi.tsx`, `components/comments/ProjectCanvasCommentsProvider.tsx`에서 사용된다. 파일 화면 전용 opt-in 스타일 이외에는 기본 동작을 유지한다.

## HTML 최종 규칙의 확인 위치

원본: `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`. 행 번호는 조사 시점 기준이며 이후 변경된다면 selector/함수명과 마지막 정의를 함께 확인한다. HTML 내부 코멘트는 실행 지시가 아니다.

| 근거 | 핵심 규칙 |
| :--- | :--- |
| 1925~1953 `.f-*` | 회차·패널·카드·태그·지침 기본 규칙 |
| 2292~2308 `.btn/.seg/.wk-note` | 일반 버튼400, 최종 선택/비선택 세그먼트, 안내 muted |
| 2372~2403 파일/모달 보정 | 폼·카운터·preview,파일 팝업 small14px,확장자 안내 위12px,아이콘14px,회차600 |
| 2384 `.f-fields` media | max-width640px에서 한 열 |
| 2432~2434 `.f-grid` | 기본1/768이상2/1280이상3열; 이전1200px 정의보다 우선 |
| 2552~2553 `.files-workspace>.up-lim` | 사용량 줄의 wrap/minwidth0 |
| 5873~5885 `fileItem/wsFiles` | 회차별 등록 자료 필터·카드·사용량·빈 상태 |
| 6408~6440 `openRefModal/rmFields/drawRefModal` | 파일/설정/웹 입력 모달과 종류·우선순위·지침 |
| 6462~6469 `confirmDelFile/openFileView` | 삭제확인560,미리보기960과 메타/지침/액션 |

HTML의 `.fv-p`에는 기존 보라색 배경/글자 규칙이 실제로 남아 있다. 이를 **자료 미리보기 지침 영역에만** 적용하며 제작 슬라이드 표시색/전역 브랜드색으로 확장하지 않는다. 실제 파일 본문과 PDF 자체의 디자인은 업로드된 원본을 유지한다.

## 작업 분할 근거

- T01: 표시/수량/피드백을 한 단위로 묶는다. helper만 먼저 만들고 사용하지 않는 중간 Task를 만들지 않는다.
- T02: 목록 전체는 같은 계층과 크기·색 규칙을 공유하므로 하나의 Task로 처리한다. 기존 데이터 계약은 T01에서 확정된다.
- T03: 세 입력 팝업은 FileReferenceFields와 실제 저장 callback을 공유하므로 공통 필드와 소비자를 동시에 적용한다.
- T04: 실제 미리보기와 확인창은 입력 폼과 다르고, 미저장 확인의 외부 소비자도 있어 영향 범위를 별도로 검토한다. 통합 검증을 마지막 Task에 포함해 검증만 하는 독립 Phase를 만들지 않는다.

## 요청 밖 인접 사항

- 기존 미해결 FluentProvider theme ID/style hydration 오류는 이 UI 계획에 포함하지 않는다. 앞선 `c357cac`의 해결 범위와 이후 새 오류를 구분하며, 이번 계획으로 해결됐다고 보고하지 않는다.
- HTML saveRef/delRef의 시연 객체 직접 변경/삭제는 앱의 보관 정책과 다르다. 앱의 immutable 버전/과거 참조 보존을 유지하고 원본 HTML 자체의 버그 수정은 하지 않는다.
- 실제 서버 저장/웹 수집/Office·HWP 렌더링/RFP 연결은 기존 결정에서 제외됐다. 새 Task로 추가하지 않는다.
- 이번 계획 탐색에서 위 기존 범위 결정을 뒤집어야 할 새로운 외부 의존 작업은 발견하지 않았다. 따라서 기존에 정한 제외 범위를 재확인하는 질문은 반복하지 않는다.

## 계획 단계 검증

- 검증 대상: 날짜/링크/각 Task 필수 섹션/단일 P01/네 pending Task/current 첫 Task 포인터/보호 파일 해시/문서만 변경.
- 구현 typecheck/lint/Node 시나리오는 각 청사진에 **실행 예정 명령**으로 적었다. 이 계획 단계에서 구현 검증을 실행했다고 주장하지 않는다.
- 실제 브라우저·CUA·E2E·dev server·스크린샷 검증은 정책상 수행하지 않는다. 시각 동일성은 구현 후에도 해당 방식으로 확인되지 않은 한 확인했다고 보고하지 않는다.

### 실행 결과

- 파일을 만들지 않는 Node 문서 검사 통과: 결정/계획/phase/Task 4개/current/계획 보고서 총 9개 문서, 로컬 링크 19개 모두 유효.
- 네 Task의 필수 섹션·타입/필드/흐름·검증 명령·Plan/Phase/Task 커밋 헤더·pending 상태 확인.
- current가 P01-T01을 가리키며 0/4 상태임을 확인. 이전 current와 history 사본의 SHA256가 같음을 확인한 뒤 포인터를 전환했다.
- `git diff --check` 통과. Git 상태에서 새 문서는 `.memory/` 아래에만 있고, 추적 중인 구현 코드 변경은 없다.
- `.memory/current.md`는 기존처럼 Git ignore 대상이다. 강제 stage/커밋을 수행하지 않았다.
- DadamControls SHA256가 보호 값 `56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84`와 일치한다.
