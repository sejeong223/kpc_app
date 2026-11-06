# 제작 슬라이드 핀 및 중앙 배치 실행 기록

- Plan: [2026-11-05-production-slide-pin-layout](../plans/2026-11-05-production-slide-pin-layout.md)
- 실행일: 2026-11-06
- 진행: T01 완료, T02 진행 예정

## T01 슬라이드에 연결된 핀 저장·생성·표시

- 실제 슬라이드별 생성 영역, 점선/십자 커서, 아래 왼쪽 핀 생성 버튼과 슬라이드별 의견 표시를 구현했다. 이전 의견 진입 버튼은 제거했다.
- 새 의견에 slideId를 저장한다. 기존 연결 없는 의견과 삭제된 슬라이드의 의견은 원문을 보존하고 화면/집계에서 숨긴다. 동일 ID 복원 시 다시 표시된다.
- 여러 슬라이드가 보여도 provider/controller는 하나다. 생성 대상 전환은 기존 초안 보호 확인창을 사용한다. 팝업은 body portal로 표시해 중앙 스크롤에 잘리지 않게 한다.
- state-compatibility.ts는 기본값이 있는 schema의 입력/출력 타입 차이를 처리하도록 최종 엄격 검증 앞에 identity preprocess를 추가했다.
- 타입 검사, lint, production build, diff 공백 검증 통과.
- stdin 검증 164개 통과: 도메인/controller 69, 실제 핀 표면 UI 36, 실제 렌더러 38, 초안 보호 provider 13, 단일/다중 선택 통합 8. 메모리 fixture와 모의 DOM 좌표를 사용했으며 앱 저장 자료는 변경하지 않았다.

## 학습 노트 및 제한

- `slideId: string | null`: 새 의견의 대상은 필수지만 이전 자료는 null로 읽어 유실을 막는다. 표시용 필터로 전체 저장 상태를 덮어쓰면 숨긴 자료가 사라지므로 쓰기에서는 전체 snapshot을 사용한다.
- `createPortal(..., document.body)`: 팝업을 부모의 overflow와 container 기준에서 분리한다. 좌표는 실제 슬라이드와 viewport로 계산한다.
- 브라우저/CUA/E2E/dev server/스크린샷 검증은 수행하지 않았다. DOM/좌표 검증은 실제 화면을 육안 확인한 결과가 아니다.
- 사용자 수동 확인 경로: `/workspace/write?project=production-html-demo`.
- 기존 별도 ProjectComments 체계는 계획대로 유지했다. 추가 범위 밖 변경·미해결 오류: 특이사항 없음.
