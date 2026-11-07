# 제작 통프롬프트·단축키 실행 검증

- 실행: 2026-11-07, mea 자동 순차 실행.
- 공용 버튼 리팩토링 제외. `DadamControls.tsx` 읽기 전용.
- 보호 파일 시작 SHA256: `56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84`.
- tests/·임시 검증 파일·브라우저/CUA/E2E/dev server/스크린샷 없음. 검증은 stdin 및 기존 검사 명령 사용.

## T01

- commit: `0c49fef`.
- `npm.cmd run typecheck` 및 SlideNavigator/navigator-shortcuts ESLint 통과.
- 순수 키 해석 검증: Ctrl/Meta 복사·붙여넣기, Delete/Backspace, 수정키·IME 예외, ↑/← 이전 및 ↓/→ 다음 통과.
- 실제 SlideNavigator를 메모리에서 컴파일하고 jsdom/React로 렌더하여 키 이벤트 검증 통과. 미리보기/테마 provider만 stub했다.
- A 활성/B 우클릭→B 복사, A+B 선택/B 우클릭→A+B 삭제, 잠긴 B 포함→삭제 0회, 팝업 ArrowDown→슬라이드 선택 0회, 팝업 paste→section/afterId 정확히 1회, textarea Ctrl+C→슬라이드 복사 0회, 빈 목록 paste→afterId null 통과.
- 메뉴 kbd 문자열 및 separator margin 확인. 실제 브라우저 시각 검증은 미실시.
- 키 해석은 순수 helper, 실제 작업은 동일 action 배열의 disabled/run을 사용한다. 입력창의 복사·삭제를 건드리지 않도록 목록/메뉴 범위를 제한했다.
- 요청 범위 밖 추가 변경: 없음.

## T02

- typecheck 및 변경 모델/스키마/domain/service/mapper ESLint 통과.
- stdin 검증 통과: 제조업 46장 전부 로컬 배치 후 기존 레이아웃/블록 ID 유지, 일반 text/list/table/image 보존, Template binding 없는 영역 보존 및 배치 불가/용량 초과 오류.
- 같은 소목차 A만 원문·content·revision 변경, B/Section.demoPrompt 불변. CRLF/한글/앞뒤 공백 포함 raw 원문 정확히 보존. 빈 입력/20001자/null 저장 원문 거부.
- 담당자/PM/super_admin의 본문 저장 성공, 비담당 일반 사용자 거부, 완료 슬라이드 수정 및 원문만 바꾼 replace-content 우회 거부. 작성 중 형제 슬라이드 저장 가능.
- 복제·undo·snapshot 원문 보존, v1/v2→v3 및 v3 current/snapshots/undo roundtrip 통과.
- fake-indexeddb의 새 메모리 DB에 실제 repository/service를 연결해 저장·재조회·stale revision/round·transaction 내부 자산 guard 실패 시 원자 롤백·취소/close 거부 확인. 실제 사용자 저장소 미접근.
- 기존 AI/PPT/이미지 경로는 원본 slide clone/spread를 사용하여 새 원문 필드를 유지한다. 관련 서비스의 전면 정리 없음.
- 핵심: `editorPrompt`는 원문, `content`는 로컬 배치 결과이며 prepared operation 하나로 저장한다. 원문 없는 저장본은 자기 content에서 읽고 자동 migration/seed 초기화는 하지 않는다.
- DadamControls SHA256 시작 값과 일치. 브라우저 시각 검증 미실시. 요청 범위 밖 추가 변경 없음.

## T03

