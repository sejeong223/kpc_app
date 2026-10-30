# Task: T06 활동 한국어 표시와 안정된 작업 집계

## Status: done

## Goal
내부 명령명·버전 ID·조회 조건 JSON이 화면 작업명으로 노출되거나 같은 작업을 별개 항목으로 쪼개지 않게 하면서 감사 원본은 보존한다.

## Decision Summary
- 사용자 승인 추가 개선. 기존 AdminAuditEvent 저장 스키마와 원본 detail은 유지한다. 표시·검색·집계·CSV에서 공통 작업 분류를 사용한다.
- T05 다음 순차 실행. Cosmos 데이터 모델·마이그레이션·새 로그 저장소는 추가하지 않으며 중간 커밋 보류.

## Implementation

### I01. 순수 작업 분류·표시 함수
- Related Files:
  - `lib/admin/audit-operation.ts` :: `getAuditOperation`, `countAuditOperations` — 새 공통 변환; new
  - `config/admin-labels.ts` :: 작업 표시명 상수 — 기존 액션·리소스·기능 라벨 재사용; modify
  - `types/admin.ts`, `lib/admin/schemas.ts` :: `AdminAuditEvent`, `NamedCount`, `UsageFeatureSchema` — 기존 타입; read-only

#### Details
- Signatures & Types:
```typescript
interface AuditOperation { id: string; label: string }
type AuditOperationSource = Pick<AdminAuditEvent, "action" | "resource" | "detail">;
function getAuditOperation(event: AuditOperationSource): AuditOperation;
function countAuditOperations(events: readonly AdminAuditEvent[]): NamedCount[];
```
- Data & Schema Fields: AdminAuditEvent의 id/occurredAt/actorId/actorName/actorEmail/departmentId/action/resource/detail/targetId/targetLabel/outcome/failureReason/requestId/usageId/tokens/ip/userAgent는 변경하지 않는다. NamedCount는 id:string, label:string, count:number, failures:number. 새 저장 필드가 아니라 조회 시 파생한다.
- 작업 ID 규칙: `resource:action:operation` 형태의 안정된 식별자. targetId, 사용자 ID, revision ID, 필터 JSON은 넣지 않는다. 알 수 없는 detail은 operation=`other`로 묶고 한국어 리소스+액션 이름으로 표시한다.
- 분류 우선순위:
  1. resource=usage/action=generate이고 detail이 UsageFeatureSchema를 통과하면 operation=해당 feature, label=기존 FEATURE_LABELS(rfp/draft/polish/slides/review).
  2. resource=templates/action=apply이면 operation=apply-template, label=`PPT 서식 적용`. resource=templates/action=export이면 export-pptx/`PPTX 다운로드`. refs JSON은 파싱할 필요가 없다.
  3. resource=audit/action=export이면 export-audit/`활동 로그 CSV 내보내기`. resource=users/action=export이면 export-users/`사용자 목록 CSV 내보내기`. 필터 문자열과 무관하게 동일 분류다.
  4. 알려진 command detail은 아래 표로 분류한다. 정확한 이름 또는 명시한 prefix만 사용하고, resource/action이 맞지 않는 조합은 fallback으로 처리한다.
  5. 나머지는 `${AUDIT_RESOURCE_LABELS[resource]} ${AUDIT_ACTION_LABELS[action]}`로 표시한다. 원문 JSON/영문 명령/제어문자를 label로 반환하지 않는다.

| detail | 한국어 표시 | resource / action |
| --- | --- | --- |
| create-user / add-directory-users | 사용자 등록 / 조직도 사용자 등록 | users / create |
| update-user / change-user-role / set-user-status | 사용자 정보 수정 / 사용자 역할 변경 / 사용자 상태 변경 | users / update |
| delete-users / resend-invite | 사용자 삭제 / 사용자 재초대 | users / delete, update |
| create-group / update-group / delete-group | 그룹 생성 / 그룹 수정 / 그룹 삭제 | groups / create, update, delete |
| undo-delete | 사용자 복구 또는 그룹 복구 | users 또는 groups / restore |
| save-grants | 역할별 권한 변경 | permissions / update |
| save-model-defaults | 기본 모델 변경 | modelSettings / update |
| save-price / save-fx | 모델 단가 변경 / 환율 변경 | pricing / update |
| save-token-policy / set-token-limit / set-token-paused | 전사 토큰 정책 변경 / 개인 토큰 한도 변경 / 토큰 사용 상태 변경 | tokenPolicies / update |
| submit-token-request | 토큰 추가 신청 | tokenRequests / create |
| process-token-request | 토큰 신청 승인 또는 토큰 신청 반려 | tokenRequests / approve, reject |
| create-skill / update-skill | Skill 등록 / Skill 수정 | skills / create, update |
| create-template / update-template | Template 등록 / Template 수정 | templates / create, update |
| set-asset-visibility / set-asset-status | Skill 또는 Template 공개 범위 변경 / 상태 변경 | skills 또는 templates / update |
| delete-asset | Skill 삭제 또는 Template 삭제 | skills 또는 templates / delete |
| duplicate-asset:로 시작 | Skill 복제 또는 Template 복제 | skills 또는 templates / create |

