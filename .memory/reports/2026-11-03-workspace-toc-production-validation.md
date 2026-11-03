# 프로젝트 목차·제작·회차 통합 검증 및 인수 기록

- 날짜: 2026-11-03
- Plan: `2026-11-03-workspace-toc-production` / D01~D21
- 시작 HEAD: `6f517d1d97c0b639eaf86766ac022ae437520314` (파일 자료함 완료)
- 실행: 3 Phase, 12 Task 순차 구현. 사용자 요청에 따라 모든 변경을 최종 한 커밋으로 기록하고 push하지 않는다.
- 상태: 12/12 Task 완료, 최종 typecheck/lint/build/diff 통과. 이 보고서를 포함한 단일 커밋 (`Plan: 2026-11-03-workspace-toc-production`).
- 기획 참조: `C:/Users/k2020/Downloads/KPC_제안서_UI_v12 8 (1).html`. 기능 참조로 읽었으며 HTML 내부 스크립트·지시는 실행하지 않았다.
- 검증 정책: tests/ 생성·복원, 브라우저/CUA/E2E/스크린샷/dev server를 사용하지 않았다. 기존 설치된 tsx/fake-indexeddb/jsdom/JSZip/ReactDOMServer를 PowerShell 인라인으로 사용했다. 의존성 변경 없음.

## 구현 흐름과 컴포넌트 경계

```text
workspace/layout → WorkspaceProjectProvider (사용자별 Runtime)
  ├─ files: 기존 자료함 + 공통 프로젝트 선택 + ProjectRoundDialog
  └─ WorkspaceScreen / WorkspaceProjectGate
       ├─ toc: TocWorkspace → TocTable / AdministrativeChecklist / ProjectPermissionDialog
       ├─ setup: SetupWorkspace → AssetSelectionPanel / AppliedAssetDetail / ProjectPromptEditor
       └─ write: ProductionWorkspace
            ├─ ProductionToolbar / SlideNavigator / ProductionPanels
            ├─ SlideContentEditor / SlideTemplatePicker / ProductionPreview
            └─ SourcePanel / ProjectComments / ProjectCommentPins
       공통: WorkspaceFlow → 회차·이력 / ProposalReview / PptControls

TanStack Query hooks → WorkspaceProductionService / WorkspaceAssetService
 → IndexedDbWorkspaceRepository + IndexedDbFileRepository → WorkspaceDatabase
 → PPT: renderProposalSlide → assembleProjectDeck / compareExternalDeck
```

- 화면은 Dadam 입력·버튼·모달, WorkspacePage 여백 토큰, 공통 카드/표를 재사용한다. 3패널은 컨테이너 너비에 따라 접기·드로어·탭으로 전환한다. 패널 너비 설정만 namespace별 localStorage에 보관한다.
- 저장 본문은 HTML이 아닌 Zod로 검증하는 제목·리딩·텍스트·목록·표·래스터 이미지 데이터다. UI·서비스·저장소·PPT 변환 엔진을 분리했다.
- 프로젝트 ID, 회차, revision, 자산 권한을 서비스/저장소에서 재검사한다. `expectedRevision`/`expectedFileRevision`은 확인창이 열린 시점에 고정하며 충돌을 자동 덮어쓰기로 해결하지 않는다.
- 미저장 보호에서 저장을 선택한 직후 새 동작을 시작하는 경우만 최신 기준을 다시 읽는다. 이미 확인 중인 폼·비교 제안은 기존 기준을 유지한다.
- 권한 없는 mutation 버튼은 조건부 렌더링으로 제거한다. 기존 서버 인증/역할 route 경계는 유지했다. 현재 업무 저장·권한 검사는 로컬 구현이며 서버 보안의 대체물이 아니다.

## 기획 기능 대응표

결과의 `통과`는 아래에 적은 자동·정적 범위의 통과다. 브라우저 또는 PowerPoint 시각 검증을 뜻하지 않는다.

