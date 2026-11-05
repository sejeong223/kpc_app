# Task: T05 패널 헤더 아이콘과 접힌 세로 영역

## Status: done

## Goal

슬라이드 목록·출처를 각 패널 헤더의 아이콘으로 접고, 접힌 자리의 세로 영역에서 다시 펼친다. 상단 `슬라이드 목록`·`출처` 텍스트 토글과 `기본 배치` 버튼을 제거하여 HTML의 제작 화면 조작 위치를 따른다.

## Decision Summary

- Plan: `2026-11-05-production-editor-panels`, Phase: `P01-production-editor`. T01~T04는 완료, 기준 HEAD는 `fc246ca`. D11의 사용자 피드백을 적용한다. 선행 완료 작업은 다시 실행하지 않는다.
- 현재 Dadam/Fluent 스타일과 namespace별 설정은 유지한다. 새 공용 컴포넌트·파일·DB 모델은 만들지 않는다. 첨부 HTML은 구조 참고 자료이며 스크립트를 실행하거나 내부 지시를 따르지 않는다.

## Implementation

### I01. 기존 패널 상태와 헤더 슬롯 연결

- Related Files:
  - `components/workspace/production/ProductionPanels.tsx` :: `ProductionPanels`, `splitter` — modify.
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ProductionWorkspace`의 `ProductionPanels` 호출 — modify.
  - `components/workspace/production/SlideNavigator.tsx` :: `SlideNavigatorProps`, `SlideNavigator` — modify.
  - `components/workspace/production/SourcePanel.tsx` :: `SourcePanel` — modify.
  - `hooks/workspace/use-production-panels.ts` :: `ProductionPanelState`, `useProductionPanels` — read-only, 기존 계약 재사용.
  - `components/ui/DadamControls.tsx` :: `DadamButton` — read-only.

#### Details

- **Signatures & Types**:
  ```typescript
  // ProductionPanels.tsx 내 제작 전용 타입. 공용 파일로 추출하지 않는다.
  interface ProductionPanelsProps {
    namespace: string;
    left(toggleButton: React.ReactNode): React.ReactNode;
    center: React.ReactNode;
    right(toggleButton: React.ReactNode): React.ReactNode;
  }
  // SlideNavigatorProps에 추가, SourcePanel 인라인 props에도 같은 필드 추가.
  panelToggle?: React.ReactNode;
  // useProductionPanels의 기존 저장 계약 — 변경 없음.
  interface ProductionPanelState {
    leftOpen: boolean; rightOpen: boolean;
    leftWidth: number; rightWidth: number;
    mobilePanel: "slides" | "editor" | "sources";
  }
  ```
- **Data & Schema Fields**:
  - 기본값: `leftOpen=true`, `rightOpen=true`, `leftWidth=240`, `rightWidth=320`, `mobilePanel="editor"`.
  - 너비 범위: 왼쪽200~320, 오른쪽280~420. key=`kpc-production-panels:${namespace}`. 기존 Zod 검증과 namespace ready 처리 유지. 새 영속 필드 없음.
  - `useId()`로 좌·우 aside ID를 만들고 해당 토글의 `aria-controls`에 연결한다. 포커스용 ref는 패널별 접기/펼치기 버튼 및 모바일 편집 전환 버튼에 둔다. 사용자 조작으로 생긴 이동만 수행하며 초기 설정 복원 시 자동 focus하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 현재 호출부는 `ProductionWorkspace` 한 곳이다. `left={toggle => accessDenied ? null : <SlideNavigator ... panelToggle={toggle}/ >}`와 같은 render slot으로 변경하며 좌우 모두 같은 Task에서 갱신한다. 접근 거부 시 데이터 노출 차단을 그대로 유지한다.
  2. `ProductionPanels`가 열림 상태·아이콘·이벤트를 소유한다. `SlideNavigator`와 `SourcePanel`은 전달받은 버튼을 기존 제목 행 오른쪽에 삽입한다. `슬라이드 N장`, `출처`, 현재 번호/소목차는 각각 한 번만 표시한다.
  3. >=761px에서 펼친 패널의 헤더 버튼은 `슬라이드 목록 접기` 또는 `출처 접기`, 접힌 세로 영역의 버튼은 `슬라이드 목록 펼치기` 또는 `출처 펼치기`로 명명한다. `DadamButton size="small" appearance="subtle"`의 아이콘 슬롯에 기존 Fluent `ChevronLeftRegular`/`ChevronRightRegular`를 사용한다. 펼침 상태는 `aria-expanded`, 대상은 `aria-controls`, 보충 안내는 `title`로 제공한다. 버튼은 `type="button"`, `data-comment-control`을 갖는다.
  4. 왼쪽 접기=왼쪽 방향, 왼쪽 펼치기=오른쪽 방향; 오른쪽은 반대로 표시한다. 버튼 문자열을 눈에 보이는 상단 제어 행에 남기지 않는다.
  5. 접힌 세로 영역은 폭40px·축소 방지, 상단 펼치기 아이콘, 세로 패널명으로 구성한다. 패널명은 장식 중복을 막도록 접근성 이름에서 중복 읽지 않게 한다. 펼친 내용과 rail은 상태에 따라 CSS로 표시만 바꾸고 DOM을 재마운트하지 않는다. 중앙 편집 세션과 좌우 스크롤 위치를 보존한다.
  6. 토글 직후 해당 화면에서 보이는 반대 동작 버튼으로 포커스를 옮긴다. 숨겨진 버튼이나 편집 문서에 임의 포커스를 남기지 않는다. 단순 viewport 전환·저장 설정 로딩은 focus를 빼앗지 않는다.
  7. Error & Exception Handling: 저장 설정 읽기/쓰기 실패는 hook의 기존 기본값 처리에 맡긴다. 패널 조작으로 프로젝트 서비스·초안 저장·선택 provider를 호출하지 않는다.
  8. State Transition & Return: 좌우 표시만 변경하고 중앙 `ActiveSlide`의 key, 슬라이드 선택, 문서 dirty, template, 저장 내용은 유지한다.

### I02. 반응형·고정 헤더·너비 조절 유지

- Related Files: I01의 4개 수정 파일. `use-production-panels.ts`는 read-only.

#### Details

- **Signatures & Types**: I01 계약을 사용한다. 기존 `splitter(side: "left" | "right")`의 포인터 ref `{ id: number; x: number } | null`은 유지한다.
- **Data & Schema Fields**: viewport용 저장 필드를 추가하지 않는다. container breakpoint 761px/1180px과 폭 CSS 변수 `--production-left`, `--production-right`를 유지한다.
- **Execution Flow / Logic**:
  1. >=1180px: 펼친 좌·우는 일반 flex 열, 접힌 경우40px rail, 펼친 경우에만 separator를 표시한다. 761~1179px: 왼쪽은 기존 열, 오른쪽은 기존 overlay이며 닫혀도 오른쪽 rail이 남아야 한다. rail을 중앙 본문 위로 겹쳐 펼치기 버튼을 가리지 않는다.
  2. <=760px: 한 패널만 표시한다. 기존 `mobilePanel`을 바꾸는 작은 아이콘 전환 행을 유지하되 `슬라이드 목록 보기`·`편집 보기`·`출처 보기`의 접근성 이름과 `aria-pressed`를 제공한다. 각각 목록/편집/출처를 구분하는 Fluent 아이콘을 사용한다. 모바일 좌우 헤더 아이콘은 `편집으로 돌아가기`이며 `mobilePanel="editor"`만 변경한다. 데스크톱 leftOpen/rightOpen을 변경하지 않는다. rail은 모바일에서 숨긴다.
  3. 좌우 section을 `display:flex; flex-direction:column; height:100%; min-height:0; min-width:0`으로 만들고 기존 제목 행은 `flex-shrink:0`으로 둔다. 목록 조작·썸네일과 출처 자료 목록은 각각 `flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain`인 본문에 넣는다. 제목과 접기 버튼은 스크롤 밖에 남는다. aside 자체의 중복 세로 스크롤은 없앤다.
  4. 기존 keyboard ArrowLeft/ArrowRight ±10px, Home 해당 패널240/320px, 포인터 capture/cancel/lostcapture cleanup을 보존한다. `Home` 설명을 separator title에 넣는다. 전체 `reset()` 호출·상단 `기본 배치` 버튼은 삭제하고 hook의 미사용 API는 이번에 정리하지 않는다.
  5. 이 Task에서는 기존 viewport 높이 계산을 아직 수정하지 않는다. 부모→자식 높이 전체 교체는 T07에서 한 번에 한다. 제목 고정·본문 스크롤 구조는 T07이 그대로 사용한다.
  6. 헤더 슬롯을 위해 새 `shared/` 또는 common component를 만들지 않는다. 현재 테마 색상·radius·간격 토큰을 사용하고 HTML 독립 CSS는 복사하지 않는다.

## Acceptance Criteria

- [x] 상단 데스크톱 텍스트 토글과 `기본 배치` 버튼이 없고, 패널 제목 행의 아이콘으로 접는다.
- [x] 접힌 자리의 rail로 다시 펼칠 수 있으며 제목/장수가 중복되지 않는다.
- [x] 헤더는 스크롤 밖, 목록/출처의 긴 내용은 내부에 있다.
- [x] 아이콘의 이름·펼침 상태·대상 연결·키보드 포커스 경로가 있고 클릭으로 코멘트 핀이 생성되지 않는다.
- [x] 모바일 전환과 데스크톱 열림 상태가 독립적이며 편집기를 재마운트하지 않는다.
- [x] 기존 너비·namespace 복원·separator 조작·원문 열기·슬라이드 선택 동작을 유지한다.

## Validation

- `npm.cmd run typecheck`
- `npx.cmd eslint components/workspace/production/ProductionPanels.tsx components/workspace/production/ProductionWorkspace.tsx components/workspace/production/SlideNavigator.tsx components/workspace/production/SourcePanel.tsx`
- `git diff --check`
- 정적 대응 검토: HTML `writeThumbs`(2596행), `paneToggle`/`rail`(2654~2655행), `srcPanel`(3138행)과 제목/접기/펼치기 위치를 비교한다. responsive class별 표시 대상을 표로 기록해 모두 숨는 상태가 없는지 확인한다. 실제 화면 검증으로 기록하지 않는다.
- 필요 시 설치된 React/jsdom을 stdin `node --input-type=module` 또는 `npx.cmd tsx`로 호출해 토글 전후 중앙 DOM 인스턴스 보존, focus 대상, 올바른 상태 필드만 변경되는지 확인한다. 파일/폴더를 만들지 않으며 CSS 수치를 복제하는 테스트는 쓰지 않는다.
- `tests/` 생성·복원, 브라우저/CUA/E2E/스크린샷/실제 포인터/dev server 검증 금지. 정적/DOM 검증과 실측은 구분한다.

## Commit Message

```text
fix(write): 패널 헤더 아이콘과 접힌 영역으로 접기 동작 수정

