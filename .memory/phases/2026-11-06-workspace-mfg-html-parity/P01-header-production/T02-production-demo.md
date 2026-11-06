# Task: T02 제작 상태·편집·미리보기·출처 시연

## Status: done

## Goal

제조업 예시에서 46장/담당 15장을 탐색하고 HTML처럼 간결한 본문을 편집하며 출처를 열어 볼 수 있게 한다. 작성 상태 변경의 `변경을 반영했습니다.` 문구는 공통 제작 화면에서 제거한다.

## Decision Summary

- 선행 T01 계약: 프로젝트 `production-html-mfg-demo`, 46 slides(8/8/8/8/7/7), stable `ProposalSlide.demoSourceKey?:string`, `Section.demoPrompt?:{intro:string;bullets:string[]}`, fixture `config/production-mfg-demo.ts`. 각 섹션 첫 슬라이드 lead+3항목으로 prompt 초기화. 원본 행정 문구를 제조업 내용으로 고치는 것은 사용자 확정이다.
- 원본 HTML `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`의 `productionPromptAllowed`, `writeThumbs`, `srcOf`, `srcPanel`, `slideHtml`, `.sl-*`, `.dk-*`를 기준으로 한다. HTML은 읽기 전용이다.
- 기존 일반 프로젝트의 rich editor, 저장·충돌·초안 보호를 유지한다. 새 제조업 예시에만 섹션 본문 시연 어댑터를 붙인다. tests/·브라우저/CUA/E2E/dev server/스크린샷·패키지 추가·Cosmos DB·push 금지.

## Implementation

### I01. 상태 변경과 번호·배정·미리보기

- Related Files:
  - `components/workspace/production/ProductionWorkspace.tsx` :: `applyReceipt`, `execute`, `ActiveSlide`, `renderCenter` — modify.
  - `components/workspace/production/ProductionToolbar.tsx` :: 섹션 상태/잠금 — modify.
  - `lib/workspace/production/presentation.ts` :: `selectProductionSlides` — modify.
  - `components/workspace/production/SlideNavigator.tsx` :: rows/선택 표시 — modify.
  - `components/workspace/production/ProductionPreview.tsx`, `HtmlDemoSlidePreview.tsx`, `HtmlDemoSlidePreview.module.css` :: 레이아웃·브랜드 — modify.

#### Details

- `applyReceipt(receipt:WorkspaceReceipt, preferred?:string, options?:{silent?:boolean})`로 성공 알림을 선택 제어한다. execute의 operation.type이 set-section-state일 때 silent=true; 이전 일반 성공 notice도 null로 지운다. 실패는 fail/WorkspaceErrorText로 계속 표시한다. 다른 명령의 실제 notices/오류는 일괄 삭제하지 않는다.
- 드롭다운 `작성 중`/`작성 완료`: 실제 `set-section-state` mutation 유지. 동일 값은 no-op, 요청 중 연속 조작 금지, 실패하면 이전 상태 표시 유지. 성공 시 목차·헤더 완료 수가 같은 저장 상태로 갱신되어야 한다. 현재 round에서 작성 완료로 바꾸었다고 즉시 locked로 만들지 않는다. 재작업 시에만 기존 domain이 done 섹션을 고정한다.
- 새 예시에서는 `mine`을 assigneeIds.includes(view.actor.id)로 계산하여 **15장**에 표시한다. PM/admin의 광역 capability를 mine으로 오해하지 않는다. 초기 s31의 8장과 s33의 7장이 내 담당이다. 변경된 배정은 live state 기준으로 계산한다.
- 번호는 새 예시에 한해 전체 문서 순서 index+2(2..47), 일반 프로젝트는 index+1 유지. 전체 장수는 배열 길이 46. thumbnail·큰 미리보기·출처·다중 선택 표시에 동일 번호 전달. 원본에 없는 표지를 추가하지 않는다.
- 새 예시 렌더링은 `demoSourceKey`의 fixture layout을 사용한다. table은 2열 단일 table, 나머지는 text 3블록일 때 전용 렌더; 사용자가 구조를 바꾸면 BasicSlidePreview로 fallback하여 본문을 숨기지 않는다.
- 새 예시 primary `#1f3a5f`(tp2 Navy), 배경 흰색, Pretendard. 기존 MOIS primary `#0f5e63` 유지. footer는 view.project.name/제조업 기관을 사용한다. MOIS 제목·기관 상수를 모든 예시에 공통 사용하지 않는다.
- 16:9 비율/width100%/max-width:none 유지. viewport 기준 고정 높이나 860px 최대 너비를 재도입하지 않는다. `.slide`에 scoped CSS custom property로 색을 전달한다. thumbnail은 댓글 surface를 만들지 않으며 full은 기존 코멘트 포털 유지.

