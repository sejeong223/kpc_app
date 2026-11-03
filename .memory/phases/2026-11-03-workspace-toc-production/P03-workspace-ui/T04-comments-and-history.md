# Task: T04-comments-and-history 슬라이드 의견과 이전 의견 보관

## Status: done

## Goal
새 의견을 프로젝트·회차·슬라이드에 연결하고 기존 전역 의견은 생성/수정 없이 읽기 전용으로 보관한다.

## Decision Summary
- D06/D11/D15: 기존 production-preview 좌표를 새 slide에 자동 배치하지 않는다.
- 새 의견은 프로젝트 집계의 일부로 저장하되, 완성 이후 의견은 별도 reviews에 기록하여 snapshot을 바꾸지 않는다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 프로젝트 스레드·핀·멘션
- Related Files:
  - `components/workspace/production/comments/ProjectComments.tsx`, `ProjectCommentThread.tsx`, `ProjectCommentPins.tsx`, `ReviewRequestDialog.tsx` — new
  - `hooks/workspace/use-project-comments.ts` — new
  - `lib/workspace/production/comment-selectors.ts` — new
  - `components/comments/CommentComposer.tsx`, `CommentMessage.tsx`, `CommentPin.tsx`, `CommentActionsMenu.tsx` — reuse; 표시 props 분리에 한해 modify
  - `lib/comments/mentions.ts`, `geometry.ts`, `format.ts`, `domain.ts::normalizeCommentDraft` — reuse
  - `types/workspace-production.ts`, `lib/workspace/production/schemas.ts`, `domain.ts` — 삭제표식·권한 검증 보강
#### Details
**Signatures & Types**
```typescript
interface ProjectCommentView {
 threads:ProjectCommentThread[];openCount:number;readOnly:boolean;review:boolean;
 canCreate:boolean;canResolve:boolean;editableMessageIds:string[];movableThreadIds:string[];
}
function selectProjectComments(view:ProjectView,slideId:string,snapshotId:string|null):ProjectCommentView;
interface ProjectCommentsProps {view:ProjectView;slideId:string;snapshotId:string|null}
interface ProjectCommentPinsProps extends ProjectCommentsProps {surfaceRef:React.RefObject<HTMLElement|null>}
interface CommentMessageDisplay extends Pick<CommentMessage,"id"|"text"|"mentions"|"authorId"|"authorName"|"createdAt"|"updatedAt"> {deleted?:boolean}
```
- ProjectCommentThread={id,sectionId,slideId,round,number,authorId,status,point:{xRatio,yRatio}|null,createdAt,updatedAt,resolvedBy,resolvedAt,revision,carriedFromId,messages}. message={id,threadId,authorId,authorName,text,mentions,createdAt,updatedAt,revision,`deletedAt:string|null`}. deletedAt는 P01부터 선언한 새 프로젝트 의견 필드다. 기존 전역 의견 스키마에는 이 필드를 저장하거나 이관하지 않는다.
- 기존 CommentMessageView가 전체 legacy CommentMessage를 요구하는 곳은 표시용 Pick으로 좁혀 두 모델을 모두 받는다. 새thread에 fake legacy surfaceId를 달아 저장하지 않는다. CommentComposer/mentions/geometry는 controlled props로 재사용한다.
- 생성/답글은 프로젝트참여자, 자기메시지수정/삭제/자기핀 이동만. 반영완료/재열기는 담당/PM/슈퍼. 권한없는 메뉴는 렌더하지 않는다. finished thread에는 답글/수정을 막고 허용사용자에게 재열기 경로 제공.
- 루트 삭제시 타인답글이 있으면 tombstone(text=삭제된 의견입니다,mentions=[],deletedAt=context.now)을 남기고 재수정/핀 이동은 금지한다. 답글없는루트는 스레드삭제, 자신의reply삭제는 해당reply만. PM/슈퍼라도 타인메시지의내용을 편집/삭제할 권한을 추가하지 않는다.
- 멘션대상은 현재프로젝트 members만 CommentUser로 변환한다. normalizeCommentDraft로 text범위/중복/실제name·ID를 검증한다. 문자열 @이름을 실제알림으로 처리하지 않는다. Enter submit/Shift+Enter newline/IME중미전송/제안목록 keyboard 동작을 유지한다.
- pin좌표는 화면전체가 아니라 미리보기 slide사각형을 기준으로 0..1 저장한다. outside 클릭은 생성없음, zoom/resize에 ratio로 재계산. pin생성/이동과 의견작성 취소·오류시 원래좌표를 유지한다. 키보드이동/핀없음 의견 작성도 가능하며 위치설정은 선택이다.
- 현재 writing은 body.threads; 현재 completed는 body/snapshot을 읽기전용으로 보여주고 새로운 의견은 reviews 중 currentRound/slideId에 저장한다. 과거snapshot선택은 모두읽기전용, 리뷰작성화면으로 이동해 예전body를 수정하지 않는다.
- thread번호는 프로젝트회차 내 단조증가, body+reviews 최대값+1. 재작업 복사시 새ID/새번호를 부여하고 carriedFromId로 원본추적, 저자/원시간/미처리상태 보존. snapshot의 root/message/point/status는 바꾸지 않는다.
- 검토요청은 해당section 담당/PM/슈퍼가 reviewer목록을 확인해 첫선택slide에 `검토 요청: …` 의견+멘션으로 남기는 로컬 기록이다. 작성자가 직접 고른수신자만, 실제메일/메신저 발송 없음. slide0 상태에서는 먼저slide생성 안내. 외부전송 성공토스트 금지.
- mutation baseRevision는 compose 시작/액션 확인 시 캡처하며 타인 변경충돌시 입력보존 후 재조회. pin임시선택만 바뀌었다고 workspace를저장하지 않는다.

