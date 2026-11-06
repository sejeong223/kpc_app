# T04 화면 불일치 보완 결과

사용자가 제공한 두 스크린샷과 원본 HTML을 재대조했다. 이전 T03에서는 바깥 wrapper의 폭만 확인했고 HtmlDemoSlidePreview 내부 `.frame`의 `max-width:860px`를 놓쳤다. 또한 전역 `button:not([data-common-button]) { font:inherit }`의 우선순위가 Griffel의 단일 클래스보다 높아 제작 제목의 16px/700 지정이 덮어써졌다.

## 수정

- HTML 예시 미리보기의 860px 제한을 제거했다. 중앙 너비에 맞춰 width100%로 표시하고 16:9 비율은 유지한다. Basic은 원래 내부 960×540 캔버스를 표시 폭에 맞춰 scale하며, Template은 원본 비율과 width100%를 사용한다.
- 글로벌 font/focus 기본값을 `@layer base`와 `:where(...)`로 이동했다. 컨트롤의 명시적 font/outline 스타일이 기본값보다 우선한다. 제작 제목16px/700, breadcrumb11px/브랜드색, 상태30px 및 소목차 버튼 간격을 맞췄다.
- 편집창의 문서형 큰 제목·lead16px/본문12px 여백을 제거하고 13px/1.7·문단4px·목록2px/들여쓰기18px로 맞췄다. title/lead/blocks를 지우거나 요약하지 않는다. 본문이 긴 경우 원본 HTML처럼 최대180px에서 스크롤된다.
- 공통 헤더의 좌우12px·row/action gap8px·회차 배지를 원본과 맞췄다.
- 표시 메타데이터를 별도 config에 정의했다. 기존 admin seed36개 + HTML demo1개 모두 발주처·부서·ISO 마감일을 가진다. 부서는 실제 목 카탈로그 departmentId와 일치하며 날짜는 고정 기준으로 생성한다. 헤더·선택 목록·설정에 전달한다. 저장된 프로젝트와 슬라이드, 권한, 서비스 모델은 변경하지 않았다.

## 검증

- `npm.cmd run typecheck`: 통과. 최초 Griffel의 지원하지 않는 borderColor shorthand 타입 오류를 shorthands.borderColor로 수정 후 통과.
- `npm.cmd run lint`: 전체 통과.
- `npm.cmd run build`: 통과. 기존 baseline-browser-mapping 갱신 안내만 출력.
- stdin 검증: 실제 super_admin 목 카탈로그37개 전부 발주처·부서 일치·유효 마감일·D-day 값 확인.
- stdin/PostCSS: font reset은 base layer 내 낮은 specificity, HTML frame은 width100%/max-width:none 확인.
- stdin/jsdom: HTML 예시6개와 표·목록·이미지를 포함한1개 총7개 문서 roundtrip으로 title/lead/blocks/한국어 줄바꿈 보존 확인. 최초 검증용 이미지 데이터에 blobId/mime 대신 잘못된 필드를 넣은 오류는 검증 입력을 실제 스키마에 맞춰 재실행했다.
- git diff --check 통과.
- tests/ 폴더, 브라우저/CUA/E2E/dev server/스크린샷 검증은 수행하지 않았다. 실제 픽셀 일치·마우스 조작 검증을 통과로 기록하지 않는다.

명시한 스타일이 실제 적용되는지는 wrapper뿐 아니라 내부 renderer의 제한과 전역 reset의 CSS 우선순위까지 함께 확인해야 한다. 요청 밖 신규 연동은 추가하지 않았다.
