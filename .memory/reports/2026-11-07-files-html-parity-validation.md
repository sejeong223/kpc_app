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

## T02 — 목록 HTML 스타일

- typecheck 및 지정 8개 파일 ESLint `--max-warnings=0`: 통과.
- 최종 HTML 대응 정적 검토: 사용량11px/막대5px, 회차14px/600, 카드명14px/500, 아이콘14px, 배지 색, 목록 small32px/12px/400, 768/1280px 분기를 적용했다.
- Node stdin + jsdom에서 실제 FileCategoryPanel을 렌더링: 파일 드롭/분류 이동 callback 실행, disabled/웹의 파일 drop/readonly 이동 차단, 드롭 후 강조 제거, React console error 없음 확인.
- 기존 canonical 수량, 권한, FileResourceMeta 포맷과 15초 undo 타이머 보존을 정적 검토했다. typecheck/lint 성공은 시각 동일성 확인을 의미하지 않는다.
- DadamControls 해시 일치. 공용 컨트롤·테마·서비스·스키마 변경 없음. 신규 외부 문제 없음.
