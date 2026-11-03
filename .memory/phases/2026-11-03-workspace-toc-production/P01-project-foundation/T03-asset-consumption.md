# Task: T03-asset-consumption 제작용 자산 사용 권한과 적용 사본

## Status: done

## Goal
일반 프로젝트 참여자가 공개된 자산을 권한 범위에서 사용하고, 선택 당시의 원본·설정을 프로젝트에 보관한다.

## Decision Summary
- 선행 P01-T01/T02의 ProjectWorkspaceState/WorkspaceRepository 사용. 관리자 CRUD와 제작용 소비 권한은 분리한다.
- 사용자 추가 결정 D21: 관리자 목록 영속화 제외, source/권한 미확인 시 재선택 안내.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 관리자 CRUD와 분리된 제작용 카탈로그 계약
- Related Files:
  - `types/workspace-production.ts` :: 아래 계약 — modify
  - `types/admin.ts` :: AdminDataService에 WorkspaceAssetHost 계약 합성 — modify
  - `services/admin/MockAdminDataService.ts` :: listWorkspaceAssets/resolveWorkspaceAsset/checkWorkspaceAsset — modify
  - `lib/workspace/production/asset-policy.ts` :: canConsumeAsset/canConsumePrompt — new
  - `services/admin/TemplateFileStore.ts` :: getSource — read-only 기존 사용
  - `config/admin-permissions.ts`, `lib/admin/assets/permissions.ts`, `lib/admin/prompts/selectors.ts` :: 관리자 CRUD 검사 — read-only 유지
#### Details
- **Signatures & Types**:
```typescript
type WorkspaceAssetKind="prompt"|"skill"|"template";
type WorkspaceAssetAccess={status:"available";catalogRevision:number}|{status:"forbidden"|"unavailable";reason:string};
interface WorkspaceAssetChoice { kind:WorkspaceAssetKind; id:string; name:string; revisionId:string; revision:number; ownerDepartmentId:string|null; active:boolean; hasOriginal:boolean }
interface WorkspaceAssetSource { choice:WorkspaceAssetChoice; snapshot:PromptRevision|SkillAssetRevision|TemplateAssetRevision; bytes:Uint8Array|null }
interface WorkspaceAssetHost {
 listWorkspaceAssets(actor:AdminActor,kind:WorkspaceAssetKind):Promise<WorkspaceAssetChoice[]>;
 resolveWorkspaceAsset(actor:AdminActor,kind:WorkspaceAssetKind,id:string,revisionId:string|null,mode:"new"|"existing"):Promise<WorkspaceAssetSource>;
 checkWorkspaceAsset(actor:AdminActor,pin:AssetPin):WorkspaceAssetAccess;
 subscribe(listener:()=>void):()=>void; getRevision():number;
}
interface AssetSelection { kind:WorkspaceAssetKind; assetId:string; revisionId:string }
interface WorkspaceAssetServiceOptions { host:WorkspaceAssetHost; getActor():AdminActor; identity:FileIdentity; repository:WorkspaceRepository; catalog:WorkspaceProjectDirectory }
class WorkspaceAssetService {
 constructor(options:WorkspaceAssetServiceOptions);
 list(projectId:string,kind:WorkspaceAssetKind):Promise<WorkspaceAssetChoice[]>;
 apply(input:{projectId:string;expectedRevision:number;expectedRound:number;selections:AssetSelection[];replaceSlideIds:string[]}):Promise<WorkspaceReceipt>;
 checkPins(projectId:string,pins:readonly AssetPin[]):WorkspaceAssetAccess[];
 assertPins(projectId:string,pins:readonly AssetPin[]):void;
 preview(projectId:string,pinId:string,signal?:AbortSignal):Promise<TemplatePreviewData>;
 close():void;
}

```
- 기존 AdminActor는 userId/name/email/role/departmentId, 프로젝트 FileIdentity는 namespace/actor{id,name,role,isMock}. AdminRuntime의 u-self는 현재 로그인 scope의 표시용 ID이며 영속 namespace로 사용하지 않는다.
- **Execution Flow / Logic**:
  1. host 내부 this.actor(input)로 현재 mock 사용자 활성 상태를 확인한다. 기존 private this.access(input,resource)와 관리자 CRUD read를 소비 경로에 호출하지 않는다.
  2. 신규 사용은 활성/미삭제 + 슈퍼 관리자 또는 소유 부서 관리자 또는 visibility.all/department/user/group 공개 대상 일치. 일반 사용자는 공개된 항목만 사용한다. 관리자 메뉴 접근·등록/수정/삭제 권한은 그대로다.
  3. 기존 Pin 사용은 활성/삭제 상태와 무관하게 현재 공개 범위를 확인한다. 삭제 tombstone에도 권한 판단 정보가 남아 있어야 한다. 명시적 차단은 forbidden, 카탈로그 원본 또는 권한을 확인할 수 없음은 unavailable.
  4. Pin의 snapshot/과거 공개 범위를 현재 허용 근거로 사용하지 않는다. D21에 따라 새로고침 뒤 직접 등록했던 카탈로그 기록이 사라지면 unavailable로 반환하고 재선택 안내한다. 관리자 카탈로그 영속화를 추가하지 않는다.
  5. list는 원본 바이트를 반환하지 않는다. resolve는 접근 검증 후 해당 revision 내용을 복사한다. template bytes는 files.getSource(revision.definition.fileRefId).document.bytes.slice()로 읽으며 임의 fileRefId를 외부 입력으로 받지 않는다.
  6. getWorkspaceAsset는 실제 활성 Template이 없으면 빈 배열. config/admin-assets-seed는 Skill만 생성한다. 빈 상태를 가짜 Template이나 가짜 다운로드로 대체하지 않는다.

