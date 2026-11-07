# Task: T03 파일 추가·자료 설정·웹 링크 팝업 HTML 일치

## Status: done

## Goal

파일 추가, 개별·일괄 참조 설정, 현재 회차로 복사 편집, 웹 링크 추가·설정의 팝업 구성을 최종 HTML과 맞춘다. 기존 실제 파일 선택·저장·URL 검증·초안 보존을 그대로 사용한다.

## Decision Summary

- 선행 T01/T02 완료를 전제로 한다. 회차별 표시와 전체 30개 집계는 이미 분리되어 있다. 이번 Task는 입력 팝업 표현과 입력 구성에 한정한다.
- 공용 DadamControls/SegmentedControl/ModalFrame/테마/Provider를 수정하지 않고, 기존 className과 ModalFrame.slotClassNames로 파일 팝업에만 적용한다. 저장 스키마/API/권한은 변경하지 않는다.

## Implementation

### I01. 파일 팝업 전용 스타일과 공통 입력 필드

- Related Files:
  - `components/workspace/files/file-dialog.styles.ts` :: `useFileDialogStyles` — 파일 팝업 전용 Griffel 스타일; new
  - `components/workspace/files/FileReferenceFields.tsx` :: `FileReferenceFields` — 종류/우선순위/지침; modify
  - `components/workspace/files/FileDialogFeedback.tsx` :: `FileDialogFeedback` — 오류 스타일 정렬, 동작 유지; modify
  - `components/workspace/files/file-ui-types.ts` :: `FileReferenceFieldsProps`, `FileDialogBaseProps` — 기존 타입; read-only
  - `components/ui/DadamControls.tsx`, `SegmentedControl.tsx`, `ModalFrame.tsx`, `lib/ui/dadam-theme.ts`, `config/workspace-files.ts` — 재사용 계약; read-only
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html` :: `rmFields`, `drawRefModal`, `.f-*`, `#refmodal`, `.chs`, `.seg`, `.modal-*` 최종 정의; read-only

#### Details

- **Signatures & Types**:

```typescript
type FileDialogStyleSlot = "header"|"body"|"footer"|"button"|"primaryButton"|"smallButton"
  |"field"|"fields"|"priority"|"priorityGroup"|"periodGroup"|"summary"|"instruction"
  |"textarea"|"counter"|"invalid"|"hints"|"drop"|"dropText"|"bulk"|"bulkSelect"
  |"bulkSelected"|"row"|"rowHeader"|"filename"|"fileSize"|"legend"|"footNote"|"feedback";
export const useFileDialogStyles: () => Record<FileDialogStyleSlot,string>;
// 구현은 makeStyles의 추론 반환 타입을 사용해도 된다.
interface FileReferenceFieldsProps {
  value: FileSettings; idPrefix: string; disabled?: boolean;
  onChange(value: FileSettings): void;
}
interface FileDialogBaseProps {
  open: boolean; busy: boolean; error: WorkspaceFileError | null;
  onClose(): void; onDirtyChange(dirty:boolean):void; onReload():void;
}
// ModalFrame의 기존 확장 지점:
// slotClassNames?: Partial<Record<"header"|"body"|"footer",string>>
```

- **Data & Schema Fields**:
  - `FileSettings`: `kind: ReferenceKind`, `priority: ReferencePriority`, `instruction:string` (최대4,000자, 기본빈문자열). `ReferenceKind`=`rfp|business|customer|case-study|technical|company|web|other`; priority=`required|preferred|normal|excluded`.
  - `REFERENCE_KINDS/REFERENCE_PRIORITIES/PROMPT_HINTS`는 기존 config 배열을 사용한다. labels/description을 UI에 중복 정의하지 않는다.
  - 지침 펼침은 기존 `<details>`의 로컬 DOM 상태다. DB나 draft dirty 판단에 펼침을 포함하지 않는다. 새 필수 입력 구역은 없다.
  - 팝업이 열리는 key, 기존 useId, nullable error는 그대로 유지한다. 서버 렌더에서 난수를 추가해 key/id를 만들지 않는다.

- **Visual Contract**:

