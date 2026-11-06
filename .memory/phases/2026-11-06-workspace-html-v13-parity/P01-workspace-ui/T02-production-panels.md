# Task: T02 제작 패널·슬라이드 목록·출처 적용

## Status: done

## Goal

제작 메뉴를 HTML처럼 경계가 맞닿은 3열 패널로 만들고, 실제 슬라이드와 자료를 사용하는 목록·출처 표시를 적용한다. 좌우 패널 폭 조절·접힘·작은 화면 접근을 함께 완결한다.

## Decision Summary

- 선행 Task T01은 공통 헤더를 적용한다. 이 Task는 제작 외곽과 좌우 패널만 변경하고 중앙 편집 상태/저장/미리보기 데이터는 유지한다. 중앙 고정 도구·코멘트 이동은 T03이다.
- 사용자 확정: 현재 데이터 유지, 설정 알림/로그와 RFP 원문 신규 연결 제외. HTML은 `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`, SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`. 기준은 `wsWrite` L3442, `writeThumbs` L3465 부근, `srcPanel` L3963, `.w3/.wthumb` L1318 및 `bindW3` L5434 부근이다.

## Implementation

### I01. 패널 레이아웃·폭 저장·조절선

- Related Files:
  - `components/workspace/production/ProductionPanels.tsx` :: `ProductionPanels`, `splitter`, `rail`, `collapseButton` — 외곽 배치; modify
  - `hooks/workspace/use-production-panels.ts` :: `ProductionPanelState`, `defaults`, `schema`, `resize` — 저장된 폭 검증; modify
  - `components/workspace/production/ProductionScreen.tsx` :: `ProductionScreen` — 본문 외부 padding 제거; modify
  - `components/comments/CommentsWorkspace.tsx` :: `useStyles.intro`, `CommentsWorkspace` — 헤더와 제작 본문의 간격만 조정; modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ProductionWorkspace` — 기존 center 연결; read-only in this Task

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProductionPanelState {
    leftOpen: boolean; rightOpen: boolean;
    leftWidth: number; rightWidth: number;
    mobilePanel: "slides" | "editor" | "sources";
  }
  interface ProductionPanelsProps {
    namespace: string;
    left(toggleButton: React.ReactNode): React.ReactNode;
    center: React.ReactNode;
    right(toggleButton: React.ReactNode): React.ReactNode;
  }
  // useProductionPanels(namespace: string) 계약 유지
  // update(Partial<ProductionPanelState>), resize("left"|"right", delta:number), reset()
  ```

- **Data & Schema Fields**:
  - 기본 `{ leftOpen:true, rightOpen:true, leftWidth:240, rightWidth:360, mobilePanel:"editor" }`.
  - 폭: left 150~480, right 280~680. zod schema, resize clamp, separator aria min/max, Home/double-click 기본값을 동시에 변경한다. `localStorage` key는 `kpc-production-panels:` + runtime identity namespace를 그대로 둔다.
  - 기존 정상 값(예: 우측 320px)은 덮어쓰지 않는다. 저장값 없음/parse 오류/새 범위 밖이면 기본값을 사용한다. 읽기 지연 시 현재 namespace와 다른 값으로 update/persist하지 않는 기존 방식을 보존한다.
  - 외곽은 flex 1/min-width 0/min-height 0/overflow hidden. 좌·우 흰 패널의 독립 card radius·전체 테두리·패널 사이 gap을 제거한다. 경계선과 조절선으로 구획한다. 조절선 width 6px, 1px 양쪽 선, 중앙 2×28px 손잡이, hover/focus 브랜드색. 레일 width 40px, 흰 배경·세로 라벨·펼치기 버튼.
  - 데스크톱 가운데는 최소 320px이 기준이다. viewport가 아닌 제작 컨테이너 폭 1180px 이상에서 3열을 유지한다. 사용자 저장 폭 합계가 공간을 넘으면 표시 폭만 왼쪽 최대 `containerWidth - 320 - 12 - 280`, 오른쪽 최대 `containerWidth - 320 - 12 - displayedLeft`로 clamp한다. 접힌 쪽은 40px 레일, 열린 쪽만 6px 선을 차감한다. 먼저 왼쪽을 최소 150px 이상으로 줄이고 오른쪽을 최소 280px 이상으로 맞추며, 부족하면 우측 overlay 모드로 전환한다. 선택한 선호 폭은 storage에서 파괴하지 않는다.
  - 761~1179px에서는 기존 우측 overlay/접기 동작을 유지한다. 왼쪽 표시 폭을 `min(savedLeft, max(150, containerWidth-326))`로 제한한다. 760px 이하에서는 기존 slides/editor/sources 선택 UI로 한 패널씩 접근한다. HTML의 고정 최소폭 때문에 휴대 화면에서 내용이 사라지는 동작은 복제하지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: namespace 저장값을 읽고 검증한다. 컨테이너 폭 관측은 기존 브라우저 API `ResizeObserver`를 컴포넌트 내부에서만 사용하고 unmount 시 disconnect한다. 브라우저 검증을 실행하라는 뜻은 아니다.
  2. Core Processing: drag/방향키 resize 및 접기/펼치기를 기존 hook으로 연결한다. Home 또는 double-click은 해당 쪽만 left240/right360으로 되돌린다. keyboard step10px, right 방향은 기존 부호 반전을 유지한다. 포커스는 기존 `pendingFocus/buttons` 매핑을 유지한다.
  3. Error & Exception Handling: 잘못된 storage/금지된 storage는 레이아웃 기본값으로 복구하며 저장 서비스를 막지 않는다. pointercancel/lost capture/컴포넌트 해제에서 drag를 해제한다. 절대값 aria-valuenow는 화면에 표시된 폭과 맞춘다.
  4. State Transition & Return: `ProductionScreen`의 `px/pb` 외부 여백을 제거해 헤더 아래에 붙인다. `CommentsWorkspace.intro`는 ProjectHeader의 음수 inset과 짝이 맞는 top/left/right 12px을 유지하되 정상 상태의 하단 12px 공백만 없앤다. 오류/draft 경고는 숨기지 않는다. 이번 Task의 center는 기존 `data-production-scroll`/padding/overflow를 유지해 독립 실행 후에도 내용이 보이게 한다. T03에서 헤더와 캔버스 스크롤을 나눈다.

### I02. 슬라이드 썸네일·상태·단축키

- Related Files:
  - `lib/workspace/production/presentation.ts` :: `ProductionSlideRow`, `selectProductionSlides` — 표시 수치; modify
  - `components/workspace/production/SlideNavigator.tsx` :: `SlideNavigator` — 목록 렌더·기존 context menu; modify
  - `lib/workspace/production/canvas-comments.ts` :: `visibleCanvasThreads` — 숨겨진/삭제 연결 제외; read-only
  - `components/workspace/production/ProductionPreview.tsx` — thumbnail 분기와 lazy loading; read-only
  - `lib/workspace/production/editor.ts` :: `isTypingTarget` — 입력 중 단축키 제외; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProductionSlideRow {
    slide: ProposalSlide; section: Section; chapter: Chapter;
    number: number; sectionNumber: string; mine: boolean; editable: boolean;
    openComments: number; // 신규 표시 필드, 0 기본값
  }
  function selectProductionSlides(view: ProjectView): ProductionSlideRow[];
  // SlideNavigatorProps 기존 계약 전부 유지:
  // onSelect(id:string, mode:"single"|"toggle"|"range"):void
  // onCommand(WorkspaceOperation), onCopy(string[]), onPaste(sectionId,afterId), onRemove(string[])
  ```

