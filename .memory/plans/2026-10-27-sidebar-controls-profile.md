# Plan: 사이드바 접기 아이콘과 관리자 기준 프로필 배치 보정

## Goal

사이드바의 단순 꺾쇠 토글을 Microsoft Fluent의 패널 접기/펼치기 아이콘으로 교체하고, 하단 사용자 프로필을 HTML 관리자 카드의 크기와 위치에 맞춘다. 표시되는 이름·권한 문구가 달라도 펼친 카드는 약 `181.141px × 49px`, 하단 여백은 `12.5px`를 유지해야 한다.

계획 작성 후 사용자의 `/mea` 요청에 따라 구현·자동 검증을 완료했다. 실제 화면 확인 제한은 아래 실행 기록과 T01에 남긴다.

## Source Decisions

- [확정 범위와 원본 수치](../decisions/2026-10-27-sidebar-controls-profile.md)
- 기준 HTML: `C:\Users\김세정\Downloads\KPC_제안서작성AI_mock-up.html`
- SHA-256: `1476c88df1ec5263f91a5549039f4c9804b044861ea5147461b544ca819841db`
- 이전 구현: [Fluent UI 기반 사이드바](./2026-10-27-kpc-sidebar-ui.md) — 이력 보존, 이번 두 보정만 별도 실행

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 같은 NavSidebar 파일의 보정·자동 검증 완료, 시각 확인 제한 기록 | [P01](../phases/2026-10-27-sidebar-controls-profile/P01-sidebar-refinement/phase.md) |

## Tasks

| Task | Status | Summary | 주요 변경 파일 |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Fluent 패널 아이콘 교체 및 관리자 카드 기준 고정 배치 | `components/layout/NavSidebar.tsx` |

## Change Contract

| 대상 | 현재 | 구현 목표 |
| :--- | :--- | :--- |
| 데스크톱 접기 아이콘 | ChevronLeftRegular | PanelLeftContract20Regular, 표시 크기 19px |
| 데스크톱 펼치기 아이콘 | ChevronRightRegular | PanelLeftExpand20Regular, 표시 크기 19px |
| 펼친 프로필 | fit-content, 최소 152px | 폭/최소 폭/최대 폭 181.141px, 높이 49px |
| 프로필 내부 텍스트 | 내용 기준 공간 | account flex 1, minWidth 0, 긴 이름 말줄임 |
| 하단 배치 | 로그아웃 링크가 아래에 있으면 카드가 올라감 | 카드를 footer 마지막에 배치, 링크는 위, 하단 여백 12.5px |
| 접힌 프로필 | 48px × 49px | 유지 |

수평 기준은 원본 관리자 wrapper의 폭 220px 내 중앙 정렬이다. 왼쪽 약 19.43px, 아래 12.5px이며 실제 렌더링 오차는 1px 이내로 확인한다. 카드 크기 기준을 통일하되 일반/관리자/미리보기의 표시 데이터와 실제 권한은 유지한다.

## Boundaries

- 포함: NavSidebar의 아이콘 import·아이콘 스타일·프로필/flex 스타일·footer 자식 순서, 이 범위의 검증.
- 유지: 메뉴·URL·서버 인가, 셸·헤더·홈·로그인, Fluent 공급자, 패키지 버전, 기존 로그아웃, 모바일 닫기 아이콘.
- 제외: 프로필 모달·팝업, 역할 전환·샘플 데이터 변경, 새 UI 라이브러리, 앱 전체 재디자인.

## Completion Criteria

- [x] 패널 윤곽과 방향 표시가 있는 Fluent Regular 아이콘의 두 상태 분기를 구현했다. 펼친 glyph는 SSR로 확인했다.
- [x] 기존 Button 접근성·callback 및 모바일 닫기 코드를 보존했다. 실제 조작 확인은 미실시다.
- [ ] 펼친 카드의 크기·가로 위치·아래 여백이 관리자 원본 기준에 맞는다.
- [ ] 실제 세션의 로그아웃 유무·역할 문구·긴 이름이 카드 외곽 위치를 바꾸지 않는다.
- [ ] 접힌 48px 카드와 모바일의 펼친 카드가 유지된다.
- [x] 관련 기존 테스트·타입 검사·린트·프로덕션 빌드가 통과한다.
- [x] 실제 시각·조작 확인과 SSR/코드 확인 결과를 구별해 기록했다. 화면 검증 불가 항목은 체크하지 않았다.

## Execution Summary

2026-10-27 단일 Task 구현과 자동 검증 완료. 관련 테스트 43개, TypeScript, ESLint, 프로덕션 빌드 및 두 안내 URL의 HTTP·SSR 확인 통과. 변경 코드는 NavSidebar 한 파일이며 패키지·권한 정책은 유지했다.

연결된 브라우저 자동화 대상이 없어 실제 픽셀 좌표·원본 시각 비교·모바일 및 역할별 화면 조작은 미실시다. 고정 CSS·SVG/SSR·코드 확인을 실제 화면 검증으로 보고하지 않는다. 자세한 범위는 [T01 검증 제한](../phases/2026-10-27-sidebar-controls-profile/P01-sidebar-refinement/T01-toggle-and-profile.md)에 기록했다.

## Planning Rationale

두 수정 모두 NavSidebar 안에서 끝나는 작은 UI 보정이다. 단일 Task로 묶어 아이콘과 카드 배치를 함께 확인하고 한 번의 검증·커밋으로 마무리한다. 셸·인증·메뉴 데이터로 작업을 확대하지 않는다.

프로필의 고정 폭만 바꾸면 접힌 상태에서 카드가 54px 사이드바 밖으로 넘칠 수 있다. 기본 크기와 기존 접힘 media override를 함께 검토한다. 카드 아래에 로그아웃 링크를 그대로 두면 원본 하단 위치가 유지되지 않으므로 같은 보정 안에서 위쪽으로 재배치한다.
