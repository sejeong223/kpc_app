# Task: T03-production-service AI 제안·PPT 작업 서비스와 버전 보관

## Status: done

## Goal
mock 제안·원본 보관·PPT 출력·복사/붙여넣기를 현재 권한과 revision을 다시 검사하는 하나의 업무 경계로 연결한다.

## Decision Summary
- 선행 P01/P02-T01/T02 완료. AI만 mock이며 로컬 저장·실제 바이트 처리·비교/적용은 실제 동작한다.
- UI가 만든 요약 상태를 그대로 저장하지 않고 서비스가 검증된 원본/제안으로 prepared mutation을 만든다. 서버 연결 시 동일 정책을 서버에서 강제한다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 서비스 계약과 제안의 수명
- Related Files:
  - `services/workspace/WorkspaceProductionService.ts` :: 아래 class — new
  - `lib/workspace/production/mock-proposals.ts` :: 결정적 mock 초안·목차·점검 생성 — new
  - `lib/workspace/production/schemas.ts`, `types/workspace-production.ts` :: 요청/제안 타입 — modify
  - `lib/workspace/production/domain.ts` :: prepared apply/content 검증 — modify
  - `services/workspace/IndexedDbWorkspaceRepository.ts`, `WorkspaceAssetService.ts` — reuse