- **Data & Schema Fields**:
  - `openComments`: 현재 `view.state.body.threads` 중 같은 slideId/status open인 개수 + `visibleCanvasThreads(view.state.body)` 중 같은 slideId/status open인 개수. 두 저장소별 thread ID를 합치지 않고 기존 완료 요약과 같은 두 도메인을 집계한다. 전체 소목차 수치를 모든 슬라이드에 중복 표시하지 않는다. snapshot view로 받은 body를 그대로 사용한다.
  - 기존 `mine`은 `section.assigneeIds.includes(view.actor.id)`, `editable`은 capabilities 기준이다. 내 담당과 편집 권한을 같은 값으로 바꾸지 않는다.
  - 상단 `슬라이드 N장`과 접기 버튼; 목록 padding10px, 카드 간격10px, radius8px, 내부 padding0. 썸네일은 현재 실제 preview를 유지하고 frame width에 맞춘다.
  - 하단 caption padding5px 8px/gap6px/font10.5px/700: 전체 번호 → 고정 lock → `sectionNumber section.title · 해당 섹션 내 순서/장수` → 미처리 의견 badge(0은 숨김). 단일 장은 분수 생략.
  - 스타일 우선순위: 기본 중립선 → 내 담당 2px 파랑+옅은 파랑 caption → active 브랜드선·옅은 ring → 다중 선택 포함 카드는 별도 선택선/ring. `aria-current`는 active 1개, `aria-pressed`는 선택 여부, 키보드 focus-visible은 모든 상태보다 식별 가능하게 둔다. 기존 theme tokens와 지역 styles를 사용하며 전역 테마를 바꾸지 않는다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: rows는 실제 chapter/section/slide 순서를 사용하며 HTML 예시 페이지를 추가하지 않는다. 빈 소목차는 기존 빈 목록 context menu로 새 슬라이드 추가가 가능해야 한다.
  2. Core Processing: 클릭 single/Ctrl·Meta toggle/Shift range, 우클릭 및 Shift+F10/ContextMenu의 복사·붙여넣기·삭제·추가를 유지한다. 썸네일은 핀 생성 버튼·포커스 가능한 내부 버튼을 포함하지 않는다.
  3. Error & Exception Handling: busy/권한/보관본/자산 접근 검사는 기존 `canCopy/canPaste/editable` 그대로 적용한다. 슬라이드 이동 시 body를 직접 바꾸거나 `commitSelection` 우회하지 않는다.
  4. State Transition & Return: 목록 포커스에서 방향키 이동을 지원한다. HTML 기준 ArrowUp/ArrowRight=다음, ArrowDown/ArrowLeft=이전; 범위 끝에서는 no-op. Alt/Ctrl/Meta/Shift, IME, 입력 target, modal/menu가 열렸을 때 제외하고 `onSelect(next.id,"single")`를 호출한다. 문서 전체 listener를 추가하지 않는다. active 변경 후 해당 썸네일을 `scrollIntoView({block:"nearest"})`로 표시한다. 기존 Escape/Ctrl+C·V/Delete 처리와 겹치지 않게 한다.

