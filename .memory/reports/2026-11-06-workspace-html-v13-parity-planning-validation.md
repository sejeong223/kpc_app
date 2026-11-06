# Planning validation: HTML v13 공통 헤더·제작 앱 적용

- Date: 2026-11-06 (Asia/Seoul)
- Scope: 계획 문서만 검증. 앱 구현·동작 검증 결과가 아니다.

## Results

| 항목 | 결과 |
| :--- | :--- |
| Plan / Phase / Task 구조 | Plan1 / Phase1 / Task3, 모두 pending, active T01 |
| Task 필수 항목 | Goal/Decision Summary/Implementation/타입/데이터/처리흐름/Acceptance/Validation/한국어 Commit/Progress 포함 |
| 대상 파일 | Related Files의 단일 경로 참조40건 존재 확인, 복수 경로로 나열된 파일은 소스 조사 때 직접 읽거나 검색 |
| Markdown | 코드 fence 균형·대체문자·상대 링크·공백을 정적 확인 |
| current | 새 계획 P01-T01, done0/3. 기존 ignore 유지 |
| 이전 current 보존 | history 사본 SHA256 `1DFBEF5DD82CB1A1D96A41FDC03F1DBFEDC06F8CC4FF26168CC653BF1DA86E69`, 전환 직전 원본과 같음 |
| 외부 HTML 보존 | 전후 SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326` 동일 |
| 변경 범위 | .memory 문서만 작성. 앱/외부 HTML/패키지 변경 없음. 기존 다른 계획 변경 보존 |
| 추가 범위 | 사용자 답변에 따라 알림·활동 로그 및 RFP 원문 연동 제외 |

## Commands and method

- `rg`와 UTF-8 파일 읽기로 실제 앱 라우트·컴포넌트·props·selector·데이터 모델·HTML 최종 함수와 CSS override를 조사했다.
- 파일을 생성하지 않는 `node -` stdin 스크립트로 Task schema·대상 경로·Markdown 상대 링크·코드 fence·current 상태를 확인했다. 초기 검사에서 이 보고서는 생성 예정으로 구분했고, 생성 후 전체 링크를 다시 확인했다.
- `git diff --check`, `git diff --name-only`, `git status --short --untracked-files=all`로 기존 tracked 변경과 새 문서의 범위를 확인했다. 새 미추적 Markdown의 trailing whitespace도 별도 stdin 검사로 확인했다.
- `Get-FileHash -Algorithm SHA256`로 HTML 및 이전 current 사본을 확인했다.
- 기존 HTML 정비의 tracked 문서3개에는 저장소 줄바꿈 설정에 따른 LF→CRLF 경고가 있었으며 이 작업에서 변경하지 않았다. 해당 경고는 구문/공백 오류가 아니다.

## Not performed

앱 typecheck/lint/build는 계획 단계에서 실행하지 않았다. 세 Task에 실행 명령을 기재했으며 코드 구현 후 수행한다. `tests/` 생성·복원, 브라우저/CUA/E2E/dev server/스크린샷 검증은 사용자의 지속 정책으로 제외했다. 실제 UI 시각 일치와 조작 성공을 주장하지 않는다. Git commit/push/배포는 수행하지 않았다.

## Final verification

- 최종 핵심 문서9개/상대 링크13개: 누락0, trailing whitespace0, 대체문자0, 파일끝 newline 정상.
- Task3개의 필수 섹션 및 한국어 커밋 메타데이터, 관련 단일 파일 경로40건 확인 완료.
- `git -c core.safecrlf=false diff --check`: exit0. `git diff --quiet -- app components config hooks lib services types package.json package-lock.json .gitignore`: exit0.
- `git check-ignore .memory/current.md`: ignore 유지. HEAD는 계획 시작 때와 같은 `553519d`이며 계획 커밋 없음.
