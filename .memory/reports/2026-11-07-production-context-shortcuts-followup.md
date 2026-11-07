# 제작 안내 문구 제거·단축키 후속 수정

- 사용자 확인: 우클릭 메뉴는 마우스로 동작하지만 단축키는 반응하지 않는다.
- `SlidePromptEditor`의 AI 배치 시연 문구를 제거했다. 읽기 전용/미반영 변경 안내는 필요한 상태에서만 표시하며 정상 상태에서는 빈 안내 줄도 남기지 않는다.
- 키 판별에 `KeyboardEvent.code`를 전달해 한글 입력 상태의 ㅊ/ㅍ도 Ctrl+C/V로 처리한다. IME 조합 중 및 Alt/Shift 조합 제외는 유지한다.
- 포커스가 목록/메뉴에 있어도 문서 내 코멘트 팝업이 존재하면 모든 키를 차단하던 조건을 제거했다. 모달 차단, 실제 입력 요소의 타이핑 보호, 작업 권한 검사는 유지한다.
- 목록 작업 중 썸네일이 disabled로 바뀌면서 포커스가 body로 빠지는 경우, 완료 후 현재 슬라이드로 복귀한다. 입력창/다른 버튼/확인창의 포커스는 가져오지 않는다. 메뉴의 마우스·키보드는 같은 action 실행 경로를 사용한다.

## 검증

- 변경 전 재현: 한글 key=ㅊ/code=KeyC와 열린 코멘트 팝업이 있는 영어 Ctrl+C 모두 서비스 호출 0회, 메뉴 유지. 코멘트 팝업 제거 후 영어 Ctrl+C는 성공.
- 실제 ProductionWorkspace/SlideNavigator/편집기·클립보드 훅/React Query/서비스/domain을 연결한 Node stdin + jsdom 검증 통과. 외부 runtime 선택/이동 및 repository는 메모리 어댑터, 미리보기/패널/툴바/모달 외형은 stub했다. 사용자 IndexedDB는 접근하지 않았다.
- 포커스를 실제 메뉴 항목으로 옮긴 후 한글/영어 Ctrl+C/V와 Delete를 전달해 검증했다. 코멘트 팝업 존재, 메뉴에서 복사 후 목록에서 즉시 붙여넣기, 삭제 확인·취소, 마우스 추가, 권한 없는 삭제 차단을 확인했다.
- 썸네일 disabled 시 blur를 발생시켜 비동기 작업 후 현재 목록 항목으로 포커스가 복귀하는지 확인했다. 조합 중 입력/textarea Ctrl+C/모달 뒤 키 입력은 작업을 호출하지 않았다.
- 마우스 복사·붙여넣기·삭제 확인·추가 및 미저장 입력 폐기/이동 보호 검증 통과.
- typecheck 및 변경 파일 ESLint 통과. 브라우저 직접 조작/시각 검증 미실시. 테스트 폴더·임시 검증 파일·dev server 생성 없음.
- 공용 버튼 리팩토링 및 DadamControls.tsx 변경 없음. 이전 줄글 프롬프트 수정도 보존했다.

## 공통 성공 문구 제거 후속 수정

- 사용자 보고: 제작 화면 상단에 `변경을 반영했습니다.`가 다시 표시됨.
- 원인: 상태 변경은 silent 처리됐으나 ProductionWorkspace.applyReceipt의 기본 성공 문구가 추가·붙여넣기·삭제 경로에 남아 있었다.
- 기본 문구를 제거하고 별도 알림이 없으면 notice를 null로 초기화한다. 복사 유효 시간 안내, 실제 receipt 알림 및 오류 처리는 유지한다.
- 기존 Node stdin + jsdom 통합 검증에서 추가·붙여넣기·삭제 후 해당 문구가 없고 복사 안내는 유지되는 것을 확인했다. 실제 ProductionWorkspace/클립보드 훅/서비스/domain 사용, 외부 runtime 및 저장소는 메모리 어댑터.
- `npm.cmd run typecheck`, `npx.cmd eslint components/workspace/production/ProductionWorkspace.tsx`, `git diff --check` 통과. 브라우저 시각 검증은 수행하지 않았다. DadamControls.tsx 해시 변경 없음.
