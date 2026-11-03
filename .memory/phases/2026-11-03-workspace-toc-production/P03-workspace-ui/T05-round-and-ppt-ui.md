# Task: T05-round-and-ppt-ui 완성·재작업·AI 비교·PPT 버전 화면

## Status: done

## Goal
통합 회차 전환, mock 제안의 검토, 실제 PPT 생성/수정본 등록/선택 적용을 화면에서 끝까지 연결한다.

## Decision Summary
- D01/D04/D07/D08/D12/D17: 미완료 경고 후완성, 파일·제작의 원자적 재작업, 실제원본과 웹적용결과 구분.
- 완료본은 누구도 직접수정하지 않으며 수정본의 등록성공과 내용적용성공을 별도로 표시한다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 동일한 완성·재작업 확인과 이력
- Related Files:
  - `components/workspace/shared/ProjectRoundDialog.tsx`, `ProjectHistorySelector.tsx` — new
  - `components/workspace/production/ProductionToolbar.tsx`, `ProductionWorkspace.tsx` — modify
  - `components/workspace/files/FilesWorkspace.tsx` :: start-round 확인 교체 — modify
  - `components/workspace/toc/TocWorkspace.tsx` :: 회차/이력선택 연계 — modify
  - `hooks/workspace/use-project-round.ts` — new
  - `lib/workspace/production/selectors.ts::getCompletionSummary` — reuse
#### Details
**Signatures & Types**
```typescript
interface ProjectRoundDialogProps {
 open:boolean;mode:"complete"|"start-round";view:ProjectView;busy:boolean;error:string|null;
 onConfirm(input:{revision:number;fileRevision:number;round:number;acknowledged:true}):void;onClose():void;
}
interface ProjectHistorySelectorProps {state:ProjectWorkspaceState;snapshotId:string|null;onSelect(snapshotId:string|null):void}
interface ProposalReviewProps {proposal:WorkspaceProposal;busy:boolean;error:string|null;onApply(ids:string[]):void;onKeep():void;onRegenerate():void}
interface PptImportReviewProps {value:ImportedPpt;view:ProjectView;busy:boolean;onApply(ids:string[]):void;onRemap(mapping:ImportMapping[]):void;onClose():void}
```
- 확인 모달 open시 revision/fileRevision/currentRound와 writingSections/openComments/uncheckedItems/slideCount를 고정한다. 확인버튼 시 최신뷰로 기준revision을 몰래 교체하지 않는다.
- complete는 미작성섹션/미처리의견/미확인체크 수와 미완료상태로보관됨을 표시한다. 경고있으면 명시적checkbox동의후 확인, 없으면 확인액션자체를 acknowledged=true로 보낸다. 섹션state/체크/의견을 자동done/resolved로 변경하지 않는다.
- start-round는 writing이면 미완성이력보관, completed이면 완성본보존을 설명하고 새회차파일자료/완료section잠금/미처리의견계승을 안내한다. 파일화면의 '다음 회차 시작'도 **같은 ProjectRoundDialog와 service.execute(start-round)**를 호출한다. 파일전환→제작전환 순차호출 금지.
- 완료본이 있는 현재phase=completed에서는 파일업로드/내용수정/구조변경을 막고 리뷰/다운로드/재작업만 권한에 따라제공한다. PPT다운로드는 자산최신권한검사 별도다.
- ProjectHistorySelector는 현재작업, complete(완성본), unfinished(미완성이력)을 구분한다. files만 존재했던 과거회차는 제작완성본으로 새생성하지 않는다. snapshot선택에서 타이틀/상태/슬라이드/자료/체크/의견 모두snapshot 기준으로 보여준다.
- complete/start-round 성공 시 production/file Query 동시invalidate, 선택 새회차/첫유효section·slide, 임시AI/비교/undo/paste선택 정리. 실패시확인창과기존화면 유지. 재작업으로당시저장자료가 사라지지 않는다.
- dirty 파일dialog/slide draft/댓글draft가 있으면 공통guard가 먼저 처리한다. 외부탭회차변경과충돌하면 재조회와작성입력검토경로를제공하고 자동재시도하지 않는다.

### I02. 공통 제안 비교와 mock 요청
- Related Files:
  - `components/workspace/production/ProposalReview.tsx`, `ProductionAiPanel.tsx`, `ContentDiff.tsx` — new
  - `hooks/workspace/use-workspace-proposals.ts` — new
  - `components/workspace/toc/TocWorkspace.tsx` :: AI비교 연결 — modify
  - `lib/workspace/production/diff.ts` :: 안전한 표시용 차이 모델 — new
