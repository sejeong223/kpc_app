# Current Context

## Active Plan
[관리자 화면과 모델·토큰 통합 관리 mock](./plans/2026-10-29-admin-mock-ui.md)

## Active Phase
[P01 관리자 mock UI](./phases/2026-10-29-admin-mock-ui/P01-admin-mock-ui/phase.md)

## Active Task
[T09-integration-validation](./phases/2026-10-29-admin-mock-ui/P01-admin-mock-ui/T09-integration-validation.md)

## Status
- T01~T08 구현·검증 완료. done: 8/9.
- 사용자 요청에 따라 구현·검증 변경을 한 번의 통합 커밋으로 기록한다. 브라우저 미검증이 남아 전체 완료로 표시하지 않는다.
- [디자인 컴포넌트 HTML](./reports/2026-10-29-admin-design-components.html)과 [검증 보고서](./reports/2026-10-29-admin-mock-ui-validation.md)를 작성했다.
- 전체 자동 검증: 36개 파일·328개 테스트, typecheck, lint, build 통과.

## Next Step (IMPORTANT)
컴퓨터 사용 도구가 다시 허용되는 세션에서 T09 보고서의 6개 뷰포트·키보드·모달·hydration·콘솔 시나리오를 확인한다. 브라우저 호스트 연결 실패 후 Chrome URL 확인 불가로 도구가 중단되어 이번 턴에는 확인하지 못했다. 미검증을 통과로 표시하지 않는다.

## 핵심 경계
- 제작 아래 구분선 위 7개는 전 역할, 아래 7개는 관리자·슈퍼 관리자에게 표시한다.
- 부서 관리자는 자기 부서 조회·토큰 승인/반려, 슈퍼 관리자는 전사 설정·사용자·권한을 관리한다.
- 실제 User/Admin 세션 스키마 및 서버 가드를 보존한다. 3단계는 이번 mock 업무 역할이며 실제 Entra 역할·부서 연동은 후속이다.
- 모델·토큰은 한 메뉴의 models/tokens 두 탭, 대시보드는 4개 탭이다.
- 실제 DB·모델 호출·메일·청구·자동환율 연결은 제외한다.

## Previous Plan
[사용량 상세 분석과 토큰 추가 신청 모달 — 완료](./plans/2026-10-27-token-usage-request-modals.md)

기존 완료 이력과 후속 UI 보정 기록은 [이전 current 보관본](./reports/2026-10-29-current-before-admin-mock-ui.md)에 보존한다. 과거 검증 결과를 이번 관리자 구현의 검증으로 대체하지 않는다.
