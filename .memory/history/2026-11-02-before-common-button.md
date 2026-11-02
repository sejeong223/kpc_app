# Current Context

## Active Plan

[KPC dadam 룩앤필 단계적 적용](./plans/2026-10-30-dadam-look-and-feel.md)

## Active Phase

[P01 dadam UI 단계적 적용](./phases/2026-10-30-dadam-look-and-feel/P01-ui/phase.md)

## Active Task

없음 — 모든 Task 완료.

## Last Completed

[T04 코멘트 디자인과 좌표 회귀](./phases/2026-10-30-dadam-look-and-feel/P01-ui/T04-comment-design.md)

## Status

- Plan/P01/T01~T04 완료: done4/4. 기존 실행 기록은 전체411개 테스트, 코멘트103개, typecheck·전체 lint·build 통과다. 남은 실행 Task 없음. 이번 통합 검증 결과와 과거 실행 결과는 구분한다.
- 2026-11-02 리베이스: 팀원의 관리자·코멘트 복구 커밋 200dbe4 위에 로컬 dadam 커밋 5개를 적용했다. 최초 사이드바 6ef8704 / T01 a16c50f / T02 8838726 / T03 7df3acb / T04 56b6d24. 원래 커밋 f573ce5 / 3fa09e4 / b8761d5 / 3f56457 / 36609b1의 작업 내용을 보존한다.
- 확정: 기본형 dadam, 파란 강조색, 활성 메뉴 포함. 공통 스타일을 대상 화면에만 적용한다.
- 실행 순서: T01 공통 테마·사이드바 → T02 프로필 전체 탭 → T03 토큰 모달·알림 → T04 코멘트 디자인. T03 검증·커밋까지 마쳐야 코멘트 구현에 착수한다.
- 사용자 승인 추가: T04의 기존 코멘트 UI 가상 측정값220px을 현재 펼침200/접힘64/모바일0 조건으로 보완하고 좌표·팝업·저장 보존을 검증한다.
- [확정 결정](./decisions/2026-10-30-dadam-look-and-feel.md). KPC의 기능·권한·데이터를 유지하는 UI 변경이며 토큰 승인 API·코멘트 서버 동기화·로그인/일반 본문 재디자인은 범위 밖이다.

## Persistent Validation Policy

- 사용자 지시(2026-10-30): **브라우저 검증은 앞으로 모든 Task에서 제외한다.**
- [지속 검증 정책](./decisions/2026-10-30-task-validation-policy.md)을 이번 계획과 이후 계획 전환 시에도 유지한다.
- unit/기존 및 필요한 jsdom DOM 테스트·타입 검사·lint·build·정적 코드 검토를 수행한다. 브라우저/E2E/스크린샷·육안 확인·native IME/터치 실기 확인과 검증용 dev server 실행은 하지 않는다.
- 미실시를 통과로 기록하지 않고, 브라우저 검증 제외를 완료 차단 사유나 별도 대기 Task로 남기지 않는다.

## Worktree / Commit Boundary

- 기존 사이드바 최초 구현은 f573ce5. 접힘 헤더28px·글자색·divider 후속 보정은 이번 T01 변경에 함께 포함했다.
- 이전 핀 코멘트 T03/T04/phase/plan/report와 이전 사이드바 T01의 미커밋 문서는 보존한다. `git add .`로 새 Task 커밋에 일괄 포함하지 않는다.
- 사용자 지시(2026-11-02): `.memory/current.md`는 로컬 전용 파일로 유지한다. `/.memory/current.md`를 `.gitignore`에 등록하고 Git 추적에서 제외했다. 앞으로 이 파일을 강제로 추가하거나 Task 커밋에 포함하지 않는다.
- 그 외 decision/plan/phase/Task/history 문서는 필요한 경로만 명시하여 커밋한다. 각 Task는 지정한 한국어 커밋 메시지와 Plan/Phase/Task footer를 사용한다.
- 토큰 mock/코멘트 IndexedDB를 디자인 변경 중 실제 서버 연동으로 바꾸지 않는다. dadam 저장소는 읽기 참고만 한다.

