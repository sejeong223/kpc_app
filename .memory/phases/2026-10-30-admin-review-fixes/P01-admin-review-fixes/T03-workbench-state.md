# Task: T03 작업 화면·포커스 유지와 현재 권한 차단

## Status: done

## Goal
동일 작업/파일의 옵션 저장과 진행 갱신에서 편집 위치를 유지하면서 현재 권한이 없어진 작업 데이터는 즉시 차단한다.

## Decision Summary
- F02. 이전 Query 데이터를 무조건 placeholder로 재사용하지 않는다. 현재 권한으로 읽은 서비스 스냅샷을 새 Query의 초기 데이터로 사용한다.
- T01/T02 이후 실행. 현재 작업 저장과 화면 표시를 분리하며 중간 커밋은 보류한다.

## Implementation

### I01. 현재 작업 스냅샷 계약
- Related Files:
  - `types/template-work.ts` :: `WorkView`, `TemplateWorkDataService` — 가벼운 조회 계약; modify
  - `services/admin/TemplateWorkService.ts` :: `view`, `getWorkSnapshot`, `getWork` — 동기/비동기 동일 검증; modify
  - `hooks/admin/use-template-work.ts` :: `useTemplateWork` — Query 초기 데이터; modify
  - `lib/admin/query-keys.ts` :: `adminQueryKey`, `retireAdminQueries` — 현행 격리 계약; read-only

#### Details
- Signatures & Types:
```typescript
// 기존 WorkView에 fileRefId만 추가한다. 파일 바이트는 포함하지 않는다.
interface WorkView {
  work: TemplateWork;
  fileRefId: string;
  templateName: string;
  skillName: string;
  newer: { template: boolean; skill: boolean };
  canReapply: boolean;
  canApplyLatest: boolean;
  canDownload: boolean;
}
// TemplateWorkDataService와 class 양쪽에 추가한다.
getWorkSnapshot(actor: AdminActor, id: string): WorkView;
getWork(actor: AdminActor, id: string): Promise<WorkView>;
```
- Data & Schema Fields: 기존 WorkView는 work:TemplateWork, templateName/skillName:string, newer:{template:boolean;skill:boolean}, canReapply/canApplyLatest/canDownload:boolean. 새 fileRefId는 현재 entry.fileRefId에서 반환하는 non-null string. TemplateWork 저장 스키마·inputRevision·result는 변경하지 않는다.
- Execution Flow / Logic:
  1. getWorkSnapshot은 `accessible`(assertActor, ID, 소유자, 현재 양쪽 자산 접근)을 거쳐 기존 view 생성 로직을 호출한다. work는 structuredClone, fileRefId는 현재 pinned 파일이다. 실패를 빈 WorkView로 만들지 말고 기존 AdminDataError를 던진다.
  2. 비동기 getWork는 스냅샷을 반환하는 동일 검증 경로를 공유한다. emit/상태 쓰기/로그 쓰기는 없다.
  3. useTemplateWork는 기존 useSyncExternalStore와 query key의 actor/role/department/revision/workId/workRevision을 그대로 유지한다. 초기 데이터 함수는 브라우저·ID·read·canAccess가 모두 허용될 때만 getWorkSnapshot을 호출한다. 실패하면 undefined를 반환하고 정상 queryFn/forbidden 경로에 맡긴다.
  4. 이전 actor/revision의 데이터를 꺼내 채우지 않는다. useQuery의 queryFn=`works.getWork(actor,id)`, gcTime=0을 유지한다. initialData는 현재 상태를 완전히 담은 WorkView만 허용한다.
  5. 진행 또는 옵션 emit 때 새 키가 생겨도 현재 스냅샷이 동기 제공되어 `!view` 로딩 분기로 하위 편집기를 제거하지 않는다. 권한 없음 가드는 항상 UI 렌더링 전에 유지한다.

### I02. 문서 상태와 포커스 경계
- Related Files:
  - `components/admin/templates/workbench/TemplateWorkbench.tsx` :: 렌더링·`options` — UI 수명/포커스; modify
  - `components/admin/templates/TemplateMappingFields.tsx` :: index — 유지 확인; read-only
  - `components/admin/templates/workbench/SharedDesignEditor.tsx` :: selected id·로컬 초안 — 유지 확인; read-only
  - `components/admin/templates/workbench/TemplateResultsPanel.tsx` :: comparison/filter/page — 유지 확인; read-only