### I02. 프로젝트 적용 사본·프롬프트 연결·복원
- Related Files:
  - `services/workspace/WorkspaceAssetService.ts` :: apply/preview/checkPins — new
  - `lib/workspace/production/prompt-resolution.ts` :: resolveProjectPrompt/suggestPromptBindings — new
  - `lib/workspace/production/domain.ts` :: pin-assets 분기 — modify
  - `lib/admin/prompts/outline.ts`, `lib/pptx/skill-adapter.ts` :: 상속/Skill adapter 참고 — read-only
#### Details
- **Signatures & Types**:
```typescript
interface ProjectPromptResult { prompt:string; sources:PromptSource[]; inherited:boolean; itemId:string|null; parentId:string|null }
function resolveProjectPrompt(items:readonly PromptItem[],itemId:string|null,overrides:readonly ProjectPromptOverride[]):ProjectPromptResult;
function suggestPromptBindings(sections:readonly Section[],items:readonly PromptItem[]):Array<{sectionId:string;itemId:string|null;reason:"exact"|"suggested"|"unmatched"}>;
```
- 선행 저장 계약: WorkspaceRepository.load(projectId)→{state,files}; commitPrepared({projectId,expectedRevision,expectedRound,operation},blobs,assertAccess)→WorkspaceReceipt. AssetPin은 kind별 snapshot과 ref, Template만 blobId/sha256 추가. state.pins immutable, body.settings에는 선택 pin ID와 section-item mapping, overrides.
- **Execution Flow / Logic**:
  1. apply 시 프로젝트 setup 권한, phase=writing, 선택 revision 일치, 지원 Template 여부를 확인한다. 비동기 source 조회/파싱/해시는 transaction 밖에서 한다.
  2. pin ID를 새로 발급하고 snapshot deep clone. Template bytes를 workspaceBlobs(kind=template)로 준비하며 SHA-256과 filename/size를 저장한다. 원본의 관리자 fileRefId는 출처 정보일 뿐 복원에 의존하지 않는다.
  3. commitPrepared의 동기 assertAccess에서 현재 host revision과 소비 권한을 재확인한다. 실패하면 새 Pin/Blob/설정 모두 저장하지 않는다.
  4. 프로젝트 기본 선택은 새 슬라이드의 기준이다. 기존 슬라이드를 바꾸려면 replaceSlideIds를 명시하고 영향 미리보기/매핑을 확인한다. 잠긴/타 담당 섹션을 포함하면 전체 거부한다. 적용 사본의 원본 내용을 수정하지 않는다.
  5. 최신 버전 재적용도 동일 apply 경로이며 기존 pin과 output을 이력용으로 남긴다. 다른 Template 파일로 변경될 때 오래된 objectId 매핑을 재사용하지 않는다. sourceSHA/sourceSlidePath가 같은 경우에만 유효한 매핑을 유지한다.
  6. 프롬프트 세트 선택은 목차/본문을 덮어쓰지 않는다. exact title도 binding 제안으로 제공해 사용자가 확인; 모호한 일치는 null. 안정적인 itemId로 연결하고 프로젝트 override가 비면 상위 대목차의 override/세트 값, 없으면 빈 prompt/빈 sources.
  7. 프롬프트/Skill pin 변경은 미완료 섹션의 후속 생성 기본값으로 적용한다. 고정 슬라이드의 기존 사용 pin/source metadata는 유지한다. content-engine에서 사용한 Skill pin도 작업 manifest/버전이 참조하게 한다.
  8. preview는 pinned bytes에서 readTemplate를 호출하되 사용 권한 확인 전 반환하지 않는다. missing pin/source/bytes와 revoked를 구분하고 프로젝트 작성 내용을 삭제하지 않는다.
