# Task: T01-project-domain 목차·제작 도메인 계약과 권한 전이

## Status: done

## Goal
같은 프로젝트 상태에서 목차·내용·의견·권한·완성/재작업의 유효한 전이만 허용하는 순수 도메인과 계약을 제공한다.

## Decision Summary
- 결정 D01~D12/D14~D18 구현 기반. UI·DB를 직접 호출하지 않는 순수 전이부터 검증한다.
- 파일만 여러 회차인 기존 프로젝트를 손상 없이 시작하고, 과거 완료본은 불변이다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 모델·명령·오류·런타임 스키마

- Related Files:
  - `types/workspace-production.ts` :: 아래 전체 Container/union/계약 — new
  - `lib/workspace/production/schemas.ts` :: WorkspaceStateSchema/WorkspaceMutationSchema/PreparedWorkspaceMutationSchema — new
  - `lib/workspace/production/errors.ts` :: WorkspaceError — new
  - `config/workspace-production.ts` :: WORKSPACE_LIMITS — new
  - `types/workspace-files.ts`, `types/admin-prompts.ts`, `types/admin-assets.ts`, `config/comments.ts` — 참조 타입; read-only

#### Details
- **Signatures & Types**: 아래 선언을 export한다. PromptSource/PromptRevision은 types/admin-prompts, SkillAssetRevision/TemplateAssetRevision은 types/admin-assets, FileIdentity/WorkspaceProject/FileProjectState/FileRoundEntry는 types/workspace-files, CommentPoint/CommentMention/CommentDraft는 config/comments의 기존 타입을 import한다. union의 공통 속성은 Base Container+Pick/Omit으로 정리할 수 있으나 필드와 의미는 변경하지 않는다.
```typescript
type ProjectPermission = "outline" | "assign" | "setup" | "complete" | "rework";
interface WorkspaceMember { id:string; adminUserId:string; name:string; departmentId:string|null; departmentName:string; email:string|null }
interface ProjectGrant { userId:string; permissions:ProjectPermission[] }
interface Chapter { id:string; title:string }
interface Section { id:string; chapterId:string; title:string; assigneeIds:string[]; reviewerIds:string[]; state:"writing"|"done"; locked:boolean }
type ContentBlock =
 | { id:string; kind:"text"; text:string }
 | { id:string; kind:"list"; items:string[] }
 | { id:string; kind:"table"; columns:string[]; rows:string[][] }
 | { id:string; kind:"image"; blobId:string; alt:string; width:number; height:number; mime:"image/png"|"image/jpeg" };
interface SlideContent { title:string; lead:string; blocks:ContentBlock[] }
interface ElementBinding { key:"title"|"lead"|string; objectId:string }
interface SlideTemplateRef { pinId:string; sourceSlidePath:string; bindings:ElementBinding[] }
interface SourceRef { id:string; kind:"requirement"|"file"; targetId:string; fileRound:number|null; versionId:string|null; page:number|null; quote:string|null; provenance:"mock"|"manual" }
interface SlideUsedSettings { skillPinId:string|null; promptPinId:string|null; promptItemId:string|null; prompt:string; sources:PromptSource[] }
interface ProposalSlide { id:string; sectionId:string; revision:number; content:SlideContent; template:SlideTemplateRef|null; usedSettings:SlideUsedSettings; sources:SourceRef[] }
interface Requirement { id:string; sectionId:string|null; title:string; coverage:"none"|"partial"|"full"; page:number|null; excerpt:string|null; provenance:"mock"|"manual" }
interface ChecklistItem { id:string; title:string; source:string; assigneeIds:string[]; done:boolean; checkedBy:string|null; checkedAt:string|null }
interface ProjectPromptBinding { sectionId:string; itemId:string|null }
interface ProjectPromptOverride { itemId:string; prompt:string|null; sources:PromptSource[]|null }
interface ProjectSettings { promptPinId:string|null; skillPinId:string|null; templatePinId:string|null; bindings:ProjectPromptBinding[]; overrides:ProjectPromptOverride[] }
interface ProjectCommentMessage { id:string; threadId:string; authorId:string; authorName:string; text:string; mentions:CommentMention[]; createdAt:string; updatedAt:string|null; deletedAt:string|null; revision:number }
interface ProjectCommentThread { id:string; sectionId:string; slideId:string; round:number; number:number; authorId:string; status:"open"|"resolved"; point:CommentPoint|null; createdAt:string; updatedAt:string; resolvedBy:string|null; resolvedAt:string|null; revision:number; carriedFromId:string|null; messages:ProjectCommentMessage[] }
interface RoundBody { chapters:Chapter[]; sections:Section[]; slides:ProposalSlide[]; requirements:Requirement[]; checklist:ChecklistItem[]; settings:ProjectSettings; threads:ProjectCommentThread[] }
interface RoundSnapshot { id:string; round:number; kind:"complete"|"unfinished"; createdAt:string; createdBy:string; inputRevision:number; body:RoundBody; fileEntries:FileRoundEntry[]; fileRevision:number; pptVersionId:string|null }
type AssetPin =
 | { id:string; kind:"prompt"; assetId:string; revisionId:string; revision:number; name:string; capturedAt:string; capturedBy:string; snapshot:PromptRevision }
 | { id:string; kind:"skill"; assetId:string; revisionId:string; revision:number; name:string; capturedAt:string; capturedBy:string; snapshot:SkillAssetRevision }
 | { id:string; kind:"template"; assetId:string; revisionId:string; revision:number; name:string; capturedAt:string; capturedBy:string; snapshot:TemplateAssetRevision; blobId:string; sha256:string };
interface ManifestElement { key:string; objectId:string; shapeId:string; kind:"text"|"list"|"table"|"image" }
interface ManifestSlide { id:string; sectionId:string; path:string; sourcePinId:string; sourcePath:string; elements:ManifestElement[] }
interface ExportManifest { version:1; projectId:string; round:number; inputRevision:number; exportId:string; slides:ManifestSlide[] }
interface PptVersion { id:string; index:number; round:number; snapshotId:string|null; kind:"generated"|"uploaded"; pinIds:string[]; blobId:string; filename:string; byteLength:number; sha256:string; createdAt:string; createdBy:string; inputRevision:number; baseVersionId:string|null; manifest:ExportManifest|null }
interface WorkspaceUndo { id:string; actorId:string; expiresAt:string; afterRevision:number; round:number; label:string; previousBody:RoundBody; sectionIds:string[]; permission:ProjectPermission|"content" }
interface ProjectWorkspaceState { schemaVersion:1; projectId:string; revision:number; inputRevision:number; currentRound:number; phase:"writing"|"completed"; grants:ProjectGrant[]; body:RoundBody; snapshots:RoundSnapshot[]; pins:AssetPin[]; pptVersions:PptVersion[]; reviews:ProjectCommentThread[]; undo:WorkspaceUndo|null }
interface WorkspaceContext { identity:FileIdentity; project:WorkspaceProject; members:readonly WorkspaceMember[]; now:string; newId():string }
interface WorkspaceMutation { projectId:string; expectedRevision:number; expectedRound:number; operation:WorkspaceOperation }
interface WorkspaceReceipt { state:ProjectWorkspaceState; createdIds:string[]; undoId:string|null }
type WorkspaceErrorCode = "VALIDATION"|"FORBIDDEN"|"NOT_FOUND"|"READ_ONLY"|"LOCKED"|"CONFLICT"|"LIMIT"|"CANCELLED"|"STORAGE"|"DB_UNAVAILABLE"|"DB_BLOCKED"|"QUOTA"|"ORIGINAL_MISSING"|"UNDO_EXPIRED"|"ASSET_UNAVAILABLE"|"MAPPING"|"LAYOUT";
class WorkspaceError extends Error { readonly code:WorkspaceErrorCode; constructor(code:WorkspaceErrorCode,message:string,options?:ErrorOptions); }

type WorkspaceOperation =
 | {type:"add-chapter";title:string;afterId:string|null}
 | {type:"rename-chapter";id:string;title:string}
 | {type:"move-chapter";id:string;beforeId:string|null}
 | {type:"remove-chapter";id:string}
 | {type:"add-section";chapterId:string;title:string;afterId:string|null}
 | {type:"rename-section";id:string;title:string}
 | {type:"move-section";id:string;chapterId:string;beforeId:string|null}
 | {type:"remove-section";id:string}
 | {type:"assign-section";id:string;assigneeIds:string[];reviewerIds:string[]}
 | {type:"set-grants";userId:string;permissions:ProjectPermission[]}
 | {type:"set-section-state";id:string;state:"writing"|"done"}
 | {type:"unlock-section";id:string}
 | {type:"add-check";title:string;source:string}
 | {type:"edit-check";id:string;title:string;source:string}
 | {type:"assign-check";id:string;assigneeIds:string[]}
 | {type:"check";id:string;done:boolean}
 | {type:"remove-check";id:string}
 | {type:"add-slide";sectionId:string;afterId:string|null;template:SlideTemplateRef|null}
 | {type:"edit-slide";id:string;content:SlideContent}
 | {type:"bind-slide";id:string;template:SlideTemplateRef}
 | {type:"duplicate-slide";id:string;targetSectionId:string;afterId:string|null}
 | {type:"move-slide";id:string;sectionId:string;beforeId:string|null}
 | {type:"remove-slide";id:string}
 | {type:"set-sources";id:string;sources:SourceRef[]}
 | {type:"set-coverage";requirementId:string;coverage:Requirement["coverage"]}
 | {type:"map-prompt";sectionId:string;itemId:string|null}
 | {type:"override-prompt";itemId:string;prompt:string|null;sources:PromptSource[]|null}
 | {type:"comment-create";sectionId:string;slideId:string;point:CommentPoint|null;draft:CommentDraft;review:boolean}
 | {type:"comment-reply";threadId:string;draft:CommentDraft;review:boolean}
 | {type:"comment-edit";threadId:string;messageId:string;draft:CommentDraft;review:boolean}
 | {type:"comment-delete";threadId:string;messageId:string|null;review:boolean}
 | {type:"comment-move";threadId:string;point:CommentPoint|null;review:boolean}
 | {type:"comment-status";threadId:string;status:"open"|"resolved";review:boolean}
 | {type:"complete";expectedFileRevision:number;acknowledged:boolean}
 | {type:"start-round";expectedFileRevision:number;acknowledged:boolean}
 | {type:"undo";id:string};
interface PreparedAssetChange { type:"pin-assets"; pins:AssetPin[]; settings:ProjectSettings; slides:ProposalSlide[] }
interface PreparedProposalChange { type:"apply-proposal"; sectionIds:string[]; chapters:Chapter[]|null; sections:Section[]|null; slides:ProposalSlide[]|null }
interface PreparedVersionChange { type:"register-ppt"; version:PptVersion }
type PreparedWorkspaceOperation = WorkspaceOperation|PreparedAssetChange|PreparedProposalChange|PreparedVersionChange;
interface PreparedWorkspaceMutation extends Omit<WorkspaceMutation,"operation"> { operation:PreparedWorkspaceOperation }

```
- **Data & Schema Fields**:
- 모든 ID는 1~400자 비어 있지 않은 문자열, 생성은 context.newId(); 저장용 날짜는 ISO UTC, 표시만 한국 시간. 입력에는 작성자·createdAt·권한 플래그를 받지 않는다.
- 초기값: schemaVersion=1, revision=inputRevision=1, currentRound=files.currentRound, phase=writing, 배열은 [], settings의 3 pin은 null, undo=null. 기존 파일만 있는 과거 회차의 제작 snapshot은 만들지 않는다.
- chapters 순서 및 각 chapter의 sections 배열 순서, 각 section의 slides 배열 순서가 표시 순서다. 번호는 조회 시 계산한다. 섹션 부모와 slide.sectionId는 실제 대상에 존재해야 한다.
- 제목 1~200자 trim; 본문 20,000자/블록, lead 1,000자, 목록 최대100개/항목2,000자; 표 1~20열/1~100행/셀2,000자, 모든 행 너비=columns.length; 프로젝트 최대50대목차·200소목차·200슬라이드. 자의적 내용 잘라내기 대신 LIMIT.
- 담당자 최소1명(신규 섹션 기본 PM), 리뷰자/체크 담당은 0명 허용. 모두 프로젝트 멤버의 고유 ID; grant는 중복 없이 프로젝트 참여자에게만. PM·슈퍼 권한은 저장 체크값으로 낮출 수 없다.
- 박힌 Pin은 immutable. body의 settings/slide template의 pinId와 매핑, prompt itemId는 존재하는 같은 프로젝트 보관 사본을 참조한다. null template의 초안 저장은 허용하되 출력은 MAPPING 실패로 막는다.
- D21: Pin 사본/권한 스냅샷만으로 자산 사용을 허가하지 않는다. 서비스에서 live catalog를 재확인하여 available/forbidden/unavailable을 구분한다.
- Point는 xRatio/yRatio 0~1 유한수, null이면 핀 없는 의견; 멘션은 실제 표시 문자열과 멤버 ID·offset이 일치해야 한다. 스크립트/HTML은 실행하지 않는다.
- 새 의견의 deletedAt=null. 타인 답글을 보존해야 하는 루트 삭제에는 deletedAt=now/text="삭제된 의견입니다."/mentions=[]를 기록한다. 삭제 표식은 재편집·핀 이동할 수 없으며 보관 snapshot을 정규화한다는 이유로 수정하지 않는다.
- 모든 성공 변경은 state.revision+1. PPT에 영향을 주는 구조/본문/템플릿/Skill/프롬프트/출처 변경은 inputRevision+1, 의견/권한/체크/상태/버전등록은 inputRevision 유지. 이 구분은 stale 출력 판정과 작업 완료시 재검사에 사용한다.
- 빈 값/참조/중복/권한/회차·revision 불일치는 변경 전 실패한다. 배열 내부 일부 성공 금지. 원본 state/files를 직접 변경하지 않고 새 객체를 반환한다.
- Undo는 최근 1건·15초, 삭제/편집/제안 적용에 생성하며 previousBody만 저장한다. actorId·afterRevision·round·현재 권한/고정을 다시 확인한다. 일반 변경 이후 undo는 무효; 권한·회차·완성본·PPT 버전은 undo로 되돌리지 않는다.
- complete/start-round의 파일 변경은 파일 revision도 비교한다. 완성은 counts 확인 acknowledged=true 필요, 상태·의견·체크 자동 완료 없음. 파일 currentRound의 sealedAt은 null 그대로지만 completed guard로 파일 쓰기를 막는다.
- complete 시 immutable complete snapshot(body deepcopy + 파일 version refs)을 한 번 추가하고 phase=completed. 동일 회차 재완성은 READ_ONLY. start-round는 writing이면 unfinished snapshot, completed이면 기존 complete snapshot 유지; 이전 파일 회차 sealedAt=now, 새회차 entries 복사, state/files currentRound 동시+1.
- 재작업 시 state.body를 계승하되 done 섹션만 locked=true, writing은 false. 새 body 의견은 미해결 스레드만 새 ID로 계승(carriedFromId), 기존 이력은 보존. review 의견도 미해결만 새 작업으로 복사하고 원 review는 남긴다. 새 회차의 checklist 확인 기록은 이전 값 유지하며 사용자 해제로 바꿀 수 있다.
- history(snapshot)와 pins/pptVersions/reviews는 삭제 undo에서 복원/삭제하지 않는다. 과거 읽기 전용은 슈퍼 관리자에도 동일하다.
- ElementBinding.key는 title/lead 또는 해당 slide.content.blocks의 id. 중복 key/objectId 금지; content block id에 title/lead 예약 문자열 금지. template null일 때 bindings도 존재하지 않는다.
- AssetPin의 snapshot에 기존 schema를 재사용한다. snapshot.assetId/revision과 바깥 ref가 같고 snapshot.id가 바깥 revisionId와 일치해야 한다(기존 revision 모델의 필드는 revisionId가 아닌 id). Template의 sha256은 64자리 소문자 hex. blobId를 client가 임의 등록할 수 없도록 pin-assets는 준비 명령으로만 사용한다.
- SlideUsedSettings는 실제 내용 생성/재적용 시 사용한 설정을 고정한다. 신규 수동 슬라이드는 현재 선택된 pin/상속 prompt를 복사하며 선택이 없으면 pin/item=null,prompt="",sources=[]이다. 프로젝트 기본 설정을 바꾸어도 고정 슬라이드의 usedSettings를 변경하지 않는다. PptVersion.pinIds는 출력에 사용된 Template·Skill·Prompt pin의 고유 목록이며 다운로드 권한 검사에 사용한다.
- ExportManifest.version=1, project/round/inputRevision과 PptVersion 일치, slides.id/path 고유. Manifest는 외부 파일로부터 읽을 때 별도 신뢰 검증이 필요하다.
- **Execution Flow / Logic**:
  1. strictObject/명시적 enum으로 입력·저장 상태를 검증한다. 저장 오류는 STORAGE, 사용자 입력 오류는 VALIDATION/LIMIT.
  2. 외래키/부모 관계/고유 ID/순서/최소 담당/고정 상태/보관 snapshot 불변 조건을 superRefine으로 검사한다.
  3. 내부 타입에 any/unknown을 넣지 않는다. IDB/JSON 외부 데이터는 Zod에 직접 전달해 좁혀 사용한다.
  4. 기능 한도는 config 상수에 모으고 UI/명령/schema에서 같은 값을 사용한다.

