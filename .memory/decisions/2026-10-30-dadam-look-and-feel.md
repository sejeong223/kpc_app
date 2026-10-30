# Decisions: KPC dadam 룩앤필 단계적 적용

- Date: 2026-10-30
- Status: Confirmed
- Feature: dadam-look-and-feel
- Workflow: grill-me 인터뷰 완료. 구현과 Task 청사진은 다음 memory-plan 단계에서 진행한다.
- 출처 구분: **사용자 선택**은 인터뷰 답변, **코드 확인**은 로컬 소스에서 확인한 사실, **구현 기본값**은 선택한 범위를 구현하기 위한 설계 판단이다. 세부 수치를 사용자가 각각 선택한 것으로 취급하지 않는다.

## D01. 디자인 기준

- **Chosen**: 기본형 dadam을 기준으로 한다. 사용자 선택: 1번.
- **Rationale**: 앞선 사이드바 규격·서체 작업과 이어지는 불투명한 밝은 배경, 얇은 구분선, Fluent UI 기반 표현을 전체 대상 화면에 일관되게 적용한다.
- **Reference**: `C:/Users/김세정/Documents/GitHub/dadam_app/dadam_app/app/_components/layout/NavSidebar.tsx`, `app/FluentProviders.tsx`, `app/_styles/fluentThemeTokens.ts`. 참고 저장소 HEAD는 `9ce748fab9fd7254c7bba89984354e80e81eba0c`.
- 코드 확인: `ClientNavFrame.tsx`는 `siteConfig.ui_version === 'v2'`일 때 데스크톱에 별도 `NavSidebarV2`를 사용한다. 이번에는 기본형을 선택했으므로 V2의 유리 효과·배경 흐림·외곽 그림자·RadialLauncher를 도입하지 않는다.
- KPC의 이름·메뉴·업무 기능을 유지하며 dadam의 로고·메뉴·인증 구조를 복사하지 않는다.

## D02. 활성 메뉴와 강조색

- **Chosen**: 활성 메뉴 전용 디자인도 이번에 포함한다. 사용자 선택: 포함 1번.
- **Chosen**: 활성 메뉴·주요 버튼·코멘트 핀·멘션의 강조색을 dadam의 파란 계열로 통일한다. 사용자 선택: 1번.
- **Rationale**: 이전에 맞춘 일반 메뉴와 선택 상태, 이후 코멘트가 같은 시각 기준을 사용하게 한다.
- **코드 확인 및 구현 기본값**: 기준은 기본형 sidebar가 실제 사용하는 `webLightTheme`의 Fluent 토큰이다. `theme-basic.css`의 별도 CSS 변수 `--color-brand-primary-00: #3360FE`와 혼합하지 않는다. dadam의 `fluentThemeTokens.ts`에는 브랜드색 재정의가 없고, #3360FE 관련 Fluent 설정은 주석이다.

| 용도 | 실제 기본형 기준 토큰 | 확인한 값 |
| --- | --- | --- |
| 주요 버튼·활성 글자·강조 테두리 | colorBrandBackground / colorBrandForeground1 / colorBrandStroke1 | #0f6cbd |
| 주요 버튼 hover | colorBrandBackgroundHover | #115ea3 |
| 주요 버튼 누름 | colorBrandBackgroundPressed | #0c3b5e |
| 보조 강조 글자 | colorBrandForeground2 | #115ea3 |
| 옅은 강조 배경 / hover | colorBrandBackground2 / colorBrandBackground2Hover | #ebf3fc / #cfe4fa |
| 기본 표면 / 사이드바 | colorNeutralBackground1 / colorNeutralBackground2 | #ffffff / #fafafa |
| 메뉴 hover / 활성 배경 | colorNeutralBackground2Hover / colorNeutralBackground3 | #f0f0f0 / #f5f5f5 |
| 주 글자 / 일반 메뉴 / 보조 글자 | colorNeutralForeground1 / 2 / 3 | #242424 / #424242 / #616161 |
| 입력 테두리 / 구분선 | colorNeutralStroke1 / 2 | #d1d1d1 / #e0e0e0 |

