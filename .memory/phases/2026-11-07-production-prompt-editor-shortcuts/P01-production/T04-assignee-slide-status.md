# Task: T04 담당자 상태 권한·완료 프롬프트 표시

## Status: done

## Goal

사용자가 담당하지 않은 슬라이드의 `작성 중/작성 완료` 드롭다운 및 개별 상태 변경 명령을 차단한다. 완료된 프롬프트는 점선·회색 상자에 접힌 상태로 표시하고, `프롬프트 보기`로 읽기 전용 원문을 펼친다. 전송 및 별도 `고정 해제` 버튼은 제거하고 담당자가 드롭다운으로 작성 중으로 전환한다.

## Decision Summary

- 후속 사용자 요구: “내가 담당하지 않은 슬라이드는 작업 중/작업 완료 드롭다운도 건들지 못하도록”. 현재 앱의 표시 문구 `작성 중/작성 완료`는 유지한다.
- 담당은 담당 테두리와 같은 `slide.sectionId`의 `Section.assigneeIds.includes(context.identity.actor.id)`로 판단한다. PM/슈퍼 관리자라도 배정이 없으면 개별 상태 변경 불가다.
- 기존 기본 편집기의 본문 저장 권한은 유지한다. `canEditSlide`/`isSectionAuthor`를 전역으로 좁히지 않고 상태 전용 권한을 만든다. 목차 전체 완료/해제, 프로젝트 완성·재작업 권한은 변경하지 않는다.
- 최신 UI 요청: 완료 상자는 기본 접힘, 왼쪽 자물쇠+`작성 완료 · 고정됨`, 오른쪽 `프롬프트 보기`. 펼치면 원문만 읽기 전용으로 표시하고 버튼은 `프롬프트 접기`로 바뀐다. 접힘/펼침 모두 전송 버튼 없음. 제작의 별도 고정 해제 버튼은 모든 사용자에게 제거한다.
- 회색은 기존 `dadamControl.muted`/`border`/`disabled`를 재사용한다. 비담당 완료 select는 글자까지 disabled 회색이다. 원문 보기와 상태 해제를 혼동하지 않게 서로 독립시킨다.
- 선행 T03 완료. 한 Phase의 마지막 Task로 권한 계산·domain·UI를 함께 수정한다. 원본 HTML/공용 버튼/패키지/DB 변경 없음.

## Implementation

### I01. 개별 상태 변경 권한과 조회 capability 분리

