# Task: T04 오버레이 간격·전체 회귀·인계

## Status: done

## Goal

팝업의 간격은 페이지와 분리한 공통 설정으로 관리하고, T01~T03의 레이아웃 전환을 비브라우저 검사로 마무리한다. 디자인 컴포넌트 사용법과 예외를 HTML/보고서에 정리하고 모든 Task의 결과를 한 번에 커밋한다.

## Decision Summary

- 일반 페이지12px를 모달/코멘트 좌표에 강제로 적용하지 않는다. 기존 ModalFrame·포커스·팝업 크기/스크롤 정책을 재사용한다.
- 브라우저 검증은 지속 사용자 정책으로 제외한다. E2E의 낡은 배치 기대는 소스만 수정하며 실행/통과 기록을 만들지 않는다.

## Implementation

### I01. ModalFrame의 별도 간격 역할

- Related Files:
  - `components/ui/ModalFrame.tsx` :: `ModalFrameProps`, `useStyles`, `ModalFrame` — 공통 오버레이 간격; modify
  - `app/layout-tokens.css` :: 오버레이 변수 — T01 원본 확장/재사용; modify
  - `components/providers/DadamThemeScope.tsx` — portal theme 계약; read-only

#### Details

- **Signatures & Types**: 기존 public API를 그대로 둔다.

```typescript
interface ModalFrameProps {
  open: boolean; title: string; subtitle?: string; width?: number;
  contentKey: string; children: React.ReactNode; footer: React.ReactNode;
  onClose(): void;
}
function ModalFrame(props: ModalFrameProps): React.ReactElement;
```

- **Data & Schema Fields**: width 기본560, titleRef/bodyRef/returnFocus/restoreFrame과 contentKey 의미 유지. 신규 DTO/영속 상태 없음. 간격은 아래 CSS 변수들에만 의존한다.
- **Execution Flow / Logic**:
  1. surface padding0, flex/min-height0, max-height `min(88vh, calc(100svh - var(--layout-overlay-safe-inset) - var(--layout-overlay-safe-inset)))`; max-width도 viewport에서 safe inset 두 번을 뺀다. 별도480px 미디어의 같은32px literal도 정리한다.
  2. header padding=`var(--layout-dialog-block-inset) var(--layout-dialog-inline-inset) var(--layout-section-gap)`, gap=dialog-header-gap. 기본값은 기존16px18px12px/10px와 같다.
  3. body padding=`var(--layout-inline-gap) var(--layout-dialog-inline-inset) var(--layout-dialog-block-inset)`, gap=section. 기본4px18px16px. footer padding=`var(--layout-section-gap) var(--layout-dialog-inline-inset)`, gap=control. 기본12px18px/8px.
  4. body 직접 자식 p margin0으로 gap 중복을 줄인다. 표/입력/오류/푸터를 숨기지 않는다. body overflow-y:auto, min-height0, footer flex-shrink0, 작은 화면의 max-height 정책을 유지한다.
  5. open/contentKey 변화 시 body scrollTop0 및 title focus, Escape capture/onClose, 비동기 열림의 trigger 복귀, 중첩 모달이 남았을 때 조기 복귀 방지 로직은 수정하지 않는다.
  6. 새 네트워크 요청/예외 처리 없음. 모달이 닫히거나 렌더 제거될 때 rAF cleanup 및 포커스 복귀가 기존대로 동작해야 한다.

### I02. 모달 소비자의 폼 간격 정리

- Related Files (기존 함수/props 이름은 파일명과 동일, 모두 modify):
  - `components/admin/users/DirectoryPickerDialog.tsx`
  - `components/admin/users/UserEditorDialog.tsx`
  - `components/admin/users/GroupEditorDialog.tsx`
  - `components/admin/assets/AssetDeleteDialog.tsx`
  - `components/admin/templates/TemplateEditorDialog.tsx`
  - `components/admin/templates/TemplateFileInput.tsx`
  - `components/admin/templates/TemplateExtractionPanel.tsx`
  - `components/admin/templates/TemplateMappingFields.tsx`
  - `components/admin/templates/workbench/SkillPickerDialog.tsx`
  - `components/admin/templates/workbench/LatestVersionDialog.tsx`
  - `components/profile/token/TokenUsagePanel.tsx`
  - `components/profile/token/TokenRequestPanel.tsx`

