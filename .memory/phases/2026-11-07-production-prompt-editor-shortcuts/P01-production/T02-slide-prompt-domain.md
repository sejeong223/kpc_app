# Task: T02 슬라이드별 통프롬프트·배치 결과 저장

## Status: pending

## Goal

자유로운 원문 한 개를 기존 슬라이드 레이아웃에 로컬 시연으로 배치하고, 해당 슬라이드의 원문/결과를 함께 저장하는 계약을 제공한다. 같은 소목차의 다른 슬라이드와 기존 저장본은 변경하지 않는다.

## Decision Summary

- 입력은 plain string 통프롬프트다. 제목/표/본문별 필드·입력 문법을 요구하지 않는다. 구조화된 `SlideContent`는 결과 모델일 뿐이다.
- `ProposalSlide.editorPrompt?: string` + 기존 `content`를 사용한다. 기본 편집기의 슬라이드별 원문·공통 권한과 제조업 예시의 레이아웃 배치를 결합한다.
- 실제 AI 호출은 없고 결정적인 로컬 시연이다. 원문을 보존하고 결과만 내부 규칙으로 배치한다. 버튼 리팩토링/DB/패키지 변경 없음.
- 선행 T01 완료. T02에서는 기존 편집 UI/명령을 유지해 단독 검증 가능한 호환 상태로 만들고 T03에서 호출부를 교체한다.

## Implementation

### I01. 선택 원문 필드와 입력·준비 작업 스키마

