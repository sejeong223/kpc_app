# Task: T02 IndexedDB 저장소와 복원

## Status: done

## Goal

실제 브라우저 IndexedDB API를 사용하는 코멘트 저장소를 만들고, 초기화·작성·수정·이동·완료·삭제 결과를 DB를 다시 열어도 복원한다. 실패한 저장은 부분 데이터나 거짓 성공 상태를 남기지 않는다.

## Decision Summary

- Plan: 2026-10-29-production-pin-comments / Phase: P01-pin-comments. 선행 T01 완료.
- 브라우저 DB kpc-pin-comments v1, 사용자 namespace + 제작 surface 단위 저장. 원본 의견과 답글은 별도 레코드지만 관련 작업은 transaction으로 함께 반영한다.
- 최초 예시는 한 번만 넣는다. 초안·팝업 크기·인증 토큰을 저장하지 않는다. 서버/API/Cosmos 작업은 없다.

## Prerequisite Contract

공통 모델은 config/comments.ts, CommentError/검증/전이는 lib/comments/domain.ts, 예시는 lib/comments/seed.ts에서 제공한다.

~~~typescript
type CommentStatus = "open" | "resolved";
interface CommentScope { namespace: string; surfaceId: "production-preview" }
interface CommentUser { id: string; name: string; isMock: boolean }
interface CommentIdentity { scope: CommentScope; actor: CommentUser }
interface CommentPoint { xRatio: number; yRatio: number }
interface CommentMention { userId: string; name: string; start: number; end: number }
interface CommentDraft { text: string; mentions: CommentMention[] }
interface CommentSurface extends CommentScope {
  seedVersion: 1; nextNumber: number; createdAt: string;
}
interface CommentThread extends CommentScope, CommentPoint {
  id: string; number: number; rootMessageId: string; authorId: string;
  status: CommentStatus; createdAt: string; updatedAt: string;
  resolvedAt: string | null; resolvedBy: string | null;
  revision: number; isSeed: boolean;
}
interface CommentMessage extends CommentScope, CommentDraft {
  id: string; threadId: string; kind: "root" | "reply";
  authorId: string; authorName: string; createdAt: string; updatedAt: string | null;
  revision: number; isSeed: boolean;
}
interface CommentSnapshot {
  scope: CommentScope; surface: CommentSurface; users: CommentUser[];
  threads: CommentThread[]; messages: CommentMessage[];
}
type CommentErrorCode =
  | "empty" | "invalid" | "forbidden" | "not_found" | "conflict"
  | "resolved" | "unidentified" | "db_unavailable" | "db_blocked" | "storage";
class CommentError extends Error {
  readonly code: CommentErrorCode;
  constructor(code: CommentErrorCode, message: string, options?: ErrorOptions);
}
type CommentCommand =
  | { type: "create-thread"; threadId: string; messageId: string; point: CommentPoint; draft: CommentDraft }
  | { type: "reply"; threadId: string; messageId: string; draft: CommentDraft }
  | { type: "edit-message"; messageId: string; expectedRevision: number; draft: CommentDraft }
  | { type: "delete-message"; messageId: string; expectedRevision: number }
  | { type: "delete-thread"; threadId: string; expectedRevision: number }
  | { type: "move-thread"; threadId: string; expectedRevision: number; point: CommentPoint }
  | { type: "set-status"; threadId: string; expectedRevision: number; status: CommentStatus };

function validateCommentSnapshot(value: unknown, scope: CommentScope): CommentSnapshot;
function applyCommentCommand(snapshot: CommentSnapshot, actor: CommentUser, command: CommentCommand, now: string): CommentSnapshot;
function createCommentSeed(identity: CommentIdentity, now: string): CommentSnapshot;
~~~

- 전체 field는 필수, null은 명시된 곳만 허용한다. 시각은 ISO UTC, mentions 범위는 UTF-16 start 포함/end 제외이며 텍스트의 @이름과 일치한다.
- thread마다 정확히 rootMessageId에 해당하는 root 한 개. number/revision/nextNumber는 양의 안전 정수. 완료 상태는 resolvedAt/resolvedBy를 갖는다.
- 도메인 apply는 불변 함수다. 본인 글 수정/삭제, 첫 의견 작성자의 thread 전체 삭제, 누구나 핀 이동·완료/재개, 완료 thread의 새 답글 거부, expectedRevision 비교를 처리한다.
- create-thread/reply는 외부에서 생성한 ID를 command에 받아 저장 재시도 때 대상을 식별할 수 있다. 도메인 오류 시 원본 snapshot 불변.
- seed는 scope별 두 thread(number1 본인/open/.25,.30, number2 김민수/resolved/.68,.58), 각 root+reply, 현재 actor/김민수/이서연 users, surface.seedVersion1/nextNumber3이다.
- 현재 테스트 환경은 Node이므로 native indexedDB가 없다. fake-indexeddb는 이 구현의 테스트에서만 쓰며 앱 코드에는 import하지 않는다.

