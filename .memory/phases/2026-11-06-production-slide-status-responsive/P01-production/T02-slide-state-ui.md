# Task: T02 활성 슬라이드 상태 UI·완료 및 해제 안내 제거

## Status: pending

## Goal
제작 화면의 상태 드롭다운/잠금 안내/편집 가능 여부를 활성 슬라이드에 연결한다. A 완료 후 B가 그대로 편집되고, A 해제 시 일반 성공 텍스트가 나오지 않는다.

## Decision Summary
- 선행 T01: ProposalSlide.state(writing/done), schemaVersion 3, set-slide-state/unlock-slide, editableSlideIds/unlockableSlideIds/insertableSectionIds가 존재한다.
- 제작은 활성 1장, 별도 목차 메뉴는 기존 소목차 일괄 상태 조작. 상태와 잠금은 저장 결과를 기준으로 한다.
- 여러 장 선택에서도 상태 드롭다운은 활성 1장만 변경. AI 일괄 수정 기능 자체는 유지한다.
- 제조업 demoPrompt는 계속 소목차 단위 저장한다. 그 구조 변경은 사용자가 이번 범위에서 제외했다.

## Implementation

### I01. 활성 슬라이드 명령과 잠금 UI
- Related Files:
  - components/workspace/production/ProductionWorkspace.tsx :: ProductionWorkspace, ActiveSlide, ActiveManufacturingSlide, execute, applyReceipt, assertEditable, safeView — modify
  - components/workspace/production/ProductionToolbar.tsx :: ProductionToolbarProps, ProductionToolbar — modify
  - components/workspace/production/SlideNavigator.tsx :: menu/keyboard/lock icon — modify
  - lib/workspace/production/presentation.ts :: ProductionSlideRow, selectProductionSlides — modify
  - lib/workspace/production/section-locks.ts :: isSlideLocked — read-only (T01)
  - hooks/workspace/use-slide-draft.ts, use-manufacturing-prompt.ts, use-workspace-draft-guard.ts — read-only, 기존 미저장 초안 보호 흐름 유지

#### Signatures & Types
~~~typescript
interface ProductionToolbarProps {
  view: ProjectView;
  sectionId: string | null; // 목차 이동/제목용
  slideId: string | null;   // 현재 상태/잠금 대상, 신규 필수 props
  busy?: boolean;
  onSection(id: string): void;
  onState?(state: "writing" | "done"): void;
  onUnlock?(): void;
  onManageToc(): void;
  commentActionSlot: React.ReactNode;
}
// Props 이름 외 상태 payload는 기존 WorkspaceOperation을 사용:
// {type:"set-slide-state", id:current.slide.id, state:"done"}
// {type:"unlock-slide", id:current.slide.id}
~~~

#### Data & State
- Toolbar에서 section은 제목/목차 팝업에만 사용하고, activeSlide는 slideId로 찾는다.
- 드롭다운 값/잠금 안내/해제 버튼은 activeSlide.state를 사용. aria-label은 “슬라이드 작성 상태”.
- slideId가 없거나 다른 sectionId와 불일치하면 상태 조작을 숨기거나 disabled 처리하고 아무 명령도 보내지 않는다.
- capability 기준: activeSlide.state=writing은 editableSlideIds, done은 unlockableSlideIds. done이면서 권한이 있으면 dropdown 작성 중 선택 또는 고정 해제 버튼으로 동일 unlock 명령을 실행한다.
- Section 팝업의 작성 중/완료 표시는 T01에서 집계한 Section.state 유지. 하나만 완료했는데 목차 전체를 완료로 표시하지 않는다.
- ProductionSlideRow.editable은 editableSlideIds.includes(slide.id). 목록 lock icon은 isSlideLocked(slide).
- 목록 추가/붙여넣기/복제 대상 목차 판정은 insertableSectionIds. 기존 완료 장의 복사는 읽기 권한/핀 접근이 있으면 유지, 새 복제본은 T01에서 writing.

