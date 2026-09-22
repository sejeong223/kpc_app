# Task: T01 Setup and Analysis

## Status: done

## Goal
승인된 project의 01 문서 설정과 02 AI 분석 결과 화면을 구현한다. 사용자는 RFP/참고자료 metadata와 작성 방식을 설정하고, network 호출 없는 mock 분석을 실행한 뒤 출처 page가 연결된 분석 결과를 탐색할 수 있다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5`의 `ProposalSetupView.tsx`, `RfpUploadView.tsx`, `AiAnalysisView.tsx`, `RfpAnalysisRequiredState.tsx`다.
- file upload는 P02와 동일하게 metadata만 다룬다.
- 분석 결과는 fixture를 사용하며 AI API·timer race·random score를 사용하지 않는다.
- 분석 완료 전 02~05 step은 sidebar와 화면 guard 양쪽에서 차단한다.

## Prerequisite Contract
- selected project는 stage `진행`이어야 workspace에 진입할 수 있다.
- `ProposalProject`는 `workflowMode:"requirements"|"qa"|"blank"`와 `analysisStatus`를 가진다.
- reducer는 `add-document`, `remove-document`, `set-workflow-mode`, `set-analysis-status` action을 지원한다.

## Implementation

### I01. Step 01 document setup
- Related Files:
  - `components/proposals/authoring/ProposalSetupView.tsx` :: step 01; new
  - `components/proposals/authoring/ProposalDocumentTable.tsx` :: document metadata list; new
  - `components/proposals/ProposalWorkspace.tsx` :: `workspace/setup` outlet; modify
  - `types/proposals.ts`, `lib/proposals/workspace.ts` :: workflow/document actions; modify
  - `tests/lib/proposals/workspace.test.ts` :: document/workflow state tests; modify

#### Details
- **Signature**:
  ```typescript
  interface ProposalSetupViewProps {
    project: ProposalProject;
    documents: ProposalDocument[];
    dispatch: React.Dispatch<ProposalWorkspaceAction>;
  }
  ```
- breadcrumb `제안 목록 / {project.title} / 01 문서 설정`, project summary strip, analysis status badge를 제공한다.
- writing method card 3개: `요구사항 기반 작성(requirements)`, `Q&A 기반 작성(qa)`, `빈 문서에서 시작(blank)`. 선택은 project state에 저장한다.
- document 영역은 primary RFP와 reference 자료를 구분하며 name/kind/size/page/status/actions를 표시한다.
- metadata upload는 extension/20MB display size를 검증하고 같은 이름 중복을 막는다. 실제 byte upload와 server call은 없다.
- primary RFP가 없으면 분석 시작 button을 disabled하고 안내 문구를 제공한다.
- `RFP 분석 시작`은 status를 `분석 중`으로 바꾸고 동일 화면에 deterministic progress checklist를 표시한다. `분석 결과 생성` mock control이 fixture를 확정해 `분석 완료`로 전환한 뒤 `analysis` step으로 이동한다.

### I02. Step 02 AI analysis result
- Related Files:
  - `components/proposals/authoring/ProposalAnalysisView.tsx` :: accordion result와 source viewer; new
  - `components/proposals/authoring/AnalysisRequiredState.tsx` :: blocked state; new
  - `data/proposals/mock-data.ts` :: 11 analysis fixture와 RFP sample pages; modify
  - `components/proposals/ProposalWorkspace.tsx` :: `workspace/analysis` outlet; modify

#### Details
- **Signature**:
  ```typescript
  interface ProposalAnalysisViewProps {
    project: ProposalProject;
    analysisItems: readonly ProposalAnalysisItem[];
    onNavigate(step: ProposalWorkflowStep): void;
  }
  ```
- 분석 미완료이면 `AnalysisRequiredState`가 step 01 이동 button과 project name을 표시하고 result를 렌더링하지 않는다.
- 완료 화면은 좌측 11개 accordion result, 우측 RFP source viewer 구조다. 최소 항목은 사업 개요, 일정, 예산, 요구 기능, 평가 기준, 제출 조건, 보안, 위험, 경쟁 포인트, win theme, 기대 효과다.
- item은 title/tone, 요약 content, `RFP p.{sourcePage}`와 source quote를 표시한다. source link 클릭 시 viewer page를 해당 page로 전환하고 quote highlight state를 설정한다.
- 모두 펼치기/접기, item copy button, 이전 step/다음 요구사항 button을 제공한다. copy 실패 시 toast error로 안내한다.
- win theme은 red accent, risk는 amber accent, 나머지는 neutral/blue를 사용한다.

## Acceptance Criteria
- [ ] 승인 project에서 문서와 작성 방식을 설정할 수 있다.
- [ ] primary RFP가 없으면 분석을 시작할 수 없다.
- [ ] 분석 전/중/완료 상태가 reducer에 명시적으로 기록된다.
- [ ] 완료 후 11개 분석 결과와 source page/quote가 연동된다.
- [ ] 분석 미완료 상태에서 후속 step content가 노출되지 않는다.
- [ ] 외부 AI SDK/API와 file binary 처리가 없다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — document/workflow/analysis guard 통과
- `npm.cmd run typecheck` — step props/action type error 0
- `npm.cmd run lint -- components/proposals/authoring components/proposals/ProposalWorkspace.tsx types/proposals.ts data/proposals/mock-data.ts lib/proposals/workspace.ts tests/lib/proposals/workspace.test.ts` — error/warning 0
- `rg -n "@google/genai|fetch\(|FileReader|Math\.random" components/proposals/authoring lib/proposals data/proposals` — 외부/비결정적 분석 구현 없음

## Commit Message
```text
feat(proposals): 문서 설정과 AI 분석 목업 추가

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P03-authoring-workflow
Task: T01-setup-and-analysis

- 작성 방식과 RFP 문서 설정 화면 구현
- deterministic 분석 상태와 11개 결과 fixture 연결
- 분석 출처 page와 quote 탐색 UI 추가
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