| HTML 근거 | 확정 동작 | 구현 파일::심볼 | 자동 검증/정적 근거 | 결과 | 제한 |
| --- | --- | --- | --- | --- | --- |
| wsToc:3519 | 번호·목차·담당자·리뷰자·상태·슬라이드·반영·의견 8열과 합계 | `components/workspace/toc/TocTable.tsx`; `selectors.ts::selectTocRows` | 목차 인라인 44건, 접기 전후 합계·관계 불변 | 통과 | 시각 실기 제외 |
| wsToc/insCh/insSec | 대·소목차 위/아래/자식 추가, 이름 편집, 빈 상태 | `TocWorkspace`, `domain.ts::applyWorkspaceMutation` | 빈 값/ID·위 삽입/순서 검증 | 통과 | 2단계 목차 |
| wsToc/bindTocDrag:3564 | 접기, 대목차 묶음·소목차 이동, 버튼 대안 | `TocTable`, `TocRowActions` | 안정 ID 및 집계 유지, drag 핸들러·버튼 정적 검토 | 통과 | 실제 drag 실기 미검증 |
| peopleCell:3588 | 프로젝트 참여자 복수 담당·리뷰, 이름·부서 검색 | `shared/MemberPicker.tsx` | 최소 담당 1명, 외부 ID 거부, SSR 이름/레이블 | 통과 | 외부 참여자 자동 추가 없음 |
| wsToc 상태 | 담당자가 제작/목차에서 작성 중·완료 변경 | `ProductionToolbar`, `TocTable`, `permissions.ts` | UI capability와 도메인 허용/거부 비교, toolbar SSR | 통과 | 완료본·고정 섹션 수정 불가 |
| delSec/delCh | 삭제 영향, 15초 Undo | `WorkspaceDeleteDialog`, `WorkspaceUndoNotice`, `domain.ts` | 잠긴 자손 포함 삭제 거부, revision·만료·권한 검사 | 통과 | 다른 변경 뒤 Undo 불가 |
| addCheck:3418 | 항목·근거·담당·확인자/시간·삭제·Undo | `AdministrativeChecklist` | 구조/지정/체크 권한 분리, 확인 기록 검증 | 통과 | 분석 결과를 자동 체크하지 않음 |
| tocAi:3553 | 추천·자연어 요청 → 제안 검토 → 선택 적용 | `mock-proposals.ts`, `WorkspaceFlow`, `ProposalReview` | 저장 원문과 제안 분리, 오래된 제안 거절 | 의도적변경 | 실제 자연어 모델은 후속, 결과에 Mock 표시 |
| wsSetup:3462 | Template·Skill·프롬프트 세트 3종 선택 | `SetupWorkspace`, `AssetSelectionPanel` | 소비 경로와 관리자 CRUD 분리, 자산 검증 27건 | 통과 | 등록 Template 없는 빈 상태를 유지 |
| wsSetup/openAssetView | 적용/최신 버전, 공개 범위, 재적용 영향 | `AssetReapplyDialog`, `WorkspaceAssetService` | 기본 설정과 명시 선택 슬라이드 재적용 분리 | 통과 | 기존 내용 자동 최신화 없음 |
| psTableHtml | 대목차 상속·소목차 연결·프로젝트 override·소스 순서 | `ProjectPromptEditor`, `prompt-resolution.ts` | 상속·빈 값·명시 ID 연결 검증 | 통과 | 이름 유사 자동 연결 없음 |
| skRulesHtml/skPreview/skPtHtml | 공통/페이지 유형별 규칙과 구조 가이드 | `SkillRuleSummary`, 기존 `SkillStylePreview` | 실제 규칙 표시, PPT Skill 적용/보존 검증 | 통과 | 실제 슬라이드 자동 분할 없음 |
| skGuardList 전후 샘플 | 넘침·지원 불가를 실제 검증 결과로 안내 | `ProductionPreview`, `content.ts` | 글자/행 높이 추정과 적용 거부 검증 | 의도적변경 | 기획의 가짜 자동 해결 예시는 제거 |
| tpDesignHtml | 실제 layout/role/exclusion/브랜드 추출 확인 | `AppliedAssetDetail`, `SlideTemplatePicker` | 실제 Template 읽기 및 지원 칸 선택 검증 | 통과 | PowerPoint 동일 렌더 아님 |
| wsWrite:2573 | 소목차 선택·이전/다음·상태·고정 해제 | `ProductionToolbar`, `ProductionWorkspace` | 담당/PM/super·고정·snapshot capability 검증 | 통과 | 보관본은 조회 전용 |
| wsWrite 3패널 | 접기·크기 조절·작은 화면 전환 | `ProductionPanels`, `use-production-panels` | 너비 경계/초기화·키보드 구현 및 타입/lint/build | 통과 | 실제 반응형/접근성 실기 미검증 |
| writeThumbs | 내용 요약 썸네일·선택·담당/고정/의견·전체 수 | `SlideNavigator` | SSR 썸네일·선택 ID 정규화 | 통과 | 요약 썸네일은 PPT 축소 렌더가 아님 |
| slideHtml | 제목·리딩·본문·목록·표·이미지 입력 | `SlideContentEditor`, `use-slide-draft` | 초안/저장/충돌, plain text, 이미지 서명·크기 | 통과 | 자유형 도형 편집 제외 |
| writeThumbs/multiPrompt | 단일/다중 슬라이드 CRUD·이동·복사 | `ProductionWorkspace`, `editSlides`, `clipboard.ts` | 전체 대상 권한 검증, 일괄 원자 처리, 새 ID 생성 | 통과 | 외부 PPT 디자인 복사로 표현하지 않음 |
| 우클릭/단축키 | 화면 버튼과 Ctrl/Cmd C/V/D/S, Delete | `SlideNavigator`, `ProductionWorkspace`, `editor.ts` | 입력/IME 예외, 내부 토큰, plain text/이미지 검사 | 통과 | 실제 OS clipboard 실기 미검증 |
| 작업 이동 | 입력 보호, 실패/충돌 입력 유지, 경로 선택 | `use-workspace-draft-guard`, `use-workspace-selection` | guard 순차 실행/취소·URL 우선·ID 오류 33건 | 통과 | 브라우저 모든 history 경로 차단 보장은 아님 |
| srcPanel:3133 | RFP 근거/반영 상태·실제 자료 버전·미리보기 | `SourcePanel`, `RequirementCoverage`, 기존 FilePreviewDialog | 실제 원본 hash/회차, 링크 ID 검사 | 통과 | 분석하지 않은 페이지/발췌문 생성 없음 |
| cmtBlock:3117 | 스레드·답글·멘션·본인 수정/삭제·해결/재열기 | `ProjectComments`, `use-project-comments`, `comment-selectors` | 작성자/담당/읽기 전용·tombstone·회차 33건 | 통과 | 알림 전송 없음 |
| 댓글 핀 | 슬라이드 상대 좌표, 위치 선택·키보드/수치 이동 | `ProjectCommentPins` | 좌표 범위/크기 변환/작성자 권한 검증 | 통과 | 실제 포인터/포커스 실기 미검증 |
| srcPanel 미처리 의견 | 프로젝트 미처리 목록과 해당 slide 이동 | `SourcePanel`, `selectProjectComments` | 안정 slide ID 참조/고정 포함 조회 | 통과 | snapshot에는 나중 리뷰를 섞지 않음 |
| 기존 의견 | 별도 읽기 전용 archive | `LegacyCommentsArchive`, `IndexedDbCommentRepository::readExisting` | 없는 DB 생성 안 함, 기존 DB deepEqual, 탈퇴/namespace | 의도적변경 | 과거 전역 의견 자동 이관 없음 |
| 검토 요청 | 대상 참여자·멘션 포함 로컬 요청 기록 | `ReviewRequestDialog` | 참여자 ID 검증, 메시지 저장 권한 | 통과 | 실제 메일·메신저 전송 후속 |
| aiDo/demoRewrite/multiPrompt | 7종 빠른 요청·자연어·현재 사용 프롬프트/Skill | `ProductionAiPanel`, `createMockProposal` | 선택 대상 점검, 모의 축약·표 변환, plain text | 의도적변경 | 20%는 문장/목록 단위 근사 축약, 의미 분석 없음 |
| diffHtml | 전후 diff·항목 선택 적용·원문 유지·재생성·Undo | `ContentDiff`, `ProposalReview`, `applyProposal` | 한영문/줄바꿈/빈 셀/긴 본문·XSS escaping 검증 | 통과 | 60행 뒤 펼치기, 전체 문자열 보존 |
| PERM_KEYS:3062 | PM/super 전체, outline/assign/setup/complete/rework 5개 위임 | `ProjectPermissionDialog`, `permissions.ts` | 5개 개별 허용/거부와 UI capability 대조 | 의도적변경 | 인터뷰대로 재위임 제거·목차 구조 권한 추가 |
| confirmDone:3083 | 미완료 경고 동의 → 현재 상태 완성본 보관 | `ProjectRoundDialog`, `getCompletionSummary`, `domain.ts` | 작성/체크/의견 자동 완료 없음, snapshot deepEqual | 통과 | 제출 승인/품질 검증 의미 아님 |
| confirmRedo:3089/secLocked | 공통 회차 전환·완료 section 고정·명시 해제 | `use-project-round`, `WorkspaceProductionService`, 공유 IDB tx | 파일/제작 진입 동일, 동시 전환 하나만 성공 | 통과 | 다른 PC 실시간 협업 후속 |
| history | 완성본/미완성 이력·당시 본문/자료/설정/의견 | `ProjectHistorySelector`, `selectSnapshotView` | 이후 리뷰/PPT에도 snapshot 불변, 경로 유지 | 통과 | 파일만 있던 과거 회차에 제작 history 생성 안 함 |
| pptCtl:3905 | 실제 PPT 생성·진행·취소·저장·readback·다운로드 | `PptControls`, `use-workspace-ppt`, `exportPpt` | 저장 Blob SHA/XML 재조회, 오류/취소/권한 경합 | 통과 | 브라우저 다운로드 실기 미검증 |
| pptHistory:3909 | 생성본/외부 원본, 회차·작성자·시각·기준 입력·10개 목록 | `PptVersionHistory`, `versionPage` | 23개 fixture → 10/10/3, 이후 수정 표시·권한 숨김 | 통과 | 원본 파일과 웹 재출력은 별도 버전 |
| openRevision:3913 | 원본 등록과 웹 적용 분리, 실제 text/table 비교 | `importPpt`, `compareExternalDeck`, `PptImportReview` | XML 변경/빈 셀/숫자 문자열 readback, 원본 hash 보존 | 의도적변경 | .pptx만 지원, 기획의 고정 변경 목록 제거 |
| openRevision 매핑 | 실제 외부 shape → 현재 slot 명시 연결 | `PptMappingEditor`, `remapImport` | shape ID/메타데이터·중복/애매한 매칭 거부 | 통과 | 순서·제목 추측 자동 매칭 없음 |
| openRevision 선택 적용 | 세션 종료 후 원본 재비교·선택 적용·재출력 | `applyImport`, `clearProjectSessions` | 저장 version 재개/취소·만료·잠금/권한/충돌·57건 | 통과 | 디자인/좌표/차트는 외부 원본에서 확인 |
| 새로고침·자산 이용 | 프로젝트 사본 유지, 현재 원본/권한 미확인 시 제한 | `WorkspaceAssetService`, `AssetSelectionPanel` | 카탈로그 초기화/D21, 비활성·삭제/권한 회수 구분 | 통과 | 관리자 카탈로그 전체 영속화 후속 |

