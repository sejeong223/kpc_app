# Task: T02-toc-and-setup 목차·체크리스트·권한·제작 설정 화면

## Status: done

## Goal
기획 HTML의 목차 표와 행정 체크리스트를 실제 프로젝트 데이터로 편집하고 제작 자산을 연결한다.

## Decision Summary
- D01/D05/D14/D16: 2단계 목차, 복수 담당/리뷰, 5개 위임 권한, 프로젝트별 자산/프롬프트 설정.
- PM/슈퍼의 전체 권한을 편집 가능한 checkbox로 만들지 않는다. 자산 선택은 프로젝트 목차/기존 슬라이드를 자동 교체하지 않는다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 목차·체크리스트와 집계
- Related Files:
  - `components/workspace/toc/TocWorkspace.tsx`, `TocTable.tsx`, `TocRowActions.tsx`, `AdministrativeChecklist.tsx` — new
  - `components/workspace/shared/MemberPicker.tsx`, `WorkspaceDeleteDialog.tsx`, `WorkspaceUndoNotice.tsx` — new
  - `lib/workspace/production/selectors.ts` :: selectTocRows/selectChecklistPermissions/selectDeletionImpact — modify
  - `components/workspace/WorkspaceScreen.tsx` :: toc 연결 — modify
  - `components/ui/DadamControls.tsx`, `components/ui/ModalFrame.tsx`, `components/layout/WorkspacePage.tsx` — reuse
#### Details
**Signatures & Types**
```typescript
interface TocRow {
 kind:"chapter"|"section";id:string;chapterId:string|null;number:string;title:string;
 assigneeIds:string[];reviewerIds:string[];state:"writing"|"done"|null;locked:boolean;
 sectionCount:number;doneCount:number;slideCount:number;openComments:number;
 coverage:{full:number;partial:number;none:number};canStructure:boolean;canAssign:boolean;canEdit:boolean;canUnlock:boolean;
}
function selectTocRows(view:ProjectView):TocRow[];
function selectDeletionImpact(view:ProjectView,id:string):{sectionIds:string[];slideIds:string[];openComments:number;blocked:boolean;reasons:string[]};
interface MemberPickerProps {members:WorkspaceMember[];selected:string[];minimum:number;label:string;disabled?:boolean;onChange(ids:string[]):void}
interface WorkspaceDeleteDialogProps {open:boolean;title:string;impact:ReturnType<typeof selectDeletionImpact>;busy:boolean;error:string|null;onConfirm():void;onClose():void}
```
- 원본 chapters={id,title}[], sections={id,chapterId,title,assigneeIds,reviewerIds,state,locked}[], slides={id,sectionId,…}[], requirements={id,sectionId,title,coverage,…}, threads.status=open|resolved. 행 번호는 배열 순서에서 계산하고 stable id를 React key/라우팅/드래그에 사용한다.
- 표 열은 번호·목차·담당자·리뷰자·상태·슬라이드 수·RFP 반영·미처리 의견·행 액션. 대목차는 done/total, 슬라이드/의견 합계; 전체 요약은 필터/접기와 무관한 프로젝트 집계다. 제목 클릭은 안전하게 인라인 편집, 제작 이동은 별도 링크로 분리한다.
- 대목차/소목차 위·아래 추가, 이름 변경, 삭제, 위/아래 이동, 다른 대목차로 이동, 접기/모두 접기/펼치기. 드래그 시 drop 위치와 묶음 단위를 표시하고 같은 동작을 버튼/키보드로 제공한다. 이동 계획은 {id,beforeId,chapterId}로 만들고 DOM순서를 저장하지 않는다.
- command는 반드시 {projectId,expectedRevision,expectedRound,operation}. 이름 저장/담당 저장/삭제 확인을 여는 시점의 revision을 보관한다. mutation중 중복 요청 차단, 실패 draft 유지, CONFLICT시 최신 내용과 재편집 안내. optimistic 성공 표시를 하지 않는다.
- MemberPicker는 접근 가능한 members만 이름·부서로 검색, 선택 chip/해제/전체선택 없이 개별복수 선택. 담당 최소1, reviewer0가능. 검색으로 선택 목록을 잃지 않는다. 선택 행위로 프로젝트외 사용자를 추가하지 않는다.
- 목차구조 outline, 담당/리뷰 assign, 상태변경 해당section편집, locked 해제 해당담당/PM/슈퍼. 권한 없는 버튼은 렌더하지 않는다. 잠긴 자손 포함 대목차삭제/이동은 서버형 도메인 검사와 일치하도록 차단 이유 표시.
- 삭제는 관련 slide/opencomment 영향 수와 되돌리기15초 안내. Undo는 actor/revision/round/현재 권한을 재확인하며 다른 작업 뒤 자동 복원하지 않는다. 같은 notice컴포넌트를 슬라이드/체크리스트에도 사용한다.
- 체크리스트 열: 항목, 근거, 복수담당, 확인, 확인자/시각, 행액션. 구조는 outline, 담당 assign, 확인은 해당담당/PM/슈퍼. check=false면 checkedBy/At=null. 완료 회차는 읽기전용. 고정 섹션과 독립인 체크리스트를 임의 완료 처리하지 않는다.
- AI 추천/자연어 수정은 P02 서비스 propose를 호출해 P03-T05 공통 비교 UI에 넘긴다. 이 Task에서는 정확한 typed callback/빈 비교 상태를 준비하고 즉시 적용하지 않는다. 기획의 alert 시연을 실제 분석으로 복사하지 않는다.

