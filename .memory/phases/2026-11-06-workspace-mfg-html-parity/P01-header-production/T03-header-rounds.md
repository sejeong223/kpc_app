# Task: T03 공통 헤더와 완성·재작업·완성본 콘텐츠

## Status: done

## Goal

파일·분석·목차·제작 설정·제작·리뷰에서 같은 HTML 헤더를 표시하며, 완성/재작업 확인창 및 완성본 목록이 실제 회차 상태와 연결되도록 한다.

## Decision Summary

- 원본 `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html` 최종 `projectHeader`(5644 부근), `roundDialog`(5714), `openLoopHist`(5728), `.ph`(2533), header overlays CSS(2649) 기준. HTML은 수정/실행하지 않는다.
- T01/T02 완료 후 실행. 제조업 새 ID `production-html-mfg-demo`는46장/6섹션이며 일반 프로젝트에는 실제 저장 데이터 사용. T05 전에는 새 예시 이력이 없어도 빈 상태로 정상 동작해야 한다.
- 외형/문구는 HTML에 맞추되 기존 revision/fileRevision/권한/초안 보호를 유지한다. 설정 내용은 T04 담당. tests/·브라우저/CUA/E2E/dev server/스크린샷·패키지·Cosmos·push 금지.

## Implementation

### I01. 헤더·picker·보관본 배너

- Related Files:
  - `components/common/ProjectHeader.tsx` :: `ProjectHeaderContent`, `ProjectPicker`, styles — modify.
  - `components/common/ProjectHeaderProvider.tsx` :: 모델·toast — modify.
  - `types/workspace-header.ts` :: `WorkspaceHeaderModel`, `HeaderHistoryItem` — modify.
  - `lib/workspace/production/header-selectors.ts` :: labels/history — modify.
  - `components/layout/WorkspaceHeader.tsx` :: 사용 경로 검토 — read-only, 필요 시 wrap만 수정.

#### Details

```typescript
export interface HeaderHistoryItem {
  id: string; round: number; kind: "complete" | "unfinished";
  createdAt: string; createdBy: string; createdByName: string; inputRevision: number;
  doneSections: number; writingSections: number; slides: number;
  pptVersionId: string | null;
}
// WorkspaceHeaderModel.history: HeaderHistoryItem[]
// WorkspaceHeaderModel.canComplete: boolean; // 완료 여부와 별개인 사용자 권한
```

- 헤더 min-height58/padding8px12/leading·actions gap8. selector width560/max100%/min-height40/padding4px10/gap10. 제목14/20/500, 보조12/16, 역할 badge selector 안, round badge selector 밖. action height34/padding0 12/gap6, 재작업 icon only34x34. 순서 재작업→완성본 N→완성→설정. 임의 작업 단계 칩을 더하지 않는다.
- 보조문구는 원본 기관·마감 순서를 따르되 사용자가 이전에 추가 요청한 부서 표시도 유지한다. 모든 기존 목 프로젝트의 부서/마감 데이터 유지. 날짜 KST D-day 로직 유지.
- picker width640/max viewport-32, 제목 `내가 참여 중`, 각 행 이름·역할/기관/부서와 체크·D-day. 미선택 제조업 항목도 초기 역할 작성자로 표시하며 다른 프로젝트의 roles를 임의로 부풀리지 않는다. 선택은 choice.choose의 초안 보호가 승인된 뒤에만 닫고 반영한다.
- round 문구: live writing=1차 `1차 작성 중` / 이후 `N차 재작업 중`, completed=`N차 완성`, snapshot=`N차 보관본 · 읽기 전용`. 미완성 snapshot의 기존 직접 URL은 `N차 미완성 이력 · 읽기 전용`으로 지원한다.
- snapshot 선택 시 헤더 아래 배너 `N차 보관본을 보고 있습니다. 내용을 바꾸려면 현재 작업으로 돌아가세요.` + `현재 작업으로`. 헤더 actions나 history popup에 중복 복귀 버튼을 두지 않는다. 현재 작업이 completed일 때도 별도 읽기 전용 안내와 실제 완료 시간/작성자/통계를 표시한다.
- canComplete는 PM/super_admin/complete grant에서 계산하고 live phase와 분리한다. 완료 후 완성 버튼은 사라지지 않고 disabled/title `완성됨 · 왼쪽 재작업 버튼으로 다시 진행`. snapshot에서는 complete/rework 숨김. 실제 실행 가능성은 기존 capability로 다시 검사한다.
- 760px 이하 lead 폭100%/actions wrap. 버튼을 display:none으로 숨기지 않는다. 긴 이름 ellipsis/title, focus-visible 유지.