#### Details
**Signatures & Types**
```typescript
interface ProjectRequest {projectId:string;expectedRevision:number;expectedRound:number}
interface MockRequest extends ProjectRequest {kind:"recommend-toc"|"edit-toc"|"draft"|"polish"|"check";sectionIds:string[];slideIds:string[];instruction:string}
interface ProposalItem {id:string;sectionId:string|null;slideId:string|null;title:string;before:string;after:string;warnings:string[]}
interface WorkspaceProposal {id:string;projectId:string;round:number;baseRevision:number;kind:MockRequest["kind"];items:ProposalItem[];mock:true;createdAt:string}
interface ExportRequest extends ProjectRequest {snapshotId:string|null}
interface ImportRequest extends ProjectRequest {file:File;baseVersionId:string|null;mapping:ImportMapping[]}
interface ImportedPpt {sessionId:string;versionId:string;comparison:PptComparison;baseRevision:number}
interface WorkspaceProgress {jobId:string;stage:"reading"|"rendering"|"assembling"|"comparing"|"saving";completed:number;total:number;message:string}
interface WorkspaceProductionOptions {identity:FileIdentity;catalog:WorkspaceProjectDirectory;repository:WorkspaceRepository;assets:WorkspaceAssetService;now?:()=>string;newId?:()=>string}
class WorkspaceProductionService {
 constructor(options:WorkspaceProductionOptions);
 load(projectId:string):Promise<WorkspaceBundle>;
 execute(input:WorkspaceMutation):Promise<WorkspaceReceipt>;
 previewSlide(input:{projectId:string;slideId:string;snapshotId:string|null;content?:SlideContent;template?:SlideTemplateRef},signal?:AbortSignal):Promise<{preview:TemplatePreviewData;warnings:string[]}>;
 propose(input:MockRequest,signal?:AbortSignal):Promise<WorkspaceProposal>;
 applyProposal(input:ProjectRequest & {proposalId:string;itemIds:string[]}):Promise<WorkspaceReceipt>;
 discardProposal(proposalId:string):void;
 exportPpt(input:ExportRequest,onProgress?:(value:WorkspaceProgress)=>void,signal?:AbortSignal):Promise<PptVersion>;
 importPpt(input:ImportRequest,onProgress?:(value:WorkspaceProgress)=>void,signal?:AbortSignal):Promise<ImportedPpt>;
 remapImport(input:ProjectRequest & {sessionId:string;mapping:ImportMapping[]}):Promise<ImportedPpt>;
 applyImport(input:ProjectRequest & {sessionId:string;changeIds:string[]}):Promise<WorkspaceReceipt>;
 downloadPpt(projectId:string,versionId:string,signal?:AbortSignal):Promise<{blob:Blob;filename:string}>;
 copySlides(projectId:string,slideIds:string[]):Promise<{token:string;count:number}>;
 pasteSlides(input:ProjectRequest & {token:string;sectionId:string;afterId:string|null}):Promise<WorkspaceReceipt>;
 insertImage(input:ProjectRequest & {slideId:string;file:File;afterBlockId:string|null}):Promise<WorkspaceReceipt>;
 close():void;
}
interface PreparedContentChange {type:"replace-content";sectionIds:string[];slides:ProposalSlide[];pins:AssetPin[]}
```
- ProjectWorkspaceState는 revision/inputRevision/currentRound/phase, body(chapters/sections/slides/requirements/checklist/settings/threads), grants/pins/snapshots/pptVersions/reviews/undo다. WorkspaceRepository는 load/execute/commitPrepared/readBlob/선택저장/close이며 commitPrepared(input,blobs,assertAccess)가 atomic revision 검사와 동기 권한 확인을 수행한다.
- PreparedProposalChange에 `requirements:Requirement[]|null,checklist:ChecklistItem[]|null`를 명시적으로 추가한다. 기본 null은 변경 없음이다. PreparedContentChange는 내부 prepared union에만 추가하고 public WorkspaceMutationSchema에는 노출하지 않는다. pins는 서비스가 검증해 복사하는 자산 사본이며 사용자 입력이 아니다.
- Proposal 내부 Map에는 완전한 typed candidate, actor identity, baseRevision/round, 권한 대상, 생성 시간, itemId→change 대응을 보관한다. 공개 WorkspaceProposal은 미리보기만 제공한다. 최대20개·10분 TTL, discard/close/사용자 전환 시 제거한다. XML/rawBlob/full 원본은 JSON Query 캐시에 넣지 않는다.
- propose는 입력 제한 instruction1..4000, 대상 unique/existing 여부를 Zod로 검증하고 원본 상태와 최신 프로젝트 접근/권한을 확인한다. toc종류는 outline, 내용종류는 전체 대상 canEditSection을 요구한다. check는 점검 제안 조회를 허용하되 반영 시 변경 종류의 권한을 다시 검사한다.
- mock은 project metadata·사용자가 입력한 내용과 명시적인 예시 규칙만 사용한다. 업로드 파일 원문 추출/RAG 성공·실제 Token usage/audit를 기록하지 않는다. 요구사항과 출처 provenance=mock, page/excerpt를 실제 업로드 근거로 만들지 않는다.
- 기존 목차 편집 제안은 stable ID·담당/리뷰/슬라이드 연결을 유지한다. 신규 section은 PM 기본 담당. 구조 삭제는 영향/미처리 의견과 locked 여부를 포함한다. 한 대목차와 소목차 묶음의 의존 변경은 하나의 ProposalItem으로 묶어 부분 선택으로 고아 section을 만들지 않는다.
- applyProposal은 proposalId/itemIds만 받으며 본문을 클라이언트에서 받지 않는다. 최신 revision/round/권한/잠금 확인 후 선택 candidate로 prepared command를 만든다. 수정/삭제/일괄 내용 변경 대상 전체가 허용되어야 한다. 입력이 바뀌었으면 CONFLICT, 오래된 제안은 폐기하고 재생성을 안내한다.
- 검토 유지=discard로 원문 보존, 재생성=이전 제안 폐기 후 새 propose. 저장 성공 후만 제안/undo 상태를 갱신한다. 네트워크 호출·AI SDK 추가는 없다.
- execute는 public WorkspaceMutationSchema부터 검증한다. add-slide/bind-slide/duplicate-slide 등 자산을 새로 사용하는 경로는 현재 pin 권한도 확인하고 commitPrepared의 assertAccess에서 재확인한다. 기존 본문을 조회하거나 수동 수정하는 것은 D21의 자산 미확인만으로 내용을 삭제/차단하지 않으며, 자산 렌더·생성·다운로드에는 해당 제한을 적용한다.
- previewSlide는 프로젝트/snapshot 접근과 사용 pin 권한을 확인하고 저장된 slide를 렌더한다. 임시 content/template를 받는 경우 현재 작성 중 해당 section 편집 권한과 스키마를 검사한다. 원본 렌더 바이트는 서비스 안에만 두고 반환에는 TemplatePreviewData/warnings만 넣는다. 과거 snapshot에는 임시 수정 입력을 거절한다.

