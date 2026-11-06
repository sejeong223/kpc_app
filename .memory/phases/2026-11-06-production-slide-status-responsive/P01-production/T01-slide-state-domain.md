# Task: T01 슬라이드 완료 상태·저장 호환·잠금 경계

## Status: done

## Goal
담당 슬라이드 A만 완료/해제할 수 있는 저장·권한·명령 기반을 만들고, 같은 소목차 B의 편집 및 기존 데이터/보관본을 보존한다.

## Decision Summary
- ProposalSlide.state를 단일 완료/잠금 원천으로 삼는다. Section.state/locked는 집계값이다.
- v1/v2 읽기 호환을 포함한 schemaVersion 3 전환. 기존 목차 일괄 명령은 계속 지원한다. 제작 UI 연결은 T02.
- 담당자는 기존 Section.assigneeIds 및 PM/super_admin 규칙을 따른다. 권한 확대나 설정 저장 방식 변경은 없다.

## Implementation

### I01. 모델·엄격 스키마·저장 호환
- Related Files:
  - types/workspace-production.ts :: ProposalSlide, ProjectWorkspaceState, LegacyRoundBody, LegacyProjectWorkspaceState, WorkspaceOperation — modify
  - lib/workspace/production/schemas.ts :: ProposalSlideSchema, RoundBodySchema, WorkspaceStateBase, LegacyWorkspaceStateSchema, WorkspaceMutationSchema, PreparedWorkspaceMutationSchema, validateStateReferences — modify
  - lib/workspace/production/state-compatibility.ts :: upgradeWorkspaceState, StoredWorkspaceStateSchema — modify
  - lib/workspace/production/section-locks.ts :: 기존 정규화 함수 — modify (현재 미추적 파일이지만 사용자 작업의 일부이므로 보존 후 변경)
  - lib/workspace/production/storage-schemas.ts :: StoredWorkspaceRecordSchema — read-only, 호환 진입점 확인
  - services/workspace/workspace-records.ts :: readWorkspaceBundle — read-only, 기존 변환 진입점 유지
  - services/workspace/IndexedDbWorkspaceRepository.ts :: load/commitPrepared — read-only, 저장 경로 재사용

#### Signatures & Types
~~~typescript
type SlideWritingState = "writing" | "done";
interface ProposalSlide {
  state: SlideWritingState; // 필수, non-null; 새 슬라이드는 writing
  // 기존 id, sectionId, revision, content, template, usedSettings, sources,
  // demoSourceKey를 이름/타입 변경 없이 유지
}
interface ProjectWorkspaceState {
  schemaVersion: 3; // 그 외 기존 필드 유지
}
type PreSlideStateProposalSlide = Omit<ProposalSlide, "state">;
type V2RoundBody = Omit<RoundBody, "slides"> & {
  slides: PreSlideStateProposalSlide[];
};
type LegacyRoundBody = Omit<V2RoundBody, "canvasComments">;
interface V2RoundSnapshot extends Omit<RoundSnapshot, "body"> {
  body: V2RoundBody;
}
interface V2WorkspaceUndo extends Omit<WorkspaceUndo, "previousBody"> {
  previousBody: V2RoundBody;
}
interface V2ProjectWorkspaceState extends Omit<
  ProjectWorkspaceState, "schemaVersion" | "body" | "snapshots" | "undo"
> {
  schemaVersion: 2;
  body: V2RoundBody;
  snapshots: V2RoundSnapshot[];
  undo: V2WorkspaceUndo | null;
}
// LegacyRoundSnapshot/LegacyWorkspaceUndo/LegacyProjectWorkspaceState는
// 같은 구조로 LegacyRoundBody 및 schemaVersion:1을 사용한다.
type SlideStateOperation =
  | { type: "set-slide-state"; id: string; state: SlideWritingState }
  | { type: "unlock-slide"; id: string };

