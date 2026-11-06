# Planning Validation: HTML v13 헤더·제조업 예시

## 범위

- 검증 대상은 계획 문서의 구조·참조·요구사항 대응이다. 앱 기능 구현이나 typecheck/lint/build 통과 보고서가 아니다.
- 이번 턴은 memory-plan 스킬의 계획 전용 단계다. 앱/외부 HTML 구현 변경과 Git 커밋은 하지 않았다.

## 문서 구조

- Plan1, Decisions1, Phase1, Task5(T01~T05), Sources1, 본 검증보고서1, 이전 current 보관1.
- `.memory/current.md`는 새 P01/T01을 가리킨다. Task 상태는 전부 pending, done0/5.
- 각 Task에 Goal/Decision Summary/Implementation/Signatures & Types에 해당하는 코드 계약/Data & Schema Fields에 해당하는 필드 명세/Execution Flow/Error 처리/Acceptance Criteria/Validation/한국어 Commit Message/Progress가 있다. 구현 상세는 I01~I03에 통합해 기술했다.

## 요구사항 추적

| 사용자 요구 | 작업·완료 기준 |
| :--- | :--- |
| 공통 헤더와 모든 버튼 콘텐츠 | T03 헤더/picker/재작업/완성/완성본/복귀 + T04 설정4탭 |
| 상태 변경 성공 문구 제거·시연 | T02 set-section-state silent/실제 mutation/통계/오류 유지 |
| 제조업 슬라이드 수 | T01 마지막 PAGES.mfg46장 원문 전체 부록, T02 표시번호2..47 |
| 배정받은 슬라이드 | T01 정소담15·이서연23·김민수8, T02 mine/권한 분리 |
| 편집 | T02 intro+bullets/화살표/IME·초안 보호/저장 |
| 출처 | T01 요구사항12·자료4 메타, T02 장별RFP2+참조3·본문 모달 |
| 제조업 편집 본문 교정(확인 답변) | T01/T02 섹션 첫 슬라이드 제조업 내용 사용 |
| 설정은 임시 시연(확인 답변) | T04 닫기 폐기/재개방 초기화/실제 grant 변경 없음 |
| 이전 완성본 보기·PPT 시연 요청 유지 | T05 예시1차46장+현재2차, 재완성 시 해당내용PPT |
| 기존 부서·마감일·프로젝트 보존 | T01 별도ID/metadata유지, T05 기존6장/일반프로젝트 보존 |

## 원본 대조

- HTML SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326` 확인.
- JSON 대입5개를 정적으로 추출. 46장=8+8+8+8+7+7,6섹션,4 chapters,4참조자료,12요구사항.
- T01 부록에 리터럴 전체를 넣어 이후 작업자가 42장/6장 예시와 혼동하지 않게 했다.
- 헤더/설정 최종 함수 및 CSS의 치수·문구·이벤트를 sources 보고서에 보관했다. 원본 스크립트는 실행하지 않았다.

## 정합성 및 보존 검토

- 새 예시와 기존예시 ID 분리, 일반 프로젝트/기존 보관본 덮어쓰기 금지 명시.
- 도메인의 acknowledged/revision/fileRevision/쓰기권한을 UI 단순화를 이유로 제거하지 않음.
- 설정 UI의 grant와 실제 ProjectPermission을 분리하여 이름이 비슷한 권한 키가 실제 권한 확대로 이어지지 않게 명세.
- PPT와 해당snapshot의 ID/round/inputRevision 연결 및 트랜잭션 보장 명세. 현재 작업 내용을 예전완성본 PPT로 내려받는 문제 방지.
- 일반 프로젝트 원문 연결은 유지, 제조업 모달만 시연 메타 사용. 존재하지 않는 파일을 실제 원본으로 주장하지 않음.
- 기존 다른 계획의 미커밋/미추적 변경, current ignore, 외부 HTML 원본 유지.

## 검증 한계

- 브라우저/CUA/E2E/dev server/스크린샷은 이전 사용자 정책상 제외다. 따라서 구현 후에도 정적 코드 대조를 픽셀 단위 일치 검증으로 표현하면 안 된다.
- 현재는 코드가 작성되지 않았으므로 새 generator/seed/editor의 실행 검증은 아직 하지 않았다. 청사진의 typecheck/lint/build 및 stdin 불변식 검증은 후속 실행 단계의 완료 조건이다.
- 이번 턴의 질문2개는 모두 답변을 받았다. 추가 외부 연동/발송/프로비저닝을 암묵적으로 포함하지 않았다.

## Validation Result

- 링크·Task 구조·T01 원문 JSON 동등성·파일 변경 범위 검사는 문서 작성 후 수행하여 아래 기계 검증 결과를 추가한다.

### 기계 검증 완료

- 문서 12개 읽기 및 상대 Markdown 링크 23개 대상 존재 확인. history는 이전 current 원문이므로 링크를 원래 .memory 위치 기준으로 검증했다.
- Task5개 필수 구조/pending/Plan·Phase/검증 커맨드 확인.
- T01에 수록한 JSON5개와 원본 마지막 대입 deepEqual 통과.
- current가 새 P01/T01 및 done0/5를 가리키는지 확인.
- tracked dirty 경로가 모두 .memory/ 안인 것 확인.
- 마지막 검토: Task 내 실행 가능한 stdin 예시 2개의 JavaScript 문법 확인(앱 코드는 실행하지 않음), 공백/불필요한 다른 언어 문구 검사 통과.
- git status의 tracked/untracked 변경이 모두 .memory/ 경로인 것과 current ignore 확인. 기존 nullable snapshotId PPT 호환 조건 추가.
