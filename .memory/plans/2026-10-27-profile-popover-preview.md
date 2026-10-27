# Plan: 사용자 프로필 팝오버와 역할 미리보기

## Goal

하단 프로필을 누르면 기준 HTML과 같은 작은 팝오버가 열리고, `일반`·`업무 알림`·`환경 설정` 탭을 이용할 수 있게 한다. 세그먼트 선택 컨트롤과 ON/OFF 스위치는 공용 컴포넌트로 만든다. 인증 비활성 환경에서는 일반 사용자·관리자를 선택하면 프로필과 사이드바 메뉴가 함께 바뀐다.

사용자의 `$mea` 요청으로 순차 실행 중이다. T01 공용 컨트롤 구현·코드 검증을 완료했으며 T02와 T03을 이어서 진행한다. Azure와 실제 인증은 연결하지 않는다.

## Source Decisions

- [확정 요청과 적용 범위](../decisions/2026-10-27-profile-popover-preview.md)
- HTML: `C:\Users\김세정\Downloads\KPC_제안서작성AI_mock-up.html`
- 제목: `KPC 제안서 작성 AI · v12 메뉴 개편안`
- SHA-256: `1476c88df1ec5263f91a5549039f4c9804b044861ea5147461b544ca819841db`
- 최종 기준: CSS `.pf`·`.seg`·`.pf-tg`, `profilePopHtml` 및 `PROF`, `gnbBuild`. `const GNB` 안의 이전 popup 문자열만 보고 구현하지 않는다.
- 사용자 첨부 이미지: 회색 바탕·흰 선택 영역의 `본문 / 슬라이드` 컨트롤, 빨간 ON 트랙·흰 손잡이의 스위치.
- 추가 답변: **3개 탭·역할 전환·알림/설정의 로컬 동작까지 구현하고, 상세 분석·신청은 안내만 표시**.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 공용 컨트롤, 역할 미리보기, HTML 기준 프로필 팝오버 | [P01](../phases/2026-10-27-profile-popover-preview/P01-profile-popover/phase.md) |

## Tasks

| Task | Status | 관찰 가능한 결과 | 주요 파일 |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 재사용 가능한 세그먼트 선택·ON/OFF 스위치 | `components/ui/SegmentedControl.tsx`, `components/ui/ToggleSwitch.tsx` |
| T02 | `in_progress` | 로컬 프로필 상태와 역할에 따른 메뉴·미리보기 화면 연동 | `config/profile-preview.ts`, `lib/profile-preview.ts`, `components/profile/ProfilePreviewProvider.tsx`, `components/profile/PreviewRoleBoundary.tsx`, `config/sidebar.ts`, 앱 레이아웃·workspace 페이지, 관련 테스트 |
| T03 | `pending` | 하단 프로필에서 열리는 3탭 팝오버와 모바일·키보드 통합 | `components/profile/ProfileMenu.tsx`, 탭 컴포넌트 3개, `NavSidebar.tsx`, `AppShell.tsx`, `README.md` |

## UI Contract

- Fluent UI v9의 기존 설치를 사용한다: `@fluentui/react-components` `9.74.11`, `@fluentui/react-icons` `2.0.344`, `@griffel/react` `1.7.8`. 버전·패키지는 변경하지 않는다.
- 신규 UI는 TSX 내부 `const useStyles = makeStyles(...)`와 `mergeClasses`로 스타일을 정의한다. `.module.css`나 전역 스타일 파일을 추가하지 않는다.
- 프로필 트리거의 펼침 크기 `181.141 × 49px`, 접힘 너비 `48px`와 기존 footer 위치를 유지한다. 실제 버튼으로 바꿔 Enter·Space로도 팝오버를 연다.
- 팝오버는 기본 너비 `348px`, 높이 `min(620px, calc(100svh - 86px))`, 반경 `14px`다. 프로필 위 `8px` 간격에 왼쪽 정렬하고 화면 밖으로 나갈 때 viewport 안으로 조정한다. 작은 화면에서는 너비를 `calc(100vw - 16px)` 이하로 제한한다.
- 헤더: 아바타·정소담·역할 배지·소속·이메일·닫기. 탭 높이 `38px`, 활성 탭 빨간 글자와 아래 선. 본문만 세로 스크롤하고 헤더·탭·footer는 고정한다.
- 일반: AI Token 사용량·통계·액션, 내 작업 3개, 권한 테스트. 관리자일 때만 전사 토큰·비용 관리 링크.
- 업무 알림: 전체/안 읽음, 모두 읽음, 알림 카드 4개, 미확인 건수·읽음 반영·빈 상태.
- 환경 설정: 알림 스위치 6개, 요약 메일 선택, 시작 화면·작성 화면·목록 보기 세그먼트 3개.
- 공용 컨트롤은 `SegmentedControl<T extends string>`와 `ToggleSwitch` 두 종류로 구분한다. 탭 UI 자체는 Fluent `TabList`/`Tab`을 쓴다.

## State & Role Contract

