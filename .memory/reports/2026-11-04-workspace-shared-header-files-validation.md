# 작업 메뉴 공통 상단바·파일 개선 검증

- 날짜: 2026-11-04. 기준 HEAD: `1049094`.
- 계획: [작업 메뉴 공통 상단바·파일 개선](../plans/2026-11-04-workspace-shared-header-files.md).
- 범위: 확정 결정 D01~D12, 기존 파일 비교 보고서 R1~R5. 구현 코드와 첨부 HTML을 읽어 대조했으며 HTML 스크립트는 실행하지 않았다.
- 사용자 요청에 따라 T01~T10을 순서대로 진행하고 최종 단일 커밋한다. push는 하지 않는다.

## 구현 결과

6개 작업 메뉴가 같은 프로젝트·회차·권한을 사용한다. 상단바의 설정·완성·재작업·이력은 실제 로컬 작업 상태와 연결했다. 제작 경로는 동료의 `CommentsWorkspace`를 유지하고, 의견 저장만 프로젝트·회차별로 분리했다. 파일 추가는 탐색기를 먼저 열며 웹 참고 기간과 우선순위를 공통 컴포넌트로 표시한다.

업무 상태는 v2로 확장했다. v1 자료는 읽을 때 메모리에서 변환하고, 정상 저장 명령이 성공할 때 v2를 기록한다. 단순 조회·원본 다운로드는 기존 레코드를 덮어쓰지 않는다. DB 버전·기존 object store·파일 Blob을 삭제하거나 초기화하지 않았다.

## 기획·결정 대응표

구현 경로는 저장소 루트 기준이다. 정적 검토는 실제 브라우저 동작이나 시각 품질을 실행 검증했다는 의미가 아니다.

