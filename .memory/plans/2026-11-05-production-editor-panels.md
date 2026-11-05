# Plan: 제작 화면 슬라이드 목록·문서 편집·출처 패널

- Date: 2026-11-05
- Status: done — T01~T07 완료
- Decision: [확정 인터뷰](../decisions/2026-11-05-production-editor-panels.md)
- Baseline: `8158744`; 계획 시 생산 코드 변경 없음. 이번 대화에서 만든 결정 문서만 미추적 상태였다.
- Revision: 2026-11-05 사용자 피드백 반영. 계획 수정 기준 HEAD `fc246ca`. 계획 수정 당시에는 `.memory/`만 변경했고, 이후 mea로 T05~T07 구현을 완료했다.

## Goal

현재 `/workspace/write`의 헤더·작업 영역 코멘트를 보존하면서 전체 슬라이드 목록, 문서형 편집과 슬라이드 미리보기, 읽기 전용 출처를 연결한다. 프로젝트·회차·권한·저장은 기존 runtime을 사용하며 단일/다중 슬라이드의 시연 AI 비교·선택 적용을 제공한다.

완료 시 문단·목록·표를 한 문서형 영역에서 편집하고 명시적으로 반영할 수 있으며, 저장한 내용이 중앙과 썸네일에 일치한다. Template 없는 슬라이드는 기본 16:9로 표시한다. 출처는 저장된 원문 버전만 연다. 기존 헤더·핀·답글·멘션·회차 동작을 이중으로 렌더링하지 않는다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | T01~T07 완료 | [P01](../phases/2026-11-05-production-editor-panels/P01-production-editor/phase.md) |

## Tasks and Dependencies

| Task | 작업 결과 | 주요 파일 | 선행 |
| --- | --- | --- | --- |
| T01 | 구조 데이터를 보존하는 문서형 편집기 | `document-editor.ts`, `SlideContentEditor.tsx`, `use-slide-draft.ts`, `editor.ts` | 없음 |
| T02 | 기본/Template 미리보기와 실제 출처 조회 | `presentation.ts`, `use-production-preview.ts`, `BasicSlidePreview.tsx`, `ProductionPreview.tsx`, `SourcePanel.tsx`, `WorkspaceProductionService.ts` | T01 |
| T03 | 현재 코멘트 화면에 세 패널·전체 슬라이드 조작 연결 | `ProductionScreen.tsx`, `ProductionWorkspace.tsx`, `SlideNavigator.tsx`, `ProductionPanels.tsx`, `ProductionToolbar.tsx`, `CommentsWorkspace.tsx`, `WorkspaceFlow.tsx`, `use-production-panels.ts` | T01, T02 |
| T04 | 중앙 AI 요청·비교·선택 적용과 통합 검증 | `WorkspaceFlow.tsx`, `ProductionAiPanel.tsx`, `ProductionWorkspace.tsx`, `ProposalReview.tsx`, `use-workspace-proposals.ts` | T03 |
| T05 | 패널 헤더 접기 아이콘·접힌 세로 영역, 상단 토글/기본 배치 버튼 제거 | `ProductionPanels.tsx`, `ProductionWorkspace.tsx`, `SlideNavigator.tsx`, `SourcePanel.tsx` | T04 완료 |
| T06 | 중앙 상단 편집 입력 식별성·직접 편집 우선 배치·상태별 노출 | `SlideContentEditor.tsx`, `ProductionWorkspace.tsx` | T05 |
| T07 | 제작 경로 높이 제한·패널 내부 스크롤·통합 검증 | `AppShell.tsx`, `CommentsWorkspace.tsx`, `ProductionScreen.tsx`, `ProductionWorkspace.tsx`, `ProductionPanels.tsx` | T06 |

단일 UI 기능이고 서버·인프라 이행 단계가 없으므로 Phase는 하나다. 편집 데이터 변환과 읽기 화면을 먼저 준비하고 마지막에 기존 화면과 연결한다. 각 Task는 이전 파일의 호출 계약을 유지하거나 같은 Task에서 호출부까지 갱신하여 타입 검사 가능한 단위로 끝낸다. 검증만 하는 빈 Task는 만들지 않는다.

## UI Correction — 2026-11-05