function upgradeWorkspaceState(
  source: LegacyProjectWorkspaceState | V2ProjectWorkspaceState
): ProjectWorkspaceState;
function isSlideLocked(slide: Pick<ProposalSlide, "state">): boolean;
function syncSectionCompletion(body: RoundBody): RoundBody;
function normalizeWorkspaceCompletion(state: ProjectWorkspaceState): ProjectWorkspaceState;
~~~

#### Data & Schema Fields
- Slide.state는 writing/done enum. 별도 Slide.locked는 추가하지 않는다.
- 슬라이드 id와 sectionId 외래키/중복 검증, revision 정수 제한, 자산/댓글 참조 검증은 그대로 유지.
- Section.state/locked는 자식이 하나 이상일 때 모든 자식 state=done이면 done/true, 하나라도 writing이면 writing/false.
- 빈 Section은 기존 state를 유지하고 locked=(state===done)로 정규화한다. 새 빈 Section은 writing/false.
- v1/v2 저장용 슬라이드 스키마는 state가 없는 기존 엄격 shape를 유지한다. 현재 ProposalSlideSchema를 재사용해 과거 데이터를 거부하면 안 된다.
- v1/v2 body/snapshot/undo 스키마를 각각 이전 shape로 검증한 뒤 v3로 변환한다. v3에 누락된 state를 writing으로 임의 보정하지 않는다.
- bodyReferenceErrors/validateStateReferences는 v1/v2/v3의 공통 참조 필드만 요구하도록 입력 타입을 정리한다. 새 state 필드가 없다는 이유로 과거 저장용 타입을 강제로 현재 타입으로 캐스팅하지 않는다.
- StoredWorkspaceStateSchema의 엄격 v1/v2/v3 union → 변환 → 현재 스키마 검증 순서. 잘못된 enum/참조는 STORAGE 처리 경로를 유지한다.
- IndexedDB 버전/스토어/프로젝트 namespace/파일 schemaVersion은 바꾸지 않는다.

#### Execution Flow / Logic
1. v1은 canvasComments를 기존 emptyCanvasComments()로 보완, v2는 기존 canvasComments를 보존한다.
2. 각 body의 슬라이드에 그 body의 section.state===done이면 done, 아니면 writing을 부여한다. 유효한 기존 Section.locked=true는 이미 state=done 제약을 통과한다.
3. 현재 body, snapshots 각각의 body, undo.previousBody를 각각 변환한다. 현재 소목차 값을 과거 보관본에 복사하지 않는다.
4. syncSectionCompletion은 슬라이드 상태를 읽어 소목차만 갱신한다. 소목차→슬라이드 전파는 마이그레이션/명시적 소목차 일괄 명령에서만 수행.
5. 기존 normalizeCompletedSectionLocks를 새 단방향 정규화로 교체하고 모든 import를 갱신한다. 이를 남겨 두고 mixed section을 다시 잠그면 개별 편집이 재차 막힌다.
6. 변환 자체로 revision/inputRevision/slide.revision/currentRound를 증가시키지 않는다. 이후 실제 저장 명령에서 v3가 기존 트랜잭션으로 저장된다.
7. 콘텐츠, 순서, ID, 할당, grants, 댓글, 파일, blob, 자산 핀, PPT/보관본 메타데이터는 그대로. 이전 전체 완료를 임의 해제하지 않는다.

### I02. 슬라이드/목차 단위 권한과 상태 명령
- Related Files:
  - lib/workspace/production/domain.ts :: createWorkspaceState, applyWorkspaceMutation — modify
  - lib/workspace/production/permissions.ts :: canEditSection 및 신규 canEditSlide/canInsertSlide — modify
  - lib/workspace/production/selectors.ts :: getWorkspaceCapabilities, selectProjectView, selectSnapshotView, selectTocRows, selectDeletionImpact, getCompletionSummary — modify
  - types/workspace-production.ts :: WorkspaceOperation, ProjectView(capabilities 추론) — modify