| 요구사항 | 출처 | 구현 | 검증 | 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 6개 메뉴 공통 선택 | D01/D02/D04, R1 | `WorkspaceSelectionProvider`, `use-workspace-selection`, `NavSidebar` | 정적 검토 | 통과 | 단일 공급자, URL/메모리/저장 선택 우선순위, 6개 href에 선택값 전달 |
| 회차·과거 선택 | D04/D09 | `routing.ts`, `ProjectHeader`, `selectSnapshotView` | 인메모리 실행 | 통과 | 6개 경로 파싱/중복 파라미터 거부, 없는 snapshot 거부 |
| 프로젝트명·번호·PM·멤버 | D04, HTML 2512~2517 | `header-selectors.ts`, `ProjectHeaderProvider` | 인메모리 실행 | 통과 | 실제 ProjectView에서 계산. 고정 mock 역할/회차 제거 |
| 발주처·마감·예산 | D04, R2 | `getWorkspaceHeaderMetadata` | 인메모리 실행 | 통과 | 동일 ID 보조 메타데이터만 사용. 예산은 현재 mock catalog와 동일 AdminRfp seed. 없는 값 null, 예산 0 보존 |
| 진행률·의견 수 | D06, HTML 완성 확인 | `selectWorkspaceHeader`, `getCompletionSummary` | 인메모리 실행 | 통과 | 소목차 완료/전체와 프로젝트 전체 미처리 수. 화면 의견을 임의 소목차에 더하지 않음 |
| 참여자별 5개 업무 권한 | D05, HTML 3061~3065의 합의된 변경 | `grant-drafts.ts`, `use-project-permissions`, `ProjectSettingsDrawer` | 인메모리 실행 | 통과 | enum 순서 정규화, 두 행 변경, 명시 해제, PM/super 고정, 잘못된 행 전체 거부 |
| 권한 저장·닫기 보호 | D05/D11 | `useWorkspaceCommand`, `useWorkspaceDraftGuard`, `FileDiscardDialog` | 정적 검토 | 통과 | 한 batch 명령, 성공 후 baseline 갱신. 실패/배경 갱신 초안 유지. 닫기/이동 보호 |
| 리뷰 접근 | D02 | `canReviewProject`, `ProjectHeaderProvider`, `NavSidebar` | 인메모리 실행 | 통과 | PM/super 허용, 참여자 거부. 리다이렉트의 project/회차 유지 경로는 정적 확인 |
| 완성 | D09, HTML 3082~3088 | `use-project-round`, `ProjectRoundDialog`, `domain.ts` | 인메모리 실행 | 통과 | 명시 확인, 작업/파일 revision 검사, 파일·본문·의견 원자적 보관, 이후 쓰기 거부 |
| 재작업 | D09, HTML 3089~3094 | `carryCanvasComments`, `applyWorkspaceMutation` | 인메모리 실행 | 통과 | 새 회차와 파일 회차 일치. 미처리 의견만 새 ID/backreference로 계승. 이전 사본 불변 |
| 완성/미완성 이력 | D09 | `header-selectors`, `ProjectHeader`, `file-history.ts` | 인메모리 실행 | 통과 | complete만 완성본 수에 포함, unfinished 별도 라벨, 현재 복귀 |
| 이력의 정확한 파일 버전 | D09/D11 | `selectFileSnapshot`, `loadFileSnapshot`, `useWorkspaceFileHistory` | 인메모리 실행 | 통과 | snapshot.fileEntries의 versionId 사용. 최신 설정으로 대체하지 않음. 누락 버전 오류 |
| 이력 PPT | D09, HTML 3095~3097 | `ProjectHeader`, 기존 `useWorkspacePpt/downloadPpt` | 정적 검토 | 통과 | snapshot.pptVersionId와 같은 round 버전만 다운로드 버튼. 없으면 보관된 PPT 없음. 다운로드 UI 실기 미실행 |
| 파일 3분류 | D10, HTML 3422/3454~3457 | `FileRoundSection`, `FileCategoryPanel` | 정적 검토 | 통과 | 제안/유관/웹 3개 유지, 반응형 열 구성 유지 |
| 50MB·현재 회차 30개 | D10, HTML 3458/3685~3689 | `FILE_LIMITS`, `FileUploadDialog`, 기존 저장 도메인 | 인메모리 실행 | 통과 | 허용 형식·빈 파일·50MB 초과 거부. 화면 문구와 한도 상수 공유 |
| 탐색기 우선·취소 처리 | D10/R4, HTML 3827~3831 | `useFilePicker`, `FilesWorkspace` | 정적 검토 | 통과 | 클릭 stack에서 input.click, 빈 FileList/cancel은 초안 생성 없음, 프로젝트/회차/권한 재확인, captured revision 유지 |
| 드롭·추가 선택·일괄 설정 | D10, HTML 3733~3740 | 기존 `FileCategoryPanel/FileUploadDialog` | 정적 검토 | 통과 | 동일 pendingRow/validateUploadFile 경로. 오류 파일 조용히 누락하지 않음 |
| 자료 설정·삭제·복원·원본 | D10/D11 | 기존 파일 서비스/도메인·모달 | 인메모리 실행 | 통과 | 실제 파일 업로드·설정 변경·회차 계승 후 과거 Blob 원문 유지. 삭제/복원 UI 연결은 기존 코드 정적 확인 |
| 웹 참고 기간 | D10/R5, HTML 3833~3834 | `FileResourceMeta` | 인메모리 실행 | 통과 | all/1y/3m 텍스트, hostname, 파일에 가짜 기간 없음 |
| 우선순위 | D10/R5, HTML 3695 | `ReferencePriorityBadge` | 정적 검토 | 통과 | 경고/브랜드/중립/낮은 강조 토큰과 4개 텍스트, 과거 version 값 사용 |
| 로컬 저장 안내 | D10/R3 | `FilesWorkspace/FileUploadDialog` | 정적 검토 | 통과 | 작은 ‘이 브라우저에 저장’ 문구. 예시 데이터/화면 안내 배너 없음 |
| 동료 핀 UI 유지 | D03/D06 | `CommentsWorkspace/CommentPin/CommentPopover` | 정적 검토 | 통과 | 기존 좌표·팝업·드래그·키보드 컴포넌트 유지. 라우트는 CommentsWorkspace, 새 편집기 연결 없음 |
| 화면 의견 권한·범위 | D06/D07 | `canvas-comments.ts`, `WorkspaceCommentRepository` | 인메모리 실행 | 통과 | 작성자/PM/super 상태 변경, 타인 본문 거부, 멘션 대상 검증, readonly/scope 우회 거부 |
| 초안·컨트롤러 수명 | D06/D11 | `use-canvas-comments`, `CommentController` | 인메모리 실행 | 통과 | 생성 threadId 그대로 선택, 저장 실패 초안 유지, close와 discard 구분, dispose 후 응답 무시. revision 기반 재조회는 정적 확인 |
| 이전 의견 | D08 | `LegacyCommentsArchive`, `useLegacyCommentIdentity`, `readExisting` | 정적 검토 | 통과 | 원래 identity로 읽기만, seed/삭제/자동 이관 없음 |
| v1/v2 및 손상 데이터 | D11 | `state-compatibility.ts`, `workspace-records.ts` | 인메모리 실행 | 통과 | 현재/snapshot/undo 독립 확장, v1 조회 후 raw 유지, 정상 저장 때 v2, 손상 v2 거부 및 no seed |
| 검증 정책 | D12 | 본 보고서/T10 | 자동 검사 | 통과 | tests/ 신규 생성 없음. 브라우저/CUA/E2E/dev server 미실행 |
| 기본정보 수정·알림·프로젝트 로그 | D05 | 조회 텍스트 및 미연결 탭 | 정적 검토 | 후속 범위 | 가짜 입력/저장/로그 제거. 알림·활동 로그는 아직 연결되지 않음 표시 |
| 서버 공유·Cosmos·AI·실제 검색·분석/리뷰 본문 | D01/D02/D11 | 이번 변경 없음 | 정적 검토 | 후속 범위 | 로컬 권한 검사는 서버 보안의 대체물이 아님. RFP 자동 자료 연계/관리자 자산 영속화도 별도 작업 |
| OS 탐색기·핀 드래그·포커스·색상·반응형 | D12 | 실행하지 않음 | 미실행 | 환경 제약 | 기존 사용자 검증 정책에 따라 실제 UI/브라우저 실기는 하지 않음 |

