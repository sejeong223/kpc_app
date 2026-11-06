# T02 제작 패널·목록·출처 결과

- Date: 2026-11-06
- Result: 구현·검증 완료

ProductionPanels는 밀착된 흰 패널·6px 조절선·40px 레일로 변경했다. useProductionPanels의 기본 폭은240/360, 저장 허용 범위는150~480/280~680이다. 정상 저장값은 유지한다. `resolveProductionPanelWidths(state, width)`는 표시 폭만 줄여 중앙320px을 확보하고 저장된 선호 폭은 덮어쓰지 않는다. Home/더블클릭·키보드·pointer 조절 및 작은 화면의 패널 전환을 유지했다.

SlideNavigator는 현재 자료의 썸네일과 담당/고정/선택/장별 미처리 의견을 표시한다. `openComments: counts.get(slide.id) ?? 0`으로 소목차 전체 의견을 각 장에 중복 표시하지 않는다. 목록 내 방향키와 기존 복사·붙여넣기·삭제·추가 권한/guard는 함께 유지한다.

SourcePanel은 한 줄 헤더와 RFP/참조 카드·인용문을 HTML 위계로 바꿨다. `resource !== null && round !== null`인 자료만 원문 버튼이 되며 미연결 RFP는 누락 문구를 표시한다. 스냅샷의 과거 자료 버전을 현재 원문으로 바꾸지 않는다.

## Validation

- typecheck: 통과.
- 청사진 변경 파일7개 lint: 통과.
- 실제 폭 계산 helper stdin 검증195조건: 통과. 1180/1200/1400/1920px, 접힘 조합, 최소/기본/최대 선호 폭과 중간폭761/900/1179px에서 중앙320px 확보 확인.
- git diff --check: 통과.
- aria 폭 범위·scroll 소유자·댓글 개수·자료 누락 표시·namespace 저장/파싱 fallback·snapshot·IME/menu의 키 이벤트 제외를 정적으로 검토했다.
- tests/ 생성 및 브라우저·시각·마우스 검증은 하지 않았다.

## 알아야 할 점

ResizeObserver는 컨테이너의 실제 폭만 관측한다. 좌우 선호 폭과 현재 표시 폭을 구분하므로 창을 다시 넓히면 사용자 선호 폭으로 돌아온다. 중앙 스크롤은 다음 T03에서 도구/캔버스로 분리할 때까지 기존 상태로 유지했다.

요청 밖 새 발견사항: 특이사항 없음. 원문 미연결 상태의 신규 연동은 제외 결정을 유지한다.