### I02. 출력·외부 원본 등록·내용 적용 분리
- Related Files:
  - `services/workspace/WorkspaceProductionService.ts` :: exportPpt/importPpt/remapImport/applyImport/downloadPpt — new
  - `lib/pptx/production/content.ts`, `deck.ts`, `import.ts`, `package-graph.ts` — reuse
  - `lib/pptx/download.ts` — UI 연결 시 reuse
#### Details
1. exportPpt는 load로 프로젝트 접근을 확인하고 snapshotId=null이면 현재 body, 아니면 해당 프로젝트의 immutable snapshot.body를 택한다. 전체 사용 Template·Skill·Prompt pin을 수집하고 assets.assertPins를 수행한다. 기존 슬라이드는 slide.usedSettings를 사용하며 현재 기본 설정으로 고정본을 재작성하지 않는다.
2. readBlob로 필요한 template/image bytes를 읽고 각 slide를 renderProposalSlide→assembleProjectDeck한다. await 전후 signal/closed/identity를 검사하며 진행률은 단조 증가 값으로 호출한다. 원본 누락은 ORIGINAL_MISSING, 자산 원본/권한 미확인은 ASSET_UNAVAILABLE로 처리하고 사본을 지우지 않는다.
3. 파일명은 안전한 프로젝트명+회차+버전 .pptx다. PptVersion은 id/index/round/snapshotId(kind별null가능)/kind=generated/pinIds/blobId/filename/byteLength/sha256/createdAt/createdBy/inputRevision/baseVersionId=null/manifest를 저장한다. workspaceBlobs kind=ppt와 prepared register-ppt를 한 트랜잭션에 커밋한다. commit 직전 현재 자산 권한을 재확인한다.
4. 역사 snapshot 출력도 새 버전 행만 추가한다. 기존 snapshot.pptVersionId/body를 뒤늦게 덮어쓰지 않으며 버전 목록에서 snapshotId로 연결한다. 생성 후 다운로드는 register 성공에만 이어간다. 실패하면 이전 성공 버전은 그대로다.
5. importPpt는 .pptx·250MiB 이내·실제 ZIP 안전성 검증 후 비교한다. baseVersionId는 동일 프로젝트에서 직접 저장한 generated 버전만, 없으면 자동 매핑 없는 비교를 만든다. 외부 원본 bytes는 고치지 않는다.
6. 원본을 uploaded 버전+Blob으로 먼저 atomic 등록한다. 업로드 권한은 프로젝트 참여 + 연결된 변경 대상 중 편집 가능한 section 존재이며 전체 읽기 전용/완성/과거 이력에는 등록하지 않는다. 아직 정확히 매핑되지 않은 임의 PPT도 보관 가능하지만 지원 내용 적용은 별도 권한 검사를 통과해야 한다.
7. ImportedPpt.baseRevision은 **원본 등록 후** 반환된 revision이다. Map의 session에 저장된 versionId/대상/원본sha/baseRevision을 보관한다. remapImport는 동일 저장 원본으로 다시 비교하며 버전을 중복 등록하지 않는다. applyImport는 changeIds만 받아 세션의 after를 다시 스키마 검증하고 최신 상태/권한/고정 확인 후 content 변경을 원자 저장한다.
8. 사용자가 적용을 취소하거나 CONFLICT가 나도 등록한 원본은 보존한다. UI 문구는 원본 등록과 내용 적용 결과를 구분한다. 새로운 비교는 저장 원본으로 다시 시작할 수 있도록 remapImport에 유효 session 재발급 경로를 둔다(복원용 sessionId는 `version:<PptVersion.id>` 입력을 허용하되 서비스가 해당 version을 직접 읽어 검증하고 임시 UUID session으로 반환).
9. downloadPpt는 project 접근과 해당 version.pinIds 최신 권한을 재확인한다. uploaded 버전도 기준/매핑에 사용한 핀의 합집합을 기록하고 동일 검사한다. 순수 외부파일로 핀이 없으면 프로젝트 접근을 확인한다. raw blobId를 UI로 받아 범위 검사를 건너뛰지 않는다.
10. Quota/abort/IDB 실패에서 Blob/메타데이터가 부분 저장되지 않는다. 새로고침 후 직접 등록 자산을 확인할 수 없으면 D21 안내/재선택; 무조건 허용하거나 기존 사본을 삭제하지 않는다.

