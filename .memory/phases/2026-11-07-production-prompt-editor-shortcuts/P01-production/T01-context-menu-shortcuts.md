# Task: T01 슬라이드 메뉴 단축키·구분선·이동 방향

## Status: done

## Goal

슬라이드 우클릭 메뉴에 지정한 단축키와 구분선을 표시하고, 팝업 안에서도 해당 단축키가 클릭과 동일한 대상에 실행되게 한다. 목록의 ↑/↓ 이동 방향을 사용자 승인대로 바로잡는다.

## Decision Summary

- 복사 Ctrl+C / 붙여넣기 Ctrl+V / 삭제 Del 표시. 실제 Ctrl·Meta 조합과 기존 Backspace 삭제 지원 유지. 추가에는 단축키 없음.
- 단축키는 11.5px, #74747d, 500. 추가 위 구분선은 1px, #EEF0F3, margin 4px 6px, 부모 기준 자동 폭.
- 입력 중 문자 복사/붙여넣기/삭제는 건드리지 않는다. 공용 버튼 리팩토링은 제외한다.
- 선행 Task 없음. 기존 개별 완료 잠금/담당 테두리 2.5px/헤더 gap 8px/반응형은 보존한다.

## Implementation

### I01. 키 해석과 목록 이동 계약

- Related Files:
  - `lib/workspace/production/navigator-shortcuts.ts` :: `navigatorShortcut`, `slideNavigationDelta` — 키 해석만 담당; new
  - `components/workspace/production/SlideNavigator.tsx` :: `SlideNavigator` 루트 `onKeyDown` — 대상·권한·포커스 검사와 실행; modify
  - `lib/workspace/production/editor.ts` :: `isTypingTarget` — 기존 입력 대상 검사; read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export type NavigatorShortcut = "copy" | "paste" | "remove";
  export interface NavigatorKey {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    isComposing: boolean;
  }
  export function navigatorShortcut(event: NavigatorKey): NavigatorShortcut | null;
  export function slideNavigationDelta(event: NavigatorKey): -1 | 0 | 1;
  ```

- **Data & Schema Fields**: 영속 필드/DTO 변경 없음. helper는 DOM 이벤트·React·서비스에 의존하지 않는다. `isComposing`은 호출부에서 `e.nativeEvent.isComposing`으로 전달한다.
- **Execution Flow / Logic**:
  1. IME/Alt/Shift이면 단축키 결과 null. `Ctrl` 또는 `Meta` + c/v는 copy/paste, modifier 없는 Delete/Backspace는 remove, 그 외 null. 대소문자 차이는 내부 `toLowerCase()`로 처리한다. 수정키 조합 Delete를 일반 삭제로 취급하지 않는다.
  2. 방향키는 modifier/Alt/Shift/IME 없는 경우만 해석한다. Up/Left=-1, Down/Right=1, 그 외 0. 목록의 최초/최후에서는 이동하지 않으며 wrap하지 않는다.
  3. 기존 `busy`, `defaultPrevented`, 열린 메뉴, `isTypingTarget`, `[data-modal-frame]`, `[data-comment-popup]` 검사 유지. 전역 window/document keydown을 추가하지 않는다.
  4. 목록 작업은 탐색 section 자체, 목록 div 자체, `[data-slide-select]` 버튼 내부에 포커스가 있을 때만 허용한다. 목록 div에는 `data-slide-list`를 붙여 판별한다. 임의 패널 토글/헤더 버튼을 목록 선택 대상으로 취급하지 않는다.
  5. 목록의 copy/remove 대상은 현재 `selectedIds`, paste는 active 슬라이드의 소목차와 afterId다. 활성 슬라이드 없는 빈 소목차에서는 현재 `props.sectionId`와 afterId=null을 사용하고 소목차 insert 권한/clipboard 존재를 확인한다. 선택·활성 ID 없는 복사/삭제는 금지한다.
  6. helper가 작업을 반환하면 앱 목록/메뉴 문맥에서만 `preventDefault()` 및 필요시 `stopPropagation()`한다. disabled 작업은 아무 콜백도 실행하지 않으며 브라우저/상위 슬라이드 작업으로 새지 않게 한다. 입력 대상에서는 preventDefault도 하지 않는다.
  7. 기존 Escape 단일 선택 복귀, Shift 다중 선택, Ctrl/Meta 토글 선택, ContextMenu/Shift+F10 열기, 이동 후 scrollIntoView는 유지한다.

### I02. 클릭·팝업 키보드가 같은 대상/권한으로 실행

- Related Files:
  - `components/workspace/production/SlideNavigator.tsx` :: `menuIds`, `closeMenu`, portal `onKeyDown`, 메뉴 버튼 — 공통 작업 설명/실행; modify
  - `hooks/workspace/use-slide-clipboard.ts` :: 기존 앱 클립보드 — read-only
  - `components/workspace/production/ProductionWorkspace.tsx` :: `onCopy`/`onPaste`/`onRemove` callback — read-only

#### Details

- **Signatures & Types** (컴포넌트 내부):

  ```typescript
  type SlideMenuActionId = NavigatorShortcut | "add";
  interface SlideMenuAction {
    id: SlideMenuActionId;
    label: string;
    shortcut: string | null;
    disabled: boolean;
    run(): void;
  }
  // props / WorkspaceOperation 계약은 그대로 유지한다.
  ```

- **Data & Schema Fields**: 메뉴 상태 `{id:string|null;sectionId:string;x:number;y:number}|null` 유지. 별도 clipboard나 OS 권한을 추가하지 않는다.
- **Execution Flow / Logic**:
  1. 현행 menuIds 계산 유지: 우클릭한 행이 선택 목록에 있으면 선택 목록 전체, 아니면 우클릭한 한 장이다. activeId로 대체하지 않는다. 빈 소목차는 []이다.
  2. copy=`canCopy(ids)`, remove=`ids.length > 0 && every row.editable`, paste/add=`insertableSectionIds.includes(sectionId)`이며 paste에는 canPaste 추가. 모두 busy면 disabled. 최신 props를 기준으로 판단한다.
  3. 메뉴 action 배열을 한 번 구성해 클릭과 키보드가 같은 disabled/run을 사용한다. 목록 역시 같은 권한/실행 규칙을 사용하되 문맥에서 계산한 대상 IDs/section/afterId를 넘긴다. 삭제 확인/붙여넣기 미저장 보호는 부모 callback에 이미 있으므로 중복 구현하지 않는다.
  4. 팝업 keydown은 React portal bubbling을 막는다. Escape/Tab 및 Home/End/Up/Down roving focus는 기존 동작 유지. 메뉴 안 Up/Down은 항목 포커스만 이동하며 슬라이드를 이동하지 않는다.
  5. 팝업에서 Ctrl+C/Ctrl+V/Del/Backspace를 누르면 현재 메뉴 문맥 action을 찾는다. 입력/IME/defaultPrevented/busy/모달·댓글 팝업 충돌 시 실행 금지. enabled일 때 `closeMenu()`로 trigger 포커스를 복귀한 뒤 run을 한 번 호출한다. disabled이면 메뉴를 유지하고 아무 작업도 실행하지 않는다.
  6. resize/scroll/outside dismiss, viewport 안으로 메뉴 위치 제한, 첫 enabled 항목 포커스, disabled 항목 건너뛰기는 보존한다. 모두 disabled일 때 Home/End/방향키가 NaN/예외를 만들지 않게 방어한다.
  7. 오류는 기존 부모 서비스/오류 UI에 맡긴다. 여기서 낙관적으로 슬라이드/클립보드를 변경하거나 일반 성공 문구를 추가하지 않는다.

### I03. 키 표시와 구분선

- Related Files:
  - `components/workspace/production/SlideNavigator.tsx` :: 메뉴 JSX — modify
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html` :: `.th-menu`, `.th-menu kbd`, `.th-menu i` — read-only UI reference

