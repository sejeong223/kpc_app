# 프롬프트 입력창의 불필요한 스크롤바 수정

- 사용자 요청: 내용이 모두 보이고 스크롤할 필요가 없어도 표시되는 입력창 스크롤바 수정.
- `components/workspace/production/SlidePromptEditor.tsx`에서 스크롤바를 숨긴 너비로 내용 높이를 측정하고, 정수 scrollHeight와 소수점 줄 높이 차이에 대비해 1px 여유를 둔다.
- 입력창은 기존 48–180px 범위를 유지하며, 측정한 내용 높이가 180px를 초과할 때만 overflow-y를 auto로 변경한다. 짧아지면 다시 숨긴다.
- ResizeObserver의 너비 비교를 스크롤바에 영향을 받지 않는 외곽 너비로 변경했다. 화면 크기 변경 및 폰트 로딩 완료 시에도 재측정하며, 기존 스크롤 위치를 보존하고 해제 시 observer/이벤트를 정리한다.
- 검증: `npm.cmd run typecheck`, `npx.cmd eslint components/workspace/production/SlidePromptEditor.tsx`, `git diff --check` 통과. 짧은 내용/긴 내용/다시 짧아짐과 너비·폰트 변경 경로를 정적으로 검토했다. 실제 브라우저의 확대·축소 및 시각 검증은 수행하지 않았다.
- 테스트 폴더·임시 검증 파일·dev server 생성 없음. DadamControls.tsx 해시 변경 없음. 이전 미커밋 수정 보존.
