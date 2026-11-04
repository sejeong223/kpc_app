# Task: T03 헤더 조회 모델과 권한 일괄 저장

## Status: done

## Goal
상단바가 실제 선택 프로젝트·권한·회차를 표시할 typed 조회 모델을 만들고, 여러 멤버의 권한 변경을 한 번에 저장하는 명령을 추가한다. 기존 헤더 UI는 다음 Task에서 전환한다.

## Decision Summary
- 기존 mock ProjectHeaderData의 role/permissions/rounds는 업무 상태로 사용하지 않는다. 발주처/마감만 같은 ID의 보조 표시 정보로 사용할 수 있다.
- PM·슈퍼 관리자 고정 권한, 5개 위임 권한(outline/assign/setup/complete/rework)을 유지한다. grant라는 재위임 권한은 추가하지 않는다.
- batch는 변경 행 전체를 검증한 뒤 하나의 transaction/revision으로 반영한다. 기존 set-grants 계약은 유지한다.

## Implementation

### I01. 헤더 읽기 모델
- Related Files:
  - types/workspace-header.ts :: WorkspaceHeaderModel, WorkspaceHeaderMetadata — new
  - lib/workspace/production/header-selectors.ts :: selectWorkspaceHeader, canReviewProject — new
  - config/project-header.ts :: 동일 ID의 보조 메타데이터 — read-only 또는 표시 데이터 export 정리
  - config/workspace-projects.ts :: 기존 catalog — read-only
  - config/admin-seed.ts, types/admin.ts :: AdminRfp — read-only
  - types/workspace-production.ts :: ProjectView — modify (roundCreatedAt 추가)
  - lib/workspace/production/selectors.ts :: selectProjectView, selectSnapshotView — modify

#### Details
~~~typescript
interface WorkspaceHeaderMetadata {
  organization: string | null;
  dueDate: string | null; // YYYY-MM-DD
  budgetKrw: number | null;
}
interface WorkspaceHeaderModel extends WorkspaceHeaderMetadata {
  projectId: string; number: string; name: string;
  pmId: string; pmName: string; members: WorkspaceMember[];
  currentRound: number; displayedRound: number;
  phase: ProjectWorkspaceState["phase"];
  snapshotId: string | null;
  snapshotKind: RoundSnapshot["kind"] | null;
  readOnly: boolean;
  completedVersions: number;
  totalSections: number; doneSections: number; openComments: number;
  canReview: boolean;
  canManagePermissions: boolean;
  actions: Record<ProjectPermission, boolean>;
  history: Array<Pick<RoundSnapshot,"id"|"round"|"kind"|"createdAt"|"pptVersionId">>;
}
function selectWorkspaceHeader(
  view: ProjectView, selection: WorkspaceSelection,
  metadata: WorkspaceHeaderMetadata
): WorkspaceHeaderModel;
function canReviewProject(view: Pick<ProjectView,"actor"|"project">): boolean;
// ProjectView에 roundCreatedAt: string (ISO, 필수) 추가.
~~~
- selectProjectView는 bundle.files.rounds의 현재 회차 createdAt을 roundCreatedAt으로 전달한다. 해당 회차가 없으면 now로 보완하지 않고 STORAGE 오류를 낸다. selectSnapshotView는 snapshot.createdAt을 사용한다. 이는 표시 범위의 생성 시각이며 댓글 작성 시각을 바꾸지 않는다.
- 헤더 currentRound는 현재 raw view에서, 표시 집계는 선택 snapshot.body 또는 현재 body에서 얻는다. snapshotId가 없으면 NOT_FOUND, 다른 project이면 FORBIDDEN. history는 회차 내림차순이고 완성 수는 kind=complete만 센다.
- totalSections/doneSections는 body.sections에서, openComments는 slide·해당 회차 review·canvas의 open 의견을 중복 없이 집계한다. 0/0 진행률은 0%로 표시한다.
- canReview는 접근 확인된 project에서 actor.id===pmId 또는 actor.role===super_admin이다. PM 속성을 다른 mock에서 참조하지 않는다.
- readOnly는 snapshot 선택 중이거나 현재 phase가 completed인 경우다. 다만 현재 completed의 rework는 기존 canProjectAction대로 허용하고, 과거 snapshot에서는 모든 쓰기 actions를 false로 한다.
- canManagePermissions는 PM/super만 허용하고 snapshot 조회 중에는 false다. 현재 completed에서는 기존 도메인처럼 권한 관리가 가능하다. 다음 회차 재작업 위임과 완성 내용 편집을 구분한다.
- metadata는 동일 ID의 AdminRfp.budgetKrw를 우선한다. org/due가 없는 ID는 null로 두고 “—”로 표시한다. getProjectHeaderData의 첫 프로젝트 fallback을 사용하지 않는다. 이름/번호/PM은 catalog, 권한/회차는 view에서 가져온다.
- 표시 보조 데이터도 WorkspaceHeaderMetadata 타입으로 제한하고 Zod로 확인한다. 임의 Record/string index로 타입 검사를 우회하지 않는다.