| 항목 | 최종 규칙 |
| :--- | :--- |
| 모달 기본 | 기존 ModalFrame: radius8, border1, header `16px 18px 12px`, gap10, title16/24/700, subtitle12/16, 닫기32×32/아이콘12 |
| body/footer | body `4px 18px 16px`, gap12, font14/20/400; footer `12px 18px`,gap8,wrap,left,neutralBackground2. min-width0 유지 |
| 일반 버튼 | height/min-height38,padding0 12,radius8,font14/20/**400**, 기본글자#242424; 기존 Dadam focus/hover/disabled 유지하며 필요한 최종 색만 local 적용 |
| 파일 팝업 small | height/min-height32,padding0 12,radius8,**font14**/20/400. `#refmodal .btn.sm` 최종 규칙이 목록의12px보다 우선 |
| primary | Dadam accent/white, 투명 border. disabled는 background#f0f0f0,text#bdbdbd; primary bordertransparent, 일반 disabled border#e0e0e0 |
| 필드 label | flexcolumn,min-width0,gap4,padding-top2,font14/20 |
| 종류/우선순위 | grid,min-width0,gap12, 기본 `minmax(0,1fr) minmax(0,2fr)`; **max-width640px 1열**. HTML 경계 그대로 640에서도 1열 |
| 우선순위 | label marginbottom4; chips gap6,32px minimum,12px/16/500,padding0 10,radius8,border#d1d1d1,foreground#424242; selected accent-ink border/foreground,accent-soft bg,font700 |
| 지침 summary/body | summary14/20,accent-ink,cursorpointer; body margintop8,gap8; textarea rows3,resizenone; counter12px,secondary/오류#b91c1c; hints gap4 |
| 웹 기간 | 기존 SegmentedControl, pad3,gap2,mutedbg; 각 선택지 min-height32,autoheight,pad4px 8px,radius8,font12/16/500; 미선택#616161,선택soft/ink,inset1px ink |
| 글꼴 | `tokens.fontFamilyBase` → `var(--dadam-font-family)`; 포털의 body/입력/버튼/라벨/카운터 포함 |

- **Execution Flow / Logic**:
  1. `useFileDialogStyles`를 각 컴포넌트의 최상단에서 호출한다. 스타일 적용 때문에 새 FluentProvider/portal을 중첩하지 않는다. 기존 DadamThemeScope는 `applyStylesToPortals`로 폰트/테마를 전달한다.
  2. ModalFrame에 `{header:styles.header,body:styles.body,footer:styles.footer}`를 전달한다. 기존 클래스와 같은 속성의 Tailwind는 정리하고 `mergeClasses`로 결합한다. 새 공용 버튼 컴포넌트는 만들지 않는다.
  3. DadamButton에는 local button/smallButton class만 전달한다. primary에는 local primaryButton을 함께 병합하여 일반 글자색이 흰색을 덮지 않게 한다. `disabled`의 실제 prop과 handler는 보존한다. 단순히 회색 CSS만 적용해서 활성 버튼으로 남기지 않는다.
  4. SegmentedControl은 RadioGroup/Radio의 의미와 키보드 조작을 유지한다. local group class와 Fluent의 `radioClassNames` 슬롯 선택자로 필요한 selected border/weight만 보정한다. raw DOM 버튼으로 교체하거나 공용 파일을 수정하지 않는다. DadamTextarea는 local class + `textareaClassNames.textarea` 슬롯에서 resize:none을 적용한다.
  5. 종류 변경은 REFERENCE_KINDS 안의 value만 선택하고, priority 변경은 기존 onChange로 FileSettings 복사본을 전달한다. summary에 지침이 있으면 ` · 입력됨`을 표시한다.
  6. counter는 `instruction.length.toLocaleString("ko-KR") + " / 4,000자"`; 초과하면 ` · 지침을 줄여 주세요.` 및 aria-invalid=true. 지침을 몰래 자르지 않고 저장을 차단한다. 힌트는 기존 내용 뒤 newline + hint로 추가한다. aria-describedby/idPrefix/label 연결을 유지한다.
  7. 오류는 FileDialogFeedback rolealert로 남긴다. CONFLICT에만 최신 자료 다시 불러오기 버튼을 유지한다. 성공 텍스트나 toast를 추가하지 않는다.

