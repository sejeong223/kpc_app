# Task: T01 같은 파일 최신 적용의 선택 슬라이드 보존

## Status: done

## Goal
Template 설명 또는 매핑만 바뀐 최신 버전을 적용해도 작업에서 선택한 일반 슬라이드 밖의 XML을 변경하지 않는다.

## Decision Summary
- 사용자 승인 범위 6개 개선 중 F01. 동일 파일: selectedSlides/layout/images/sharedEdits 유지, pageTypes/roles/excluded 최신 등록값. 파일 교체: 새 기본값. Skill만 변경: 전체 유지.
- 구현·검증 후 중간 커밋은 보류하고 T07에서 한 번 커밋한다. 내부 any/unknown·직접 fetch 금지, 기존 Zod/서비스 권한 경로 유지.

## Implementation

### I01. 적용 옵션 결정 분리
- Related Files:
  - `lib/admin/assets/work-policy.ts` :: `buildDefaultOptions`, `resolveReapplyOptions` — 옵션 결정; modify
  - `services/admin/TemplateWorkService.ts` :: `run` — 후보 옵션 사용; modify
  - `types/admin-assets.ts` :: `TemplateAssetRevision` — 현재 revision 구조; read-only
  - `types/pptx-template.ts` :: `TemplateOptions` — 출력 옵션 계약; read-only

#### Details
- Signatures & Types:
```typescript
function resolveReapplyOptions(
  current: TemplateOptions,
  pinned: TemplateAssetRevision,
  candidate: TemplateAssetRevision,
): TemplateOptions;
```
- Data & Schema Fields: `TemplateOptions`는 `layout:boolean`, `images:boolean`, `selectedSlides:number[]`(0부터 시작), `pageTypes:Record<string,PageType>`, `roles:Record<string,ObjectRole>`, `excluded:string[]`, `sharedEdits:SharedDesignEdit[]`. 빈 selectedSlides도 유효하며 공유 편집만 할 수 있다. Template revision의 `id:string`, `definition.fileRefId:string`, `definition.pageTypes/roles/excluded/extraction.slides[].index`를 사용한다. 저장 스키마는 바꾸지 않는다.
- Execution Flow / Logic:
  1. 기존 `resolveAsset(existing)` / `resolveLatestCandidates(new)`와 template/skill kind 검증을 그대로 수행한다.
  2. revision ID가 같으면 current 전체를 깊은 복사한다. ID가 다르면 `buildDefaultOptions(candidate)`를 만든다.
  3. 파일 참조가 같을 때만 current의 selectedSlides/layout/images/sharedEdits를 깊은 복사하여 덮는다. 선택 순서와 빈 배열을 그대로 보존한다. 같은 바이트라도 fileRefId가 다르면 기존 파일 교체 정책을 따른다.
  4. 후보 옵션은 로컬 변수로 유지한다. 실행 전 entry.work를 덮지 않는다. 성공 시 기존 refs/options/result 원자적 교체를 따른다. 실패·취소·권한 회수 시 기존 결과 보존 정책을 유지한다.
  5. 원본 revision과 current 옵션을 직접 변경하지 않는다. 선택 유효성 검사는 기존 엔진 `validateOptionsForDocument`/`applyTemplate` 경로를 유지한다.

### I02. 실제 출력과 수명주기 회귀 검사
- Related Files:
  - `tests/services/admin/TemplateWorkService.test.ts` :: 동일 파일 최신 매핑 테스트 — 선택 검사 보강; modify
  - `tests/lib/admin/assets/work-policy.test.ts` :: 옵션 분기 단위 검사; new
  - `tests/services/admin/work-fixture.ts` :: `workHarness`, `target`, `reviseSkill` — 재사용; read-only
  - `tests/services/admin/asset-fixture.ts` :: `templateDraft` — 재사용; read-only
  - `tests/fixtures/pptx/native-template.pptx` — 실제 4장 입력; read-only
- Tests:
  - selectedSlides=[1]로 고정 적용 후 설명만 바꿔 latest 적용. 여전히 [1], 1·3·4쪽 XML은 원본과 바이트/문자열 동일, 2쪽에는 예상 서식 변경이 있다. ZIP 압축 바이트 전체가 아니라 해제된 파트를 비교한다.
  - 매핑 변경 시 최신 pageTypes/roles/excluded가 반영되면서 선택·layout/images/sharedEdits가 유지된다. 빈 선택도 유지한다.
  - Skill만 변경 시 옵션 전체 동일. 다른 파일 참조로 교체 시 모든 선택/매핑/공유 편집은 기존 기본 정책대로 초기화한다.
  - helper 반환 값을 수정해도 원본 옵션과 revision이 바뀌지 않는다.
  - latest 실패·취소 후 pinned refs/options/result/download가 유지되는 기존 검사를 계속 통과한다. sharedEdits=[]로 일반 슬라이드 외부 보존을 검사하고, 공유 변경의 전역 영향은 별도 기존 테스트로 유지한다.

## Acceptance Criteria
- [x] F01 서비스 재현에서 선택 [1]이 그대로이며 미선택 일반 슬라이드 XML이 동일하다.
- [x] 동일 파일/다른 파일/Skill만 변경/빈 선택 분기를 모두 검증했다.
- [x] 원자적 결과 교체와 권한 회수·취소 기존 검사가 통과한다.

## Validation
- `npm.cmd test -- tests/services/admin/TemplateWorkService.test.ts tests/services/admin/TemplateWorkService.races.test.ts tests/lib/admin/assets/work-policy.test.ts tests/integration/skill-template-workflow.test.ts` — 모두 통과.
- `npm.cmd run typecheck` 및 `npm.cmd run lint` — exit 0.
- T07 브라우저 시나리오에서도 2쪽만 선택한 최신 적용을 확인한다.

## Commit Message
```text
fix(pptx): 동일 파일 최신 재적용의 슬라이드 선택 보존

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Task: T01-latest-selection

- 파일 변경과 내용 버전 변경의 옵션 처리 분리
- 미선택 슬라이드 출력 XML 보존 회귀 검사
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 검증: 관련 4개 파일 20개 테스트, typecheck, lint 통과.

- 최종 확인: T07 실제 브라우저: 2쪽만 선택하여 적용하고 설명 변경 후 최신 적용. 선택 유지, 미선택 1·3·4쪽 XML 보존, 다운로드 정상. 관련 출력 2개도 PowerPoint에서 열기·렌더링 통과.
