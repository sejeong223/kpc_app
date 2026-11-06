# Phase: P01 HTML 한 파일 UI 정비

## Status: in_progress

## Scope
제품 변경은 C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html 한 파일만 허용한다. 현재 단계는 계획 문서 작성이며 아직 구현하지 않는다. .memory 문서는 계획·진행 기록 용도다.

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | done | 공통 헤더·중복 메뉴 제거·자료 제한 안내 본문 이동 | [T01](./T01-shared-header.md) |
| T02 | in_progress | 제작 코멘트 UI | [T02](./T02-production-comments.md) |
| T03 | pending | 검토 원문 줌·분석 패널 조절 | [T03](./T03-review-viewer-controls.md) |
| T04 | pending | v12 목차 내용 복원 | [T04](./T04-toc-content.md) |
| T05 | pending | v12 제작 설정 내용 복원 | [T05](./T05-setup-content.md) |
| T06 | pending | 관리자 폰트 통일 | [T06](./T06-admin-font.md) |
| T07 | pending | RFP 상태 구성 차트 | [T07](./T07-dashboard-composition.md) |
| T08 | pending | 리뷰 도구 제거·다중 슬라이드·통합 검토 | [T08](./T08-review-multiple-slides.md) |

## Progress
- done: 1/8 (active: T02)
- T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 순서로 실행.
- 각 Task의 구문 검사와 정적 수용 조건이 완료된 뒤 done 처리한다.
- 브라우저 검증은 지속 사용자 정책에 따라 제외. tests/ 생성·복원 금지.
- Downloads HTML은 외부 파일이다. 작업별 한국어 커밋에는 .memory 진행·검증 기록만 포함하며 제품 소스 커밋이라고 표현하지 않는다.
