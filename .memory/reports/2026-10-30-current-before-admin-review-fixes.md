# Current Context

## Active Plan
[Skill·Template 관리자 UI와 실제 PPT 적용 테스트](./plans/2026-10-30-skill-template-ui.md)

## Active Phase
[P01 Skill·Template 관리자 UI](./phases/2026-10-30-skill-template-ui/P01-skill-template-ui/phase.md)

## Active Task
없음 — T01~T10 완료 ([마지막 Task](./phases/2026-10-30-skill-template-ui/P01-skill-template-ui/T10-integration-guide.md))

## Status
- T01~T10 구현·검증 완료. done: 10/10.
- 모든 Task를 검증한 이번 범위만 단일 커밋한다. 중간 커밋/push 없음.

## Next Step (IMPORTANT)
현재 계획에 남은 Active Task는 없다. 후속 요청 전까지 새 기능/기존 관리자 T09를 자동 실행하지 않는다.

- [검증 기록](./reports/2026-10-30-skill-template-validation.md)
- [디자인 컴포넌트 HTML](./reports/2026-10-30-skill-template-design-components.html)

## 핵심 경계
- Skill·Template은 관리자 전용 별도 메뉴다. 적용 테스트는 관리자 메뉴 안에 제공하고 제작 설정·제작 연결은 후속이다.
- 슈퍼 관리자는 전사, 부서 관리자는 자기 부서 자산을 관리한다. 다른 부서 공개 자산은 조회·적용·권한 있는 복제만 가능하다.
- 작업은 적용 당시 버전과 결과를 유지하며, 명시적인 최신 재적용만 새 설정을 반영한다.
- 비활성/삭제는 새 선택을 막고 기존 작업은 유지한다. 현재 권한 회수는 기존 작업 적용·다운로드도 차단한다.
- 공유 디자인 편집은 현재 PPT 작업에만 반영한다. 전역 브랜드 색상 변경·새 로고 삽입은 사용자 선택으로 후속에 남겼다.
- 관리 데이터는 mock, PPTX/POTX 분석·변환은 실제다. 메뉴 이동 동안 유지하고 새로고침하면 초기화한다.
- 실제 인증 User/Admin 가드를 유지하며 3단계 업무 역할은 mock이다. Cosmos/Blob/AI/RAG/LLM/리소스 프로비저닝은 제외한다.
- 기존 package-lock.json의 libc 삭제 변경을 보존하고 이번 변경과 구분한다.

## Previous Plan — 미완료 항목 보존
[관리자 mock UI](./plans/2026-10-29-admin-mock-ui.md)는 T01~T08 done, [T09 브라우저 검증](./phases/2026-10-29-admin-mock-ui/P01-admin-mock-ui/T09-integration-validation.md)은 미완료다. 새 계획 시작을 기존 검증 완료로 표시하지 않는다.

- [이전 current 원문 보관본](./reports/2026-10-30-current-before-skill-template-ui.md)
- [이번 계획 조사 기록](./reports/2026-10-30-skill-template-plan-notes.md)
- [확정 설계](./decisions/2026-10-30-skill-template-ui.md)