- **Data & Schema Fields**: asset 선택 메타데이터와 snapshot revision 전체는 이미 있는 PromptRevision/SkillAssetRevision/TemplateAssetRevision을 사용한다. 별도 관리자 모델이나 서버 카탈로그를 복제하지 않는다.


## Acceptance Criteria
- [x] 일반 사용자의 공개 자산 사용과 관리자 메뉴/CRUD 거부가 동시에 유지된다.
- [x] Pin/원본 Blob/설정이 함께 저장되고 최신 변경·비활성/삭제·권한 회수·미확인이 구분된다.
- [x] 새로고침 후 source가 사라져도 프로젝트 작성 내용이 삭제되지 않는다.
- [x] 프롬프트 상속·명시적 매핑·최신 재적용이 원본과 고정 이력을 변경하지 않는다.

## Validation
- `npm run typecheck`; `npx eslint services/admin/MockAdminDataService.ts services/workspace/WorkspaceAssetService.ts lib/workspace/production types/admin.ts types/workspace-production.ts`; `git diff --check`.
- 인라인 검증 명령:
```powershell
@'
const assert=require('node:assert/strict');
const {createAdminSeed}=require('./config/admin-seed.ts');
const {MockAdminDataService}=require('./services/admin/MockAdminDataService.ts');
const {TemplateFileStore}=require('./services/admin/TemplateFileStore.ts');
(async()=>{
 const files=new TemplateFileStore(),seed=createAdminSeed({name:'검증',email:'self@example.invalid',role:'user',departmentId:'d-ai'});
 const service=new MockAdminDataService({files,seed});
 const actor={userId:'u-self',name:'검증',email:'self@example.invalid',role:'user',departmentId:'d-ai'};
 const choices=await service.listWorkspaceAssets(actor,'skill');
 assert.ok(choices.length>0);
 await assert.rejects(service.getAssets(actor,{kind:'skill',page:1,pageSize:10,search:'',visibility:'all',status:'all',sort:'updatedAt',direction:'desc'}));
 const source=await service.resolveWorkspaceAsset(actor,'skill',choices[0].id,choices[0].revisionId,'new');
 assert.equal(source.snapshot.kind,'skill'); files.dispose();
 console.log('일반 사용자 소비와 관리자 CRUD 분리 확인');
})().catch(e=>{console.error(e);process.exitCode=1});
'@ | node --import tsx
```
- 추가 fake-indexeddb 인라인 시나리오: 실제 Demo Template을 관리자 importTemplate/create-template으로 등록한 뒤 pin 적용→원본 hash 보존→새 runtime에서 원본 source 미존재시 unavailable(프로젝트 body/Pin 보존), visibility 회수 중 apply 취소, inactive/deleted existing 사용, 다른 사용자의 raw fileRefId 거부.
- 기존 create-template 실제 command schema는 `{type:"create-template",ownerDepartmentId:string|null,status:"active"|"inactive",visibility:{all:boolean,targets:AssetAudienceTarget[]},value:TemplateDraft}`다. TemplateDraft는 name/short/description/fileRefId/pageTypes/roles/excluded이며 유효한 importTemplate 결과의 id를 fileRefId로 사용한다. 테스트를 위해 관리자 CRUD 제한이나 source 검증을 제거하지 않는다.
- prompt item rename/reorder에도 binding 유지, 비어 있는 소목차의 상위 상속, 매핑 없는 항목 null, 원본 세트 불변을 확인한다.

## Commit Message
```text
feat(workspace): 제작용 자산 조회와 버전 사본 연결

Plan: 2026-11-03-workspace-toc-production
Phase: P01-project-foundation
Task: T03-asset-consumption

- 제작용 자산 사용 권한과 적용 사본
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 실행 결과
- typecheck, 범위 ESLint, diff 검사 통과.
- 실제 Demo Template import → 프로젝트 원본 저장·해시·미리보기, 일반 사용자 소비/관리자 CRUD 분리, 비활성/삭제 기존 사용, 권한 회수, 조회 도중 카탈로그 변경 롤백, 새 런타임 원본 미확인 시 작성 내용 보존, 프롬프트 상속/안정 ID 검증 23건 통과.
- 브라우저/PowerPoint 검증 및 서버 연동은 수행하지 않음.
