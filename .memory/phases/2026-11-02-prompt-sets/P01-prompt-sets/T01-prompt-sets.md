# Task: 프롬프트 세트 관리 구현
## Status: done
## 파일·계약
- lib/admin/prompts/{schemas,outline,selectors,commands}.ts 신규. PromptItem{id,level:1|2,title,prompt,sources:Source[]|null}, Source=proposal|related|web. PromptValue{name,description,items}; PromptRecord extends AdminRecord{ownerDepartmentId,createdBy,status:draft|active,visibility,currentRevision,deletedAt}; PromptRevision{...value,id,promptSetId,revision,createdAt,createdBy}. PromptUsage{promptSetId,projectId,revision,mode:project|section}. PromptStore{records,revisions,usages}.
- PromptQuery{search,departmentId,visibility,status,page,pageSize:10,sort,direction}. 목록·상세는 scope 필터 및 capability를 반환. Command=create/update/duplicate/status/visibility/delete, 모든 변경은 버전 검증 및 활동로그.
- types/admin-prompts.ts, types/admin.ts, lib/admin/schemas.ts, config/admin-permissions.ts, config/admin-labels.ts, config/admin-seed.ts, config/admin-prompts-seed.ts. 기존 grants/감사 리소스에 promptSets 추가.
- services/admin/MockAdminDataService.ts: getPromptSets/getPromptSet/getPromptAudience/executePrompt. actor·권한 검증, atomic draft commit, 오류·충돌.
- hooks/admin/use-prompt-sets.ts: TanStack Query read/mutation; actor/revision 격리.
- components/admin/prompts/: PromptSetsPage, PromptListPanel, PromptDetailPage, PromptEditorPage, PromptOutlineEditor, PromptOutlineTable, PromptVisibilitySummary. 공통 AdminPage/Card/Table/Pager/Tabs/AssetVisibilityField/ModalFrame 재사용.
- components/admin/AdminScreenRouter.tsx, app/(authenticated)/workspace/[screen]/page.tsx 연결. 기존 메뉴/역할 경계 유지.
## 수용 기준
- 표/필터/10개 페이지, 상세3탭, 입력페이지, 상속·소스 순서, 대목차 묶음 이동, 항목삭제/전환 후 유효한 계층.
- 추가/수정/복제/상태/공개/논리삭제가 실제 mock 서비스에 저장되고 목록·이력·활동로그 갱신. 수정 시 기존 참조 버전 보존.
- 허용되지 않은 버튼은 조건부 렌더. 직접 서비스 호출도 권한/ID/부서/대상/버전 검증. 오류/로딩/빈 결과/재시도·입력보존·미저장 확인.
## 검증
- 로컬 단위: 스키마/계층 이동·상속/필터·scope·CRUD·충돌·atomicity·변경이력/사용참조 고정.
- jsdom: 목록→등록→저장→상세, 목차/소스/초안·활성·복제/필터·페이지·읽기전용·취소.
- npm.cmd test, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build; git diff --check 및 staged check.
- 브라우저/E2E/dev server 제외, tests는 로컬에만 보관.
## 커밋
feat(prompts): 기획안 기반 프롬프트 세트 관리 구현

Plan: 2026-11-02-prompt-sets
Phase: P01-prompt-sets
Task: T01-prompt-sets

## 실행 결과 (2026-11-02)
- 기획 HTML의 실제 표 렌더러를 기준으로 8열 목록, 이름·설명 검색, 공개 범위·부서·상태 필터, 정렬, 10개 단위 페이지를 구현했다.
- 전체 화면 등록·수정, 상세의 내용/사용 중인 프로젝트/변경이력 3개 탭, 공개 범위 변경, 활성/초안 전환, 복제, 논리삭제를 연결했다.
- 목차의 대/소 전환, 추가·삭제, 대목차와 하위 항목 묶음 이동(드래그/키보드 버튼), 빈 하위 프롬프트 상속, 소스 우선순위 선택·상속을 구현했다.
- 기존 AdminDataService에 별도 프롬프트 도메인을 연결했다. 부서 소유권·공개 대상·CRUD 권한·낙관적 버전을 서비스 경계에서 검증하고, 내용 개정과 기존 프로젝트 참조 버전을 분리했다. 다른 부서 프로젝트는 조회 범위에서 제외한다.
- 기존 공통 화면·카드·표·탭·페이지·공개 대상 컴포넌트를 재사용했다. 추가로 hooks/use-unsaved-navigation.ts에 미저장 이동 확인을 분리하고 lib/admin/query-keys.ts에 프롬프트 필터 계약을 추가했다.
- 실패·충돌 시 입력을 유지하며 최신 내용 불러오기는 명시적으로 실행한다. 삭제 확인과 공개 범위 확인은 시작 시점의 버전으로 요청한다.

## 검증 결과
- npm.cmd test: **80개 파일, 611개 테스트 통과**. 신규 도메인 10개 및 화면 통합 8개 포함.
- 기존 workspace/screen 테스트의 프롬프트 세트 placeholder 기대값을 실제 관리자 화면 연결 기대값으로 변경했다. 최종 전체 재검사 통과.
- npm.cmd run typecheck / npm.cmd run lint / npm.cmd run build: 모두 통과.
- git diff --check 및 git diff --cached --check: 통과.
- tests/lib/admin/prompt-sets.test.ts, tests/components/admin/prompt-sets.test.ts, tests/app/workspace/screen.test.ts는 기존 정책대로 로컬에서만 보관·검증하며 커밋하지 않는다.
- 기존 검증 정책에 따라 브라우저·수동 UI·E2E·개발 서버 검증은 수행하지 않았다. 실제 화면의 시각적 일치까지 검증한 것으로 간주하지 않는다.

## 범위와 제한
- 인메모리 mock 데이터이며 새로고침 시 변경사항이 초기화된다. 실제 Cosmos DB 및 AI/제작 실행 연동은 포함하지 않는다.
- 사용 프로젝트는 기존 mock 프로젝트와 연결된 참조이며, 원본 HTML의 임의 누적 사용 숫자 대신 권한 범위 내 실제 mock 참조 수를 표시한다.
- 전용 서비스·UI를 추가했으며 기존 Skill/Template PPT 변환 도메인은 변경하지 않았다.
- 단일 로컬 커밋으로 완료하며 원격 push는 수행하지 않는다.
