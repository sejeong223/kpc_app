# Task: T01 회차별 자료 표시와 성공 안내 정리

## Status: done

## Goal

파일 업로드 일반 목록에서 각 회차에 등록·수정된 자료만 표시하면서 상단 전체 참조 수, 편집 원본 선택, 완성본 자료를 보존한다. 파일 추가·설정·정렬 이후 불필요한 성공 문구를 제거한다.

## Decision Summary

- 확정 요구: 각 회차 카드만 분리 표시하고 상단 30개 제한은 계승 자료를 포함한다. 오류와 삭제 되돌리기는 유지한다.
- 파일 화면의 표시만 변경한다. 기존 저장/domain/selector·DadamControls·공용 버튼·Provider와 다른 화면은 변경하지 않는다. 선행 Task 없음.

## Implementation

### I01. 저장 자료와 분리된 회차 표시 함수

- Related Files:
  - `components/workspace/files/file-round-display.ts` :: `getDisplayedFileResources` — 파일 목록 전용 순수 표시 함수; new
  - `components/workspace/files/FileRoundSection.tsx` :: `FileRoundSection`, `FileRoundSectionProps` — 표시 카드와 개수 연결; modify
  - `components/workspace/files/FilesWorkspace.tsx` :: `FileProjectWorkspace` — 현재 회차/보관본 표시 정보 전달; modify
  - `types/workspace-files.ts` :: `FileRoundView`, `FileResourceView`, `FileWorkspaceView` — 기존 계약; read-only
  - `lib/workspace/files/selectors.ts` :: `selectFileWorkspace`; `lib/workspace/production/file-history.ts` :: `selectFileSnapshot` — 전체 참조를 반환하는 원본; read-only

#### Details

- **Signatures & Types** (기존 타입 import, 저장 타입은 변경하지 않음):

```typescript
export function getDisplayedFileResources(
  round: FileRoundView,
  snapshotId: string | null,
): FileResourceView[];

export interface FileRoundSectionProps extends Pick<FileCategoryPanelProps,
  "onAdd" | "onOpen" | "onEdit" | "onRemove" | "onDropFiles" | "disabled"> {
  initialOpen?: boolean;
  value: FileRoundView;
  isCurrent: boolean;       // value.number === view.currentRound; snapshot에서도 회차 번호 정보
  snapshotId: string | null;
  canAdd: boolean;
  canReorder: boolean;
  onReorder?(order: FileCategory[]): void;
}
```

- **Data & Schema Fields**:
  - `FileResourceView`: `asset: FileAsset`, `version: FileVersion`, `canManage: boolean`, `currentVersionId: string|null`, `isInherited: boolean`. 배열 원소를 변경하지 않는다.
  - `FileAsset`: `id`, `ownerId`, `ownerName`, `createdAt`는 string, `sourceKind: "file"|"web"`.
  - `FileVersion`: `id`, `assetId`, `createdAt`, `createdBy`, `label`, `instruction`는 string, `category: "proposal"|"related"|"web"`, `createdInRound: number`, `kind: ReferenceKind`, `priority: "required"|"preferred"|"normal"|"excluded"`, `source: FileOriginal|WebOriginal`. 외래키는 `version.assetId === asset.id`이며 기존 selector가 유효성을 확인한다.
  - `FileRoundView`: `number: number`, `createdAt/createdBy: string`, `sealedAt: string|null`, `categoryOrder: FileCategory[]`, `readOnly: boolean`, `resources: FileResourceView[]`. null round는 전달하지 않는다.
  - `FileWorkspaceView.currentCount: number`는 실제 현재 회차 `entries.length`; `rounds: FileRoundView[]`는 기존 순서대로 보존한다. `currentRound`, `revision`, `workspaceRevision`는 number, `phase: "writing"|"completed"`, `canAdd/canReorder: boolean`은 그대로 사용한다.
  - `snapshotId: string|null`: null=일반 자료함; string=명시적으로 선택한 완성본. 새 저장 필드/마이그레이션/기본 목업은 없다.