### I02. 완성·재작업 다이얼로그

- Related Files:
  - `components/workspace/shared/ProjectRoundDialog.tsx` :: 기존 RoundSummary/checkbox 대체 — modify.
  - `hooks/workspace/use-project-round.ts` :: confirm/callback — modify.
  - `components/common/ProjectHeader.tsx` :: 성공 후 이동 — modify.
  - `components/ui/ModalFrame.tsx` :: width/slotClassNames 활용 — read-only, 전역 모달 스타일 변경 금지.

#### Details

```typescript
export interface RoundActionResult {
  mode: "complete" | "start-round";
  previousRound: number; currentRound: number;
  carriedReviews: number; firstReviewSectionId: string | null;
}
// useProjectRound(projectId:string,
//   onChanged:(result:RoundActionResult)=>Promise<void>, onOpened?:()=>void)
// confirm 기존 input 유지:
// { revision:number; fileRevision:number; round:number; acknowledged:true }
```

- ModalFrame width520, title/contentKey에 실제 회차. header padding16px18px12px, body14px18/gap12, footer12px18/gap8/right align, 버튼 height32/pad0 12. 제목/본문14/20, 보조12/16. 원본에 없는 추가 동의 체크박스 제거. 확인 버튼 클릭 자체를 acknowledged:true로 전달한다. domain의 확인 플래그 검증은 제거하지 않는다.
- 완성 제목·확인 버튼 `N차 완성`. 카드3개 `작성 완료`/`작성 중`/`미처리 의견`(숫자20px/28/600, card border/radius6/pad10px12), progress height6/value done/max(total||1), aria-valuetext `작성 완료 X / 전체 Y`. 아래 section 목록(번호·제목·작성 완료/작성 중), max-height260/overflow auto/row7px10. 통계는 미리 본 view의 getCompletionSummary, 댓글에는 canvas·기존 코멘트를 모두 포함한다. 빈 목차 안내 `표시할 섹션이 없습니다.`.
- 재작업 제목·확인 버튼 `N+1차 재작업 시작`. 미처리 review 코멘트가 있을 때 `리뷰 코멘트 X건이 제작으로 전달됩니다`. 아직 writing이면 노란 안내 `N차를 완성하지 않고 재작업합니다. N차 완성본은 남지 않습니다.`. 실제 unfinished snapshot은 보존하되 완료본 목록에는 넣지 않는다.
- 2개 열 `고정 (작성 완료)`/`다시 작업 (작성 중)`, 각각 count chip과 번호/제목 목록. 빈 그룹 `없음`. 480px 이하1열. done 섹션만 고정, writing 섹션만 재작업. 현재 상태 선택 결과가 즉시 반영되어야 한다.
- open은 runtime.navigate→fresh view→권한 확인→모달. confirm은 baseline state/fileRevision/currentRound를 기존 mutation으로 검증. loading/confirm 진행 중 중복 클릭/닫기 금지, 실패 시 모달 유지와 에러/다시 불러오기 제공, 자동 완료로 표시하지 않는다.
- 성공 complete: 현재 페이지 유지, snapshot selection 제거/실제 completed 상태 표시, toast `N차 완성본을 저장했습니다`. 성공 start-round: 일반 화면에서 files 이동, review 화면에서 write 이동(전달 코멘트의 첫 유효 section, 없으면 기존/default); snapshotId null. toast `N차 재작업을 시작했습니다` + 전달 건수. callback에는 mutation 후 receipt의 currentRound를 사용한다.
- 모델/route/프로젝트가 바뀐 뒤 오래된 응답은 현재 화면을 이동시키지 않는다. runtime.isActive 및 현재 projectId 재확인. clipboard/session clear 기존 동작 유지.

### I03. 완성본 목록과 실제 파일 연결

- Related Files:
  - `lib/workspace/production/header-selectors.ts` :: snapshot별 통계/작성자 — modify.
  - `components/common/ProjectHeader.tsx` :: versionRow/history popup — modify.
  - `hooks/workspace/use-workspace-ppt.ts` :: 기존 다운로드 계약 — read-only.

#### Details

