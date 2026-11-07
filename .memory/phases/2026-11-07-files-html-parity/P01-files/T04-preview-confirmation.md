# Task: T04 실제 자료 미리보기·확인 팝업과 통합 검증

## Status: pending

## Goal

파일/웹 자료 미리보기, 삭제 확인, 미저장 확인을 HTML 디자인에 맞추고 파일 자료함의 전체 연결을 검증한다. 실제 원본 조회·다운로드, 과거 회차 보존, 15초 삭제 복원과 다른 화면의 공용 확인창 동작을 보존한다.

## Decision Summary

- 선행 T01~T03 완료: 표시 수량과 전체 참조 수 분리, 목록 및 입력 팝업 전용 스타일이 존재한다. 마지막 작업은 읽기/확인 팝업과 통합 검토다.
- HTML의 `fileBody`는 시연 텍스트이고 다운로드는 toast뿐이므로 복제하지 않는다. PDF/TXT/메타정보의 실제 분기를 유지한다. 공용 버튼 리팩토링·Provider 오류 수정은 제외한다.

## Implementation

### I01. 파일·웹 자료 미리보기 디자인

- Related Files:
  - `components/workspace/files/FilePreviewDialog.tsx` :: `FilePreviewDialog`, `FileOriginalPreview`, `FileMetadata` — 실제 미리보기 프레임/메타; modify
  - `components/workspace/files/file-dialog.styles.ts` :: `useFileDialogStyles` — T03 스타일에 미리보기 key 추가; modify
  - `hooks/workspace/use-file-preview.ts` :: `useFilePreview`; `lib/workspace/files/preview.ts` :: `prepareFilePreview`, `downloadOriginalFile` — 실제 원본·URL 수명; read-only
  - `components/workspace/files/FilesWorkspace.tsx` :: `previewResource` — full query에서 원본 참조 검증; read-only (확인 팝업은 I02에서 변경)
  - `components/ui/ModalFrame.tsx`, `components/ui/DadamControls.tsx`, `config/workspace-files.ts` — 공용 기능; read-only
  - `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html` :: 최종 `openFileView`, `.fv-m`, `.fv-b`, `.fv-doc`, `.fv-p`, `.fv-h`, `.fv-l`; read-only

#### Details

- **Signatures & Types** (기존 함수/props 유지):

```typescript
interface FilePreviewDialogProps {
  projectId:string; resource:FileResourceView; round:number;
  open:boolean; onClose():void;
}
function FileMetadata(props:Pick<FilePreviewDialogProps,"resource"|"round">):React.ReactElement;
function FileOriginalPreview(props:FilePreviewDialogProps):React.ReactElement;
interface FilePreviewState {
  status:"idle"|"loading"|"ready"|"error";
  content:FilePreviewContent|null; file:File|null; error:WorkspaceFileError|null;
}
interface FilePreviewController extends FilePreviewState { retry():void; download():void }
type FilePreviewContent =
  | {type:"pdf";url:string}
  | {type:"text";text:string;truncated:boolean;encoding:"utf-8"|"utf-16le"|"utf-16be"}
  | {type:"metadata";reason:string};
// T03 useFileDialogStyles에 추가할 keys:
// previewBody, previewMetadata, previewDocument, previewLink,
// previewHeading, previewInstruction, previewText, previewHint
```

- **Data & Schema Fields**:
  - `resource.version`: `id:string`, `label:string`, `kind:ReferenceKind`, `priority:ReferencePriority`, `instruction:string`, `createdAt:string`, `source:FileOriginal|WebOriginal`; `resource.asset.ownerName:string`; `round:number`는 **열어 본 카드의 회차**이다.
  - `FileOriginal`: `type:"file"`, `blobId/filename/mediaType:string`, `extension:AllowedFileExtension`, `byteLength/lastModified:number`.
  - `WebOriginal`: `type:"web"`, `url:string` (검증된 http/https), `period:"all"|"1y"|"3m"`.
  - preview request=`{projectId,round,versionId:resource.version.id}`. 현재 round나 최신 편집 version으로 바꾸지 않는다. 저장 필드는 추가하지 않는다.