- countAuditOperations는 Map으로 한 번 순회하여 count와 failures(outcome=failure)를 누적한다. 내림차순 count, 동률 stable id 오름차순 정렬. 입력 이벤트를 수정하지 않는다.
- 예외: malformed JSON이나 알 수 없는 detail 때문에 조회가 실패하면 안 된다. 구조를 해석하지 않고 작업 종류로 분류한다.

### I02. 목록·검색·대시보드·CSV에 연결
- Related Files:
  - `lib/admin/selectors.ts` :: `auditRows`, `buildDashboard` — 공통 표시명 검색 및 집계; modify
  - `components/admin/audit/AuditTable.tsx` :: detail column — 사용자용 이름; modify
  - `components/admin/dashboard/ActivityBreakdownPanel.tsx` :: details — service의 label 그대로 사용; modify
  - `services/admin/MockAdminDataService.ts` :: `exportAudit` — 표시명+원문 분리; modify
  - `lib/admin/csv.ts` :: `makeCsv` — 기존 이스케이프/수식 방지; read-only
- 대시보드에서 action/resource 집계는 기존대로, details만 countAuditOperations를 사용한다. 부서·기간·90일 필터를 적용한 후 집계한다. AI 사용량/비용 원장은 변경하지 않는다.
- 로그 대상 검색은 기존 targetLabel/targetId/raw detail 검색에 한국어 operation label도 추가한다. 같은 auditRows 결과를 목록과 CSV가 공유하여 건수가 일치해야 한다.
- AuditTable의 세부 작업은 공통 label. ActivityBreakdownPanel은 다시 raw detail을 UsageFeatureSchema로 해석하지 않는다.
- CSV 기존 14개 열의 순서는 유지한다. 5번째 `세부 작업` 값은 공통 한국어 label로 변경하고 마지막에 15번째 `원본 세부 정보` 열과 기존 raw detail을 추가한다. BOM/CRLF/따옴표/수식 접두사 방지 유지. 기존 action/resource 열의 코드값은 변경하지 않는다.
- exportAudit가 조회 후 자기 내보내기 이벤트 1건을 추가하는 기존 동작은 유지한다. 과거 events의 detail을 덮어쓰지 않는다. AuditDetail의 요청 ID·시간·사용량 연결 표시를 유지한다.

### I03. 의미·보존 회귀 검사
- Related Files:
  - `tests/lib/admin/audit-operation.test.ts` — 분류 표/알 수 없는 입력; new
  - `tests/lib/admin/selectors.test.ts` — 동일 작업 집계·검색·부서/실패; modify
  - `tests/services/admin/MockAdminDataService.test.ts` — CSV와 원본 감사 보존; modify
  - `tests/integration/skill-template-workflow.test.ts` — 적용/다운로드 로그; modify
- 서로 다른 refs JSON의 apply 2건이 하나의 작업 2건으로 집계되고 raw detail은 서로 다른 채 유지. CSV의 필터가 달라도 export-audit로 합쳐진다.
- create-group/update-group은 각각 별개 작업. 승인/반려와 Skill/Template도 별도 id다. 알려진 feature 5개를 유지하고 알 수 없는 원문은 JSON 없이 fallback 표시한다.
- 실패 건수와 합계가 원장과 같고, 타 부서 이벤트는 해당 부서 관리자 결과에 섞이지 않는다. 한국어 작업명 검색 결과가 CSV와 같다.
- CSV 15열, 원문 보존, BOM과 수식 방지. export 후 이벤트 1건 추가를 조회 결과 불일치로 오인하지 않는다.

## Acceptance Criteria
- [x] 목록·대시보드에 JSON 또는 내부 명령이 작업명으로 노출되지 않는다.
- [x] 동일 작업의 refs/필터가 달라도 안정된 종류로 묶인다.
- [x] 감사 원문·검색·CSV·권한·비용 집계가 보존된다.

## Validation
- `npm.cmd test -- tests/lib/admin/audit-operation.test.ts tests/lib/admin/selectors.test.ts tests/lib/admin/csv.test.ts tests/services/admin/MockAdminDataService.test.ts tests/integration/admin-mock-workflow.test.ts tests/integration/skill-template-workflow.test.ts` — 통과.
- `npm.cmd run typecheck` 및 `npm.cmd run lint` — exit 0.
- T07에서 그룹 생성/수정과 PPT 적용 후 로그·대시보드·CSV를 실제 UI로 확인한다.

## Commit Message
```text
fix(admin): 활동 표시명과 작업별 집계 기준 통일

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Task: T06-audit-presentation

- 한국어 작업 분류를 목록·검색·집계에 재사용
- CSV 표시명과 감사 원본 세부 정보 분리
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 검증: 관련 6개 파일 50개 테스트, typecheck, lint 통과. 원본 감사, CSV 15열, 한국어 검색·집계 및 부서 제한 확인.

- 최종 확인: T07 실제 브라우저: 그룹 생성/수정 한국어 검색·집계, 서로 다른 버전 PPT 적용 2건 합산, CSV 15열과 BOM·원문 보존 확인.