- Related Files:
  - `lib/workspace/production/permissions.ts` :: 신규 `canChangeSlideState` — modify
  - `lib/workspace/production/selectors.ts` :: `getWorkspaceCapabilities`, `selectSnapshotView`의 read-only capabilities — modify
  - `types/workspace-production.ts` :: `ProjectView.capabilities`의 ReturnType 연결 — read-only, 추론 타입 확인
  - `lib/workspace/production/presentation.ts` :: `selectProductionSlides`의 mine — read-only, 동일 담당 기준 확인
  - `lib/workspace/files/permissions.ts` :: `canAccessFileProject` — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export function canChangeSlideState(
    context: WorkspaceContext,
    state: ProjectWorkspaceState,
    slideId: string,
  ): boolean;

  // getWorkspaceCapabilities의 반환 객체에 추가하는 파생 필드
  stateChangeableSlideIds: string[];
  ```

- **Data & Schema Fields**: 영속 필드/저장 스키마 변경 없음. `stateChangeableSlideIds`는 현재 identity/state로 계산하는 ID 배열이며 nullable이 아니다. 보관본/권한 상실의 안전한 view에서는 `[]`다. `editableSlideIds`는 본문 편집용으로 그대로 유지한다.
- **Execution Flow / Logic**:
  1. 현재 slideId와 해당 section이 존재하고 `state.phase === "writing"`, `canAccessFileProject(context.identity,context.project)`이며 `section.assigneeIds`에 actor.id가 있을 때만 true다. 하나라도 아니면 false. role/PM/managePermissions/action grant로 담당 배정을 대체하지 않는다.
  2. 완료된 slide도 실제 담당자는 다시 작성 중으로 해제할 수 있으므로 이 helper에서 `!isSlideLocked`를 요구하지 않는다. 완료 회차(state.phase!==writing)와 개별 slide.state===done은 구분한다.
  3. `getWorkspaceCapabilities.stateChangeableSlideIds`는 위 helper가 true인 slide IDs로 만든다. `unlockableSlideIds`는 helper가 true이고 `isSlideLocked(slide)`인 것만 포함한다. 기존 PM 예외가 포함된 `isSectionAuthor`만으로 unlockableSlideIds를 만들지 않는다.
  4. `editableSlideIds`/`editableSectionIds`/`insertableSectionIds`/`unlockableSectionIds`/프로젝트 actions는 기존 계산을 유지한다. 본문 편집/목차 일괄 권한까지 이번 상태 요청으로 바꾸지 않는다.
  5. `ProjectView.capabilities`는 함수 반환 타입 추론을 사용한다. `selectSnapshotView`의 빈 capabilities 및 `ProductionWorkspace.safeView`에 새 배열을 빠짐없이 `[]`로 넣는다. `rg -n 'unlockableSlideIds|editableSlideIds' components hooks lib services types`로 다른 직접 생성 객체가 있는지 확인하여 동일하게 채운다. 새 필드를 단순 optional로 만들어 누락을 감추지 않는다.

### I02. 개별 상태 mutation의 실제 담당 검사

- Related Files:
  - `lib/workspace/production/domain.ts` :: `applyWorkspaceMutation`의 `set-slide-state`, `unlock-slide` — modify
  - `services/workspace/WorkspaceProductionService.ts` :: `execute` — read-only, 기존 요청 검증/commitPrepared 경로 재사용
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: `commitPrepared` — read-only

#### Details

- **Signatures & Types**: 기존 `WorkspaceOperation`의 `{type:"set-slide-state";id:string;state:"writing"|"done"}`와 `{type:"unlock-slide";id:string}` 유지. 새로운 mutation이나 서비스 분기를 만들 필요가 없다.
- **Data & Schema Fields**: 성공한 대상 한 장의 state/revision 및 기존 aggregate 동기화만 변경한다. 본문/editorPrompt/형제 slide 상태/권한 배정은 변경하지 않는다. 실패하면 state/revision/inputRevision/undo가 모두 기존대로 유지된다.
- **Execution Flow / Logic**:
  1. 기존 `writing()` → `slide(operation.id)` 존재 확인 순서는 유지한다.
  2. 현재 `check(isSectionAuthor(...), "FORBIDDEN", ...)`를 `check(canChangeSlideState(context,state,item.id), "FORBIDDEN", "담당 슬라이드만 작성 상태를 변경할 수 있습니다.")`로 대체한다. 화면이 잘못 활성화돼 있거나 요청을 직접 보내도 동일하게 거부된다.
  3. 동일 상태 요청도 먼저 담당 검사를 수행한다. `set-slide-state`의 done→writing 경로와 `unlock-slide` 모두 검사하므로 명령 이름을 바꾼 우회가 없어야 한다.
  4. 실제 담당자의 unlock은 기존 `isSlideLocked` 검증을 유지한다. writing→done 또는 done→writing으로 달라질 때만 대상 revision++하고 기존 단일 상태 갱신 방식/섹션 상태 동기화를 유지한다.
  5. 기존 expectedRevision/round 검사로 배정이 바뀐 오래된 요청은 CONFLICT이며, 최신 revision으로 비담당 요청하면 FORBIDDEN이다. 실패를 성공 메시지로 처리하지 않는다.
  6. `set-section-state`/`unlock-section`/프로젝트 complete/start-round는 이 Task에서 수정하지 않는다. 이들은 별도 목차/프로젝트 작업이며 제작의 개별 상태 드롭다운과 동일 operation이 아니다.

### I03. 드롭다운 권한·회색 표시 및 별도 해제 버튼 제거

- Related Files:
  - `components/workspace/production/ProductionToolbar.tsx` :: `canChangeState`, `DadamSelect`, 기존 완료 안내/고정 해제 버튼 제거 — modify
  - `components/workspace/production/ProductionWorkspace.tsx` :: `safeView`, `onState`, 기존 onUnlock 전달 제거 — modify
  - `components/ui/DadamControls.tsx` :: `DadamSelect` — read-only, native select disabled 전달 확인
  - `lib/ui/dadam-theme.ts`, `app/dadam-tokens.css` :: `dadamControl.disabled` — read-only

#### Details

- **Signatures & Types**: `ProductionToolbarProps.onUnlock?:()=>void`를 제거하고 사용처의 전달도 제거한다. `onState?(state:"writing"|"done"):void`는 유지한다. view.capabilities에서 새 `stateChangeableSlideIds`를 사용하며 role/assignee를 UI에서 따로 해석하지 않는다. domain의 `unlock-slide` operation은 드롭다운의 done→writing 전환에 계속 사용한다.
- **Execution Flow / Logic**:
  1. `canChangeState`는 activeSlide 존재 + `stateChangeableSlideIds.includes(activeSlide.id)`다. done인 경우에는 unlockableSlideIds 포함 조건도 확인한다. 기존 writing 상태의 editableSlideIds 기반 허용 조건을 제거한다.
  2. 비담당 상태에서는 현재 value/문구/드롭다운 위치를 유지하고 native select를 `disabled`로 만든다. 마우스/키보드로 열거나 선택할 수 없고 현재 상태는 보인다. `aria-disabled`만 설정하거나 pointer-events만 막는 구현은 하지 않는다. 특히 비담당 done의 텍스트는 기존 `control.disabled`(#9aa5b3), 바탕은 `control.muted`(#f5f7fa)다. `DadamSelect`의 기존 `:disabled`/`:has(select:disabled)` 규칙을 먼저 재사용하고, 화면 스타일이 이를 덮는 경우에만 toolbar의 실제 select disabled 셀렉터로 같은 토큰을 적용한다. 새 회색 hex/전체 opacity/전역 스타일 변경을 추가하지 않는다. 비담당 writing에도 기존 disabled 회색 기준을 유지한다.
  3. 기존 busy/!onState 조건도 유지하고 onChange에서도 !busy/canChangeState/실제 상태 변화 여부를 재확인한 뒤 callback을 호출한다. title에 `담당 슬라이드만 작성 상태를 변경할 수 있습니다.`를 제공할 수 있으나 별도 경고/확인 모달을 추가하지 않는다.
  4. toolbar 아래의 기존 파란 완료 안내와 `고정 해제` 버튼을 제거한다. 완료 안내는 I04의 프롬프트 상자 한 곳에서만 표시한다. 담당자를 포함해 제작에 별도 고정 해제 버튼을 남기지 않는다. 목차 화면의 동명 버튼은 이 요청으로 제거하지 않는다.
  5. ProductionWorkspace의 `onState`는 safeView의 해당 capability를 확인한 뒤 기존 execute를 호출한다. writing으로 바꿀 때의 `unlock-slide`, done으로 바꿀 때의 `set-slide-state` 매핑은 유지한다. 별도 `onUnlock` 전달은 제거한다. readOnly/accessDenied/snapshot 시 새 capability는 빈 배열이다. UI에서 막힌 요청은 service를 호출하지 않으며 domain은 별도 방어를 유지한다.
  6. 본문 adapter의 can/저장 권한은 `editableSlideIds` 그대로다. PM이 담당이 아닌 writing 슬라이드의 본문을 편집할 수 있던 기준은 유지하면서 상태 드롭다운만 비활성화한다. 완료 slide의 본문은 기존처럼 잠긴다.
  7. 담당 테두리, 목차 팝업, 상태 문구, 폰트/기존 버튼 크기, 드롭다운 위치, 반응형, 성공 문구 제거는 유지한다. 새 보기 버튼도 기존 DadamButton을 재사용하며 공용 버튼 리팩토링을 하지 않는다.

### I04. 완료 프롬프트 상자의 접힘·읽기 전용 펼침

- Related Files:
  - `components/workspace/production/CompletedSlidePrompt.tsx` :: `CompletedSlidePrompt` — new
  - `components/workspace/production/ActiveSlideEditor.tsx` :: 완료 상태 분기 및 기존 draft 보호 — T03에서 생성, modify
  - `components/workspace/production/SlidePromptEditor.tsx` :: readOnly 저장 버튼 미렌더 계약 — T03에서 생성, 검증 후 필요시 modify
  - `lib/workspace/production/slide-prompt.ts` :: `readSlidePrompt` — read-only
  - `lib/ui/dadam-theme.ts`, `app/dadam-tokens.css` :: 기존 회색/글꼴 토큰 — read-only
  - `components/workspace/production/ProductionPanels.tsx` :: 중앙 반응형 레이아웃 — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  export interface CompletedSlidePromptProps {
    prompt: string; // 저장된 슬라이드의 원문. 생성 결과를 새로 조립하지 않는다.
  }
  export default function CompletedSlidePrompt(
    props: CompletedSlidePromptProps,
  ): React.ReactElement;
  // 컴포넌트 내부 임시 상태만 사용
  const [expanded, setExpanded] = useState<boolean>(false);
  ```