#### Details

- **Signatures & Types**: 기존 props 유지. `AssetVisibility`, `TemplateDraft`, `VersionedRef`, `WorkView`, `TokenRequestDraft/Errors`, `UiValue extends Omit<TemplateDraft,"fileRefId">`와 draft/session/import 상태를 바꾸지 않는다.
- DirectoryPicker/UserEditor/GroupEditor의 폼·필터 grid/flex gap은 section/control로, 직접 p margin은0으로 정리한다. ModalFrame body 밖에서 body 전체를 다시 패딩 주지 않는다. 선택/검색/디렉터리 추가/역할·초대 옵션/직접등록/삭제 확인을 보존한다.
- AssetDelete/LatestVersion의 안내는 margin0, 버튼 gap=control. ‘기존 적용 버전 유지’, 재적용 확인 문구와 onConfirm target/version을 바꾸지 않는다.
- SkillPicker의 필터/목록 간 간격은 section, 선택 버튼 묶음은 control. source capability·active·공개범위 검사를 보존한다.
- TemplateEditorDialog의 3열 grid/좌측 폼 gap3→section, 저장/취소/버리기 footer는 ModalFrame이 소유한다. width1200·실제 파일 분석/취소/교체 초기화/readonly/에러·공개 범위/최신 재적용 안내 유지. 재업로드로 contentKey를 임의 변경해 draft를 날리지 않는다.
- TemplateFileInput 업로드 영역 p4→card, 내부 문단/상태 간격 section/control; TemplateExtractionPanel과 TemplateMappingFields p3→card, 필드 gap2→control, 요소 목록 행 내부 p2→control/행 간 gap control. 파일 최대250MiB/accept/드롭/분석 취소/추출 정보·미지원 사유/슬라이드 유형·역할·적용 제외 조건 유지.
- TokenUsagePanel root/2열영역 gap12→section, 내부 metric grid/buttons gap8→control, 차트 label gap4→inline, 카드 padding은 기존 dadamUi.cardPadding 재사용. 차트 높이110px와 표의 수치/비율은 유지한다.
- TokenRequestPanel form gap12→section, choices/reasons/approver/summary 간격은 control/inline 역할로 통일한다. input 자체 크기/textarea padding과 숫자 모델은 유지한다. 외부 form submit/유효성 오류/중복신청/보류 상태를 변경하지 않는다.
- 일반 ModalFrame과 달리 성격이 다른 PPT 문서 미리보기 내부의 cm/pt/padding에는 이 매핑을 적용하지 않는다.

### I03. 프로필·코멘트 팝업과 일반 카드 연결

- Related Files:
  - `components/profile/ProfileMenu.tsx` :: `useStyles` — 팝업 영역 간격; modify
  - `components/profile/ProfileGeneralTab.tsx`, `components/profile/ProfilePreferencesTab.tsx`, `components/profile/ProfileNotificationsTab.tsx` :: `useStyles` — 루트/카드 간격; modify
  - `components/comments/CommentPopover.tsx` :: `useStyles` — 헤더/본문/작성 푸터 간격; modify
  - `components/comments/CommentPreview.tsx` :: `useStyles` — preview inset; modify
  - `components/comments/CommentComposer.tsx`, `components/comments/CommentMessage.tsx`, `components/comments/CommentActionsMenu.tsx` :: `useStyles` — 작은 간격 역할; modify
  - `lib/comments/geometry.ts`, `components/comments/CommentsProvider.tsx`, `components/profile/ProfilePreviewProvider.tsx`, `components/profile/token/TokenDialogs.tsx` — 크기/동작/상태 계약; read-only