- **Visual Contract**:

| 요소 | 최종 HTML 적용 및 실제 기능 유지 |
| :--- | :--- |
| width/header/footer | width960, 기존 ModalFrame 안전 max-width/max-height; 파일명 title / 웹은 `웹 자료` title+URL subtitle; T03 header/footer·일반 버튼 스타일 |
| 미리보기 body | `.fv-b` background#f6f7f9, overflowauto, gap12, min-width0; 기본 ModalFrame padding 유지 |
| metadata | flexwrap,gap8,font12/16,secondary. 순서=회차/종류/우선순위/등록자/날짜/파일크기 |
| 실제 텍스트 문서 | white,border1px line,radius10,padding26px 34px,shadow `0 1px 2px rgba(0,0,0,.04)`; min-width0,pre-wrap,overflow-wrapanywhere,Dadam font13/1.7. 640px 이하 padding12로 완화하여 읽기 영역 확보 |
| PDF | 실제 object data URL 유지, width100%,height55vh,min-height256; 지원 안 됨/다운로드 안내 유지 |
| 웹 링크/기간 | 링크 accent-ink/anywhere,external targetblank+noopener noreferrer; `참고 기간 · {기간명}` |
| 지침 heading | `활용 지침`,margin0,font14,bold; 별도 입력창이 아님 |
| 지침 내용 | margin0,pre-wrap,overflow-wrapbreak-word,padding10px 12px,radius10,font12; **원본 `.fv-p`에 실제 남아 있는** background#f4f0ff/foreground#5b3fc4 사용. 전역 강조색으로 확장하지 않음 |

HTML의 가짜 페이지번호/고정 문서 본문은 사용하지 않는다. 원본 실제 PDF 내용의 글꼴/레이아웃 자체는 제어하지 않는다. 모달 외형과 앱이 표시하는 메타/지침/텍스트에 Dadam 폰트를 적용한다. 파일 메뉴 외 제작 슬라이드의 색을 바꾸지 않는다.

- **Execution Flow / Logic**:
  1. source.type=file이면 FileOriginalPreview, web이면 웹정보 모달이라는 기존 분리를 유지한다. 분기 때문에 hook 순서가 바뀌지 않게 기존 자식 컴포넌트 구조를 유지한다.
  2. metadata는 실제 props의 라벨/우선순위/등록자/날짜를 사용한다. 날짜는 Asia/Seoul을 명시한 `toLocaleDateString("ko-KR",...)`, 파일크기는 `(byteLength/1024).toLocaleString("ko-KR",{maximumFractionDigits:1}) + " KB"`로 카드와 맞춘다. HTML의 하드코딩 이름/시각/크기를 복사하지 않는다.
  3. 파일 footer의 원본 다운로드는 `disabled={!preview.file}`, onClick=preview.download, 닫기=props.onClose. file 없는 상태에서 성공 알림을 표시하거나 가짜 파일을 만들지 않는다.
  4. loading/오류/retry, PDF header 검사 실패, text truncated/인코딩 안내, Office/HWP 등 metadata.reason을 보존한다. 텍스트는 React 텍스트 노드로 출력하고 innerHTML로 해석하지 않는다. PDF object fallback 안내를 제거하지 않는다.
  5. 파일 지침은 실제 instruction이 있을 때만, 웹은 지침이 없으면 `등록한 지침이 없습니다.`를 표시한다. 웹의 실제 URL/기간만 사용하고 웹 수집/검색 결과를 생성하지 않는다.
  6. useFilePreview의 request generation, effect cleanup, URL.revokeObjectURL 및 download dispose를 그대로 유지한다. UI 스타일을 이유로 매 render마다 새 파일/URL을 준비하지 않는다. 닫기·프로젝트/round/version 전환에서 오래된 내용을 다시 보여 주지 않는다.
  7. `FilesWorkspace.previewResource`는 full query resources에서 versionId를 찾아 검증하는 기존 로직을 유지한다. T01의 표시 필터로 canonical 자료 존재 여부를 판정하지 않는다. 조회 오류/권한 상실 시 기존 안전한 상태를 유지한다.