#### Signatures & Types
~~~typescript
function canEditSlide(context: WorkspaceContext, state: ProjectWorkspaceState, slideId: string): boolean;
function canInsertSlide(context: WorkspaceContext, state: ProjectWorkspaceState, sectionId: string): boolean;
// getWorkspaceCapabilities 반환에 추가:
editableSlideIds: string[];
unlockableSlideIds: string[];
insertableSectionIds: string[];
// 기존 editableSectionIds / unlockableSectionIds 및 actions 유지.
~~~

#### Execution Flow / Logic
1. canEditSlide: 프로젝트 접근 + writing 회차 + 소목차 작성 권한 + 해당 slide.state=writing. 다른 형제의 done은 차단 사유가 아니다.
2. canEditSection/기존 editableSectionIds: 소목차 전체 내용을 바꾸는 권한. writing 회차/작성 권한/소목차 자체 비완료/완료 자식 없음. 개별 쓰기는 이 함수를 쓰지 않는다.
3. canInsertSlide/insertableSectionIds: writing 회차 + 작성 권한 + 소목차 전체 완료가 아님. 완료 자식이 일부 있어도 새 장을 추가할 수 있다.
4. unlockableSlideIds는 작성 권한이 있는 done 슬라이드. unlockableSectionIds는 작성 권한이 있고 done 자식이 하나 이상 있거나 빈 소목차가 완료인 경우.
5. set-slide-state는 id를 slide.id로 조회하고 현재 회차/revision을 검증한다. 작성 권한을 확인한 뒤 그 장의 state만 바꾼다. done이면 즉시 isSlideLocked=true. writing 전환은 unlock-slide와 동일 권한/전이 로직을 공유한다.
6. unlock-slide는 writing 회차/작성 권한/done 대상 검증 후 해당 장만 writing으로 변경. 이미 writing인 unlock-slide는 기존 방식대로 VALIDATION. 같은 값 set 요청은 내용이나 형제를 바꾸지 않는다.
7. 실제 상태가 바뀐 대상 slide.revision만 1 증가한다. 프로젝트 revision은 기존 명령 파이프라인대로 증가, inputRevision은 상태만 바꿀 때 증가시키지 않는다. 상태 변경은 기존과 같이 undo를 생성하지 않는다.
8. 한 상태 변경 직후 syncSectionCompletion(current body). 스냅샷은 수정하지 않는다. last sibling 완료 시 소목차 완료, 하나 해제 시 소목차 작성 중.
9. set-section-state/unlock-section는 별도 목차 메뉴에서만 사용하는 일괄 명령으로 유지한다. 작성 권한을 별도로 검사하고 해당 소목차의 자식들만 전환한다. 이미 완료인 자식이 섞였다고 일괄 완료를 막지 않는다. 다른 소목차는 불변. 빈 목차도 기존 기능 유지.
10. selectTocRows: 완료/locked 표시는 전체 완료 집계. 구조/담당 변경은 완료 자식이 하나라도 있으면 보호. 상태 dropdown의 canEdit는 작성 권한이 있고 전체 완료가 아닌 경우로 별도 계산한다(혼합 상태에서도 일괄 완료 가능). canUnlock는 unlockableSectionIds 사용.
11. selectDeletionImpact(slide.id)는 editableSlideIds 사용, 장/소목차 삭제는 포함된 완료 슬라이드 보호. getCompletionSummary의 writingSections 단위는 변경하지 않고 집계된 Section 상태 사용.
12. selectSnapshotView의 읽기 전용 반환은 새 capability 배열도 모두 비운다. 완료 회차 자체도 모든 편집/해제 불가.
13. 오류: 없는 ID NOT_FOUND, 타 프로젝트/담당 아님 FORBIDDEN, 완료 회차 READ_ONLY, 잠긴 내용 쓰기 LOCKED, 오래된 revision/round CONFLICT. 실패 시 복제된 상태/기존 트랜잭션을 통해 저장 변경 없이 종료.