- **Data & Schema Fields**: 새로운 저장 필드/DTO 없음. expanded는 현재 완료 상자 instance의 UI 상태다. project/round/snapshot/slide별로 분리하며 페이지 저장소나 프로젝트 revision에 기록하지 않는다. prompt는 `readSlidePrompt(slide)`로 얻는다. 이전 원문이 없는 경우 T02의 own-content fallback만 사용한다.
- **Execution Flow / Logic**:
  1. 완료 판별은 `slide.state === "done"`으로 한다. 일반 비담당 writing/보관본 readOnly 조건만으로 완료 상자를 만들지 않는다. ActiveSlideEditor는 접근 가능한 done slide에 기존 쓰기 입력창 대신 CompletedSlidePrompt를 렌더한다. 편집 가능한 writing은 기존 SlidePromptEditor를 사용한다.
  2. 완료 상자 key는 projectId/currentRound/snapshotId/slide.id 조합으로 지정한다. 완료 상태로 진입하면 컴포넌트가 mount되어 expanded=false, writing으로 바뀌면 unmount된다. 다른 슬라이드/프로젝트/회차/보관본 또는 완료 슬라이드 재진입도 접힘으로 시작한다. 같은 완료 상자에서 댓글 등 unrelated revision 갱신만 발생하면 펼침을 유지한다. 부모 editor/hook 전체를 강제 remount하여 draft를 지우지 않는다.
  3. 닫힌 상자: width:100%, min-width:0, box-sizing:border-box, border:`1px dashed ${control.border}`, border-radius:14px, background:control.muted, box-shadow:none. 최소 높이 54px, padding:12px 16px를 기준으로 첨부 이미지처럼 둥근 점선 띠를 만든다. 높이는 고정하지 않아 좁은 화면/큰 글꼴에도 잘리지 않게 한다. 배경/선 토큰의 현재 값은 #f5f7fa/#cdd5e0이며 CSS에 별도 상수로 복제하지 않는다.
  4. 헤더는 flex/align-items:center/gap:8px. 왼쪽은 LockClosed16Regular(aria-hidden, shrink-0, 중앙 정렬)와 `작성 완료 · 고정됨` strong 텍스트, 오른쪽은 margin-left:auto의 기존 DadamButton(size=small) `프롬프트 보기`다. 전체 상자나 fieldset을 disabled/opacity 처리하면 보기 버튼까지 막히므로 그렇게 구현하지 않는다. 레이블은 기존 Dadam 글꼴·일반 전경색을 사용한다.
  5. 버튼에 type=button, aria-expanded=expanded, aria-controls=useId()로 만든 원문 영역 ID를 설정한다. 클릭/Enter/Space로 expanded를 전환하며 열리면 `프롬프트 접기`로 바꾼다. 토글은 state command/service/save를 호출하지 않는다. 읽기 권한은 있으나 편집 권한이 없는 비담당도 볼 수 있다.
  6. 펼침 시 같은 회색·점선 상자 내부 헤더 아래에 읽기 전용 region을 렌더한다. 바깥 점선은 하나만 두며 원문에 테두리를 중첩하지 않는다. region에 aria-label=`완료된 슬라이드 프롬프트`, tabIndex=0을 주어 키보드 스크롤이 가능하게 한다. 문자열을 React 텍스트로 출력하고 white-space:pre-wrap, overflow-wrap:anywhere, min-width:0, max-height:180px, overflow-y:auto로 긴 원문도 줄바꿈/스크롤/선택 복사가 가능하게 한다. HTML로 주입하거나 contenteditable/입력용 textarea를 두지 않는다. 본문 전경은 tokens.colorNeutralForeground2를 사용해 읽을 수 있게 하고 disabled 회색 글자는 상태 select에 사용한다. 빈 원문은 `저장된 프롬프트가 없습니다.`로 표시한다.
  7. 완료에서 `슬라이드에 반영` 전송 버튼은 접힘/펼침 모두 DOM에 없어야 한다. completed panel에 onSave를 전달하지 않는다. 쓰기 편집기를 hidden CSS로 뒤에 남겨 탭/키보드 접근을 허용하지 않는다. adapter Ctrl+S도 기존 완료 권한 검사로 서비스 호출 0회다. 완료 UI에서는 입력창의 `AI 배치 시연` 안내와 중복 readOnly 안내를 생략하고 잠금 문구는 헤더 한 번만 표시한다.
  8. 담당자가 드롭다운으로 writing으로 바꾸는 요청에 성공한 뒤 원문 편집창/저장 버튼으로 복귀한다. 실패/충돌하면 완료 카드와 현재 상태를 유지하고 오류를 표시한다. 상태 변경 성공 전부터 낙관적으로 원문을 접거나 지우지 않는다. 정상적인 dirty 상태에서 완료 전환은 기존 DraftProtection의 저장/폐기 확인을 거친다.
  9. 다른 탭 등의 외부 변경으로 **미저장 draft가 남은 상태에서 완료**되면 자동 폐기하지 않는다. 완료 상자는 저장된 원문으로 표시하며, 기존 충돌/권한 상실 안내와 함께 `미반영 원문`을 별도 읽기 전용 영역으로 보존해 복사/명시 폐기가 가능하게 한다. 이 예외에서도 전송 버튼은 없으며 draft를 저장된 완료 원문으로 가장하지 않는다. accessDenied이면 기존 정책대로 저장된 완료 원문/보기 버튼을 새로 노출하지 않고 사용자가 이미 쓰던 draft 보존 규칙만 따른다.
  10. 보기 토글에 따른 상자 높이 변화는 기존 중앙 레이아웃 흐름 안에서 처리한다. position:fixed/absolute로 출처나 슬라이드 미리보기를 가리지 않는다. 슬라이드 미리보기와 상태·source·권한·undo는 펼침으로 바뀌지 않는다.

