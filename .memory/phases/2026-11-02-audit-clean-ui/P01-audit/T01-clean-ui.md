# T01: 활동 로그 화면 정리
## Status: done
## 구현 계약
- components/admin/audit/AuditPage.tsx: 하나의 AdminCard에서 필터·건수·목록·페이지를 구성, 접근 조회 로딩/오류 및 재조회 오류를 정확히 표시.
- AuditSummaryFilter.tsx: counts?:Pick<AuditList,"successCount"|"failureCount">, value:AuditQuery["outcome"], onChange. SegmentedControl 재사용.
- AuditFilters.tsx: compact 날짜와 우측 CSV, 검색/액션/리소스/초기화 행. summary:ReactNode 슬롯, onExport(query:AuditQuery)로 최신 검색 초안 포함. 250ms 검색, 초기화 시 날짜 오류 해제.
- AuditTable.tsx: 7열 정보 위계. 액션/리소스 정렬 ID 유지, 시간·이메일·긴 대상 표시 정리.
- AuditOutcomeBadge.tsx: outcome:AdminAuditEvent["outcome"], 아이콘+색+텍스트로 결과 표시. 표와 상세 공유.
- AuditDetail.tsx: 기존 모든 원본 필드 및 목록에서 축약한 정보를 두 그룹에 보존, 실패 사유 강조.
- components/admin/ui/AdminTable.tsx: 상세 펼침 버튼을 chevron으로 통일하고 펼친 원본 행 강조. 키보드 버튼/aria-expanded/aria-controls 계약 유지.
- 데이터 스키마·서비스·권한 변경 없음. Tailwind 공통 토큰과 기존 DADAM/Fluent 부품 재사용, 새 의존성 없음.
## 수용 기준
- 큰 KPI/중첩 날짜 카드/중복 결과 선택이 사라지고 상단 두 행에 필터가 정돈된다.
- 10행/정렬/검색/결과 선택/전체 CSV/상세 열기/권한 범위를 유지한다.
- 상세에서 대상 ID·이메일·원문·요청/사용량 ID·접속 정보를 확인할 수 있다.
- 검색 중 초점 유지, 검색 직후 CSV 조건 정확성, 실패/빈 상태/초기화 복구를 검증한다.
## 검증
- 실제 mock 기반 jsdom 통합 테스트: 결과/검색/기간/정렬/페이지, 상세 정보·실패 사유, CSV 최신 초안, 날짜 초기화, 권한 및 오류 복구.
- npm.cmd test -- --maxWorkers=4, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- 브라우저·수동 UI·E2E·스크린샷 제외. 테스트 로컬 보관, CSS 값을 복제하는 테스트 없음.
## 커밋
feat(ui): 활동 로그 필터와 목록을 공통 컴포넌트로 정리

Plan: 2026-11-02-audit-clean-ui
Phase: P01-audit
Task: T01-clean-ui

## 구현 결과
- 기존 3개 KPI 카드·로그 조회 카드·활동 내역 카드를 하나의 목록 카드로 정리했다. 첫 행은 결과별 건수 칩과 compact 날짜·CSV, 두 번째 행은 사용자/대상 검색·액션/리소스·초기화다.
- AuditSummaryFilter는 공통 SegmentedControl을 사용하고 AuditOutcomeBadge는 표/상세의 아이콘·색·텍스트를 통일한다. 배치/입력/페이지는 WorkspaceActionRow·WorkspaceCardSection·DADAM·AdminPager를 재사용한다.
- 표를 10열에서 7열로 줄였다. 날짜/24시간 시각, 중립 아바타/이름/이메일, 작업/액션, 대상/리소스, 결과, 토큰을 정리했다. 긴 문자열은 목록에서 축약하고 상세에서 전체 값을 보인다.
- 상세 펼침은 공통 AdminTable의 chevron 버튼과 선택 행 강조를 사용한다. 기존 aria-expanded/controls 연결을 유지한다.
- 상세는 이벤트 정보/사용자·접속 정보 2그룹으로 구성하고 실패 사유를 상단에 강조한다. 대상/요청/사용량/행위자 ID, 원문, 이메일, 전체 대상명, IP/브라우저, 정확한 시각을 보존한다.
- 입력 직후 CSV에는 대기 중인 검색 초안까지 적용한다. 기존 CSV 전체 결과·원본 필드·서비스 검증은 그대로 유지한다. 초기화는 잘못된 날짜 초안과 오류도 제거한다.
- 연속 필터 테스트에서 조회 중 액션 선택지가 일시적으로 사라지는 문제를 확인했다. 기본 조회의 권한 범위 선택지를 별도로 유지해 조건 조회 중에도 선택지를 제공한다. 최초 동일 조회는 React Query 캐시를 공유한다.
- 접근 정보 로딩을 권한 거부와 구분하고 조회/재조회 실패 복구를 표시한다.

## 검증 결과
- 신규 로컬 통합 테스트 9개: 결과별 건수/페이지, 7열 표와 상세 원본 보존, 실패 사유·모든 정렬 키, 검색 초점/복합 필터, 최신 검색어 전체 CSV, 느린 조회 중 연속 선택, 잘못된 날짜 초기화, 부서 범위·권한 회수, 접근 정보 로딩/조회 실패 재시도.
- npm.cmd test -- --maxWorkers=4: **84개 파일/641개 테스트 통과**.
- npm.cmd run typecheck / npm.cmd run lint / npm.cmd run build 통과.
- 생성 CSS에서 검색 필드 flex:14rem 규칙을 정적으로 확인했다. git diff --check 통과.
- 기존 Vite/baseline-browser-mapping 비차단 경고 유지. 테스트는 로컬 보관하며 커밋하지 않는다.
- 브라우저/수동 UI/스크린샷/E2E 미실시(지속 정책). 실제 모델·Cosmos·서비스 저장 계약 변경 없음.
- 단일 로컬 커밋, 원격 push 없음.
