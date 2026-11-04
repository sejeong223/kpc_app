# Task: T08 완성·재작업·회차 이력 연결

## Status: done

## Goal
공통 상단바의 완성·재작업·이력이 기존 업무 로직을 호출하고, 파일·설정·의견이 선택한 보관본 기준으로 함께 표시되게 한다.

## Decision Summary
- 선행 canvas 회차 보존과 공통 header를 사용한다. 별도 헤더 회차 상태나 파일 전용 start-round를 만들지 않는다.
- 과거 자료는 당시 snapshot.fileEntries로 선택한다. 현재 파일 목록이나 다른 회차의 최신 버전으로 대체하지 않는다.
- 실제 보관된 PPT만 기존 다운로드 경로로 내려받는다. 새 편집/생성 UI를 추가하지 않는다.

## Implementation

### I01. 회차 확인과 공통 action
- Related Files:
  - hooks/workspace/use-project-round.ts :: open, confirm — modify
  - components/common/ProjectHeader.tsx :: complete/rework/history overlays — modify
  - components/workspace/shared/ProjectRoundDialog.tsx :: 확인 요약 — modify
  - components/workspace/shared/ProjectHistorySelector.tsx :: 현재/보관 선택 — reuse/modify
  - components/workspace/shared/WorkspaceFlow.tsx, components/workspace/files/FilesWorkspace.tsx :: 중복 회차 동작 제거 — 확인/modify
  - hooks/workspace/use-workspace-selection.ts :: commitSelection — reuse
  - hooks/workspace/use-workspace-production.ts :: queryClient fetch 경로 — reuse
#### Details
~~~typescript
// 기존 명령과 확인 payload를 그대로 사용한다.
interface RoundConfirmation {
  revision: number;
  fileRevision: number;
  round: number;
  acknowledged: true;
}
// useProjectRound(projectId:string,onChanged:()=>Promise<void>)
// dialog: {mode:"complete"|"start-round";view:ProjectView}|null
~~~
- open은 runtime.navigate guard를 먼저 통과하고 queryClient.fetchQuery + activeWorkspaceRead/loadProjectView로 fresh raw view를 조회한다. UI hook에서 query 없이 service를 직접 호출하는 기존 경로를 이 부분에서 정리한다.
- dialog의project/revision/fileRevision/currentRound를 열 때 고정한다. 배경재조회로 baseline을 자동 갱신하지 않는다. 다른scope로 바뀌면 닫고 오래된 응답은 무시한다.
- summary는 미완료소목차, 미처리 slide/review/canvas 의견, 미완료체크리스트, 슬라이드 수를 표시한다. 미완료를 자동으로done 처리하지 않는다. 확인checkbox가 체크되어야 acknowledged:true를 전송한다.
- confirm은 captured expectedRevision/expectedRound/expectedFileRevision과 실제mode를 기존 useWorkspaceCommand로 보낸다. pending중 이중확인/닫기/회차변경을 차단한다. CONFLICT면 창/입력을 유지하고 다시불러오기 경로를 제공하며 자동재전송하지 않는다.
- 성공 후 runtime.clipboard.clear(), service.clearProjectSessions(projectId), 모달/파일 preview/댓글 임시scope 정리 후 commitSelection({projectId,sectionId:null,slideId:null,snapshotId:null})을 사용한다. 이미 guard를 통과한 흐름 안에서 choose→navigate를 다시 호출하지 않는다.
- current completed에서는 complete를 숨기고 rework는 위임권한 포함 기존capabilities를 따른다. 과거snapshot에서는 모든write action을 숨기고 “현재 작업으로”를 제공한다.
- file의 기존 다음 회차와 목차의 중복 버튼은 공통action으로 통일하되 start-round 도메인의 확인규칙을 유지한다. 독립file명령으로 공통state를 건너뛰지 않는다.

### I02. 파일 보관본 투영과 메뉴별 이력
- Related Files:
  - lib/workspace/production/file-history.ts :: selectFileSnapshot — new
  - services/workspace/WorkspaceProductionService.ts :: loadFileSnapshot — new method
  - hooks/workspace/use-workspace-files.ts :: useWorkspaceFileHistory — new export
  - lib/workspace/production/query-keys.ts :: fileHistory — modify
  - services/workspace/createWorkspaceRuntime.ts :: invalidateProject — modify
  - components/workspace/files/FilesWorkspace.tsx :: snapshot view/읽기 전용 — modify
  - components/workspace/files/FileRoundSection.tsx :: 읽기 전용 표시 — reuse
  - components/workspace/WorkspaceScreen.tsx, components/workspace/setup/SetupWorkspace.tsx :: 기존snapshot 선택 — 검토/필요한연결