#### Details

- CSS 원본에 `--layout-profile-body-padding:12px 14px`, `--layout-profile-footer-padding:8px 10px 8px 16px`를 추가한다. T01의 profile-header-padding/gap, popover-inset16, compact-inset12, comment-footer-end-inset20 및 section/control/inline 변수를 재사용한다.
- ProfileMenu **팝업** header/body/footer는 위 역할 변수로 연결한다. tabs는 padding `0 var(--layout-control-gap)`, footer gap=control. 사이드바 profile trigger의7px9px/접힘 위치 및 아바타 크기는 바꾸지 않는다. surface width348/height620/viewport 보정86·위치 anchor·탭 예약 label slot/키보드/로그아웃/권한 전환 동작은 보존한다.
- ProfileGeneral/Preferences/Notifications root gap12→dadamUi.sectionGap. Preferences card의12px literal→dadamUi.cardPadding, 나머지 기존 card alias 유지. toolbar/액션 묶음 간격은 control, label 메타는 inline. root/card 밖 도형 크기/아바타/상태점 위치까지 일괄 치환하지 않는다.
- CommentPopover header padding=`var(--layout-control-gap) var(--layout-popover-inset)`, gap inline; body padding=`0 var(--layout-popover-inset)`; footer padding=`var(--layout-section-gap) var(--layout-comment-footer-end-inset) var(--layout-comment-footer-end-inset) var(--layout-popover-inset)`. confirm p=popover-inset, error p=control/popover, conflict p=control, confirmButtons gap=control/margin-top=popover.
- popover min-height48, resize handles/touch-action/z-index/rect.height>=240 푸터 override/max-height65%/25%/위치/크기 저장과 controller 동작은 유지한다. CSS 원본값 기본은 현재 수치와 같게 시작한다.
- CommentPreview p=popover-compact, meta gap=control; 위치/크기·pointer-events:none 유지. CommentMessage 행 py12→section, meta column8/row4→control/inline. Composer controls gap/margin8→control, options8→control, suggestions/actions-menu inset4→inline. 입력 textarea의10px 패딩/최소56/최대120와 IME 로직은 그대로 둔다.
- 빈 공간 전체를 같은 숫자로 강제하지 않는다. 이관한 역할은 HTML 가이드에 기록하고 컨트롤 내부/아이콘 보정·문서 수치 예외를 명시한다.

### I04. 기존 테스트 기대 정리와 전체 검증

- Related Files:
  - `tests/e2e/admin-comments-merge.spec.ts` :: 모바일 titleBox/buttonBox 기대 — 소스만 수정
  - `tests/e2e/admin-responsive.spec.ts`, `tests/e2e/admin-skill-editor.spec.ts`, `tests/e2e/admin-review.helpers.ts` — 현재 선택자 점검; read-only (새 구조와 직접 충돌하는 선택자만 수정)
  - `tests/components/token-dialog-ui.test.ts`, `tests/components/dadam-theme-scope.test.ts` — 모달/포털 검사; read-only (구조 변화에 필요한 fixture만 수정)
  - `tests/lib/comments/shell-ui.test.ts`, `tests/lib/comments/workspace-ui.test.ts`, `tests/lib/comments/geometry.test.ts` — 포커스/팝업 경계; read-only
  - `tests/components/layout/workspace-primitives.test.ts`, `tests/components/layout/workspace-routes.test.ts`, `tests/components/admin/skill-editor-layout.test.ts` — T01/T02 추가 검사; read-only

#### Details