### I03. 잠금을 우회하는 내용 반영 경로 및 생성 경로 정합성
- Related Files:
  - lib/workspace/production/domain.ts :: apply-manufacturing-prompt, add/edit/save/bind/move/remove/duplicate-slide, batch-slides, set-sources, pin-assets, apply-proposal, replace-content, undo, start-round, register-ppt — modify
  - services/workspace/WorkspaceProductionService.ts :: edit, editSlides, previewSlide, propose, applyProposal, importPermission, applyImport, pasteSlides, insertImage — modify
  - services/workspace/WorkspaceAssetService.ts :: apply — modify
  - lib/workspace/production/clipboard.ts :: cloneClipboardSlide — modify
  - lib/workspace/production/mock-proposals.ts :: createMockProposal, selectedMockChange — modify
  - services/workspace/workspace-demo.ts :: createHtmlDemoBundle, addHtmlDemoCompletion — modify
  - services/workspace/workspace-mfg-demo.ts :: createManufacturingDemoBundle, addManufacturingDemoCompletion — modify
  - lib/workspace/production/editor.ts :: moveSlideSelection — read-only, 복사·이동 시 상태 보존 확인
  - lib/pptx/production/content-schema.ts :: RenderInputSchema — read-only, 새 state 필드를 가진 현재 입력의 타입 호환 확인

#### Details
- 아래 동작 계약에 따라 실제 변경 대상을 검사한다.

| 경로 | 정확한 검증 대상과 동작 |
| :--- | :--- |
| edit/save/bind/set-sources/제조업 apply/이미지 삽입/편집 내용 preview | 대상 slide.id에 canEditSlide. 제조업의 기존 담당자 추가 제한 유지. demoPrompt는 여전히 Section에 저장 |
| 추가/복제/붙여넣기 | 대상 Section에 canInsertSlide. 새 ID의 state=writing. 복제 원본 done 상태를 새 장에 전파하지 않음 |
| 이동/삭제/선택 일괄 이동·삭제 | 실제 선택한 기존 slideIds 전부 canEditSlide, 이동 대상은 canInsertSlide. 하나라도 잠기면 전부 거부, 부분 성공 없음 |
| 구조 변경/소목차 삭제 | 영향 소목차에 done 자식이 있으면 LOCKED. 완성된 형제의 내용/소속을 간접 변경하지 않음 |
| AI 제안 생성/적용 | 명시 slideIds는 해당 장만 검사. sectionIds는 해당 목차 전체 검사. 변경되지 않은 done 형제를 payload가 포함해도 읽기 복사만은 허용 |
| 자산 재적용 | 실제 재적용 slideIds만 canEditSlide. pin-assets의 기존 content/sources/소속 보존 검증 유지 |
| PPT 가져오기/replace-content/apply-proposal | old/new를 ID별 비교해 실제 바뀌거나 삭제/이동하는 기존 장만 검사. 새 장은 대상 목차 canInsertSlide. 잠긴 형제를 payload에 그대로 포함한 것만으로 실패시키지 않음 |
| 외부 prepared payload | 기존 장의 state 변경을 거부(FORBIDDEN), 새 장은 writing만 허용. 잠금은 상태 명령만 변경할 수 있음 |
| 되돌리기 | previousBody와 현재 body의 실제 변경 대상만 검사. 기존 afterRevision/round/actor/15초 조건 유지. 변경 없는 잠긴 형제 때문에 정상 작업 undo를 차단하지 않으며 완료 장 수정/삭제 복구 우회도 막음 |
| 회차 시작 | 슬라이드 state를 유지, 소목차 집계만 갱신. writing 형제가 done 소목차 캐시 때문에 새 회차에서 잠기지 않음 |
| PPT 등록 가능 여부 | 편집 가능한 개별 slide가 하나라도 있으면 기존 import/register 권한 경로 유지. 빈 편집 가능 목차는 기존 지원 유지 |

