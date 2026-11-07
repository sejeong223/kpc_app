# Task: T03 단일 통프롬프트 편집기 적용

## Status: done

## Goal

제작 화면의 일반/제조업 편집기를 하나의 자유로운 통프롬프트 입력창과 동일한 저장·권한 흐름으로 통합한다. 입력한 원문을 현재 슬라이드에 저장하고 로컬 배치 결과를 기존 미리보기로 보여준다.

## Decision Summary

- 사용자는 제목/본문/표용 프롬프트 구역을 원하지 않는다. **한 개의 multiline plain-text 입력만** 제공한다. 문장/문단/줄바꿈을 자유롭게 작성하며 별도 AI 입력창도 만들지 않는다.
- T02의 `readSlidePrompt`, `SlidePromptRequest`, `service.applySlidePrompt` 사용. 기본 편집기의 공통 권한·미저장 보호·현재 슬라이드 원문을 유지하고 제조업 예시와 같은 기존 레이아웃 배치 결과를 사용한다.
- 실제 AI 대신 로컬 시연이며 원문/결과를 각 슬라이드에 저장한다. 버튼 리팩토링은 제외한다.
- 후속 T04에서 개별 상태 변경은 실제 담당자만 허용하도록 별도 권한을 추가한다. 이 Task의 기본 편집 권한은 본문 저장 기준이며 상태 드롭다운 권한과 같다고 가정하지 않는다.
- T04에서 완료 상태는 단일 입력창 대신 회색 점선의 접힌 CompletedSlidePrompt로 전환한다. 이 Task에서 완료/readOnly인 상태의 전송 버튼은 disabled로 남기지 않고 렌더링하지 않는 계약을 마련한다. 완료 안내·펼침은 T04에서 한 곳에 구성한다.
- 선행 T01/T02 완료. 이 Task에서만 기존 두 editor/hook 분기를 교체한다.

## Implementation

### I01. 한 개의 슬라이드 원문 draft 훅

