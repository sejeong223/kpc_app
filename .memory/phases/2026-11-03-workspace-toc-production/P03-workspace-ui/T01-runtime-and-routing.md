# Task: T01-runtime-and-routing 공통 프로젝트 Runtime·조회·경로 연결

## Status: done

## Goal
파일·목차·설정·제작 화면에 사용자별 공통 서비스와 검증된 프로젝트 이동 상태를 공급한다.

## Decision Summary
- 선행 P01/P02 완료. 기존 auth/session 갱신 수정은 유지하고 최초 세션 별도 복제 문제를 되살리지 않는다.
- URL과 저장된 선택은 편의 정보일 뿐 접근 권한의 근거가 아니다. 데이터 조회는 TanStack Query로 통일한다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 공유 수명·조회·선택 계약
- Related Files:
  - `components/workspace/WorkspaceProjectProvider.tsx` :: WorkspaceProjectProvider/useWorkspaceRuntime — new
  - `app/(authenticated)/workspace/layout.tsx` :: client provider 배치 — new
  - `components/workspace/files/FileRuntimeProvider.tsx` :: FileRuntimeBridge(value,children) — modify
  - `hooks/workspace/use-workspace-production.ts` :: 아래 Query/Mutation 훅 — new
  - `hooks/workspace/use-workspace-selection.ts` :: 공통 선택 — new
  - `lib/workspace/production/query-keys.ts`, `selectors.ts`, `routing.ts` — new
  - `hooks/workspace/use-workspace-files.ts` :: 양쪽 invalidation — modify
  - `components/providers`, `components/profile/ProfilePreviewProvider.tsx`, `components/admin/AdminRuntimeProvider.tsx`, `lib/workspace/files/identity.ts`, `lib/admin/runtime-lifetime.ts` — reuse