## Acceptance Criteria

- [x] 비담당 슬라이드는 writing/done 어느 상태든 드롭다운이 disabled이고 현재 상태는 보인다.
- [x] PM/슈퍼 관리자/개별 권한 grant가 있어도 실제 담당 배정이 없으면 개별 상태 변경/고정 해제가 불가하다.
- [x] 담당자는 writing 회차에서 자신의 슬라이드를 완료하고 다시 해제할 수 있으며 형제 슬라이드 상태는 바뀌지 않는다.
- [x] 제작의 별도 고정 해제 버튼은 담당자를 포함해 모두 제거한다. 비담당의 직접 set-slide-state/unlock-slide 요청은 FORBIDDEN이다.
- [x] 본문 편집 권한/목차 전체 상태 작업/프로젝트 완성·재작업 권한은 이번 변경으로 달라지지 않는다.
- [x] 보관본/완료 회차/권한 상실/busy에서는 담당자도 UI 조작 불가이며 최신 담당 재배정이 반영된다.
- [x] 화면과 domain이 동일한 담당 판단을 사용하며 저장 데이터/일반 성공 문구를 추가하지 않는다.
- [x] 완료 시 기본 접힘의 회색 점선 상자에 자물쇠+`작성 완료 · 고정됨`과 우측 `프롬프트 보기`가 한 번만 표시된다.
- [x] 원문 보기/접기는 읽기 전용 UI 상태만 바꾸며 비담당도 읽기 권한이 있으면 가능하다. 슬라이드 전환/다시 완료 시 접힘으로 초기화한다.
- [x] 완료 접힘/펼침 모두 전송 버튼 없음, Ctrl+S 반영 불가. 담당자가 드롭다운으로 writing 전환 성공 시 편집창이 복귀한다.
- [x] 비담당 완료 드롭다운 글자는 control.disabled 회색이고 완료 상자는 기존 회색 토큰을 재사용한다.
- [x] 외부 완료/권한 변경/실패로 미저장 draft가 유실되지 않으며 긴 원문·좁은 중앙 폭에서도 읽기/스크롤이 가능하다.

