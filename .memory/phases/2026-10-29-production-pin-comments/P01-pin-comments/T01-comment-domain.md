# Task: T01 코멘트 도메인과 멘션 규칙

## Status: done

## Goal

브라우저·React·DB에 의존하지 않는 코멘트 데이터 계약과 상태 전이를 만든다. 첫 의견·답글·멘션·소유권·완료·좌표가 유효한 데이터만 만들도록 하고, 다음 저장소와 UI가 같은 규칙을 사용하게 한다.

## Decision Summary

- Plan: 2026-10-29-production-pin-comments / Phase: P01-pin-comments / 선행 Task 없음.
- 현재 로컬 DB·코멘트 구현은 없다. 화면 코드를 추가하지 않고 도메인 함수와 의미 있는 테스트를 완성한다. 본문 수정/삭제는 본인, 핀 이동·상태 변경은 모든 이용자. 완료 상태는 새 답글만 막는다.
- 프로필 댓글 개수/알림 연동은 사용자가 별도 후속으로 유지했다.

## Existing code context

- config/profile-preview.ts의 PROFILE_PREVIEW_USER.name은 정소담이다. 현재 프로필 UI는 실제 세션 이름 또는 미리보기 이름을 이미 구분한다.
- types/next-auth.d.ts의 Session.user에는 선택적 oid/upn/email/name 및 roles가 있다. 인증 토큰은 저장하지 않는다.
- package.json: TypeScript strict, React19, Next16, Vitest4.1.11. vitest.config.ts는 Node 환경과 tests/**/*.test.ts를 사용하고 @/* alias를 지원한다.
- 파일을 새로 만드는 Task다. 인증·Azure·프로필 상수를 수정하지 않는다. 모든 계획 문서는 .memory 아래에 이미 있으며 이 Task 실행 시 다른 계획을 선택하지 않는다.

## Implementation

### I01. 공통 모델과 작성자 식별

- Related Files:
  - config/comments.ts :: 공통 타입, COMMENT_SURFACE_ID, COMMENT_DB_NAME, COMMENT_DB_VERSION, COMMENT_PLACEHOLDER, COMMENT_VISUALS — new
  - lib/comments/domain.ts :: CommentError, resolveCommentIdentity, normalizeCommentDraft, validateCommentSnapshot, applyCommentCommand, canEditComment, canManageThread, getThreadMessages — new
  - types/next-auth.d.ts :: Session — read-only
  - config/profile-preview.ts :: PROFILE_PREVIEW_USER — read-only

#### Details

**Signatures & Types** — 모든 타입은 config/comments.ts에서 export하고 CommentError 클래스만 domain.ts에서 export한다.

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

function resolveCommentIdentity(input: {
  authEnabled: boolean; session: Session | null; displayName: string;
}): CommentIdentity | null;
function normalizeCommentDraft(draft: CommentDraft, users: readonly CommentUser[]): CommentDraft;
function validateCommentSnapshot(value: unknown, scope: CommentScope): CommentSnapshot;
function canEditComment(message: CommentMessage, actorId: string): boolean;
function canManageThread(thread: CommentThread, actorId: string): boolean;
function getThreadMessages(snapshot: CommentSnapshot, threadId: string): CommentMessage[];
function applyCommentCommand(
  snapshot: CommentSnapshot, actor: CommentUser, command: CommentCommand, now: string
): CommentSnapshot;
~~~

**Data & Schema Fields**

- 위 필드와 null 허용 여부를 그대로 구현한다. 시각은 UTC ISO8601 문자열이며 한국어·이모지 본문을 임의로 변환하지 않는다.
- 위 계약의 모든 필드는 필수이며 옵셔널 필드로 흐리지 않는다. TypeScript 외부에서 들어오는 저장 데이터도 검증한다.
- CommentMention.start는 포함, end는 제외하는 JavaScript UTF-16 문자열 인덱스다. text.slice(start,end)는 정확히 @ + mention.name이다. userId는 users에 존재하며 중복/겹침 범위가 없어야 한다. 같은 사용자 멘션 여러 개는 허용한다.
- scope는 각 thread/message/surface의 namespace+surfaceId와 동일해야 한다. 모든 message는 존재하는 thread에 속한다. thread마다 rootMessageId로 지정한 kind=root 한 개가 있고 authorId가 첫 의견 작성자와 일치한다.
- thread.number는 양의 안전 정수이며 영역 안에서 유일하다. surface.nextNumber는 모든 번호보다 크다. revision은 1부터 증가하는 양의 안전 정수다.
- status=open이면 resolvedAt/resolvedBy는 null, resolved이면 유효 시각/사용자 ID다. createdAt은 불변이며 message.updatedAt은 수정 전 null이다. isSeed는 최초 예시 여부이고 수정해도 기존 값 유지다.
- 상수: COMMENT_SURFACE_ID = production-preview, COMMENT_DB_NAME = kpc-pin-comments, COMMENT_DB_VERSION = 1.
- COMMENT_PLACEHOLDER = 의견 남기기 (@이름 멘션) · Enter 등록.
- COMMENT_VISUALS: red #d7192f, gray #9ca3af, white #fff, pinSize24, pinFontSize10.5, pinFontWeight850, popupDefaultWidth360, popupDefaultHeight360, popupMinWidth320, popupMinHeight240, popupLabelWidth420, mobileBreakpoint760. 값은 새 독립 디자인 시스템이 아니라 코멘트 범위의 상수다.

**Execution Flow / Logic**

1. Precondition & Validation:
   - authEnabled=false이면 actor.id=preview:sodam, actor.name=기존 미리보기 이름, isMock=true, namespace=preview:sodam이다. displayName이 비어 있으면 PROFILE_PREVIEW_USER.name으로 보완한다.
   - authEnabled=true이면 oid → upn → email 순서로 비어 있지 않은 식별자를 찾는다. oid는 entra:oid: 접두사, upn/email은 entra:upn:/entra:email: 접두사와 trim+소문자 값. actor.id와 namespace는 이 식별자다. 이름 fallback은 displayName.trim() 또는 사용자. 안정적 ID가 없으면 null이며 미리보기 사용자로 대체하지 않는다.
   - role/name 변경은 같은 계정의 namespace를 바꾸지 않는다. Session.user.access_token을 결과에 넣지 않는다.
   - normalizeCommentDraft는 trim 후 빈 텍스트면 empty 오류. 선행 공백 제거 길이만큼 멘션 범위를 옮기고 본문/범위를 검사한다. 유효하지 않은 선택 멘션은 invalid 오류로 반환하며 잘못된 범위를 조용히 저장하지 않는다. 원본 draft를 변형하지 않는다.
   - 좌표는 finite 0~1로 검증한다. 드래그 UI의 경계 보정은 별도이며, 도메인에 NaN/Infinity나 범위 밖 값을 허용하지 않는다.
2. Core Processing:
   - snapshot을 검증한 뒤 복사해서 처리한다. actor는 현재 users에 있는 ID여야 한다. 모든 찾기는 현재 snapshot 범위 안에서만 수행한다.
   - create-thread: 두 새 ID가 중복이 아닌지 확인, nextNumber 할당/증가, open/revision1 thread와 root 메시지를 함께 생성한다. 실제 작성자와 표시 이름은 actor에서 가져온다. command에 타인 authorId를 받지 않는다.
   - reply: 해당 thread가 open인지 확인하고 actor의 reply를 추가한다. thread.updatedAt/revision을 증가시킨다.
   - edit-message: 본인 여부, expectedRevision 일치, 유효한 변경을 확인한다. text/mentions, updatedAt, revision만 바꾸고 createdAt/authorId/authorName은 유지한다. 부모 thread도 updatedAt/revision 증가. 완료된 대화의 본인 메시지 수정은 허용한다.
   - delete-message: kind=reply이고 본인·revision 일치인 경우에만 삭제. root 단독 삭제는 invalid. 부모 thread 갱신.
   - delete-thread: 첫 의견 작성자만 가능하며 thread revision 일치가 필요하다. thread와 소속 메시지 전부 삭제한다. surface.nextNumber/seedVersion은 유지한다.
   - move-thread: 작성자 제한 없이 현재 thread revision을 확인하고 좌표/updatedAt/revision을 변경한다. 완료된 핀도 이동 가능하다.
   - set-status: 작성자 제한 없이 revision 확인, open→resolved 시 resolvedAt=now/resolvedBy=actor.id, resolved→open 시 두 필드 null. 명시한 목표 상태가 현재와 같으면 데이터와 revision을 그대로 반환한다.
   - 실제 변경이 없는 edit/move도 불필요한 revision 증가를 만들지 않는다. UI의 비활성과 별개로 저장소 호출에도 같은 규칙을 적용한다.
3. Error & Exception Handling:
   - 빈 본문 empty, 잘못된 구조/시간/좌표/초안 invalid, 타인 내용 관리 forbidden, 없는 대상 not_found, revision 불일치 conflict, 완료 대화 답글 resolved.
   - 모든 실패는 CommentError로 던지고 입력 snapshot을 변경하지 않는다. 한국어 message는 UI에 바로 보여 줄 수 있는 짧은 문장으로 제공한다. conflict는 다시 열어 최신 내용을 확인하라는 안내다.
4. State Transition & Return:
   - 성공은 새 CommentSnapshot, 무변경은 기존 snapshot 반환을 허용한다. threads는 number 오름차순, 메시지는 root 우선 후 createdAt/id 정렬로 일관되게 조회한다.
   - 현재 사용자는 로컬 동작의 actor이며 서버 보안 검증을 대체하지 않는다.

### I02. 멘션 입력과 안전한 텍스트 분해

- Related Files:
  - lib/comments/mentions.ts :: findMentionQuery, insertMention, reconcileMentionEdits, splitCommentText — new

#### Details

**Signatures & Types**

~~~typescript
interface MentionQuery { start: number; end: number; query: string }
type CommentTextPart =
  | { kind: "text"; text: string }
  | { kind: "mention"; text: string; userId: string };
function findMentionQuery(draft: CommentDraft, selectionStart: number, selectionEnd: number): MentionQuery | null;
function insertMention(draft: CommentDraft, query: MentionQuery, user: CommentUser): { draft: CommentDraft; caret: number };
function reconcileMentionEdits(previous: CommentDraft, nextText: string): CommentDraft;
function splitCommentText(draft: CommentDraft): CommentTextPart[];
~~~

**Data & Schema Fields**

- MentionQuery.start는 @ 위치, end는 교체할 현재 토큰의 끝이다. query는 @ 다음부터 caret까지의 이름 검색어다.
- textarea의 selectionStart/End와 동일한 UTF-16 인덱스를 사용한다. 가공된 HTML이나 contenteditable DOM을 저장하지 않는다.

**Execution Flow / Logic**

1. Precondition & Validation: caret 범위가 유효하고 선택 영역이 접혀 있어야 한다. 문자열 시작/공백 뒤의 @ 토큰만 검색한다. email의 @나 이미 선택된 멘션 안에서는 목록을 열지 않는다.
2. Core Processing:
   - query의 끝은 caret 뒤 같은 토큰의 나머지까지 포함하여 중간 편집 시 잔여 이름을 남기지 않는다. 공백/다른 @를 만나면 토큰이 끝난다.
   - insertMention은 해당 토큰을 @이름 + 공백으로 교체하고 새 멘션 범위를 기록한다. 겹친 기존 멘션은 제거, 뒤 멘션은 길이 차만큼 이동, caret은 새 공백 뒤다.
   - reconcileMentionEdits는 이전/이후 문자열의 공통 접두·접미로 변경 구간을 구한다. 구간 앞의 멘션 유지, 뒤의 멘션 인덱스 이동, 내부를 편집한 멘션의 메타데이터 제거. 텍스트는 사용자 편집 그대로 남긴다.
   - 선택하지 않은 @문자열은 일반 텍스트다. splitCommentText는 정렬된 유효 범위에 따라 text/mention 조각을 반환한다. React 문자열로 출력하도록 하고 HTML 파싱을 만들지 않는다.
3. Error & Exception Handling: 잘못된 caret/query는 null 또는 명확한 invalid 오류로 처리한다. normalize와 다른 인덱스 정의를 도입하지 않는다.
4. State Transition & Return: 입력 배열을 변형하지 않은 새 draft/parts를 반환한다.

### I03. 최초 한 번 저장할 예시 묶음

- Related Files:
  - lib/comments/seed.ts :: createCommentSeed — new
  - config/profile-preview.ts :: PROFILE_PREVIEW_USER — read-only

#### Details

~~~typescript
function createCommentSeed(identity: CommentIdentity, now: string): CommentSnapshot;
~~~

- users: 현재 actor, mock:kim-minsu/김민수, mock:lee-seoyeon/이서연. 가상 동료는 isMock=true. 이름이 아니라 ID로 중복 제거한다.
- surface: scope, seedVersion1, nextNumber3, createdAt=now.
- 번호1: id=seed-thread-open, rootMessageId=seed-message-open, actor 작성, 좌표(.25,.30), open. 첫 의견: 제목 문구를 더 간결하게 다듬어 주세요.
- 번호2: id=seed-thread-resolved, rootMessageId=seed-message-resolved, 김민수 작성, 좌표(.68,.58), resolved. 첫 의견: 문구 수정 사항을 반영했습니다.
- 번호1 답글 id=seed-reply-open: 김민수 작성, @현재작성자이름 예시 답글입니다. 이 방향으로 확인하겠습니다. 현재 actor 멘션의 정확한 범위 기록.
- 번호2 답글 id=seed-reply-resolved: actor 작성, @김민수 반영한 내용을 확인했습니다. 김민수 멘션 포함.
- timestamp는 now에서 정해진 과거 분을 빼서 root→reply→resolved 순서를 지킨다: 번호1 root -30분/reply -25분, 번호2 root -120분/reply -60분/완료 -30분. thread.updatedAt은 마지막 활동 시각. revision1, 모든 예시 isSeed=true.
- thread/message ID는 namespace+surfaceId와 묶인 키로 저장하므로 다른 계정의 예시와 충돌하지 않는다. 함수는 저장 여부 판단을 하지 않는다. 최초 1회 보장은 T02의 transaction/meta 책임이다.

### I04. 도메인 및 멘션 검증

- Related Files:
  - tests/lib/comments/domain.test.ts :: identity, seed, commands, invariants — new
  - tests/lib/comments/mentions.test.ts :: selection, ranges, edits — new

#### Details

- 고정 ISO 시각과 seed를 사용하고 Date.now나 Math.random에 의존하지 않는다.
- auth on/off, oid/upn/email fallback, 식별 실패, 이름/role 변화에도 동일 ID, namespace 혼입 거부.
- 첫 의견+핀 동시 생성/증가 번호, root 삭제 거부, 본인 reply 삭제, 타인 본문 수정/대화 삭제 거부, 타인 핀 이동/완료/재개 허용.
- 완료된 대화의 새 답글 거부와 기존 본인 글 수정 허용, 생성 시각 유지, 무변경 revision 유지, 오래된 revision 충돌, 모든 오류에서 입력 불변.
- seed root/author/상태/멘션/번호 정합성, 전체 삭제 후 nextNumber3 유지.
- blank/whitespace, emoji 앞의 UTF-16 인덱스, 한글 이름, 여러 멘션, email @ 무시, 중간 토큰 선택, 멘션 앞 삽입/내부 삭제/뒤 이동, 앞뒤 trim, 겹침/위조 userId/불일치 텍스트 거부.
- 상태만 그대로 복사하는 테스트 대신 사용자 동작과 데이터 불변 조건을 검증한다.

## Acceptance Criteria

- [x] 모든 신규 타입·함수가 export되고 React/DB/global window 없이 Node에서 실행된다.
- [x] 작성자 소유권과 모두에게 허용하는 핀 작업이 구분된다.
- [x] 멘션 offsets·trim·일반 텍스트의 규칙이 일관된다.
- [x] 첫 의견/답글 관계·번호·시간·revision·완료 상태의 데이터 무결성을 검증한다.
- [x] 예시는 결정된 진행 중/완료·본인/타인·답글·멘션을 포함한다.

## Validation

- npm.cmd test -- tests/lib/comments/domain.test.ts tests/lib/comments/mentions.test.ts — 신규 의미 있는 테스트 통과.
- npm.cmd run typecheck — 신규 모델과 strict 타입 검사 통과.
- npx.cmd eslint config/comments.ts lib/comments/domain.ts lib/comments/mentions.ts lib/comments/seed.ts tests/lib/comments/domain.test.ts tests/lib/comments/mentions.test.ts — 오류 없음.
- git diff --check — 공백 오류 없음. 이 Task는 UI를 연결하지 않으므로 브라우저 완료를 주장하지 않는다.

## Commit Message

~~~text
feat(comments): 핀 코멘트 모델과 멘션 규칙 정의

Plan: 2026-10-29-production-pin-comments
Phase: P01-pin-comments
Task: T01-comment-domain

- 코멘트 모델과 작성자별 관리 및 완료 상태 규칙 추가
- 멘션 범위 처리와 최초 예시 데이터 검증
~~~

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 파일을 완료 처리한 커밋 (git log -1 --format=%h -- 해당 파일로 조회)

## Execution Result

- 도메인·멘션 테스트 2개 파일 34개 통과. typecheck·대상 ESLint·diff check 통과.
- 기존 Vitest 설정의 향후 Vite native config 경고는 기능 범위 밖으로 기록했다.
- UI/DB 연결 전이며 실제 브라우저 검증은 후속 Task 대상이다.
