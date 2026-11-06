# T01 공통 헤더 적용 결과

- Date: 2026-11-06
- Result: 구현·정적 검증 완료

ProjectHeader를 560px 2행 프로젝트 선택 버튼, 내부 역할 배지, 회차 배지와 재작업/완성본/완성/설정 순서로 변경했다. 준비 중 화면도 같은 외곽을 쓴다. pickerItems는 접근 가능한 catalog와 현재 ProjectView만 사용하며 D-day는 한국 날짜 기준으로 계산한다.

`await selectProject(projectId)` 이후 runtime의 실제 projectId가 요청과 같을 때만 선택 완료로 처리한다. 따라서 draft guard 취소를 성공으로 표시하지 않는다. `getHeaderRoundLabel(model)`은 보관본·미완성 이력·완성·재작업을 구분한다. 미완성 이력은 완성본 수에서 제외하고 접힌 목록으로 접근을 유지했다.

FilesWorkspace 자료 개수·한도·진행 막대는 본문 첫 줄로 이동했다. TocWorkspace/SetupWorkspace의 중복 작업 링크와 미사용 WorkspaceLinks를 제거했다. 실제 자료 한도·PPT·권한·회차 저장 코드는 유지했다.

## Validation

- `npm.cmd run typecheck`: 통과.
- 청사진의 변경 파일8개 `npx.cmd eslint ...`: 통과.
- `node --import tsx` stdin에서 실제 getHeaderDeadline을 호출한 날짜 경계7개: 통과(한국 자정, D0/D7/D8, 경과, null, 잘못된 날짜/now).
- `git -c core.safecrlf=false diff --check`: 통과.
- WorkspaceLinks/프로젝트 작업 이동 잔존 없음. ‘현재 자료’는 회차 변경 설명문에만 남으며 헤더 표시가 아니다.
- 권한/선택 취소/보관본/로딩/빈 목록/모바일 wrap 조건 정적 검토 완료.
- 브라우저·시각·마우스 검증은 사용자 정책으로 미실시. tests/ 생성 없음.

## 알아야 할 점

picker 표시 역할과 실제 권한 판정은 분리되어 있다. 다른 프로젝트를 자동 로딩하지 않으므로 선택 전 역할 표시는 catalog에서 확인 가능한 PM/참여자로 제한된다. 댓글 전환은 suspendUi를 사용하며 본문 draft를 삭제하지 않는다.

요청 밖 새 발견사항: 특이사항 없음. 기존 설정 알림/활동 로그 및 RFP 원문 미연결은 사용자 결정대로 유지한다.
