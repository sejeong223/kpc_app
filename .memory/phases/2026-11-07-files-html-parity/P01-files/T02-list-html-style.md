# Task: T02 자료 사용량·회차·카드 목록 HTML 스타일 적용

## Status: done

## Goal

파일 업로드 메뉴의 사용량, 참조 순서 안내, 회차/분류 패널, 카드, 버튼, 드롭 강조, 삭제 되돌리기를 원본 HTML의 최종 규칙에 맞춘다. 긴 파일명과 좁은 화면에서도 내용/작업 버튼이 잘리지 않게 한다.

## Decision Summary

- 선행 T01은 일반 회차에 `createdInRound === number`인 카드만 표시하고 snapshot은 전체 자료를 표시한다. 이 표시/집계 분리는 유지하고 본 Task는 목록의 모양과 드롭 피드백만 바꾼다.
- `DadamControls.tsx`, 공통 헤더/테마/WorkspaceCard, 저장 타입/selector/service는 수정하지 않는다. 스타일은 파일 메뉴 전용이다.

## Implementation

### I01. 파일 목록 전용 스타일과 사용량

- Related Files:
  - `components/workspace/files/file-list.styles.ts` :: `useFileListStyles` — Griffel `makeStyles`로 목록 범위 스타일; new
  - `components/workspace/files/FilesWorkspace.tsx` :: `FileProjectWorkspace` — 파일 본문 wrapper, 사용량/안내; modify
  - `components/workspace/files/FileRoundSection.tsx` :: `FileRoundSection` — 회차/그리드; modify
  - `components/layout/WorkspacePage.tsx`, `WorkspaceCard.tsx`, `components/providers/DadamThemeScope.tsx`, `lib/ui/dadam-theme.ts`, `app/layout-tokens.css`, `app/dadam-tokens.css`, `app/admin-theme.css` — 기존 레이아웃/토큰; read-only
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html` :: `.up-lim`, `.files-workspace`, `.f-round`, `.f-grid`, `.f-note`, 최종 `wsFiles`; read-only

#### Details

- **Signatures & Types**:

```typescript
// new file: @fluentui/react-components의 makeStyles/tokens 사용.
type FileListStyleSlot =
  | "workspace" | "usage" | "usageCount" | "usageBar" | "usageFill" | "note"
  | "round" | "roundSummary" | "roundMeta" | "grid" | "panelHost" | "panel" | "panelOver"
  | "actions" | "smallButton" | "empty" | "card" | "excluded" | "cardHeader" | "icon"
  | "cardText" | "name" | "meta" | "tags" | "badge" | "required" | "preferred"
  | "normal" | "excludedBadge" | "instruction" | "undo";
