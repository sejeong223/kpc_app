# Task: T01 Library and Settings

## Status: done

## Goal
제안서 main navigation의 자료 라이브러리와 프로젝트 설정 화면을 구현한다. 문서 검색·preview·project import와 팀/템플릿/AI 정책/알림 설정을 mock state로 제공해 원본 제안서 카테고리의 보조 화면을 완성한다.

## Decision Summary
- Reference는 `KPC_AI@8f074e5`의 `ProposalLibrary.tsx`, `EnterpriseDataModal.tsx`, `DocumentPreviewModal.tsx`, `ProposalSettingsView.tsx`다.
- 원본 settings의 운영·비용 관리 전체를 복사하지 않고 proposal UI에 직접 필요한 네 tab으로 제한한다.
- 설정과 import는 현재 browser session state만 바꾸며 storage/API를 사용하지 않는다.

## Prerequisite Contract
- main sidebar의 `library`, `settings` view와 project sidebar의 `프로젝트 설정` link가 존재한다.
- `ProposalLibraryItem[]`, selected project documents, reducer `import-library-item`을 사용한다.

## Implementation

### I01. Proposal resource library
- Related Files:
  - `components/proposals/support/ProposalLibraryView.tsx` :: searchable library; new
  - `components/proposals/support/ProposalLibraryPreviewDialog.tsx` :: content preview; new
  - `components/proposals/support/EnterpriseLibraryDialog.tsx` :: mock enterprise import; new
  - `components/proposals/ProposalWorkspace.tsx` :: library outlet; modify
  - `data/proposals/mock-data.ts` :: enterprise/library fixture; modify

#### Details
- **Signature**:
  ```typescript
  interface ProposalLibraryViewProps {
    items: ProposalLibraryItem[];
    activeProject: ProposalProject | null;
    dispatch: React.Dispatch<ProposalWorkspaceAction>;
  }
  ```
- header는 `제안 자료 라이브러리`, item count, `사내 지식 가져오기` button을 표시한다.
- search는 title/description/tags/department를 대상으로 하고 category chip filter와 sort(`최근 수정`, `사용 횟수`, `이름`)를 제공한다.
- responsive card grid는 title, format badge, category, department, size, updatedAt, tags, use count를 표시한다.
- preview dialog는 summary, key highlight, sample text, metadata를 plain text로 렌더링한다.
- active project가 있을 때만 `프로젝트에 추가` action을 표시한다. confirm 시 item을 `ProposalDocument` metadata로 변환해 project document list에 추가하고 toast를 표시한다.
- enterprise dialog는 folder/category navigation, department/search filter, multi-select, 이미 import된 id disabled state를 제공한다.

### I02. Proposal settings
- Related Files:
  - `components/proposals/support/ProposalSettingsView.tsx` :: settings tabs; new
  - `types/proposals.ts` :: `ProposalMember`, `ProposalTemplate`, `ProposalAiPolicy`, `ProposalNotificationSettings`; modify
  - `data/proposals/mock-data.ts` :: default settings fixtures; modify
  - `components/proposals/ProposalWorkspace.tsx` :: main/project settings outlet; modify

#### Details
- **Types**:
  ```typescript
  export interface ProposalMember {
    id: string;
    name: string;
    department: string;
    role: "PM" | "작성자" | "검토자";
    email: string;
  }
  export interface ProposalAiPolicy {
    modelLabel: string;
    allowWebSearch: boolean;
    requireCitation: boolean;
    maxMonthlyTokens: number;
  }
  export interface ProposalNotificationSettings {
    deadline: boolean;
    comments: boolean;
    reviewRequests: boolean;
    analysisComplete: boolean;
  }
  ```
- tab은 `팀원 및 권한`, `제안 템플릿`, `AI 작성 정책`, `알림` 네 개다.
- team tab은 fixture member add/role change/remove를 제공한다. 자기 자신 mock user는 제거할 수 없다.
- template tab은 card list/default 선택/create/delete mock interaction을 제공하고 default는 항상 정확히 하나다.
- AI policy는 model display select, web search/citation switches, monthly token input을 제공하며 저장 시 local state와 toast만 갱신한다.
- notification tab은 4개 switch와 저장 button을 제공한다.
- 실제 session role이 일반 사용자이면 team role 변경, template 삭제, AI policy 저장을 disabled하고 이유를 설명한다. 개인 알림은 수정 가능하다.

## Acceptance Criteria
- [ ] library search/category/sort와 preview가 fixture에서 동작한다.
- [ ] active project에 library item을 document metadata로 추가할 수 있다.
- [ ] 이미 import한 item은 중복 추가되지 않는다.
- [ ] settings 네 tab과 local save interaction이 동작한다.
- [ ] 관리자/일반 사용자 control 차이가 명확하고 disabled 이유가 제공된다.
- [ ] storage/API/network 호출이 없다.

## Validation
- `npm.cmd run test -- tests/lib/proposals/workspace.test.ts` — library import 중복/state 통과
- `npm.cmd run typecheck` — library/settings types error 0
- `npm.cmd run lint -- components/proposals/support components/proposals/ProposalWorkspace.tsx types/proposals.ts data/proposals/mock-data.ts lib/proposals/workspace.ts tests/lib/proposals/workspace.test.ts` — error/warning 0
- `rg -n "fetch\(|localStorage|sessionStorage|@google/genai" components/proposals/support` — network/persistence/AI dependency 없음

## Commit Message
```text
feat(proposals): 제안 자료실과 설정 화면 추가

Plan: 2026-09-22-proposal-ai-mock-ui
Phase: P04-support-and-quality
Task: T01-library-and-settings

- 검색과 preview가 있는 제안 자료 library 구현
- project 자료 import 목업 연결
- 팀 템플릿 AI 정책 알림 설정 tab 추가
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
