# Task: T02 사용자 식별과 IndexedDB 저장소

## Status: pending

## Goal
등록한 RFP를 로그인 사용자별 네임스페이스로 IndexedDB(`kpc-rfp-register`)에 저장·조회하는 `IndexedDbRfpRepository`와 식별 함수 `resolveRfpIdentity`를 만든다. 새로고침 후에도 데이터가 남고(D06), 다른 계정과 섞이지 않게(D07) 하기 위함이다.

## Decision Summary
- D06: `lib/comments/repository.ts`의 `IndexedDbCommentRepository` 패턴(전용 DB 상수, `factory`/`dbName` 주입, open 경쟁·blocked·versionchange 처리)을 따른다.
- D07: 네임스페이스는 코멘트와 같은 규칙의 사용자 id. 인증 비활성 시 `preview:sodam` 목업 사용자. 시드 RFP 없음.

## Implementation

### I01. 사용자 식별

- Related Files:
  - `lib/rfp/identity.ts` :: `RfpIdentity`, `resolveRfpIdentity` — new
  - `lib/comments/domain.ts` :: `resolveCommentIdentity` — 위임 대상; read-only

```typescript
import type { Session } from "next-auth";
export interface RfpIdentity { namespace: string; actor: { id: string; name: string; isMock: boolean } }
export function resolveRfpIdentity(input: { authEnabled: boolean; session: Session | null; displayName: string }): RfpIdentity | null {
  const identity = resolveCommentIdentity(input);
  return identity ? { namespace: identity.scope.namespace, actor: { ...identity.actor } } : null;
}
```
- 규칙을 복제하지 않고 위임한다(인증 키 우선순위 oid → upn → email이 코멘트와 어긋나지 않게).

### I02. 저장소

- Related Files:
  - `lib/rfp/repository.ts` :: `RfpRepository`, `IndexedDbRfpRepository`, `IndexedDbRfpRepositoryOptions` — new
  - `lib/comments/repository.ts` :: `open()`, `close()` — 연결 관리 코드를 같은 방식으로 작성; read-only

```typescript
export interface RfpRepository {
  list(identity: RfpIdentity): Promise<RfpRecord[]>;      // createdAt 내림차순
  create(identity: RfpIdentity, record: RfpRecord): Promise<RfpRecord>;
  close(): void;
}
export interface IndexedDbRfpRepositoryOptions { dbName?: string; factory?: IDBFactory }
export class IndexedDbRfpRepository implements RfpRepository { constructor(options?: IndexedDbRfpRepositoryOptions) }
```
- DB 스키마(`onupgradeneeded`, version `RFP_DB_VERSION`=1): object store `"rfps"`, `keyPath: ["namespace", "id"]`, index `"byNamespace"` on `"namespace"`.
- 실행 흐름:
  1. 식별 검사: `identity?.namespace?.trim()`·`identity.actor.id?.trim()`이 없으면 `RfpError("unidentified", "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.")`.
  2. `create`: `record.namespace !== identity.namespace` → `RfpError("forbidden", "다른 사용자의 저장 공간에는 등록할 수 없습니다.")`. `RfpRecordSchema.safeParse` 실패 → `RfpError("invalid", ...)`. `readwrite` 트랜잭션에서 `store.add(record)`; `ConstraintError` → `RfpError("conflict", "이미 등록된 RFP입니다.")`. `oncomplete`에서 저장한 레코드를 반환.
  3. `list`: `readonly` 트랜잭션, `index("byNamespace").getAll(namespace)` → 각 행 `RfpRecordSchema.safeParse`, 실패 행은 건너뛰고(손상 데이터로 화면 전체가 막히지 않게) 성공 행만 `createdAt` 내림차순 반환.
  4. open 실패: factory 없음/예외 → `"db_unavailable"` "이 브라우저에서 RFP 저장소를 사용할 수 없습니다.", `onblocked` → `"db_blocked"` "다른 탭의 RFP 등록 화면을 닫고 다시 시도해 주세요.", 기타 → `"storage"` "RFP를 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.".
  5. `close()`: generation 증가, 진행 중 open 취소, 연결 종료(코멘트 저장소와 동일). `onversionchange`에서 자기 연결이면 `close()`.

### I03. 동작 검토 포인트 (테스트 파일 작성 없음)
- 테스트 파일·픽스처·`tests/` 폴더를 만들지 않는다. 구현 후 아래를 코드로 직접 확인한다.
- `resolveRfpIdentity`: 인증 비활성 → namespace `"preview:sodam"`, 인증 활성 + session null → `null`.
- `list`는 `byNamespace` 인덱스로 자기 namespace만 읽고 `createdAt` 내림차순 정렬, 스키마 실패 행은 건너뛴다.
- `create`의 `forbidden`·`invalid`·`conflict`(ConstraintError) 분기와 open 실패 3종(`db_unavailable`·`db_blocked`·`storage`) 메시지.
- `close()` 후 다시 열면 같은 DB를 사용한다(데이터 유지).

## Acceptance Criteria
- [ ] 사용자별로 저장 결과가 분리되고, 재연결 후에도 유지된다.
- [ ] 오류가 모두 `RfpError`의 정해진 code로 나온다.
- [ ] I03 검토 포인트 확인, typecheck·lint 0 error.

## Validation
- `npm.cmd run typecheck` / `npm.cmd run lint` — 0 error
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(rfp): 사용자별 IndexedDB RFP 저장소 추가

Plan: 2026-11-02-rfp-register
Phase: P01-rfp-register-ui
Task: T02-rfp-repository

- 코멘트 식별 규칙에 위임하는 resolveRfpIdentity 추가
- namespace 키 기반 IndexedDbRfpRepository(create/list) 구현
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