### I02. 변경 행 일괄 저장
- Related Files:
  - types/workspace-production.ts :: WorkspaceOperation — modify
  - lib/workspace/production/schemas.ts :: publicOperations / ProjectGrantSchema — modify
  - lib/workspace/production/domain.ts :: set-grants / set-grants-batch — modify
  - lib/workspace/production/permissions.ts :: canManageProject — reuse
#### Details
~~~typescript
type SetGrantsBatchOperation = {
  type: "set-grants-batch";
  grants: ProjectGrant[];
};
// ProjectGrant = { userId: string; permissions: ProjectPermission[] }
// 기존 WorkspaceMutation {projectId, expectedRevision, expectedRound, operation}에 포함한다.
~~~
- grants에는 변경 행만 넣는다. 배열 min1, userId 중복 금지. permissions는 0~5개이며 기존 enum만 허용하고 중복을 금지한다. 빈 permissions는 명시적 부여 해제이며, 요청에 없는 멤버의 grant는 유지한다.
- project 접근, PM/super 관리 권한, expectedRevision/expectedRound를 확인한다. 모든 target이 현재 멤버이고 PM/super 고정 대상이 아닌지 쓰기 전에 검증한다. role은 context.members에서 가져오며 클라이언트가 보낸 값을 믿지 않는다.
- 현재 actor가 super_admin이면 catalog의 role 표시가 누락되어도 본인 행의 권한 변경은 거부한다. 기존 단일 set-grants의 actor.role 보호 조건까지 공통 helper에 유지한다.
- 한 행만 잘못되어도 FORBIDDEN/VALIDATION으로 전체 실패한다. 기존 grants를 clone하여 대상 행만 교체하고 빈 권한 행은 제거할 수 있다. workspace.revision은 1만 증가시키고 inputRevision/본문/스냅샷은 바꾸지 않는다. canonical 검증 후 기존 repository transaction으로 저장한다.
- 단일 set-grants도 같은 행 검증 helper를 사용해 호환성을 유지한다. UI에서 여러 mutate를 반복 호출하지 않는다.
- 저장 후 재조회는 useWorkspaceCommand와 runtime.invalidateProject를 사용한다. 새 API나 직접 fetch는 추가하지 않는다.

## Acceptance Criteria
- [x] mock에서 PM이더라도 실제 선택 project의 PM이 아니면 PM 권한을 얻지 않는다.
- [x] 없는 metadata를 다른 project에서 표시하지 않고 complete/unfinished를 구분한다.
- [x] 2행 저장은 revision 1 증가, 1행 오류는 전체 원상태 유지다.
- [x] PM/super 고정 권한 해제 및 권한 관리 재위임이 불가능하다.
- [x] 기존 단일 set-grants 호출부가 컴파일된다.

## Validation
- npm run typecheck
- npx eslint types/workspace-header.ts types/workspace-production.ts lib/workspace/production config/project-header.ts
- git diff --check
- node --require tsx/cjs - stdin으로 metadata=null, PM 아닌 사용자의 review 거부, super의 review 허용, history 완성 수, snapshot 읽기 전용을 검증한다.
- 인메모리 fixture는 createEmptyFileProject(context)와 createWorkspaceState(context,files)로 만든다. context는 {identity:{namespace:"validation",actor:{id:"pm",name:"PM",role:"user",isMock:true}},project:{id:"p",number:"P",name:"검증",departmentId:null,pmId:"pm",pmName:"PM",memberIds:["pm","m1","m2"]},members,now:"2026-11-04T00:00:00.000Z",newId}다. members는 각 id/adminUserId/name과 departmentId:null,departmentName:"",email:null,role:"user"를 가진다. newId는 순차 고유 문자열을 반환한다.
- applyWorkspaceMutation에 현재 revision/round와 set-grants-batch를 전달해 정상 2행에서 revision+1, 오류 행 혼재에서 전체 불변, 고정 권한 대상 거부, 단일 명령 호환을 검증한다. tests/를 만들지 않는다.

## Commit Message
~~~text
feat(workspace): 공통 헤더 조회 모델과 권한 일괄 저장 계약 추가

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T03-header-data-grants

- 헤더 조회 모델과 권한 일괄 저장
- 기존 데이터 및 사용자 확정 정책 보존
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff, 헤더 실제 집계·회차·메타데이터·리뷰 접근·권한 일괄 저장 원자성 인라인 검증 통과.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
