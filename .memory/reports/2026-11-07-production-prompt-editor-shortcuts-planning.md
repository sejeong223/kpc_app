# 제작 통프롬프트·단축키 계획 관찰 기록

- Date: 2026-11-07
- Status: planning only
- Plan: [제작 통프롬프트 편집기·슬라이드 단축키](../plans/2026-11-07-production-prompt-editor-shortcuts.md)
- Skill: `.agents/skills/memory-plan/SKILL.md`
- 작업 시작 시 Git working tree는 clean이었다. 앱 코드 변경·구현 검증·커밋은 하지 않았다.

## 현재 코드 근거

| 파일·심볼 | 관찰 | 계획 반영 |
| :--- | :--- | :--- |
| `SlideNavigator.tsx` 루트 onKeyDown | 목록 Ctrl/Meta+C/V 및 Delete/Backspace 구현 존재. 팝업은 Escape/Tab/Home/End/↑/↓ 포커스만 처리 | 기존 구현을 재사용하고 팝업 shortcut 처리를 같은 대상·권한 규칙으로 연결 |
| `SlideNavigator.tsx` menu action JSX | label만 렌더링하며 kbd와 추가 위 separator 없음 | 요청한 크기/색/두께·여백 추가 |
| `SlideNavigator.tsx` arrow delta | Up/Right +1, Down/Left -1 | 사용자가 승인한 Up/Left -1, Down/Right +1 수정 |
| `SlideNavigator.tsx` menuIds | 우클릭한 행이 선택 그룹이면 전체 선택, 아니면 우클릭한 한 장 | 팝업 단축키도 이 대상 계산을 유지 |
| `SlideNavigator.tsx` 목록 focus guard | root/thumbnail만 허용하고 tabIndex가 있는 목록 div 자체는 제외 | 같은 목록 범위의 키 처리에서 목록 자체도 포함 |
| 원본 HTML `.th-menu kbd`, `.th-menu i` | 11.5px/500/margin-left:auto, 구분선 1px/margin 4px 6px | 사용자가 제공한 #74747d/#EEF0F3 색과 결합, 측정된 폭은 고정하지 않음 |
| `ProductionWorkspace.tsx` ActiveSlide/ActiveManufacturingSlide | 저장/원문/권한 흐름을 두 벌로 구현 | 한 adapter+hook으로 통합 |
| `use-slide-draft.ts` | slide.content와 template을 슬라이드별 draft로 관리 | 원문 독립성과 기본 권한·revision/미저장 보호 계승 |
| `use-manufacturing-prompt.ts` | section.demoPrompt를 baseline으로 사용 | 새 원문은 slide.editorPrompt에 저장, 없는 경우 own content fallback |
| `domain.ts` apply-manufacturing-prompt | 한 장 content를 변경하면서 owner.demoPrompt도 갱신, 담당자 추가 검사 | 새 공통 prepared operation으로 한 장 원문·결과만 저장 |
| `manufacturing-prompt.ts` | 기존 intro/bullets 중 콜론을 heading/body로 분리 | 새 입력에는 구역·콜론 문법을 요구하지 않고 전체 string 사용 |
| `HtmlDemoSlidePreview.tsx`, layout 판별 함수 | cards/process/kpi는 3 text blocks, table은 2열 구조가 중요 | 배치 결과 구조/ID를 유지해 예시 레이아웃이 Basic으로 떨어지는 회귀 방지 |
| `ProposalSlideSchema`, `state-compatibility.ts` | v1/v2→v3 변환과 엄격한 저장 검증 존재 | 선택 raw 필드만 v3에 추가, legacy shape/seed/기존 저장본 보존 |
| `domain.ts` contentSlidesChanged/validateSlideReplacement | 개별 슬라이드 잠금 및 전체 slide 비교로 변경 대상 보호 | 새 원문만 바꾸는 경우도 완료 잠금 우회 불가 |
| `WorkspaceProductionService.ts` requested/editSlidesById/guard, repository.commitPrepared | revision/권한/자산/transaction 경로 존재 | 중복 저장소 없이 같은 경로로 원문·결과 원자 저장 |
| `lib/ui/dadam-theme.ts`, `SlideContentEditor.tsx` | fontFamilyBase가 Dadam family를 참조. 현행 입력 13px/1.7, 반경14px, 내부48~180px | 새 통프롬프트 입력도 기존 글꼴/외형 유지 |

## 확정 범위와 인접 문제

- ↑/↓ 방향 문제는 임의로 확대하지 않고 질문했으며 사용자가 함께 수정을 선택했다.
- 공용 Button/DadamButton 통합은 명시적으로 보류한다.
- 원문 공유 제거와 직접 대체된 editor/hook 정리는 요청한 편집 통합에 필요한 범위다. 다른 서비스/컴포넌트 대청소는 계획에 넣지 않았다.
- `Section.demoPrompt` 등 과거 데이터는 삭제하지 않는다. 기존 계획에서 제외했던 슬라이드별 원문 저장은 이번 확정 답변으로 범위에 포함됐다.

## 검증 구분

- 이 문서는 관찰과 **계획 검증** 기록이다. Task의 typecheck/lint/build/Node 시나리오는 실행 단계에서 수행할 명령이며 아직 통과했다고 주장하지 않는다.
- 문서 링크/Task 필수 섹션/Status/commit 헤더/current 포인터/코드 변경 없음 검증 결과는 아래 기록한다.
- 실제 브라우저·시각 검증은 기존 작업 정책에 따라 하지 않았으며 이번 계획에 추가하지 않았다.