### I02. 실제 파일 추가와 설정 팝업

- Related Files:
  - `components/workspace/files/FileUploadDialog.tsx` :: `pendingRow`, `FileUploadDialog` — 복수 선택/개별·일괄 UI; modify
  - `components/workspace/files/FileSettingsDialog.tsx` :: `FileSettingsDialog` — 원본 설정/복사 편집; modify
  - `components/workspace/files/file-ui-types.ts`, `lib/workspace/files/schemas.ts`, `validation.ts`, `hooks/workspace/use-file-picker.ts`, `use-file-draft-guard.ts` — 기존 입력·검증; read-only
  - `components/workspace/files/FilesWorkspace.tsx` :: `add/openAdd/openEdit/submit` — 기존 callback 연결 확인; read-only

#### Details

- **Signatures & Types** (기존 props/함수 유지):

```typescript
interface FileUploadDialogProps extends FileDialogBaseProps {
  category: Exclude<FileCategory,"web">; availableSlots:number; initialFiles:File[];
  onSubmit(files:FileUploadDraft[]):Promise<void>;
}
interface FileUploadDraft extends FileSettings { file:File }
interface FileUploadRow extends FileUploadDraft {
  key:string; expanded:boolean; validationError:string|null;
}
function pendingRow(file:File):FileUploadRow;
interface FileSettingsDialogProps extends FileDialogBaseProps {
  resource:FileResourceView; copyToCurrent:boolean;
  onSubmit(settings:FileSettings):Promise<void>;
}
```

- **Data & Schema Fields**:
  - row 기본값: file=선택한 File 객체, key=기존 crypto.randomUUID(), kind=guessReferenceKind(file.name), priority=normal, instruction="", expanded=false, validationError=null 또는 기존 검증 오류 메시지. 표시 메시지는 기존 한국어 문구를 유지한다.
  - 위 기존 `expanded` 필드는 현재 UI의 details와 연결되어 있지 않다. 이번 디자인 작업을 이유로 저장 모델/dirty 동작 정리까지 확대하지 않는다.
  - `availableSlots = max(0,30-currentCount)`는 부모에서 전달하며 계승 자료를 포함한다. rows.length나 화면 카드 수로 다시 계산하지 않는다.
  - 설정 initial은 resource.version의 kind/priority/instruction을 복사한 useState snapshot. 변경값과 initial의 JSON 비교로 dirty를 판단한다. 저장 실패나 부모 재조회로 initial을 덮어쓰지 않는다.

