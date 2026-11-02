# Plan: RFP 등록 화면 초안

## Goal
`/workspace/register`("RFP 등록")의 빈 자리표시자를 레퍼런스(`KPC_제안서_UI_v12 8.html`의 `pageRegister`) 구조를 따르는 목업 등록 화면으로 교체한다.
측정 가능한 결과:
- 파일 선택/드롭/"샘플 RFP로 체험" → 약 1초 진행 후 사업개요 7개 칸이 샘플값으로 채워지고 "AI 추출 · p.N" 태그가 표시된다.
- 필수 5항목(프로젝트명·발주처·제안 마감일·사업 주요내용·검토자 1명 이상)이 충족될 때만 "등록"이 활성화된다.
- 등록하면 로그인 사용자 네임스페이스로 IndexedDB(`kpc-rfp-register`)에 저장되고 폼이 초기화되며 완료 안내가 표시된다.
- `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build` 통과. `tests/` 폴더·테스트 파일은 만들지 않는다. 브라우저 검증은 [정책](../decisions/2026-10-30-task-validation-policy.md)에 따라 제외.

Decisions: [2026-11-02-rfp-register](../decisions/2026-11-02-rfp-register.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | RFP 등록 도메인·저장소·UI·라우트 연결 (단일 Phase) | [P01](../phases/2026-11-02-rfp-register/P01-rfp-register-ui/phase.md) |

## Out of Scope
- 검토 목록(`pipeline`) 화면, 실제 RFP 파싱/LLM 호출, Cosmos DB·Blob 저장, 완료 제안 재사용, 작성 중 폼 임시 저장, 관리자 대시보드 집계 연동.
