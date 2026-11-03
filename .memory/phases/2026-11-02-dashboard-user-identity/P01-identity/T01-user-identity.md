# T01: 사용자별 이메일·검색·아바타 추가
## Status: done
## 구현 계약
- lib/admin/schemas.ts: DashboardViewSchema.users[].email: AdminUserSchema.shape.email.nullable(), 필수 nullable 필드. DashboardView 타입은 Zod 추론 유지.
- lib/admin/selectors.ts/buildDashboard: 범위 내 최신 snapshot.actorEmail → 삭제되지 않은 범위 내 current.email → null. 사용자별 이름/부서/이메일을 matches로 검색. 전체 집계 및 기존 이력의 조회 범위를 유지.
- components/admin/ui/AdminUserIdentity.tsx: 공통 사용자 셀. AdminUser에서 Pick한 name과 nullable email, optional departmentName. 이름 기반 Fluent Avatar 28px·장식 aria-hidden, 이름/부서/이메일 표시, 긴 텍스트 title, 이메일 없음 대체 문구. Tailwind와 기존 여백 토큰 활용.
- components/admin/dashboard/UserActivityPanel.tsx: 공통 셀 사용, 검색 placeholder를 이름·부서·이메일로 확장. 기존 검색 이벤트·페이지·지표 유지.
- components/admin/audit/AuditTable.tsx: 기존 사용자 셀을 공통 컴포넌트로 교체. 정렬·이메일·이름·전체 행 기능 유지.
- tests/lib/admin/selectors.test.ts 및 tests/components/admin/dashboard-ux.test.ts(로컬): 이메일 검색/표시, 대소문자/공백, 이름/부서 호환, 이력/현재 정보 fallback, 이동·삭제·다른 부서 범위, 검색 초점/페이지 초기화, 빈 결과 확인.
## 수용 기준
- 사용자별 현황에서 아바타·이름·부서·이메일을 확인하고 이메일 부분 검색이 가능하다.
- 존재하지 않는 이메일을 만들어내지 않고 정보 없음 상태를 구분한다.
- 검색 결과는 허용된 부서·기간 범위를 벗어나지 않으며 전체 지표는 사용자 검색으로 바뀌지 않는다.
- 활동 로그 공통 셀 적용 후 기존 기능·10행 조회 및 대시보드 레이아웃 유지.
## 검증
- npm.cmd test -- tests/lib/admin/selectors.test.ts tests/components/admin/dashboard-ux.test.ts tests/components/admin/audit-clean-ui.test.ts --maxWorkers=4
- npm.cmd test -- --maxWorkers=4; npm.cmd run typecheck; npm.cmd run lint; npm.cmd run build; git diff --check.
- 브라우저·수동 UI·E2E·dev server 제외, tests는 로컬만 보관하고 커밋 제외.
## 커밋
feat(dashboard): 사용자 이메일 검색과 공통 아바타 정보 추가

Plan: 2026-11-02-dashboard-user-identity
Phase: P01-identity
Task: T01-user-identity

## 완료 및 검증 결과
- 사용자별 행에 이름 기반 아바타·이름·부서·이메일 표시. 이름·부서·이메일 부분 검색과 기존 10행/페이지 초기화/입력 초점 유지.
- AdminUserIdentity를 대시보드·활동 로그에서 공유한다. 외부 이미지 요청·추가 패키지 없이 기존 Fluent Avatar/공통 토큰 활용.
- Zod 이메일 nullable 계약과 조회 범위 내 이력 우선 처리를 추가. 이력이 없으면 허용된 현재 사용자 정보로 보완하고, 이동/삭제 등으로 확인할 수 없으면 null/이메일 정보 없음. 기존 집계 원장·전체 합계 유지.
- 관련 테스트: 3개 파일 / 29개 통과. 전체: 84개 파일 / 648개 통과.
- 추가 회귀 5개: 최신 범위 내 이메일/검색과 합계 유지, 활동 없는 사용자 및 다른 부서 제외, 이동·삭제 이력/이메일 없음, UI 이메일·아바타/검색·페이지·초점, 이메일 없는 행.
- npm.cmd run typecheck / lint / build 및 git diff --check 통과. 기존 Vite loader 및 baseline-browser-mapping 경고만 확인.
- 브라우저·수동 UI·E2E·dev server 검증은 사용자 정책에 따라 미실시. tests는 로컬 보관, 커밋 제외.