### I02. 권한·목차·본문·체크리스트·의견 전이

- Related Files:
  - `lib/workspace/production/permissions.ts` :: canManageProject/canProjectAction/canEditSection — new
  - `lib/workspace/production/domain.ts` :: createWorkspaceState/applyWorkspaceMutation — new
  - `lib/workspace/production/selectors.ts` :: getCompletionSummary/getWorkspaceCapabilities/outlineNumbers — new
  - `lib/workspace/files/permissions.ts` :: canAccessFileProject — read-only
  - `lib/comments/domain.ts` :: normalizeCommentDraft — read-only 참고; 고정 surfaceId 저장 스키마 재사용 금지
  - `lib/admin/prompts/outline.ts` :: 번호/블록 이동 알고리즘 참고 — read-only

#### Details
- **Signatures & Types**:
```typescript
function createWorkspaceState(context:WorkspaceContext,files:FileProjectState):ProjectWorkspaceState;
function applyWorkspaceMutation(state:ProjectWorkspaceState,input:PreparedWorkspaceMutation,context:WorkspaceContext,files:FileProjectState):{receipt:WorkspaceReceipt;files:FileProjectState};
function canManageProject(context:WorkspaceContext):boolean;
function canProjectAction(context:WorkspaceContext,state:ProjectWorkspaceState,permission:ProjectPermission):boolean;
function canEditSection(context:WorkspaceContext,state:ProjectWorkspaceState,sectionId:string):boolean;
function getCompletionSummary(state:ProjectWorkspaceState):{writingSections:number;openComments:number;uncheckedItems:number;slideCount:number};
function getWorkspaceCapabilities(context:WorkspaceContext,state:ProjectWorkspaceState):{managePermissions:boolean;actions:Record<ProjectPermission,boolean>;editableSectionIds:string[];unlockableSectionIds:string[]};

```
- **Data & Schema Fields**: state/context/operation은 I01 계약 그대로. 권한은 actor.id와 catalog의 member/pmId로 판단한다. 부서 관리자라는 이유로 PM이 되지 않는다.
- **Execution Flow / Logic**:
  1. 프로젝트 접근 → 입력/schema → projectId/currentRound/revision → 작업별 권한/phase/locked 순서로 검증한다. metadata/actorId/권한 boolean을 외부 값으로 신뢰하지 않는다.
  2. outline 권한: chapter/section 추가·이름·이동·삭제. 담당 변경은 assign, 설정은 setup. PM·슈퍼만 set-grants. add-section 기본 담당은 PM으로 두어 outline 권한만으로 자신에게 편집 권한을 부여하지 않는다.
  3. section state·내용/슬라이드 수정: 본인 담당/PM/슈퍼. locked에는 unlock만 허용한다. done→writing 상태 변경으로 unlock 검사를 우회하지 못한다. completed에는 body 수정 금지.
  4. chapter 삭제는 자식 section/slide/현재 thread/requirement 연결/설정 binding을 정리하되 과거 snapshot/pin/버전은 유지한다. locked 자식이 있으면 전체 실패. move는 부모/대상/자기 하위 여부 검사 후 배열 순서를 유지한다.
  5. section 삭제/slide 삭제의 영향은 조회 helper로 counts 제공; 실제 전이에서도 동일 검증. duplicate는 source 조회, destination 내용 편집, 고정 여부 검증하고 새 slide ID·block ID를 부여한다. 메시지/해결상태는 슬라이드 복제에 복사하지 않는다.
  6. 체크 생성/내용/삭제는 outline, 배정은 assign, check는 체크 담당/PM/슈퍼. checkedBy/At은 context에서만 생성, 해제 시 null.
  7. 의견은 참여자가 생성/답글 가능, 본인 메시지만 수정·삭제/핀 이동. 루트 삭제는 스레드 전체에 영향 안내; 타인 답글 삭제를 허용하지 않는다(답글이 있으면 루트 내용 삭제 표식으로 보존). 해결/재열기는 섹션 담당/PM/슈퍼. completed에서는 review=true 경로만 신규 의견으로 저장, 원 snapshot/body는 불변.
  8. register-ppt는 프로젝트 접근을 검사하며 writing/completed 및 과거 snapshot 출력에 허용한다. snapshotId가 있으면 같은 프로젝트의 해당 snapshot, 없으면 현재 회차와 버전의 round/inputRevision이 일치해야 한다. Blob/최신 자산 권한은 repository/service 경계에서 별도 확인한다. 버전 등록으로 body/snapshot을 변경하지 않는다.
  9. 모든 성공 전이 후 결과 schema 재검증. 실패하면 원본 객체와 revision 불변. 미해결 참조의 orphan을 남기지 않는다. 잠긴 섹션에서도 참여자 의견은 허용하되 내용 변경은 금지한다. 완료 후 새 리뷰/답글은 reviews에만 기록하고 보관 body의 의견을 수정하지 않는다.