- 구현 기본값: 오류·위험·주의·성공처럼 상태 의미가 있는 색상은 브랜드 강조색과 구분한다. 빨간색 문자열을 모두 파란색으로 일괄 치환하지 않는다. 역할·읽지 않음·사용량 차트는 각 의미를 유지하는 공통 팔레트로 정리한다.
- 이 결정은 이전 `2026-10-30-dadam-sidebar-layout-typography.md`의 활성 전용 디자인 제외와 `2026-10-29-production-pin-comments.md`의 빨간 핀 색상 기준을 **이번 대상 UI의 스타일에 한해** 대체한다.

## D03. 적용 범위와 완료 순서

- **Chosen**: 사이드바, 프로필 팝오버, 토큰 사용량 상세·추가 신청 창까지 먼저 완성하고 코멘트로 넘어간다. 사용자 선택: 3번.
- **Chosen**: 공통 기준을 만들고 대상 화면에 순차 적용한다. 로그인·일반 본문까지 전역 스타일을 즉시 바꾸는 안은 선택하지 않았다. 사용자 선택: 1번.
- **Rationale**: 사이드바에서 시작하는 화면 흐름을 먼저 일관되게 마무리하고 같은 기준을 코멘트에 재사용한다.
- 순서: 공통 스타일 기반 → 사이드바와 접힘·모바일 상태 → 프로필 팝오버의 전체 탭 → 토큰 관련 창·알림 → 해당 범위 검증·완료 → 코멘트 디자인 적용·검증.
- 이 순서는 실행 의존관계다. Phase/Task 개수와 커밋 단위는 memory-plan에서 정한다. 사이드바 계열이 미완료인 상태에서 코멘트 구현을 병행하지 않는다.

## D04. 사이드바 완성 기준

- **Chosen**: 배경·메뉴 모서리·hover·키보드 포커스·활성 표시·접기 버튼·프로필 진입 버튼까지 기본형 dadam 기준으로 정리한다.
- **Source**: 사용자 선택 D01~D03과 코드 기반 구현 기본값.
- **Rationale**: 규격과 서체만 같고 상태별 표현이 다른 현재 차이를 해소한다.
- 기존 보정값인 펼침 200px / 접힘 64px / 모바일 280px, 일반 메뉴 14px/20px/400, 아이콘 20px, 행 40px·그룹 간격 4px, 접힘 첫 메뉴 시작점 기준을 유지한다. 펼침·접힘의 구분선과 글자색 후속 변경도 출발점에 포함한다.
- 일반 메뉴는 dadam의 `borderRadiusMedium` 4px, 중립 hover를 따른다. 펼친 활성 메뉴는 중립 활성 배경·파란 글자·굵기 700·왼쪽 3px 강조와 1px 안쪽 테두리를 기준으로 한다. 접힌 활성 메뉴는 왼쪽 선 없이 안쪽 테두리와 1.06배 강조를 기준으로 한다.
- 활성/비활성 전환으로 행 높이와 후속 메뉴 위치가 변하지 않게 하며, 아이콘과 글자의 정렬에 테두리 두께를 포함해 계산한다. 토글·닫기·포커스 표시도 같은 토큰 체계를 사용한다.
- KPC의 760/761px 반응형 경계, 메뉴·권한 필터, 경로 판정, 키보드 탐색, 모바일 닫기와 스크롤 잠금은 기존 동작을 따른다. dadam의 별도 메뉴 그룹이나 모바일 헤더를 추가하지 않는다.
- 기존 flex footer와 nav 스크롤 구조를 유지한다. dadam의 absolute footer와 잘못된 collapsed padding 선언을 그대로 이식하지 않는다.

## D05. 프로필·토큰 관련 화면

- **Chosen**: 프로필 버튼과 팝오버의 일반·알림·환경설정 탭, 토큰 사용량·추가 신청 창까지 디자인을 정비한다.
- **Source**: 사용자 선택 D03; 기능 보존은 구현 기본값.
- **Rationale**: 사이드바를 통해 열리는 창마다 서체·강조색·폼 스타일이 달라지는 문제를 함께 해결한다.
- 포함: 아바타·역할 배지·읽지 않음 표시, 탭·카드·버튼·선택 컨트롤, 사용량 요약·그래프·표, 신청 폼·필드 오류·비활성 상태·승인 대기 표시, 성공 알림.
- 기존 정보·탭 구성·역할 미리보기·신청량 계산·필드 검증·초안·알림 상태·화면 전환·포커스 복귀를 보존한다. 컴포넌트를 새로 중복 구현하지 않고 기존 `ModalFrame`과 `SegmentedControl`을 재사용한다.
- 모달의 사용량 760px / 신청 560px 및 viewport 최대 크기, 작은 화면에서의 내부 스크롤·줄바꿈을 기존 동작 기준으로 유지한다. 서체 변경 때문에 생기는 잘림은 레이아웃 조정으로 해결한다.