- 같은 workId/fileRefId 동안 세 편집 영역이 remount되지 않게 한다. 영역의 key는 workId+fileRefId에만 의존하고 work.version/inputRevision/resultId/templateRevision/workRevision을 key에 사용하지 않는다. 파일 교체 latest 성공 시에만 새 fileRefId로 문서별 UI를 초기화한다. 실패한 latest는 기존 key를 유지한다.
- 옵션 저장 중 기존 중복 실행 제한은 유지한다. disabled에 의해 포커스가 body로 이동한 경우를 위해 옵션 핸들러에서 현재 HTMLElement와 workId/fileRefId/actor identity를 캡처한다. 저장 종료 뒤 다음 렌더 프레임에서 여전히 연결된 동일 컨트롤이고 현재 접근 허용, 동일 work/file/actor, activeElement가 body 또는 원래 요소인 경우에만 `focus({preventScroll:true})`로 복구한다. 다른 요소로 이동한 사용자 포커스는 덮지 않는다. 취소/폐기/언마운트 후 복구하지 않는다. pending 중단을 위해 권한 가드를 늦추지 않는다.
- 로딩·오류·권한 없음 화면의 구분과 재시도 액션을 유지한다. 원격 API 연결 전용 캐시 아키텍처로 확장하지 않는다.
- 참고: [TanStack Query initialData](https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data)는 캐시에 저장되므로 부분 데이터나 권한 미검증 데이터는 사용하지 않는다.

### I03. 권한·캐시·실제 상호작용 회귀
- Related Files:
  - `tests/services/admin/TemplateWorkService.test.ts` — sync/async 동등성·사본; modify
  - `tests/services/admin/TemplateWorkService.races.test.ts` — 회수/종료; modify
  - `tests/lib/admin/assets/query-keys.test.ts` — QueryObserver/QueryClient의 캐시 격리; modify
- 기존 QueryObserver/QueryClient 검사는 다른 사용자/부서/역할/revision 키가 계속 분리되는지 확인한다. hook의 Query 설정을 테스트 안에 복사해 동일한 값을 비교하는 검사는 만들지 않는다. 갱신 중 최신 version/options가 즉시 표시되고 편집기가 제거되지 않는지는 실제 hook을 사용하는 T07 E2E로 검사한다.
- 스냅샷은 타인 작업·잠긴 계정·read 회수·그룹 삭제·dispose 후 거절하고, 스냅샷 변경이 원본 work를 바꾸지 않는다. 반환 fileRefId는 latest 성공 때만 바뀐다.
- T07 필수 실제 UI: 2쪽→유형 변경→2쪽 유지/포커스 유지, 역할·제외 연속 변경, 공유 요소 선택 및 미저장 초안 유지, 결과 필터·비교 페이지 유지, 파일 교체 시 초기화, 일반 사용자 전환 시 자료·다운로드 미노출. SSR HTML 검사만으로 완료하지 않는다.

## Acceptance Criteria
- [x] F02 재현에서 선택·포커스가 유지되고 저장 내용이 올바른 슬라이드에 반영된다.
- [x] 같은 파일의 진행 갱신은 편집 상태를 유지하고 파일 교체 성공만 초기화한다.
- [x] 현재 권한 회수·다른 사용자 캐시 노출을 차단한다.

## Validation
- `npm.cmd test -- tests/services/admin/TemplateWorkService.test.ts tests/services/admin/TemplateWorkService.races.test.ts tests/lib/admin/assets/query-keys.test.ts tests/lib/admin/assets/workbench-view.test.ts` — 통과.
- `npm.cmd run typecheck` 및 `npm.cmd run lint` — exit 0.
- 실행 환경의 브라우저로 위 F02 시나리오를 확인해 Task Progress에 결과를 기록한다. T07에서 동일 시나리오를 저장소 E2E로 자동화한다.

## Commit Message
```text
fix(admin): 작업 갱신 중 편집 위치와 권한 경계 보존

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Task: T03-workbench-state

- 현재 권한의 작업 스냅샷으로 로딩 재마운트 방지
- 문서 변경 경계와 포커스 복구 검사
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 검증: 관련 4개 파일 23개 테스트, typecheck, lint 통과. 브라우저 연결 호스트가 없어 실제 UI 검사는 T07 저장소 E2E에서 필수 확인하며 아직 통과로 간주하지 않는다.

- 최종 확인: T07 실제 브라우저: 2쪽 유형·역할·제외 변경 후 위치·포커스 유지, 공유 초안·결과 필터 유지, 다른 파일 교체 시 초기화. 일반 사용자 전환 시 작업/다운로드 차단과 슈퍼 관리자 복귀 통과.