- 초기 역할은 HTML의 `S.role = 'admin'`에 맞춰 `admin`. `user`를 선택하면 일반 메뉴 7개, `admin`을 선택하면 총 15개를 표시한다. 이름은 그대로이고 역할 배지·아바타 색·팝오버 선택도 함께 바뀐다.
- 역할·환경 설정·읽음 상태·선택한 프로필 탭은 앱 레이아웃의 전용 Provider에 저장한다. 팝오버를 닫거나 클라이언트 메뉴 이동을 해도 유지하고, 전체 새로고침 시 초기화한다. localStorage·쿠키·세션·DB에는 저장하지 않는다.
- 인증 비활성 상태의 관리자 안내 화면에서 일반 사용자로 바꾸면 내용을 즉시 가리고 `/workspace/pipeline`으로 `router.replace`한다. 주소 직접 변경·뒤로 가기에도 같은 클라이언트 미리보기 규칙을 적용한다. 새로고침은 초기 관리자 미리보기로 돌아간다.
- 이 로컬 상태는 인증/인가가 아니다. `AUTH_ENABLED=true`에서는 실제 세션 역할이 우선하고 역할 전환은 비활성화한다. 서버 `requireAppAccess`, `requireRole`, 기존 `/admin` 정책은 보존한다.
- 알림·사용량·작업 수는 고정된 시연 데이터다. 명시적인 시연 표시를 두고 실제 집계·발송·승인인 것처럼 표시하지 않는다.
- 작성 화면·목록 화면은 아직 안내 화면이므로 해당 기본값은 선택 상태까지만 유지한다. 기존 홈 이동·실제 편집기 기능을 새로 만들지 않는다.

## Boundaries

포함:

- 3개 탭의 화면과 로컬 상호작용, 재사용 컨트롤, 일반/관리자 메뉴 연동
- 기존 안내 URL에 연결 가능한 이동, 상세/신청 버튼의 준비 중 안내
- 인증 활성 시 기존 실로그아웃 연결 보존, 비활성 시 시연 로그아웃 안내
- 팝오버 열기/닫기·포커스·Escape·외부 클릭·모바일 통합 검증

제외:

- 사용량 상세 화면·토큰 신청 폼·승인 로직·추가 팝업
- 실제 알림 조회·메일 발송·설정 API·사용량 집계·프로젝트/의견 데이터 연동
- Azure 로그인 구현·DB 컨테이너·서버 권한 변경·실제 역할 부여
- 본문/슬라이드 편집기, 검토 목록의 실제 표/보드, 새 관리자 업무 화면
- 사이드바 아이콘·메뉴 순서·구분선·홈의 추가 디자인 변경

## Regression Points

1. 팝오버의 3개 탭과 세그먼트 선택은 의미가 다르다. TabList는 탭 패널에, RadioGroup은 단일 값 선택에 사용해 키보드와 접근성 역할을 보존한다.
2. Fluent Switch 기본 트랙은 `40 × 20px`, 기본 checked 이동량은 이 너비를 따른다. `34 × 20px`와 손잡이 `16px`로 바꾸면 입력 영역과 이동량 `14px`, checked/hover 색까지 함께 맞춘다.
3. 모바일 `AppShell`은 document에서 Tab/Escape를 처리하며 현재 버튼·링크만 순회한다. 팝오버의 input/select를 가두거나 Escape 한 번으로 둘 다 닫지 않도록 T03에서 통합한다.
4. 접힘 CSS의 `[data-sidebar-label]`은 하위 전체에 적용된다. 팝오버 본문에는 이 속성을 붙이지 않아 탭·설정 라벨이 사라지지 않게 한다.
5. 인증 활성 권한 판정은 서버에서 유지한다. 테스트용 role을 Session이나 AuthRuntime에 덮어쓰지 않는다.
6. 계획 시작 시 `NavSidebar.tsx`에 구분선 좌우 `6px`·`width: auto`의 기존 미커밋 수정이 있다. 삭제·되돌림·별도 디자인 변경을 하지 않고 보존한다. 추후 Task 커밋은 해당 기존 hunk를 자동으로 포함하지 않는다.

## Completion Criteria

- [ ] T01 공용 컨트롤을 역할·필터·환경 설정에서 재사용한다.
- [ ] T02 로컬 역할과 메뉴가 일치하고 인증 활성 가드는 유지된다.
- [ ] T03 HTML의 최종 3개 탭과 프로필 앵커·스크롤·푸터를 재현한다.
- [ ] 준비 중 버튼·시연 데이터·새로고침 초기화 범위가 명확하다.
- [ ] 펼침/접힘·모바일·낮은 화면·키보드·라우트 전환을 실제 브라우저에서 확인하고 결과를 구분해 기록한다.
- [ ] 관련 단위 테스트·typecheck·lint·build를 Task 청사진에 따라 통과한다.
- [ ] 각 Task를 한국어 커밋 하나로 저장하고 current를 차례로 전진한다.

## Granularity Rationale

단일 UI 기능이므로 Phase는 하나다. 공용 컨트롤은 프로필에 의존하지 않고 컴파일 가능하며, 로컬 상태·역할 경계는 순수 함수 테스트와 기존 서버 가드 테스트로 독립 검증할 수 있다. 마지막 Task에서 실제 팝오버와 모바일 입력을 함께 연결해 중간에 잘못된 포커스 처리를 남기지 않는다.

## Adjacent Findings

모바일 포커스 순회와 접힘 라벨 범위는 이번 팝오버가 정상 작동하는 데 필요한 부분이므로 T03에 포함한다. 이번 조사에서 별도 범위 확장이 필요한 새로운 인접 결함은 확인하지 않았다. 기존 Cosmos DB 설정 비교·audit 등 다른 주제는 이 계획에 추가하지 않는다.
