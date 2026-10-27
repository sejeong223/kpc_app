# Plan: Fluent UI 기반 KPC 사이드바와 메뉴 이동

## Goal

제공받은 HTML의 최종 좌측 사이드바를 Fluent UI v9로 구현한다. 일반 메뉴 7개와 관리자 메뉴 8개의 순서·모양, 접기·펼치기, 하단 프로필 표시를 재현하고, 메뉴별 URL에서 간단한 안내 문구를 보여준다. 프로필 팝업과 업무 기능은 구현하지 않는다. 이번 계획 작성 단계의 산출물은 `.memory/` 문서뿐이다.

## Source Decisions

- [확정 범위·메뉴 판독·Fluent UI·개발 미리보기 정책](../decisions/2026-10-27-kpc-sidebar-ui.md)
- 기준 파일: `C:\Users\김세정\Downloads\KPC_제안서작성AI_mock-up.html`
- SHA-256: `1476c88df1ec5263f91a5549039f4c9804b044861ea5147461b544ca819841db`
- 기존 로그인·앱 진입 정책: [템플릿 셸과 로그인 정정](../decisions/2026-10-26-template-shell-login-correction.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 구현·자동 검증 완료; 실제 브라우저 시각·조작 검증 제한 기록 | [P01](../phases/2026-10-27-kpc-sidebar-ui/P01-sidebar-navigation/phase.md) |

## Task Roadmap

| Task | 결과 | 주요 파일 |
| :--- | :--- | :--- |
| T01 | Fluent UI 의존성·테마·App Router SSR 준비 | `package.json`, `package-lock.json`, `components/providers/FluentUiProvider.tsx`, `app/(authenticated)/layout.tsx` |
| T02 | 15개 메뉴 카탈로그, URL별 안내 화면, 관리자 서버 가드 | `config/sidebar.ts`, `app/(authenticated)/workspace/[screen]/page.tsx`, 관련 단위 테스트 |
| T03 | 최종 사이드바 UI, 접힘·모바일, 헤더 연동 및 전체 검증 | `components/layout/{NavSidebar,AppShell,AppHeader}.tsx`, `config/app.ts`, `tests/config/app.test.ts`, `README.md` |

## Menu and Route Contract

각 URL은 `/workspace/[screen]` 한 서버 페이지로 처리한다. 데이터와 내용이 동일 형식인 초기 화면이므로 페이지 파일을 15개로 복제하지 않는다.

| 구분 | screen | 메뉴명 | URL | 본문 |
| :--- | :--- | :--- | :--- | :--- |
| 기본 | register | RFP 등록 | `/workspace/register` | RFP 등록 화면입니다. |
| 기본 | pipeline | 검토 목록 | `/workspace/pipeline` | 검토 목록 화면입니다. |
| 프로젝트 | analysis | AI 분석 | `/workspace/analysis` | AI 분석 화면입니다. |
| 프로젝트 | files | 파일 업로드 | `/workspace/files` | 파일 업로드 화면입니다. |
| 프로젝트 | toc | 목차 | `/workspace/toc` | 목차 화면입니다. |
| 프로젝트 | setup | 제작 설정 | `/workspace/setup` | 제작 설정 화면입니다. |
| 프로젝트 | write | 제작 | `/workspace/write` | 제작 화면입니다. |
| 관리자 | prompt-sets | 프롬프트 세트 | `/workspace/prompt-sets` | 프롬프트 세트 화면입니다. |
| 관리자 | skills | Skill | `/workspace/skills` | Skill 화면입니다. |
| 관리자 | templates | Template | `/workspace/templates` | Template 화면입니다. |
| 관리자 | policy | 운영 정책 | `/workspace/policy` | 운영 정책 화면입니다. |
| 관리자 | tokens | 토큰·비용 관리 | `/workspace/tokens` | 토큰·비용 관리 화면입니다. |
| 관리자 | users | 사용자 설정 | `/workspace/users` | 사용자 설정 화면입니다. |
| 관리자 | dashboard | 대시보드 | `/workspace/dashboard` | 대시보드 화면입니다. |
| 관리자 | audit | 활동 로그 | `/workspace/audit` | 활동 로그 화면입니다. |

## UI Contract

- 상단: `KPC | 제안서 AI`, 사이드바 접기·펼치기 버튼
- 너비: 펼침 220px, 접힘 54px; 배경 `#fafafa`, 오른쪽 경계 `#e6e7eb`
- 펼친 메뉴: 작은 텍스트 메뉴, 선택 배경 `#fff0f2`, 글자 `#cc1930`, 왼쪽 빨간 inset 선
- 접힌 메뉴: Fluent 아이콘, 같은 선택 상태, 메뉴명 툴팁 및 접근성 이름
- 구분선은 기본/프로젝트 사이와 프로젝트/관리자 사이에만 표시하며 그룹 제목은 화면에 출력하지 않는다.
- 프로필: 하단에 아바타·이름·권한 배지·소속·장식 요소만 표시한다. 클릭 팝업·모달은 없다.
- 각 컴포넌트의 스타일은 해당 TSX의 `makeStyles` / `useStyles` / `mergeClasses`로 관리한다.
- 중앙 홈은 유지한다. 헤더는 선택한 메뉴명을 보여주되 프로젝트 선택기나 원본 상단 업무 바는 만들지 않는다.

## Authentication Contract

| 환경/사용자 | 메뉴 | 신규 안내 화면 |
| :--- | :--- | :--- |
| 인증 비활성 | 전체 15개 | 모두 미리보기 허용, 서버 서비스 호출 없음 |
| 인증 활성·미로그인/역할 없음 | 셸 진입 불가 | 기존 로그인·계정 전환 흐름 |
| 인증 활성·User | 일반 7개 | 관리자 8개 직접 접근도 서버에서 거부 |
| 인증 활성·Admin | 전체 15개 | 관리자 화면은 `requireRole` 통과 후 표시 |

기존 `/admin`은 별도의 관리자 예시다. 이 라우트와 `requireRole` 자체의 인증 비활성 404 규칙을 신규 UI 미리보기를 위해 바꾸지 않는다.

## Boundaries

포함: Fluent UI 의존성·테마·SSR, 사이드바와 필요한 셸·헤더 수정, 메뉴별 안내 화면, 서버 인가·메뉴 데이터 검증, 사용법 문서.

제외: 프로필 모달과 내부 메뉴, 실제 업무·AI·업로드·DB 기능, 프로젝트 선택·잠금·상태 관리, 전체 HTML 복사, 새 인증 권한 전환 UI, 기존 화면 전체의 스타일 재작성, Next.js/React 업그레이드, 기존 audit 취약점 조치.

이전 `dadam_app` 참고 전면 스타일 변경 요청은 중단한다. 이번 Fluent 적용은 사용자가 새로 지정한 사이드바와 그 통합에 필요한 범위로 한정한다.

## Completion Criteria

- [x] 모든 Task의 구현·자동 검증과 한국어 커밋을 완료했다. 실제 브라우저 확인 제한은 T03에 기록했다.
- [ ] 15개 메뉴의 순서·라벨·구분선과 펼침/접힘 UI가 원본 최종 결과와 일치한다.
- [ ] 각 메뉴의 URL·헤더명·안내 문구가 일치하고 직접 접속·새로고침·뒤로/앞으로가 동작한다.
- [ ] 인증 비활성 전체 미리보기와 인증 활성 관리자 서버 인가가 모두 검증된다.
- [x] 프로필은 모달 트리거·이벤트가 없는 표시 영역이며 기존 세션 로그아웃만 별도 유지한다. 실제 클릭 조작 검증은 미실시다.
- [ ] 모바일·작은 높이에서도 모든 메뉴와 프로필에 접근 가능하다.
- [x] Fluent UI SSR과 CSS module 부재를 확인했다. 클라이언트 이동 후 스타일은 실제 UI 검증 제한으로 미확인이다.
- [x] 전체 테스트·TypeScript·ESLint·인증 비활성 프로덕션 빌드가 통과한다.
- [x] 기존 로그인·Azure 서비스·관리자 예시·패키지 식별자 정책이 보존된다.

## Execution Summary

2026-10-27 T01~T03 구현과 자동 검증 완료. 테스트 202개, 타입 검사, 린트, 프로덕션 빌드 및 15개 메뉴 HTTP 검증 통과. Fluent barrel import 최적화 후 개발 서버 응답도 확인했다.

Windows Computer Use 자동 검토가 Chrome의 현재 URL을 확인하지 못해 화면 자동화를 중단했다. 실제 화면 모양·반응형·클라이언트 조작·이동 후 스타일 및 실계정 로그인은 검증하지 못했다. 위 시각·조작 완료 조건은 미확인 상태로 남기며 [T03 제한 기록](../phases/2026-10-27-kpc-sidebar-ui/P01-sidebar-navigation/T03-sidebar-ui.md)을 따른다.

## Technical References

- [Griffel App Router SSR](https://griffel.js.org/react/guides/ssr-usage/) — 요청별 renderer, `useServerInsertedHTML` 스타일 출력과 중복 방지
- [Griffel makeStyles](https://griffel.js.org/react/api/make-styles/) — 같은 TSX에서 객체로 스타일 정의
- [Fluent UI React 공식 저장소](https://github.com/microsoft/fluentui/tree/master/packages/react-components) — v9 컴포넌트·타입

2026-10-27 npm registry 조회 기준 실행 계획은 `@fluentui/react-components@9.74.11`, `@fluentui/react-icons@2.0.344`, `@griffel/react@1.7.8`을 정확한 버전으로 추가한다. 확인한 peer 범위는 현재 React 19를 허용하므로 Next.js·React 변경을 전제로 하지 않는다.