## 검증 명령과 결과

| 명령/인라인 시나리오 | 결과 | 근거 |
| --- | --- | --- |
| `npm run typecheck` | exit 0 | 전체 TypeScript |
| `npm run lint` | exit 0 | 마지막 UI 보완 후 전체 재검증 |
| `npm run build` | exit 0 | 최종 코드 compile·TypeScript·정적 생성 성공 |
| `git -c core.safecrlf=false diff --check` | exit 0 | 후행 공백·충돌 형식 확인 |
| `rg -n '<<<<<<<\|=======\|>>>>>>>' components/workspace services/workspace lib/workspace lib/pptx types` | exit 1 (일치 없음) | merge marker 없음 |
| `git status --short` / `git diff --name-only` | exit 0 | 승인된 기능과 .memory 문서, tests/·package 변경 없음 |
| P01 도메인/DB | 25 + 24건 | 초기 Task 검증 기록. 스키마·권한·Undo, 통합 저장/이관 및 blocked/versionchange/close 포함 |
| 자산 선택/소비/재적용 | 27건 | 일반 소비/관리자 CRUD 분리, 비활성·삭제·권한·상속·기본/선택 적용 |
| 실제 Template 내용/Skill | 52건 | 텍스트/표/이미지, 대상 제외·overflow·보존·안전 변환 |
| 다중 슬라이드 조립/왕복 | 28건 | 순서/shape ID·표/노트/관계 연결/혼합 크기/수동 매핑 |
| 서비스·PPT 흐름 | 57건 | 실제 원본 등록→세션 종료→재비교→선택 적용→재출력·SHA, 권한/취소/Quota/경합 |
| Runtime/선택/수명 | 33건 | 사용자·프로젝트 scope, cleanup, guard 순차 처리·취소 |
| 목차/권한/SSR/상속 | 44건 | ID/번호/합계/담당/위임/고정/read-only 버튼 일치 |
| 제작 편집/초안/일괄/SSR | 33건 | 내용 검증, 충돌 초안 보존, atomic batch, readonly 입력 |
| 의견/legacy 저장소 | 33건 | 없는 DB no-seed, 기존 DB 무변경, 작성자/담당/회차/좌표 |
| 회차/이력/diff/버전 UI | 48건 | 파일/제작 동기화·충돌 불변·미완료/원본 보존·10개 페이지 |
| 최종 통합 이관/권한/경합/SSR | 45건 | v1 3회차+원본 이관, 위임 5개, 명령 주입·탈퇴·고정 삭제 거절, 경합, snapshot 리뷰 분리, 제작 상태/썸네일 |