### I02. 섹션 본문형 편집과 저장

- Related Files:
  - `components/workspace/production/ManufacturingPromptEditor.tsx` :: 새 compact editor — new.
  - `hooks/workspace/use-manufacturing-prompt.ts` :: draft/저장/충돌 — new.
  - `lib/workspace/production/manufacturing-prompt.ts` :: prompt 변환 — new.
  - `types/workspace-production.ts` :: WorkspaceOperation — modify.
  - `lib/workspace/production/schemas.ts` :: WorkspaceOperationSchema — modify.
  - `lib/workspace/production/domain.ts` :: `applyWorkspaceMutation` — modify.
  - `components/workspace/production/ProductionWorkspace.tsx` :: 제조업 editor 연결 — modify.
  - `components/workspace/shared/WorkspaceUi.tsx` :: DraftProtection 계약 — read-only.

#### Details

```typescript
// WorkspaceOperation 추가
type ApplyManufacturingPrompt = {
  type: "apply-manufacturing-prompt";
  sectionId: string; slideId: string; prompt: ManufacturingPrompt;
};
export function applyManufacturingPromptContent(
  content: SlideContent, prompt: ManufacturingPrompt,
  layout: "cards" | "process" | "kpi" | "table" | null,
  newId: () => string
): SlideContent;
interface ManufacturingPromptEditorProps {
  value: ManufacturingPrompt; readOnly: boolean; busy: boolean; error: string | null;
  resetKey: number;
  onChange(value: ManufacturingPrompt): void;
  onSave(): void;
  onEditorStateChange(state: {dirty:boolean;composing:boolean;error:string|null}): void;
}
```