## Next Step (IMPORTANT)

활성 계획의 실행을 모두 마쳤다. 새 요청 전까지 추가 구현하지 않는다. 토큰 실제 승인 API·코멘트 서버 동기화·로그인과 일반 본문 재디자인은 이번 완료 범위에 포함하지 않았다.

완료 결과는 각 Task의 Execution Result에 기록했다. 기존 무관한 미커밋 메모 문서는 보존했다.

## Previous Context

- [포인터 전환 전 current 원문](./history/2026-10-30-before-dadam-look-and-feel.md). 원문의 상대 링크는 원래 `.memory/current.md` 위치 기준이다.
- [dadam 사이드바 규격·서체 — 완료](./plans/2026-10-30-dadam-sidebar-layout-typography.md). 신규 계획은 기존 완료 Task를 다시 실행하지 않고 현재 상태를 확장한다. 기존 “활성 전용 디자인 제외”는 새 결정에서 포함으로 변경되었다.
- [제작 핀 코멘트 — 완료](./plans/2026-10-29-production-pin-comments.md). 기존 기능을 보존하고 이번 T04는 디자인·승인된 테스트 조건만 정비한다.
- [토큰 모달 — 완료](./plans/2026-10-27-token-usage-request-modals.md), [프로필 팝오버 — 완료](./plans/2026-10-27-profile-popover-preview.md).

## 팀원 계획과 병합 기록

- 팀원의 2026-11-02 복구 커밋 200dbe4와 [병합 검증 기록](./reports/2026-11-02-merge-recovery.md)을 보존한다. 당시 단위·통합544개 및 브라우저 검증 기록은 과거 증거로 유지하며, 이번 작업에서 다시 실행한 것으로 기록하지 않는다.
- [관리자 재검증 개선](./plans/2026-10-30-admin-review-fixes.md): T01~T07 done7/7, 원래 커밋 afbab489439f86ec4675e70727b8d6b954aec423. 당시 단위·통합444개/브라우저47개 기록은 [최종 보고서](./reports/2026-10-30-admin-review-fixes-validation.md)에 보존한다.
- [Skill·Template](./plans/2026-10-30-skill-template-ui.md): T01~T10 done, 원래 커밋 790835657f82a27871ff5e1ec80632ca115c69c7.
- [관리자 mock UI](./plans/2026-10-29-admin-mock-ui.md): 팀원 원문은 T01~T08 done, T09 미완료로 기록했다. 후속 재검증 개선의 완료와 원래 계획의 상태를 구분하며, 이번 충돌 해결만으로 T09를 완료 처리하거나 자동 실행하지 않는다.
- [제작 핀 코멘트](./plans/2026-10-29-production-pin-comments.md): 구현4/4, 원래 커밋 T01 cae7075 / T02 4eaa63e / T03 62b9e58 / T04 8a0f767. 팀원 원문은 T03·T04의 전체 브라우저 검증 미실시를 이유로 검증 완료2/4와 Active Task T03을 기록했다. 이 과거 상태는 원문에 보존한다. 현재 작업에는 사용자의 브라우저 검증 제외 지시가 우선하므로 해당 검증을 재개하거나 완료 대기 Task로 되돌리지 않는다. 로컬의 기존 자동 검증404개 기록과 브라우저 미실시 사실을 함께 유지한다.
- [사용량·토큰 신청](./plans/2026-10-27-token-usage-request-modals.md), [프로필 팝오버](./plans/2026-10-27-profile-popover-preview.md), [Cosmos 스킬 세팅](./plans/2026-10-27-cosmosdb-skill-setup.md)의 기존 완료 기록을 유지한다.

## 양쪽 기능에서 유지할 계약

