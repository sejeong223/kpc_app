# T01: HTML에 없는 조작 요소 제거

- Status: done
- Plan: 2026-11-05-production-html-controls
- Phase: P01-controls

## 파일·심볼

- production/SlideNavigator.tsx: 상시 일괄 도구/체크박스/더보기 제거, 우클릭 네 항목 및 키보드 닫기/포커스 복귀. onMove/onSelectMany/contextId 관련 props 제거.
- production/ProductionWorkspace.tsx / ActiveSlide, ProductionWorkspace: 이미지/Template/단일 AI/추가 도구 연결과 화면 상태 정리. 직접 편집·저장·dirty 보호·다중 선택/요청·우클릭 명령 유지.
- production/SlideContentEditor.tsx: 문서 도구와 파일 선택, 화면 전용 cursor/command 제거. 기존 문서 모델/붙여넣기/IME 유지, 반영은 아이콘으로 표시. 일반 텍스트 fallback은 명시적 안내와 기본 붙여넣기로 처리.
- production/ProductionAiPanel.tsx: 다중 선택 textarea와 반영 아이콘만 표시. 요청 모델과 비교 후 적용 유지.
- production/SourcePanel.tsx: 참조 카드 자체의 클릭/Enter/Space로 원문 열기. 별도 열기/재시도 버튼 제거.
- production/ProductionPreview.tsx, BasicSlidePreview.tsx, HtmlDemoSlidePreview.tsx 및 CSS module: 재시도/전체 본문 보기 제거, 저장 내용·초과 안내 보존.
- production/ProductionScreen.tsx: 본문 외 임의 선택 바로잡기/재시도 버튼 제거, 조회 상태와 오류 문구 유지.
- shared/WorkspaceFlow.tsx: write의 작업 상태에만 임의 추가 취소/재시도 액션을 연결하지 않음. toc는 기존 동작 유지.

위 경로는 모두 components/workspace/ 아래다. ProductionToolbar의 소목차/상태/고정 해제 및 ProductionPanels 접기 아이콘은 HTML에 있어 유지한다.

## 모델·행동

영속 스키마 변경 없음. ProposalSlide/SlideContent/SourceRef/WorkspaceMutation 유지. Navigator의 로컬 메뉴 상태는 {id:string|null,sectionId:string,x:number,y:number}|null이며 메뉴는 body portal로 패널 스크롤과 분리한다. id가 null인 경우 빈 소목차의 목록 메뉴다. menuitem은 복사/붙여넣기/삭제/추가만 사용. 기존 읽기 전용/저장 중 조건 유지. 빈 슬라이드의 본문 입력 문단은 문서 편집기에만 준비하며 사용자 입력 전에는 저장하지 않는다.

## 수용·검증

- 일반 제작 화면에서 사진의 일괄 도구·체크박스/더보기·중앙 추가 도구가 없다.
- Ctrl/Meta·Shift 선택과 단일 클릭 복귀, 우클릭 네 메뉴, 키보드 접근/닫기가 동작한다.
- 문서 입력·저장·한글 조합 보호, 출처 카드 클릭/키보드 열기, 다중 요청 적용을 보존한다.
- npm.cmd run typecheck / npm.cmd run lint / npm.cmd run build / git diff --check.
- stdin React/jsdom으로 제거/유지 액션 및 상호작용 검증. tests/와 브라우저/dev server 검증 금지.

## 커밋

제작 화면에서 HTML에 없는 조작 버튼 제거

Plan: 2026-11-05-production-html-controls
Phase: P01-controls
Task: T01

## 완료 기록

기존 구현 11개 수정. 타입/lint/build/diff 및 컴포넌트 상호작용 67개·제작 화면 통합 17개(총 84개) 검증 통과. 브라우저 검증/tests 폴더 생성 미실시.
[상세 보고서](../../../reports/2026-11-05-production-html-controls.md)