### I03. 출처 패널의 카드 표시

- Related Files:
  - `components/workspace/production/SourcePanel.tsx` :: `SourcePanel` — 출처 헤더·카드·원문 열기; modify
  - `lib/workspace/production/presentation.ts` :: `ProductionSourceCard`, `selectProductionSources` — 기존 자료 연결; read-only except I02
  - `components/workspace/files/FilePreviewDialog.tsx` — 기존 원문 dialog; read-only
  - `hooks/workspace/use-workspace-files.ts` — live/history 조회; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  interface ProductionSourceCard {
    id: string; group: "rfp" | "reference"; title: string;
    page: number | null; quote: string | null; provenance: "mock" | "manual";
    resource: FileResourceView | null; round: number | null;
    missingReason: string | null;
  }
  // SourcePanel({view,slide,snapshotId,number?,panelToggle?}) 공개 계약 유지
  ```

- **Data & Schema Fields**:
  - 헤더 min-height44px/padding0 12px, `출처` + `Slide N · sectionNumber section.title` 한 줄 말줄임 + 접기 버튼. `sectionNumber`는 `selectProductionSlides(view)`에서 현재 슬라이드를 찾는다.
  - 그룹명 `RFP`와 개수 badge, `참조 자료`와 개수 badge. RFP 카드는 RFP pill + `p.N`(page null이면 쪽수 미상), 아래 실제 title, 아래 quote. 참조 카드는 자료 아이콘 + 파일명, 아래 page/시연 자료 표시, 아래 quote. HTML의 box 번호는 현재 모델에 없으므로 가짜 번호를 표시하지 않는다.
  - 카드 border1/radius10/padding10px 12px/margin-bottom8px; 제목12.5px, 설명11.5px, quote12px/line-height1.6/margin-top6px/padding6px 10px/좌측3px 강조선/옅은 배경. 긴 title·quote는 wrap되며 썸네일/패널 폭을 늘리지 않는다.
  - 빈 문구: `이 슬라이드에 연결된 RFP 항목이 없습니다`, `참조한 자료가 없습니다`; 선택 전에는 `슬라이드를 선택하면 출처를 볼 수 있습니다.` 유지.

- **Execution Flow / Logic**:
  1. Precondition & Validation: snapshot은 `useWorkspaceFileHistory`, live는 `useFileWorkspace`의 기존 분기를 유지한다. resource는 프로젝트·fileRound·versionId 일치 때만 활성화한다.
  2. Core Processing: 카드 클릭과 Enter/Space는 실제 resource와 round가 있을 때만 기존 FilePreviewDialog를 연다. RFP 현재 모델에는 원문 연결 정보가 없으므로 명시적 `원문 파일 연결 정보 없음`을 표시하고 버튼 role/tabIndex/cursor를 부여하지 않는다. 사용자가 신규 연결을 제외한 상태다.
  3. Error & Exception Handling: query loading/error/missingReason을 계속 보여준다. 데이터가 없는데 임의 HTML RFP 문서를 만들어 원문처럼 보여주지 않는다.
  4. State Transition & Return: scope `[projectId,currentRound,snapshotId,slideId]` 변경 시 기존 preview dialog를 닫는다. 원문 자료 버전/권한을 현재 회차로 임의 대체하지 않는다.

## Acceptance Criteria

- [x] 헤더 아래 제작 외곽 여백과 독립 카드 모양이 사라지고 3열 패널·6px 조절선·40px 접힘 레일이 적용된다.
- [x] 저장값 없는 새 layout은 240/360px; 기존 정상 폭은 유지되고 새 범위/keyboard/Home/double-click 값이 일치한다.
- [x] 좁은 컨테이너에서 중앙320px 기준과 대체 패널 접근이 유지되며 내용이 가려진 채 접근 불가능하지 않다.
- [x] 목록에 실제 번호·장수·담당·고정·다중 선택·미처리 의견이 표시되며 기존 context menu와 guard가 유지된다.
- [x] 출처의 문구·위계·인용문이 HTML 구조이며 실제 원문이 있는 카드만 열린다.
- [x] 중앙 편집과 미리보기·draft·저장 서비스는 이 Task 완료 시에도 동작 계약을 유지한다.

## Validation

- `npm.cmd run typecheck` — 성공.
- `npx.cmd eslint components/workspace/production/ProductionPanels.tsx hooks/workspace/use-production-panels.ts components/workspace/production/ProductionScreen.tsx components/comments/CommentsWorkspace.tsx components/workspace/production/SlideNavigator.tsx components/workspace/production/SourcePanel.tsx lib/workspace/production/presentation.ts` — 성공.
- `git diff --check` — 공백 오류 없음.
- `rg -n 'rightWidth|leftWidth|aria-valuemin|aria-valuemax|data-production-scroll|openComments|missingReason' hooks/workspace/use-production-panels.ts components/workspace/production lib/workspace/production/presentation.ts` — 값 동기화·스크롤 경계·개수 및 누락 상태를 정적으로 검토한다.
- 정적 시나리오: 폭150/240/480·280/360/680, 기존240/320 저장값, 손상 JSON·다른 namespace, 좌우 접기/둘 다 접기, 컨테이너760/761/1179/1180, 최대폭으로 좁히기, snapshot, 빈 소목차, 0개/여러 개 의견, missing source, modal 중 방향키를 추적한다.
- `tests/` 생성·복원 및 브라우저/CUA/E2E/dev server/스크린샷 검증 제외. 결과와 미실시 범위를 `.memory/reports/2026-11-06-workspace-html-v13-parity-T02.md`에 기록한다.

## Commit Message

```text
feat(production): HTML v13 제작 패널과 목록 출처 적용

Plan: 2026-11-06-workspace-html-v13-parity
Phase: P01-workspace-ui
Task: T02-production-panels

- 밀착된 세 패널과 폭 조절 및 작은 화면 접근을 정리
- 실제 슬라이드 상태와 출처를 HTML 목록 구조로 표시
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task를 포함한 feat(production) 패널 커밋 (git log -- 이 파일로 조회)

완료 후 `.memory/current.md`를 `T03-production-editor.md`로 전진하고 phase를 2/3으로 갱신한다. 지정 파일과 이 Task 기록만 stage하며 기존 다른 계획의 변경은 보존한다.