#### Details
~~~typescript
function selectFileSnapshot(
  bundle: WorkspaceBundle, context: WorkspaceContext, snapshotId: string
): FileWorkspaceView;
// WorkspaceProductionService
loadFileSnapshot(projectId: string, snapshotId: string): Promise<FileWorkspaceView>;
// query key factory 추가
// fileHistory(id, snapshotId) = [...scope,"project",id,"files-history",snapshotId]
function useWorkspaceFileHistory(projectId: string|null, snapshotId: string|null);
~~~
- service는 WorkspaceIdSchema/현재 접근권한을 검증하고 load(projectId)로 bundle을 읽은 뒤 selector에 context를 전달한다. raw 외부 state를 UI가 만들어 서비스에 저장시키지 않는다.
- selector는 project/state/files의projectId와 snapshot존재를 확인한다. snapshot.round의 FileRound를 찾고, resources는 snapshot.fileEntries의 순서/assetId/versionId로 정확히 고른다. 해당version.assetId와entry.assetId가 같아야 한다.
- 반환: currentRound=snapshot.round, currentCount=snapshot.fileEntries.length, phase=completed, revision=files.revision, workspaceRevision=state.revision, canAdd/canStartRound/canReorder=false. rounds에는 선택회차 하나만 넣고 categoryOrder는 해당 보존 FileRound의 순서, readOnly=true, 모든resource.canManage=false. 원본bundle을 수정하지 않는다.
- 필수 원본/버전 누락은 STORAGE/ORIGINAL_MISSING로 표시한다. 다른 버전으로 대체하거나 빈 자료로 성공 처리하지 않는다. 미리보기/다운로드에는 snapshot.round와 정확한 versionId를 전달한다.
- useWorkspaceFileHistory는 projectId와 snapshotId가 모두 있을 때만 실행한다. 현재 useFileWorkspace와 별도 키를 사용하여 캐시 형식을 섞지 않는다. 기존 파일 UI의 오류 타입에 맞춰 WorkspaceError를 WorkspaceFileError로 매핑한다.
- invalidateProject는 production project query를 exact:false로 무효화해 하위 fileHistory도 갱신한다. 기존 fileQueryKeys.project 갱신을 유지하고 BroadcastChannel 수신과 액터 전환에도 적용한다.
- snapshot 선택 시 FilesWorkspace는 history query만 표시한다. 자료 추가·편집·삭제·복사·순서 변경·undo·다음 회차 action은 렌더링하지 않는다. 현재로 복귀하면 기존 다중 회차 목록과 작성 권한을 복원한다.
- toc/setup은 기존 selectSnapshotView, write는 읽기 전용 canvas scope를 사용한다. analysis/review는 헤더 이력 정보만 바꾸고 새 본문은 만들지 않는다.

### I03. 이력 목록과 실제 PPT
- Related Files:
  - components/common/ProjectHeader.tsx :: history popup — modify
  - hooks/workspace/use-workspace-ppt.ts :: download task — reuse
  - services/workspace/WorkspaceProductionService.ts :: downloadPpt — reuse
#### Details
- history는 state.snapshots를 회차 내림차순으로 표시한다. complete는 완성본, unfinished는 미완성 보관이다. 선택은 choose({...selection,snapshotId:id,sectionId:null,slideId:null})를 호출한다.
- PPT action은 snapshot.pptVersionId가 실제 state.pptVersions의 같은 회차를 가리킬 때만 표시한다. 없으면 “보관된 PPT 없음”으로 표시하며 최신/첫 번째 버전으로 대체하지 않는다.
- 다운로드는 useWorkspacePpt().task에 {kind:"download",projectId,versionId}를 전달한다. 바이너리 누락·권한 변경·취소는 기존 오류로 처리하고 가짜 파일을 만들지 않는다.
- 조회 회차가 바뀌어도 동료 제작 작업 영역과 핀 표현을 유지한다. 이전 새 편집기를 PPT 미리보기 목적으로 삽입하지 않는다.

## Acceptance Criteria
- [x] 완성/재작업이 파일·의견·본문을 한 트랜잭션에서 보존하고 두 revision을 검사한다.
- [x] unfinished와complete를 구분하며 미완료 항목을 자동 완료시키지 않는다.
- [x] 6개 메뉴 선택은 동일snapshot을 유지하고 파일은 exact snapshot.fileEntries로 표시한다.
- [x] 과거 파일/핀/설정의 편집 action은 노출되지 않으며 저장 경계에서도 거부된다.
- [x] PPT 없음/누락은 오류·빈 상태로 드러나고 다른 회차 파일로 대체되지 않는다.

## Validation
- npm run typecheck
- npx eslint hooks/workspace/use-project-round.ts hooks/workspace/use-workspace-files.ts components/common/ProjectHeader.tsx components/workspace/shared components/workspace/files/FilesWorkspace.tsx lib/workspace/production/file-history.ts lib/workspace/production/query-keys.ts services/workspace/WorkspaceProductionService.ts services/workspace/createWorkspaceRuntime.ts
- git diff --check
- 최종T10 인라인 검증의 complete/start-round, exact snapshot 파일버전, 오래된 fileRevision, unfinished 이력, canvas backreference를 수행한다.
- 정적 검토: common action 단일화, 완료 후 commitSelection 사용, query key 하위 무효화, 다운로드version의snapshot 연결, current/snapshot UI 분기.

## Commit Message
~~~text
feat(workspace): 공통 완성 재작업과 과거 회차 조회 연결

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T08-round-history-actions

- 완성·재작업·회차 이력 연결
- 원본 보존과 공통 컴포넌트 정책 유지
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 통과. complete/start-round·오래된 fileRevision·미완성 보존·canvas 계승 및 snapshot exact 버전/누락 거부 인라인 검증 통과.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