- E2E의 `titleBox.y >= buttonBox.y + buttonBox.height`는 새 결정과 반대다. `main [data-workspace-header]`에 title과 trigger가 함께 있고 각각 보이는지, 두 bounding rect가 서로 겹치지 않는지로 기대를 변경한다. 좁은 폭의 actions 줄바꿈은 허용하므로 모든 child가 같은 y라는 조건은 넣지 않는다.
- 경로 이동/코멘트 생성/다운로드/핀 보존/모바일 메뉴 inert/Escape 복귀/overflow 검사를 삭제해 쉬운 테스트로 만들지 않는다. **Playwright 명령은 실행하지 않는다.** 소스 수정은 typecheck/lint에서 정합성만 확인하고 보고서에는 E2E 미실시로 적는다.
- jsdom 기존 ModalFrame title 포커스/본문 스크롤 초기화/외부 제출 버튼/닫기·중첩 복귀/포털 테마를 유지한다. 우연한 class hash나 전체 markup snapshot에 맞춰 기대를 바꾸지 않는다.
- 최종 diff에서 대상 파일별 패딩 소유와 globals import/layout @source를 정적으로 확인한다. 확인 표는 일반페이지/표카드/Skill/Template/캔버스/모달/프로필로 나눈다.
- 전체 테스트 실패 시 실제 변경 원인을 해결한 후 관련 검사와 최종 gate를 다시 실행한다. 브라우저 제외는 자동 테스트 실패를 면제하는 정책이 아니다. 기존 외부 환경 실패가 있다면 재현 명령/원인과 변경 영향 분리 여부를 적고 통과로 기록하지 않는다.

### I05. 인계 문서와 단일 커밋

- Related Files:
  - `.memory/reports/2026-11-02-workspace-spacing-system.md` — 실제 결과/검증/예외/잔여; new
  - `.memory/reports/2026-11-02-workspace-spacing-components.html` — 디자인 컴포넌트 가이드; new
  - `.memory/plans/2026-11-02-workspace-spacing-system.md`, 이 Phase의 `phase.md`와 T01~T04 — 상태 동기화; modify
  - `.memory/current.md` — 완료 포인터/커밋 hash; modify (기존 gitignore 유지)

#### Details

- 보고서에 바뀐 파일 묶음, 실제 토큰 원본 위치, 페이지/헤더/카드의 패딩 소유, 권한/초안/핀좌표 보존, 잔여 고정값의 목적을 기록한다. command/종료 결과/테스트 수는 실제 실행 결과만 적는다.
- HTML은 외부 CDN/이미지/라이브러리 없는 단일 파일로 만든다. 일반 페이지 프레임, 헤더(메뉴/제목/액션/접힌 안내), inset/flush 카드, Skill sticky, canvas/overlay 예외를 도식/샘플로 보여준다. 원본 변수/수치/소비 파일 매핑, 변경 방법, 적절한/이중패딩 조합 비교, 검증 범위 표를 포함한다.
- 가이드의 CSS 값은 문서 예시이며 앱의 또 다른 설정 원본이 아님을 명시한다. 앱 파일을 바꿨다면 가이드도 확인하라는 인계 설명을 넣는다. browser render/스크린샷을 새로 수행하지 않으며 HTML을 시각 검증 완료로 표현하지 않는다.
- 모든 Task 검증 후 Status=done, Progress체크, Phase4/4, Plan완료로 동기화한다. 추적 문서 commit 필드는 `batch (Plan 헤더로 git log 조회)`로 두고 동일 커밋 hash를 자기 본문에 억지로 넣지 않는다.
- `git status --short`/diff로 사용자 작업과 이 Plan 파일을 분리해 명시적 stage, `git diff --cached --check`, `git diff --cached --stat` 확인 후 아래 메시지로 **한 번 커밋**한다. 임의 git add . / 강제 add current / 관련 없는 amend/강제 push 금지. 사용자 명시 지시에 따라 완료 커밋을 origin/dev로 일반 push한다. commit 실패는 성공으로 기록하지 않는다.
- 커밋 성공 후 ignored current에 실제 hash/검증 요약/Active Task 없음 기록, `git status --short`로 남은 변경을 보고한다. 새 scope를 자동으로 시작하지 않는다.

