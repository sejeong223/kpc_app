# Current Context

## Active Plan

[사용량 상세 분석과 토큰 추가 신청 모달](./plans/2026-10-27-token-usage-request-modals.md)

## Active Phase

없음 — [P01 완료](./phases/2026-10-27-token-usage-request-modals/P01-token-modals/phase.md)

## Active Task

없음 — [T02 완료 기록](./phases/2026-10-27-token-usage-request-modals/P01-token-modals/T02-token-modal-ui.md)

## Status

- P01: done2/2, 남은 Active Task 없음. 사용자의 $mea 요청 실행 완료.
- T01 82f2428: 사용량 데이터·신청 검증/상태·Provider. T02 f6ea9a1: 공용 모달·두 화면·진입/전환/신청·모바일 포커스.
- 확정 결정: [사용량 분석·토큰 신청 모달 범위](./decisions/2026-10-27-token-usage-request-modals.md)
- 일반 탭의 사용량 상세 분석/토큰 추가 신청과 Token 업무 알림에서 진입한다. Fluent Dialog 하나에서 사용량760px/신청560px으로 전환하며 모바일에서는 줄어든다.
- 사용자 승인대로 일별 비율을 유지해 합계를72.4K로 보정했다. 고정20일/31일 기준 월말 예상112220→112K, 잔여27.6K, 실제 한도100K.
- 신청은 기본50K·양의 정수 K·프로젝트·사유2자 검증 후 로컬 pending으로 등록한다. 연속 제출 방지, 최신 대기 안내와 미리보기 Toast. 요청만으로 실제 한도를 올리지 않는다.
- 모달 재진입 시 요청량/사유 초기화·프로젝트 유지. 레이아웃 메모리에서 경로/역할 변경 후 요청 유지, 전체 새로고침하면 초기화한다.
- typecheck/lint/build 및25개 파일304개 테스트 통과. 독립 Chrome의1440×900/390×844/320×568/1024×500에서 폭·스크롤·본문/푸터 접근·Tab/Escape·중복 제출·재진입·설정 회귀·경로 포커스 확인. 콘솔/hydration 오류·외부 요청 없음.
- 공용 DialogContent의 기본 음수 여백을 제거하고 본문 키보드 스크롤을 제공한다. 기존 프로필 탭 중앙 정렬/색상·avatar·스크롤바 숨김을 보존한다.
- 기존 NavSidebar 구분선 여백, ProfileGeneralTab 시연 문구 삭제, ProfileMenu 탭 정렬·선택 색상·아바타·스크롤바 수정은 기능 커밋에서 제외해 보존했다. 2026-10-27 사용자가 전체 변경사항 커밋을 요청해 후속 UI 수정과 함께 포함한다.
- 후속 UI 보정: 신청 폼 라벨11px/700/ink3 및 padding·margin0, 취소 테두리line3, 취소/신청 높이32px, 신청 비활성 빨간 배경·흰 글자·opacity0.45, 왼쪽 화살표ChevronLeft12Regular와 닫기Dismiss12Regular를12px로 적용했다.
- 후속 수정 검증: typecheck·변경된6개 TSX의 ESLint·diff check 통과. 앞선 브라우저 확인에서 비활성/hover/활성 스타일과 라벨 여백을 확인했다. UI 스타일 변경으로 업무 로직은 변경하지 않았다.
- 실제 접수/집계 API·DB·승인/거절·메일·Azure는 미연결. 서버 인증·인가·실제 세션 역할과 개발 미리보기 규칙을 유지했다. 의존성·.env·스킬은 변경하지 않았다.

## Next Step (IMPORTANT)

현재 계획의 남은 Task는 없다. 프로필에서 사용량 분석과 토큰 신청 미리보기를 확인할 수 있다. 사용자 요청에 따른 후속 UI 보정과 기존에 보존했던 UI 변경을 함께 커밋했다. 실제 신청/승인·사용량 연동이 필요하면 별도 범위를 정해 진행한다.

## Previous Plan

[사용자 프로필 팝오버와 역할 미리보기 — 완료](./plans/2026-10-27-profile-popover-preview.md)

P01 T01~T03 done3/3. T01 `7f0ac19`, T02 `65d0254`, T03 `4316aa3`. 기존 typecheck/lint/build 및24개 파일240개 테스트, 독립 Chrome의 펼침/접힘/모바일·역할·알림·설정·포커스 확인 기록은 [이전 T03](./phases/2026-10-27-profile-popover-preview/P01-profile-popover/T03-profile-popover-ui.md)에 보존한다. 이전 검증은 새 모달 검증을 대신하지 않는다. 실제 로그인·설정 저장/발송은 당시에도 미실행이었다. 이후 사용자 요청에 따른 문구삭제·탭정렬·색상·구분선 미커밋 변경을 존중한다.

[Cosmos DB 설계 스킬 프로젝트 세팅 — 완료](./plans/2026-10-27-cosmosdb-skill-setup.md)

P01-T01 완료, commit `7afc087`. 공식 원본146개+LICENSE·규칙 링크140개를 검증했고, 후속 요청에서 스킬 목록 인식과 실제 로컬 SKILL/rule 읽기도 확인했다. 이 프로필 계획에서는 Cosmos DB 스킬·서비스·프로비저닝을 변경하지 않는다.

[사이드바 접기 아이콘과 관리자 기준 프로필 배치 보정 — 구현·자동 검증 완료](./plans/2026-10-27-sidebar-controls-profile.md)

이전 UI 계획의 기록은 보존한다. 이후 사용자 직접 요청으로 메뉴 그룹·구분선의 오른쪽 패딩 12px와 사용자 제공 CollapseIcon/ExpandIcon을 적용하고 `174572d`에 커밋했다. 과거 계획의 Fluent 토글 아이콘 표기는 당시 이력이며 현재 UI를 되돌릴 근거로 쓰지 않는다.

[Fluent UI 기반 KPC 사이드바와 메뉴 이동](./plans/2026-10-27-kpc-sidebar-ui.md)

이전 실행의 실제 브라우저 확인·실계정 Azure 로그인 제한은 [이전 T03 검증 기록](./phases/2026-10-27-kpc-sidebar-ui/P01-sidebar-navigation/T03-sidebar-ui.md)에 남긴다. 이번 스킬 설치 계획과 별개이며 완료된 시각 검증으로 취급하지 않는다.

[Azure 템플릿 디자인 초기화](./plans/2026-10-26-azure-template-design-reset.md)와 [로그인·앱 셸 정정](./decisions/2026-10-26-template-shell-login-correction.md)은 기존 이력으로 보존한다.
