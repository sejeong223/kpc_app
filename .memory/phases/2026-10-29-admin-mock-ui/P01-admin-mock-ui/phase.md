# Phase: P01 관리자 mock UI

## Goal
공통 도메인·저장소·디자인 기반 위에 네 화면과 기존 프로필을 연결하고 역할/부서/비용 이력을 검증한다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | done ✅ | 도메인 계약·권한·비용·예시 데이터 | [T01](./T01-domain-contracts.md) |
| T02 | done ✅ | 범위 검사와 원자적 mock 서비스 | [T02](./T02-mock-service.md) |
| T03 | done ✅ | Tailwind·Query 의존성과 공용 UI | [T03](./T03-design-foundation.md) |
| T04 | done ✅ | 3단계 메뉴·공유 상태·프로필 연결 | [T04](./T04-runtime-and-navigation.md) |
| T05 | done ✅ | 사용자·그룹·역할별 권한 화면 | [T05](./T05-user-permissions.md) |
| T06 | done ✅ | 모델·단가·환율·토큰 승인 화면 | [T06](./T06-model-token-cost.md) |
| T07 | done ✅ | 활동 로그 검색·상세·내보내기 | [T07](./T07-activity-log.md) |
| T08 | done ✅ | 대시보드 4개 탭과 공통 기간 | [T08](./T08-dashboard.md) |
| T09 | in_progress 🔵 | 통합 자동 검증 완료 / 브라우저 검증 대기 | [T09](./T09-integration-validation.md) |

## Progress
- done: 8/9 (active: T09)

## 순서
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09. 모든 Task는 순차 실행한다. 사용자 요청에 따라 변경을 한 번의 통합 커밋으로 기록한다. 브라우저 도구 중단으로 T09는 완료 처리하지 않는다. T03/T04/T08의 화면 검증도 T09에서 추적한다.

## 경계
실제 DB·인증 역할·메일·모델 서비스 연결은 포함하지 않는다. 실행 전 기존 변경을 확인하고, 구현 결과와 검증 증거를 각 Task에 남긴다.


## 최종 검증 기록
- 자동 검증: 36개 파일·328개 테스트, typecheck, lint, build 통과.
- [검증 보고서](../../../reports/2026-10-29-admin-mock-ui-validation.md) / [디자인 컴포넌트 HTML](../../../reports/2026-10-29-admin-design-components.html)
- done은 T01~T08의 구현·자동 검증 단계 기준이며 전체 계획은 실제 브라우저 확인 전까지 in_progress다.