사용자가 지적한 네 가지를 D11~D13에 반영한다. 완료 Task를 미완료로 되돌리거나 기존 구현을 다시 실행하지 않고 같은 P01에 T05~T07을 추가한다. 이하 최초 계획의 파일 트리는 T01~T04 이력이며 **이번 수정 파일 범위는 아래 트리**다.

- 목록/출처 접기: 상단 텍스트 토글 → 각 패널 헤더 아이콘. 접혀도 세로 영역과 펼치기 아이콘을 남긴다.
- 편집: 중앙 상단에 `편집` 제목·문서 입력·반영 동작을 표시한다. 구조 도구·AI·Template보다 직접 입력을 먼저 보이게 한다. 빈 섹션/다중 선택/읽기 전용 상태도 이유와 진입 경로를 표시한다.
- 기본 배치: 상단 버튼을 제거한다. separator의 Home 너비 복원은 유지하며 슬라이드 내용·Template를 변경하지 않는다.
- 스크롤: T03의 최소420px/viewport 수동 계산을 대체한다. 제작 전용 셸 높이와 flex 축소를 연결해 목록·중앙·출처 안에서 스크롤한다. header·comment 기능은 유지한다.

```text
components/
├─ layout/
│  └─ AppShell.tsx                    [modify T07] 제작 경로만 viewport 높이 제한
├─ comments/
│  └─ CommentsWorkspace.tsx           [modify T07] 헤더 아래 남은 높이 전달
└─ workspace/
   └─ production/
      ├─ ProductionPanels.tsx        [modify T05,T07] 아이콘·rail·패널 스크롤
      ├─ ProductionWorkspace.tsx     [modify T05,T06,T07] 슬롯·편집 순서·안내 배치
      ├─ SlideNavigator.tsx          [modify T05] 고정 헤더에 접기 슬롯
      ├─ SourcePanel.tsx             [modify T05] 고정 헤더에 접기 슬롯
      ├─ SlideContentEditor.tsx       [modify T06] 편집 제목·입력·보조 도구
      └─ ProductionScreen.tsx        [modify T07] 본문 flex 연결·상태 안내
```

새 구현 파일·디렉토리·공용 컴포넌트는 만들지 않는다. 기존 `shared/` 파일, `useProductionPanels`의 저장 모델, DB·서비스·라우트는 재사용한다. `AppShell`과 `CommentsWorkspace`는 스크롤을 해결하는 데 필요한 높이·컨테이너 연결만 수정하며 헤더·코멘트를 재설계하지 않는다.

작업 분리 이유: T05는 좌우 패널, T06은 중앙 입력의 보이는 순서, T07은 이 세 영역과 상위 셸의 높이 연결을 각각 완결한다. T07의 높이 변경은 부모와 자식을 같은 Task에서 고쳐야 임시 넘침이나 잘림을 남기지 않는다. 새 Phase를 만들 만큼 별도 도메인/인프라 작업은 없다.

## Planned Production Files — 최초 T01~T04 이력

`[new]`는 구현 단계에서 생성할 파일, `[modify]`는 기존 파일 수정, `[reuse]`는 기존 계약을 그대로 이용하는 파일이다. 아래 파일은 계획 단계에 생성하지 않는다.