#### Details
**Signatures & Types**
```typescript
type WorkspaceQueryScope = readonly ["workspace-production",string,string,string,string];
interface WorkspaceRuntimeValue {
 identity:FileIdentity; catalog:WorkspaceProjectDirectory; service:WorkspaceProductionService;
 assets:WorkspaceAssetService; queryScope:WorkspaceQueryScope; fileRuntime:FileRuntimeValue;
 isActive():boolean; invalidateProject(projectId:string):Promise<void>; reconnect():void;
}
interface WorkspaceSelection {projectId:string|null;sectionId:string|null;slideId:string|null;snapshotId:string|null}
interface ProjectView {
 project:WorkspaceProject;members:WorkspaceMember[];state:ProjectWorkspaceState;fileRevision:number;
 capabilities:ReturnType<typeof getWorkspaceCapabilities>;
 assetAccess:{pinId:string;access:WorkspaceAssetAccess}[];
}
function selectProjectView(bundle:WorkspaceBundle,context:WorkspaceContext,access:ProjectView["assetAccess"]):ProjectView;
function workspaceQueryKeys(scope:WorkspaceQueryScope):{
 projects:readonly [...WorkspaceQueryScope,"projects"];selection:readonly [...WorkspaceQueryScope,"selection"];
 project:(id:string|null)=>readonly [...WorkspaceQueryScope,"project",string|null];
 assets:(id:string|null,kind:WorkspaceAssetKind)=>readonly [...WorkspaceQueryScope,"assets",string|null,WorkspaceAssetKind];
 mutation:readonly [...WorkspaceQueryScope,"mutation"];
};
function parseWorkspaceSelection(params:URLSearchParams):WorkspaceSelection;
function workspaceHref(screen:"files"|"toc"|"setup"|"write",selection:WorkspaceSelection):string;
function useWorkspaceRuntime():WorkspaceRuntimeValue;
function useProjectWorkspace(projectId:string|null):UseQueryResult<ProjectView,WorkspaceError>;
function useWorkspaceCommand():UseMutationResult<WorkspaceReceipt,WorkspaceError,WorkspaceMutation>;
function useWorkspaceSelection():{selection:WorkspaceSelection;projects:WorkspaceProject[];pending:boolean;error:Error|null;choose(selection:WorkspaceSelection):Promise<void>};
```
- FileRuntimeValue는 기존 identity/service/queryScope/isActive 계약이며 선택적으로 `onProjectChange?(id:string):Promise<void>` callback을 더해 기존 훅의 mutation 성공/충돌 때 공유 invalidation을 호출한다. standalone FileRuntimeProvider 사용도 컴파일 가능하게 유지한다.
- 서비스 생성: 실제 resolveFileIdentity 결과 + 현재 AdminRuntime actor adapter, WorkspaceProjectDirectory, 공유 WorkspaceDatabase, FileRepository/WorkspaceRepository, FileService/AssetService/ProductionService를 identity scope별 생성한다. 같은 QueryClient를 쓰고 별도 전역 QueryClient를 생성하지 않는다.
- workspace/layout은 기존 authenticated layout 아래에 둔다. identity가 없을 때 관리자 화면 children 자체를 막지 말고 null runtime으로 내보내며 대상 4화면의 gate가 forbidden을 표시한다. 관리자 서버 requiredRole/PreviewRoleBoundary 경로는 그대로 유지한다.
- createDisposalLease로 StrictMode cleanup/setup에 같은 runtime이 조기 폐기되지 않게 한다. identity key는 namespace/actor.id/role로 구성한다. 이전 scope close에서 jobs/clipboard/previewURLs/query/mutation을 정리하고 **최종 소유자만 공유 DB를 close**한다.
- query keys는 scope 안에 안정 사용자/role/instanceId를 담고 프로젝트/자산 kind를 추가한다. retry=false, staleTime=0, gcTime=5분, refetchOnWindowFocus=true; mutation retry=false/gcTime=0. AbortSignal과 isActive를 await 전후 검사한다.
- 서비스 경계에서 AdminDataError(INACTIVE_USER/FORBIDDEN 등), PptxError, WorkspaceFileError를 WorkspaceError로 좁혀 매핑한다. inactive/접근거부는 FORBIDDEN, 입력·파일구조 오류는 VALIDATION/MAPPING, abort는 CANCELLED로 처리하고 원 cause를 보존한다. 에러를 빈 데이터나 성공 응답으로 바꾸지 않는다.
- 서비스는 load가 반환한 body만 Query cache에 넣고 zip/원본 bytes/생성 중 Blob/job Map은 넣지 않는다. selectProjectView는 저장 상태를 수정하지 않고 capabilities와 assetAccess를 계산한다.
- mutation/파일 변경/자산 변경 성공과 CONFLICT에서 해당 프로젝트의 production/file keys를 함께 invalidate한다. AdminRuntime.subscribe/getRevision 변화는 asset list/access를 invalidate하여 회수된 권한의 액션을 즉시 숨긴다.
- 탭 간에는 BroadcastChannel `kpc-workspace-projects`에 namespace/projectId/revision/instanceId만 통지하고 메시지를 검증한다. 다른 namespace는 무시하고 동일 프로젝트만 invalidate한다. 본문/파일/자산/사용자 이메일을 보내지 않는다. BroadcastChannel 없는 환경은 focus refetch와 revision 충돌 검사로 보완한다.

### I02. 라우팅·파일 화면·미저장 보호
- Related Files:
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: 파일/toc/setup/write 분기 — modify
  - `components/workspace/WorkspaceScreen.tsx` :: 화면 진입/오류/빈 상태 gate — new
  - `components/workspace/files/FilesScreen.tsx`, `FilesWorkspace.tsx` :: 공유 provider/selection — modify
  - `hooks/workspace/use-workspace-draft-guard.ts` :: 공통 편집 보호 — new
  - `hooks/workspace/use-file-draft-guard.ts` :: 기존 호출 호환 adapter — modify
  - `components/workspace/ProjectSelector.tsx`, `components/layout/WorkspacePage.tsx`, `components/providers/DadamThemeScope.tsx`, `components/workspace/files/FileDiscardDialog.tsx` — reuse