### I02. 참여자별 관리 권한
- Related Files:
  - `components/workspace/toc/ProjectPermissionDialog.tsx` — new
  - `lib/workspace/production/selectors.ts` :: 권한 표시 adapter — modify
#### Details
- ProjectPermission은 outline/assign/setup/complete/rework. UI 문구는 목차 구조 변경/담당 지정/제작 설정/완성/재작업이다. 표 행은 현재 프로젝트 참여자, 열은 5개checkbox. 관리 주체는 PM/슈퍼만이며 일반 부서관리자에게 자동 권한을 주지 않는다.
- PM/슈퍼는 고정 전체권한 설명/배지로 표시하고 편집checkbox/자기권한회수UI를 만들지 않는다. 비관리 참여자는 자신의 유효 권한을 읽기전용으로 조회할 수 있으나 편집 버튼은 없다.
- 변경은 set-grants(userId,permissions)로 저장하고 다른 사람의 변경과 충돌하면 덮어쓰지 않는다. 저장 후 액션 capabilities를 다시 읽는다. 담당 지정 권한이 본문 편집까지 의미하지 않는다는 안내를 필요한 위치에 둔다.
- 모달은 ModalFrame focus restore, 레이블/설명/keyboard 작동 유지. 취소/저장실패에서 기존권한 변경0.

### I03. 제작 설정·자산 버전·프롬프트 연결
- Related Files:
  - `components/workspace/setup/SetupWorkspace.tsx`, `AssetSelectionPanel.tsx`, `ProjectPromptEditor.tsx`, `AssetReapplyDialog.tsx` — new
  - `hooks/workspace/use-workspace-assets.ts` :: list/apply/preview — new
  - `components/workspace/WorkspaceScreen.tsx` :: setup 연결 — modify
  - `services/workspace/WorkspaceAssetService.ts` :: list/apply/checkPins/preview — reuse
  - `lib/admin/prompts/outline.ts`, `components/admin/templates/workbench/TemplateSlidePreview.tsx` — reuse
  - `components/admin/skills/SkillStylePreview.tsx`, `config/skill-options.ts` — 규칙 표시/서식 예시 재사용; 관리자 편집 권한을 공유하지 않음
  - `components/workspace/setup/AppliedAssetDetail.tsx`, `SkillRuleSummary.tsx` — 읽기 전용 자산 상세; new
