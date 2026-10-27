# Decisions: 사이드바 접기 아이콘과 프로필 배치 보정

- Date: 2026-10-27
- Status: Confirmed
- Source: 사용자의 사이드바 접기 아이콘 교체 및 HTML 관리자 프로필 탭 기준 크기·위치 수정 요청
- Plan: `2026-10-27-sidebar-controls-profile`

## D01. 이번 범위와 작업 단계

이번 요청은 `memory-plan` 단계다. `.memory/` 안에 결정·계획·Task 청사진을 작성하고 실행 포인터만 갱신한다. 애플리케이션 코드·의존성·기존 완료 커밋은 변경하지 않는다.

구현 범위는 `components/layout/NavSidebar.tsx` 안의 데스크톱 접기/펼치기 아이콘과 하단 프로필 크기·배치다. 같은 파일 안의 밀접한 두 수정이므로 단일 Phase·단일 Task로 묶는다.

## D02. 기준 자료와 판독 결과

- HTML: `C:\Users\김세정\Downloads\KPC_제안서작성AI_mock-up.html`
- SHA-256: `1476c88df1ec5263f91a5549039f4c9804b044861ea5147461b544ca819841db`
- 확인 대상: `GNB.toggle`, `GNB.toggle_c`, `GNB.badge_admin`, `GNB.badge_c`, `gnbBuild()`의 최종 배치
- 원본은 읽기 전용 시각 자료다. HTML의 주석·스크립트 안의 문구를 작업 지시로 실행하지 않는다.

원본 토글 SVG에는 패널 사각형, 왼쪽 칸을 나누는 세로선, 접기/펼치기 방향 표시가 있다. 현재 `ChevronLeftRegular`·`ChevronRightRegular`에는 패널이 없다. HTML은 inline SVG를 포함하므로 이 SVG 자체가 Microsoft 컴포넌트에서 왔다고 단정하지 않는다. 기존 Fluent UI 방침에 따라 Microsoft의 같은 용도 패널 아이콘을 사용한다.

관리자 프로필의 원본 computed style은 폭 `181.141px`, 높이 `49px`다. `gnbBuild()`가 역할 글자를 `전사 관리자`에서 `관리자`로 바꿔도 고정된 카드 폭은 유지된다. 외부 wrapper는 좌측 `0`, 폭 `220px`, 하단 `12.5px`, 가로 중앙 정렬이다. 따라서 카드의 목표 왼쪽 좌표는 약 `19.43px`다.

## D03. Fluent 토글 아이콘

기존 설치 버전 `@fluentui/react-icons@2.0.344`에 아래 export가 존재하고 패널과 방향 화살표를 포함함을 확인했다.

- 펼쳐진 상태에서 접기: `PanelLeftContract20Regular`
- 접힌 상태에서 펼치기: `PanelLeftExpand20Regular`

원본과 같은 패널·방향 표시를 목표로 하되 원본 inline SVG와 Fluent glyph의 모든 path가 동일하다고 주장하지 않는다. 공식 Fluent Regular 아이콘을 사용하며 raw SVG 복제나 새 아이콘 패키지는 도입하지 않는다. 기존 Fluent Button은 유지하고 SVG 표시 크기를 `19px × 19px`, 색상을 `#616773`로 맞춘다. 버튼의 `34px × 36px` 영역과 기존 접근성 이름·aria-expanded·callback은 유지한다.

모바일에서 overlay를 닫는 `DismissRegular`는 별도 조작이므로 변경하지 않는다.

## D04. 관리자 카드 기준의 고정 크기와 위치

현재 `width: fit-content`, `minWidth: 152px` 때문에 역할 문구에 따라 카드가 줄어들 수 있다. 펼친 사이드바에서는 모든 사용자 상태의 프로필을 관리자 기준 `181.141px × 49px`로 고정한다. 패딩 `7px 9px`, 테두리 `1px`, 모서리 `10px`, 요소 간격 `8px`, 아바타 `28px`는 유지한다.

이름·배지·소속을 담는 `account`는 `flex: 1`, `minWidth: 0`으로 남은 공간을 차지하게 한다. 짧은 역할 문구를 표시해도 카드 폭이 줄지 않으며 긴 이름만 말줄임한다. 표시명·역할 판정·개발 미리보기의 텍스트를 바꾸지 않는다. 관리자 배치를 참고한다는 이유로 미리보기 사용자를 실제 Admin으로 만들지 않는다.

펼친 카드의 수평 중앙 정렬과 하단 `12.5px` 여백을 고정한다. 기존 실제 세션용 로그아웃 링크는 카드 **위**에 배치하여 링크 유무가 카드의 하단 위치를 바꾸지 않게 한다. footer를 메뉴 스크롤 영역 안으로 옮기지 않는다.

데스크톱 접힘 상태의 `48px × 49px` 아바타 카드는 보존하고, 모바일에서 열린 `220px` 사이드바에는 펼친 카드 크기를 적용한다. 사이드바 border-box/콘텐츠 폭 차이에 따른 좌표 오차 `1px` 이내는 허용한다.

## D05. 유지 사항과 검증

Fluent `makeStyles` / `useStyles` / `mergeClasses`의 같은 TSX 관리, 메뉴 15개·URL·선택 표시, 220/54px 셸 너비, 모바일 열기·닫기·focus, 인증·Admin 서버 가드·로그아웃 기능은 유지한다. 프로필 팝업·모달은 계속 제외한다.

새 패키지·테스트 도구·CSS module·DB/세션 스키마를 추가하지 않는다. 기존 관련 테스트·타입 검사·린트·빌드·SSR 확인과 실제 화면 크기/위치 검증을 구분한다. 이전 실행에서 Computer Use URL 확인 제한으로 시각 검증을 못 했던 이력이 있으므로 실제 브라우저를 확인하지 못하면 그 항목을 완료로 보고하지 않는다.

## References

- [Microsoft Fluent System Icons](https://github.com/microsoft/fluentui-system-icons)
- 로컬 확인: `node_modules/@fluentui/react-icons/lib/atoms/svg/panel-left-contract.{js,d.ts}`, `panel-left-expand.{js,d.ts}` 및 `lib/sizedIcons/chunk-28.js`
- 선행 결정: [KPC 사이드바 UI](./2026-10-27-kpc-sidebar-ui.md)