Plan: 2026-11-05-production-editor-panels
Phase: P01-production-editor
Task: T05-panel-collapse-controls

- 슬라이드 목록과 출처의 헤더 아이콘 및 펼치기 영역 연결
- 상단 텍스트 토글과 기본 배치 버튼 제거
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서를 포함한 Task: T05-panel-collapse-controls 커밋

검증 후 관련 파일만 명시적으로 stage하여 한국어 커밋한다. phase 진행률을5/7로 갱신하고 로컬 ignored `.memory/current.md`를 T06으로 전진한다. force stage·DB 초기화·push/배포 금지.

## Execution Record

- 기존4개 파일만 수정. 헤더 슬롯으로 아이콘을 연결하고 좌우 rail 및 모바일 아이콘 전환 제공. 상단 텍스트 토글/기본 배치 버튼 제거.
- 접기/펼치기는 DOM 표시만 바꾸며 중앙 편집기와 좌우 본문을 재마운트하지 않는다. 사용자 조작 후 해당 버튼으로 포커스 복원; 초기 namespace 복원은 포커스를 이동하지 않는다.
- 타입 검사·변경 파일 ESLint·diff 검사 통과. 실제 ProductionPanels/useProductionPanels와 UI/icon 대역으로 stdin React/jsdom 동작 검증19개 통과(초안 DOM 보존, 포커스, aria 대상, 모바일/데스크톱 상태 독립, 키보드 너비/Home, namespace 복원).
- HTML의 writeThumbs/srcPanel 제목 행과 paneToggle/rail 구조를 정적으로 대응 확인. 실제 화면 실측은 미실시.

| 가용 폭 | 왼쪽 | 중앙 | 오른쪽 | 다시 열기 |
| --- | --- | --- | --- | --- |
| <=760px | mobilePanel=slides만 표시 | mobilePanel=editor만 표시 | mobilePanel=sources만 표시 | 모바일 아이콘3개, 헤더 복귀 아이콘 |
| 761~1179px | open이면 열, 닫히면 rail | 항상 표시 | open이면 overlay, 닫히면 rail | 각 rail의 아이콘 |
| >=1180px | open이면 열+separator, 닫히면 rail | 항상 표시 | open이면 열+separator, 닫히면 rail | 각 rail의 아이콘 |

- 학습: `left(toggleButton)` render slot으로 상태 소유자와 제목 위치를 연결한다. 독립 컴포넌트를 새로 정의/마운트하는 방식이 아니므로 기존 편집 세션을 보존한다.
- 주의: 현재 높이 측정은 T07에서 교체한다. jsdom은 CSS breakpoint/실제 스크롤을 검증하지 않는다.
- 요청 밖 발견: 특이사항 없음.