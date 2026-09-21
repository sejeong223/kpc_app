# Plan: Proposal AI Mock UI

## Goal
`sejeong223/KPC_AI`의 `main` 커밋 `8f074e51f7a16db063ef5206e6ac927c6e87c2a4`를 기준으로 KPC 전역 header, 제안서 전용 sidebar, 제안 목록·검토·5단계 작성·자료실·설정 UI를 현재 Next.js 16 애플리케이션에 동작 가능한 목 UI로 구현한다. 완료 시 `/proposals`에서 새로고침 전까지 유지되는 client-side mock state로 핵심 화면을 이동하고 조작할 수 있으며, 기존 인증·관리자 접근 제어와 로그인 화면은 그대로 유지된다.

## Reference Baseline
- Repository: `https://github.com/sejeong223/KPC_AI.git`
- Commit: `8f074e51f7a16db063ef5206e6ac927c6e87c2a4`
- Primary references: `src/components/common/Header.tsx`, `src/components/proposals/*`, `src/data/mockData.ts`, `src/data/pwinData.ts`, `src/types.ts`
- Visual language: KPC red `#E60012`, white fixed 56px header, neutral gray workspace, contextual left navigation, compact enterprise dashboard typography.

## Scope
- React 19, Next.js App Router, Tailwind CSS 4, existing `lucide-react`, shadcn primitives, `sonner`를 재사용한다.
- 실제 파일 업로드, AI 분석, 데이터 영속화, 서버 API 호출은 구현하지 않고 deterministic mock interaction으로 표현한다.
- 원본의 거대한 단일 `App.tsx`와 4,000줄 이상 editor를 그대로 복사하지 않고 route·domain state·작은 UI component로 분리한다.
- 인증이 활성화된 환경에서는 기존 proxy가 `/proposals`를 보호하고, 관리자 기능은 현재 session role을 따른다.
- 원본 저장소나 현재 로그인·Azure service 구현은 변경하지 않는다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 제안서 mock domain state와 KPC header/sidebar shell 구축 | [P01](../phases/2026-09-22-proposal-ai-mock-ui/P01-foundation-and-shell/phase.md) |
| P02 | `pending` | 제안 pipeline, 신규 등록, 관리자 검토 흐름 구현 | [P02](../phases/2026-09-22-proposal-ai-mock-ui/P02-pipeline-and-review/phase.md) |
| P03 | `pending` | 5단계 제안서 작성 workflow와 editor/review 구현 | [P03](../phases/2026-09-22-proposal-ai-mock-ui/P03-authoring-workflow/phase.md) |
| P04 | `pending` | 자료실·설정, 반응형·접근성, 회귀 검증과 문서화 | [P04](../phases/2026-09-22-proposal-ai-mock-ui/P04-support-and-quality/phase.md) |

## Definition of Done
- `/proposals`에서 header → proposal sidebar → pipeline → 검토 → 작성 workflow가 끊김 없이 이동한다.
- 원본의 KPC red/neutral 시각 체계와 desktop 정보 밀도를 재현하면서 작은 화면에서도 핵심 작업에 접근할 수 있다.
- 모든 데이터와 AI 결과는 local mock이고 네트워크 요청이나 외부 AI key가 필요하지 않다.
- 기존 auth route, Admin role 노출, callback/popup 보안 동작에 회귀가 없다.
- 제안서 state unit test, config test, lint, typecheck, auth-disabled production build가 통과한다.