#### Details
- propose({projectId,expectedRevision,expectedRound,kind,sectionIds,slideIds,instruction})→WorkspaceProposal {id,projectId,round,baseRevision,kind,items,mock:true,createdAt}. 단일/다중선택은 대상제목과수량표시. 목차는 recommend-toc/edit-toc, 제작은 draft/polish/check.
- 기획의 빠른 요청은 '목차 프롬프트대로 초안 생성', '문장 다듬기', '프롬프트 반영 누락 점검', '요구사항 누락 점검', 'Skill 규칙으로 레이아웃 점검', '분량 20% 줄이기', '표로 정리'를 제공한다. 각각 draft/polish/check와 명시적 instruction으로 전달하며 지원되는 mock 제안을 반환한다. 실제 분석·자동 배치 보장으로 표시하지 않는다. 적용 프롬프트/상속 위치/소스 순서/Skill 이름은 현재 slide.usedSettings 기준으로 확인할 수 있게 한다.
- 결과영역에 mock임을 표시하고 바뀌는항목별 선택/적용전후/원문유지/다시생성/취소를 제공한다. 기본선택은 지원·권한검증완료항목만, 실패/고정/권한없음 이유를 묻어두지 않는다. 적용전 전체대상검증으로 일부실패가전체성공이되지 않는다.
- ContentDiff는 plain strings/행·셀단위구조로 rendering하고 HTMLdiff문자열 innerHTML을 사용하지 않는다. 색상외 추가/삭제 텍스트표시, 한영문/줄바꿈/빈tablecell 보존. 큰본문은 요약+펼치기, 일부만 비교했다고 전체동일이라하지 않는다.
- applyProposal은 proposalId/itemIds만, 성공후원문 갱신/Undo, 유지·취소는원문불변. 요청중 입력/사용자/프로젝트/회차변경은 signal취소/late result무시. 새권한상실시적용버튼숨김+서비스재검사. 제안재생성은현재baseline으로시작한다.
- 요구사항점검은 mock provenance와 실제파일분석없음을 결과안에서표시한다. 실제Token차감/대시보드실제AI사용량기록/메일발송 없음.

### I03. PPT 파일 컨트롤·버전·외부 내용 적용
- Related Files:
  - `components/workspace/production/PptControls.tsx`, `PptVersionHistory.tsx`, `PptImportReview.tsx`, `PptMappingEditor.tsx`, `ProductionJobStatus.tsx` — new
  - `hooks/workspace/use-workspace-ppt.ts` — new
  - `services/workspace/WorkspaceProductionService.ts` — reuse
  - `lib/pptx/download.ts` — reuse
#### Details
1. 'PPT 생성'은 현재저장본 또는 선택snapshot 대상이며 dirty내용이있으면 먼저저장/취소를안내한다. 새생성에사용할 자산/매핑오류를읽고 setup/slot연결로이동시킨다. 진행단계·수량·취소·실패재시도 제공, 취소후기존성공버전유지.
2. 내보낸결과를웹에서출력했다고보여주는조건은 PptVersion 저장성공 + 실제blob조회성공이다. 파일명/회차/버전/시각/생성자/기준 inputRevision을표시한다. 현재inputRevision이더높으면 '이후 수정 있음'으로구분한다.
3. 버전이력은 10개/페이지, 최신순, 회차·snapshot·generated/uploaded구분, filename/크기/시각/다운로드. 현재revision과무관하게과거원본을보존한다. 생성본다운로드와외부수정본원본다운로드를명확히구분한다.
4. 수정본file input은 .pptx만, 파일크기·등록진행·대상baseVersion선택을제공한다. 원본등록후 '수정본 원본 보관 완료'와 실제comparison을보여준다. UI고정변경개수/고정slide목록 금지.
5. 비교는 externalSlideCount/matchedSlideIds/changes/issues를표시하고 지원텍스트·표변경만checkbox선택한다. 외부순서변경/디자인변경을자동재현했다고표시하지않는다. ambiguous/unmatched는 PptMappingEditor에서 외부slide/shape→현재slide/slot을사람이확인한다.
6. 매핑화면은 실제외부shape이름/지원유형/발췌내용과대상제목을보여주고중복대응을거절한다. 번호만맞춰자동일괄적용하지않는다. 연결할수없는내용은제외이유+원본다운로드를제공한다.
7. remapImport 호출 후새comparison과baseRevision으로선택목록갱신. applyImport는 sessionId/changeIds만, 기준권한/잠금/회차/버전재검사. 적용취소/실패에도원본행은유지되며다시비교버튼이 `sessionId="version:"+versionId`로저장원본에서새세션을연다.
8. UI가닫혀도저장완료한원본은보존, 미등록작업은AbortController로취소. Job상태는id별로관리하여이전작업progress가새프로젝트에보이지않는다. BlobURL은다운로드트리거후해제, 실패URL/구독도정리.
9. 권한없는mutation버튼은렌더하지않으며원본권한미확인일때사본이있어도해당download/generate를허용하지않는다. D21재선택안내가복구경로다. fake.pptx/TXT파일을PPT확장자로내보내지않는다.

