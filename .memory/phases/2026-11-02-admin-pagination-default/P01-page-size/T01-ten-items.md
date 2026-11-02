# Task: T01 한 페이지 기본 10개 조회

## Status: done

## 수정 파일·심볼

- `config/pagination.ts`: `DEFAULT_PAGE_SIZE = 10`, `PAGE_SIZE_OPTIONS = [10,20,50] as const`. 새 공통 설정.
- `components/admin/users/UsersPage.tsx`, `GroupsPanel.tsx`: query.pageSize 기본값 연결.
- `components/admin/audit/AuditFilters.tsx`: `DEFAULT_AUDIT_QUERY.pageSize` 연결. 초기화에서도 동일값 적용.
- `components/admin/audit/AuditPage.tsx`: 10/20/50 선택값 렌더, `PageInputSchema.shape.pageSize`로 값 검증. 선택 변경 시 page1·확장 초기화 유지.
- `components/admin/assets/AssetListPanel.tsx`: `defaultAssetQuery`, `emptyAssetList`, 표시 개수 선택값 연결. Skill 선택 팝업도 기존 defaultAssetQuery를 통해10개 적용.
- `components/admin/templates/workbench/TemplateResultsPanel.tsx`: 총 페이지·slice·pager의20을 공통값으로 바꿔 계산 일치.
- `lib/admin/selectors.ts`: 대시보드 RFP의 기존10을 공통 기본값 참조로 연결.

## 타입·계약

- `UserQuery`, `GroupQuery`, `AuditQuery`, `AssetQuery`의 pageSize 타입 `10 | 20 | 50` 유지.
- `PageResult<T>`의 items/total/page/pageSize/totalPages 구조 유지. 서비스·CSV·권한 변경 없음.
- 편집 모달 최신 항목 검색의20/50은 유지한다. 새로운 업무 페이지 기능은 만들지 않는다.

## 검증

- `npm.cmd test -- tests/lib/pagination.test.ts tests/lib/admin/selectors.test.ts tests/services/admin/MockAdminDataService.test.ts tests/lib/admin/assets/selectors.test.ts tests/components/admin/skill-access.test.ts tests/components/admin/template-access.test.ts tests/lib/pptx/template-results.test.ts tests/integration/admin-mock-workflow.test.ts`
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`
- `git diff --check`, `git diff --cached --check`
- 낮은 영향도의 기본값 변경이므로 새 테스트 파일은 만들지 않는다. 기존 테스트는 로컬 전용, 브라우저 검증 제외.

## 커밋

```text
fix(admin): 목록 기본 페이지 크기를 10개로 통일

Plan: 2026-11-02-admin-pagination-default
Phase: P01-page-size
Task: T01-ten-items

- 사용자·그룹·로그·자산·결과 목록에 공통 기본값 적용
- 활동 로그의 10개 선택과 기존 20/50개 선택 유지
```

## 완료

- [x] 구현
- [x] 검증
- [x] 기록·이 Task의 단일 로컬 커밋에 포함
- commit: Plan 헤더로 git log 조회

## 실행 기록

- 사용자·그룹·활동 로그·Skill·Template 및 Skill 선택·적용 결과 목록 기본10개 연결 완료. 대시보드 RFP도 같은 원본 참조.
- 활동 로그의 기존20/50 선택기를10/20/50으로 확장하고 Zod 검증값으로 변경한다. 필터 초기화는 공통 기본10개로 돌아간다.
- `TemplateResultsPanel`의 slice/총 페이지/pager가 모두 같은 크기를 참조한다. 기존 조회 권한·정렬·검색·CSV 전체 내보내기 동작은 변경하지 않았다.
- 관련8파일38테스트 통과. typecheck/lint/Next 프로덕션 build 및 diff 검사 통과. 새 테스트는 작성하지 않았다.
- 기존 Vite loader와 baseline-browser-mapping 경고는 계속 발생하지만 검사는 통과했다. 의존성 업데이트는 이번 변경에 포함하지 않았다.
- 페이지 구분 없는 요약 표와 편집 모달 최신 항목 조회 크기는 범위 밖이다. 기존 브라우저 검증 제외·테스트 로컬 보관 정책 유지.
- 단일 로컬 커밋, push 미실시. 실제 hash는 로컬 current와 완료 응답에 기록한다.