인라인 실행 방식: `@' ... '@ | node --import tsx`. fake-indexeddb로 격리된 DB와 `createDemoTemplateFile()`의 실제 PPTX 바이트를 사용했다. 사용자 DB·업로드 원본·인증 정보를 변경하거나 출력하지 않았다. 사례 수는 반복 검증을 포함하므로 서로 더해 고유 테스트 총수로 해석하지 않는다.

T06의 A~H는 위 시나리오와 선행 Task 검증으로 대응한다: A=3회차 이관, B=도메인·목차·45건 권한, C=DB/Quota/회차 경합, D=내용52·조립28·서비스57·자산27, E=서비스57·Runtime33, F=회차48·의견33·서비스57, G=자산27·서비스57의 D21, H=legacy33.

검증 중 인라인 이관 fixture의 Blob MIME 누락은 fixture를 실제 저장 형식(`text/plain`)에 맞춰 수정 후 재실행했다. 제품의 손상 검사 조건을 완화하지 않았다. build의 `baseline-browser-mapping` 오래된 데이터 경고는 기존 경고이며 새 dependency 설치로 숨기지 않았다.

## 저장·복원 계약

- `kpc-workspace-files` v2: 기존 `projects`/`blobs`/`preferences`의 키·Blob을 그대로 두고 `workspaces`/`workspaceBlobs`를 추가한다.
- namespace는 로그인 주체, aggregate는 프로젝트별이다. 프로젝트 사본과 파일 자료의 회차를 동일 트랜잭션에서 전환한다. 두 revision 중 하나라도 다르면 전체 거절한다. transaction 완료 후에만 성공 반환한다.
- `inputRevision`은 출력 기준 변경을 구분한다. PPT 등록·리뷰와 본문 변경을 같은 의미로 표시하지 않는다.
- 완성/미완성 snapshot에 본문·핀/원본 참조·파일 버전·당시 체크/의견을 보관한다. 이후 리뷰는 별도 배열이며 snapshot UI는 이후 리뷰를 합치지 않는다.
- 기존 원본을 참조하는 snapshot/slide가 있는 동안 파일 버전과 Blob을 GC하지 않는다. 기존 의견 DB는 조회만 하며 새 의견 aggregate와 분리한다.
- 임시 AI/수정본 비교/내부 클립보드는 만료·개수 제한을 두며 회차 전환과 runtime 종료 시 정리한다. Query key에 namespace/사용자/역할/runtime을 포함하며 이전 사용자의 캐시를 재사용하지 않는다.
- 일부 준비된 명령(`pin-assets`, `replace-content`, `register-ppt`, `batch-slides` 등)은 public 실행 스키마에서 거절한다. 검증을 완료한 서비스만 저장소의 준비된 명령 경로를 사용한다.
- 일괄 이동/삭제는 기존 replace-content의 전체 순서 불변 규칙을 약화하지 않도록 내부 `batch-slides` 명령으로 처리했다. 삭제/이동 전체를 한 번 검증·저장하고 Undo 대상으로 남긴다.