- **Execution Flow / Logic**:
  1. 파일 추가 width820, title=`파일 추가`, subtitle=`{분류명} · 추가 가능 {availableSlots}개 · 파일당 50MB · 이 브라우저에 저장`. footer 왼쪽 `선택한 파일 N개`, 오른쪽 취소/자료 추가. 빈 파일 선택 취소는 기존 부모 picker가 모달을 열지 않는다.
  2. drop 영역은 dashed control-border/radius8/padding12/gap8/wrap. 설명 `파일을 끌어다 놓거나 선택하세요` bold700, 확장자 설명12px/secondary/**margin-top12px**(2397행 최종값). 파일 선택 버튼과 hidden multiple input accept는 기존 extensions를 사용한다.
  3. rows>1일 때만 모든 파일에 적용 영역. label700, wrap/gap8, 종류 select 자동너비, 네 priority 버튼. 모두 같은 priority면 aria-pressed=true/softbg/brandborder/ink; 선택이 섞이면 모두false. 일괄 변경이 파일명/파일객체/key/개별 지침을 덮지 않도록 기존 map spread를 보존한다.
  4. row는 border1/radius8/padding12/gap8/minwidth0. header gap8/alignstart; 파일명 flex1/minwidth0/overflow-wrapanywhere/bold700, 용량11.2px/nowrap, 빼기 small. 파일명/버튼이 긴 경우 필요한 행만 wrap하여 가로 잘림을 막는다. row details의 margin-top4px을 적용한다.
  5. upload invalid=`overflow || !rows.length || any(validationError || !FileSettingsSchema.safeParse(settings).success)`. 파일당50MiB, 빈파일, 허용확장자, 파일명/수정시각 검사는 기존 validateUploadFile을 사용한다. 초과/오류 행은 표시하고 빼기로 제거 가능하다. 300쪽 분석/차단을 추가하지 않는다.
  6. 자료 추가는 rows를 `{file,kind,priority,instruction}`으로만 넘긴다. key/expanded/error를 저장하지 않는다. busy면 추가/제거/저장/설정을 차단하고 기존 `저장 중…`을 유지한다. 성공 후 닫기/조회 갱신은 부모 담당이며 로컬 성공 toast를 만들지 않는다. 실패 시 rows와 입력을 보존한다.
  7. 기존 onDirtyChange(next.length>0), input.value reset, 동일 파일 다시 선택, drop 중 busy 검사와 guard를 보존한다. 동일 파일명을 자동 병합/덮어쓰기하지 않는다.
  8. 설정 width760, 일반title=`자료 설정`, copyToCurrent일 때=`현재 회차로 복사하여 수정`, subtitle=실제자료명, footer=`저장할 때 현재 회차에만 반영됩니다.` + 취소/설정 저장. kind/priority/instruction은 같은 FileReferenceFields를 사용한다. source.type!==file이면 저장disabled. 원본 파일 교체 입력을 새로 만들지 않는다.
  9. settings 저장은 부모의 `{type:"edit",assetId,sourceVersionId,settings,web:null}` 경로다. 과거 버전을 직접 수정하지 않는다. 여기서 새 asset/version을 만들어 중복 저장하지 않는다.

### I03. 웹 링크 추가·설정

- Related Files:
  - `components/workspace/files/WebReferenceDialog.tsx` :: `WebReferenceDialog` — 링크/기간/지침 폼; modify
  - `components/workspace/files/file-ui-types.ts`, `lib/workspace/files/validation.ts` :: `normalizeWebUrl`, `config/workspace-files.ts` :: `WEB_PERIODS` — 기존 계약; read-only

#### Details

- **Signatures & Types**:

```typescript
interface WebReferenceDraft { url:string; period:"all"|"1y"|"3m"; instruction:string }
interface WebReferenceDialogProps extends FileDialogBaseProps {
  initial:WebReferenceDraft|null; copyToCurrent:boolean;
  onSubmit(value:WebReferenceDraft):Promise<void>;
}
function normalizeWebUrl(raw:string):string; // 오류 시 WorkspaceFileError("VALIDATION",...)
```

- **Data & Schema Fields**: initial=null이면 `{url:"",period:"1y",instruction:""}`; 편집이면 전달한 값을 baseline으로 유지한다. period 라벨은 전체 기간/최근 1년/최근 3개월. 실제 검색 결과/미리보기 캐시를 저장하지 않는다.
- **Execution Flow / Logic**:
  1. width640, title 신규=`웹 링크 추가`, 편집=`웹 자료 설정`; copyToCurrent subtitle=`과거 자료를 보존하고 현재 회차에 반영합니다.`.
  2. 순서: `링크 *` input + 오류, `기간` segmented, `활용 지침` rows4 textarea+counter. placeholder는 현재 HTML의 `https://… 또는 mois.go.kr`, `예) 최근 1년 정책 발표를 사업 배경에 활용` 그대로다.
  3. HTTP/HTTPS만 허용, 프로토콜 생략 시 https 보완, 사용자정보 포함 URL/잘못된 scheme/2048자 초과 등 기존 normalizeWebUrl 규칙을 유지한다. 빈 input은 저장disabled이지만 타이핑 전 오류를 강제로 표시하지 않는다.
  4. footer 취소/링크 추가 또는 설정 저장. 저장은 normalizeWebUrl 결과와 period/instruction을 onSubmit으로 전달한다. 입력 지침 4,000자 초과 또는 busy면 disabled. 본문 길이는 잘라내지 않는다.
  5. dirty는 baseline과 현재값 비교이며 닫기/이동은 onClose guard를 사용한다. backend/웹 수집은 추가하지 않는다. 오류/충돌 시 입력 유지·재조회 버튼은 그대로다.

## Acceptance Criteria

- [x] 추가820/설정760/웹640px 폭과 기존 viewport 안전 여백, Dadam 폰트·header/footer를 유지한다.
- [x] 최종 override인 팝업 small14px, 파일 형식 안내 위12px, row details 위4px, 640px 이하 1열이 적용된다.
- [x] 기본/일괄 우선순위의 선택·비선택·disabled가 명확하고 실제 Radio 키보드 조작을 보존한다.
- [x] 파일 선택/취소/드롭/행 제거/여러 파일 추가 및 per-row 설정이 기존 File 객체와 저장 명령을 사용한다.
- [x] 30개 제한은 계승을 포함한 부모 currentCount 기준이며 50MiB/4,000자/URL 검증과 입력 보존이 유지된다.
- [x] 저장 성공 후 일반 완료 문구/토스트가 없고 실패 시 입력과 오류 안내가 남는다.
- [x] DadamControls/ModalFrame/SegmentedControl·전역 테마/Provider를 수정하지 않는다.

## Validation

프로젝트 루트에서 다음을 실행한다. 브라우저/스크린샷/E2E/dev server/임시 검증 파일은 사용하지 않는다.

- `npm.cmd run typecheck` — exit0.
- `npx.cmd eslint components/workspace/files/file-dialog.styles.ts components/workspace/files/FileReferenceFields.tsx components/workspace/files/FileUploadDialog.tsx components/workspace/files/FileSettingsDialog.tsx components/workspace/files/WebReferenceDialog.tsx components/workspace/files/FileDialogFeedback.tsx --max-warnings=0` — exit0.
- `rg -n '640|fontFamily|fontWeight|fontSize|marginTop|resize|radioClassNames|textareaClassNames|32px|38px|14px' components/workspace/files/file-dialog.styles.ts` — 최종 style table와 실제 적용 callsite를 대조.
- `rg -n 'slotClassNames|width=|onSubmit|onDirtyChange|availableSlots|safeParse|normalizeWebUrl|disabled|onClose|validationError|aria-' components/workspace/files/FileUploadDialog.tsx components/workspace/files/FileSettingsDialog.tsx components/workspace/files/WebReferenceDialog.tsx components/workspace/files/FileReferenceFields.tsx` — 위 흐름 전부 연결되는지 diff로 확인.
- 정적 경우표: 업로드 0/1/2행,30개한도,행 오류/제거,지침3999/4000/4001,일괄priority 혼합/일치,웹 빈값/정상/잘못된scheme,dirty 닫기,busy,CONFLICT. 기존 validator를 새로 구현하지 않았는지 확인한다.
- `git diff --check` — exit0.
- 보호 파일 hash 및 `git diff --name-only`로 공용 파일/타입/저장 코드 비변경을 확인한다. DadamControls SHA256=`56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84`.
- 검증 결과는 `.memory/reports/2026-11-07-files-html-parity-validation.md`에 필요 시 누적한다. 실제 시각/마우스 동작 검증을 실행했다고 보고하지 않는다.

## Commit Message

```text
style(files): 자료 추가와 설정 팝업을 HTML에 맞춤

Plan: 2026-11-07-files-html-parity
Phase: P01-files
Task: T03-reference-dialogs

- 파일 추가와 개별·일괄 참조 설정의 최종 스타일 적용
- 웹 링크 폼과 입력 피드백을 동일한 파일 팝업 규칙으로 정리
- 실제 업로드 검증과 초안·권한·충돌 보호 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일의 Task 식별자를 가진 완료 커밋 (해시는 current에 기록)

통과 후 Task/phase를 갱신하고 해당 범위만 한글 커밋한다. current는 ignore/강제 stage 금지를 유지하며 `T04-preview-confirmation.md`로 전진한다. 원본 HTML/기존 자료/목업 배열을 변경하거나 패키지/인프라 작업을 추가하지 않는다.