#### Execution Flow / Logic
1. onState/onUnlock 호출 당시 활성 slide.id를 캡처한다. section.id나 선택된 ids 배열로 완료 범위를 확장하지 않는다.
2. 기존 guarded → runtime.navigate 미저장 보호 → freshView → expectedRevision/expectedRound 명령 경로 유지.
3. 미저장 입력에서 저장 실패/취소이면 완료하지 않는다. 저장/버리기 후에만 최신 revision으로 완료 명령을 보낸다.
4. 완료 성공 receipt와 query invalidation을 적용하고 선택한 slide.id 유지. 현재 editingSlide는 최신 저장본을 사용해 즉시 readOnly가 된다. 같은 section 내 B로 이동하면 B는 editable이다.
5. ActiveSlide는 editableSlideIds.includes(slide.id) 사용. ActiveManufacturingSlide는 이 조건에 기존 actor가 section.assigneeIds에 포함되어야 하는 조건도 유지한다. section.locked를 개별 쓰기 기준으로 쓰지 않는다.
6. readOnly/conflict/accessDenied/snapshot/완성 회차는 새 capability 배열까지 비운다. readOnly 사유도 현재 slide.state 기준으로 산정한다.
7. 완료 장에는 실제 contentEditable=false/readOnly/disabled를 전달해 텍스트 편집·저장·적용이 불가능해야 한다. 단순 배너 변경으로 끝내지 않는다.
8. assertEditable(fresh, slideIds, sectionIds)는 개별 slideIds를 editableSlideIds, 붙여넣기/이동 목적 sectionIds를 insertableSectionIds로 판정한다. 기존 “고정된 소목차” 오류는 실제 개별 대상에 맞게 “고정되었거나 수정 권한이 없는 슬라이드”로 구체화한다.
9. 목록 우클릭/키보드 삭제/이동/템플릿 등 동일 판정을 사용. 다중 선택에 done 포함 시 일괄 쓰기 전체 비활성/거부. 대상 아닌 done 형제 때문에 B 작업을 막지 않는다.

### I02. 성공 안내를 상태 변경 경로에서만 제거
- Related Files:
  - components/workspace/production/ProductionWorkspace.tsx :: execute/applyReceipt/notice — modify
  - hooks/workspace/use-workspace-production.ts :: useWorkspaceCommand — read-only, 기존 재조회/오류 처리 보존

#### Details
1. execute의 silent 판정에 set-slide-state와 unlock-slide 모두 포함한다. 완료/해제 시 기존 notice도 즉시 null로 정리한다.
2. applyReceipt(receipt, [targetSlideId], {silent:true})를 사용해 기본 “변경을 반영했습니다.”뿐 아니라 receipt.notices를 일반 성공 문구로 노출하지 않는다.
3. 사용자 표현 “변경을 완료했습니다.”가 실제 코드에 없어도 현재 기본 안내를 제거해야 한다. 문구 문자열 하나만 치환하는 수정으로 끝내지 않는다.
4. 오류(권한/충돌/저장 실패), 미저장 확인, 복사/붙여넣기 결과 및 undo 안내는 유지한다.
5. 로컬 state만 낙관적으로 바꾸고 저장 실패를 숨기지 않는다. 저장 실패 시 원래 상태로 남고 오류를 표시한다. busy/running 및 취소 처리 유지.

### I03. 개별 편집 가능한 형제를 다른 편집 UI에서도 허용
- Related Files:
  - hooks/workspace/use-workspace-proposals.ts :: proposalRequestBlocked — modify
  - lib/workspace/production/diff.ts :: proposalItemAllowed — modify
  - components/workspace/production/PptControls.tsx :: import 가능 판정 — modify
  - components/workspace/production/PptImportReview.tsx :: 허용 대상/전체 적용 — modify
  - components/workspace/production/PptMappingEditor.tsx :: 매핑 대상 — modify
  - components/workspace/setup/AssetReapplyDialog.tsx :: 적용 대상 — modify
  - components/workspace/production/ProductionAiPanel.tsx :: editable/send — read-only unless 직접 section 권한 사용이 남아 있다면 modify
  - components/workspace/production/RequirementCoverage.tsx :: section 수준 metadata 편집 — read-only (의도적으로 소목차 전체 권한 유지)
  - components/workspace/toc/TocTable.tsx, TocRowActions.tsx — read-only (기존 소목차 일괄 명령 유지)
  - components/workspace/shared/ProjectRoundDialog.tsx — read-only (집계된 writingSections 사용)

#### Details
- proposalRequestBlocked: 명시 slideIds는 editableSlideIds만 검사. sectionIds가 있으면 목차 전체 대상이므로 editableSectionIds로 검사. 단일 선택을 무조건 sectionIds로 확장하지 않는다.
- proposalItemAllowed: item.slideId가 있으면 해당 장의 capability와 그 장의 pin 접근을 검사한다. slideId가 없는 소목차/구조 제안은 기존 actions/목차 전체 잠금 정책 유지한다.
- AI 요청의 슬라이드 대상은 기존 ProductionAiPanel처럼 sectionIds=[] 유지. B 하나를 요청했는데 A까지 포함시키지 않는다.
- PPT 등록 여부는 editableSlideIds.length>0 또는 기존 지원하는 편집 가능한 빈 소목차로 판단. 매핑/차이 선택/적용은 실제 대상 slide.id로 판정한다.
- 자산 재적용 checkbox는 slide.id가 editableSlideIds에 있는 경우만 활성. 그대로 유지되는 잠긴 형제는 전체 payload에 포함되어도 정상.
- 위 UI 변경은 T01 도메인 검증과 같은 범위를 사용한다. 도메인이 막는 것을 UI에서 허용하거나 그 반대가 되지 않게 한다.
- 기존 Dadam 폰트, 담당 2.5px 테두리, 선택 표시, 코멘트 버튼 간격/리사이즈, 배지 SVG 보정은 수정하지 않는다.

