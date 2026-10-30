# Current Context

## Active Plan
[제작 화면 핀 코멘트](./plans/2026-10-29-production-pin-comments.md)

## Active Phase
[P01 제작 핀 코멘트](./phases/2026-10-29-production-pin-comments/P01-pin-comments/phase.md)

## Active Task
[T03 코멘트 상태 연결과 공용 헤더 정리](./phases/2026-10-29-production-pin-comments/P01-pin-comments/T03-comment-state-and-shell.md)

## Status
- 2026-11-02 병합 복구: 관리자 기능과 제작 코멘트 기능을 함께 유지한다. 상세 결과는 [병합 검증 기록](./reports/2026-11-02-merge-recovery.md)에 기록한다.
- 코멘트 P01: 구현 4/4, 기존 전체 검증 완료 2/4. T03·T04의 실제 브라우저 전체 검증은 미완료 상태를 보존한다. 병합 회귀 검사를 해당 계획 전체 완료로 취급하지 않는다.
- 코멘트 커밋: T01 cae7075, T02 4eaa63e, T03 62b9e58, T04 8a0f767. 실제 제작 핀·이동·비모달 팝업·답글·멘션·완료/재개·IndexedDB 구현을 유지한다.
- 관리자 재검증 개선은 T01~T07 done 7/7, 커밋 afbab489439f86ec4675e70727b8d6b954aec423. 당시 444개 단위·통합/47개 브라우저 검증 기록은 [최종 보고서](./reports/2026-10-30-admin-review-fixes-validation.md)에 보존한다.
- 양쪽 브랜치의 원문 current를 각각 [관리자 원문](./history/2026-11-02-before-merge-admin-current.md), [코멘트 원문](./history/2026-11-02-before-merge-comments-current.md)에 보존한다.

## Next Step (IMPORTANT)
코멘트의 구현을 중복하지 않는다. 후속 memory-execute 시 T03의 실제 화면·모바일 메뉴·Tab/Esc·토큰 모달 포커스를 확인하고, T04의 전체 브라우저 matrix·저장 복원·터치·native IME·육안 검증을 순서대로 진행한다. 완료하지 않은 검증을 완료로 표시하지 않는다. 이번 병합 복구의 제한된 회귀 결과와 기존 미완료 항목을 구분한다.

## 유지할 계약
- 인증 layout의 requireAppAccess와 각 관리자 경로의 서버 역할 검사를 유지한다. ProfilePreviewProvider 아래 AdminRuntimeProvider와 CommentsProvider를 모두 연결한다.
- 코멘트의 공용 헤더 제거·독립 모바일 메뉴 버튼·workspace-sidebar-trigger ID·토큰 모달 포커스 복귀·제작 전용 화면 배치를 유지한다.
- 관리자 공통 스타일과 관리 메뉴·역할/CRUD 조건부 렌더링을 유지한다. 제작은 일반 사용자도 접근하는 메뉴다.
- 관리자 mock과 코멘트 IndexedDB 저장을 혼동하지 않는다. 관리자 데이터는 새로고침 시 초기화, 등록 코멘트는 IndexedDB 보존, 미등록 코멘트 초안은 메모리다.
- 본인 글만 수정/삭제, 모든 이용자의 핀 이동·완료·재개, 가상 사용자 멘션, 최초 한 번 예시 저장 계약을 유지한다.
- Template의 이전 결과 보존·명시적 최신 재적용·비활성/삭제 후 고정 작업·현재 권한 회수 차단을 유지한다. 같은 파일의 선택은 유지하고 실제 파일 교체 시 초기화한다. 공유 디자인은 연결 전체에 영향을 준다.
- 프로필 댓글 개수/알림 연동, 실제 인증 역할 개편·Cosmos/Blob·전역 브랜드 편집·일반 제작과 PPT 연결은 별도 후속이다.
- Windows 검증은 npm.cmd/npx.cmd로 실행한다. fake-indexeddb/jsdom/Playwright는 검증용이며 운영 의존성의 보안 갱신은 이번 병합 범위에 넣지 않는다.

## References
- [코멘트 결정](./decisions/2026-10-29-production-pin-comments.md), [기존 검증·미완료 사항](./validation/2026-10-29-production-pin-comments/report.md)
- [관리자 개선 결정](./decisions/2026-10-30-admin-review-fixes.md), [계획](./plans/2026-10-30-admin-review-fixes.md), [후속 목록](./reports/2026-10-30-admin-review-followups.md)

## Previous Plans — 상태 보존
- [Skill·Template](./plans/2026-10-30-skill-template-ui.md): T01~T10 done, 커밋 790835657f82a27871ff5e1ec80632ca115c69c7.
- [관리자 mock UI](./plans/2026-10-29-admin-mock-ui.md): T01~T08 done, T09 미완료. 이번 병합으로 전체 완료 표시하지 않는다.
- [코멘트 이전 current](./history/2026-10-29-before-production-pin-comments.md)
- [사용량 상세·토큰 신청](./plans/2026-10-27-token-usage-request-modals.md), [프로필 팝오버](./plans/2026-10-27-profile-popover-preview.md), [Cosmos 스킬 세팅](./plans/2026-10-27-cosmosdb-skill-setup.md): 기존 완료 기록 유지.