### I03. 클립보드·이미지와 서비스 종료
- Related Files:
  - `services/workspace/WorkspaceProductionService.ts` :: copySlides/pasteSlides/insertImage/close — new
  - `lib/workspace/production/clipboard.ts` :: 검증·사본 참조 규칙 — new
#### Details
- copySlides는 원본 접근 가능한 현재 body의 slide ID만 받아 내부 Map에 토큰과 불변 사본/원본revision/핀·이미지 참조를 저장한다. 시스템 클립보드로 원본·권한 token을 보내지 않는다. 최대200개/10분, close시 초기화한다.
- pasteSlides는 원본 프로젝트 접근·원본 최신 자산 권한·대상 section편집/고정/expectedRevision을 재검증한다. slide/block IDs를 새로 부여하고 원본핀과 이미지 Blob을 대상 프로젝트 namespace에 복사한다. pins/settings를 허위로 받지 않는다. sourceRefs는 대상 프로젝트에서 확인 가능한 실제 자료만 유지하고 나머지는 제외 목록을 UI 결과 안내에 포함한다(Receipt에 선택적 `notices?:string[]` 필드 추가). 의견/작성상태/담당자/권한은 복사하지 않는다.
- 서로 다른 프로젝트로 붙여넣을 때 대상에 동일 assetId/revision/hash의 기존 pin이 있으면 그 pinId를 재사용한다. 없으면 새 pinId와 이미지 blobId를 만들어 모든 참조를 바꾸고, 신규 자산 선택과 동일하게 active/undeleted 및 공개 범위를 검사한다. 비활성/삭제된 원본을 '기존 사용 유지' 규칙으로 새 프로젝트에 무단 도입하지 않는다. source requirementId를 다른 프로젝트의 우연히 같은 ID와 연결하지 않는다.
- 새 block ID를 부여할 때 template.bindings.key의 block 참조도 함께 바꾼다. title/lead 예약 key는 유지하고 template.pinId/usedSettings pin과 image.blobId는 대상 프로젝트의 새 참조로 치환한다. 준비 결과 스키마 검증으로 고아 매핑을 막는다.
- insertImage는 파일 signature/크기/치수 검증 후 새 image block을 기존 slide.content에 넣고 이미지 Blob과 prepared replace-content를 같은 commit에 저장한다. 바인딩 전에는 편집은 가능하나 출력은 image slot 연결 필요 상태다.
- PreparedContentChange는 기존 전체 slides 배열로 원문을 덮는 방식이어도 변경 diff를 계산하여 대상 sectionIds와 실제 변경이 정확히 맞는지 검증한다. pins 추가가 프로젝트 기본 settings나 타인/고정 섹션을 바꾸지 않는다.
- close는 작업 신호 중단/메모리 proposals/import/clipboard 폐기 후 자신의 repository lease만 해제한다. 공유 DB 실제 close는 Runtime 소유자(P03-T01)가 한다. 알림·audit 외부전송 없음.

