# 제작 슬라이드 핀 및 중앙 배치 실행 기록

- Plan: [2026-11-05-production-slide-pin-layout](../plans/2026-11-05-production-slide-pin-layout.md)
- 실행일: 2026-11-06
- 진행: T01/T02 완료 (2/2)
- T01 커밋: af5279e
- T02 커밋: 이 보고서를 포함한 `제작 편집 입력 높이를 줄이고 중앙 슬라이드 배치를 정리` 커밋. 해시는 로컬 current.md와 사용자 완료 보고에 기록한다.

## T01 슬라이드에 연결된 핀 저장·생성·표시

- 실제 슬라이드별 생성 영역, 점선/십자 커서, 아래 왼쪽 핀 생성 버튼과 슬라이드별 의견 표시를 구현했다. 이전 의견 진입 버튼은 제거했다.
- 새 의견에 slideId를 저장한다. 기존 연결 없는 의견과 삭제된 슬라이드의 의견은 원문을 보존하고 화면/집계에서 숨긴다. 동일 ID 복원 시 다시 표시된다.
- 여러 슬라이드가 보여도 provider/controller는 하나다. 생성 대상 전환은 기존 초안 보호 확인창을 사용한다. 팝업은 body portal로 표시해 중앙 스크롤에 잘리지 않게 한다.
- state-compatibility.ts는 기본값이 있는 schema의 입력/출력 타입 차이를 처리하도록 최종 엄격 검증 앞에 identity preprocess를 추가했다.
- 타입 검사, lint, production build, diff 공백 검증 통과.
- stdin 검증 164개 통과: 도메인/controller 69, 실제 핀 표면 UI 36, 실제 렌더러 38, 초안 보호 provider 13, 단일/다중 선택 통합 8. 메모리 fixture와 모의 DOM 좌표를 사용했으며 앱 저장 자료는 변경하지 않았다.

## T02 편집 높이 및 중앙 배치

- ProductionPanels.tsx: 중앙 공통 흰 배경·테두리·radius만 제거했다. `tw:min-h-0 tw:overflow-y-auto`와 data-production-scroll을 유지해 중앙 내부 스크롤·핀 가시성 계산을 보존했다. 좌우 패널과 접기·너비 조절은 유지했다.
- SlideContentEditor.tsx: 고정 편집 제목·직접 편집 문구·상시 안내 행을 제거했다. `boxSizing: "border-box", maxHeight: "180px"`로 패딩을 포함한 본문 높이를 제한하고, 내부 스크롤과 `padding: "12px 52px 12px 16px"`로 안쪽 반영 버튼 공간을 확보했다. 너비와 문서 구조는 유지했다.
- 반영 버튼은 입력 frame 기준 absolute/right 10px/bottom 10px, 30×30px 원형이다. 오류·읽기 전용·미반영 상태·붙여넣기 안내는 frame 밖에 표시한다. 삭제된 제목 참조 대신 `aria-label="슬라이드 내용 편집"` 및 숨긴 hint를 연결했다.
- ProductionWorkspace.tsx: 고정 슬라이드 제목과 빈 상태 편집 제목/카드를 제거했다. 실제 문서 제목, 다중 선택 식별 정보, 보존 중인 입력, 단일·다중 핀 표면은 그대로다.
- 타입 검사, lint, production build, diff 공백 검증 통과.
- stdin 검증 118개 통과: 실제 편집기/패널 80, 제작 화면 통합 38. 제목/lead/text/list/table/image 보존, 입력·저장·IME·키보드·붙여넣기·오류·읽기 전용, 패널 접기/너비/모바일 전환/namespace 저장, single/multiple/dirty/empty/conflict/accessDenied 및 body portal을 확인했다.
- editor 상태/effect/입력/IME/붙여넣기/키보드 handler가 T01 커밋과 동일함을 별도 비교했다. 앱 자료·DB에 쓰지 않았고 검증 파일·tests/를 만들지 않았다.

## 학습 노트 및 제한

- `slideId: string | null`: 새 의견의 대상은 필수지만 이전 자료는 null로 읽어 유실을 막는다. 표시용 필터로 전체 저장 상태를 덮어쓰면 숨긴 자료가 사라지므로 쓰기에서는 전체 snapshot을 사용한다.
- `createPortal(..., document.body)`: 팝업을 부모의 overflow와 container 기준에서 분리한다. 좌표는 실제 슬라이드와 viewport로 계산한다.
- `position: "absolute"`: 반영 버튼을 입력 frame에 고정한다. 문서 내용과 다른 형제 요소로 두어 버튼이 본문 parser에 들어가지 않으며, 오류 안내가 생겨도 버튼의 기준 위치가 바뀌지 않는다.
- CSS는 주입된 Griffel 규칙과 DOM 구조로 검증했다. jsdom의 CSSOM만으로 실제 화면의 줄바꿈·크기·스크롤을 육안 확인했다고 판단하지 않는다.
- 브라우저/CUA/E2E/dev server/스크린샷 검증은 수행하지 않았다. DOM/좌표 검증은 실제 화면을 육안 확인한 결과가 아니다.
- 사용자 수동 확인 경로: `/workspace/write?project=production-html-demo`.
- 기존 별도 ProjectComments 체계는 계획대로 유지했다. 추가 범위 밖 변경·미해결 오류: 특이사항 없음.