- 의견 해결/재열기 권한은 section.assigneeIds 또는 PM/슈퍼로 판단한다. locked 때문에 false가 되는 canEditSection을 그대로 재사용해 의견까지 차단하지 않는다. 완성된 body/snapshot의 스레드는 불변이며 current reviews만 처리 가능하다. set-grants는 본문이 아닌 현재 접근 정책이므로 PM/슈퍼가 completed에서도 변경할 수 있지만 snapshot의 저장내용은 바뀌지 않는다.

### I03. 완성·회차·Undo 계약과 파일 봉인

- Related Files:
  - `lib/workspace/production/domain.ts` :: complete/start-round/undo 분기 — new
  - `lib/workspace/files/domain.ts` :: advanceFileRound — modify
  - `lib/workspace/files/schemas.ts` :: 기존 FileProjectStateSchema — read-only 유지

#### Details
- **Signatures & Types**:
```typescript
function advanceFileRound(source:FileProjectState,context:FileCommandContext):FileProjectState;
```
- advanceFileRound는 기존 start-round의 순수 데이터 변환을 추출한다. project/revision/schema를 검증하지만 프로젝트 rework 위임 판단은 호출자인 applyWorkspaceMutation이 담당한다. 이 함수만 외부 API로 노출하지 않는다.
- FileProjectState는 schemaVersion=1, 현재 sealedAt=null 유지. complete는 제작 completed guard로 파일 변경을 막으며 파일 목록/현재 회차를 봉인 상태로 바꾸지 않는다. start-round에서만 기존 회차 sealedAt 설정과 +1을 수행한다.
- complete는 acknowledged=true, 파일 revision 일치 후 counts를 저장한 complete snapshot 생성. 미완료 존재 자체로 차단하지 않는다. 재작업은 rework 권한과 양쪽 revision 확인, writing이면 unfinished 보관, completed이면 중복 snapshot 없이 새 회차 생성.
- 새 회차 완료 섹션 고정, 현재 작업 snapshot과 source 파일 refs 보존, 미해결 의견/review는 새 thread/message ID로 복사하되 원 작성자·원 작성 시간 보존, carriedFromId 저장.
- Undo 15초/최근1건은 삭제·내용 편집·AI 적용에만. 저장 이후 다른 변경, 다른 사용자, 권한/고정 변경, 회차 변경이면 CONFLICT/UNDO_EXPIRED. 권한 체크값이나 snapshot을 되돌리는 수단으로 사용하지 않는다.