## D06. 코멘트 단계의 범위

- **Chosen**: 코멘트는 기존 동작을 바탕으로 디자인을 정비한다. 사용 흐름 재설계는 하지 않는다. 사용자 선택: 1번.
- **Rationale**: 이미 구현된 위치 기반 대화 기능에 공통 dadam 스타일을 적용한다.
- 포함: 생성 버튼, 등록 전·진행 중·선택·완료 핀, hover 미리보기, 대화 팝업, 작성자·시각·본문·멘션, 입력창과 전송 버튼, 멘션 후보, 수정·삭제 메뉴 및 확인, 저장 오류·충돌 안내, 로딩·빈 상태·비활성 표현.
- 번호 핀과 꼬리 모양, 24px 시각 크기·44px 조작 영역, 좌표 기준·드래그, 대화 팝업의 기본 360×360 및 최소 320×240 규칙, 크기 조절과 화면 경계 처리를 보존한다. 스타일 정비를 위해 별도 코멘트 목록이나 사이드 패널을 새로 만들지 않는다.
- 핀·선택 링·멘션·전송 등의 브랜드 표현은 D02의 파란색 계열을 사용한다. 완료 상태는 중립색과 기존 상태 문구로 구별한다.
- 답글·멘션·수정·삭제·완료·재개, 본인 작성분 권한, 미등록 초안, 한글 조합 중 Enter 처리, 오류 복구·충돌 처리, 키보드·터치 이벤트를 보존한다.
- 저장소 이름·버전·스키마·식별자·좌표·기존 저장 데이터는 바꾸지 않는다. 색 이름 `red`처럼 구현 의미가 달라지는 시각 상수는 공통 브랜드 역할 이름으로 정리할 수 있지만 DB 필드 변경으로 확장하지 않는다.

## D07. 공통 스타일과 서체 설계

- **Chosen**: 스타일 값을 역할별 공통 값으로 관리하고 명시적으로 선택한 UI에 적용한다.
- **Source**: 사용자 선택 D03 및 코드 기반 설계.
- **Rationale**: 현재 직접 지정한 색상·글자 크기·굵기가 여러 파일에 흩어져 있어 상태별로 조금씩 달라진다. 이후 화면 확장 시 같은 값과 컴포넌트를 재사용해야 한다.
- 공통 토큰은 색상, 서체, 글자 크기·줄 높이·굵기, 모서리, 그림자, 여백, 포커스와 비활성 표현을 포함한다. 기존 Fluent 토큰을 우선 재사용하고 KPC 전용 역할만 보완한다.
- 로컬 Spoqa Han Sans Neo 400/500/700 파일을 재사용한다. 대상 화면 본문·입력·일반 버튼은 14px/20px/400을 기본으로 하고, 보조 정보는 12px/16px, 제목은 16px/24px와 700을 기본으로 한다. 핀 번호·작은 배지·사이드바 프로필 정보·차트 표시는 용도별 크기를 유지/조정한다. 이는 사용자 개별 선택이 아닌 구현 기본값이다.
- 650·750·800·850·900 같은 임의 굵기를 그대로 반복하지 않고 보유한 400/500/700에 맞춰 위계를 정리한다. 전역 폰트 다운로드 방식·새 폰트 의존성은 추가하지 않는다.
- 컨트롤은 Fluent medium/large 모서리와 기본 상태 스타일을 기준으로 하고, 팝오버·모달은 공통 표면 규칙으로 정리한다. 서로 다른 종류의 요소를 모두 같은 반경으로 만들지 않는다. 그림자는 Fluent shadow 계열을 재사용하고 V2의 blur는 사용하지 않는다.
- 모바일 줄바꿈·긴 이름·긴 본문·스크롤·포커스·대비·색 이외의 상태 표시도 공통 기준에 포함한다. 애니메이션 추가가 목적은 아니며 기존 reduced-motion 처리를 유지한다.