- `history`의 통계는 각각 snapshot.body에서 계산: done sections, 나머지 writing sections, slides.length. 현재 body 통계를 여러 행에 복사하지 않는다. createdBy를 members의 이름으로 해석, 없는 탈퇴자는 ID 문자열 fallback. KST 날짜/시간을 일관되게 표시한다.
- 완료 이력만 round 내림차순. 제목 `회차별 완성본`, 각 행 `N차 완성본`, `날짜 · 작성자`, `작성 완료 X · 작성 중 Y · 슬라이드 Z장`, 눈 아이콘 `보기`, 다운로드 아이콘 `PPT`. unfinished details와 popup의 현재작업 버튼 제거. 숨긴 unfinished 데이터는 삭제하지 않는다.
- popup width300/max viewport-32/max-height70vh/pad6/radius8/오른쪽 정렬. heading padding8px9px4, version padding10px12/gap2, action height22/pad0 7/font12/gap6. 완료본 버튼 count는 complete만. complete가0이고 unfinished만 있으면 버튼을 표시하되 빈 메시지 `완성본이 없습니다.`; 이 동작은 HTML의 history 존재 기준과 일치한다.
- 보기 클릭은 choice.choose(snapshotId)→검증→닫기; 보관본은 기존 selectSnapshotView로 읽기 전용. 파일 다운로드는 snapshot.pptVersionId와 version.id/round/inputRevision을 확인한다. version.snapshotId가 있으면 해당 snapshot.id와 같아야 한다. 기존 앱의 완성 전에 생성한 PPT는 snapshotId가 null일 수 있으므로, 명시 pptVersionId·round·inputRevision이 일치하는 null 값은 허용한다. 다른 회차/현재 최신 PPT를 대신 다운로드하지 않는다.
- 일반 프로젝트에 PPT가 없으면 PPT 버튼 disabled와 `보관된 PPT 없음` 설명(거짓 다운로드 toast 금지). 새 제조업 seed는 T05에서 실제46장 PPT를 연결한다. 기존 행정업무6장 PPT는 그대로 다운로드한다.
- overlay는 picker/history/settings/round 중 한 개만 활성화. 댓글 controller.suspendUi 호출. Escape/외부 클릭/포커스 복귀를 공통화하고 modal Tab trap은 Fluent ModalFrame 재사용. 상태 변경으로 trigger가 사라진 경우 헤더 selector에 fallback focus.

## Acceptance Criteria

- [x] 헤더와 3종 콘텐츠의 치수·문구·순서·전체 통계가 원본과 대응한다.
- [x] 완료된 화면에서 완성 버튼 disabled 유지. 재작업/완성 확인창에 추가 동의 checkbox 없음.
- [x] 상태 변경→완성 카드 수→재작업 고정 그룹이 같은 저장 상태를 가리킨다.
- [x] 완성본의 작성자/시간/섹션 수/슬라이드 수/보기/PPT가 각 snapshot과 일치한다.
- [x] 미완성/보관본/빈목차/권한없음/CONFLICT/중복클릭/긴 프로젝트명 경계를 처리한다.

## Validation

- `npm run typecheck`.
- `npx eslint components/common/ProjectHeader.tsx components/common/ProjectHeaderProvider.tsx components/workspace/shared/ProjectRoundDialog.tsx hooks/workspace/use-project-round.ts types/workspace-header.ts lib/workspace/production/header-selectors.ts`.
- `git diff --check`.
- `rg -n '현재 작업으로|회차별 완성본|N차|acknowledged|unfinished|snapshotId|pptVersionId' components/common/ProjectHeader.tsx components/workspace/shared/ProjectRoundDialog.tsx hooks/workspace/use-project-round.ts lib/workspace/production/header-selectors.ts` 후 실제 이벤트/배너 배치를 정적 검토한다.
- Node/tsx stdin으로 서로 다른 body를 가진 snapshot2개/unfinished1개를 만들어 selectWorkspaceHeader의 통계·정렬·count·작성자·현재 phase 불변을 assert한다. 도구만 실행하며 검증 파일/브라우저는 만들지 않는다.

## Commit Message

```text
feat(header): HTML 기준 공통 헤더와 회차 콘텐츠를 맞춤

Plan: 2026-11-06-workspace-mfg-html-parity
Phase: P01-header-production
Task: T03-header-rounds

- 완성·재작업 확인창의 통계와 섹션 목록 적용
- 완성본별 보기·PPT·읽기 전용 복귀 흐름 정리
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 식별자의 한국어 커밋에 포함