- 인증 layout의 requireAppAccess와 각 관리자 경로의 서버 역할 검사를 유지한다. ProfilePreviewProvider 아래 AdminRuntimeProvider와 CommentsProvider를 함께 연결하며 토큰 모달의 DadamThemeScope를 보존한다.
- 관리자 CSS import 2개와 Spoqa Han Sans Neo font-face 3개를 함께 유지한다. import는 font-face보다 앞에 둔다. 관리자 화면 모바일 상단 여백64px과 dadam 사이드바 펼침200px/접힘64px을 유지한다.
- 코멘트의 공용 헤더 제거·독립 모바일 메뉴 버튼·workspace-sidebar-trigger ID·토큰 모달 포커스 복귀·제작 전용 화면 배치를 유지한다. 제작은 일반 사용자도 접근한다.
- 관리자 공통 스타일과 관리 메뉴·역할/CRUD 조건부 렌더링을 유지한다. 관리자 데이터는 새로고침 시 초기화되는 mock, 등록 코멘트는 IndexedDB 보존, 미등록 코멘트 초안은 메모리다.
- 본인 글만 수정/삭제, 모든 이용자의 핀 이동·완료·재개, 가상 사용자 멘션, 최초 한 번 예시 저장 계약을 유지한다.
- Template의 이전 결과 보존·명시적 최신 재적용·비활성/삭제 후 고정 작업·현재 권한 회수 차단을 유지한다. 같은 파일의 선택은 유지하고 실제 파일 교체 시 초기화한다. 공유 디자인은 연결 전체에 영향을 준다.
- 프로필 댓글 개수/알림 연동, 실제 인증 역할 개편·Cosmos/Blob·전역 브랜드 편집·일반 제작과 PPT 연결은 별도 후속이다.
- Windows 검증은 npm.cmd/npx.cmd로 실행한다. fake-indexeddb/jsdom/Playwright는 검증용 의존성이다. 이번 작업에서 Playwright 실행이나 운영 의존성 보안 업그레이드를 하지 않는다.

## 원문 보존과 참고

- [리베이스 전 팀원 current 원문](./history/2026-11-02-before-dadam-rebase-team-current.md), [리베이스 전 로컬 완료 current 원문](./history/2026-11-02-before-dadam-rebase-local-current.md). 두 원문의 상대 링크는 원래 `.memory/current.md` 위치 기준이다. 원문의 실행 지시보다 이 통합 포인터와 사용자의 지속 검증 정책이 우선한다.
- 팀원이 남긴 [관리자 원문](./history/2026-11-02-before-merge-admin-current.md), [코멘트 원문](./history/2026-11-02-before-merge-comments-current.md), [이전 코멘트 포인터](./history/2026-10-29-before-production-pin-comments.md)도 그대로 보존한다.
- [코멘트 결정](./decisions/2026-10-29-production-pin-comments.md), [핀 코멘트 검증 기록](./validation/2026-10-29-production-pin-comments/report.md), [관리자 개선 결정](./decisions/2026-10-30-admin-review-fixes.md), [관리자 후속 목록](./reports/2026-10-30-admin-review-followups.md).

## 2026-11-02 통합 검증 결과

- 리베이스 완료, 미해결 인덱스와 추적 파일의 충돌 표식0건. 관리자 CSS import2개·로컬 font-face3개와 current의 상대 링크를 확인했다.
- `npm.cmd run test -- --maxWorkers=2`: 72개 파일/559개 테스트 통과. `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` 통과. 브라우저 검증은 수행하지 않았다.
- 관리자 소스·스타일·기존 E2E 테스트는 팀원 커밋200dbe4와 동일하다. 원문 current 스냅샷2개도 각각 원래 내용과 동일함을 확인했다.
- 리베이스 전 stash9829ced의 로컬 변경8개(코멘트 숫자 정렬 보정과 메모 문서7개)를 원래 미커밋 상태로 복원했다. 각 파일 내용이 stash와 동일함을 확인했으며 원본 stash는 삭제하지 않았다. 기존 미추적 `tests/components/comment-pin-alignment.test.ts`도 유지했다.
- `.memory/current.md`는 로컬에 존재하며 Git 추적에서 제외되어 있다. 원격 push는 수행하지 않았다.
