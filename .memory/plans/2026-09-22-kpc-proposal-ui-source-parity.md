# Plan: KPC Proposal UI Source Parity

## Goal
`C:\Users\김세정\Documents\GitHub\KPC_AI`의 `main` commit `8f074e51f7a16db063ef5206e6ac927c6e87c2a4`를 유일한 source of truth로 삼아 Header, Proposal Sidebar, 제안서 AI의 화면·문구·fixture·상태 전이·상호작용을 현재 Next.js 애플리케이션에 동일하게 이식한다. Knowledge AI, AI Worker, Custom AI, AI Agent, AI Community, Reports, Admin Console의 내용 화면은 구현하지 않으며, 이식과 동시에 `daruda_app`의 route group·layout·기능별 component·hook 구조를 적용한다.

## Source Of Truth Contract
- 원본은 Vite SPA이며 `src/main.tsx`가 `src/App.tsx` 하나만 mount한다. 별도 `/proposal` route나 구버전 proposal composition은 없다.
- Header 기준: `src/components/common/Header.tsx`.
- Proposal navigation 기준: `src/components/proposals/ProposalNav.tsx`.
- Proposal content 기준: `src/App.tsx`에서 `activeGnb === 'proposals'`일 때 실제 render되는 component와 그 dependency.
- Data/type 기준: `src/types.ts`, `src/data/mockData.ts`, `src/data/pwinData.ts`, `src/data/rfpDocumentPages.ts`, component-local constants.
- 원본에 import만 있고 render되지 않는 `OpportunitySearch`, `RfpDetail`, `RfpUploadView`, `ProposalProjectsList` UI는 제외한다. 단, `RfpUploadView`가 export하는 file fixture/type은 별도 data/type module로 정확히 이관한다.
- 원본 JSX, Tailwind className, 표시 문구, 아이콘, 수치, 정렬, 기본 선택값, modal 크기와 interaction을 임의로 축약·재설계하지 않는다.

## Target Structure
```text
app/
  (authenticated)/
    layout.tsx
    page.tsx
    admin/
    proposals/page.tsx
  api/
  auth/
components/
  common/Toast.tsx
  layout/AppHeader.tsx
  proposals/
    ProposalWorkspace.tsx
    navigation/ProposalSidebar.tsx
    pipeline/
    review/
    authoring/
    editor/
    support/
  ui/
hooks/proposals/useProposalWorkspace.ts
data/proposals/
lib/proposals/
types/proposals.ts
tests/
  lib/proposals/
  visual/proposals/
```

## Adaptation Rules
- Vite import만 `@/` alias와 Next.js client boundary로 바꾼다. DOM 구조와 className은 원본을 보존한다.
- Header의 다른 GNB 항목은 원본과 동일하게 표시하되 내용 화면은 만들지 않는다. `/proposals`에서는 제안서 AI가 active이며 다른 항목 클릭은 권한·route를 변경하지 않는 안내 toast로 제한한다.
- Header identity는 원본 배치를 유지하되 이름·사진·role은 기존 NextAuth session을 source로 사용한다. 원본의 role switch는 시각적 mock일 뿐 서버 권한을 상승시키지 못한다.
- 실제 API, Google AI, binary upload, persistence는 추가하지 않는다. 원본 timer/file/download/clipboard 동작은 동일한 client mock으로 유지한다.
- desktop source parity가 우선이다. 원본에 없는 mobile 재설계는 하지 않고 좁은 viewport에서는 원본 레이아웃의 overflow 동작을 보존한다.
- `components/ui`는 기존 화면에 필요한 primitive만 유지하며 원본 markup을 shadcn component로 임의 치환하지 않는다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 원본 parity 기준, domain fixture/state, route와 Header 기반 구축 | [P01](../phases/2026-09-22-kpc-proposal-ui-source-parity/P01-parity-foundation/phase.md) |
| P02 | `pending` | Proposal Sidebar, pipeline, 등록·검토 화면 동일 이식 | [P02](../phases/2026-09-22-kpc-proposal-ui-source-parity/P02-pipeline-and-review/phase.md) |
| P03 | `pending` | 작성 설정부터 editor와 최종 검토까지 원본 workflow 이식 | [P03](../phases/2026-09-22-kpc-proposal-ui-source-parity/P03-authoring-workflow/phase.md) |
| P04 | `pending` | 자료실·설정 이식, legacy 제거, 전체 screenshot parity 검증 | [P04](../phases/2026-09-22-kpc-proposal-ui-source-parity/P04-support-and-parity/phase.md) |

## Definition Of Done
- 1440x900과 1920x1080에서 원본과 target의 Header, Sidebar, 모든 도달 가능한 Proposal 화면 screenshot이 허용 오차 내에서 일치한다.
- 원본의 프로젝트 수·문구·department·P/Win·날짜·기본 선택값과 각 화면의 modal/dropdown/tab 상태가 일치한다.
- pipeline → 검토 → 승인 → 작성 설정 → 분석 → 체크리스트 → editor → 검토 흐름이 원본과 동일하다.
- 다른 GNB 카테고리의 content component나 `@google/genai`, `motion` dependency를 추가하지 않는다.
- 최종 tree는 `daruda_app`처럼 route group, layout, domain component, hook, data, lib, types 책임이 분리되고 현재 축약 UI와 fixture가 남지 않는다.
- 기존 auth, admin guard, popup, proxy test와 전체 test/typecheck/lint/build가 통과한다.