## D08. 스타일 적용 경계

- **Chosen**: 기존 전역 테마와 별도로 대상 UI에 적용할 dadam 테마/스타일 범위를 둔다. 인증·상태 Provider는 재사용한다.
- **Source**: D03의 단계적 적용 선택을 만족하기 위한 코드 기반 설계.
- **Rationale**: KPC `FluentUiProvider.workspaceTheme`에는 빨간 브랜드색과 별도 중립 선 색이 재정의되어 있다. 이를 전역에서 교체하면 이번 대상이 아닌 본문 컨트롤까지 영향을 받는다.
- Fluent UI/Griffel 체계를 유지하며 대상 UI에 공통 테마를 적용한다. 범위별 테마 적용 때문에 새로운 CSS 렌더러나 인증/프로필/코멘트 상태 Provider를 중복 생성하지 않는다.
- `TokenDialogs`는 인증 레이아웃에서 `AppShell`의 형제로 렌더링된다. sidebar만 감싸거나 부모의 font-family 상속만 바꾸는 방식으로는 충분하지 않다.
- 프로필은 inline Popover, 토큰 창은 Fluent Dialog, 알림은 Toaster를 사용한다. DOM상 다른 위치에 표시되는 포털의 DialogSurface·Toast·Tooltip까지 테마와 서체가 이어지는지 확인해야 한다. 공통 모달 스타일은 대상 사용처 기준으로 적용하고 다른 화면으로 전역 누출되지 않게 한다.
- 공통 스타일 정의를 추가하는 것과 앱 전체 화면에 즉시 적용하는 것을 구분한다. 로그인·일반 본문 화면의 재디자인은 후속 범위다.

## D09. 기능·데이터·의존성 경계

- **Chosen**: 기존 KPC 기능을 보존하는 UI 스타일 변경으로 진행한다.
- **Source**: 사용자의 룩앤필 요청·코멘트 디자인 정비 선택 및 코드 확인.
- **Rationale**: 이번 디자인 전환을 인증·저장·협업 기능 재구축과 섞지 않는다.
- 기존 Next.js App Router, React, TypeScript, Fluent UI v9, Griffel, 로컬 폰트를 사용한다. dadam의 Tailwind·framer-motion·서비스 의존성을 디자인 목적으로 추가하지 않는다.
- API 계약·로그인·권한·토큰 승인 정책·알림 발송·코멘트 동기화·DB 모델 변경은 없다. Cosmos DB 작업도 없다.
- 기존 미커밋 사이드바 후속 보정 및 memory 문서 변경을 보존한다. 현재 작업트리를 기준으로 새 계획을 세우고 이전 핀 코멘트 계획이나 다른 저장소의 Task를 다시 실행하지 않는다.

## D10. 검증과 다음 단계

- **Chosen**: 기존 지속 정책에 따라 모든 Task에서 브라우저 검증을 제외한다.
- **Source**: 사용자 지시 및 [지속 검증 정책](./2026-10-30-task-validation-policy.md).
- **Rationale**: 사용자가 정한 검증 범위를 유지하면서 코드와 기존 자동 회귀 검증으로 변경 영향을 확인한다.
- 실제 구현에서는 변경에 맞는 기존 unit/jsdom 테스트, typecheck, lint, build, 정적 스타일·테마 검토를 수행한다. CSS 값을 그대로 복제하는 테스트나 대체 명목의 브라우저 자동화는 만들지 않는다.
- 확인 대상: 대상 범위 밖 테마 보존, 펼침/접힘/모바일 메뉴, 활성 상태, 프로필→토큰 창 이동과 포커스 복귀, 폼 검증, 코멘트 초안·멘션·이동·크기 조절·완료·권한 및 저장 보존.
- 브라우저/E2E/스크린샷·육안 검증과 검증용 dev server 실행은 하지 않는다. 정적 검토를 실제 화면 검증으로 보고하지 않는다.
- 인터뷰에서는 소스 읽기와 토큰 값 확인만 했다. 테스트·lint·build를 새로 실행하지 않았으며 이번 결정 문서 외에 구현 코드·Plan·Task·current 포인터를 변경하지 않는다.
- 다음 단계는 `/memory-plan`으로 이 결정 문서를 바탕으로 순차 계획을 작성하는 것이다.