## Validation

실행 단계의 검증 명령이다. 계획 단계에서는 실행하지 않는다. `tests/`/임시 검증 파일/브라우저/CUA/E2E/dev server/스크린샷 생성·실행 금지.

1. `npm.cmd run typecheck` — 추가 capability를 포함한 모든 view literal 검사.
2. `npx.cmd eslint lib/workspace/production/permissions.ts lib/workspace/production/selectors.ts lib/workspace/production/domain.ts components/workspace/production/ProductionToolbar.tsx components/workspace/production/ProductionWorkspace.tsx components/workspace/production/ActiveSlideEditor.tsx components/workspace/production/SlidePromptEditor.tsx components/workspace/production/CompletedSlidePrompt.tsx`
3. PowerShell here-string을 `node --import tsx --input-type=module`로 전달해 `canChangeSlideState`, `getWorkspaceCapabilities`, `applyWorkspaceMutation`을 직접 검증한다. 기존 in-memory context/seed를 복제하고 아래 행렬을 assert한다. 실제 저장소를 초기화하지 않는다.

   | 조건 | 상태 capability / 개별 mutation | 본문 capability |
   | :--- | :--- | :--- |
   | 담당 일반 사용자 + writing | 포함 / done 성공 | 기존 허용 |
   | 담당 일반 사용자 + done | 포함·unlock 포함 / writing 성공 | 완료라 기존 차단 |
   | 비담당 일반 사용자 | 제외 / 두 상태 명령 FORBIDDEN | 기존 차단 |
   | 비담당 PM / super_admin | 제외 / 두 상태 명령 FORBIDDEN | writing은 기존 허용 |
   | 담당 PM / super_admin | 포함 / 완료·해제 성공 | 기존 규칙 |
   | snapshot / 완료 회차 | 빈 capability / 회차 READ_ONLY | 기존 차단 |
   | 배정 취소 직후 stale revision | 최신 capability 제외 / CONFLICT | 기존 최신 권한 |
   | 배정 취소 후 최신 revision | 제외 / FORBIDDEN | 기존 최신 권한 |

   추가로 동일 상태 요청도 비담당이면 거부, 실패 state/revision/undo 불변, 담당 A 상태 변경 시 형제 B 불변을 검증한다. 기존 `canEditSlide`/목차 전체 권한 결과는 변경 전 계약과 같아야 한다.
