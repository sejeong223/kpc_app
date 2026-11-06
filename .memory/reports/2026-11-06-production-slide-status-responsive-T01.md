# T01 실행 결과

Date: 2026-11-06
Status: done

- ProposalSlide.state 및 schemaVersion 3. 엄격 v1/v2 저장 스키마를 보존하고 현재/보관/undo body를 각각 이관한다.
- 슬라이드 완료/해제 명령과 개별 편집/추가/목차 전체 권한 분리. 소목차 상태는 자식 완료 상태 집계로 갱신한다.
- 도메인 및 서비스의 본문/제조업 프롬프트/AI/PPT 반영/자산/일괄 이동·삭제/undo 쓰기 경계를 갱신했다. 새 복제/붙여넣기 장은 작성 중이다.
- 저장본 읽기/미리보기는 잠금 상태에서도 유지하고, 저장 콘텐츠를 바꾸는 경로만 보호한다.

## 검증
- npm.cmd run typecheck: 통과.
- npx.cmd eslint types/workspace-production.ts lib/workspace/production services/workspace: 통과.
- 청사진의 Node stdin 개별 완료/잠금/해제/v2 호환 검증 통과.
- 추가 Node stdin: 형제 불변, 완료 장 save/sources/delete/move/batch/제조업 apply 차단, 작성 중 형제 edit/undo, 복제 writing, replace-content의 형제 불변, state 위조 거부, 소목차 일괄 완료와 개별 해제 집계.
- v1/v2의 현재/보관/undo 별도 변환, v3 재파싱 안정성, 누락된 state 거부, 다른 담당자/오래된 revision/완성 회차 거부.
- 독립 fake-indexeddb + 실제 WorkspaceDatabase/IndexedDbWorkspaceRepository/WorkspaceProductionService로 v2 로드→개별 해제→편집→재로드 및 v3 실제 저장 확인.
- 같은 DB에서 작성 중 형제 AI 제안/적용 성공, 완료 장 AI 거부, 작성 중 장 pin-assets 성공/완료 장 거부 확인.
- 사용자 DB나 원본 HTML을 변경하지 않았고 tests/ 및 브라우저 검증은 실행하지 않았다.

## 주의사항
- 기존 일괄 완료 데이터는 완료 상태로 보존된다. 원래 클릭한 한 장을 추정해 자동 해제하지 않는다.
- 제작 UI는 T02에서 새 명령에 연결한다. T01 종료 시 기존 목차/제작의 소목차 명령도 계속 동작한다.
- canvasReferenceErrors의 입력 타입도 v2/v3 공통 검증을 위해 확장했다. 저장 호환에 필요한 인접 변경이다.
- 요청 범위 밖 추가 변경: 특이사항 없음. 공유 demoPrompt 저장 방식은 유지했다.