export const useFileListStyles: () => Record<FileListStyleSlot, string>;
```

이 타입 블록은 필요한 반환 key 계약이다. 구현은 `makeStyles({ ... })`의 추론 타입을 사용해도 된다. 동적인 style hook/조건부 hook을 만들지 않고 각 컴포넌트 최상단에서 호출한다. 중복 Tailwind와 같은 속성의 충돌을 남기지 말고 해당 class를 대체한다.

- **Data & Schema Fields**:
  - `FileWorkspaceView.currentCount:number`, `currentRound:number`, `rounds:FileRoundView[]`, `canAdd/canReorder:boolean` 그대로 사용한다. `FILE_LIMITS.currentMaterials=30`, `fileBytes=50*1024*1024`.
  - T01 추가 props `FileRoundSectionProps.isCurrent:boolean`, `snapshotId:string|null`, `initialOpen?:boolean` 및 `getDisplayedFileResources(round,snapshotId):FileResourceView[]`를 그대로 유지한다.
  - 신규 데이터/저장 필드는 없다. 진행 막대만 `clampedCount = Math.min(30, Math.max(0,currentCount))`, `widthPercent = clampedCount / 30 * 100`을 계산한다. 실제 라벨 수량/availableSlots는 기존 currentCount를 사용한다.

- **Execution Flow / Logic**:
  1. 기존 WorkspacePage의 ProjectHeader를 유지한다. 그 아래 파일 전용 본문을 `data-files-workspace` wrapper로 묶고 `display:flex; flex-direction:column; gap:12px; min-width:0; width:100%`를 적용한다. 이미 부모가 12px 페이지 inset을 제공하므로 `.wk`의 padding을 추가 복제하지 않는다. 로딩/빈 상태/권한 오류 분기와 숨은 picker는 유지한다.
  2. 파일 wrapper 글꼴은 `tokens.fontFamilyBase`(Spoqa 계열), 기본 14px/20px/400이다. 헤더 스타일에는 영향을 주지 않는다. children가 portal로 이동한다는 이유로 Provider를 추가하거나 교체하지 않는다.
  3. 상단 라벨은 `자료 <b>N / 30개</b>`; 진행 막대; `파일당 50MB · 문서당 300쪽 권장` 순서다. 현재 중복 본문 안내 `· 이 브라우저에 저장`은 제거하고 파일 추가 모달 subtitle에는 유지한다.
  4. 사용량 줄은 flex/wrap, gap8px, font11px, muted `--kpc-muted`, margin `-2px 0 8px`, min-width0. 굵은 부분은 `--kpc-ink`. 플랫폼별 progress 기본 모양 차이를 피하기 위해 HTML처럼 bar/fill 요소를 사용한다. bar는 flex `1 1 0`, min-width0, height5px, radius3px, background `#eef0f2`, overflowhidden; fill은 height100%, background `var(--chart-blue)`이다. role=progressbar, aria-label=자료 사용량, min0/max30/now=clampedCount/valuetext=`자료 N / 30개`를 제공한다.
  5. 참조 순서 문구는 `자료의 참조 순서는 왼쪽부터 적용됩니다.`; margin0, 12px/16px, `--kpc-muted`.
  6. summary는 font14px/20px/**600**, margin-bottom12px, cursorpointer, list-style-positioninside; 보조정보는 margin-left8px, 12px/400/secondary다. 최종 HTML 2402행이 앞선 500을 덮어쓴다. 높이는 최소20px로 확보하고 텍스트가 줄바꿈되면 늘어나도록 하여 확대 시 잘리지 않게 한다. 내용/펼침 상태는 T01 계약 그대로다.
  7. grid는 min-width0/gap12px, 기본 `minmax(0,1fr)`; `@media(min-width:768px)` 2열; `@media(min-width:1280px)` 3열. CSS 순서상 마지막 규칙이다. 이전 1200px 기준을 복사하지 않는다.
  8. 오류/빈 상태/undo는 기존 조건 위치에 유지한다. 정상 상태에서 generic success 줄이나 별도 메뉴 제목을 추가하지 않는다. 요청 실패 시 진행 막대를 임의로 증가시키지 않는다.

### I02. 분류 패널·카드·권한별 액션

- Related Files:
  - `components/workspace/files/FileCategoryPanel.tsx` :: `FileCategoryPanel`, `CATEGORY_DRAG_TYPE` — 분류 패널과 드롭; modify
  - `components/workspace/files/FileResourceCard.tsx` :: `FileResourceCard` — 자료 카드; modify
  - `components/workspace/files/FileResourceMeta.tsx` :: `FileResourceMeta`, `formatFileResourceMeta` — 스타일만, 포맷 함수 유지; modify
  - `components/workspace/files/ReferencePriorityBadge.tsx` :: `ReferencePriorityBadge` — 최종 HTML 우선순위 색; modify
  - `components/workspace/files/FileUndoNotice.tsx` :: `FileUndoNotice` — 삭제 안내 스타일; modify
  - `components/workspace/files/FileRoundSection.tsx` :: orderControls — 목록 작은 버튼 class 전달; modify
  - `components/ui/DadamControls.tsx`, `components/layout/WorkspaceCard.tsx`, `config/workspace-files.ts` — 재사용 컴포넌트/라벨; read-only

#### Details

- **Signatures & Types** (기존 유지):

```typescript
interface FileResourceCardProps {
  resource: FileResourceView; round: number; readOnly: boolean; disabled?: boolean;
  onOpen?(resource: FileResourceView, round: number): void;
  onEdit?(resource: FileResourceView, round: number): void;
  onRemove?(resource: FileResourceView): void;
}
interface FileCategoryPanelProps extends Pick<FileResourceCardProps,
  "round"|"readOnly"|"onOpen"|"onEdit"|"onRemove"|"disabled"> {
  category: FileCategory; ordinal: number; resources: FileResourceView[]; canAdd: boolean;
  onAdd?(category: FileCategory): void;
  onDropFiles?(category: Exclude<FileCategory,"web">, files: File[]): void;
  orderControls?: React.ReactNode;
  onCategoryDrop?(source: FileCategory, target: FileCategory): void;
}
export function formatFileResourceMeta(resource: FileResourceView): string;
// ReferencePriorityBadgeProps = { priority: ReferencePriority }
// FileUndoNotice props = { removal:FileRemoval; busy:boolean;
//   onUndo(id:string):void; onExpire():void }
```

- **Data & Schema Fields**:
  - `FileCategory = "proposal"|"related"|"web"`; labels=`제안 관련 자료|유관자료|웹 검색`; 순서는 round.categoryOrder의 값으로 정한다.
  - `FileResourceView.asset`의 `ownerName:string`, version의 `label/kind/instruction/createdAt/priority/category/source`, `canManage:boolean`, `isInherited:boolean`은 기존 selector가 제공한다. 원본 file의 `byteLength:number`, web의 `url:string,period:"all"|"1y"|"3m"`는 기존 meta 함수에 전달한다.
  - 새 로컬 상태 `isDragOver:boolean`, 기본 false는 허용된 드롭 강조만 나타낸다. 서버/저장 상태가 아니다.
  - `FileRemoval.expiresAt:string` 기반의 실제 remaining seconds 계산과 250ms 확인 타이머를 그대로 둔다. 표시 시점마다 15초로 리셋하지 않는다.

- **Visual Contract**:

| 요소 | 최종 스타일 |
| :--- | :--- |
| 분류 패널 | min-width0; white; border1px `--kpc-line`; radius12px; flex column; header padding12/gap8/wrap; 제목13px/700 |
| 패널 본문 | gap12; padding `0 12px 12px`; flex1. 기존 WorkspaceCard에 local class/직계 header·body selector로 적용하며 공용 파일은 변경하지 않음 |
| 액션 | flex/wrap/gap4; 작은 DadamButton height/min-height32, padding0 12, font12/20/400, radius8 |
| 빈 상태 | min-height128, flexcenter, dashed1px line, radius8,padding12, font14,secondary; 현재/과거/웹별 기존 문구 유지 |
| 카드 | border1px line,radius8,white,padding12,min-width0; excluded만 opacity.65 |
| 카드 머리 | flex/align-start/gap8; 아이콘 최종14×14px,margin-top4,shrink0,accent-ink |
| 카드명 | block,width100%,border0,bgtransparent,padding0,text-left,font14/500,colorinherit,overflow-wrap:anywhere; hoverunderline, focus-visible 유지 |
| 메타 | margin4px 0,font12/16,secondary,overflow-wrap:anywhere |
| 배지 줄/배지 | flexwrap,gap4,margin8px 0; radius4,padding4px 8px,font12/16 |
| 배지 색 | required=`#fff9f5/#bc4b09`; preferred=Dadam soft/ink; normal=Fluent neutralBackground3/Foreground2; excluded=neutralBackground2/Foreground3 |
| 활용 지침 요약 | margin8px 0,font12,secondary,2줄 clamp,긴 토큰 줄바꿈 |
| 되돌리기 | flexwrap/gap8,radius8,Dadam soft,padding12,font14; 버튼 목록 small 규격 |

일반 파일 메뉴 버튼의 최종 HTML `.btn` weight는 400(2292행)이며 DadamButton 기본500을 **호출부 className으로만** 보정한다. primary/input 팝업은 T03의 별도 규칙이다. disabled 배경 `#f0f0f0`, 글자 `#bdbdbd`, 선 `#e0e0e0`를 파일 메뉴 small class에 한정하고 disabled hover도 유지한다. aria-disabled 및 keyboard focus를 없애지 않는다.

- **Execution Flow / Logic**:
  1. 기존 WorkspaceCard를 유지하고 title은 `${ordinal}. ${label} · ${resources.length}`. 순서 버튼은 writable + canReorder, 추가 버튼은 canAdd + 현재 writable에 한정한다. 중복 제목/배지/새 버튼을 만들지 않는다.
  2. 순서 DnD MIME은 기존 `application/x-kpc-file-category` 그대로다. 파일 드롭과 분류 이동을 구분하고, 각 분류의 callback 권한을 유지한다. 실제 파일은 web에 drop할 수 없다.
  3. 허용된 드래그에만 `outline:2px dashed var(--dadam-accent); outline-offset:2px`를 표시한다. dragleave/drop/dragend/disabled 전환 시 정리하며 자식 요소를 가로지를 때 불필요하게 깜박이지 않게 이벤트 경계를 처리한다. 성공/실패와 무관하게 drop 후 강조가 남지 않는다. 잘못된 payload는 기존처럼 저장 호출 없이 무시한다.
  4. 카드명 클릭은 해당 version/round의 `onOpen`을 호출한다. 관리 가능한 현재 자료에는 설정/삭제, 과거에는 현재 회차에서 편집만 표시한다. canManage=false에는 편집 액션을 제공하지 않는다. inherited 배지는 기존 props 조건만 유지하며 T01 일반 필터에서는 자연히 표시되지 않는다.
  5. FileResourceMeta의 실제 파일 크기/호스트/기간/등록자/Asia-Seoul 날짜 포맷은 보존한다. 자료명/지침/URL을 `dangerouslySetInnerHTML`로 출력하지 않는다.
  6. 저장 실패, 삭제 취소, undo 만료는 기존 동작을 따른다. 시각 일치를 위해 권한이나 disabled 검사를 제거하지 않는다.

## Acceptance Criteria

- [ ] 사용량은 11px,5px 막대이고 본문 저장 위치 안내는 중복 표시되지 않는다. 13/30 예시의 수량/진행률은 T01대로다.
- [ ] 최종 600 회차 제목, 14px 카드 아이콘, 14px/500 자료명, 지정 badge 색과 작은 버튼 규격을 사용한다.
- [ ] 767/768/1279/1280px 경계에서 1/2/2/3열 규칙이며 파일명·메타·버튼은 줄바꿈 가능하다.
- [ ] 현재/과거/완성본의 액션 권한·열림 상태·수량 계산이 바뀌지 않는다.
- [ ] 유효한 파일·분류 드롭만 강조되고 종료 시 강조가 사라진다. 드롭·화살표 정렬은 기존 callback을 호출한다.
- [ ] 공용 버튼/테마/헤더/저장 경로는 변경되지 않고 일반 성공 문구도 복원되지 않는다.

## Validation

루트에서 실행한다. 본 Task는 스타일 변경 중심이므로 별도 테스트 파일/구현 복제 테스트를 만들지 않는다.

- `npm.cmd run typecheck` — exit0.
- `npx.cmd eslint components/workspace/files/FilesWorkspace.tsx components/workspace/files/FileRoundSection.tsx components/workspace/files/FileCategoryPanel.tsx components/workspace/files/FileResourceCard.tsx components/workspace/files/FileResourceMeta.tsx components/workspace/files/ReferencePriorityBadge.tsx components/workspace/files/FileUndoNotice.tsx components/workspace/files/file-list.styles.ts --max-warnings=0` — exit0.
- `rg -n 'fontSize|fontWeight|lineHeight|768|1280|outline|14px|11px|5px|chart-blue|fff9f5|bc4b09|fontFamily' components/workspace/files/file-list.styles.ts` — 위 visual contract과 대조, 출력만으로 통과 판정하지 않음.
- `rg -n 'canManage|canAdd|canReorder|readOnly|disabled|Drag|Drop|getDisplayedFileResources|currentCount' components/workspace/files` — 권한/DnD/수량 분기 정적 확인.
- 보호 파일 해시 확인:

```powershell
if ((Get-FileHash -LiteralPath 'components/ui/DadamControls.tsx' -Algorithm SHA256).Hash -ne '56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84') { throw 'DadamControls changed' }
git diff --check
```

- `git diff --name-only` — 파일 화면/메모 외 수정 없음. 기존 T01 보존 여부를 정적으로 확인한다.
- 결과는 필요 시 `.memory/reports/2026-11-07-files-html-parity-validation.md`에 누적한다. 브라우저/CUA/E2E/dev server/스크린샷·임시 검증 파일은 금지하며 픽셀 동일성을 검증했다고 보고하지 않는다.

## Commit Message

```text
style(files): 자료 목록과 카드 디자인을 HTML에 맞춤

Plan: 2026-11-07-files-html-parity
Phase: P01-files
Task: T02-list-html-style

- 사용량과 회차·분류·자료 카드의 최종 HTML 규칙 적용
- 파일 메뉴에 한정해 버튼·배지·드롭 강조를 조정
- 기존 권한과 참조 수량 및 반응형 레이아웃 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일의 Task 식별자를 가진 완료 커밋 (해시는 current에 기록)

검증 통과 후 Task/phase를 갱신하고 이 범위만 한글 커밋한다. current는 강제 stage하지 않고 `T03-reference-dialogs.md`로 전진한다. 원본 HTML 수정/데이터 초기화/패키지 추가/인프라 변경은 금지한다.
