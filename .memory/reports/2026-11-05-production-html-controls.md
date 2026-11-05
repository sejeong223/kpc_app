# 제작 화면 HTML 외 조작 요소 정리 완료

- Date: 2026-11-05
- Plan: [production-html-controls](../plans/2026-11-05-production-html-controls.md)
- Task: P01-T01 done

## 반영

사진의 모두 선택·선택 해제·선택 수/복사·삭제·이동할 소목차·선택 이동 상시 도구를 제거했다. 슬라이드 체크박스/더보기 버튼, 인라인 복제·위로·아래로·닫기도 제거했다.

HTML 실제 제작 경로 wsWrite/writeThumbs와 contextmenu 핸들러를 기준으로 목록은 썸네일 클릭 및 Ctrl/Meta·Shift 선택을 사용한다. 복사·붙여넣기·삭제·추가 네 항목만 우클릭 메뉴로 제공한다. Escape/바깥 클릭으로 닫기, Shift+F10/ContextMenu 키로 열기, 방향키 탐색과 포커스 복귀를 지원한다. 빈 소목차는 목록 빈 영역 우클릭에서도 동일 메뉴의 추가/붙여넣기를 사용할 수 있다.

중앙의 문서 도구, 문단/목록/표 추가·행/열/항목/본문 조작, 이미지 파일 선택, Template 연결 설정, 상단 슬라이드 추가/붙여넣기, 한 장씩 편집, 변경 취소 등의 별도 버튼을 제거했다. 단일 AI 패널과 빠른 요청·요청 종류 선택·비교 제안 만들기는 현재 HTML의 wsWrite에서 표시하지 않으므로 제거했다. 다중 선택 시에는 multiPrompt처럼 textarea와 반영 아이콘을 사용한다.

직접 편집의 슬라이드 반영도 화살표 아이콘으로 표시한다. 빈 슬라이드는 별도 추가 도구 없이 본문을 쓸 수 있게 비어 있는 문단을 편집기에 준비하며, 사용자 입력 전에는 저장하지 않는다. 지원하지 않는 붙여넣기 서식은 안전한 일반 텍스트로 처리하고 안내한다. 저장·dirty·조합 입력·권한·회차 보호는 유지했다.

출처의 별도 원문 열기 버튼을 없애고 참조 자료 카드 자체를 클릭/Enter/Space로 열도록 바꿨다. 미리보기 전체 본문 토글, 본문 조회/선택/작업의 추가 재시도 버튼도 제거했다. 필요한 실패·초과·권한 안내는 텍스트로 남겼다.

HTML에 있는 패널 접기/펼치기, 소목차/작성 상태, 고정 해제, 반영, 되돌리기와 비교 적용 동작은 유지한다. 기존 저장 보호·삭제 확인 대화상자를 유지한다. 헤더·코멘트·다른 메뉴·기존 저장 데이터는 변경하지 않았다. 영속 스키마와 도메인 API는 그대로다.

## 파일

기존 구현 11개만 수정했다: SlideNavigator, SlideContentEditor, ProductionAiPanel, ProductionWorkspace, SourcePanel, ProductionPreview, BasicSlidePreview, HtmlDemoSlidePreview 및 CSS module, ProductionScreen, WorkspaceFlow. 새 구현 파일/공용 컴포넌트/디렉토리 없음.

## 검증

- npm.cmd run typecheck / npm.cmd run lint / npm.cmd run build / git diff --check: 통과.
- stdin 실제 컴포넌트 jsdom 상호작용 67개: 제거된 도구 부재, 클릭/수정키 선택, 우클릭 네 항목·키보드 탐색·바깥 클릭·포커스 복귀·권한 비활성, 빈 소목차 추가, 직접 입력/조합 중 반영 방지/본문 생성, 안전한 일반 텍스트 붙여넣기, 읽기 전용, 다중 요청 전송/조합 Enter 차단, 출처 카드 클릭/키보드 열기·선택 변경 시 닫기.
- stdin 실제 ProductionWorkspace 통합 17개: 추가 도구 부재, 단일 편집·반영, Ctrl 클릭 후 다중 요청으로 전환, 단일 클릭 후 편집 복귀/선택 동기화.
- 합계 84개 assertion 통과. UI 스타일 제공자/주변 조회·mutation 훅은 검증용 대체를 사용했다. 실제 브라우저의 레이아웃·포인터·IME를 검증한 결과가 아니다.
- 초기 검증 스텁의 default export 형식을 바로잡은 후 모두 통과했다.
- 기존 baseline-browser-mapping 데이터 시점 경고는 빌드를 차단하지 않았다. 의존성 변경 없음.
- 사용자 지속 정책에 따라 브라우저/CUA/E2E/dev server/스크린샷 검증과 tests/ 생성·복원은 수행하지 않았다. push/배포 없음.

이 결정은 이전 제작 UI 계획과 예시 프로젝트 보고서의 추가 도구·전체 본문 펼치기 설명을 대체한다. 이전 완료 이력은 다시 실행하지 않는다.
