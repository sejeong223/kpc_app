# Task: T01 슈퍼 관리자 고정 권한과 편집 화면

## Status: done

## 수정 파일·심볼

- `config/admin-permissions.ts`: `SUPER_ADMIN_ROLE_GRANTS: RoleGrants`, `CRUD_CEILING`. 기존 `ceiling("super_admin")`을 고정 권한의 단일 원본으로 재사용한다.
- `lib/admin/permissions.ts`: `canPerform(actor: AdminActor, rows: readonly RoleGrants[], resource: AdminResource, action: CrudAction): boolean`. 슈퍼 관리자는 상한의 지원 작업을 허용하고 저장된 grants는 무시한다.
- `lib/admin/command-validation.ts`: `validateGrants(rows: readonly RoleGrants[]): void`. 슈퍼 관리자 각 resource/action은 고정값과 같아야 한다. 변조는 `AdminDataError("VALIDATION", ...)`로 거절한다.
- `services/admin/MockAdminDataService.ts`: constructor. Zod로 seed 구조를 검증한 뒤 슈퍼 관리자 항목을 고정값의 깊은 복사로 교체한다. 누락·중복 슈퍼 항목도 하나로 정상화한다. seed 원본은 수정하지 않는다.
- `components/admin/users/RolePermissionsPanel.tsx`: 슈퍼 관리자 section을 조건부 렌더에서 제외하고 고정 권한 안내를 표시한다. 관리자·일반 사용자 폼과 저장의 3역할 payload·revision은 유지한다.

## 타입·모델·범위

- `AdminRole = "super_admin" | "department_admin" | "user"` 및 `RoleGrants = { role: AdminRole; grants: Record<AdminResource, Record<CrudAction, boolean>> }` 유지.
- 새 DTO·DB 스키마·라이브러리·API 없음. unsupported CRUD 작업을 새로 허용하지 않는다.
- 활성 계정·부서 범위·자기 삭제 금지·낙관적 동시성·관리자/사용자 상한은 유지한다.

## 로컬 회귀 검사

- `tests/lib/admin/permissions.test.ts`: 낮춰진/없는 저장값에도 슈퍼 관리자의 지원 작업 허용, 미지원 작업 거부, 다른 역할 상한 유지.
- `tests/services/admin/MockAdminDataService.test.ts`: 구상태 정상화, 모든 지원 권한의 낮추기 거절, 실패 시 revision/로그 유지, 관리자 권한 저장과 반영 유지.
- `tests/components/admin/role-permissions.test.ts`: 슈퍼 관리자 표/체크박스 미렌더, 두 역할 표·안내 표시, 관리자 체크 해제·저장 후 슈퍼 권한 불변.
- 기존 `TemplateWorkService.races` 등의 권한 회귀도 전체 suite에서 재검사한다.

## 검증 커맨드

- `npm.cmd test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`, `git diff --cached --check`
- 기존 정책: 테스트 로컬 보관, 브라우저 검증 미실시.

## 커밋 메시지

```text
fix(admin): 슈퍼 관리자 권한을 전체 허용으로 고정

Plan: 2026-11-02-super-admin-fixed-permissions
Phase: P01-fixed-super-admin
Task: T01-fixed-super-admin

- 역할별 권한 편집은 관리자와 일반 사용자만 표시
- 슈퍼 관리자 지원 권한 고정 및 기존 상태 정상화
- 권한 변조·일반 역할 편집 회귀를 로컬에서 검증
```

## 완료

- [x] 구현
- [x] 검증
- [x] 메모리 동기화·이 Task의 단일 커밋에 포함
- commit: Plan 헤더로 git log 조회

## 실행 기록

- 화면: 슈퍼 관리자 표/체크박스를 렌더하지 않고 고정 권한 안내를 표시한다. 관리자·일반 사용자 표와 저장 동작을 유지한다.
- 실제 권한: `canPerform`이 슈퍼 관리자의 저장된 체크값을 무시하고 기존 지원 작업 상한을 사용한다. mock seed의 이전 해제값/누락/중복은 고정값 하나로 복구하며 seed 원본은 보존한다.
- 저장 검증: 슈퍼 관리자 권한의 변경을 모두 거절한다. 다른 역할의 상한과 조회 의존성, revision 충돌 정책을 유지한다.
- 검증: 관련3파일19테스트 통과 후 전체77파일583테스트 통과. typecheck/lint/Next 프로덕션 build/diff 검사 통과.
- 테스트 변경3파일은 로컬에만 보관한다. 브라우저 검증은 기존 정책대로 미실시. 현재 mock 권한 검증 결과이며 실제 서버 보안 검증으로 간주하지 않는다.
- 인접 발견: 기존 슈퍼 관리자의 권한을 실제로 해제할 수 있던 경로를 이번 요구에 따라 함께 수정했다. 기존 Vite 설정 loader 경고와 baseline-browser-mapping 데이터 경고는 실패가 아니며 의존성 변경은 하지 않았다.
- 구현5파일과 메모리 문서를 단일 로컬 커밋한다. 이번 변경은 push하지 않는다. 실제 hash는 로컬 current와 완료 응답에 기록한다.
