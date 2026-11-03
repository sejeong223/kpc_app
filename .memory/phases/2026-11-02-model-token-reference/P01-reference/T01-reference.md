# T01: 모델·토큰 관리 기획 요소 구현
## Status: done
## 구현 청사진
- lib/admin/schemas.ts TokenOverviewSchema: monthlyUsedTokens:number, monthlyLimitTokens:number, warningPercents:[number,number], statusCounts:{all,normal,warning,over,paused}:number 추가. 기존 필드 유지.
- lib/admin/selectors.ts selectTokens: 권한 범위 월 집계/부서 비교와 선택 필터 분리, 상태 적용 전 인원 집계, 사용량 내림차순. 과거 부서 사용량 접근 제한 보존.
- components/admin/policy/ModelDefaultsPanel.tsx: 공통 AdminTable의 5개 업무/모델 선택. 기존 저장·충돌 및 단가·환율 유지.
- components/admin/policy/{TokenOverviewPanel,TokenMonthSummary,TokenAccountsTable,TokenPolicyForm,TokenRequestsPanel,ModelTokenPage}.tsx: 월 사용률/경고·정책 편집, 부서 사용량 막대·선택, 검색/부서/상태 인원 필터, 한도 프리셋·직접 입력·저장/+50K/정지/재개, 신청 승인/반려, 공통 10행 페이지 처리, 조회 오류 재시도.
- config/pagination.ts, AdminPager/AdminTable/AdminCard, DADAM 컨트롤/SegmentedControl/AdminPeriodFilter 재사용. 새 패키지 없음.
## 수용 기준
- 기획 HTML 실제 렌더링 요소가 누락 없이 통합 메뉴에서 사용 가능하다.
- 필터가 전사 월 집계나 부서 비교 목록을 축소하지 않는다. 부서 관리자는 본인 부서 데이터/허용 액션만 접근한다.
- 한도/모델/정책 저장, 추가 승인 결과가 mock 서비스와 프로필에 반영되고, 충돌 시 초안을 보존하며 명시적으로 복구할 수 있다.
- 빈 상태, 10행 페이징, 좁은 영역에서 가로 스크롤, 접근 가능한 입력/버튼 레이블을 제공한다.
## 검증
- 로컬 테스트: 집계·필터·권한·비용 불변, 실제 mock 기반 컴포넌트 저장/신청/충돌/페이징.
- npm.cmd test -- --maxWorkers=4
- npm.cmd run typecheck; npm.cmd run lint; npm.cmd run build; git diff --check
- 브라우저/수동 UI/E2E/스크린샷 검증 제외. 테스트는 로컬 보관하며 stage하지 않는다.
## 커밋
feat(admin): 기획 HTML 기반 모델 설정 및 토큰비용관리 완성

Plan: 2026-11-02-model-token-reference
Phase: P01-reference
Task: T01-reference

## 기획 요소 대조 결과
| 기획 HTML 실제 표시 요소 | 구현 |
| --- | --- |
| 업무/기본 AI 모델 5행·업무 수·모델 선택 | ModelDefaultsPanel의 AdminTable·3개 모델 선택·변경 저장 |
| 월 사용량/전사 한도·소진 막대·비율·경고 기준 | TokenMonthSummary; 한도 초과 시 막대 상한, 실제 비율은 그대로 표시 |
| 전사 월 한도·1인 기본 한도·저장하기 | TokenPolicyForm; 실제 mock 저장 및 경고 기준 편집, 기존 개인 한도 미변경 |
| 부서명·사용량·인원·비교 막대·선택 토글 | TokenOverviewPanel; 사용량 내림차순, 선택 부서와 무관하게 모든 허용 부서 유지 |
| 개인 검색·부서 선택·상태별 인원·결과 수 | DADAM Input/Select/SegmentedControl, 정상 상태 및 필터 초기화 추가 |
| 사용자 아바타·이름·직책·부서·사용량/한도·비율·상태 | TokenAccountsTable; 사용량 내림차순, 10행 페이지 |
| 50/100/150/200/300K 및 기존 한도 선택 | 프리셋+직접 입력, 명시적 저장으로 동시 수정 충돌 처리, 성공 알림 |
| +50K·정지/재개 | 기존 서비스 명령 재사용; 권한 없는 액션 미렌더링 |
| 신청 대기 수·아바타·신청자·부서·요청량·사유·승인/반려·완료 상태 | TokenRequestsPanel; 신청일/프로젝트 유지, 10행 페이지, 승인 시 프로필 한도 반영 |
| 빈 목록 | 공통 빈 상태 표시 |

## 추가 보존/개선
- 기존 모델별 입력/출력 단가·환율·기간별 모델 비용 및 사용 당시 비용 스냅샷을 유지했다. 기간 필터는 비용 카드의 compact 컨트롤로 이동했다.
- 월 집계 조회와 필터 조회를 분리해 검색 초점과 정책 초안을 보존한다. 초기 동일 조회는 React Query가 공유한다.
- 월 집계/부서 비교는 사용 이력의 부서 범위로 제한하며, 개인 목록 검색·상태와 독립적이다. 삭제한 사용자의 이미 발생한 비용·사용량은 보존한다.
- 개인 한도 초안이 있으면 +50K/정지로 초안과 버전이 엇갈리지 않도록 처리했다. 충돌 시 초안을 유지하며 ‘최신 값’으로 초기화할 수 있다.
- 실제 렌더링하지 않는 HTML의 org 탭·보안 정책 데이터는 추가하지 않았다. 목업 원본의 자동 선택 반영은 기존 앱의 명시적 저장 방식으로 통합했다.

## 검증 결과
- 새 로컬 테스트 15개: 월 집계/상태/부서 권한/전입 이력/삭제/빈 상태, 5업무 모델 저장·충돌, 개인 10행 페이지/검색 초점/필터/정책 초안, 프리셋/직접 입력/범위 검증/+50K/정지/재개/충돌 복구, 전사 정책 저장, 부서 읽기 권한, 신청 10행 페이지/승인/반려 및 프로필 동기화, 조회 실패 재시도.
- npm.cmd test -- --maxWorkers=4: **83개 파일, 632개 테스트 통과**.
- npm.cmd run typecheck / npm.cmd run lint / npm.cmd run build 통과.
- git diff --check 통과. 기존 Vite 설정 및 baseline-browser-mapping의 비차단 경고는 남아 있다.
- 브라우저·수동 UI·E2E·스크린샷 검증 미실시(지속 정책). 테스트 파일은 로컬 보관하고 커밋하지 않는다.
- 데이터 및 저장은 기존 mock 서비스 기준이며 실제 모델 호출/Cosmos 연결을 추가하지 않았다.