## Acceptance Criteria

- [x] ModalFrame·프로필·코멘트 팝업이 공통 원본의 별도 역할 값을 사용한다.
- [x] 기존 모달 footer/포커스/스크롤/권한/미저장·임포트 상태 및 코멘트 rect 계산이 보존된다.
- [x] 전체 unit/jsdom·typecheck·lint·build 및 diff 검사를 통과했다.
- [x] 로컬 E2E source의 낡은 배치 기대만 정리했고 미실시 정책을 정확히 기록했다.
- [x] 한국어 보고서/독립 HTML 가이드와 Plan/Phase/Task/current 동기화가 끝났다.
- [x] 이 Plan의 구현·문서를 단일 커밋에 포함하며 테스트는 사용자 결정대로 로컬에 보존했다.

## Validation

- `npm.cmd test` — 전체 Vitest suite. 브라우저 E2E는 include 대상이 아니다.
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`
- `git diff --cached --check` / `git diff --cached --stat` — 최종 stage 후 확인
- 보고서/HTML 링크 및 CSS 변수 이름을 앱 원본과 정적 대조한다. HTML에 외부 script/CDN이 없는지 확인한다.
- [지속 정책](../../../decisions/2026-10-30-task-validation-policy.md): 브라우저 검증/native IME·터치/스크린샷/dev server 미실시. 자동 검증 결과로 렌더링 품질이 완전히 증명됐다고 보고하지 않는다.

## Commit Message

아래는 기본 실행의 전체 Task 단일 커밋 메시지다.

```text
refactor(layout): css 여백 및 공통 디자인 컴포넌트 통합

Plan: 2026-11-02-workspace-spacing-system
Phase: P01-shared-workspace-layout
Task: T01-spacing-foundation, T02-unified-shell-header, T03-screen-spacing-migration, T04-overlays-regression-handoff

- 홈·관리자·업무 페이지의 여백과 모바일 헤더를 공통화
- 표·폼·오버레이의 간격 역할을 분리하고 기존 동작 보존
- 비브라우저 회귀 검증과 디자인 컴포넌트 가이드 기록
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- [x] 보고서·HTML·메모리 동기화
- [x] 전체 Task 단일 커밋에 포함
- commit: batch (Plan 헤더로 git log 조회)
- 다음 Task: 없음. current에는 실제 커밋 hash와 push 결과를 기록한다.

## 실행 기록

- 2026-11-02: 앱 구현과 HTML/결과 보고서 작성 완료. 전체76파일575테스트, typecheck/lint/build/diff 검사 통과. HTML 외부리소스0/JS문법/중복ID 및 CSS 미정의 변수0 검증.
- origin/dev의 bc71bf8이 기존 tests 전체를 삭제했으므로 테스트 저장 정책을 질문했고 사용자는 ‘원격 삭제 유지·테스트 로컬 보관’을 선택했다. 기존 로컬 d07b9a2와 원격 이력을 보존하는 병합으로 통합했다.
- 로컬 테스트 93개와 별도 백업의 SHA-256이 일치하고, 변경 앱 소스 78개는 병합 전과 동일하다. Git 추적 테스트와 미해결 충돌은 모두0개다. 복원 후 전체76파일575테스트를 다시 통과했다.
- 새 회귀 테스트와 수정한 E2E 소스도 로컬 tests에만 보관한다. `.git/info/exclude`만 수정했으며 공유 `.gitignore`는 유지한다. 새 clone/CI에서 테스트를 재현할 수 없다는 제한을 결과 보고서와 HTML에 기록했다.
- 사용자 요청에 따라 모든 Task 구현·문서를 ‘css 여백 및 공통 디자인 컴포넌트’ 문구가 있는 단일 병합 커밋에 포함하고 origin/dev로 일반 push한다. 실제 hash/전송 결과는 로컬 current와 완료 응답에 기록한다.