## Implementation

### I01. 저장소 API와 스키마

- Related Files:
  - lib/comments/repository.ts :: CommentRepository, IndexedDbCommentRepository, StoredCommentUser — new
  - config/comments.ts :: 모델과 DB 상수 — read-only
  - lib/comments/domain.ts :: validation/command execution — read-only
  - lib/comments/seed.ts :: createCommentSeed — read-only

#### Details

**Signatures & Types**

~~~typescript
interface CommentRepository {
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}
interface IndexedDbCommentRepositoryOptions {
  dbName?: string; factory?: IDBFactory; now?: () => string;
}
class IndexedDbCommentRepository implements CommentRepository {
  constructor(options?: IndexedDbCommentRepositoryOptions);
  load(identity: CommentIdentity): Promise<CommentSnapshot>;
  execute(identity: CommentIdentity, command: CommentCommand): Promise<CommentSnapshot>;
  close(): void;
}

interface StoredCommentUser extends CommentUser { namespace: string }
~~~

**Data & Schema Fields**

| Store | keyPath | indexes | payload |
| --- | --- | --- | --- |
| surfaces | [namespace, surfaceId] | 없음 | CommentSurface |
| users | [namespace, id] | byNamespace: namespace | StoredCommentUser |
| threads | [namespace, surfaceId, id] | bySurface: [namespace,surfaceId]; byNumber unique: [namespace,surfaceId,number] | CommentThread |
| messages | [namespace, surfaceId, id] | bySurface: [namespace,surfaceId]; byThread: [namespace,surfaceId,threadId] | CommentMessage |

- options.dbName 기본은 config의 kpc-pin-comments, DB version=1. options.factory를 주입받거나 메서드 실행 시 globalThis.indexedDB를 확인한다. 모듈 import/클래스 생성만으로 window/DB에 접근하지 않는다.
- options.now 기본은 현재 UTC ISO 시각 함수. 테스트에서는 고정 함수를 주입한다.
- users는 namespace 단위, 나머지는 namespace+surface 단위로 조회한다. snapshot.users를 반환할 때 namespace 필드는 제거한다.
- seedVersion은 명시적인 초기화 표식이다. threads가 0개인 조건으로 seed를 넣지 않는다.
- 새 버전 변경은 onupgradeneeded에서 구조만 만든다. 업그레이드 중 임의 샘플 저장·기존 DB 삭제/재생성·데이터 초기화를 하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: identity는 안정적인 actor.id/name과 올바른 namespace/surfaceId를 가진다. DB에 해당 scope 키만 요청한다. 타 scope 레코드가 섞이면 invalid로 처리한다.
2. Core Processing:
   - 인스턴스당 open Promise/connection 한 개를 재사용한다. onupgradeneeded에서 필요한 네 stores/indexes를 생성한다.
   - 성공한 connection의 onversionchange는 close하고 연결 캐시를 비운다. 후속 호출이 다시 열 수 있게 한다.
   - close()는 현재 connection과 진행 중 open 세대를 정리한다. 늦은 onsuccess가 오면 사용하지 않고 해당 connection을 즉시 닫는다.
3. Error & Exception Handling:
   - API 없음/브라우저 거부는 db_unavailable, open blocked는 db_blocked, request/transaction I/O 실패는 storage.
   - blocked 시 다른 탭을 닫고 다시 시도하라는 한국어 오류를 반환한다. pending open 요청이 뒤늦게 성공해도 누수 없이 닫는다.
   - 실패한 open Promise를 영원히 캐시하지 않는다. versionchange/close 이후 재시도 가능해야 한다. 데이터 자동 삭제로 해결하지 않는다.
4. State Transition & Return: open 자체가 성공을 의미하지 않는다. load/execute 결과는 각각 transaction.oncomplete 후 resolve한다.