```text
components/
├─ comments/
│  └─ CommentsWorkspace.tsx                  [modify] 기존 헤더·핀 아래 본문 삽입
└─ workspace/
   ├─ production/
   │  ├─ ProductionScreen.tsx                [new] 본문 전용 조회·오류·보관본 경계
   │  ├─ ProductionWorkspace.tsx             [modify] 세 패널과 편집/선택/명령 조립
   │  ├─ ProductionPanels.tsx                [modify] 접기·너비·반응형
   │  ├─ ProductionToolbar.tsx               [modify] 소목차·작성 상태 표시
   │  ├─ SlideNavigator.tsx                  [modify] 프로젝트 전체 썸네일 목록
   │  ├─ SlideContentEditor.tsx              [modify] 하나의 문서형 편집 표면
   │  ├─ BasicSlidePreview.tsx               [new] 기본 16:9 내용 표시
   │  ├─ ProductionPreview.tsx               [modify] 기본/Template 미리보기 선택
   │  ├─ SourcePanel.tsx                     [modify] RFP·참조 자료 조회
   │  ├─ ProductionAiPanel.tsx               [modify] 단일·다중 수정 요청
   │  ├─ ProposalReview.tsx                  [modify] 비교 결과 적용 조건 보완
   │  ├─ SlideTemplatePicker.tsx             [reuse] 보조 설정에서 연결
   │  ├─ ContentDiff.tsx                     [reuse] 변경 전후 비교
   │  └─ ProductionJobStatus.tsx             [reuse] AI 진행·실패 표시
   └─ shared/
      └─ WorkspaceFlow.tsx                  [modify] 목차/제작의 AI 흐름 연결
hooks/workspace/
├─ use-production-preview.ts                [new] 미리보기·이미지 조회와 수명 관리
├─ use-slide-draft.ts                       [modify] 문서 초안·Template 연결 정합성
├─ use-production-panels.ts                 [modify] 사용자 범위 패널 설정 복원
└─ use-workspace-proposals.ts               [modify] 취소 후 늦은 결과 차단
lib/workspace/production/
├─ document-editor.ts                      [new] 문서 DOM와 구조 데이터 변환
├─ presentation.ts                         [new] 표시 순서·출처·미리보기 키 계산
└─ editor.ts                               [modify] 변경된 회차의 미저장 초안 보존
services/workspace/
└─ WorkspaceProductionService.ts           [modify] 저장 이미지 조회·미리보기 버전 확인
```

새 생산 파일은 총 5개다. 모두 제작 기능 전용이며 `components/common/`, `components/ui/`에 새 공용 컴포넌트를 추출하지 않는다. `types/workspace-production.ts`의 영속 모델과 DB schemaVersion은 유지한다. 화면 전용 타입은 해당 제작 모듈에 둔다. CSS 파일·새 패키지·새 API 경로를 추가하지 않는다.

`app/(authenticated)/workspace/[screen]/page.tsx`는 계속 제작 경로에서 `CommentsWorkspace`를 표시한다. 해당 라우트와 `ProjectHeader`, 코멘트 provider/controller/geometry를 재구현하지 않는다. 현재 파일의 선택·회차 경계를 재사용한다.

## Integration Shape

```text
/workspace/write
  CommentsWorkspace                         기존 작업 영역·헤더·코멘트 유지
    ProjectHeader + CommentCreateButton      기존 인스턴스
    ProductionScreen                        새 본문 진입점
      WorkspaceFlow(screen="write")         기존 AI 제안 훅 재사용
        ProductionWorkspace
          ProductionPanels
            SlideNavigator                  왼쪽
            문서 편집 + AI + 미리보기         중앙
            SourcePanel                     오른쪽
    CommentPin / Preview / Popover           기존 작업 영역 좌표
```

데이터 흐름: 기존 선택 provider → 프로젝트 조회 → 조회 회차 선택 → 제작 본문 → 기존 명령/서비스 → IndexedDB → 기존 Query 무효화. 새 헤더나 두 번째 저장소를 만들지 않는다.

## Important Contracts

- 문서 편집은 `SlideContent { title, lead, blocks }`를 유지한다. 블록 ID는 Template의 `bindings[].key`이므로 내용 변경 때마다 새 ID를 발급하지 않는다.
- 반영 전에는 초안, 성공 후에는 저장본을 중앙/썸네일 양쪽에 표시한다. 미리보기는 저장본 기준이며 AI 요청도 초안 보호 뒤 시작한다.
- 코멘트는 프로젝트·회차의 작업 영역 전체 기준이다. 슬라이드별 핀으로 이관하지 않고 개별 썸네일에 전체 의견 수를 배분하지 않는다.
- 썸네일·중앙 Template 미리보기는 동일 캐시를 사용한다. 의견 저장 때마다 모든 PPT 미리보기를 다시 렌더링하지 않는다.
- `SourceRefSchema`에서 `kind:"requirement"`는 `fileRound/versionId`가 반드시 null이다. 현재 RFP 카드에는 식별된 원문 연결이 없음을 표시한다. 파일 출처만 정확한 회차/버전으로 원문을 연다. 새 RFP 파일 연결 모델은 후속이다.
- 기본 16:9는 화면 표시다. Template 없는 PPT 출력은 추가하지 않는다.
- Template 접근 실패·원본 누락과 Template 미연결을 구분한다. 실패를 기본 레이아웃으로 숨기지 않는다.