#### Details
- 네 화면 URL은 `?project=<id>&section=<id>&slide=<id>&snapshot=<id>`를 optional 사용한다. parse는 scalar/길이/빈값을 검증하고 실제 관계(project에 속한 section, section에 속한 slide, 같은project snapshot)는 조회 결과로 확인한다. 잘못된/권한 없는 project URL을 조용히 다른 프로젝트로 바꾸지 않고 오류와 프로젝트 선택 경로를 제공한다.
- 명시 URL > 같은 runtime 선택 > preferences의 마지막 유효 선택 > 접근 가능 첫 프로젝트 순으로 최초 선택한다. 다른 탭 selection 변화로 현재 편집 프로젝트를 자동 바꾸지 않는다. 없는 section/slide는 프로젝트 내 첫 유효 항목으로 안내 후 정정하며 snapshot은 임의 현재로 대체하지 않는다.
- 선택 변경은 dirty guard 성공 뒤 repository.saveSelection과 router.replace/push를 수행한다. URL에는 이름/본문/권한/토큰을 넣지 않는다. 프로젝트 선택은 페이지마다 독립 localState로 복제하지 않는다. FilesWorkspace는 공통 selection props/hook으로 바꾸고 기존 파일 dialogs/category/preview 기능을 보존한다.
- 전체관리자 동적 screen 분기는 유지한다. P03-T01 시점 toc/setup/write는 공통 gate + 구조적 빈 상태만 렌더해 타입검사가 가능해야 한다. 이후 Task가 업무 컴포넌트로 채운다.
- 이때 `components/comments/CommentsProvider.tsx`의 /workspace/write 자동 controller.load를 함께 중단한다. 새 제작 route로 바뀐 뒤 이전 전역 의견 seed가 생성되지 않아야 한다. AppShell의 controller?.suspendUi context 호환은 유지하며 보관함 readExisting은 P03-T04에서 연결한다.
- 공통 draft guard는 기존 명시적 이동과 beforeunload/동일출처 링크 처리만 재사용한다. 저장 실패/충돌이면 draft 유지, 사용자 logout/권한 상실이면 민감 draft/URL/jobs를 폐기하고 접근을 차단한다. 일반 프로젝트/섹션 변경은 저장/버리기/계속 편집 선택을 제공한다. 브라우저 모든 history 이동을 완벽히 차단했다고 주장하지 않는다.
- AppShell의 현재 /write 전용 padding0 특례는 P03-T03에서 실제 편집 레이아웃과 함께 제거한다. 이 Task는 임시 여백을 다시 별도 정의하지 않는다. WorkspacePage 제목은 기존 hidden 규칙, 프로젝트선택+업무 actions 한 행, DadamThemeScope 메인 적용.
- 파일 다음회차 요청은 P01-T02 expectedWorkspaceRevision을 이미 포함한다. 동일 서비스 상태/회차를 읽고 공유 전환 UI는 P03-T05에서 교체한다.

## Acceptance Criteria
- [x] 네 화면을 이동해도 프로젝트/섹션 연결과 파일·제작 회차가 일치한다.
- [x] 세션/역할 변경 시 이전 Query/작업 결과가 새 사용자에게 유입되지 않는다.
- [x] 관리자 기존 role guard와 일반 사용자 파일 접근 동작이 유지된다.
- [x] 미저장 입력을 보호하고 오류/DB_BLOCKED 재연결 경로를 제공한다.

## Validation
- `npm run typecheck`
- `npx eslint components/workspace hooks/workspace lib/workspace/production 'app/(authenticated)/workspace'`
- routing/selector는 `@' ... '@ | node --import tsx`에서 URL encoding/없는project/다른section의 slide/중복query/권한없는 snapshot을 입력하여 오류 또는 명시적 복구 결과를 assert한다.
- QueryClient를 메모리 생성해 사용자A/B scope와 프로젝트1/2 key가 겹치지 않는지, mutation후 production/file 두 keys만 stale인지, dispose후 캐시 제거·구독 해제·clipboard/jobs 종료인지 검사한다.
- fake-indexeddb에 기존 preferences/projects/blobs만 있는 v1을 넣어 공유Provider 구성의 service factory를 직접 호출한다. 새 DB로 복사하지 않고 기존 파일과 마지막 프로젝트가 복원되는지 assert한다. 브라우저 마운트 검증은 하지 않는다.
- 정적 점검: requiredRole/PreviewRoleBoundary 유지, 직접 fetch 없음, raw bytes가 Query 결과에 없음, file identityKey와 provider key 일치.
- `git diff --check`

## Commit Message
```text
feat(workspace): 공통 프로젝트 Runtime과 화면 경로 연결

Plan: 2026-11-03-workspace-toc-production
Phase: P03-workspace-ui
Task: T01-runtime-and-routing

- 공통 프로젝트 Runtime·조회·경로 연결
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 검증 기록
- typecheck·범위 ESLint·diff 확인 통과. 공유 서비스 factory v1 원본/선택 이관, 라우팅/조회 관계, namespace/프로젝트 캐시 분리, StrictMode 수명 및 종료/구독 정리 32개 assertion 통과.
- 서버 관리자 경계 유지, 신규 직접 fetch 없음. 카탈로그 변경은 캐시 재조회 전에도 현재 이용 권한으로 화면을 제한한다.