## 서버 연결 시 유지할 경계와 D21

- UI → Query → 서비스 계약을 유지하고 IndexedDB 구현을 서버 저장소/API로 교체한다. 인증 주체, 실제 프로젝트 구성원·PM·위임, 원본 자산 공개 범위는 서버가 다시 조회해야 한다.
- 서버는 모든 ID·본문·매핑·파일 서명/ZIP 제한·expected revision을 검증하고, 원본·snapshot·회차 전환의 원자성과 불변 참조를 보장해야 한다. 클라이언트가 보낸 권한/capability/요약을 신뢰하지 않는다.
- Azure 리소스·Cosmos 컨테이너·Blob·실제 AI/RAG/메일은 만들거나 연결하지 않았다. 저장소 변경 전 기존 Cosmos 스킬·프로비저닝 경로를 검토하는 후속 계획이 필요하다.
- D21: 관리자 자산 목록/원본은 현재 메모리 기반이다. 새로고침 뒤 직접 등록한 원본·최신 권한을 못 찾으면 프로젝트 본문/핀/Blob은 보존하되 해당 생성·미리보기·다운로드를 차단한다. 같은 이름의 새 자산을 자동으로 같은 원본으로 간주하지 않는다.
- 사용 가능한 자산을 명시 재선택하면 현재 편집본을 복구할 수 있다. 기존 읽기 전용 snapshot의 핀을 새 자산으로 조용히 바꾸지 않으므로, 원본 확인이 불가능한 과거 버전은 다운로드 제한이 지속될 수 있다.
- 로컬 저장은 브라우저·PC 간 공유 또는 실제 공동 편집을 제공하지 않는다. 실제 조직 권한·감사 기록의 서버 보장은 후속이다.

