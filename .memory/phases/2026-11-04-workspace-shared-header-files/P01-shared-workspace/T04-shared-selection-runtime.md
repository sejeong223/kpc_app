# Task: T04 공통 공급자와 6개 메뉴 선택 동기화

## Status: done

## Goal
사이드바·상단바·파일·목차·제작이 하나의 runtime/선택 상태를 사용하게 한다. URL/저장 선택/메모리 복원의 우선순위를 유지하고 독립적인 선택 effect를 제거한다.

## Decision Summary
- 대상은 analysis/files/toc/setup/write/review 6개 화면이다. 관리자·등록 화면의 query params를 작업 선택으로 해석하지 않는다.
- 선행 T01~T03의 저장·조회 계약을 사용한다. 이 Task에서 기존 헤더 mock 표시 전환은 하지 않고 공통 기반을 준비한다.
- 프로젝트 전환은 공통 미저장 guard를 한 번만 통과한다. 내부 commit과 사용자 choose를 분리한다.

## Implementation

### I01. Provider 단일 배치와 selection Context
- Related Files:
  - app/(authenticated)/layout.tsx :: AuthenticatedLayout — modify
  - app/(authenticated)/workspace/layout.tsx :: WorkspaceLayout — modify
  - components/workspace/WorkspaceProjectProvider.tsx :: Runtime — reuse
  - components/workspace/WorkspaceSelectionProvider.tsx :: WorkspaceSelectionProvider — new
  - hooks/workspace/use-workspace-selection.ts :: useWorkspaceSelection — modify
  - services/workspace/createWorkspaceRuntime.ts :: selection, navigate, lease — read/필요한 상태 보완
#### Details
~~~typescript
interface WorkspaceSelectionValue {
  selection: WorkspaceSelection;
  projects: WorkspaceProject[];
  pending: boolean;
  error: Error | null;
  notice: string | null;
  choose(next: WorkspaceSelection): Promise<void>;
  commitSelection(next: WorkspaceSelection): Promise<void>;
}
function useWorkspaceSelection(): WorkspaceSelectionValue;
~~~
- WorkspaceSelection은 {projectId,sectionId,slideId,snapshotId:string|null}. null selection은 선택이 없거나 접근 오류 상태이며, 잘못된 명시 ID를 첫 프로젝트로 바꾸는 용도로 쓰지 않는다.
- 인증 레이아웃 순서: AuthRuntime/QueryClient(기존 상위) → FluentUI/ProfilePreview → AdminRuntimeProvider → WorkspaceProjectProvider → WorkspaceSelectionProvider → CommentsProvider → ProjectHeaderProvider → AppShell. 기존 Toast/TokenDialog 배치는 필요한 Context 안에서 유지한다.
- workspace/layout에서 WorkspaceProjectProvider를 제거하고 children을 반환한다. FileRuntimeBridge는 기존 WorkspaceProjectProvider 내부 한 번만 유지한다. 인증/프로필 runtime이 준비되지 않았어도 관리자·로그인 전후 shell이 사라지지 않게 optional runtime의 비활성 Context를 제공한다.
- 기존 useWorkspaceSelection 안의 useQuery/useMutation/URL복원/effect를 새 provider의 내부 runtime 컴포넌트로 이동한다. hook은 Context 조회 facade만 남긴다. 훅 호출 여러 번이 선택 mutation/effect를 여러 개 만들지 않아야 한다.
- provider는 runtime 인스턴스 교체 시 이전 pending 응답을 무시하고 local mutation 상태를 초기화한다. 활성 runtime/actor/namespace가 바뀌면 이전 cache가 다른 사용자에게 나타나지 않도록 기존 queryScope와 lease 정리를 유지한다.
- selection.pending은 projects/saved 선택 조회 및 사용자 선택 mutation 동안 true. projects와 saved가 모두 성공하기 전에는 첫 항목을 memory에 publish하지 않는다.
- 우선순위: 대상 경로의 명시 project > 유효한 runtime memory > 접근 가능한 저장 project > 첫 접근 가능 project. memory도 현재 catalog 접근을 재검증한다. 직접 URL의 잘못된 형식/중복 params/권한 없는 ID는 오류를 표시하고 선택기에서 회복하게 한다.
- 명시 snapshot은 해당 프로젝트에 실제 있어야 한다. section/slide는 기존 resolveWorkspaceSelection의 fallback과 notice를 사용한다. canonical 선택을 저장/반영하기 전 접근 조회가 성공해야 한다.

### I02. 라우팅과 guard
- Related Files:
  - lib/workspace/production/routing.ts :: workspaceHref, parseWorkspaceSelection, resolveWorkspaceSelection — modify
  - components/layout/NavSidebar.tsx :: workspace 링크 생성 — modify
  - hooks/workspace/use-workspace-draft-guard.ts :: 공통 guard — reuse
  - hooks/workspace/use-workspace-production.ts :: activeWorkspaceRead/loadProjectView — reuse