## Acceptance Criteria
- [x] 명시된 타입/명령/schema/권한 함수가 존재하고 초기 상태 및 잘못된 참조를 구분한다.
- [x] PM/슈퍼·위임·담당·고정·완성본 권한이 모든 직접/일괄/undo 경로에서 일관된다.
- [x] 파일 및 제작 회차가 같은 순수 전이에서 변경되고 실패 시 둘 다 원본 유지된다.
- [x] 미완료 항목은 경고 정보이며 완성 시 자동 완료 처리하지 않는다.

## Validation
- `npm run typecheck` — 계약·기존 파일 도메인 모두 통과.
- `npx eslint types/workspace-production.ts config/workspace-production.ts lib/workspace/production lib/workspace/files/domain.ts` — 새 오류 없음.
- `git diff --check`.
- 다음 PowerShell 인라인 명령은 파일을 만들지 않는다. 기본 전이와 스키마 손상 방지를 실제 코드로 검사한다.
```powershell
@'
const assert = require('node:assert/strict');
const { createEmptyFileProject } = require('./lib/workspace/files/domain.ts');
const { createWorkspaceState, applyWorkspaceMutation } = require('./lib/workspace/production/domain.ts');
const { WorkspaceStateSchema } = require('./lib/workspace/production/schemas.ts');
let seq=0;
const project={id:'p1',number:'P1',name:'검증',departmentId:null,pmId:'pm',pmName:'PM',memberIds:['pm','member']};
const context={identity:{namespace:'verify',actor:{id:'pm',name:'PM',role:'user',isMock:true}},project,members:[{id:'pm',adminUserId:'u-self',name:'PM',departmentId:null,departmentName:'',email:null},{id:'member',adminUserId:'u2',name:'참여자',departmentId:null,departmentName:'',email:null}],now:'2026-11-03T00:00:00.000Z',newId:()=> 'id'+(++seq)};
let files=createEmptyFileProject(context), state=createWorkspaceState(context,files);
const run=(operation,ctx=context)=>{const r=applyWorkspaceMutation(state,{projectId:'p1',expectedRevision:state.revision,expectedRound:state.currentRound,operation},ctx,files);state=r.receipt.state;files=r.files;return r.receipt;};
const chapter=run({type:'add-chapter',title:'개요',afterId:null}).createdIds[0];
const section=run({type:'add-section',chapterId:chapter,title:'배경',afterId:null}).createdIds[0];
assert.equal(state.body.sections[0].assigneeIds[0],'pm');
const other={...context,identity:{namespace:'verify',actor:{id:'member',name:'참여자',role:'user',isMock:true}}};
assert.throws(()=>run({type:'rename-section',id:section,title:'변경'},other),e=>e.code==='FORBIDDEN');
run({type:'set-section-state',id:section,state:'done'});
run({type:'complete',expectedFileRevision:files.revision,acknowledged:true});
const frozen=JSON.stringify(state.snapshots[0]);
run({type:'start-round',expectedFileRevision:files.revision,acknowledged:true});
assert.equal(state.currentRound,files.currentRound); assert.equal(state.currentRound,2);
assert.equal(state.body.sections[0].locked,true);
assert.throws(()=>run({type:'remove-section',id:section}),e=>e.code==='LOCKED');
run({type:'unlock-section',id:section}); assert.equal(state.body.sections[0].state,'writing');
assert.equal(JSON.stringify(state.snapshots[0]),frozen);
assert.equal(WorkspaceStateSchema.safeParse({...state,body:{...state.body,sections:[{...state.body.sections[0],chapterId:'missing'}]}}).success,false);
console.log('도메인 기본 전이 검증 통과');
'@ | node --import tsx
```
- 추가 같은 실행 방식으로 다중 대상 권한 거부(전체 불변), PM/슈퍼 체크값 무시, 일반 부서 관리자, 잘못된 멘션, 타인 답글, 삭제 연결 정리, Undo 만료/충돌, 과거 snapshot 불변을 확인하여 실행 결과를 Progress에 기록한다. 단순 상수 복제 테스트 금지.

## Commit Message
```text
feat(workspace): 목차 제작 도메인과 프로젝트 권한 정의

Plan: 2026-11-03-workspace-toc-production
Phase: P01-project-foundation
Task: T01-project-domain

- 목차·제작 도메인 계약과 권한 전이
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)
- 2026-11-03: typecheck·범위 ESLint·diff 검사 통과. 기본 도메인 시나리오와 추가 경계 25건 통과.
- 청사진 예시의 pm/member·verify ID는 실제 FileIdentitySchema의 entra/namespace 규칙에 맞춰 검증했다. 인증 검증 자체는 유지했다.
- 기존 부채 발견: 특이사항 없음. prepared 자산/제안의 간접 고정 우회도 도메인에서 차단한다.