- 도메인 내부의 기존 contentChanged(sectionIds)는 “소목차 전체 쓰기” 용도로 유지/명확화한다. 개별 경로용 contentSlidesChanged(slideIds, destinationSectionIds=[])를 추가해 입력 revision/undoSections 기록은 공유하되 위 표의 범위로 검사한다.
- WorkspaceProductionService는 editSlidesById(state, ids), insertIntoSections(state, ids), 기존 edit(state, sectionIds)를 구분한다. previewSlide는 저장본 읽기에는 편집 권한을 요구하지 않고 임시 내용 preview에만 적용한다.
- Prepared 전체 slides 배열을 교체하는 경우 순서 변경 검증, sectionIds 범위 일치 검증, 새 asset pin 검증을 유지한다. state 필드 추가를 핑계로 검증을 완화하지 않는다.
- createWorkspaceState는 v3. 직접 만든 ProposalSlide 객체(일반 add, mock draft, HTML/demo seed)는 state를 반드시 명시한다.
- 제조업 초기 seed는 각 원본 소목차 완료 상태를 자식에 부여. 기존 46장/담당15장/17번 완료 예시/자료/댓글 내용은 그대로.
- 일반 HTML demo의 완성 예시를 만들 때 slides도 모두 done으로 설정. 제조업 완료 기록 추가는 현재 슬라이드별 상태를 유지한다.
- 이 Task는 공유 편집 본문 분리, PPT 포맷/파일 버전 변경, 사용자 저장 데이터 초기화를 하지 않는다.

## Acceptance Criteria
- [ ] 같은 소목차 A/B 중 A만 done/locked, B는 writing/editable. A 해제도 A만 변경.
- [ ] 다른 형제의 본문/ID/순서/revision은 불변. 본문/PPT inputRevision도 상태 변경만으로 바뀌지 않음.
- [ ] v1/v2의 현재/보관/undo 각각 자기 상태로 이관, 재파싱해도 동일. 잘못된 v3 데이터는 거부.
- [ ] 완료된 A를 직접 edit/AI/import/assets/batch 요청으로 바꿀 수 없음. B의 동일 작업은 가능.
- [ ] 소목차 일괄 명령/빈 목차/완성 회차/재작업/undo/새 장 생성이 명시 계약을 따름.
- [ ] 현재 미커밋 수정과 모든 기존 프로젝트/파일/댓글/PPT/grants 보존.
- [ ] T02 이전 기존 제작 toolbar의 소목차 일괄 명령도 여전히 컴파일/실행 가능.

## Validation
- npm.cmd run typecheck
- npx.cmd eslint types/workspace-production.ts lib/workspace/production services/workspace
- 아래 PowerShell stdin 검증을 실행한다. tests/나 검증 스크립트 파일을 만들지 않는다.
~~~powershell
@'
const assert = require("node:assert/strict");
const {randomUUID}=require("node:crypto");
const {MFG_DEMO_PROJECT_ID}=require("./config/production-mfg-demo");
const {createManufacturingDemoBundle}=require("./services/workspace/workspace-mfg-demo");
const {applyWorkspaceMutation}=require("./lib/workspace/production/domain");
const {StoredWorkspaceStateSchema}=require("./lib/workspace/production/state-compatibility");
const {canEditSlide}=require("./lib/workspace/production/permissions");
const actor={id:"preview:sodam",name:"정소담",role:"user",isMock:true};
const members=[["preview:sodam","정소담"],["demo:mfg:lee","이서연"],["demo:mfg:kim","김민수"]]
 .map(([id,name])=>({id,adminUserId:id,name,role:"user",departmentId:null,departmentName:"",email:null}));
const context={identity:{namespace:"files:preview:sodam",actor},
 project:{id:MFG_DEMO_PROJECT_ID,number:"verify",name:"제조업",departmentId:null,pmId:"demo:mfg:lee",pmName:"이서연",memberIds:members.map(m=>m.id)},
 members,now:"2026-11-06T09:00:00.000Z",newId:randomUUID};