- T02 commit: 498259d.
- 타입 검사·변경 파일 ESLint·프로덕션 빌드 통과. build의 기존 baseline-browser-mapping 데이터 경고는 비차단이며 패키지는 변경하지 않았다.
- 실제 hook/editor/adapter를 메모리 컴파일한 jsdom/React 검증 통과. runtime/mutation·preview·공용 버튼/style provider만 격리 stub했으며 실제 prompt mapper를 사용했다.
- 통프롬프트 textarea 하나, 한글·줄바꿈·앞뒤 공백 저장, 같은 소목차 A/B 독립 원문, 반영 전 저장 미리보기 유지 확인.
- IME 중 입력 가능/저장 차단, 조합 중 외부 revision 변경 시 원문 보존과 충돌 처리, Ctrl+S 1회 저장, 저장 중 중복 호출 거부 확인.
- LAYOUT 저장 실패·권한 상실·빈 입력/20001자·snapshot/done·PM/admin 본문 권한·명시 폐기·이전 화면의 늦은 receipt·round/project 변경 방어 통과.
- textarea font/min-width/wrap/높이 제한 정적 확인. 대체된 editor/hook/legacy operation 실행 참조 0. 기존 문서 유틸·예시 seed·다른 mutation은 유지.
- 공용 버튼 리팩토링 없음. DadamControls SHA256 시작 값과 일치. 브라우저 시각 검증 미실시.
- 첫 변경 시 project revision을 고정하고, receipt를 현재 session에만 적용하며 실패 시 dirty 원문을 유지하는 공통 경로로 통합했다. 요청 범위 밖 추가 변경 없음.

## T04

- T03 commit: 650677f. T04 commit: 이 보고를 포함한 완료 커밋의 Git 이력 참조.
- 타입 검사·변경 파일 ESLint·최종 프로덕션 빌드·diff --check 통과. 기존 baseline-browser-mapping 갱신 권고만 있으며 비차단이다.
- 실제 permissions/selectors/domain 검증 통과: 담당자의 한 장 완료/해제, 형제 슬라이드/본문 불변, 비담당 일반/PM/super_admin의 writing/done/no-op/대체 명령 모두 FORBIDDEN, grant로 우회 불가.
- PM/admin 본문 편집 및 목차 전체 완료/해제 권한 유지, 직접 배정 시 개별 완료/해제 허용, 완료 회차/snapshot 차단, 담당 해제 stale 요청 CONFLICT 및 최신 요청 FORBIDDEN 확인. 실패 시 source state/revision/undo 불변.
- jsdom/React로 실제 CompletedSlidePrompt와 변경하지 않은 DadamButton/DadamSelect를 렌더하고 동작 검증 통과. adapter는 실제 hook을 쓰되 runtime/mutation·preview와 쓰기 입력창의 버튼/style provider만 메모리 stub했다.
- 완료 기본 접힘·보기/접기·aria 연결·저장 원문과 긴 한글/줄바꿈/<script> 문자열의 안전한 텍스트 출력·전송/고정 해제 부재·서비스 호출 0회 확인.
- 같은 완료 카드의 unrelated revision은 펼침 유지, slide/round/snapshot 변경 및 다시 완료 시 접힘. writing 전환 시 입력창 복귀. 외부 완료/IME/접근 상실 때 미반영 원문을 저장 원문과 분리 보존하고 저장은 차단하며 명시 폐기 가능.
- 실제 select의 담당/비담당·writing/done·busy·callback 없는 상태를 확인. disabled 속성과 onChange 이중 검사로 차단, 담당자만 상태 callback 1회. 기존 disabled/muted 토큰의 생성 CSS와 점선/줄바꿈/높이 제한 소스 확인.
- DadamControls 최종 SHA256: 56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84. 시작 값과 동일. 공용 버튼 리팩토링 없음.
- 검증 한계: 브라우저 시각/실제 확대 배율 검증은 미실시. jsdom 결과를 실제 배치·색상 확인으로 해석하지 않는다. 실 AI/서버 연동 없이 로컬 배치 시연이다.
- 학습 포인트: 상태 변경과 본문 편집 권한은 별도 capability를 쓰되 UI와 domain이 같은 담당 판단을 사용한다. 원문 보기의 접힘 상태는 저장 revision과 분리하고, 외부 완료로 입력창이 사라지면 IME busy를 해제해 조작이 묶이지 않도록 했다.
- 요청 범위 밖 추가 변경: 없음. 보호 대상/기존 사용자 데이터/패키지/DB 설정 변경 없음.

## Final

- done: 4/4. Task/phase/plan/current 동기화 완료. 테스트 폴더·임시 검증 파일·브라우저·서버 실행·push 없음.
