# Plan: 제작 화면 슬라이드 목록·문서 편집·출처 패널

- Date: 2026-11-05
- Status: done
- Decision: [확정 인터뷰](../decisions/2026-11-05-production-editor-panels.md)
- Baseline: `8158744`; 계획 시 생산 코드 변경 없음. 이번 대화에서 만든 결정 문서만 미추적 상태였다.

## Goal

현재 `/workspace/write`의 헤더·작업 영역 코멘트를 보존하면서 전체 슬라이드 목록, 문서형 편집과 슬라이드 미리보기, 읽기 전용 출처를 연결한다. 프로젝트·회차·권한·저장은 기존 runtime을 사용하며 단일/다중 슬라이드의 시연 AI 비교·선택 적용을 제공한다.

완료 시 문단·목록·표를 한 문서형 영역에서 편집하고 명시적으로 반영할 수 있으며, 저장한 내용이 중앙과 썸네일에 일치한다. Template 없는 슬라이드는 기본 16:9로 표시한다. 출처는 저장된 원문 버전만 연다. 기존 헤더·핀·답글·멘션·회차 동작을 이중으로 렌더링하지 않는다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 제작 본문 통합 — T01~T04 완료 | [P01](../phases/2026-11-05-production-editor-panels/P01-production-editor/phase.md) |

## Tasks and Dependencies

| Task | 작업 결과 | 주요 파일 | 선행 |
| --- | --- | --- | --- |
| T01 | 구조 데이터를 보존하는 문서형 편집기 | `document-editor.ts`, `SlideContentEditor.tsx`, `use-slide-draft.ts`, `editor.ts` | 없음 |
| T02 | 기본/Template 미리보기와 실제 출처 조회 | `presentation.ts`, `use-production-preview.ts`, `BasicSlidePreview.tsx`, `ProductionPreview.tsx`, `SourcePanel.tsx`, `WorkspaceProductionService.ts` | T01 |
| T03 | 현재 코멘트 화면에 세 패널·전체 슬라이드 조작 연결 | `ProductionScreen.tsx`, `ProductionWorkspace.tsx`, `SlideNavigator.tsx`, `ProductionPanels.tsx`, `ProductionToolbar.tsx`, `CommentsWorkspace.tsx`, `WorkspaceFlow.tsx`, `use-production-panels.ts` | T01, T02 |
| T04 | 중앙 AI 요청·비교·선택 적용과 통합 검증 | `WorkspaceFlow.tsx`, `ProductionAiPanel.tsx`, `ProductionWorkspace.tsx`, `ProposalReview.tsx`, `use-workspace-proposals.ts` | T03 |

단일 UI 기능이고 서버·인프라 이행 단계가 없으므로 Phase는 하나다. 편집 데이터 변환과 읽기 화면을 먼저 준비하고 마지막에 기존 화면과 연결한다. 각 Task는 이전 파일의 호출 계약을 유지하거나 같은 Task에서 호출부까지 갱신하여 타입 검사 가능한 단위로 끝낸다. 검증만 하는 빈 Task는 만들지 않는다.

## Planned Production Files

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
- Task마다 타입 검사와 변경 파일 lint, 의미 있는 비브라우저 검증을 수행한다. 최종 T04에서 전체 lint/build를 실행한다. 실패 원인을 해결한 뒤 필요한 검사만 재실행한다.
- 인라인 검증은 설치된 `tsx`, `jsdom`, `fake-indexeddb` 범위에서 stdin으로 실행한다. 테스트 파일·폴더·새 runner를 추가하지 않는다. DOM 검증은 실제 화면/IME/포인터 검증과 구분한다.
- Task별 한국어 커밋과 Plan/Phase/Task footer를 사용한다. `.memory/current.md`는 로컬 ignored 포인터로 강제 stage하지 않는다. push/배포는 포함하지 않는다.

## Scope and Deferred Items

- 포함: 문서 편집, 저장본 미리보기, 전체 슬라이드 조작, 출처 조회, 현재 화면 연결, 시연 AI 비교·선택 적용에 필요한 변경.
- 제외: 헤더/코멘트 재설계, 개별 슬라이드 코멘트 전환, 미연결 이전 코드 일괄 삭제, 실제 AI/RAG, RFP 파일 연결 모델 추가, Template 없는 PPT 출력, 관리자 카탈로그 영속화, 서버/Cosmos DB/실시간 공유.
- 위 후속은 인터뷰에서 이미 제외했다. 계획 도중 새로 범위를 늘리는 Task를 만들지 않았다. 기존 코드에 일반적인 정리 여지가 있어도 이번 기능과 무관한 리팩터링을 섞지 않는다.

## Planning Artifacts and Handoff

- Plan 1개, Phase 1개, 상세 Task 4개, 이전 current 원문 보관 1개를 작성하고 현재 포인터를 P01-T01로 전환한다.
- 이전 current 원문은 `.memory/history/2026-11-05-before-production-editor-panels.md`에 그대로 보존한다. 원문 안의 상대 링크는 이전 `.memory/current.md` 위치 기준이다.
- 계획 단계에서는 생산 코드·패키지·DB·테스트를 변경/실행하지 않는다. 문서 경로·필수 섹션·포인터·생산 코드 무변경만 확인한다.

## Execution Complete

- 2026-11-05: T01~T04 순차 구현·각 한국어 커밋 완료. 남은 작업 없음.
- 전체 typecheck/lint/build, diff, 인라인 검증 집계 147개 통과.
- [완료 보고서](../reports/2026-11-05-production-editor-panels.md)에 구현 파일·검증·학습 노트·미실시 범위 기록.
- 브라우저 검증·실제 AI·RFP 파일 연결 모델·Template 없는 PPT 출력은 추가하지 않았다.