- Related Files:
  - `types/workspace-production.ts` :: `ProposalSlide`, `PreSlideStateProposalSlide`, `ProjectRequest`, `PreparedWorkspaceOperation`, 신규 `SlidePromptRequest` — modify
  - `config/workspace-production.ts` :: `WORKSPACE_LIMITS` — modify
  - `lib/workspace/production/schemas.ts` :: `ProposalSlideSchema`, `PreparedWorkspaceMutationSchema`, 신규 `SlidePromptRequestSchema` — modify
  - `lib/workspace/production/state-compatibility.ts` :: `StoredWorkspaceStateSchema`, `upgradeWorkspaceState` — read-only, 호환 검증 대상
  - `lib/workspace/production/storage-schemas.ts` :: 저장 레코드 스키마 — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // ProposalSlide에 추가. 기존 필드는 모두 유지한다.
  editorPrompt?: string;

  // 과거 저장 형식을 현재 모델의 새 필드로 확장하지 않는다.
  type PreSlideStateProposalSlide = Omit<ProposalSlide, "state" | "editorPrompt">;

  export interface SlidePromptRequest extends ProjectRequest {
    slideId: string;
    prompt: string;
  }
  // PreparedWorkspaceOperation union에 추가, public WorkspaceOperation에는 넣지 않는다.
  type PreparedSlidePromptOperation = {
    type: "apply-slide-prompt";
    slideId: string;
    prompt: string;
    content: SlideContent;
  };
  ```

- **Data & Schema Fields**:
  - `WORKSPACE_LIMITS.editorPrompt: 20000` 추가. 새 raw prompt 제한이며 기존 text/lead/title 제한은 변경하지 않는다.
  - `ProposalSlide.editorPrompt`: optional string, max 20000, nullable 아님, 저장 스키마에서 trim/default를 적용하지 않는다. 필드가 없는 기존 v3 저장본도 유효하다. 빈 문자열도 저장 스키마는 읽을 수 있지만 새 반영 요청에서는 공백뿐인 값을 거부한다.
  - `SlidePromptRequestSchema`: `projectId`/`slideId`는 기존 ID 스키마, `expectedRevision`/`expectedRound`는 기존 양의 count, `prompt`는 string max 20000 + `trim().length > 0` refine. **검사만 하고 변환/trim 저장하지 않는다.** strictObject로 다른 키를 거부한다.
  - `PreparedWorkspaceMutationSchema`의 새 operation에도 같은 원문 검사 + `SlideContentSchema` 적용. `ProposalSlideSchema`는 기존 PreSlideStateSchema.safeExtend에 state와 editorPrompt를 추가한다. v1/v2용 PreSlideStateSchema에 새 필드를 넣지 않는다.
  - `schemaVersion: 3` 유지. 이번 선택 필드는 기존 v3의 호환 확장이다. IndexedDB 이름/버전/seed/revision을 읽기만으로 바꾸지 않는다.
  - `Section.demoPrompt`, `ManufacturingPrompt`, `usedSettings.prompt`는 유지한다. 신규 요청은 sectionId/제목/본문/표 프롬프트 필드를 받지 않는다.
- **Execution Flow / Logic**:
  1. old v1/v2는 기존 엄격 스키마 → 업그레이드 → v3 검사 경로를 그대로 탄다. current/snapshots/undo.previousBody 모두 유효해야 한다.
  2. 원문 없는 current v3도 그대로 읽고, 새 필드가 있는 v3는 current/snapshot/undo 모두 정확히 보존한다.
  3. 손상된 필드/null/초과 길이는 기존 오류 처리로 거부한다. 전체 저장본을 예시 seed로 덮거나 원문을 잘라 복구하지 않는다.
  4. 저장 결과 구조는 기존 content와 같고 새로운 API/서버 endpoint/Cosmos 문서를 만들지 않는다.

### I02. 원문 읽기와 단일 입력의 로컬 배치 함수

- Related Files:
  - `lib/workspace/production/slide-prompt.ts` :: `readSlidePrompt`, `composeSlidePrompt` — new
  - `lib/workspace/production/manufacturing-prompt.ts` :: `manufacturingLayout` — read-only, 현재 유효 레이아웃 판별 재사용
  - `config/production-html-demo.ts` :: `htmlDemoLayout` — read-only
  - `components/workspace/production/HtmlDemoSlidePreview.tsx` :: 3 text block / 2열 table 출력 계약 — read-only
  - `lib/workspace/production/schemas.ts` :: `SlideContentSchema`, `ProposalSlideSchema` — read-only 사용

#### Details

- **Signatures & Types**:

  ```typescript
  export function readSlidePrompt(slide: ProposalSlide): string;
  export interface ComposeSlidePromptInput {
    projectId: string;
    slide: ProposalSlide;
    prompt: string;
    newId(): string;
  }
  export function composeSlidePrompt(input: ComposeSlidePromptInput): SlideContent;
  ```

- **Data & Schema Fields**: 함수는 slide/content를 mutate하지 않고 새 `SlideContent`를 반환한다. 출력 구조는 title/lead/blocks 그대로다. 모델/프롬프트 구역/원문 parser DTO를 추가하지 않는다. DOM/React/네트워크/스토리지 의존 없음.
- **Execution Flow / Logic — 원문**:
  1. `editorPrompt !== undefined`이면 빈 문자열을 포함해 그대로 반환한다. truthy 판별로 다른 내용으로 바꾸지 않는다.
  2. 필드가 없으면 **그 슬라이드의 content만** 사용한다. title, lead, 각 block 순서대로 펼친다. text는 text, list는 items를 줄바꿈, table은 columns/각 row의 셀을 탭으로 결합하고 행 사이 줄바꿈, image는 alt만 사용한다. 빈 조각은 제외하고 조각 사이 빈 줄로 연결한다.
  3. `제목:`, `본문:`, `표:` 등 입력 구역 레이블을 덧붙이지 않는다. 기존 내용 자체에 들어 있던 문자열은 지우지 않는다. `Section.demoPrompt`/다른 slide/asset prompt를 읽지 않는다.
  4. fallback이 20000자를 초과해도 조회에서 자르거나 저장하지 않는다. T03에서 초과 오류를 보이고 사용자가 줄여 반영할 수 있게 한다.
- **Execution Flow / Logic — 배치**:
  1. prompt 유효성을 검사한 뒤 로컬 작업 복사본에서만 CRLF→LF/앞뒤 공백 정리한다. 원문 저장 값은 원래 문자열 그대로다. 콜론·Markdown·JSON·구역 이름에 특별한 입력 의미를 부여하지 않는다.
  2. 전체 입력을 줄바꿈 또는 문장 종결부호 뒤 공백 경계로 나눈다. 빈 조각은 제외한다. 단일 긴 문장도 동작하도록 각 조각을 최대 1000자 단위로 나누되 surrogate pair를 자르지 않는다. 입력 순서를 유지한 문장 조각 배열을 만든다. 숫자/주장/사실을 새로 생성하지 않는다.
  3. 출력 title은 첫 문장 조각의 앞 80자, lead는 전체 문장 조각을 공백으로 이은 앞 280자로 만든다(코드 포인트 경계 보존). 이는 UI 구역 입력이 아닌 임시 시연용 요약 추출이다. 본문에는 전체 조각이 배분되므로 원문 일부를 버리는 요약 처리로 대체하지 않는다.
  4. 레이아웃은 현재 slide의 `manufacturingLayout(projectId, slide) ?? htmlDemoLayout(projectId, slide)`로 판별한다. 손상된 예시 모양을 임의로 원본 seed에 맞춰 복원하지 않고 일반 Basic 경로로 처리한다.
  5. cards/process/kpi: 기존 세 text block ID/순서를 유지한다. 조각 배열을 연속한 세 그룹으로 최대한 균등하게 나눈다(앞 그룹부터 ceil(남은 조각 수/남은 그룹 수)). 각 그룹의 결합 문자열에서 첫 40자를 heading, 나머지를 본문으로 삼아 `heading + '\n' + remainder`로 저장한다. 부족한 그룹은 빈 문자열로 두며 기존 무관한 문구나 가짜 KPI 값을 채우지 않는다. 항상 정확히 3 text block이어야 한다.
  6. demo table: 기존 table ID와 2개 columns를 유지한다. 조각을 최대 100개 연속 그룹으로 균등 분배하고 각 그룹 첫 40자를 첫 셀, 나머지를 둘째 셀로 둔다. 최소 1행. 셀/행 제한을 초과하면 LIMIT 오류를 내고 원본 저장 상태를 유지한다.
  7. 일반 Basic: 기존 text/list/table block들의 ID/종류/순서를 유지하고 문장 조각을 이 블록 수에 맞춰 위 방식으로 연속 분배한다. text는 그룹을 줄바꿈으로 결합, list는 각 조각을 item, table은 기존 columns를 유지하고 조각을 행 우선 순서의 셀에 넣는다(최소 1행, 마지막 행 빈 셀 채우기). block 종류에 대응하는 스키마 한도를 넘으면 LIMIT이며 임의 잘라 저장하지 않는다. 이미지 block은 alt/blobId/geometry까지 그대로 복사한다. 본문 block이 없고 최대 block 수 미만이면 text block 하나를 newId로 추가해 전체 본문을 담는다. 이미 block 한도면 LIMIT이다.
  8. Template: template/bindings/objectId는 그대로 둔다. title/lead는 해당 binding이 있을 때만 갱신하고, text/list/table은 binding.key로 연결된 기존 block만 갱신한다. 이미지와 연결되지 않은 block은 보존한다. 배분은 갱신 가능한 본문 block에만 한다. 본문 binding은 없고 title/lead만 있는 경우 매핑된 문자열 슬롯에 입력 전체를 순서대로 제한 내에서 배분한다. 전체 입력이 매핑된 슬롯 용량을 넘으면 LIMIT. 이미지 binding만 있거나 텍스트 대상이 하나도 없으면 LAYOUT 오류. 존재하지 않는 binding을 만들거나 template을 null로 바꾸지 않는다.
  9. 생성한 content를 SlideContentSchema로, 원래 slide에 content만 바꾼 가상 slide를 ProposalSlideSchema로 검사한다. 제한 초과는 `WorkspaceError("LIMIT", ...)`, 배치 불가능/잘못된 mapping은 `LAYOUT`, 빈 입력/잘못된 요청은 `VALIDATION`. 입력을 특정 구역 문법으로 다시 쓰라고 요구하지 않는다.
  10. 원본 content/section/template/sources/usedSettings/state/demoSourceKey에는 side effect가 없어야 한다. HTML/PPT 내용을 실행하거나 새 이미지를 생성하지 않는다.

### I03. 기존 트랜잭션을 통한 원문·결과의 원자 저장

- Related Files:
  - `services/workspace/WorkspaceProductionService.ts` :: 신규 `applySlidePrompt`, 기존 `requested`, `editSlidesById`, `guard` — modify
  - `lib/workspace/production/domain.ts` :: `applyWorkspaceMutation`의 새 prepared operation, `contentSlidesChanged` — modify
  - `lib/workspace/production/clipboard.ts` :: `pinsForSlides`, `cloneClipboardSlide` — read-only 검증
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: `commitPrepared` — read-only, 기존 원자 저장 재사용
  - `services/workspace/workspace-records.ts` :: 저장/재조회 — read-only

#### Details

- **Signatures & Types**:

  ```typescript
  // WorkspaceProductionService의 공개 메서드
  async applySlidePrompt(input: SlidePromptRequest): Promise<WorkspaceReceipt>;
  // domain에는 operation.type === "apply-slide-prompt" 분기 추가
  ```

- **Data & Schema Fields**: target.editorPrompt=input.prompt, target.content=배치 결과. target.revision += 1. project revision/inputRevision/undo는 기존 contentSlidesChanged와 domain 종료 처리로 갱신한다. target.state/section.state/section.locked는 직접 수정하지 않는다.
- **Execution Flow / Logic**:
  1. service에서 `SlidePromptRequestSchema.safeParse` 실패 시 VALIDATION. `requested`로 현재 project/revision/round 확인. `editSlidesById(state,[slideId])`로 writing/권한/완료 잠금을 검사한다. template 등 접근 pin은 `pinsForSlides(state,[slide])`와 `guard(projectId,pins)`로 검증한다.
  2. guard를 실행한 뒤 `composeSlidePrompt`로 결과를 만든다. 임의 timeout/외부 호출/토큰 소비 없음. future AI 교체 지점은 이 함수 호출 경계이며 지금 provider 추상화 프레임워크를 만들지 않는다.
  3. `repository.commitPrepared({projectId,expectedRevision,expectedRound,operation:{type:"apply-slide-prompt",slideId,prompt,content}}, [], guard)`를 한 번 호출한다. 입력과 결과를 다른 mutation으로 나누지 않는다.
  4. domain 새 분기는 target을 찾고 `contentSlidesChanged([target.id])`를 먼저 호출한다. 이 경로가 재검사하는 `writing()`, `isSlideLocked`, `canEditSlide`를 우회하지 않는다. 결과를 `{...target,content,editorPrompt:prompt}`로 ProposalSlideSchema 검사 후 원문/결과를 복사하고 revision++한다. template binding을 삭제/재생성하지 않는다.
  5. 일반 기본 편집기와 동일하게 canEditSlide의 PM/관리자 권한을 따른다. `owner.assigneeIds.includes(actorId)`를 새로 추가하지 않는다. 완료 잠금은 PM/관리자도 해제 전 변경 불가이다.
  6. 실패시 기존 repository의 transaction을 통해 전체 미반영. CONFLICT/LOCKED/FORBIDDEN/READ_ONLY/ASSET_UNAVAILABLE/CANCELLED/STORAGE는 기존 오류 체계 유지. 한 슬라이드 원문만 저장되거나 결과만 바뀌는 상태가 없어야 한다.
  7. 현재 T02에서는 legacy `apply-manufacturing-prompt` 분기와 public schema를 유지한다. T03의 UI 교체/호출부 제거와 함께 제거 가능 여부를 확인한다. 새로운 통프롬프트 경로는 legacy 명령이나 Section.demoPrompt를 호출/갱신하지 않는다.

### I04. 기존 경로와 데이터 보존

- Related Files:
  - `lib/workspace/production/domain.ts` :: duplicate/move/remove/undo/replace-content/validateSlideReplacement — 수정 필요 여부를 확인하되 기존 구조 유지
  - `lib/workspace/production/clipboard.ts` :: `cloneClipboardSlide` — 기본 structuredClone 유지
  - `services/workspace/WorkspaceProductionService.ts` :: applyImport/insertImage/기타 content 변경 — 기존 slide spread/clone 보존 확인
  - `services/workspace/workspace-mfg-demo.ts`, `config/production-mfg-demo.ts`, `config/production-html-demo.ts` — seed 변경 금지, read-only

#### Details

- 복제/붙여넣기/이동/회차 snapshot/undo는 editorPrompt를 다른 slide 필드처럼 복사·복원한다. 붙여넣기의 새 ID/block ID/remap/작성 중 상태 규칙은 그대로 유지한다.
- PPT 가져오기·이미지 추가·기존 AI 결과 등 다른 경로의 content 수정은 editorPrompt를 지우거나 생성 결과로 덮지 않는다. 이 필드는 “마지막으로 저장한 사용자 원문”이며 생성 결과와 항상 동일한 텍스트를 뜻하지 않는다.
- 새 슬라이드/기존 원문 없는 슬라이드는 field absent를 유지해 자기 content fallback을 사용한다. 구버전 Section.demoPrompt는 보관하지만 사용자가 작성한 원문으로 슬라이드 전체에 복제하지 않는다.
- `validateSlideReplacement`가 전체 slide JSON을 비교하므로 editorPrompt만 바꾼 잠금 우회도 거부되는지 검증한다. 보존에 필요한 clone 수정 외 다른 AI/PPT 동작은 변경하지 않는다.

## Acceptance Criteria

- [ ] 자유 텍스트 한 개를 받아 현재 슬라이드 원문과 배치 결과를 함께 저장한다. 같은 소목차 다른 장은 그대로다.
- [ ] CRLF/빈 줄/공백/한글 포함 원문이 정확히 보존되며 `제목:`/표 영역 등 필수 구역 문법이 없다.
- [ ] 예시 카드·절차·KPI 3블록/표 2열 구조, Template binding, 이미지 참조/출처/완료 상태가 보존된다.
- [ ] 원문 없는 저장본은 자기 content로 fallback하며 읽기만으로 DB/seed/revision이 바뀌지 않는다.
- [ ] 구 v1/v2/v3, 보관본/undo, 새 v3 원문 재조회가 유효하다.
- [ ] 일반 편집기 권한과 개별 완료 잠금을 재사용하며 미권한/완료/충돌/취소/자산 오류시 원문과 결과 모두 미반영이다.
- [ ] 기존 UI는 T02 완료 시 계속 컴파일되고 동작한다. 외부 AI/DB/패키지/버튼 리팩토링 없음.

## Validation

`tests/` 또는 임시 검증 파일/브라우저/E2E를 만들지 않는다. 실행 기록은 `.memory/reports/2026-11-07-production-prompt-editor-shortcuts-validation.md`에 남긴다.

1. `npm.cmd run typecheck`
2. `npx.cmd eslint types/workspace-production.ts config/workspace-production.ts lib/workspace/production/schemas.ts lib/workspace/production/domain.ts lib/workspace/production/slide-prompt.ts services/workspace/WorkspaceProductionService.ts` (실제로 추가 수정한 보존 경로도 포함)
3. 기본 순수 함수 stdin 검증:

   ```powershell
   @'
   import assert from "node:assert/strict";
   import { readSlidePrompt, composeSlidePrompt } from "./lib/workspace/production/slide-prompt.ts";
   import { ProposalSlideSchema } from "./lib/workspace/production/schemas.ts";
   const slide = {id:"s1", sectionId:"section1", revision:1, state:"writing", template:null,
     content:{title:"Old title", lead:"Old lead", blocks:[{id:"b1",kind:"text",text:"Old text"}]},
     usedSettings:{skillPinId:null,promptPinId:null,promptItemId:null,prompt:"",sources:[]},sources:[]};
   const raw = "  Improve sensor collection reliability.\r\n\r\nUse current factory equipment.  ";
   const original = structuredClone(slide);
   const content = composeSlidePrompt({projectId:"project1",slide,prompt:raw,newId:()=>"new-block"});
   assert.deepEqual(slide, original);
   const result = ProposalSlideSchema.parse({...slide,editorPrompt:raw,content});
   assert.equal(readSlidePrompt(result), raw);
   assert.equal(readSlidePrompt({...slide,editorPrompt:""}), "");
   assert.match(readSlidePrompt(slide), /Old text/);
   assert.equal(result.content.blocks[0].id, "b1");
   assert.throws(()=>composeSlidePrompt({projectId:"project1",slide,prompt:"   ",newId:()=>"new-block"}));
   console.log("slide prompt mapping: PASS");
   '@ | node --import tsx --input-type=module
   ```

4. 추가 stdin 검증은 같은 `node --import tsx --input-type=module` 명령으로 수행한다. 기존 `createManufacturingDemoBundle(context)`/catalog/identity fixture와 `applyWorkspaceMutation`을 사용하고, persistence에는 이미 설치된 fake-indexeddb의 독립된 인메모리 DB를 주입한다. 실제 사용자 DB/파일/브라우저 저장소를 초기화하지 않는다. 필수 행렬:
   - 같은 소목차 A/B에서 A만 저장: A 원문+결과+revision 변경, B 및 section.demoPrompt 불변; 재조회 후 정확한 원문 복구.
   - 3블록 예시/2열 예시/일반 text·list·table/Template bound text/이미지 각각 구조·ID·원문 보존; blank/20001자/초과 셀/LAYOUT 실패 전체 미반영.
   - 권한 있는 담당자·PM·관리자 성공, 미권한 사용자 실패. 완료 slide 실패/형제 writing slide 성공. 보관본을 UI로 편집할 수 없으며 domain에서도 완료 회차는 READ_ONLY.
   - old v1/v2/v3 current/snapshots/undo 검사 통과, editorPrompt 있는 v3 current/snapshots/undo roundtrip, legacy Section.demoPrompt는 유지되지만 fallback 입력에는 사용되지 않음.
   - stale expectedRevision/round, 자산 권한 상실, service dispose/cancel, transaction 실패 시 원문/결과/수정 이력 미반영.
   - duplicate/clipboard/undo 원문 보존, replace-content로 editorPrompt만 바꾼 완료 slide 수정도 거부.
5. `git diff --check`

## Commit Message

```text
feat(production): 슬라이드별 통프롬프트와 배치 결과 저장을 추가

Plan: 2026-11-07-production-prompt-editor-shortcuts
Phase: P01-production
Task: T02-slide-prompt-domain

- 기존 저장본을 유지하며 슬라이드별 원문 필드를 추가
- 자유 입력을 기존 레이아웃에 배치하는 로컬 시연 로직 구성
- 공통 권한과 개별 잠금 아래 원문과 결과를 함께 저장
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
- 다음 Task: [T03](./T03-unified-prompt-editor.md)