- Related Files:
  - `hooks/workspace/use-slide-prompt.ts` :: `useSlidePrompt` — new
  - `hooks/workspace/use-workspace-production.ts` :: `useWorkspaceAction` — read-only 재사용
  - `components/workspace/WorkspaceProjectProvider.tsx` :: `useWorkspaceRuntime`, runtime.isActive — read-only
  - `lib/workspace/production/slide-prompt.ts` :: `readSlidePrompt` — read-only
  - `types/workspace-production.ts` :: `SlidePromptRequest`, `ProjectView`, `WorkspaceReceipt` — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface SlidePromptDraft {
    projectId: string;
    round: number;
    slideId: string;
    baseRevision: number; // 프로젝트 state.revision. slide.revision이 아니다.
    prompt: string;
    dirty: boolean;
  }
  export interface SlidePromptEditorModel {
    draft: SlidePromptDraft;
    conflict: boolean;
    error: string | null;
    busy: boolean;
    markDirty(): void;
    setPrompt(value: string): void;
    save(): Promise<void>;
    discard(): void;
  }
  export function useSlidePrompt(view: ProjectView, slide: ProposalSlide): SlidePromptEditorModel;
  ```

- **Data & Schema Fields**: draft는 UI 메모리의 임시 상태다. project/round/slide 식별과 **첫 변경 시점의 project revision**을 보존한다. 저장 raw field는 T02의 `slide.editorPrompt`, 결과는 `slide.content`다. sectionId로 draft를 공유하지 않는다.
- **Execution Flow / Logic**:
  1. baseline은 `readSlidePrompt(slide)`와 현재 projectId/round/slideId/state.revision. clean 상태에서 최신 view를 받으면 baseline을 갱신한다. dirty 상태는 최신 view로 덮지 않는다.
  2. 첫 `beforeinput`/`compositionstart`/`onChange`에서 `markDirty()`하여 baseline revision을 동결한다. 이어지는 setPrompt는 같은 draft 식별/기준 revision을 유지하며 value만 갱신한다. 동일 React 배치 안에서 markDirty와 setPrompt가 발생해도 ref 또는 함수형 update로 첫 baseline이 유실되지 않게 한다.
  3. dirty 중 project/round/slide/baseRevision이 최신 view와 달라지면 conflict=true이며 원문을 보존한다. 바뀐 round의 같은 slideId도 기존 draft로 덮어 저장하지 않는다. 조회가 저장 receipt보다 늦게 도착한 경우 더 오래된 clean view로 저장 직후 원문을 되돌리지 않는다.
  4. `useWorkspaceAction<WorkspaceReceipt,SlidePromptRequest>((runtime,input)=>runtime.service.applySlidePrompt(input))`를 사용한다. 저장 요청은 draft.projectId/baseRevision/round/slideId/prompt만 보낸다. mutation 시작 전 conflict/입력 유효성을 확인한다.
  5. running ref로 중복 반영을 막는다. save 진입 시 draft를 캡처하고 onChange는 저장 중 막는다. 완료 후 mounted/runtime.isActive/session 식별/generation이 여전히 같은 경우에만 receipt에서 저장된 slide를 찾아 clean draft로 교체한다. 예전 비동기 응답이 새 프로젝트/슬라이드 입력을 지우면 안 된다.
  6. CONFLICT/권한/잠금/길이/배치 오류는 저장 오류를 노출하고 dirty 원문을 유지한다. 마지막 저장 결과를 미리보기로 계속 보여준다. 실패 후 재입력 시 이전 오류를 지우되 필요한 재검사 결과는 유지한다.
  7. discard는 최신 접근 가능한 slide의 baseline으로 되돌리고 mutation error를 reset한다. 저장 중 discard/중복 save를 허용하지 않는다. 접근 상실 시 원문 복사와 폐기는 가능하되 비공개 최신 내용을 다시 가져와 노출하지 않는다.
  8. blank/20000자 초과는 검증 오류다. fallback 기존 원문이 길다고 자동 자르지 않는다. `<textarea maxLength>`로 기존 장문을 조용히 잘라내는 방식도 쓰지 않는다.

### I02. 구역 없는 입력창·저장 버튼

- Related Files:
  - `components/workspace/production/SlidePromptEditor.tsx` :: `SlidePromptEditor` — new
  - `components/workspace/production/SlideContentEditor.tsx` :: 현행 스타일/저장 화살표 — read-only reference 후 I04에서 제거
  - `components/ui/DadamControls.tsx` :: `DadamButton` — read-only 재사용
  - `lib/ui/dadam-theme.ts` :: `dadamUi` — read-only 재사용

#### Details

- **Signatures & Types**:

  ```typescript
  export interface SlidePromptEditorProps {
    value: string;
    dirty: boolean;
    readOnly: boolean;
    busy: boolean; // 외부 작업 또는 저장 중. composing 자체를 포함하지 않는다.
    composing: boolean;
    error: string | null;
    onEditStart(): void;
    onChange(value: string): void;
    onCompositionChange(value: boolean): void;
    onSave(): void;
  }
  export default function SlidePromptEditor(props: SlidePromptEditorProps): React.ReactElement;
  ```

- **Data & Schema Fields**: 입력 value는 string 하나뿐이다. UI에서 SlideContent/title/lead/table별 값을 편집하거나 ManufacturingPrompt.intro/bullets를 만들지 않는다.
- **Execution Flow / Logic**:
  1. 한 개의 controlled textarea를 렌더한다. 접근성 label은 `슬라이드 작성 내용`, placeholder는 `슬라이드에 담을 내용을 자유롭게 작성해 주세요.`로 한다. title/body/table 구역, 폼 필드, 문법 안내를 넣지 않는다. 붙여넣기는 textarea의 일반 텍스트 동작을 사용한다.
  2. 사용자가 쓴 줄바꿈/공백을 그대로 value로 유지한다. 입력 도중 문장 분리·제목 추출·결과 역변환·자동 서식 적용을 하지 않는다. AI 배치 시연은 반영 버튼을 누를 때만 발생한다.
  3. textarea는 width:100%, min-width:0, box-sizing:border-box, font-family:tokens.fontFamilyBase(DadamThemeScope의 DADAM_FONT_FAMILY), font-size:13px, line-height:1.7을 사용해 현행 편집기 글꼴 계약을 유지한다. 보조 문구는 dadamUi.metaSize를 사용한다. 현재 문서 편집기의 border-radius:14px/그림자/안쪽 padding:12px 52px 12px 16px를 이어 쓰고 내부 높이 48~180px, 세로 overflow:auto, overflow-wrap:anywhere를 적용한다. 긴 한 줄 입력으로 중앙 패널의 최소 폭이 늘어나지 않게 한다.
  4. `useLayoutEffect`/ref로 value 변화에 맞춰 textarea 높이를 auto로 reset 후 scrollHeight를 48~180px로 clamp한다. style에 강제 페이지 폭/고정 canvas 높이를 넣지 않는다. 부모의 ProductionPanels 출처 접기/폭 재배분 계약을 보존한다.
  5. 현재와 같은 DadamButton/ArrowUp20Regular 저장 버튼을 사용하고 title/aria-label=`슬라이드에 반영`. 바깥 버튼 설계나 공용 컴포넌트를 수정하지 않는다. 단일 입력창의 하단에 `AI 배치 시연`을 작은 보조 문구로 표시한다. 성공 토스트/`변경을 완료했습니다.` 문구를 추가하지 않는다.
  6. `readOnly`이면 저장 버튼을 렌더링하지 않는다. 편집 가능한 상태에서 `busy || composing || error`이면 저장 버튼을 disabled로 한다. 입력창은 권한/저장 busy에 의해 readOnly가 되며 **composing=true 자체 때문에 readOnly/disabled로 바뀌지 않는다**. 한글 조합이 진행되는 중 입력 요소를 remount하지 않는다. Ctrl+S는 adapter에서 처리한다.
  7. compositionstart에서 onEditStart 후 composing=true, compositionend에서 최종 textarea.value를 onChange한 뒤 composing=false. beforeinput/onChange에서도 첫 변경 기록을 남긴다. 저장/화면 이동은 composition이 끝날 때까지 막는다.
  8. 읽기 전용에서도 텍스트 선택/복사는 허용한다. 원문 error는 role=alert, 미반영 변경/읽기 전용 상태는 보조 문구로 보여준다. 저장 실패로 텍스트를 지우거나 기존 저장 결과를 입력칸에 덮지 않는다.

### I03. 편집 adapter 통합과 기본 편집 권한 적용

- Related Files:
  - `components/workspace/production/ActiveSlideEditor.tsx` :: `ActiveSlideEditor`, `ProductionEditorParts` — new
  - `components/workspace/production/ProductionWorkspace.tsx` :: `ActiveSlide`, `ActiveManufacturingSlide`, `Editor` 분기, center 연결 — modify
  - `components/workspace/shared/WorkspaceUi.tsx` :: `DraftProtection` — read-only
  - `components/workspace/production/ProductionPreview.tsx`, `ProductionPanels.tsx`, `ProductionToolbar.tsx` — read-only, 회귀 확인 대상

#### Details

- **Signatures & Types**:

  ```typescript
  export interface ProductionEditorParts {
    editor: React.ReactNode;
    preview: React.ReactNode;
    dirty: boolean;
  }
  export interface ActiveSlideEditorProps {
    view: ProjectView;
    slide: ProposalSlide;
    snapshotId: string | null;
    externalConflict: string | null;
    busy: boolean;
    accessDenied: boolean;
    onDirtyChange(dirty: boolean): void;
    onBusyChange(busy: boolean): void;
    aiFeedback?: React.ReactNode;
    showPreview: boolean;
    commentCreateTarget: HTMLElement | null;
    renderLayout(parts: ProductionEditorParts): React.ReactNode;
  }
  export default function ActiveSlideEditor(props: ActiveSlideEditorProps): React.ReactElement;
  ```

- **Execution Flow / Logic**:
  1. 새 adapter는 useSlidePrompt를 한 번 호출한다. 현행 ActiveSlide의 `can` 조건을 기준으로 한다: !snapshotId, !externalConflict, !accessDenied, state.phase===writing, capabilities.editableSlideIds.includes(slide.id). 내부 conflict도 반영 버튼을 차단한다.
  2. MFG projectId/section.demoPrompt/template 유무에 따른 편집기 선택과 `section.assigneeIds.includes(view.actor.id)` 추가 제약을 제거한다. 일반/제조업/HTML/Template 모두 같은 editor/hook을 사용한다. 미리보기의 레이아웃 선택은 ProductionPreview에 남긴다.
  3. `readOnlyReason`은 보관본/비작성 회차/완료 고정/편집 권한 없음 순서로 명확히 표시한다. 개별 슬라이드 완료·해제는 기존 toolbar 동작을 재사용한다. readOnly 안내 때문에 다른 형제 슬라이드도 잠그지 않는다.
  4. localBusy=mutation.busy||composing을 부모 onBusyChange에 전달해 목록/상태 변경/선택 이동을 보호한다. 부모에서 돌아오는 busy는 현행처럼 **externalBusy만** adapter에 전달한다. textarea에는 externalBusy||mutation.busy를 전달해 composition 상태가 자기 자신을 잠그는 순환을 만들지 않는다.
  5. Ctrl/Meta+S는 adapter 범위에서 preventDefault/stopPropagation하고 canSave일 때만 저장한다. IME 중에는 저장하지 않는다. 한 번의 입력 이벤트가 목록 복사/삭제 단축키를 호출하지 않는다.
  6. DraftProtection에 dirty/busy/onSave/onDiscard를 연결한다. 저장 거절/실패이면 navigation guard가 이동을 완료하지 않도록 save Promise를 reject한다. 폐기는 최신 baseline으로 복귀하고 composing/error도 reset한다.
  7. 기존 editing session/lastSlide/sessionConflict/선택 navigation guard/다중 선택을 유지한다. project:round:snapshot:slide 식별을 검토하되 dirty session을 강제 remount하여 지우지 않는다. 권한이 사라져도 dirty 원문은 읽기 전용으로 복사 가능하게 남기고 preview는 기존 정책대로 숨긴다.
  8. 미리보기는 저장된 slide만 사용하며 draft를 즉석 content로 변환하지 않는다. showPreview=false(다중 선택)이면 현재 다중 미리보기와 기존 별도 ProductionAiPanel을 유지한다. 새 통프롬프트 반영은 현재 한 장만 대상으로 하며 선택 그룹에 일괄 적용하지 않는다.
  9. renderLayout(editor,preview,dirty) 인터페이스를 유지하여 Toolbar/SourcePanel/ProductionPanels/댓글 배치와 중앙 높이·폭 계산을 보존한다. 새 편집기 때문에 전체 제작 CSS/공통 헤더/버튼을 재설계하지 않는다.

### I04. 직접 대체한 경로만 정리

- Related Files:
  - `components/workspace/production/SlideContentEditor.tsx` — 대체 완료 및 참조 0 확인 후 delete
  - `components/workspace/production/ManufacturingPromptEditor.tsx` — 동일 조건 delete
  - `hooks/workspace/use-slide-draft.ts`, `hooks/workspace/use-manufacturing-prompt.ts` — 동일 조건 delete
  - `types/workspace-production.ts` :: legacy `apply-manufacturing-prompt` operation — modify
  - `lib/workspace/production/schemas.ts` :: legacy public operation — modify
  - `lib/workspace/production/domain.ts` :: legacy case/import — modify
  - `lib/workspace/production/manufacturing-prompt.ts` :: `applyManufacturingPromptContent` — 사용처 0이면 해당 함수와 전용 import 제거; `manufacturingLayout` 유지
  - `lib/workspace/production/editor.ts`, `document-editor.ts` — 공용 선택/붙여넣기·문서 처리 유틸 전면 청소 금지

#### Details

- 계획 시점에는 두 editor/두 hook 호출부가 ProductionWorkspace에만 있고, old mapper 호출은 domain의 legacy case뿐이다. 실행 직전 `rg`로 새 호출자가 생기지 않았는지 확인한다.
- UI 교체 후 `DocumentEditorState`의 잔여 import를 제거한다. 새 prompt hook/adapter는 옛 structured document 상태를 참조하지 않는다.
- legacy operation/type/schema/domain case는 저장 데이터 형식이 아니므로 live 호출부가 0이면 같은 Task에서 제거한다. `ManufacturingPromptSchema`/`ManufacturingPrompt`/`Section.demoPrompt`는 seed 및 과거 저장 데이터에서 쓰이므로 **남긴다**.
- `save-slide`/`edit-slide` 등 다른 범용 mutation, PPT/document parser, manufacturingLayout, 기존 preview는 삭제하지 않는다. 버튼 통합/서비스 전체 분리/전역 dead-code cleanup을 추가하지 않는다.
- 사용자 또는 다른 작업이 새 호출자를 추가했다면 함부로 삭제하지 말고 그 호출자와의 호환성을 유지한 채 직접 편집기 통합 범위만 완료하고 실행 보고에 적는다.

## Acceptance Criteria

- [x] 일반/제조업/HTML/Template 모두 작성 중에는 한 개의 통프롬프트 입력창을 사용한다. 제목/표 입력 구역·intro/bullets 모델을 UI에서 요구하지 않는다. 최종 완료 상태의 접힘/보기 카드는 T04에서 구성한다.
- [x] 입력 원문 그대로 현재 슬라이드에 저장되고, 결과는 기존 레이아웃에 배치된다. 다른 슬라이드로 갔다 돌아와도 독립된 원문이 복구된다.
- [x] 예전 슬라이드 원문은 자기 content에서 시작하고 같은 소목차의 다른 원문을 가져오지 않는다.
- [x] 현재 한 장만 반영한다. PM/관리자/담당자 권한과 개별 완료 잠금, 보관본 읽기 전용이 기본 편집기와 동일하다.
- [x] 한글 IME/Ctrl+S/중복 저장/실패·충돌/권한 상실/미저장 이동에서 입력이 유실되지 않는다.
- [x] 저장 성공 일반 문구 없음. 실제 AI로 가장하지 않고 `AI 배치 시연` 표시. 버튼 리팩토링 없음.
- [x] 긴 prompt/좁은 패널에서도 min-width 때문에 출처 뒤로 중앙이 잘리지 않는다. 기존 폰트·슬라이드 테두리·gap·패널 동작 보존.
- [x] 대체된 editor/hook 분기가 제거되고 타입/lint/build와 필요한 동작 검증을 통과한다.

## Validation

테스트 폴더/임시 검증 파일/브라우저/CUA/E2E/dev server/스크린샷 금지. 실행 시 `.memory/reports/2026-11-07-production-prompt-editor-shortcuts-validation.md`에 결과와 한계를 기록한다.

1. `npm.cmd run typecheck`
2. `npx.cmd eslint components/workspace/production/ProductionWorkspace.tsx components/workspace/production/ActiveSlideEditor.tsx components/workspace/production/SlidePromptEditor.tsx hooks/workspace/use-slide-prompt.ts types/workspace-production.ts lib/workspace/production/schemas.ts lib/workspace/production/domain.ts lib/workspace/production/manufacturing-prompt.ts` — 삭제 파일은 lint 대상으로 넣지 않는다.
3. `rg -n 'ActiveManufacturingSlide|useManufacturingPrompt|useSlideDraft|ManufacturingPromptEditor|SlideContentEditor|apply-manufacturing-prompt' components hooks services lib types` — 실행 호출부 0 확인. `ManufacturingPromptSchema`와 legacy 데이터 보존은 정상이다.
4. PowerShell here-string을 `node --import tsx --input-type=module`에 넘겨 이미 설치된 jsdom/React DOM과 임시 in-memory runtime/service로 editor 및 hook을 검증한다. 파일에 스크립트를 쓰지 않는다. 필요한 client provider/ResizeObserver/scroll API는 메모리 stub 사용. 검증 행렬:
   - 작성 중 prompt 입력 textarea는 정확히 하나. 입력용 title/body/table/intro/bullets 필드 없음. plain paste/줄바꿈/한글 전체 value 보존. 완료 상태의 최종 UI는 T04 검증 기준을 따른다.
   - 한 개 자유 문단을 입력→반영→정확한 raw + 배치 content 저장. A/B 같은 소목차 전환→각 원문 독립. 텍스트 내용 변경 전에는 저장된 preview 유지.
   - IME compositionstart→view revision 변경→compositionend→conflict 표시/원문 보존. IME 중 Ctrl+S/버튼 클릭 mutation 0회, 완료 후 저장 1회.
   - 저장 중 두 번 클릭→service 1회. 늦은 receipt/프로젝트 변경/unmount 후 새 draft를 지우지 않음. 실패/rejected save 시 이동 보호 유지, 명시 폐기 시 이동 가능.
   - completed slide는 readOnly/저장 불가, 형제 writing slide는 가능. PM·super_admin은 기본 canEditSlide 권한대로 가능하며 제조업 전용 assignee 차단 없음. accessDenied dirty는 원문 복사 가능·preview 비표시.
   - 외부 revision 충돌/20001자/빈 입력/Template LAYOUT 오류시 원문 유지 및 role=alert. 저장 성공 일반 토스트 없음.
   - 목록/팝업 Ctrl+C/V/Delete와 textarea 문자 편집이 충돌하지 않음. T01 ↑/↓ 의미도 유지.
5. 레이아웃 정적 검토: textarea width/min-width/box-sizing/wrap/최대 높이·overflow 및 부모 ProductionPanels의 min-width:0/flex 제한을 확인. jsdom은 실브라우저 폭/시각 결과를 검증하지 못하므로 실행 보고에 **브라우저 시각 검증 미실시** 명시.
6. `npm.cmd run build` — 최종 전체 빌드.
7. `git diff --check` — 공백 오류 없음. 원본 HTML/공용 버튼/예시 seed/패키지/DB가 바뀌지 않았는지 diff 범위 확인.

## Commit Message

```text
refactor(production): 제작 편집기를 통프롬프트 흐름으로 통합

Plan: 2026-11-07-production-prompt-editor-shortcuts
Phase: P01-production
Task: T03-unified-prompt-editor

- 일반·제조업 편집을 하나의 자유 입력과 슬라이드별 저장으로 통합
- 기본 편집 권한과 미저장·IME·충돌 보호를 유지
- 대체된 편집기와 제조업 전용 실행 분기를 정리
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 완료 커밋 (본 파일 Git 이력 참조)
- 다음 Task: [T04 상태 권한·완료 프롬프트 표시](./T04-assignee-slide-status.md). T03 완료 시 done:3/4이며 current를 T04로 전진한다.