### I02. 최초 로드와 원자적 명령 실행

- Related Files:
  - lib/comments/repository.ts :: load, execute, transaction 읽기/쓰기 보조 함수 — new

#### Details

**Signatures & Types**: I01의 load/execute를 구현한다. 공개 반환값은 항상 저장이 확정된 전체 CommentSnapshot이며 내부 요청 객체를 UI로 노출하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation:
   - load는 surfaces/users/threads/messages의 readwrite transaction 한 개로 초기화 여부를 검사한다. 여러 연결이 동시에 처음 load해도 같은 stores의 쓰기 transaction이 직렬 처리되므로 샘플 중복이 없어야 한다.
   - surfaces 키가 없을 때만 createCommentSeed를 호출한다. 해당 scope에 thread/message만 남은 깨진 상태를 발견하면 invalid로 실패시켜 새 예시로 덮지 않는다.
2. Core Processing — load:
   - seed가 필요한 경우 surface·users·두 thread·네 message를 동일 transaction에 저장한다.
   - 이미 초기화된 경우 bySurface/byNamespace index로 현재 scope snapshot을 읽는다. 현재 actor의 표시 이름은 users 레코드만 갱신하고, 과거 메시지 authorName 스냅샷은 유지한다.
   - snapshot을 검증하고 transaction 완료 뒤 반환한다. seedVersion/nextNumber도 포함한다.
3. Core Processing — execute:
   - 같은 네 stores를 포함하는 한 readwrite transaction에서 최신 snapshot을 읽는다. 호출 전에 UI가 갖고 있던 snapshot으로 DB 전체를 덮지 않는다.
   - actor 정보 갱신과 검증 후 applyCommentCommand(snapshot, actor, command, now)를 동기 실행한다.
   - diff에 해당하는 add/put/delete만 queue한다. create-thread는 증가한 surface와 새 thread+root, reply는 reply+parent thread, edit/delete reply는 message+parent thread, move/status는 thread, thread 삭제는 thread와 소속 message 전체를 처리한다.
   - 사용하지 않는 표면/다른 namespace의 레코드를 clear하거나 지우지 않는다. thread 삭제 뒤 surface와 users는 유지한다.
   - 성공 반환용 snapshot은 같은 transaction 안에서 계산한 값이다. commit 후 별도 read 실패를 쓰기 실패로 오인해 재전송시키는 구조를 만들지 않는다.
   - 생성한 번호가 다른 연결의 번호와 겹치지 않도록 nextNumber 읽기/증가/쓰기 모두 같은 transaction 안에서 수행한다. revision 충돌은 domain의 conflict로 반환한다.
4. Error & Exception Handling:
   - 도메인 예외는 transaction을 abort하고 원래 CommentError code를 보존한다.
   - 일부 request 성공 뒤라도 transaction abort면 모든 변경 실패다. individual request.onsuccess에서 상위 Promise를 resolve하지 않는다.
   - request를 등록하는 콜백에서 동기 예외가 나면 abort한다. transaction 안에 fetch/timer/별도 비동기 작업을 await하지 않는다. IndexedDB request 이벤트와 그 후속 request만 이어 간다.
   - 오류가 난 load를 빈 DB로 처리하거나 메모리 seed를 성공 데이터처럼 반환하지 않는다.
5. State Transition & Return: readonly 형태의 전체 snapshot을 반환한다. 동일 command의 중복 ID, 오래된 revision, 완료 상태의 reply는 명확히 실패한다. 로컬 UI controller는 이 결과를 받아 화면을 갱신한다.

### I03. 저장소 검증 의존성과 테스트

- Related Files:
  - package.json :: devDependencies.fake-indexeddb — modify
  - package-lock.json :: lockfile — modify
  - tests/lib/comments/repository.test.ts :: IndexedDB behavior — new
  - vitest.config.ts :: 기존 Node 환경 — read-only

#### Details

**Dependencies**

- 구현 시 실행할 명령: npm.cmd install --save-dev --save-exact fake-indexeddb@6.2.6.
- 버전은 계획 시 npm registry에서 존재/Node>=18을 확인했다. 현재 Node v24.19.0. package.json/lockfile을 함께 갱신한다. 런타임 dependency나 전체 테스트 환경 jsdom 전환은 필요 없다.
- 테스트는 fake-indexeddb에서 IDBFactory를 import해 각 테스트에 new IDBFactory()를 만든다. 같은 factory/dbName으로 인스턴스를 재생성하여 실제 저장 복원을 검사한다. 전역 fake-indexeddb/auto로 모든 테스트를 오염시키지 않는다.