## Validation Policy

- `tests/` 생성·복원 금지. 브라우저·CUA·E2E·스크린샷·육안 비교·검증용 dev server 실행 금지.
- Windows에서는 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`를 사용한다.
- Task마다 타입 검사와 변경 파일 lint, 필요한 비브라우저 검증을 수행한다. 최초 T04의 검증 기록은 보존하고 수정 최종 T07에서 전체 lint/build를 실행한다. CSS 수치만 복제하는 테스트는 만들지 않으며 실제 레이아웃 실측 여부를 구분한다.
- 인라인 검증은 설치된 `tsx`, `jsdom`, `fake-indexeddb` 범위에서 stdin으로 실행한다. 테스트 파일·폴더·새 runner를 추가하지 않는다. DOM 검증은 실제 화면/IME/포인터 검증과 구분한다.
- Task별 한국어 커밋과 Plan/Phase/Task footer를 사용한다. `.memory/current.md`는 로컬 ignored 포인터로 강제 stage하지 않는다. push/배포는 포함하지 않는다.

## Scope and Deferred Items

- 포함: 최초 통합 범위 및 D11~D13의 패널 아이콘·편집 입력·기본 배치 버튼 제거·내부 스크롤 수정.
- 제외: 헤더/코멘트 재설계, 개별 슬라이드 코멘트 전환, 미연결 이전 코드 일괄 삭제, 실제 AI/RAG, RFP 파일 연결 모델 추가, Template 없는 PPT 출력, 관리자 카탈로그 영속화, 서버/Cosmos DB/실시간 공유.
- 위 후속은 인터뷰에서 이미 제외했다. 계획 도중 새로 범위를 늘리는 Task를 만들지 않았다. 기존 코드에 일반적인 정리 여지가 있어도 이번 기능과 무관한 리팩터링을 섞지 않는다.

## Planning Artifacts and Handoff

- 최초 Plan 1개·Phase 1개·Task 4개는 완료 이력이다. 이번에는 기존 Plan/Phase/결정을 갱신하고 T05~T07 청사진 3개를 추가하며 current를 P01-T05로 전환한다.
- 수정 직전 current를 `.memory/history/2026-11-05-before-production-editor-panels-ui-corrections.md`에 원문 보존한다. 원문 안의 상대 링크는 이전 current 위치 기준이다.
- 이전 current 원문은 `.memory/history/2026-11-05-before-production-editor-panels.md`에 그대로 보존한다. 원문 안의 상대 링크는 이전 `.memory/current.md` 위치 기준이다.
- 계획 단계에서는 생산 코드·패키지·DB·테스트를 변경/실행하지 않는다. 문서 경로·필수 섹션·포인터·생산 코드 무변경만 확인한다.

## Initial Execution Complete — T01~T04 이력

- 2026-11-05: T01~T04 순차 구현·각 한국어 커밋 완료. 당시 계획 4/4 완료. 사용자 피드백 수정 T05~T07도 후속 완료.
- 전체 typecheck/lint/build, diff, 인라인 검증 집계 147개 통과.
- [완료 보고서](../reports/2026-11-05-production-editor-panels.md)에 구현 파일·검증·학습 노트·미실시 범위 기록.
- 브라우저 검증·실제 AI·RFP 파일 연결 모델·Template 없는 PPT 출력은 추가하지 않았다.

## UI Correction Complete — T05~T07

- 2026-11-05: T05(53555be), T06(15c2aaa), T07(이 문서를 포함한 Task: T07-viewport-scroll 커밋) 완료. done7/7, 남은 Task 없음.
- 기존 구현 파일8개 수정. 패널 아이콘/rail, 편집 입력 우선 배치, 기본 배치 버튼 제거, 제작 전용 높이와 내부 스크롤 적용.
- 전체 typecheck/lint/build/diff 통과. UI 수정 인라인 검증45개(19+16+10), 최초147개와 구분. 실제 브라우저 레이아웃 실측은 미실시.
- current는 Active Task 없음으로 갱신. 상세 실행/학습/제한은 완료 보고서의 T05~T07 UI 수정 절에 기록한다.