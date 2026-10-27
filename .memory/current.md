# Current Context

## Active Plan

[사용량 상세 분석과 토큰 추가 신청 모달](./plans/2026-10-27-token-usage-request-modals.md)

## Active Phase

[P01 사용량 분석·토큰 신청 모달](./phases/2026-10-27-token-usage-request-modals/P01-token-modals/phase.md)

## Active Task

[T02 공용 모달과 사용량·토큰 신청 화면](./phases/2026-10-27-token-usage-request-modals/P01-token-modals/T02-token-modal-ui.md)

## Status

- T01 구현·검증 완료. P01: done 1/2, active T02. typecheck/lint 및 토큰·프로필·역할 경계96개 테스트 통과.
- 확정 결정: [사용량 분석·토큰 신청 모달 범위](./decisions/2026-10-27-token-usage-request-modals.md)
- 이전의 상세 분석·신청 안내만 표시 결정을 이번 두 모달 범위에 한해 대체한다. 기존 역할/알림/설정은 보존한다.
- 사용자 확인: 일별 값의 비율을 유지하면서 합계를 상단·프로젝트와 같은72.4K로 보정한다. 고정 집계20일/31일, 월말 예상112220→112K.
- 공용 ModalFrame(Fluent Dialog), SegmentedControl chips, TSX makeStyles. 사용량760px/신청560px, 좁은 화면은 가변폭, 본문 스크롤바 숨김.
- 추가 신청은 +30K/+50K/+100K/직접입력·프로젝트·사유 검증, 로컬 pending 내역·Toast까지. 기본50K/재진입 사유초기화/프로젝트유지. 승인 전 실제 한도100K는 증가시키지 않는다.
- 인증 레이아웃 Provider 메모리로 상태 유지, 전체 새로고침 초기화. 실제 신청 API/DB·승인/거절·메일·Azure 연결은 후속 범위다. 서버 가드·실제 세션 역할·개발 역할 미리보기 규칙을 바꾸지 않는다.
- ProfileMenu를 닫은 다음 모달을 열고 AppShell과 형제인 컨트롤러를 유지한다. 모바일 Tab/Escape 가드·body 잠금·포커스 복귀를 확인한다.
- 기존 미커밋 UI 3개 보존: NavSidebar.tsx 3삽입/2삭제, ProfileGeneralTab.tsx 0삽입/2삭제, ProfileMenu.tsx 25삽입/9삭제. 기존 변경을 자동 stage/commit하지 않는다.
- 탭 grid 중앙 정렬·선택 빨간 글자/밑줄·관리자 빨간 avatar/badge·팝업 검정 avatar/흰 글자·삭제된 시연 문구·구분선 좌우6px 변경을 유지한다.
- T01에서 Provider API까지 추가했다. 새 모달의 실제 DOM·모바일·키보드 동작은 T02에서 검증한다.

## Next Step (IMPORTANT)

T02 청사진을 읽고 공용 ModalFrame·사용량/신청 패널·프로필 진입을 구현한다. 사용자의 `$mea` 요청에 따라 확인 질문 없이 남은 Task를 자동 진행한다. T02 검증 후 한국어 커밋과 완료 포인터를 남긴다.

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