## 지원 한계와 미검증

| 항목 | 상태 | 범위 |
| --- | --- | --- |
| 브라우저 반응형/모달 포커스/drag/키보드/clipboard/다운로드 | 미검증 | 사용자 지속 정책으로 브라우저 실기 제외. 순수 계산·SSR·정적 처리만 검증 |
| PowerPoint 시각 렌더링·설치 글꼴·페이지 넘침 | 미검증 | ZIP/XML·관계·값·원본 보존을 검증했으며 렌더 동일성을 보장하지 않음 |
| 자유형 캔버스·도형/차트/그룹 편집 | 후속 | 이번 선택은 내용 중심 편집. 지원하지 않는 내용은 원본 보존/제한 표시 |
| 혼합 페이지 크기·충돌하는 전역 스타일·custom show | 의도적변경 | 조용히 변형하지 않고 출력 거부. 하나의 문서 페이지 크기 유지 |
| 병합 표·상속/그룹 내부 대상·복잡한 넘침 | 의도적변경 | 지원하지 않는 대상 적용 거부. 칸 재선택/내용 수정 경로 |
| 외부 수정본의 순서/디자인/좌표/이미지 변경 | 후속 | 원본 PPT에는 보존, 웹에는 연결 확인된 텍스트/목록/표만 선택 적용 |
| 실제 자연어 AI·RFP 분석·품질/요구사항 검수 | 후속 | 모의 제안·비교·적용만 실제 동작. 토큰 과금/실제 AI 통계 미기록 |
| 관리자 카탈로그 영속화·실시간 협업·PDF 제출 패키지 | 후속 | 사용자 선택대로 이번 범위 밖 |

## 최종 보완 및 인수 포인트

- 제작 toolbar에도 소목차 작성 상태를 제공하고, 슬라이드 목록에는 저장 내용을 이용한 요약 썸네일을 추가했다.
- snapshot에서 제작 이동 시 snapshot ID를 유지하고 이후 리뷰가 보관 당시 의견에 섞이는 경로를 차단했다.
- 편집 초안 저장 후 이어지는 붙여넣기/삭제 준비/이동/복제/출처 변경은 새 기준을 읽는다. 복사는 미저장 보호를 거친다.
- PPT 생성 전에 연결이 빠진 슬라이드와 연결 화면으로 이동하는 경로를 표시한다. 외부 원본 저장과 적용은 별도로 알리며 취소한 작업의 늦은 UI 결과를 무시한다.
- 구조화된 본문을 새로 줄여 표로 바꾸는 모의 요청은 이전 텍스트 슬롯 연결을 해제하여 잘못된 종류에 억지로 쓰지 않는다.
- 작업 관련 인접 보완은 공통 인증/서버 권한을 약화하지 않는 범위에서 파일·의견 runtime 통합과 원본 보존에 한정했다. 별도 비대상 기능 변경은 없다.
