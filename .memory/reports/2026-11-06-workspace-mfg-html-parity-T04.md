# Execution: T04-settings-demo

- npm.cmd run typecheck / 지정 eslint / git diff --check 통과.
- 설정창의 useProjectPermissions/set-grants-batch/저장/미연결 placeholder 검색 결과 없음.
- Node stdin: fresh draft 재생성, 실제 view/state 불변, 권한 key 매핑, PM 기본값, snapshot/일반 사용자 경계, 독립 수신 토글 및 로그 5행 확인.
- 핵심: useState(() => createHeaderSettingsDraft(project, view))로 창마다 복제하고 프로젝트·보관본 key 변경 시 폐기한다.
- 주의: 시연 grant는 HeaderPermissionKey에만 존재하며 실제 ProjectPermission/영속 grant에는 추가하지 않는다.

- 브라우저/CUA/E2E/dev server/스크린샷 검증 미실시(기존 정책). tests/ 생성 없음.
- 범위 밖 발견: 특이사항 없음. 기존 다른 계획의 미커밋 변경을 보존했다.
