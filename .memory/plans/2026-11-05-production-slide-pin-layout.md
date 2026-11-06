# Plan: 제작 화면 슬라이드 핀 및 중앙 편집 레이아웃

- Date: 2026-11-05
- Status: in_progress
- Decisions: [확정 결정](../decisions/2026-11-05-production-slide-pin-layout.md)
- Scope: `/workspace/write`, 기존 HTML 예시 프로젝트를 포함한 모든 중앙 슬라이드 미리보기.

## Goal

핀과 의견을 생성한 슬라이드에 연결하고, 실제 슬라이드 면 안에서만 핀 생성·이동과 십자 커서가 작동하게 한다. 각 슬라이드 아래 왼쪽으로 핀 생성 버튼을 옮기고 이전 의견 버튼을 제거한다. 편집칸은 너비를 유지하면서 높이를 줄이고, 편집·슬라이드 제목 및 중앙 공통 외곽 카드를 없앤다. 기존 의견 자료·저장·멘션·회차·권한·미저장 입력 보호를 보존한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 슬라이드 단위 핀 연결과 HTML 중앙 구조 반영 | [P01](../phases/2026-11-05-production-slide-pin-layout/P01-slide-pin-layout/phase.md) |

## Task 경계

1. **T01**: 의견의 슬라이드 ID, 이전 저장 형식 호환, controller의 생성 대상, 실제 슬라이드의 핀 표면, 버튼·팝업·권한을 함께 구현한다. 데이터와 UI를 따로 끝내면 좌표나 슬라이드 ID가 없는 의견이 새로 저장될 수 있으므로 하나의 동작 단위로 묶는다.
2. **T02**: 중앙 외곽 카드와 제목을 정리하고 편집 입력 높이·반영 버튼 위치를 조정한다. 저장 구조와 무관한 배치 변경을 분리해 핀 기능이 완성된 상태에서 스타일 변경을 검증한다.

## 구현 파일 구성

신규 구현 파일은 `components/comments/SlideCommentSurface.tsx` 하나다. 현재 전체 화면의 핀 이벤트·좌표·팝업 배치를 이 슬라이드 전용 컴포넌트로 옮긴다. 프로젝트당 하나의 기존 의견 provider/controller는 유지한다. 별도 공용 디렉토리나 새로운 의견 저장소를 만들지 않는다.

```text
components/
  comments/
    CommentsWorkspace.tsx              # 헤더·전체 상태 안내, 전체 화면 핀 표면 제거
    SlideCommentSurface.tsx            # 신규: 슬라이드 면·핀·하단 생성 버튼·팝업
    ProjectCanvasCommentsProvider.tsx  # 기존 초안 보호로 생성 대상 전환 처리
    comments-context.ts                # 생성 대상 전환 진입점
    CommentCreateButton.tsx            # 대상 slideId와 포커스 연결
    CommentPin.tsx                     # 슬라이드별 도움말 ID
    CommentPopover.tsx                 # 삭제 후 같은 슬라이드로 포커스 복귀
  workspace/production/
    ProductionPreview.tsx              # Template 실제 면에 표면 연결
    BasicSlidePreview.tsx               # 기본 실제 면에 표면 연결
    HtmlDemoSlidePreview.tsx            # HTML 실제 면에 표면 연결
    ProductionWorkspace.tsx            # 중복 미리보기 방지, 제목·삭제 안내 정리
    ProductionPanels.tsx               # 스크롤 경계 표시, 중앙 외곽 카드 제거
    SlideContentEditor.tsx              # 흰 입력칸·내부 스크롤·반영 아이콘
config/comments.ts                     # 공용 의견의 선택적 slideId
types/workspace-production.ts          # 저장 canvas 의견의 slideId: string | null
lib/comments/
  domain.ts                            # 공용 검증·명령에서 slideId 보존
  controller.ts                        # 생성 대상·미저장 핀의 슬라이드 고정
lib/workspace/production/
  canvas-schemas.ts                    # 이전 자료 기본값·새 생성 명령 검증
  canvas-comments.ts                   # 전체 자료 보존·표시 가능 대상·쓰기 검증
  selectors.ts                        # 연결된 canvas 의견을 일관되게 집계
```

## 데이터와 동작 원칙

- `schemaVersion: 2`, IndexedDB 저장소·버전, 프로젝트/회차 namespace는 유지한다. canvas thread의 새 `slideId`는 이전 자료에서 누락되면 `null`로 읽는다.
- 새 제작 의견은 존재하는 `slideId`가 필수다. 기존 연결 없는 의견은 전체 저장 상태 안에 남고 화면에 표시하지 않는다.
- 전체 의견 snapshot은 controller와 명령 처리에서 유지한다. 화면에 보일 의견만 걸러 전체 데이터를 덮어쓰지 않는다.
- 삭제된 슬라이드의 canvas 의견도 기존 자료를 보존하면서 숨긴다. 같은 ID의 슬라이드를 되돌리면 다시 보인다. 복사한 슬라이드에는 의견을 복제하지 않는다.
- 새 슬라이드 연결로 달라지는 삭제 영향·미처리 수 집계만 맞춘다. 완료·검토 권한이나 업무 규칙은 재설계하지 않는다.
- 새 핀 생성 대상은 controller에 하나만 둔다. 여러 미리보기에 provider/controller를 각각 만들지 않는다.
- 핀 위치는 실제 슬라이드 면, 팝업의 표시 한계는 viewport, 가시성은 중앙 스크롤 영역과 viewport의 교집합을 기준으로 한다.

## 검증과 제한

- 각 Task: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`.
- T01은 stdin 기반 도메인/controller/React·jsdom 상호작용 검증, T02는 실제 컴포넌트 DOM·스타일 규칙 검토와 편집 입력 검증을 수행한다. 구체적인 시나리오는 각 청사진에 있다.
- `tests/` 생성·복원 금지. 브라우저/CUA/E2E/dev server/스크린샷 검증 금지. 외부 배포·push·Azure 프로비저닝 없음.
- 계획 작성에서는 구현 코드를 변경하거나 앱 검증을 실행하지 않는다. 문서 경로·링크·상태·범위만 검증한다.
- 실행 시 Task마다 한국어 커밋을 남긴다. `.memory/current.md`는 Git 제외 대상이므로 강제 stage하지 않는다.

## 별도 범위로 유지하는 인접 사항

기존 `ProjectCommentThread`/`ProjectComments`/`ProjectCommentPins` 경로와 현재 canvas 의견 경로가 함께 존재한다. 인터뷰에서 결정한 대로 전면 통합·구 코드 정리는 포함하지 않는다. 현재 요청을 위해 필요한 canvas 연결·집계만 수정한다. 이 계획은 해당 별도 작업에 대한 재승인을 요구하지 않는다.

## 완료 조건

- 중앙 실제 슬라이드에서만 핀을 만들고 해당 슬라이드에만 다시 표시한다.
- 기존 의견·보관본·되돌리기 자료가 유지되고, 새로고침·회차 이월 후에도 연결 정보가 유지된다.
- 이전 의견 버튼, 별도 `편집`/`슬라이드` 제목, 중앙 공통 흰 카드가 없다.
- 편집 입력은 최대 180px의 내부 스크롤 영역과 안쪽 반영 아이콘을 사용한다.
- 헤더·좌우 패널·저장·한글 조합 입력·초안 보호가 유지된다.