## Acceptance Criteria
- [x] 파일 다음회차와 제작 재작업이 같은확인/권한/저장단위를 사용한다.
- [x] 미완료상태를 보존하며 완성본/미완성이력을 구별한다.
- [x] AI제안은검토후선택적용되고 실제원문/Undo가동작한다.
- [x] 실제PPT생성·원본버전·매핑·차이·선택적용·취소/재시도가연결된다.

## Validation
- `npm run typecheck`
- `npx eslint components/workspace/shared components/workspace/production components/workspace/files/FilesWorkspace.tsx components/workspace/toc/TocWorkspace.tsx hooks/workspace/use-project-round.ts hooks/workspace/use-workspace-proposals.ts hooks/workspace/use-workspace-ppt.ts lib/workspace/production/diff.ts`
- fake-indexeddb 인라인으로 FileService/ProductionService 두진입의 start-round를 실행해 currentRound 동기화·완료section고정·미완료상태/자료버전계승을 비교한다. stale파일revision/워크스페이스revision 중하나라도실패하면양쪽원본불변.
- 프로젝트history selector/diff/versionpagination은 순수함수검증; complete snapshot에 입력수정·review·새PPT등록 후 deepEqual; inputRevision mismatch 표시를assert한다.
- import등록→창닫기→저장version으로재비교→변경1개적용→재출력 readback. 취소/고정/권한회수/중간본문수정에서 선택외본문변경0, 보관원본sha동일을검사한다.
- SSR순수컴포넌트에서 readonly actions부재/버전타입구분/경고동의 UI/지원불가이유/매핑확인/10개페이지를확인한다. 브라우저다운로드·드래그·PowerPoint육안확인은하지않는다.
- `git diff --check`

## Commit Message
```text
feat(workspace): 통합 회차와 PPT 비교 작업 흐름 완성

Plan: 2026-11-03-workspace-toc-production
Phase: P03-workspace-ui
Task: T05-round-and-ppt-ui

- 완성·재작업·AI 비교·PPT 버전 화면
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 검증 기록
- 완성/재작업 공통 확인·동일 ProductionService 원자적 명령을 파일/목차/제작에서 연결했다. 고정한 revision을 보내고 미완료 상태를 그대로 보관한다.
- Mock 비교·선택 적용, 현재 기준 재생성, 실제 PPT 생성/readback·10개 버전 목록·외부 원본 보관·실제 shape 수동 연결·선택 내용 반영을 연결했다. 권한 회수 시 작업 버튼을 숨기며 서비스에서도 재검사한다.
- typecheck, Task 범위 ESLint, git diff --check 통과.
- fake-indexeddb/순수함수/SSR 인라인 회차·이력·diff·버전·권한 UI 48건 통과. 파일/제작 진입 동기화, 두 revision 충돌 시 양측 불변, 미완료 보존, 10개 페이지 포함.
- 실제 PPT 서비스 인라인 57건 통과. 원본 등록→세션 종료→저장 version 재비교→내용 적용→재출력 XML readback, 원본 SHA 보존, 취소·권한·용량·경합·D21 재선택 경계 포함.
- Dialog 포털·브라우저 다운로드·드래그·PowerPoint 육안은 실행하지 않았다. 모달의 순수 콘텐츠·선택기 및 서비스/정적 렌더링을 검증했다.
- 사용자 요청에 따라 중간 커밋 없이 최종 일괄 커밋 대기.