4. 같은 stdin 방식의 jsdom/React 검증에서 toolbar를 담당/비담당, writing/done으로 렌더한다. 실제 select.disabled, value 유지, 비담당 onState callback 0회, 담당 callback 1회, busy/snapshot callback 0회, 제작 `고정 해제` 버튼/prop/handler 제거를 확인한다. UI만 검사하고 권한 검사를 통과했다고 대신 보고하지 않는다.
   - 완료 초기 render: 원문 영역 없음, 자물쇠/완료 문구 한 번, 프롬프트 보기 있음, 전송 버튼 없음.
   - 보기 클릭: aria-expanded=true, 저장 원문 그대로 출력, 문구 접기로 전환, contenteditable/전송 버튼 없음, service callback 0회. 다시 클릭하면 접힘.
   - 비담당 done: select disabled 및 회색 토큰 규칙, 보기 버튼은 읽기 권한이 있으면 enabled. 담당 done: select로 writing 전환 가능, 별도 해제 버튼 없음.
   - done→writing 성공 시 입력창/전송 버튼 복귀, writing→done 성공 시 다시 접힘. 실패 시 기존 상태/원문 유지. 다른 slide/round/snapshot 재진입 초기 접힘, 같은 slide의 unrelated revision 갱신은 펼침 유지.
   - 미저장 draft 도중 외부 완료/접근 상실은 기존 draft 보존·오류 안내 유지, 저장된 원문과 구별, 전송/키보드 저장 0회.
   - 긴 한글/공백/줄바꿈/`<script>` 문자열은 원문 그대로 텍스트로 처리하며 임의 HTML 실행 없음. min-width/wrap/overflow 및 점선·배경·disabled 색은 소스 규칙으로 확인한다. jsdom 결과를 실제 브라우저 레이아웃·색상 검증으로 보고하지 않는다.
5. `npm.cmd run build` — T04 권한·UI 변경 이후 최종 빌드.
6. `git diff --check` — 공백 오류 없음. 실행 결과는 기존 `.memory/reports/2026-11-07-production-prompt-editor-shortcuts-validation.md`에 추가한다. 실제 브라우저 시각 검증 미실시를 명시한다.

## Commit Message

```text
feat(production): 담당자 상태 권한과 완료 프롬프트 보기를 적용

Plan: 2026-11-07-production-prompt-editor-shortcuts
Phase: P01-production
Task: T04-assignee-slide-status

- 본문 편집과 개별 상태 변경 권한을 분리
- 비담당 드롭다운을 회색 비활성 표시하고 실제 상태 변경도 차단
- 완료 프롬프트를 회색 점선 상자의 접힌 읽기 전용 보기로 구성
- 완료 전송 및 별도 고정 해제 버튼을 제거
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 완료 커밋 (본 파일 Git 이력 참조)
- 최종 Task. 완료 후 phase/plan/current를 done:4/4, Active Task 없음으로 갱신한다.
