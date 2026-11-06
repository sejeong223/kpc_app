# Execution: T02-production-demo

- npm.cmd run typecheck / 지정 npx.cmd eslint / git diff --check 통과.
- 46장 모두 RFP2+참조3, 페이지식·파일명·2..47 번호·담당15장 검증.
- apply-manufacturing-prompt의 원자 변경/다른45장 불변/타섹션·권한·완성회차·stale 거절/표·fallback 검증 통과.
- 핵심: contentChanged([owner.id])와 section.demoPrompt/현재 slide.content를 같은 mutation으로 갱신한다.
- IME 중에는 저장·이동만 막고 contentEditable은 유지하도록 구성했다. 입력은 HTML이 아닌 textContent로 읽는다.
- 주의: 제조업 출처 파일은 제공된 바이너리가 없으므로 로컬 예시 모달이며 실제 다운로드를 가장하지 않는다.

- 브라우저/CUA/E2E/dev server/스크린샷 검증 미실시(기존 정책). tests/ 생성 없음.
- 범위 밖 발견: 특이사항 없음. 기존 다른 계획의 미커밋 변경을 보존했다.