#### Details

- 버튼 label 왼쪽 / `<kbd>` 오른쪽: display:flex, align-items:center, gap:18px, kbd margin-left:auto, flex-shrink:0.
- kbd에는 font-family:inherit, line-height:inherit, font-size:11.5px, color:#74747d, font-weight:500을 명시한다. 브라우저 기본 monospace/border/background가 생기지 않도록 한다. 표시 문자열은 Windows 예시 그대로 `Ctrl+C`, `Ctrl+V`, `Del`이다. Meta 처리도 유지하되 플랫폼 추정에 따른 hydration 분기는 만들지 않는다.
- 추가 action 직전에 `<div role="separator">` 하나만 넣는다. block, height:1px, background:#EEF0F3, margin:4px 6px, border:0, padding:0. 고정 width/158.67px 지정 금지. 메뉴 roving focus는 button만 선택하므로 separator는 포커스되지 않는다.
- 바깥 메뉴 크기/좌표/기존 Dadam 폰트 및 다른 메뉴/공용 버튼 스타일을 재설계하지 않는다. JSX 배열의 separator와 button에 안정된 key를 준다.

## Acceptance Criteria

- [x] 세 단축키가 오른쪽 정렬 및 요청한 스타일로 표시되고, 추가 위 구분선의 높이/색/여백이 일치한다.
- [x] 목록과 팝업에서 복사/붙여넣기/삭제가 같은 권한 규칙으로 한 번만 실행된다.
- [x] 우클릭 대상이 active와 달라도 정확한 우클릭 대상에 작업하며, 선택 그룹 우클릭은 그 그룹에 적용한다.
- [x] IME/textarea/contenteditable/모달/댓글 편집 중 슬라이드 작업으로 키가 새지 않는다.
- [x] 완료 잠금/미담당/빈 clipboard/busy에서는 삭제·삽입을 실행하지 않는다. 빈 소목차 추가/붙여넣기는 기존 권한대로 가능하다.
- [x] 목록 ↑/←는 이전, ↓/→는 다음. 팝업 ↑/↓는 메뉴 포커스만 이동한다.
- [x] 담당 2.5px, 슬라이드/장수 gap 8px, 기존 선택/삭제 확인/반응형은 유지된다.