#### Details
~~~typescript
type WorkspaceScreenId = "analysis" | "files" | "toc" | "setup" | "write" | "review";
function isWorkspaceScreenId(value: string): value is WorkspaceScreenId;
function workspaceHref(screen: WorkspaceScreenId, selection: WorkspaceSelection): string;
~~~
- commitSelection은 이미 guard를 통과한 내부 동작 또는 저장 성공 후 canonical 동기화 전용이다. schema/access/round 검증, 선택 저장, memory/cache 갱신, 대상6개경로의 router.replace까지 담당하고 runtime.navigate를 호출하지 않는다.
- choose는 runtime.navigate(async()=>commitSelection(next))만 수행한다. 같은 선택을 재선택하면 no-op. 완료/재작업 후 내부갱신과 일반 사용자 버튼이 commitSelection을 혼용하지 않도록 호출 위치를 주석으로 명시한다.
- 선택 처리 중복 클릭은 pending으로 막고 latest 요청만 URL/memory에 publish하도록 epoch를 적용한다. 액터전환/모달정리/저장 실패 후 옛 프로젝트로 돌아오는 늦은 응답을 무시한다.
- sidebar 6개 링크는 현 selection을 workspaceHref로 전달한다. 프로젝트 변경은 children 선택을 null로 초기화하고, 메뉴 이동은 같은 snapshot/section/slide를 유지한다. 일반 메뉴의 URL/등록 footer 동작은 그대로다.
- 링크 이동의 기존 capture guard와 직접 choose 경로를 이중 호출하지 않는다. sidebar anchor onClick에서 다시 choose/navigate를 호출하지 않는다.
- review 접근 판정과 redirect는 T06 공통 헤더 Context에서 실제 project 조회가 끝난 후 처리한다. 이 Task에서는 잘못된 review 전용 URL 삭제를 추가하지 않는다.
- 저장 selection은 기존 project ID preference 계약을 유지한다. 이번에 전체 선택의 영속화를 별도 DB schema로 확대하지 않는다. URL의 snapshot/section/slide는 새로고침 시 복원한다.

## Acceptance Criteria
- [x] AppShell 위에 workspace runtime은 하나이며 workspace/layout 중복이 없다.
- [x] 6개 메뉴 href는 같은 프로젝트·보관본을 유지하고 비대상 메뉴의 project 파라미터는 무시한다.
- [x] 저장 선택 조회가 늦어도 첫 프로젝트를 먼저 확정하지 않는다.
- [x] 명시 잘못된 ID는 오류, 권한 변경/액터 전환 시 이전 데이터는 노출되지 않는다.
- [x] choose당 guard가 한 번만 실행되고 취소 시 URL/selection/저장이 바뀌지 않는다.

## Validation
- npm run typecheck
- npx eslint "app/(authenticated)/layout.tsx" "app/(authenticated)/workspace/layout.tsx" components/workspace/WorkspaceSelectionProvider.tsx hooks/workspace/use-workspace-selection.ts lib/workspace/production/routing.ts components/layout/NavSidebar.tsx
- git diff --check
- 다음 인라인 순수 라우팅 검증은 브라우저 없이 수행한다.
~~~powershell
@'
const assert=require("node:assert/strict");
const {workspaceHref,parseWorkspaceSelection,isWorkspaceScreenId}=require("./lib/workspace/production/routing.ts");
const s={projectId:"p",sectionId:null,slideId:null,snapshotId:"snapshot-1"};
for(const screen of ["analysis","files","toc","setup","write","review"]){
 assert.equal(isWorkspaceScreenId(screen),true);
 const url=new URL(workspaceHref(screen,s),"http://local.invalid");
 assert.equal(url.pathname,"/workspace/"+screen);
 assert.deepEqual(parseWorkspaceSelection(url.searchParams),s);
}
assert.equal(isWorkspaceScreenId("register"),false);
assert.throws(()=>parseWorkspaceSelection(new URLSearchParams("project=p&project=q")));
console.log("6개 메뉴 라우팅 검증 통과");
'@ | node --require tsx/cjs -
~~~
- 정적 검토: provider 트리와 useWorkspaceSelection 호출부 목록, effect dependency/cleanup, pending 초기복원, navigate 중첩 없음. 브라우저 화면 전환을 실제 실행한 것으로 보고하지 않는다.

## Commit Message
~~~text
feat(workspace): 작업 선택 공급자와 여섯 메뉴 runtime 통합

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T04-shared-selection-runtime

- 공통 공급자와 6개 메뉴 선택 동기화
- 기존 동료 화면과 저장 경계 유지
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 및 6개 경로·중복 파라미터 인라인 검증 통과. Provider 단일 배치·초기 선택 대기·guard 단일 경로 정적 확인.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