## 자동·인메모리 검사

- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`를 실행한다. 최종 결과는 이 문서의 완료 기록에 남긴다.
- 새 패키지 없이 기존 `tsx/cjs`, `fake-indexeddb`를 Node stdin에서 사용했다. 실제 사용자 IndexedDB나 Azure/운영 DB에 접속하지 않았다.
- 순수 도메인: 권한·멘션·중복 ID·좌표·readonly·revision·완성/미완성·carry/backreference·header 집계·grant 정규화·exact 파일 투영.
- Repository: 별도 `IDBFactory`에서 v1 조회 무쓰기/저장 업그레이드, 파일 Blob 바이트 보존, batch rollback, 프로젝트/사용자 namespace 격리, complete/start-round 원자성, 손상 레코드 no seed를 실행했다. 재현용 stdin은 T10 청사진에 기록했다.
- fixture는 `entra:oid:*` / `files:<actorId>` 규칙을 따른다. 액터별 namespace가 다르므로 여러 액터의 같은 프로젝트 권한은 순수 도메인에서 비교하고, repository에서는 각 namespace의 접근/저장을 검사했다. 공유 서버 동시 편집 검증으로 해석하지 않는다.
- adapter/controller: 생성 후 팝업 threadId, 실패 초안, explicit discard, 잘못된 scope, snapshot 쓰기 거부, dispose 이후 응답 무시.
- 파일 메타데이터/검증: 세 웹 기간, 파일 KB와 등록 정보, 허용 TXT, 미지원 형식·빈 파일·용량 초과.
- 저장용량 부족/blocked DB의 실제 브라우저 발생과 PDF 렌더링은 재현하지 않았다. 기존 오류 경계만 정적으로 확인했다.

## 통합 검토에서 보완한 경계

1. 파일 원본 읽기도 v1 호환 schema를 사용하여 첫 정상 저장 전 다운로드가 가능하게 했다.
2. 배경 조회 실패 때 기존 코멘트·권한·파일 초안을 가진 컴포넌트를 유지하고 쓰기 권한은 차단했다.
3. 재작업 성공에 따른 회차 key 변경으로 이전 헤더가 unmount되어도 같은 프로젝트의 clipboard/session 정리와 commitSelection을 마치도록 했다. 다른 사용자/프로젝트로 응답을 전달하지 않는다.
4. production project query는 하위 file-history까지 invalidate하고 기존 파일 query 무효화도 유지했다.
5. 권한 변경의 기존 목차 전용 단일 행 창을 제거하여 공통 설정의 atomic batch로 통일했다.

## 유지보수 메모

`operation: { type: "set-grants-batch", grants: changes }`는 한 transaction의 변경 단위다. 화면에서 여러 `set-grants` 요청으로 풀어 보내면 부분 저장 문제가 다시 생길 수 있다.

`snapshot.fileEntries`는 과거 자료의 기준이다. 현재 round의 entries나 가장 최신 version으로 치환하면 당시 설정이 유실된다. canvas의 `carriedFrom` 역시 과거 사본을 가리키므로 기존 snapshot을 지우거나 ID를 재사용하면 안 된다.

추후 서버 연결 시 namespace별 브라우저 저장 모델과 실제 공유 프로젝트 저장 모델의 차이, 서버 권한/낙관적 동시성, 파일 원본 저장과 인증을 별도로 설계해야 한다. 이번에 실제 서버 기능을 구현한 것은 아니다.

## 완료 기록

- 최종 `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check`: 모두 통과. 충돌 마커·새 내부 any/unknown·직접 fetch 추가 없음.
- T01~T10/phase/plan 완료. 단일 커밋은 본 보고서를 포함한 Git 이력에서 확인하며 실제 hash는 로컬 `.memory/current.md`에 기록한다. push 없음.
- 빌드 중 기존 `baseline-browser-mapping` 데이터 갱신 권고가 발생했다. 앱 컴파일 실패와 구분하며 이번 범위에서 의존성을 임의 업데이트하지 않는다.