## D11. 코드에서 확인한 주요 연결

| 영역 | 확인 파일 | 설계에 주는 영향 |
| --- | --- | --- |
| 셸·탐색 | `components/layout/AppShell.tsx`, `NavSidebar.tsx`, `config/sidebar.ts` | 규격 후속 보정과 권한별 메뉴를 보존하면서 활성 스타일 확장 |
| 테마·폰트 | `components/providers/FluentUiProvider.tsx`, `app/globals.css`, `public/fonts/spoqa-han-sans-neo/` | 전역 빨간 테마와 구분된 적용 범위, 기존 폰트 재사용 |
| 프로필 | `components/profile/ProfileMenu.tsx`, `ProfileGeneralTab.tsx`, `ProfileNotificationsTab.tsx`, `ProfilePreferencesTab.tsx`, `ProfilePreviewProvider.tsx` | 탭·알림·환경설정·포커스 흐름을 재사용 |
| 토큰 | `components/profile/token/TokenDialogs.tsx`, `TokenUsagePanel.tsx`, `TokenRequestPanel.tsx`, `config/token-preview.ts`, `lib/token-preview.ts` | 사용량·신청 검증은 유지, 시각 상태와 폼 스타일 정리 |
| 공통 UI | `components/ui/ModalFrame.tsx`, `SegmentedControl.tsx`, `app/(authenticated)/layout.tsx` | 공통 스타일 재사용과 모달/알림의 테마 전파 검토 |
| 코멘트 | `components/comments/*`, `config/comments.ts`, `lib/comments/controller.ts`, `repository.ts`, `geometry.ts` | 시각 값과 기능 상태·좌표·저장소를 구분 |

## D12. 요청 밖 발견 사항과 이후 검토 후보 — 이번 범위에 추가하지 않음

- **코드 확인**: 토큰 사용량은 fixture 스냅샷이고 추가 신청은 `ProfilePreviewProvider`의 미리보기 상태에 등록된다. 실제 승인 API 연동이 구현된 것으로 표현하지 않는다. 실제 연동은 별도 사용자 결정이 필요하다.
- **코드 확인**: 코멘트는 `IndexedDbCommentRepository`를 사용한다. 동일 브라우저/사이트의 로컬 저장이며 여러 사용자·PC 간 실시간 협업을 제공하지 않는다. 서버 저장·동기화·실제 멘션 알림은 이번 디자인 범위에 추가하지 않는다.
- **후속 후보**: 로그인과 일반 본문의 제목·툴바·표·카드·검색·빈 상태를 공통 토큰으로 확장하면 앱 전체 일관성을 높일 수 있다. 이번에는 후보로만 남긴다.
- **검토 경계**: 코드 확인에서 실제 보안 취약점이나 깨진 경로를 확정하지 않았다. 기존 미리보기 기능의 제한과 발견된 결함을 혼동하지 않는다. 구현 중 별도 문제가 확인되면 근거와 함께 보고하고 범위 확대를 임의로 결정하지 않는다.

## D13. 코멘트 UI 테스트의 화면 폭 조건 보완

- **Chosen**: T04에서 기존 테스트의 사이드바 폭 조건을 펼침 200px / 접힘 64px / 모바일 0px로 보완하고 좌표 회귀를 검증한다.
- **Source**: memory-plan 중 발견 사항에 대한 사용자 답변 — “포함 — T04에서 테스트 조건과 좌표 회귀 검증 보완 (Recommended)”.
- **Rationale**: `tests/lib/comments/workspace-ui.test.ts`의 가상 surface 측정은 데스크톱 왼쪽 경계를 220px로 고정한다. 일반 좌표 계산 테스트로는 유효할 수 있지만 현재 셸의 실제 규격과 접힘 전환을 검증하지는 못한다. 세 상태의 측정값 변경과 재측정을 반영해 같은 상대 좌표의 핀 위치·팝업 경계·저장 좌표 보존을 검증한다.
- 새 Task나 브라우저 검증을 추가하지 않고 코멘트 Task 안에서 기존 jsdom 테스트를 보완한다.
