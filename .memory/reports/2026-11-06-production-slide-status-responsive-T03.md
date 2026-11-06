# T03 실행 결과

Date: 2026-11-06
Status: done

## 구현
- panel-layout.ts에서 실제 제작 컨테이너 폭으로 mobile/compact/wide 배치와 패널·접기 레일·분리선·중앙 너비를 계산한다. 저장된 너비/열기 선호는 자동 접기에 의해 바뀌지 않는다.
- ProductionPanels의 출처 absolute overlay를 제거했다. compact 첫 진입에는 접힌 레일, 명시적으로 열면 실제 너비와 분리선을 차지한다. 761px 경계에서는 슬라이드 목록을 임시로 접어 중앙 320px을 확보한다.
- 표시/ARIA/포커스가 동일한 계산 결과를 사용한다. 키보드 10px 조절·Home·더블클릭·pointer capture를 보존하며 최대 조절 폭은 남은 공간으로 제한한다.
- 모바일 패널을 숨겨도 편집기를 unmount하지 않아 초안을 유지한다. 너비 변화는 root.clientWidth/ResizeObserver로 측정하며 앱 메뉴 너비를 이중 차감하지 않는다.
- 편집 헤더·본문·미리보기·출처의 width/max-width/min-width/box-sizing 및 긴 단어 줄바꿈을 보완했다. 기존 미리보기 비율/글꼴/좌표, 헤더 최대 높이와 내부 스크롤은 유지한다.
- useProductionSidebar는 사용자 namespace별 엄격한 version:1/collapsed:boolean 값을 사용한다. 미설정이면 접힘, 명시적 클릭만 저장하며 false도 복원한다. 초기 저장값 로드보다 빠른 클릭을 보호한다.
- AppShell은 제작에만 저장된 선택을 적용한다. 다른 메뉴의 기존 접힘 상태와 모바일 menuOpen은 독립적으로 유지한다.

## 검증
- npm.cmd run typecheck 통과.
- Task 지정 eslint 통과.
- Task의 Node stdin 배치 행렬 1,152조합 통과: 경계 폭, 저장 폭, 좌우 열기, compact 명시적 펼침, 중앙 320px, 너비 합계, 저장 선호 불변.
- 추가 54조합 통과: 음수/NaN/Infinity, 모바일 3개 패널, 소수 CSS 폭, 메뉴 64/200px 전환 후 가용 폭.
- Node stdin + jsdom/React로 실제 ProductionPanels 이벤트 확인: 출처 표시/접기, 양쪽 키보드 및 Home, 더블클릭, 포인터 캡처/최대 폭 clamp, 자동 접기 포커스 이동과 외부 포커스 보존, namespace/모드 전환의 compact override 초기화, 모바일 전환 시 편집 노드·미저장 값 유지, 저장된 열기 선호 보존.
- Node stdin + jsdom/React로 실제 useProductionSidebar 확인: 최초 기본 접기/자동 저장 없음, false/true 저장과 재마운트 복원, 사용자 분리, 잘못된 JSON/version/type/추가 필드, 저장소 읽기/쓰기 예외, 초기 로드 이전 수동 펼침 우선.
- AppShell 정적 검토: 실제 WorkspaceProjectProvider 하위 배치, 동일 effectiveCollapsed를 root class/NavSidebar에 전달, 프로젝트·회차·쿼리 스코프를 저장 키에 사용하지 않음, 모바일 menuOpen 경로 보존.
- npm.cmd run build 통과. 기존 baseline-browser-mapping 데이터 갱신 안내는 비차단 경고이며 패키지는 변경하지 않았다.
- jsdom은 React 상태/DOM 이벤트 검증이다. 실제 레이아웃·브라우저 확대/축소·시각 확인은 미실시. tests/ 또는 임시 검증 파일, 브라우저/CUA/E2E/dev server를 사용하지 않았다.

## 보존 및 주의
- T01/T02의 개별 완료·해제 로직을 변경하지 않았다. 본문/파일/댓글/PPT/회차/담당 테두리·배지의 기존 수정도 보존했다.
- Toolbar에는 이번 title maxWidth 변경만 선택해 stage하며 기존 미커밋 디자인 수정은 작업 트리에 둔다.
- 저장소가 차단된 브라우저는 현재 마운트의 선택만 메모리에 유지한다. 새로고침 후 유지에는 localStorage 접근이 필요하다.
- 기존 일괄 완료 기록은 자동 해제하지 않는다. 제조업 공유 demoPrompt 분리는 사용자 제외 범위로 유지한다.
- 요청 범위 밖 추가 변경: 특이사항 없음.
