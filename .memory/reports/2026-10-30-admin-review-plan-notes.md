# 관리자 재검증 개선 계획 — 조사 기록

- Date: 2026-10-30
- 수행: 코드·확정 설계·검증 자료 읽기, npm 메타데이터 조회, 공식 문서 확인, 계획 문서 생성 및 문서 연결 검증.
- 미수행: 제품 코드 수정, 패키지 설치, 앱 테스트/빌드, 브라우저·PPT 재검증, 커밋·push·배포.

## 코드에서 확정한 사항
- `TemplateWorkService.run`은 같은 파일 revision 변경에서 selectedSlides 복원이 빠졌다. 원자적 교체/취소 로직은 이미 있어 재작성하지 않는다.
- `useTemplateWork`는 매 progress의 workRevision을 key에 넣고 Workbench가 !data이면 편집기를 제거한다. 현재 actor·권한을 검사하는 동기 snapshot을 initialData로 제공하면 이전 권한 캐시를 재사용하지 않고 화면 수명을 유지할 수 있다.
- 같은 파일인지 구분할 키가 WorkView에 없으므로 현재 entry.fileRefId를 가벼운 조회 필드로 추가한다. 파일 바이트나 원본 ZIP은 Query에 넣지 않는다.
- 옵션 저장의 pending disabled도 포커스 손실 원인이 될 수 있다. 단순 선택값 보존뿐 아니라 같은 컨트롤에 대한 조건부 포커스 복구를 T03 완료 기준으로 둔다.
- `TemplateImportSession`의 cancel/clear와 늦은 결과 discard는 이미 구현되어 있다. 새 업로드 저장소를 만들지 않고 UI 요청 번호/progress와 연결한다.
- 일반 OOXML 요소는 일부 boolean을 1만 참으로 읽고 상위 그룹은 true도 처리한다. 공통 helper로 불일치를 없앤다.
- `AdminTabs`는 overflow 정책이 없으며 공통 사용처가 대시보드/사용자/정책이다. 공통 컨테이너 하나에서 처리한다.
- `AdminAuditEvent.detail`은 command 이름·feature·refs JSON·내보내기 조건까지 담는 원문이다. 별도 저장 스키마 없이 표시용 작업 ID를 파생하면 원문을 보존하면서 집계가 안정된다.
- 기존 Vitest는 node 환경이고 UI 검사는 renderToStaticMarkup 중심이다. 실제 클릭·포커스·폭은 검증하지 못하므로 Playwright 개발 의존성과 E2E를 계획했다. Vitest include(`tests/**/*.test.ts`)와 새 spec(`tests/e2e/*.spec.ts`)을 분리한다.

## 공식 근거
- [TanStack Query initialData](https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data): 완전한 기존 데이터를 캐시에 초기 공급하여 초기 로딩을 피할 수 있다. 캐시에 남는 데이터이므로 현재 권한과 버전이 확인된 WorkView만 공급하도록 설계했다.
- [W3C XML Schema boolean](https://www.w3.org/TR/xmlschema11-2/#boolean): true/false/1/0 표현을 정의한다. helper는 누락/비정상 입력에 기존 기본값을 사용하며 원본 XML을 일괄 수정하지 않는다.
- [Playwright webServer](https://playwright.dev/docs/test-webserver), [configuration](https://playwright.dev/docs/test-configuration): 독립 서버 실행과 테스트 환경·브라우저 설정. AUTH_ENABLED=false인 검증 전용 localhost 서버를 명시하며 사용자 서버를 재사용하지 않는다.
- `npm.cmd view @playwright/test version engines --json` 결과: version 1.64.1, node >=20. 조회만 했고 설치하지 않았다.

## 기존 변경 보호
- 기준 HEAD: `790835657f82a27871ff5e1ec80632ca115c69c7`.
- 시작 전 변경: 이전 Skill·Template Task 10개에 1행씩 commit 기록 변경, package-lock.json의 libc 30행 삭제, 재검증 보고서/증거 미추적 파일.
- package-lock.json SHA256: `27A7E23289F8FD29F29A8905C2DB7B9700FD14C949F4B492BF7A3987D903256C`.
- 기존 current는 `2026-10-30-current-before-admin-review-fixes.md`로 보관한 뒤 새 계획 T01을 가리킨다.
- 이미 완료한 Skill·Template 10개 Task와 기존 관리자 T09 미완료 상태는 변경하지 않는다.

## 계획 검증
- 모든 Task에 Related Files/정확한 계약/상태 전이/경합 및 예외/Acceptance Criteria/Validation/Commit Message/Progress를 포함한다.
- 새 계획→phase→7개 Task→current 링크와 대상 경로를 검증한다. 새 파일로 예정한 경로의 미존재는 정상이다.
- 문서 검증 실행 결과: 활성 포인터·결정·계획·phase·7개 Task·조사·후속 문서 13개에서 로컬 링크 오류 0건, Task 필수 항목 누락 0건, Task 7개 모두 pending. package-lock SHA256 동일, `git diff --check` 통과.
- 완료된 이전 구현의 테스트 결과를 새 수정의 통과 결과로 기록하지 않는다.