let bundle=createManufacturingDemoBundle(context);
assert(bundle);
const [a,b]=bundle.state.body.slides.filter(s=>s.sectionId==="s31");
assert(a&&b);
const before=structuredClone(bundle);
const run=(operation)=>{const result=applyWorkspaceMutation(bundle.state,
 {projectId:bundle.state.projectId,expectedRevision:bundle.state.revision,expectedRound:bundle.state.currentRound,operation},context,bundle.files);
 bundle={state:result.receipt.state,files:result.files};return result;};
run({type:"set-slide-state",id:a.id,state:"done"});
assert.equal(bundle.state.body.slides.find(s=>s.id===a.id).state,"done");
assert.deepEqual(bundle.state.body.slides.find(s=>s.id===b.id),b);
assert(!canEditSlide(context,bundle.state,a.id));
assert(canEditSlide(context,bundle.state,b.id));
assert.equal(bundle.state.body.sections.find(s=>s.id==="s31").state,"writing");
assert.equal(bundle.state.inputRevision,before.state.inputRevision);
assert.throws(()=>run({type:"edit-slide",id:a.id,content:a.content}),e=>e.code==="LOCKED");
run({type:"edit-slide",id:b.id,content:{...b.content,lead:"개별 편집 검증"}});
run({type:"unlock-slide",id:a.id});
assert(canEditSlide(context,bundle.state,a.id));
const legacy=structuredClone(before.state);legacy.schemaVersion=2;
for(const body of [legacy.body,...legacy.snapshots.map(s=>s.body),...(legacy.undo?[legacy.undo.previousBody]:[])])
 for(const slide of body.slides)delete slide.state;
const upgraded=StoredWorkspaceStateSchema.parse(legacy);
assert.equal(upgraded.schemaVersion,3);
assert(upgraded.body.slides.every(s=>s.state===legacy.body.sections.find(v=>v.id===s.sectionId).state));
assert.deepEqual(StoredWorkspaceStateSchema.parse(upgraded),upgraded);
console.log("개별 완료/잠금/해제 및 v2 호환 통과");
'@ | node --require tsx/cjs
~~~
- 추가 stdin 불변식: 마지막 형제 완료/한 장 해제 집계, v1 canvas 이관, snapshot/undo 과거 상태 불변, 손상된 state 거부, 잠긴 A+작성 B batch 전부 거부, 새 장 writing, stale revision/권한 없음/완성 회차 거부, 상태 payload 위조 차단.
- IndexedDB 재로드는 기존 WorkspaceDatabase에 fake-indexeddb의 독립 IDBFactory와 임의 dbName을 주입해 WorkspaceProductionService.execute → repository.load → StoredWorkspaceStateSchema 결과를 확인. 실제 사용자 DB에 접근하지 않는다.
- 실패하면 T02 진행/커밋 전에 원인 해결. 브라우저 시각 검증은 하지 않았음을 보고.

## Commit Message
~~~text
fix(production): 슬라이드별 완료 상태와 잠금 경계 분리

Plan: 2026-11-06-production-slide-status-responsive
Phase: P01-production
Task: T01-slide-state-domain

- 기존 저장본을 보존하며 슬라이드 단위 상태로 변환
- 개별 쓰기와 소목차 일괄 조작의 잠금 범위 분리
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 Task 완료 커밋의 Plan/Phase/Task 식별자로 조회
- 검증 기록: [T01 결과](../../../reports/2026-11-06-production-slide-status-responsive-T01.md)

## Execution Constraints
현재 작업 트리에는 사용자 요청으로 진행된 수정이 남아 있다. 특히 domain/permissions/selectors/state-compatibility/section-locks의 변경을 먼저 보존하고 그 위에 구현한다. tests/ 및 브라우저/CUA/E2E/dev server/스크린샷 금지. 원본 HTML 읽기 전용. Cosmos/패키지 추가/배포/push 없음. 무관한 파일 일괄 stage/reset/restore 금지, current.md 강제 stage 금지.