- **Execution Flow / Logic**:
  1. Precondition & Validation: 기존 조회의 loading/error/no-project/snapshot 분기를 보존한다. 유효한 round만 helper에 전달한다.
  2. Core Processing: null snapshot이면 `round.resources`에서 `resource.version.createdInRound === round.number`인 항목만 새 배열로 반환한다. snapshot이면 모든 resources의 새 배열을 반환한다. `isInherited`, `canManage`, priority로 추가 필터링하지 않는다.
  3. `FileRoundSection`에서 `displayedResources`를 한 번 구하고 summary 개수 및 category별 목록 양쪽에 사용한다. categoryOrder와 resource 순서를 유지한다. 빈 회차도 삭제하지 않고 3개 분류/빈 상태를 보여 준다.
  4. `FilesWorkspace`는 full `data.rounds`를 그대로 보유하며 `FileRoundSection`에 `snapshotId`, `isCurrent`, `initialOpen={snapshotId !== null || round.number === data.currentRound}`를 전달한다. 최신 회차부터 보여 주는 기존 reverse 사본과 key를 유지한다. readonly가 현재 여부를 뜻하지 않으므로 완료된 현재 회차도 기본 펼침이다. 명시적 snapshot summary는 `보관 · 읽기 전용`, 일반 현재 회차는 `현재 회차`, 일반 과거는 `보관 · 읽기 전용`이다. 기존 summary 보조 문구/개수 외 배지를 추가하지 않는다.
  5. snapshot 예외 이유: `selectFileSnapshot`은 완성본 `fileEntries`로 만든 **한 회차만** 반환한다. 여기까지 등록 회차로 필터링하면 이전 회차에서 이어받은 근거를 확인할 경로가 사라진다. 모든 snapshot 자료를 그대로 보여 주되 `canManage/canAdd/canReorder=false`를 유지한다.
  6. `openEdit`는 full `view.rounds`를 역순으로 찾아 asset의 최신 유효 버전을 사용한다. `copyToCurrent = latest.version.createdInRound < view.currentRound || latest.currentVersionId === null`을 보존한다. helper 결과로 이 탐색을 대체하지 않는다. 과거 원본/메타/미리보기는 그 카드의 version, 편집은 최신 유효 version이라는 기존 구분을 유지한다.
  7. Error & Exception Handling: helper는 저장/비동기 작업을 하지 않는다. 기존 FORBIDDEN/CONFLICT/STORAGE, revision/round 검증, 재조회, dirty 보호는 변경하지 않는다.
  8. State Transition & Return: 화면 표시만 변경한다. canonical resources/entries/currentCount에는 쓰지 않는다. `currentCount=13`이고 현재 round에 새 자료가 3개면 summary/category 합은 3, 상단은 13/30, availableSlots=17이다.

### I02. 일반 성공 안내 제거 및 작업별 피드백 보존

- Related Files:
  - `components/workspace/files/FilesWorkspace.tsx` :: `FileProjectWorkspace.execute`, `notice`, `removal`, `openEdit`, `previewResource` — mutation 결과/피드백; modify
  - `components/workspace/files/FileUndoNotice.tsx` :: `FileUndoNotice` — 15초 복원 UI; read-only (스타일은 T02)
  - `hooks/workspace/use-workspace-files.ts` :: `useFileCommand`; `lib/workspace/files/domain.ts` — 저장/권한; read-only

#### Details

- **Signatures & Types** (기존 유지):

```typescript
async function execute(operation: FileOperation,
  base?: { revision: number; round: number; workspaceRevision?: number }): Promise<void>;
function openEdit(resource: FileResourceView, view?: FileWorkspaceView): void;
// notice: string, initial ""; removal: FileRemoval | null, initial null.
```

- **Data & Schema Fields**: `FileOperation.type`은 `add-files|add-web|edit|remove|undo-remove|start-round|reorder`. `FileRemoval`은 `id:string`, `round:number`, `entry:{assetId:string;versionId:string}`, `index:number`, `removedBy:string`, `expiresAt:string`. 새 notice 타입이나 전역 toast를 만들지 않는다.
- **Execution Flow / Logic**:
  1. 명령 시작의 `setNotice("")`, 실행 중 중복 차단, mounted 검사, 오류/confirmation/dirty 처리 순서를 유지한다.
  2. 성공 후 `start-round`는 기존 `${result.state.currentRound}차 자료함을 시작했습니다.`, `undo-remove`는 기존 `삭제한 자료를 복원했습니다.`, 그 외는 빈 문자열로 설정한다. 일반 `변경 사항을 저장했습니다.`를 다른 문구/토스트로 대체하지 않는다. UI에 새 start-round 버튼도 추가하지 않는다.
  3. remove 성공은 receipt의 removalId로 기존 FileUndoNotice만 표시한다. 15초 만료/새 회차/복원 후 정리 로직을 유지한다. delete 알림이 두 줄로 중복되지 않는다.
  4. 실패 시 draft를 닫거나 notice를 성공으로 쓰지 않는다. 기존 오류 안내와 conflict의 최신 자료 다시 불러오기·미저장 확인을 유지한다. `notice && ...` 조건으로 빈 줄이 렌더링되지 않게 한다.

## Acceptance Criteria

