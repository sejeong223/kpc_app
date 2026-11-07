# 파일 업로드 HTML 일치 — 실행 검증

- Plan: [2026-11-07-files-html-parity](../plans/2026-11-07-files-html-parity.md)
- 시각 검증: 정책에 따라 브라우저/CUA/E2E/dev server/스크린샷을 실행하지 않았다. 아래 결과는 타입·lint·정적 검토·Node stdin 검증이다.
- 기존 별도 FluentProvider hydration 오류는 이번 범위에서 수정하거나 해결됐다고 판정하지 않는다.

## T01 — 회차별 표시와 성공 안내

- `npm.cmd run typecheck`: 통과.
- 지정 3개 소스 ESLint `--max-warnings=0`: 통과.
- 청사진 Node stdin: 현재 신규3/계승10, 13개 전체참조와17개 여유, snapshot 전체13, readonly현재, 과거10, 빈배열, excluded 포함, 입력 불변성 통과.
- 정적 대조: full data.rounds의 최신 버전 편집/원본 미리보기와 currentCount/availableSlots를 보존했다. 등록 회차 필터는 FileRoundSection의 표시/카드 개수에만 적용했다.
- 일반 성공 fallback은 빈 문자열이며 삭제 undo와 복원 전용 안내를 보존했다. 신규 외부 문제 없음.
- `git diff --check`: 통과. 저장 스키마/domain/service 및 공용 컨트롤 변경 없음.
