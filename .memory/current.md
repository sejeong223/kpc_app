# Current Context

## Active Plan

[사용자 프로필 팝오버와 역할 미리보기](./plans/2026-10-27-profile-popover-preview.md)

## Active Phase

[P01 사용자 프로필 팝오버와 역할 미리보기](./phases/2026-10-27-profile-popover-preview/P01-profile-popover/phase.md)

## Active Task

[T03 HTML 기준 프로필 팝오버와 3개 탭 구현](./phases/2026-10-27-profile-popover-preview/P01-profile-popover/T03-profile-popover-ui.md)

## Status

- T01 공용 컨트롤, T02 프로필 상태·역할 경계 구현·검증 완료
- P01: done 2/3, Active Task T03 in_progress
- 확정 결정: [프로필 팝오버·공용 토글·역할 미리보기 범위](./decisions/2026-10-27-profile-popover-preview.md)
- 기준 HTML의 최종 프로필 팝오버: 일반·업무 알림·환경 설정 3탭
- 사용자 확인: 상세 분석·토큰 신청은 안내만 표시, 역할 전환·알림 읽음·설정은 로컬 동작
- 공용 SegmentedControl/ToggleSwitch, 기존 Fluent UI v9·TSX 내부 makeStyles 사용
- 인증 비활성 최초 admin, 일반 사용자 선택 시 일반7/관리자 선택 시 전체15개 메뉴. 실제 인증 활성 시 세션 역할 우선
- 상태는 레이아웃 Provider 메모리로 유지, 전체 새로고침 초기화. DB·쿠키·localStorage 저장 없음
- 기존 NavSidebar 구분선 좌우6px·width auto 미커밋 변경을 보존하며 Task 변경에 자동 포함하지 않는다
- 사용자의 `$mea` 요청으로 순차 실행 중. T01·T02 완료 후 T03을 자동으로 이어간다. 의존성 설치·Azure 연결은 하지 않는다.

## Next Step (IMPORTANT)

T03 청사진을 읽고 ProfileMenu와 일반·업무 알림·환경 설정 패널을 구현한다. T01 공용 컨트롤과 T02 Provider를 사용하며 NavSidebar footer·AppShell 모바일 포커스를 함께 연결한다. 검증 결과와 실제 화면 확인 제한을 구분해 기록한다.

## Previous Plan

[Cosmos DB 설계 스킬 프로젝트 세팅 — 완료](./plans/2026-10-27-cosmosdb-skill-setup.md)

P01-T01 완료, commit `7afc087`. 공식 원본146개+LICENSE·규칙 링크140개를 검증했고, 후속 요청에서 스킬 목록 인식과 실제 로컬 SKILL/rule 읽기도 확인했다. 이 프로필 계획에서는 Cosmos DB 스킬·서비스·프로비저닝을 변경하지 않는다.

[사이드바 접기 아이콘과 관리자 기준 프로필 배치 보정 — 구현·자동 검증 완료](./plans/2026-10-27-sidebar-controls-profile.md)

이전 UI 계획의 기록은 보존한다. 이후 사용자 직접 요청으로 메뉴 그룹·구분선의 오른쪽 패딩 12px와 사용자 제공 CollapseIcon/ExpandIcon을 적용하고 `174572d`에 커밋했다. 과거 계획의 Fluent 토글 아이콘 표기는 당시 이력이며 현재 UI를 되돌릴 근거로 쓰지 않는다.

[Fluent UI 기반 KPC 사이드바와 메뉴 이동](./plans/2026-10-27-kpc-sidebar-ui.md)

이전 실행의 실제 브라우저 확인·실계정 Azure 로그인 제한은 [이전 T03 검증 기록](./phases/2026-10-27-kpc-sidebar-ui/P01-sidebar-navigation/T03-sidebar-ui.md)에 남긴다. 이번 스킬 설치 계획과 별개이며 완료된 시각 검증으로 취급하지 않는다.

[Azure 템플릿 디자인 초기화](./plans/2026-10-26-azure-template-design-reset.md)와 [로그인·앱 셸 정정](./decisions/2026-10-26-template-shell-login-correction.md)은 기존 이력으로 보존한다.