#### Details
- 설정은 body.settings={promptPinId,skillPinId,templatePinId,bindings:[{sectionId,itemId}],overrides:[{itemId,prompt,sources}]}이며 각pin nullable. pins에는 적용 당시 revision/snapshot와 Template blobId/sha256가 있다.
- 프롬프트 세트/Skill/Template 선택 card는 현재이름/적용version/최신version/상태/접근상태를 표시한다. list는 제작용 공개자산 조회만 호출한다. 일반사용자의 관리자CRUD/메뉴를 열지 않는다. 관리버튼은 setup capability일 때만 렌더한다.
- Template 기본 seed가 없으므로 실제 등록 자산0 상태를 설계한다. 관리자에게는 등록화면 링크, 일반사용자에게는 선택가능한 Template 요청 안내를 제공한다. 임의데모PPT를 실제 등록본처럼 적용하지 않는다.
- 기획 wsSetup의 3개 자산 탭/상세 영역을 유지한다. 선택본의 이름/설명/버전/소유 부서와 이용 상태를 표시하고 '자세히 보기'는 읽기 전용 AppliedAssetDetail을 사용한다. 프로젝트 override에는 프로젝트 전용 표시를 하되 현재 관리자 모델에 없는 전용 자산 권한을 새로 만들어 허용하지 않는다.
- Skill 상세는 실제 rules의 글꼴/제목·lead·본문 크기와 굵기/줄 간격, 제목·본문·표 간격, 표 서식, 여백, 안내선·눈금, 배치/넘침 규칙, 페이지 유형별 상속 값을 빠짐없이 요약한다. SkillStylePreview(rules)를 사용한 유형별 샘플은 '서식 예시'이며 실제 파일 자동분할 성공으로 표현하지 않는다. 실 Template 전후 비교는 P02 엔진이 지원한 적용 결과와 warnings만 표시하고 넘침/겹침을 항상 해결한다는 시연 문구는 제거한다.
- Template 상세는 실제 extraction의 페이지 유형·레이아웃·슬라이드·요소 역할·적용 제외·지원 경고와 TemplateSlidePreview를 보여준다. 색/로고를 기획의 가짜 값으로 대체하지 않으며 새 브랜드 편집 UI를 추가하지 않는다. 프롬프트 상세는 목차별 실제 프롬프트와 소스 순서/상속/override를 표시한다.
- 목차↔프롬프트 항목 매핑은 explicit itemId선택, 일치/유사 이름은 제안으로만 표시한다. parent prompt/source 상속과 override의 null(상속)/빈값 의미를 기존 resolveProjectPrompt 계약에 맞춘다. 원본세트를 변경하지 않고 프로젝트 전용 override만 저장한다.
- 새자산 선택/최신 재적용은 변경 내용·역할매핑·영향 slide 목록을 먼저 확인한다. replaceSlideIds=[] 기본은 이후새slide 설정만 변경. 기존slide 업데이트는 명시적 선택 + 해당section편집 권한 + 잠금해제 필요. 고정/과거 snapshot은 자동 재반영하지 않는다.
- 비활성화/삭제가 확인된 기존 pin은 현재이용권한이 있으면 유지하고 새선택에서 제외한다. 원본/최신권한 확인불가=unavailable은 D21 재선택 안내와 생성/재적용/다운로드 제한. 프로젝트본문·사본을 지우지 않는다.
- 수정된Template 원본의 object path/shape역할이 달라지면 매핑 재확인을 요구한다. select 이름이 같다는 이유로 다른bytes를 몰래 같은핀으로 대체하지 않는다. 저장 error는 draft유지/재시도경로, 화면상 예시데이터/화면안내 배너 반복 추가 금지.

## Acceptance Criteria
- [x] 기획 목차·체크리스트 열/액션/집계를 실제 공유 상태로 제공한다.
- [x] 안정 ID로 이동하며 담당/리뷰·의견·슬라이드 연결을 유지한다.
- [x] 5개 관리 권한의 편집과 본문 편집 권한이 분리된다.
- [x] 프로젝트 자산 선택/프롬프트 상속/최신재적용이 관리자 원본과 과거 고정본을 자동 변경하지 않는다.

## Validation
- `npm run typecheck`
- `npx eslint components/workspace/toc components/workspace/setup components/workspace/shared hooks/workspace/use-workspace-assets.ts lib/workspace/production/selectors.ts components/workspace/WorkspaceScreen.tsx`
- node --import tsx 인라인 selector검증: 접기 전후 전체집계 동일, move-section/move-chapter 후 번호만 변경되고 id/slide/comment연결 유지, 완료수·미처리의견·RFP coverage 합계 assert.
- 동일 입력의 일반member/위임member/담당/PM/super/locked/completed를 순회해 canStructure/canAssign/canEdit/canUnlock과 도메인허용 결과가 일치하는지 assert.
- ReactDOMServer.renderToStaticMarkup로 순수 표/권한dialog/MemberPicker 구성의 permission props를 넣어 권한없는 action markup 부재, 모든input accessible label, PM/super 가변 checkbox 부재를 검사한다. 브라우저를 띄우지 않는다.
- 자산apply 인라인: 기본변경은 기존slide.usedSettings 불변; replaceSlideIds 명시할 때만 갱신; locked 항목 포함시 전체거절; parent상속/override null/항목삭제/이름같은다른ID를 검사한다.
- `git diff --check`

## Commit Message
```text
feat(workspace): 목차와 프로젝트 제작 설정 화면 구현

Plan: 2026-11-03-workspace-toc-production
Phase: P03-workspace-ui
Task: T02-toc-and-setup

- 목차·체크리스트·권한·제작 설정 화면
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 검증 기록
- typecheck·범위 ESLint·diff 확인 통과. selector/도메인 권한 일치/SSR 접근성/상속 44건, 실제 자산 소비·기본설정/명시적 재적용/잠금 거절 27건 통과.
- 위 추가는 단일 명령 beforeId로 처리하고 PM/슈퍼 권한은 고정 표시한다. 보관본 직접 URL의 목차·설정은 편집 불가로 전환한다.
- 브라우저·육안 검증은 실행하지 않았다. 최종 일괄 커밋에서 포함한다.