### I02. 삭제·미저장 확인과 공용 호출부 격리

- Related Files:
  - `components/workspace/files/FilesWorkspace.tsx` :: `ActionConfirmation`, confirmation ModalFrame, guard.confirmOpen — 파일 범위 스타일 전달; modify
  - `components/workspace/files/FileDiscardDialog.tsx` :: `FileDiscardDialog`, 신규 exported `FileDiscardDialogProps` — 선택적 스타일 전달만 확장; modify
  - `components/workspace/files/file-dialog.styles.ts` :: `useFileDialogStyles` — 기존 body/footer/button 재사용; modify
  - `components/workspace/shared/WorkspaceUi.tsx`, `components/comments/ProjectCanvasCommentsProvider.tsx` — 기존 FileDiscardDialog 소비자; read-only
  - `hooks/workspace/use-file-draft-guard.ts`, `components/workspace/files/FileUndoNotice.tsx`, `lib/workspace/files/domain.ts` — 미저장/삭제/복원 기능; read-only

#### Details

- **Signatures & Types**:

```typescript
import type { ModalFrameProps } from "@/components/ui/ModalFrame";
export interface FileDiscardDialogProps {
  open:boolean; onKeep():void; onDiscard():void; onSave?():void;
  busy?:boolean; error?:string|null;
  slotClassNames?:ModalFrameProps["slotClassNames"];
  buttonClassName?:string; // 계속 편집/버리고 계속에만 전달; 기본 undefined
}
export default function FileDiscardDialog(props:FileDiscardDialogProps):React.ReactElement;
interface ActionConfirmation {
  operation:Extract<FileOperation,{type:"remove"|"start-round"}>;
  revision:number; round:number; workspaceRevision?:number; label:string;
}
```

- **Data & Schema Fields**:
  - 기존 `confirmation:ActionConfirmation|null`, defaultnull. remove에는 `{type:"remove",assetId:string,sourceVersionId:string}`와 시작 시 revision/round를 저장한다. snapshot에서는 쓰기 명령을 금지한다.
  - discard props의 신규값은 undefined 기본으로 하고 기존 busy=false/error/onSave 동작을 그대로 유지한다. 다른 화면의 props 생략 시 DOM 구조와 색/크기/동작을 바꾸지 않는다.
  - `FileRemoval.expiresAt`는 domain의 15초 기한이고 UI가 새로운 기한을 만들지 않는다.

- **Execution Flow / Logic**:
  1. 삭제 확인 width560(명시하거나 기존 default유지), 제목=`자료를 삭제할까요?`, subtitle=실제 자료명. 본문=`현재 회차에서만 제외됩니다. 이전 회차의 보관본은 유지되며, 삭제 후 15초 동안 되돌릴 수 있습니다.`. footer 취소/확인, T03의 header/body/footer/button/primaryButton만 전달한다.
  2. 취소/닫기는 busy 동안 기존 보호를 유지한다. 확인은 저장 시점의 revision/round와 operation을 기존 execute로 넘긴다. 실패 시 confirmation과 오류를 유지하고 성공 안내를 추가하지 않는다.
  3. start-round 확인 분기는 기존 코드에 존재하지만 새 진입 버튼이나 lifecycle 기능을 추가하지 않는다. 기존 필드와 텍스트를 유지한다.
  4. FileDiscardDialog는 `slotClassNames`를 ModalFrame으로, `buttonClassName`을 계속 편집/버리고 계속 두 버튼으로만 전달한다. 새 props가 없으면 기존과 동일하다. 공용 onSave 버튼·busy/error/ESC/onClose 조건을 바꾸지 않는다.
  5. FilesWorkspace의 호출에서만 T03 스타일을 전달한다. 파일 화면은 기존처럼 onSave 없이 계속 편집/버리고 계속만 제공한다. 제목=`저장하지 않은 변경 사항이 있습니다`, 본문=`이동하기 전에 입력 내용을 확인해 주세요. 저장에 실패하면 입력한 내용을 유지합니다.`. width는 기본560.
  6. 미저장 확인을 새 DOM portal/이벤트로 재구현하지 않는다. guard.keepEditing은 초안 유지, discardAndContinue는 기존 취소/후속 이동을 실행한다. 다른 화면의 저장하고 계속 기능과 코멘트 초안을 건드리지 않는다.
  7. ModalFrame의 focus trap/ESC 처리/닫힌 후 포커스 복귀/body 스크롤을 보존한다. 팝업별 버튼에 실제 disabled를 전달하며 z-index/전역 Dialog 설정은 변경하지 않는다.