## Validation

실행 시 아래 검증을 한다. 계획 작성 턴에는 실행하지 않는다. `tests/`나 임시 검증 파일을 만들지 않는다.

1. `npm.cmd run typecheck` — 전체 타입 검사 통과.
2. `npx.cmd eslint components/workspace/production/SlideNavigator.tsx lib/workspace/production/navigator-shortcuts.ts` — 변경 파일 lint 통과.
3. PowerShell stdin smoke check:

   ```powershell
   @'
   import assert from "node:assert/strict";
   import { navigatorShortcut, slideNavigationDelta } from "./lib/workspace/production/navigator-shortcuts.ts";
   const event = (key, extra = {}) => ({key, ctrlKey:false, metaKey:false, altKey:false, shiftKey:false, isComposing:false, ...extra});
   assert.equal(navigatorShortcut(event("C", {ctrlKey:true})), "copy");
   assert.equal(navigatorShortcut(event("v", {metaKey:true})), "paste");
   assert.equal(navigatorShortcut(event("Delete")), "remove");
   assert.equal(navigatorShortcut(event("Backspace")), "remove");
   for (const extra of [{isComposing:true}, {altKey:true}, {shiftKey:true}]) assert.equal(navigatorShortcut(event("c", {ctrlKey:true, ...extra})), null);
   assert.equal(navigatorShortcut(event("Delete", {ctrlKey:true})), null);
   assert.equal(slideNavigationDelta(event("ArrowUp")), -1);
   assert.equal(slideNavigationDelta(event("ArrowLeft")), -1);
   assert.equal(slideNavigationDelta(event("ArrowDown")), 1);
   assert.equal(slideNavigationDelta(event("ArrowRight")), 1);
   assert.equal(slideNavigationDelta(event("ArrowDown", {shiftKey:true})), 0);
   console.log("navigator shortcuts: PASS");
   '@ | node --import tsx --input-type=module
   ```

4. 같은 stdin 방식의 jsdom/React 검증 또는 실제 이벤트 핸들러 정적 추적으로 I02 대상 계산을 확인하고 결과를 실행 보고에 남긴다. 최소 사례: A 활성/B 우클릭→B 복사; A+B 선택/B 우클릭→A+B 삭제; 잠긴 B 포함→삭제 없음; 메뉴 열림 Ctrl+V→해당 section/afterId 1회; menu ArrowDown→onSelect 0회; textarea Ctrl+C→onCopy 0회; 빈 소목차 paste afterId=null. 시각 검증을 했다고 보고하지 않는다.
5. `git diff --check` — 공백 오류 없음.

## Commit Message

```text
fix(production): 슬라이드 메뉴 단축키와 이동 방향을 수정

Plan: 2026-11-07-production-prompt-editor-shortcuts
Phase: P01-production
Task: T01-context-menu-shortcuts

- 우클릭 메뉴의 단축키 표시와 추가 구분선을 반영
- 목록과 팝업의 작업 대상 및 권한 검사를 일치
- 위아래 방향키를 이전·다음 슬라이드 순서로 수정
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 완료 커밋 (본 파일 Git 이력 참조)
- 다음 Task: [T02](./T02-slide-prompt-domain.md)