## Acceptance Criteria
- [x] 제안 검토/선택 적용/유지/재생성과 실제 저장이 분리된다.
- [x] PPT 원본 등록과 내용 적용을 따로 보고하고 취소해도 원본이 남는다.
- [x] 비동기 완료 직전 권한/회차/revision을 다시 검사한다.
- [x] 타 프로젝트 복사와 이미지 붙여넣기가 원본 조회·대상 편집 권한을 우회하지 않는다.
- [x] 과거 snapshot은 출력/의견/새 버전 등록에도 불변이다.

## Validation
- `npm run typecheck`
- `npx eslint services/workspace/WorkspaceProductionService.ts lib/workspace/production types/workspace-production.ts`
- `@' ... '@ | node --import tsx`: node:assert/strict와 fake-indexeddb IDBFactory를 사용해 P01 repository를 주입한다. PM/member/read-only/다른namespace를 각각 만들고 동일 저장소에서 읽기/쓰기 결과를 비교한다.
- propose→직접본문수정→applyProposal은 CONFLICT; 고정section 일괄적용은 LOCKED이며 부분 변경0; 성공 apply는 undo.previousBody 보존; mock 결과 provenance/실제 토큰 미기록을 assert한다.
- 실제 demoTemplate를 관리자 host를 통해 등록/핀 적용하고 export→Blob readback/sha256/manifest/order 검증; 완료 snapshot 출력 전후 snapshot deepEqual; 재접속 후 PptVersion/bytes 복원. 원본 권한 회수/host 목록 초기화 후 download는 각각 FORBIDDEN/ASSET_UNAVAILABLE를 assert한다.
- export 도중 다른 repo 수정 및 권한회수 callback, import 적용 전 회차 전환/identity close, abort/Quota 예외를 주입해 새 버전/Blob 부분 저장이 없는지 확인한다.
- import→등록 성공→사용자 적용 취소 시 version/원본sha 유지. 선택 change만 적용, 잘못된 session/project/changeId 거절. 등록 후 revision을 기준으로 즉시 적용이 성공하며 등록 전 revision 재사용은 실패해야 한다.
- cross-project clipboard는 source 접근회수 후 paste 거절; 권한 있는 대상에는 새ID/Blob/pin 사본 생성, 의견/권한/외부자료 참조 미이관을 assert한다.
- `git diff --check`

## Commit Message
```text
feat(workspace): 제작 제안과 PPT 버전 업무 서비스 연결

Plan: 2026-11-03-workspace-toc-production
Phase: P02-pptx-production
Task: T03-production-service

- AI 제안·PPT 작업 서비스와 버전 보관
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 실행 결과
- typecheck·범위 ESLint·diff 검사 통과. 인라인 51건: 제안 이후 변경/만료/권한/잠금 거부, 선택 적용·undo, 실제 PPT 바이트·hash·manifest, 완료 snapshot 불변, 수정본 등록 후 revision 및 선택 적용/취소 보존, 저장 원본 재비교, 다른 프로젝트 session/가짜 change 거부, 출력 중 동시 수정·권한 회수·취소·Quota 원자성, 이미지 저장, 프로젝트 간 pin·이미지·ID 사본 및 출처 제외, 원본 프로젝트 접근회수·비활성 신규도입 거부, D21 미확인 거부, 재접속 복원.
- 수동 재매핑으로 나중에 연결된 자산도 보호하도록 내부 전용 protect-ppt 명령을 추가했다. uploaded 버전의 pinIds에만 단조 추가하며 원본 Blob·완료 snapshot·내용은 바꾸지 않는다. public mutation에는 노출하지 않는다.
- 이미지 크기는 파일 읽기 전에 제한하고 실제 signature/치수를 재검증한다. UI에 반환하는 제안/비교에는 원본 ZIP/Blob을 포함하지 않는다.
- 실제 AI·Token 과금·서버·브라우저/PowerPoint 시각 검증 없음.