### I03. 회귀 방지 통합 검토

- Related Files:
  - `components/workspace/files/FilesWorkspace.tsx`, `FileRoundSection.tsx`, `FileCategoryPanel.tsx`, `FileResourceCard.tsx`, `FileUploadDialog.tsx`, `FileSettingsDialog.tsx`, `WebReferenceDialog.tsx`, `FilePreviewDialog.tsx`, `FileDiscardDialog.tsx` — 화면 연결; read-only 검토 (상기 대상 범위의 연결 누락만 수정)
  - `.memory/reports/2026-11-07-files-html-parity-validation.md` — 실제 실행 결과/미실시 항목 누적; new 또는 modify

#### Details

- 순서대로 정적 대조한다: full query → T01 표시 helper → 카드 클릭 → 원본 version 미리보기 / 최신 유효 version 편집 → draft → 기존 command → query 갱신 → 새 카드/수량. 카드 클릭과 편집의 version 선택을 합치지 않는다.
- 수량 행렬: 현재신규0/3,계승10,priority제외,현재수30,과거만있는asset,동일회차재편집,현재삭제/복원,명시snapshot. summary=실제표시수,상단=currentCount,limit=30을 각각 확인한다.
- 권한 행렬: 참여자자기자료/남의자료/PM/super_admin/비참여자/완료project/snapshot. 기존 canManage/canAdd/canReorder와 저장 검사가 그대로 연결되어야 한다. CSS로 숨긴 것만으로 권한을 대체하지 않는다.
- 기존 제작·코멘트 FileDiscardDialog 호출에서 신규 props가 생략된 상태를 확인한다. 파일 화면의 CSS 선택자가 전역 `.fui-*`나 `button`을 무조건 변경하지 않는지 확인한다.
- 최종 HTML의 목록/입력/미리보기/확인 팝업을 소스 규칙 단위로 대응한다. 브라우저 비교를 한 것으로 기록하지 않는다. 인접 hydration 문제나 별도 서버 기능을 이 Task에 추가하지 않는다.

## Acceptance Criteria

- [ ] 파일/웹 미리보기 프레임과 메타·지침은 HTML 스타일이고 실제 원본/등록값이 표시된다.
- [ ] PDF/TXT/metadata·오류·retry·다운로드·URL cleanup을 유지한다. HTML 시연 본문으로 교체하지 않는다.
- [ ] 삭제 확인/15초 되돌리기/과거 보존과 실패 시 입력·오류 안내가 유지된다.
- [ ] 파일 메뉴의 미저장 확인만 스타일을 전달받고 제작·코멘트 기본 호출은 변하지 않는다.
- [ ] 기존 readonly/권한/30개 제한/표시 수량/일반 성공 문구 제거가 전체 연결에서 유지된다.
- [ ] 공용 DadamControls·ModalFrame·SegmentedControl·Provider·저장 코드를 변경하지 않는다.

## Validation

프로젝트 루트에서 실행한다. tests/·임시 파일·브라우저/CUA/E2E/dev server/스크린샷은 금지한다.

