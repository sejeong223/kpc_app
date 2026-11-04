# Task: T06 6개 메뉴 공통 상단바 적용

## Status: done

## Goal
AI 분석·파일·목차·제작 설정·제작·리뷰에서 같은 프로젝트 정보·회차·진행률·권한의 상단바를 한 번만 표시한다. 사이드바 리뷰 접근도 같은 기준으로 판단한다.

## Decision Summary
- 선행 T03의 WorkspaceHeaderModel, T04의 단일 선택, T05의 댓글 Context를 사용한다.
- 동료 ProjectHeader의 표현과 Dadam/WorkspacePage 구조를 재사용하며 기존 /workspace/write 본문을 바꾸지 않는다.
- 분석/리뷰 본문, 관리자 메뉴, RFP 등록/하단 footer는 대상이 아니다.

## Implementation

### I01. 실제 상태 기반 헤더 Context
- Related Files:
  - components/common/ProjectHeaderProvider.tsx :: ProjectHeaderContextValue, ProjectHeaderProvider, ProjectHeaderToaster — modify
  - lib/workspace/production/header-selectors.ts :: selectWorkspaceHeader, canReviewProject — reuse
  - types/workspace-header.ts :: WorkspaceHeaderModel — reuse
  - config/project-header.ts :: getProjectHeaderData 등 mock 업무상태 참조 — 제거 대상 확인
  - components/layout/NavSidebar.tsx :: isProjectPm, review href — modify
#### Details
~~~typescript
type HeaderState =
  | { status:"idle"|"loading"; view:null; model:null; error:null }
  | { status:"error"; view:null; model:null; error:Error }
  | { status:"ready"; view:ProjectView; model:WorkspaceHeaderModel; error:null };
interface ProjectHeaderContextValue {
  state: HeaderState;
  projects: WorkspaceProject[];
  selection: WorkspaceSelection;
  pending: boolean;
  isPm: boolean;
  toasterId: string;
  selectProject(id: string): Promise<void>;
}
~~~
- view는 현재 저장 상태(raw)이며 model이 표시snapshot을 반영한다. 완성/재작업/권한 명령의 revision은 raw에서만 취한다. 과거 view를 현재 저장 상태로 위장하지 않는다.
- provider는 useWorkspaceSelection과 useProjectWorkspace로 읽는다. runtime 없는 경우 별도 inactive 내부 컴포넌트를 사용해 hook 호출 순서를 지키면서 children을 유지한다.
- metadata는 동일ID AdminRfp budget과 같은ID 보조 org/due만 합친다. query 로딩/오류 때 mock 프로젝트를 대신 표시하지 않는다. 고정 mois/edu selector와 별도 useState는 제거한다.
- selectProject는 choose({projectId:id,sectionId:null,slideId:null,snapshotId:null})를 await한다. 선택 성공이 확인된 뒤 toast를 표시하고 guard 취소/실패는 성공 toast를 띄우지 않는다. 최신 선택과 일치하는 응답만 반영한다.
- isPm은 기존 sidebar 호환 명칭으로 유지하되 의미는 ready && model.canReview다. 즉 PM 또는 슈퍼 관리자. 프로젝트가 로딩/권한 오류면 false.
- review 경로에서 조회 성공 후 canReview=false이면 router.replace(workspaceHref("write", selection))한다. 대상 프로젝트/현재 선택을 유지하고 뒤로 가기 루프를 만들지 않는다. error/pending 동안 임의redirect를 하지 않는다.
- project 접근 불가와 PM 전용 review 접근 불가를 구분한다. 후자는 선택project는 유지해 제작으로 이동, 전자는 error/선택기를 제공한다.
- HeaderState.status 분기로 모든 소비자의 null 처리를 강제한다. assertion으로 null을 숨기지 않는다.

### I02. 표시·공통 헤더·중복 제거
- Related Files:
  - components/common/ProjectHeader.tsx :: ProjectHeader, ProjectHeaderContent, ProjectHeaderPage — modify
  - components/common/ProjectSettingsDrawer.tsx :: props/기본정보 표시 — 최소 타입 전환; 권한 저장은 T07
  - components/layout/WorkspacePage.tsx :: headerComponent 계약 — reuse
  - components/layout/WorkspaceHeader.tsx :: WorkspaceHeaderProps — reuse
  - components/workspace/files/FilesWorkspace.tsx :: header — modify
  - components/workspace/toc/TocWorkspace.tsx :: header — modify
  - components/workspace/setup/SetupWorkspace.tsx :: header — modify
  - components/workspace/shared/WorkspaceFlow.tsx :: 중복 selector/회차 action 제거 — modify
  - components/workspace/WorkspaceScreen.tsx :: ActiveGate, WorkspaceSceneProps.selector — modify
  - components/comments/CommentsWorkspace.tsx :: 기존 header 연결 — 유지/props 보완
  - app/(authenticated)/workspace/[screen]/page.tsx :: 6개 진입 — 필요한 연결만 modify
  - hooks/workspace/use-project-round.ts :: 기존 실제 명령 — reuse (T08에서 이력까지 확장)
