# Plan: RFP 등록 화면 디자인·알림 보완

## Goal
이미 구현된 RFP 등록 화면(선행 계획 [2026-11-02-rfp-register](./2026-11-02-rfp-register.md), 커밋 `744d1b3`~`8e9ba36`)을 레퍼런스(`KPC_제안서_UI_v12 8.html` `pageRegister`)의 모양에 맞추고, 레퍼런스의 알림(토스트) 4종을 공통 알림 기능으로 붙인다.
측정 가능한 결과:
- 앱 공통 알림 `useAppToast()`가 생기고, 화면 아래 가운데에 어두운 알림이 약 2.2초 표시된다. 기존 `TokenDialogs` 알림은 그대로다.
- 등록 화면에서 분석 완료·업로드 제한 초과·검토자 지정/해제·등록 성공 때만 알림이 뜬다.
- 드롭존 아래 파일 거절 문구와 등록 성공 `role="status"` 문구가 없어지고, 등록 실패·사용자 정보 없음 문구는 남는다.
- 드롭존·파일 행·AI 칸(노랑)·AI 태그(보라)·칩·검토자 칩·등록 버튼이 레퍼런스 크기·모양을 따르고, 강조색은 파랑(`--kpc-brand`)이다.
- `npm.cmd run typecheck`·`npm.cmd run lint`·`npm.cmd run build` 통과. 브라우저 검증·테스트 파일 작성 제외.

Decisions: [2026-11-02-rfp-register-design-notify](../decisions/2026-11-02-rfp-register-design-notify.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 공통 알림 → 부품 디자인 → 화면 디자인·알림 연결 (단일 Phase) | [P01](../phases/2026-11-02-rfp-register-design-notify/P01-design-notify/phase.md) |

## Out of Scope
- `TokenDialogs`의 기존 Toaster 이전, 관리자 화면 `role="status"` 안내의 알림 전환, 검토 목록 화면, 데이터·저장 로직 변경.
