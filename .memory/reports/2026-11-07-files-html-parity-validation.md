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

## T03 — 자료 입력 팝업

- typecheck 및 지정 6개 파일 ESLint `--max-warnings=0`: 통과. `git diff --check` 통과.
- HTML 최종값 대응: 추가820/설정760/웹640px, header/body/footer 여백, 팝업 small14px/32px, 지침 textarea resize:none, 640px 이하 필드1열, 우선순위/기간 슬롯 스타일 적용.
- 정적 경우표 확인: 0/1/복수행, availableSlots 초과/0, 오류행 제거, 3999/4000/4001자 지침, 혼합/일치 일괄 우선순위, 웹 빈값/정상/잘못된 scheme, busy/dirty/CONFLICT 분기는 기존 validator·callback을 유지한다.
- 모달 변경은 className/slotClassNames와 카운터 표시 포맷에 한정했다. File 객체/기존 submit payload/URL 정규화/저장 실패 시 입력 보존/선택 취소·재선택 경로를 변경하지 않았다.
- 제작·공용 컨트롤·SegmentedControl·ModalFrame·Provider·저장 코드 비변경 확인. 신규 외부 문제 없음.