#### Details
~~~typescript
type ProjectHeaderProps = WorkspaceHeaderProps;
// 기존 Omit<...,"leading"|"actions"> 제한을 풀어 소비 화면 actions를 합성한다.
interface ProjectSettingsDrawerProps {
  id: string;
  project: WorkspaceHeaderModel;
  view: ProjectView;
  onClose(): void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}
~~~
- selector, 번호·프로젝트명, PM/참여자, 발주처/마감/예산, 현재/조회회차, 진행/의견 수, 설정·완성·재작업·이력 표시를 model에서 받는다.
- 완료 수=kind complete만, 미완성 이력은 별도 라벨. 없는 날짜/예산은 —로 표시하고 가짜 D-day를 계산하지 않는다. 예산 0은 null과 구분한다.
- WorkspacePage.headerComponent={ProjectHeader} 연결을 활용한다. leading/actions는 소비 화면의 기존 파일 개수/한도 등 필요한 action과 공통 action을 합성한다. props를 spread하다 상단바 common leading/actions를 덮어쓰지 않는다.
- 기존 메뉴명 타이틀 중복 제거와 공통 여백 토큰 정책을 유지한다. 각 화면별 독립 margin/padding 또는 고정 min-height를 추가하지 않는다.
- WorkspaceScreen.ActiveGate의 기존 ProjectSelector도 중복 제거 대상이다. 성공/로딩/오류 경로 모두 같은 ProjectHeader를 사용한다. scene.selector는 소비자를 함께 정리해 제거하거나 null로 유지하여 공통 selector와 중복되지 않게 한다.
- 프로젝트 선택기/회차 선택/완성·재작업·권한 진입이 두 군데 나타나지 않게 FilesWorkspace와 WorkspaceFlow의 중복을 정리한다. 목차의 고유 액션(추가/체크리스트/PPT 등)과 파일 한도·메타데이터는 유지한다.
- 완성/재작업은 현 시점에서도 기존 useProjectRound/ProjectRoundDialog를 호출해 실제 명령을 사용한다. 해당 버튼을 가짜 toast로 성공 처리하지 않는다. 확인/회차 선택/PPT 이력의 최종 동작은 T08에서 확장한다.
- 설정 Drawer는 신규model/view props로 전환해 조회용 기본정보/실제 참여자 표를 표시한다. 기존 저장되지 않는 fake checkbox/알림/로그는 표시하지 않고, T07에서 실제 권한 초안·저장 UI를 붙인다. legacy타입으로 역변환하여 mock권한을 다시 만들지 않는다.
- overlay를 열거나 다른 overlay로 바꾸기 전 runtime.navigate 또는 등록된 draft guard를 한 번 통과한다. 통과 후에만 comments.controller?.closePopup()/pinMode 정리한다. 먼저 코멘트 초안을 지우지 않는다.
- 각 overlay는 project/round/snapshot scope key를 따른다. scope 이동 시 이전 팝업/로딩결과가 새project에 뜨지 않는다. guard를 통과하지 못하면 overlay 상태도 유지한다.
- 접근 불가 액션은 render 자체를 막는다. 권한 있는 작업의 진행 중 비활성화만 disabled로 처리한다.
- write 경로는 계속 CommentsWorkspace, analysis/review는 ProjectHeaderPage의 기존 빈 본문이다. 새 제작 편집기를 복원하거나 분석/리뷰 시연본문을 추가하지 않는다.

## Acceptance Criteria
- [x] 6개 경로는 같은 project/round를 표시하고 독립 헤더/selector가 중복되지 않는다.
- [x] 헤더·sidebar 권한과 표시값이 공통 view에서 파생된다.
- [x] 오류·초기조회 중 다른 project의 mock정보를 대신 표시하지 않는다.
- [x] review 비권한 선택은 해당 프로젝트를 유지해 write로 이동한다.
- [x] 동료 제작 UI, 파일 한도/목차 고유기능, RFP 등록 footer가 유지된다.

## Validation
- npm run typecheck
- npx eslint components/common/ProjectHeader.tsx components/common/ProjectHeaderProvider.tsx components/common/ProjectSettingsDrawer.tsx components/layout/NavSidebar.tsx components/workspace/files/FilesWorkspace.tsx components/workspace/toc/TocWorkspace.tsx components/workspace/setup/SetupWorkspace.tsx components/workspace/shared/WorkspaceFlow.tsx "app/(authenticated)/workspace/[screen]/page.tsx"
- git diff --check
- rg -n "getProjectHeaderData|PROJECT_HEADER_PROJECTS|isProjectPm|useProjectHeader|ProjectSelector|ProjectHistorySelector|ProjectHeader" components hooks app
- 결과를 읽어 업무권한에 mock참조가 없고 대상경로마다 selector가 한 번이며, 비대상 화면에 강제 헤더를 추가하지 않았는지 확인한다. rg 검색 결과만으로 렌더링 실검증 통과라고 하지 않는다.

## Commit Message
~~~text
feat(workspace): 여섯 작업 메뉴에 실제 프로젝트 공통 상단바 적용

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T06-shared-project-header

- 6개 메뉴 공통 상단바 적용
- 공통 조회 계약과 권한 검증 재사용
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 통과. 6개 진입·공통 selector·실제 view 권한·리뷰 리다이렉트 정적 확인. 예산은 현재 catalog와 동일 AdminRfp seed의 같은 ID만 표시.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