- `npm.cmd run typecheck` — exit0.
- `npx.cmd eslint components/workspace/files --max-warnings=0` — 전체 파일 UI 변경의 정합성, exit0.
- 다음 stdin은 실제 미리보기 분기와 PDF URL dispose의 안전성을 검증한다. 로컬 파일/저장소/브라우저를 열지 않는다.

```powershell
@'
const assert=require('node:assert/strict');
const {File}=require('node:buffer');
globalThis.File=File;
const {prepareFilePreview}=require('./lib/workspace/files/preview.ts');
(async()=>{
  const create=URL.createObjectURL, revoke=URL.revokeObjectURL;
  let made=0,removed=0;
  URL.createObjectURL=()=>{made++;return 'blob:preview-check';};
  URL.revokeObjectURL=()=>{removed++;};
  try {
    const pdf=await prepareFilePreview(new File(['%PDF-1.7'], 'real.pdf',{lastModified:1}));
    assert.equal(pdf.content.type,'pdf');pdf.dispose();pdf.dispose();
    assert.equal(made,1);assert.equal(removed,1);
    const invalid=await prepareFilePreview(new File(['not pdf'],'bad.pdf',{lastModified:1}));
    assert.equal(invalid.content.type,'metadata');
    const text=await prepareFilePreview(new File(['actual text'],'real.txt',{lastModified:1}));
    assert.equal(text.content.type,'text');assert.equal(text.content.text,'actual text');assert.equal(text.content.truncated,false);
    const long=await prepareFilePreview(new File(['a'.repeat(262145)],'long.txt',{lastModified:1}));
    assert.equal(long.content.type,'text');assert.equal(long.content.truncated,true);
    const office=await prepareFilePreview(new File(['bytes'],'real.docx',{lastModified:1}));
    assert.equal(office.content.type,'metadata');
    console.log('actual preview branches: passed');
  } finally {URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
})().catch(error=>{console.error(error);process.exitCode=1;});
'@ | node --import tsx
```

- `rg -n 'FileDiscardDialog|slotClassNames|buttonClassName|onSave' components/workspace/files components/workspace/shared/WorkspaceUi.tsx components/comments/ProjectCanvasCommentsProvider.tsx` — 파일 화면 외 호출부가 변경되지 않았는지 diff로 확인한다.
- `rg -n 'prepareFilePreview|downloadOriginalFile|revokeObjectURL|previewResource|currentCount|onSubmit|sourceVersionId|setNotice' components/workspace/files hooks/workspace/use-file-preview.ts lib/workspace/files/preview.ts` — I03의 연결과 cleanup 보존을 정적으로 확인한다.
- `git diff --check` — exit0.
- DadamControls 해시가 `56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84`와 다르면 실패다. `git diff --name-only`로 read-only 대상/다른 화면/원본 HTML 변경이 없는지 확인한다.
- 위 검증 결과와 목록/팝업 최종 스타일 대응표, 브라우저 시각 검증 미실시, 미해결 전역 hydration 범위 제외를 한국어로 검증 기록에 적는다. 타입/lint 성공을 실제 화면 동일성으로 표현하지 않는다.

## Commit Message

```text
style(files): 자료 미리보기와 확인 팝업을 HTML에 맞춤

Plan: 2026-11-07-files-html-parity
Phase: P01-files
Task: T04-preview-confirmation

- 실제 원본 미리보기를 유지하며 메타와 지침 디자인 적용
- 파일 메뉴의 삭제·미저장 확인 스타일을 공용 호출부와 분리
- 회차 표시와 수량·권한·저장 연결을 통합 검증
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

통과 후 Task/phase/Plan을 done(4/4)으로 갱신하고 이 범위만 한글 커밋한다. current는 Active Task 없음/이 계획 완료로 갱신하되 강제 stage하지 않는다. 이전 별도 hydration 오류가 해결됐다고 기록하지 않는다. 기존 데이터/원본 HTML/다른 변경을 보존하고 패키지·인프라·push 작업은 수행하지 않는다.