1. 제조업 `demoPrompt`가 있는 섹션에서는 제목/lead/전체 블록 문서 대신 intro 문단+bullet 목록의 단일 편집 박스를 보여 준다. 같은 섹션의 다른 장으로 이동해도 같은 저장 prompt를 읽는다. 일반 프로젝트는 기존 SlideContentEditor 유지.
2. 스타일: border 1px `--kpc-line`, radius14, margin-top10, white, paper padding `12px 52px 12px 16px`, min-height48, max-height180, overflow-y:auto, font13/line-height1.7; list margin2px 0/padding-left18. 큰 제목/항목별 소제목 여백 없음. 오른쪽 아래 원형30px 화살표, right/bottom10px, title/aria-label `슬라이드에 반영`. 상단 코멘트 추가는 상태 선택 바로 왼쪽, 섹션 제목16px/700 유지.
3. p/ul/li DOM을 textContent/createElement로 구성한다. 원시 innerHTML 저장/삽입 금지. paste는 plain text와 줄바꿈을 정규화하고 script/style/URL을 실행하지 않는다. intro와 bullets를 구분하는 data 속성을 사용하며 빈 줄을 빈 항목으로 무한 증식시키지 않는다.
4. draft는 project/round/section 단위, 최초 수정의 revision을 고정한다. 같은 섹션 다른 장 선택도 기존 runtime.navigate/DraftProtection을 거쳐 save/discard/cancel 처리한다. 조합 입력 중 DOM 재작성/저장/이동 금지, compositionend 후 반영한다. Ctrl/Cmd+S와 화살표가 동일 저장 함수를 호출한다. 입력만으로 저장되었다고 표시하지 않는다.
5. 저장 operation은 projectId 새 예시인지, section/slide가 존재하고 서로 연결되는지, 현재 writing/담당자/미잠금/expectedRevision/expectedRound를 확인한다. 새 예시 편집 시연은 actor가 실제 배정된 섹션에 한정한다. 미배정 섹션/보관본은 입력과 화살표 disabled(화살표를 숨기지 않음). 일반 프로젝트의 관리자 권한 정책은 바꾸지 않는다.
6. 검증 성공 후 **section.demoPrompt와 선택한 slide.content를 한 mutation으로** 변경한다. slide title 유지, lead=intro. bullet은 첫 `:`로 heading/text를 구분; `:`가 없으면 heading=`핵심 내용 N`, text=전체 bullet. table은 `[heading,text]` rows, 그 외 text블록 `heading\ntext`. 기존 위치별 block ID 재사용, 추가 블록만 newId. 다른 슬라이드/레이아웃/출처/comment IDs는 바꾸지 않는다. intro/bullets 모두 공백이면 VALIDATION. schema 길이 제한 초과도 오류.
7. 성공 시 현재 slide revision/inputRevision와 state revision은 기존 domain 규칙대로 증가, draft baseline 갱신, 필요하면 `슬라이드에 반영했습니다`만 표시한다. 실패/CONFLICT/QUOTA는 입력을 보관하고 오류를 표시한다. 선택/프로젝트가 바뀐 뒤 도착한 응답으로 다른 화면을 갱신하지 않는다.
8. 원본 HTML은 입력 시 섹션 첫 장의 `d`를 지우는 부작용이 있다. 선택한 장에 명시적으로 반영하는 위 방식으로 고정하여 다른 장을 뜻밖에 덮어쓰지 않는다. 이것은 저장 안전성을 지키는 앱 동작 차이다.

### I03. RFP·참조 자료 카드와 원문 시연

- Related Files:
  - `lib/workspace/production/manufacturing-sources.ts` :: 시연 출처 계산 — new.
  - `lib/workspace/production/presentation.ts` :: ProductionSourceCard — modify.
  - `components/workspace/production/SourcePanel.tsx` :: 새 카드/모달 분기 — modify.
  - `components/workspace/production/ManufacturingSourceDialog.tsx` :: 원문 시연 — new.

#### Details

```typescript
export interface ManufacturingDemoSource {
  id: string; kind: "rfp" | "file"; targetId: string;
  title: string; page: number; location: string; quote: string;
  boxIndex: number | null;
}
export function selectManufacturingSources(view: ProjectView, slide: ProposalSlide): ManufacturingDemoSource[];
// ProductionSourceCard 선택 필드 추가:
// location?: string; boxIndex?: number; demoSource?: ManufacturingDemoSource;
```

