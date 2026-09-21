# Task: T04 Review and Export

## Status: pending

## Goal
05 검토 및 완성 화면에서 section 전체 문서, 요구사항 충족률, 작성 진척도, mock fact check를 통합 확인하고 안전한 text download/print preview로 작성 workflow를 마무리한다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5`의 `RequirementsMatrix.tsx`, `FactCheckModal.tsx`, `EditorView` full-document mode다.
- DOCX/PDF 생성 package는 추가하지 않고 mock export는 UTF-8 `.txt` download와 browser print로 제한한다.
- fact check는 명시적 fixture pattern 기반이며 실제 사실 검증이나 AI 결과로 오인되지 않게 “목업 검사” label을 표시한다.

## Prerequisite Contract
- review step은 분석 완료 후 열리며 project의 sections/requirements/documents를 사용한다.
- section 수정이 필요하면 selected section id를 저장하고 editor로 이동할 수 있다.

## Implementation

### I01. Review selector와 fact-check helpers
- Related Files:
  - `lib/proposals/review.ts` :: review summary, fact issue, text export; new
  - `tests/lib/proposals/review.test.ts` :: pure function tests; new
  - `types/proposals.ts` :: `ProposalReviewSummary`, `ProposalFactIssue`; modify

#### Details
- **Signatures**:
  ```typescript
  export interface ProposalReviewSummary {
    totalSections: number;
    completedSections: number;
    totalCharacters: number;
    targetCharacters: number;
    coveredRequirements: number;
    totalRequirements: number;
    completionRate: number;
  }

  export interface ProposalFactIssue {
    id: string;
    sectionId: string;
    severity: "주의" | "확인 필요";
    message: string;
    excerpt: string;
  }

  export function calculateProposalReviewSummary(
    sections: readonly ProposalSection[],
    requirements: readonly ProposalRequirement[],
  ): ProposalReviewSummary;
  export function findMockFactIssues(sections: readonly ProposalSection[]): ProposalFactIssue[];
  export function buildProposalTextExport(project: ProposalProject, sections: readonly ProposalSection[]): string;
  ```
- rate는 0~100으로 clamp하고 0 denominator에서 0을 반환한다.
- mock issue pattern은 `추후 확인`, `TBD`, `000`, 빈 완료 section에 한정한다. arbitrary regex execution이나 HTML parsing은 하지 않는다.
- text export 순서는 section `number`의 locale numeric compare를 사용하고 title/content 사이를 일관된 newline으로 구성한다.

### I02. Consolidated review, fact dialog, preview/export
- Related Files:
  - `components/proposals/review-final/ProposalReviewView.tsx` :: step 05; new
  - `components/proposals/review-final/ProposalFactCheckDialog.tsx` :: issue list; new
  - `components/proposals/review-final/ProposalDocumentPreview.tsx` :: full document preview; new
  - `components/proposals/ProposalWorkspace.tsx` :: `workspace/review` outlet; modify

#### Details
- top summary는 완료 section, 전체 글자 수/목표, 요구사항 충족률, mock issue count를 4개 card로 표시한다.
- 좌측 또는 상단 section index는 number/title/status/character count를 표시하고 click 시 해당 preview section으로 scroll한다.
- document preview는 semantic `article/section/h2/p`로 plain text를 렌더링하고 search query highlight는 React text fragment로 처리한다. `dangerouslySetInnerHTML`은 금지한다.
- requirement matrix는 requirement title/source/status와 mapping section을 표시하고 미반영 row를 red/amber로 강조한다.
- fact dialog는 issue severity/message/excerpt와 “editor에서 열기” action을 제공한다. action은 section 선택 후 editor로 이동한다.
- `텍스트 다운로드`는 `buildProposalTextExport` 결과에 UTF-8 BOM을 붙여 Blob download한다. filename은 project title에서 Windows 금지 문자를 제거한다.
- `인쇄 미리보기`는 print 전용 CSS class를 적용하고 `window.print()`를 호출한다. button/navigation/sidebar는 print에서 숨긴다.
- 모든 export control에 “목업 출력” 설명을 표시하며 실제 제출용 파일이라고 표현하지 않는다.

## Acceptance Criteria
- [ ] section·글자 수·요구사항 completion summary가 state와 일치한다.
- [ ] full document와 requirement matrix에서 누락/미완료 항목을 찾을 수 있다.
- [ ] mock fact issue에서 해당 editor section으로 이동할 수 있다.
- [ ] UTF-8 text download가 section 순서를 유지하고 한국어를 보존한다.
- [ ] print preview에서 app chrome이 숨고 document만 출력된다.
- [ ] unsafe HTML rendering과 실제 AI 사실 검증 표기가 없다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/review.test.ts tests/lib/proposals/editor-mocks.test.ts tests/lib/proposals/workspace.test.ts` — summary/fact/export/state 통과
- `npm.cmd run typecheck` — review/export type error 0
- `npm.cmd run lint -- components/proposals/review-final components/proposals/ProposalWorkspace.tsx lib/proposals/review.ts types/proposals.ts tests/lib/proposals/review.test.ts` — error/warning 0
- `rg -n "dangerouslySetInnerHTML|jspdf|docx|html2canvas|@google/genai" components/proposals/review-final lib/proposals/review.ts package.json` — 금지 구현/dependency 없음

## Commit Message
```text
feat(proposals): 제안서 통합 검토와 목업 출력 추가

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P03-authoring-workflow
Task: T04-review-and-export

- section 전체 문서와 요구사항 matrix 통합
- deterministic fact check와 editor 이동 연결
- UTF-8 text download 및 print preview 구현
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