## Planning Validation

아래는 최초 T01~T03 계획 작성 시의 검증 결과다. 후속 T04 추가 결과는 다음 절에 별도 기록한다.

- Node stdin 문서 검사 통과: Plan/Decision/Report/Phase/Task 3개/current 총 8개 문서, 상대 링크 19개가 모두 존재한다.
- 각 Task에 Goal/Decision Summary/Implementation/Signatures & Types/Data & Schema Fields/Acceptance Criteria/Validation/Commit Message/Progress가 있다. 세 Task 모두 pending, 한국어 커밋 본문에 같은 Plan/Phase 식별자가 있다.
- phase done:0/3, current의 P01-T01 포인터를 확인했다. 이전 current 원문 백업 1개를 별도로 보존했다.
- 문서의 UTF-8 대체 문자/행 끝 공백 검사 및 `git diff --check` 통과.
- `git status --short`의 새 파일은 이번 `.memory/` 문서뿐이다. `.memory/` 밖 tracked diff는 없고 `current.md` ignore가 유지된다. 최신 커밋은 기존 c16479c 그대로다.
- 앱 typecheck/lint/build/런타임/시각 검증은 실행하지 않았다. 계획의 미래 검증 명령과 이번 문서 검증 결과를 구분한다.

## Follow-up: 비담당 슬라이드 상태 조작 제한

- 후속 사용자 요청을 T04 상세 청사진으로 추가했다. 모든 Task pending, phase/current done:0/4, 시작 포인터 T01 유지.
- 관찰: `ProductionToolbar.canChangeState`는 writing에서 editableSlideIds, done에서 unlockableSlideIds를 사용한다. domain의 개별 상태 명령은 `isSectionAuthor`로 허용한다. 이 공통 함수는 실제 담당 외에 PM/super_admin도 포함한다.
- `selectProductionSlides.mine`은 순수 assigneeIds 배정으로 판단하므로 “담당 테두리는 없지만 상태 조작은 가능”한 차이가 생긴다.
- 계획: 상태 전용 canChangeSlideState/stateChangeableSlideIds를 추가하고 unlockableSlideIds도 실제 담당자로 제한한다. UI disabled만으로는 명령 호출을 막을 수 없어 domain의 set-slide-state/unlock-slide에도 같은 검사를 적용한다.
- 본문 편집 권한은 앞선 확정대로 유지한다. 목차 전체 상태 변경 및 프로젝트 완성/재작업 정책을 확대 변경하지 않는다.
- 관련 Plan/Decision/Phase/current/T03의 다음 Task를 동기화했다. 앱 코드 변경·구현 검증·커밋 없음.
- 후속 문서 검증 통과: 9개 문서, 4개 pending Task, 상대 링크 21개, phase/current 0/4 및 T03→T04 연결 확인. `git diff --check` 통과, `.memory/` 밖 tracked diff 없음. UI/domain 실행 검증은 아직 하지 않았다.

## Follow-up: 완료 프롬프트 접기·회색 표시

- 사용자 첨부 이미지를 완료 프롬프트 표시 참고로 반영했다. 기존 T04의 상태 전환 표시와 연결되므로 Task를 추가하지 않고 T04를 확장했다. 시작 포인터 T01, 전체 pending 4개를 유지한다.
- 실제 코드 근거: `app/dadam-tokens.css`에 control.muted=#f5f7fa, control.border=#cdd5e0, control.disabled=#9aa5b3가 있고 `lib/ui/dadam-theme.ts`가 해당 CSS 변수를 노출한다. `DadamControls.tsx`는 이미 실제 disabled select의 글자·배경 규칙을 가진다. 공용 버튼/디자인 토큰을 새로 만들지 않는다.
- 완료 프롬프트는 회색 배경과 1px 점선, 왼쪽 자물쇠+완료 안내, 우측 프롬프트 보기의 기본 접힌 상자다. 저장 원문을 펼쳐 읽고 다시 접을 수 있으며 이 동작은 저장/완료 해제를 호출하지 않는다.
- 제작 toolbar의 기존 별도 완료 배너/고정 해제 버튼 및 onUnlock prop을 제거한다. dropdown의 unlock-slide 호출과 실제 담당 검사는 유지한다. 완료 전송 버튼은 접힘·펼침 모두 렌더링하지 않는다.
- 비담당 완료 select의 글자색은 기존 disabled 회색으로 명시했다. 읽기 권한이 있는 비담당의 프롬프트 보기 버튼은 동작한다. 단순 disabled로 전체 카드까지 막지 않는다.
- 슬라이드/회차/보관본 전환과 재완료는 접힘으로 시작하고, 같은 완료 slide의 unrelated revision에서는 펼침을 유지한다. 외부 완료/충돌 시 기존 dirty 원문 보호도 유지한다.
- Plan/Decision/Phase/current/T03/T04를 동기화했다. 앱 코드/원본 HTML/패키지 변경·앱 검증·커밋은 하지 않았다.
- 이번 문서 검증 통과: 9개 문서/4개 pending Task/상대 링크 21개, current T01 및 0/4 유지. 완료 상자 props·기본 접힘·회색 토큰·점선·접근성 계약 존재 확인. `git diff --check` 통과 및 `.memory/` 밖 tracked diff 없음. 구현/시각 검증 결과로 보고하지 않는다.