### I02. 이전 의견의 읽기 전용 repository와 Provider 연계
- Related Files:
  - `lib/comments/repository.ts` :: readExisting(identity):Promise<CommentSnapshot|null> — modify
  - `components/workspace/production/comments/LegacyCommentsArchive.tsx` — new
  - `hooks/workspace/use-legacy-comments.ts` — new
  - `components/comments/CommentsProvider.tsx` :: legacy 자동load 중단 — modify
  - `components/layout/AppShell.tsx` :: 기존 suspendUi 의존 유지 확인 — read-only 우선
  - `config/comments.ts`, `lib/comments/domain.ts::resolveCommentIdentity` — reuse
#### Details
1. DB 이름 kpc-pin-comments/version1, stores surfaces/users/threads/messages와 namespace/surfaceId=production-preview를 유지한다. 기존 load는 seed생성과 readwrite를 하므로 보관함에서 호출하지 않는다.
2. readExisting은 identity검증 후 기존 DB만 연다. IDBFactory.databases가 지원되면 존재여부를 읽고 없으면 null; 지원되지 않으면 open에 onupgradeneeded에서 oldVersion=0을 확인해 transaction을 abort하고 null로 처리한다. 이 탐지abort를 일반오류로 노출하지 않는다. 기존DB의 예상외version/store부족은 오류로 보고하며 자동재생성/삭제/upgrade하지 않는다.
3. 기존DB에 readonly transaction으로 해당 namespace의 surfaces/users/threads/messages를 읽는다. surface 없으면 null, 있으면 validateCommentSnapshot으로 검증한다. put/add/delete/createCommentSeed를 호출하지 않는다. 읽은bytes/data를 바꾸지 않는다.
4. legacy Query key는 실제사용자의 resolveCommentIdentity.namespace/actor.id로 분리한다. 보관함 클릭 시 enabled=true로 지연조회, 오류/재시도/없음상태. 사용자변경 cancel/remove/close. DB생성/타사용자surface열거 금지.
5. 목록은 작성자/시각/본문/답글/상태만. 편집/삭제/반영완료/멘션입력/새slide핀/자동이관 버튼이 없다. 프로젝트·좌표·슬라이드 번호를 추정하여 붙이지 않는다.
6. CommentsProvider의 pathname=/workspace/write 자동 controller.load는 제거한다. AppShell은 여전히 controller?.suspendUi를 호출할 수 있도록 context를 유지하되 controller load/seed가 새제작경로에서 실행되지 않게 한다. 기존 CommentsWorkspace는 route에서 이미 교체되었으며 새화면으로 다시 연결하지 않는다.
7. 기존repository의 load/execute 타입호환은 유지하고 별도호출자의 기능을 무관하게 삭제하지 않는다. 실제마이그레이션은 없고 readExisting만 신규 보관함 경로다.

## Acceptance Criteria
- [x] 새의견은 안정 slide ID/회차별로 분리되고 현재제작·목차집계에 반영된다.
- [x] 완성 후 리뷰가 과거snapshot을 변경하지 않으며 재작업시 미처리의견을 이어받는다.
- [x] 기존 의견 원본을 삭제/수정/자동이관/seed하지 않는다.
- [x] 본인수정·담당해결·멘션·상대좌표·충돌정책을 유지한다.

## Validation
- `npm run typecheck`
- `npx eslint components/workspace/production/comments hooks/workspace/use-project-comments.ts hooks/workspace/use-legacy-comments.ts lib/workspace/production/comment-selectors.ts components/comments lib/comments/repository.ts`
- fake-indexeddb IDBFactory+node:assert 인라인: emptyDB readExisting→null이며 stores/seed record없음; 기존load로만 fixture생성→serialize→readExisting→serialize 동일; 다른namespace→null; malformed surface→검증오류; close중read종료.
- 새domain에서 타인메시지수정거부/루트삭제tombstone+타인reply보존/삭제루트재편집거부/처리완료thread수정거부/멘션범위검증/잘못된slideID거절을 assert한다.
- complete→새review추가/처리→snapshot deepEqual; start-round→미처리만 새ID/carriedFromId/원작성자와원시간보존, 다른project/round의의견유입0을 확인한다.
- SSR 컴포넌트에서 LegacyArchive에 변경액션이없고 텍스트 HTML이 escape되는지 검사한다. geometry 함수로 resize전후 같은ratio, outside생성없음/0..1검증을 확인한다.
- `rg -n 'controller.load|createCommentSeed' components/comments/CommentsProvider.tsx components/workspace/production/comments` — 신규진입경로에서 legacy생성없음.
- `git diff --check`

## Commit Message
```text
feat(workspace): 슬라이드 의견과 이전 의견 보관함 연결

Plan: 2026-11-03-workspace-toc-production
Phase: P03-workspace-ui
Task: T04-comments-and-history

- 슬라이드 의견과 이전 의견 보관
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 검증 기록
- typecheck·범위 ESLint·diff 확인 통과. legacy DB 없음 탐지/기존 데이터 무변경/namespace/손상/종료, 새 의견 권한·삭제표식·완성/재작업·SSR escape·상대좌표 33건 통과.
- 의견 번호는 삭제 뒤 재사용되지 않도록 nextCommentNumber를 보존한다. 기존 프로젝트 레코드는 기본값과 기존 최대값을 함께 검증해 수용한다.
- 본문과 의견 등 여러 초안을 동시에 보호하도록 공통 이동 guard를 순차 실행한다. 런타임 재검증 33건 통과. legacy 신규 진입 경로에서 load/seed 호출 없음.