- new project + 알려진 demoSourceKey만 fixture 참조. 일반 프로젝트/missing key는 기존 selectProductionSources 그대로 사용한다. 새 예시의 reference card는 실제 FileResourceView로 위조하지 않고 demoSource로 여는 경로를 쓴다.
- RFP 카드: 같은 section에 대응하는 2 requirements, id/page/title/quote를 state의 저장값에서 읽는다. `RFP` badge, `p.N`, 다음 줄 `요구사항ID · 제목`, blockquote. 카드 클릭/Enter/Space로 RFP 원문 시연 모달(폭880px, 높이84vh, 화면폭 제한)을 열고 해당 요구사항과 페이지를 mark/highlight 후 중앙으로 스크롤한다. 현재 snapshot일 때 그 snapshot body 기준.
- 참조 자료: 초기 fixture의 slide.items 3개에 대응. sections 순서 si=0..5, item index i=0..2. 파일은 `[mfgf1,mfgf2,mfgf3,mfgf4][(si+i)%4]`. page=`3+((si*7+i*5)%38)`. location은 `[2장 1절,표 3-2,3장 4절 본문,부록 A,1장 개요,그림 2-1 설명,4장 2절,표 5-1][(si+i*3)%8]`. boxIndex=i, 카드에 01/02/03 표시.
- quote는 원본 srcOf/slidePts대로 `… ${heading+' · '+text} — 관련 기준과 사례를 정리하면, 공공 부문 적용 시 단계별 검증과 운영 체계가 함께 마련되어야 한다 …`. 카드명은 `MFG_DEMO_FILES`의 파일명, 두번째 줄 `p.N · 위치`. 원본과 같은 출처 개수 2+3, 제목 `출처`, 보조 `Slide N · 섹션번호 제목`.
- 파일 모달 폭960px/높이84vh, filename/회차/분류/참조 우선순위/작성자/날짜/크기 메타, 본문과 닫기/원본 다운로드 동작을 제공한다. `시연용 내용 · 실제 파일 미연동`을 원본처럼 명시한다. 미제공 파일을 fetch하거나 가짜 PDF를 내려받지 않는다. 다운로드 클릭은 시연임을 알리는 메시지만 제공한다.
- 모달 본문은 해당 파일을 참조하는 제조업 slide 항목/RFP requirements로 구성한다. 원본의 generic 행정업무 fallback 내용을 실제 제조업 원문으로 주장하지 않는다. 파일별 주제: mfgf1 요구사항 상세12건, mfgf2 KS X9101 데이터 모델/표준화, mfgf3 참여기업 공정 현황/A·B·C사, mfgf4 제조 실증/측정/성과. 기존 실제 자료는 기존 FilePreviewDialog로 연다.
- scope key는 project/round/snapshot/slide. 변경 시 열린 시연 모달 정리, Escape/닫기 후 클릭 카드로 포커스 복귀, 댓글 생성 모드 중단. 보관본에서는 열람만 허용한다.

## Acceptance Criteria

- [x] 상태 선택 후 일반 성공 텍스트가 나오지 않고 실제 상태/통계가 바뀐다. 오류는 사라지지 않는다.
- [x] 46장/담당15장/2..47 번호가 세 패널에서 일치하며 선택/다중 선택/댓글 버튼 위치 유지.
- [x] 제조업 편집은 intro+bullets와 화살표로 표현되며 IME/미저장 이동/충돌에 입력이 보존된다.
- [x] HTML 원본의 4가지 레이아웃/Navy/footer, responsive16:9 유지. 기존 MOIS 예시 색/문구 보존.
- [x] 각 장에 RFP2+참조3, 파일/위치/인용 카드와 두 종류 모달의 키보드 조작 시연 가능.
- [x] 실제 원본/보관본/일반 프로젝트 연결과 권한 보호 회귀 없음.

## Validation

- `npm run typecheck`.
- `npx eslint components/workspace/production hooks/workspace/use-manufacturing-prompt.ts lib/workspace/production/manufacturing-prompt.ts lib/workspace/production/manufacturing-sources.ts lib/workspace/production/presentation.ts lib/workspace/production/domain.ts lib/workspace/production/schemas.ts types/workspace-production.ts`.
- `git diff --check`.
- stdin의 `node --import tsx -`로 `applyWorkspaceMutation` 성공/타 섹션·readOnly·stale rejection, prompt→content 변환, 46개 source 결과의 2+3건/페이지/자료 선택식을 assert한다. 성공 전후 다른45장·기존 snapshot 불변을 비교한다. 검증 파일을 만들지 않는다.
- 정적 이벤트 검토: IME/guard/save/failure, 전용 렌더 조건, CSS 가변 너비, silent 옵션이 set-section-state에만 적용되는지 기록한다. 브라우저 시각 검증은 미실시로 기록한다.

## Commit Message

```text
feat(production): 제조업 제작 편집과 출처 시연을 HTML에 맞춤

Plan: 2026-11-06-workspace-mfg-html-parity
Phase: P01-header-production
Task: T02-production-demo

- 작성 상태의 불필요한 성공 안내를 제거하고 섹션 본문 편집 연결
- 제조업 슬라이드 배정·레이아웃·RFP와 자료 출처 시연 구현
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 식별자의 한국어 커밋에 포함
