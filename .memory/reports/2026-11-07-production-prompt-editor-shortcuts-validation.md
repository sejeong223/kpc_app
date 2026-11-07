# 제작 통프롬프트·단축키 실행 검증

- 실행: 2026-11-07, mea 자동 순차 실행.
- 공용 버튼 리팩토링 제외. `DadamControls.tsx` 읽기 전용.
- 보호 파일 시작 SHA256: `56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84`.
- tests/·임시 검증 파일·브라우저/CUA/E2E/dev server/스크린샷 없음. 검증은 stdin 및 기존 검사 명령 사용.

## T01

- `npm.cmd run typecheck` 및 SlideNavigator/navigator-shortcuts ESLint 통과.
- 순수 키 해석 검증: Ctrl/Meta 복사·붙여넣기, Delete/Backspace, 수정키·IME 예외, ↑/← 이전 및 ↓/→ 다음 통과.
- 실제 SlideNavigator를 메모리에서 컴파일하고 jsdom/React로 렌더하여 키 이벤트 검증 통과. 미리보기/테마 provider만 stub했다.
- A 활성/B 우클릭→B 복사, A+B 선택/B 우클릭→A+B 삭제, 잠긴 B 포함→삭제 0회, 팝업 ArrowDown→슬라이드 선택 0회, 팝업 paste→section/afterId 정확히 1회, textarea Ctrl+C→슬라이드 복사 0회, 빈 목록 paste→afterId null 통과.
- 메뉴 kbd 문자열 및 separator margin 확인. 실제 브라우저 시각 검증은 미실시.
- 키 해석은 순수 helper, 실제 작업은 동일 action 배열의 disabled/run을 사용한다. 입력창의 복사·삭제를 건드리지 않도록 목록/메뉴 범위를 제한했다.
- 요청 범위 밖 추가 변경: 없음.