- [ ] 계승 10개 + 현재 신규 3개: 현재 목록 3개, 상단 13/30, 과거 목록 10개. 제외 priority도 수량에 포함된다.
- [ ] 과거 자료를 현재 회차에서 편집하면 새 버전은 현재 목록에 표시되고 과거 카드 버전은 보존된다. 같은 회차 재편집은 중복 카드가 되지 않는다.
- [ ] 완성본에서는 계승 자료까지 모두 표시되고 편집/삭제/추가/정렬이 불가능하다.
- [ ] 과거만 있는 자료 재편집, 현재 삭제/되돌리기, 조회 오류가 기존 저장 경로를 사용한다.
- [ ] 상단 카운트/availableSlots와 domain의 30개 제한, 다른 화면의 출처 자료는 변하지 않는다.
- [ ] 일반 저장 완료 텍스트/빈 안내 줄은 없고 오류/되돌리기/복원 안내는 남는다.

## Validation

작업 루트: `C:/Users/김세정/Documents/GitHub/kpc_app`. 테스트/임시 파일, 브라우저, dev server는 만들거나 실행하지 않는다.

- `npm.cmd run typecheck` — exit 0.
- `npx.cmd eslint components/workspace/files/file-round-display.ts components/workspace/files/FileRoundSection.tsx components/workspace/files/FilesWorkspace.tsx --max-warnings=0` — exit 0.
- 다음 PowerShell stdin 검증 — 등록 회차/보관본 예외·비변경을 검사한다. 저장소에 접근하지 않는다.

```powershell
@'
const assert = require('node:assert/strict');
const { getDisplayedFileResources } = require('./components/workspace/files/file-round-display.ts');
const resource = (id, createdInRound, category = 'proposal') => ({
  asset: {id, ownerId:'u', ownerName:'User', createdAt:'2026-11-07T00:00:00.000Z', sourceKind:'web'},
  version: {id:id+'v', assetId:id, category, createdInRound, createdAt:'2026-11-07T00:00:00.000Z', createdBy:'u', label:id, kind:'web', priority:'normal', instruction:'', source:{type:'web',url:'https://example.com',period:'all'}},
  canManage:true, currentVersionId:id+'v', isInherited:createdInRound<2
});
const inherited = Array.from({length:10}, (_,i)=>resource('old'+i,1));
const own = [resource('new1',2),resource('new2',2,'related'),resource('new3',2,'web')];
own[2].version.priority='excluded';
const round={number:2, createdAt:'2026-11-07T00:00:00.000Z', createdBy:'u', sealedAt:null, categoryOrder:['proposal','related','web'], readOnly:false, resources:[...inherited,...own]};
const before=JSON.stringify(round);
assert.deepEqual(getDisplayedFileResources(round,null).map(r=>r.asset.id),['new1','new2','new3']);
assert.equal(round.resources.length,13);
assert.equal(30-round.resources.length,17);
assert.equal(getDisplayedFileResources(round,'snapshot-2').length,13);
assert.equal(getDisplayedFileResources({...round,readOnly:true},null).length,3);
assert.equal(getDisplayedFileResources({...round,number:1,resources:inherited},null).length,10);
assert.equal(getDisplayedFileResources({...round,resources:inherited},null).length,0);
assert.equal(getDisplayedFileResources({...round,resources:[]},null).length,0);
assert.equal(JSON.stringify(round),before);
console.log('round display invariants: passed');
'@ | node --import tsx
```

- `rg -n 'getDisplayedFileResources|currentCount|availableSlots|latest|copyToCurrent|setNotice|setRemoval|previewResource' components/workspace/files` — canonical/표시 구분과 I02 피드백 분기를 정적으로 대조한다.
- `git diff --check` — exit 0. `git diff --name-only`로 서비스·타입·다른 화면이 수정되지 않았는지 확인한다.
- 검증 기록은 필요 시 `.memory/reports/2026-11-07-files-html-parity-validation.md`에 Task별 결과만 누적한다. 시각 검증 미실시를 명시한다.

## Commit Message

```text
fix(files): 회차별 자료 표시와 저장 안내를 정리

Plan: 2026-11-07-files-html-parity
Phase: P01-files
Task: T01-round-display-feedback

- 등록 회차별 카드 표시와 전체 참조 집계를 분리
- 완성본 참조 자료와 기존 편집·보관 경로를 보존
- 일반 성공 문구를 제거하고 오류와 삭제 되돌리기를 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일의 Task 식별자를 가진 완료 커밋 (해시는 current에 기록)

검증 통과 후 이 Task/phase 진행률을 갱신하고 한글 커밋한다. 이번 결정·계획 문서는 명시적으로 stage하며 다른 변경을 포함하지 않는다. `.memory/current.md`는 ignore/강제 stage 금지를 유지하고 다음 `T02-list-html-style.md`로 전진한다. DadamControls 수정, 데이터 초기화, 패키지/인프라 변경은 금지한다.
