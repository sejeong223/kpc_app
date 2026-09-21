# Task: T03 Proposal Editor

## Status: pending

## Goal
원본 editor의 핵심 정보 구조를 유지한 3-pane 제안서 작성 UI를 구현한다. section 선택·본문 저장·상태 변경·출처 연결·comment/version과 deterministic AI 보조를 제공하되 외부 editor/AI dependency 없이 유지 가능한 크기로 제한한다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5/src/components/proposals/EditorView.tsx`와 `SectionReferenceModal.tsx`다.
- 원본 4,916줄 component를 복사하지 않고 navigator/content/assistant/dialog로 분해한다.
- rich-text HTML 대신 controlled textarea를 사용해 XSS와 editor dependency를 피한다.
- “AI 초안/다듬기/확장/축약”은 pure deterministic text transform이며 AI API 호출이 아니다.

## Prerequisite Contract
- selected editor section id는 workspace state에 보관하며 없으면 selected project의 첫 section을 사용한다.
- `ProposalSection.content`, `status`, `assignee`, `reviewer`, `targetCharacters`, `requirementIds`, `updatedAt`을 reducer로 update한다.
- 분석 완료 project만 editor에 진입한다.

## Implementation

### I01. Editor data와 deterministic assistant functions
- Related Files:
  - `types/proposals.ts` :: `ProposalComment`, `ProposalVersion`, `SectionReferenceConfig`; modify
  - `lib/proposals/editor-mocks.ts` :: pure mock transformations/exported helpers; new
  - `tests/lib/proposals/editor-mocks.test.ts` :: deterministic behavior; new

#### Details
- **Types**:
  ```typescript
  export interface ProposalComment {
    id: string;
    sectionId: string;
    author: string;
    text: string;
    createdAt: string;
    resolved: boolean;
  }

  export interface ProposalVersion {
    id: string;
    sectionId: string;
    label: string;
    author: string;
    createdAt: string;
    content: string;
  }

  export interface SectionReferenceConfig {
    sectionId: string;
    libraryItemIds: string[];
    documentIds: string[];
    webSearchEnabled: boolean;
    includeUrls: string[];
  }
  ```
- **Pure functions**:
  ```typescript
  export function generateMockDraft(section: ProposalSection, requirements: ProposalRequirement[]): string;
  export function refineMockText(text: string): string;
  export function expandMockText(text: string): string;
  export function reduceMockText(text: string): string;
  export function countKoreanCharacters(text: string): number;
  ```
- 같은 input은 항상 같은 output을 반환한다. 빈 text refine/expand/reduce는 빈 string을 반환하고 throw하지 않는다.
- HTML tag나 markdown code fence를 주입하지 않고 plain text만 반환한다.

### I02. Three-pane editor UI
- Related Files:
  - `components/proposals/editor/ProposalEditorView.tsx` :: layout/state orchestration; new
  - `components/proposals/editor/ProposalSectionNavigator.tsx` :: left pane; new
  - `components/proposals/editor/ProposalContentEditor.tsx` :: center pane; new
  - `components/proposals/editor/ProposalAssistantPanel.tsx` :: right pane; new
  - `components/proposals/editor/SectionReferenceDialog.tsx` :: reference config; new
  - `components/proposals/ProposalWorkspace.tsx` :: `workspace/editor` outlet; modify

#### Details
- **Primary signature**:
  ```typescript
  interface ProposalEditorViewProps {
    project: ProposalProject;
    sections: ProposalSection[];
    requirements: ProposalRequirement[];
    documents: ProposalDocument[];
    libraryItems: ProposalLibraryItem[];
    selectedSectionId: string | null;
    dispatch: React.Dispatch<ProposalWorkspaceAction>;
    onNavigate(step: ProposalWorkflowStep): void;
  }
  ```
- desktop layout: left 256px section navigator, center min 560px editor, right 320px assistant; 전체 높이는 workspace content에 맞추고 pane별 scroll을 분리한다.
- left pane은 section number/title/status/progress를 표시하고 search, status filter, selected highlight를 제공한다. section click은 selected id를 state에 저장한다.
- center header는 breadcrumb, section title, status select, assignee/reviewer, 저장 상태를 표시한다. textarea는 현재 content를 편집하고 `저장` 시 reducer update + version snapshot을 추가한다.
- character count는 current/target과 progress bar로 표시한다. unsaved local draft가 있을 때 section 이동에는 confirm dialog를 표시한다.
- assistant panel tabs: `AI 작성`, `요구사항`, `출처`, `댓글`, `버전`.
  - AI 작성: 초안 생성, 다듬기, 확장, 축약 결과 preview 후 “본문에 적용”.
  - 요구사항: linked requirement check/status와 source page.
  - 출처: reference dialog 열기, selected document/library chip.
  - 댓글: add/resolve. mock author `정소담`.
  - 버전: 저장 snapshot 목록과 restore confirm.
- `SectionReferenceDialog`는 project document와 library item multi-select, web search mock toggle, URL input validation(`https://`만)을 제공한다.
- AI 결과는 자동으로 본문을 덮지 않고 명시적 apply에서만 local draft를 변경한다.

## Acceptance Criteria
- [ ] section을 선택하면 center editor와 right context가 같은 section으로 전환된다.
- [ ] 저장 전 이동 확인과 저장 후 reducer/version 반영이 동작한다.
- [ ] mock AI 기능은 network 없이 deterministic plain text를 생성한다.
- [ ] 요구사항·출처·댓글·버전 tab을 keyboard로 사용할 수 있다.
- [ ] AI 결과는 사용자가 적용하기 전 본문을 변경하지 않는다.
- [ ] `dangerouslySetInnerHTML`, contentEditable, 외부 editor package를 사용하지 않는다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/editor-mocks.test.ts tests/lib/proposals/workspace.test.ts` — deterministic helper/state 통과
- `npm.cmd run typecheck` — editor pane/type error 0
- `npm.cmd run lint -- components/proposals/editor components/proposals/ProposalWorkspace.tsx lib/proposals/editor-mocks.ts types/proposals.ts tests/lib/proposals/editor-mocks.test.ts` — error/warning 0
- `rg -n "dangerouslySetInnerHTML|contentEditable|@google/genai|fetch\(|Math\.random" components/proposals/editor lib/proposals/editor-mocks.ts` — unsafe/external/non-deterministic 구현 없음
- `$env:AUTH_ENABLED='false'; $env:EMBEDDED_MODE='false'; try { npm.cmd run build } finally { Remove-Item Env:AUTH_ENABLED -ErrorAction SilentlyContinue; Remove-Item Env:EMBEDDED_MODE -ErrorAction SilentlyContinue }` — production build 성공

## Commit Message
```text
feat(proposals): 제안서 작성 에디터 구현

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P03-authoring-workflow
Task: T03-proposal-editor

- section navigator와 본문 editor 3-pane 구성
- deterministic AI 작성 보조와 명시적 적용 흐름 추가
- 출처 댓글 버전 관리 목 UI 연결
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
