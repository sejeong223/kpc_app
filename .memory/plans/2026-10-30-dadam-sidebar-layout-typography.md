# Plan: dadam 사이드바 레이아웃과 타이포그래피

- Date: 2026-10-30
- Status: done
- Plan ID: 2026-10-30-dadam-sidebar-layout-typography
- Workspace: C:/Users/김세정/Documents/GitHub/kpc_app
- Decisions: [요청과 적용 기준](../decisions/2026-10-30-dadam-sidebar-layout-typography.md)
- Validation policy: [모든 Task의 브라우저 검증 제외](../decisions/2026-10-30-task-validation-policy.md)

## Goal

dadam의 사이드바 크기, 상단·메뉴·하단 배치, 아이콘과 텍스트 정렬, Spoqa Han Sans Neo 서체를 KPC 사이드바에 적용한다. 펼침 200px / 접힘 64px / 모바일 drawer 280px, 일반 메뉴 14px·행간 20px·굵기 400을 목표로 한다. 활성 메뉴에만 적용되는 색·배경·강조선·굵기 및 선택 판정은 이번 디자인 작업에서 제외한다.

최초 계획 단계에서는 `.memory/` 문서만 작성했다. 이후2026-10-30 사용자의 `$mea` 요청으로 T01 구현·자동 검증·진행률 동기화를 완료했다. 외부 dadam 저장소·패키지는 변경하지 않았다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done | 셸 너비·사이드바 배치·서체를 함께 적용하고 기존 자동 검증 실행 | [P01](../phases/2026-10-30-dadam-sidebar-layout-typography/P01-sidebar/phase.md) |

## Task Map

| Task | 결과 | 수정·추가 파일 |
| --- | --- | --- |
| T01 | dadam 기준 사이드바 크기·메뉴 정렬·서체 및 하단 프로필 배치 | `components/layout/AppShell.tsx`, `components/layout/NavSidebar.tsx`, `components/profile/ProfileMenu.tsx`, `app/globals.css`, `public/fonts/spoqa-han-sans-neo/`의 원본 woff2 세 파일과 LICENSE |

폭만 먼저 바꾸면 본문 margin과 기존 181.141px 고정 프로필 카드가 새 내부 여백과 맞지 않는다. 글자 크기만 먼저 바꾸면 기존 34.5px 메뉴 높이·숨겨진 아이콘과 어긋난다. 독립적인 기능 단계가 아니라 하나의 레이아웃 변경이므로 단일 Phase·단일 Task로 묶고 한 번에 검증한다.

## Reference evidence

- dadam root: `C:/Users/김세정/Documents/GitHub/dadam_app/dadam_app`
- 확인 당시 dadam HEAD: `9ce748fab9fd7254c7bba89984354e80e81eba0c`; 해당 sidebar/font 참조 파일은 미커밋 변경 없음.
- KPC HEAD: `8a0f76711582bc54b00d8eec073c851fe1c1f3e8`.
- `app/_components/layout/NavSidebar.tsx`: 200/64/280px, 외곽 좌우 12px, 메뉴 추가 inset 6px, 아이콘 20px, gap 10px, 행 padding 10px 12px, 그룹 gap 4px, 구분선 margin 10px 6px, toggle 28px, footer padding 12px.
- `NavSidebarV2.tsx`: 기본 치수·메뉴 간격은 동일하다. V2 glass·그림자·RadialLauncher는 이 요청의 크기·정렬·폰트 범위에 포함하지 않는다.
- `app/_styles/fonts.ts`, `fluentThemeTokens.ts`: 로컬 Spoqa Han Sans Neo와 Fluent 기본 폰트 연결.
- 로컬 Fluent Text 기본값: 일반 메뉴 14px / 20px / 400. dadam의 텍스트 브랜드 fallback은 24px / 32px / semibold이며, 실제 브랜드는 설정에 따라 이미지일 수 있다. KPC의 긴 브랜드 문자열에는 16px / 24px / 500으로 명시적으로 조정한다.
- 이는 로컬 소스 판독 기준이며 실제 브라우저 측정값으로 표현하지 않는다.

## Scope

- 포함: 펼침·접힘·모바일 너비, 본문 좌측 여백 동기화, 헤더·토글·메뉴·구분선·프로필의 배치, 펼침 아이콘 표시, 글꼴·크기·굵기·행간·말줄임.
- 모바일 전환점은 KPC의 760px/761px를 유지한다. dadam의 1024px 주석·drawer 규칙과 ClientNavFrame의 md 규칙을 함께 복제하지 않는다.
- 메뉴 이름·순서·URL 15개, 일반 사용자 7개/관리자 15개 노출, 실제 인증, 프로필 팝오버 내부·토큰 모달, 코멘트 저장 동작은 유지한다.
- 활성 전용 `active` 규칙과 접힘의 `aria-current` 색은 유지한다. 모든 행이 공유하는 폰트·간격은 활성 행에도 적용되지만, 활성 상태만의 새 디자인은 만들지 않는다.
- 배경 테마 변경, 전체 앱 서체 변경, 애니메이션 신설, 새 그룹 제목·dadam 메뉴·기능·라이브러리 이식은 제외한다.

## Validation strategy

- 2026-10-30 사용자 지시: 앞으로 모든 Task에서 브라우저 검증 제외. 수동 브라우저, Computer Use, Playwright/E2E, 스크린샷·육안 비교 및 검증용 dev server를 Task 조건으로 두지 않는다.
- 기존 sidebar 권한·profile/token 상태·셸 jsdom·코멘트 geometry/UI 테스트, typecheck, lint, build와 정적 차이 검토를 사용한다.
- CSS 값을 그대로 복사하는 테스트나 신규 테스트 도구는 추가하지 않는다. jsdom 검증을 실제 화면 검증이라고 표현하지 않는다.
- 시각 결과는 브라우저에서 검증하지 않은 상태임을 결과에 짧게 구분하되, 사용자 지시대로 완료 차단 조건으로 삼지 않는다.

## Adjacent work and handoff

- 인접 사항으로 이전 핀 코멘트 T03·T04의 브라우저 검증 대기를 발견하여 사용자에게 범위를 확인했다. 사용자는 모든 Task에서 브라우저 검증을 제외하도록 지시했다.
- 이전 T03·T04는 기존 구현 커밋 및 404개 자동 테스트·타입·lint·build 통과 기록을 근거로 새 검증 정책에 따라 done으로 정리한다. 브라우저 검증을 실행/통과했다고 기록하지 않는다. 이 처리는 새 구현 Task를 추가하는 일이 아니다.
- 이전 current 원문: [포인터 변경 전 기록](../history/2026-10-30-before-dadam-sidebar-layout-typography.md). 원문 안 상대 링크는 원래 `.memory/current.md` 위치 기준이다.
- 새 시작점은 P01-T01. `/memory-execute`는 이 Task를 구현하고 `/mea`는 이 활성 계획의 남은 Task를 순차 실행한다.


## Completion (2026-10-30)

P01-T01 완료, 남은 Task 없음. AppShell/NavSidebar/ProfileMenu/globals.css 및 로컬 폰트를 구현했다. 지정6개 테스트 파일138개 테스트·typecheck·lint·build·폰트 해시·정적 보존 검토를 통과했다. 활성 전용 스타일과 팝오버 내부는 유지했다. 브라우저 검증은 사용자 지시로 제외했다. 실행 상세와 커밋 식별자는 T01에 기록한다.