**Test scenarios**

1. 빈 factory에서 load하면 예시2개+메시지4개+사용자3개, 두 연결의 동시 load도 동일 개수.
2. create-thread/reply/edit/move/resolve/reopen 후 close → 새 repository.load 결과에 변경이 남고 시각·번호·멘션·revision이 일치.
3. 타인 글 수정·삭제 실패, 타인 thread move/status 성공. 완료 reply 거부. domain 오류 전후 DB snapshot 동일.
4. 첫 의견 작성자의 thread 삭제는 해당 reply까지 제거, 다른 thread/다른 namespace/메타데이터 유지.
5. 테스트 fixture를 각 작성자 actor로 삭제하여 모든 thread를 비운 뒤 load해도 샘플 없음. nextNumber 유지, 다음 생성번호3. UI에 타인 삭제 우회 기능을 추가하지 않는다.
6. 사용자 namespace 두 개의 동일 seed ID가 공존하며 조회/명령이 섞이지 않는다. 번호·seed 초기화도 분리.
7. 두 repository가 각각 최신 snapshot을 읽어 같은 대상 revision으로 수정하면 먼저 저장한 쪽만 성공하고 나머지는 conflict. 동시 신규 thread 두 개는 서로 다른 순번.
8. write 중 thread add 이후 message add 오류를 주입해 abort시키고 재개방하면 둘 다 없는지 검증. 진짜 transaction의 rollback을 확인하며 단순 mock return값 비교로 대체하지 않는다.
9. API 없음/열기 오류/blocked/늦은 open success 정리와 재시도, invalid stored structure에서 seed로 덮지 않는 동작.
10. 역할 이름·작성자 표시 이름 변경이 기존 데이터 소유권/namespace를 바꾸지 않는지 확인.

## Acceptance Criteria

- [x] 브라우저 네이티브 저장소를 사용하며 테스트 adapter는 앱 번들에 포함되지 않는다.
- [x] DB 재개방 후 모든 등록 변경이 복원된다.
- [x] 샘플 초기화·대화 생성·전체 삭제의 원자성과 번호 유일성을 검증한다.
- [x] 저장 실패·도메인 권한 오류·revision 충돌을 구분하고 부분 성공으로 숨기지 않는다.
- [x] 전체 삭제 후 빈 상태를 보존하고 다른 계정 데이터는 건드리지 않는다.

## Validation

- npm.cmd test -- tests/lib/comments/repository.test.ts tests/lib/comments/domain.test.ts tests/lib/comments/mentions.test.ts — 저장소 및 기존 도메인 통과.
- npm.cmd run typecheck — DOM IndexedDB 타입과 strict 검사 통과.
- npx.cmd eslint lib/comments/repository.ts tests/lib/comments/repository.test.ts — 오류 없음.
- git diff --check — 공백 오류 없음.
- 실제 브라우저 IndexedDB 영속성은 T04에서 최종 검증한다. Node fake 통과만으로 브라우저 검증 완료를 기록하지 않는다.

## Commit Message

~~~text
feat(comments): IndexedDB 저장과 복원 구현

Plan: 2026-10-29-production-pin-comments
Phase: P01-pin-comments
Task: T02-indexeddb-repository

- 사용자별 코멘트와 예시 데이터를 원자적으로 저장
- 재개방과 삭제 및 저장 실패 회귀 검증
~~~

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: git log -1 --format=%h --grep='Task: T02-indexeddb-repository'

## Execution Result

- 저장소 11개 테스트와 기존 도메인·멘션을 합한 45개 테스트 통과. typecheck·대상 ESLint·diff check 통과.
- 동시 초기화·번호 할당, 재개방 복원, 부분 쓰기 롤백, 빈 상태 보존, 권한·revision 충돌·연결 재시도를 검증했다.
- 테스트 전용 fake-indexeddb 6.2.6을 추가했다. 설치 audit은 의존성 취약점 25건을 보고했으며, 전체 의존성 보안 업데이트는 이 기능 범위 밖이므로 자동 수정하지 않았다.
- 실제 브라우저 영속성은 T04에서 검증한다.