## Acceptance Criteria
- [ ] 같은 소목차 A만 완료: A dropdown 완료/목록 잠금/편집 비활성, B dropdown 작성 중/편집 가능.
- [ ] A 해제: A만 작성 중, 상단 일반 성공 문구 없음. 실패 시 오류 표시.
- [ ] 다른 소목차의 담당/미담당 슬라이드 상태·할당·내용 불변.
- [ ] 마지막 장까지 완료되기 전에는 제작 목차 팝업이 작성 중, 모두 완료 시 완료.
- [ ] 여러 장 선택 후 상태 변경은 활성 1장만 대상으로 함.
- [ ] 미저장 보호 취소/실패, snapshot, 완료 회차, 권한 없음에서도 편집 우회 불가.
- [ ] B의 AI/템플릿/PPT 적용 가능, A 대상은 거부.
- [ ] 새로고침 후 같은 상태와 잠금이 표시됨(독립 IndexedDB service 재로드로 검증).
- [ ] 기존 UI 스타일과 제조업 demoPrompt 저장 범위 유지.

## Validation
- npm.cmd run typecheck
- npx.cmd eslint components/workspace/production components/workspace/setup/AssetReapplyDialog.tsx hooks/workspace/use-workspace-proposals.ts lib/workspace/production/presentation.ts lib/workspace/production/diff.ts
- 아래 정적 검토 명령에서 제작의 section 상태 명령 호출/section 기반 개별 편집 판정이 남아 있지 않아야 한다. 목차 팝업 집계/대상 목차 권한은 예외로 문서화한다.
~~~powershell
rg -n 'set-section-state|unlock-section|editableSectionIds|section\.locked|current\.locked|silent:' components/workspace/production/ProductionWorkspace.tsx components/workspace/production/ProductionToolbar.tsx components/workspace/production/SlideNavigator.tsx lib/workspace/production/presentation.ts
~~~
- Node stdin(명령 실행 형식: PowerShell here-string을 node --require tsx/cjs에 pipe)로 react-dom/server.renderToStaticMarkup과 ProductionToolbar를 사용해 다음 검증:
  - global.React=require("react") 후 렌더. fixture는 createManufacturingDemoBundle(context), selectProjectView(bundle,context,[]) 사용.
  - context identity는 files:preview:sodam/preview:sodam/정소담/user/isMock=true. 프로젝트는 MFG_DEMO_PROJECT_ID, PM demo:mfg:lee, 멤버 preview:sodam/demo:mfg:lee/demo:mfg:kim, 유효한 부서 null/메일 null. now=2026-11-06T09:00:00.000Z, newId=randomUUID.
  - 같은 s31의 A를 set-slide-state done, B는 writing. 각 slideId를 toolbar에 넘겨 A에만 “작성 완료 · 고정됨”, 해당 actor에 “고정 해제”가 있고 B에는 없음.
  - selectProductionSlides의 A.editable=false, B.editable=true 및 새 capability 배열 확인.
  - 목차 집계는 A/B를 모두 완료시키기 전 writing, 모두 완료시키면 done. 기존 제조업 예시 나머지 형제도 대상에 포함해 마지막 장 경계 확인.
- 실제 이벤트/레이아웃 시각 검증은 금지 정책으로 미실시. success silent 분기, dirty-guard 호출 순서, contentEditable/readOnly 전달, ID 캡처를 코드 검토하고 결과를 .memory/reports/2026-11-06-production-slide-status-responsive-T02.md에 기록한다.
- 테스트 폴더/임시 스크립트 파일 생성하지 않는다. T01 stdin 핵심 시나리오는 변경된 UI 연결의 기준으로 대조하고 필요할 때만 반복한다.

## Commit Message
~~~text
fix(production): 선택한 슬라이드만 완료하고 해제 안내 제거

Plan: 2026-11-06-production-slide-status-responsive
Phase: P01-production
Task: T02-slide-state-ui

- 드롭다운과 편집 잠금을 활성 슬라이드 상태에 연결
- 완료 및 해제 성공 안내를 숨기고 개별 편집 권한 일치
~~~

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Execution Constraints
현재 ProductionToolbar/SlideNavigator/관련 폰트·배지 파일의 미커밋 수정은 기존 사용자 요청 결과다. 보존하고 이 Task 변경만 덧붙인다. 무관한 변경 일괄 stage/reset/restore 금지, current.md 강제 stage 금지. tests/ 및 브라우저/CUA/E2E/dev server/스크린샷 금지. 원본 HTML은 읽기 전용이며 패키지/DB/배포 작업은 없다.
