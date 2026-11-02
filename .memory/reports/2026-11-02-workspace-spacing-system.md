# 업무 화면 공통 여백·디자인 컴포넌트 실행 기록

- Date: 2026-11-02
- Plan: [workspace-spacing-system](../plans/2026-11-02-workspace-spacing-system.md)
- Guide: [공통 여백 및 디자인 컴포넌트 HTML](./2026-11-02-workspace-spacing-components.html)
- 기준 코드: `d07b9a2`
- 상태: T01~T04 구현·자동 검증 완료. 원격 테스트 삭제 유지 결정을 반영한 단일 병합 커밋에 포함.

## 구현 결과

| 역할 | 원본/구현 | 결과 |
| --- | --- | --- |
| 숫자 설정 | `app/layout-tokens.css` → `globals.css` | 일반 바깥/section/card 각각12px, control8px, inline4px. 오버레이는 별도 변수 |
| 외곽 | `components/layout/AppShell.tsx` | 가용 폭 전체, 단일 padding, 1320px 제한/별도 모바일64px/본문 푸터 제거 |
| 제목·메뉴 | `WorkspacePage`, `WorkspaceHeader`, `WorkspaceNavigation` | 작은 h1/액션/모바일 메뉴 통합, 긴 설명 펼침, 모든 조회 상태에서 메뉴 유지 |
| 카드·표 | `WorkspaceCard`, `WorkspaceCardSection`, `WorkspaceToolbar`, `AdminPrimitives` | inset/flush 구분. 표는 셀, 필터/pager는 Section이 패딩을 소유 |
| 일반 진입 | 홈 `/`, `/admin`, 빈 업무 메뉴 | 공통 틀 적용. 관리자 서버 가드 유지. 홈 빈 상태의 과도한 강제 높이 제거 |
| 관리자 | 사용자/그룹/CRUD, 로그, 대시보드, 모델·토큰 | 카드·grid·필터·표·페이지 이동 역할별 간격 이관 |
| Skill | 입력/조회/미리보기 외곽 | 63개 설정 필드 유지. 제출 버튼의 form 연결/미저장 확인 유지. 실측 sticky header 높이 사용 |
| Template | 목록/입력 팝업/적용 테스트 | 업로드·분석·적용·버전·재적용 동작 보존, UI 래퍼만 이관 |
| 제작 | CommentsWorkspace/Header | 캔버스 padding0/좌표 원점 유지, 도구만 공통 inset. 헤더 클릭 시 핀 생성 방지 |
| 오버레이 | ModalFrame/프로필/코멘트 | 팝업별 간격 변수 연결. 포커스 복귀·내부 스크롤·크기 정책 유지 |

## 유지보수 요점

```css
/* 수치를 바꾸는 곳은 app/layout-tokens.css 한 곳 */
--layout-page-inset: 12px;
--layout-section-gap: 12px;
--layout-card-inset: 12px;
```

- `dadamUi.cardPadding/sectionGap`은 이 CSS 변수를 참조한다. CSS `:root`에 두어 Fluent 포털에서도 값을 받는다.
- `WorkspacePage`에는 외곽 패딩을 더하지 않는다. 표가 들어가는 카드는 `bodyPadding="flush"`, 필터·pager는 `WorkspaceCardSection`을 사용한다.
- `afterHeader`는 헤더 다음 첫 Section의 상단 패딩 중복을 없앤다. 표 다음 pager Section에 넣지 않는다.
- 메뉴 state와 body overflow/inert/포커스 정책은 AppShell에 남겨두었다. context에는 ID/열림상태/토글만 전달한다.
- Skill preview sticky 위치는 `--layout-sticky-header-height` 실측값을 사용한다. 이 로컬 값은 디자인 설정 숫자나 서버 저장값이 아니다.
- UI 숫자와 PPT 규칙을 혼동하지 않는다. `config/skill-options.ts`, `lib/pptx`, 업무 스키마·서비스는 수정하지 않았다. SkillStylePreview 변경은 외곽 aside class와 제목/preview 간격뿐이며 SVG/문서 계산은 그대로다.
- 남겨 둔 수치: sidebar200/64, mobile760/761, 컨트롤 크기, 표 최소폭720, 차트/SVG 크기, 홈 장식 도형, 모달 최대 크기, 코멘트 rect 계산과 리사이즈 핸들. 해당 값은 페이지 여백 역할이 아니다.

## 검증 결과

| 단계 | 명령/검사 | 결과 |
| --- | --- | --- |
| T01 | 지정 primitive/theme 단위·jsdom | 2파일5테스트 통과 |
| T01 | typecheck/lint/build/diff | 통과 |
| T02 | route/모바일 메뉴/권한/Skill 폼/핀 통합 | 10파일78테스트 통과 |
| T02 | lint의 테스트 props 표현 수정 후 shell 재검사 | 3테스트 통과 |
| T02 | typecheck/lint/build/diff | 통과 |
| T03 | 관리자/PPT/Skill·Template 회귀 | 31파일110테스트 통과 |
| T03 | typecheck/lint/diff | 통과 |
| 최종 | `npm.cmd test` | 76파일575테스트 통과 |
| 최종 | `npm.cmd run typecheck` | 통과 |
| 최종 | `npm.cmd run lint` | 통과 |
| 최종 | `npm.cmd run build` | Next16 프로덕션 빌드 통과 |
| 문서 | HTML 중복ID/외부 asset/JS syntax | 중복 없음, 외부리소스0, 문법 통과 |
| 설정 | CSS 변수 참조 대조 | 미정의 layout 변수0 |
| 작업 트리 | `git diff --check` | 통과 |
| 원격 병합 후 | 로컬 테스트 복원·`npm.cmd test` 재실행 | 76파일575테스트 통과, 앱 소스 해시 동일 |

- 로컬 E2E 소스의 ‘모바일 제목은 메뉴 아래’ 기대를 공통 헤더 포함/비겹침으로 수정했다. 그 외 기존 업무 검사는 로컬에 보존했다. 사용자 결정으로 전체 테스트 파일은 최종 저장소에서 제외한다.
- [지속 검증 정책](../decisions/2026-10-30-task-validation-policy.md)에 따라 브라우저 E2E·수동/스크린샷·native IME/터치·검증용 dev server는 실행하지 않았다. jsdom/빌드 통과는 픽셀 배치나 실제 터치 품질을 보증하지 않는다.
- HTML 가이드는 실제 화면 캡처가 아니며 문서 예시다. CSS 값의 두 번째 원본으로 사용하지 않는다.

## 인접 발견사항

- 원격 `origin/dev`의 `bc71bf8 chore: tests 폴더 삭제`와 기존 로컬 Skill 테스트가 수정·삭제 충돌을 일으켰다. 사용자는 원격 삭제 유지와 로컬 테스트 보관을 선택했다. 앱 소스 변경 없이 충돌을 해소했다.
- 테스트가 원격에 없으므로 새 clone/CI에서는 이번 575개 테스트를 재현할 수 없다. 로컬 `tests/`와 백업에서 검증할 수 있으며, 테스트 공유 정책을 이번 변경에서 확대하지 않았다.
- 기존 Vite 설정 형식의 향후 기본 loader 경고와 `baseline-browser-mapping` 데이터 노후 경고가 발생한다. 현재 검사는 통과했으며 의존성 업데이트는 이번 여백 변경에 섞지 않았다.
- 색상/서체 전체 통합, 빈 메뉴의 업무 기능, Skill의 후속 업무 기능은 추가하지 않았다.

## 원격 연동

- 사용자 지시: 모든 Task 후 단일 커밋, 메시지에 ‘css 여백 및 공통 디자인 컴포넌트’ 포함, push까지 진행.
- 대상: `origin` (`https://github.com/sejeong223/kpc_app.git`)의 `dev`.
- 테스트 폴더 처리: 원격 삭제 유지. 로컬 `tests/`의 93개 파일을 복원하고 `.git/info/exclude`의 `/tests/`로 제외했다. 공유 `.gitignore`는 그대로다.
- 로컬 백업: `.git/local-backups/workspace-spacing-20261102-d9d0ee10/`. 테스트 93개 SHA-256 일치, 변경 앱 소스 78개가 병합 전과 동일함을 확인했다. 미해결 충돌 0개, Git 추적 테스트 0개다.
- 병합: 기존 로컬 `d07b9a2`와 원격 `bc71bf8` 이력을 모두 보존한다. 원격 변경은 테스트 삭제뿐이며 앱 소스는 이번에 검증한 상태를 유지한다.
- 커밋: 이 보고서를 포함하는 단일 병합 커밋. `git log --grep="Plan: 2026-11-02-workspace-spacing-system"`으로 조회한다.
- 전송: `origin/dev`로 일반 push한다. 실제 전송 결과와 최종 hash는 작업 완료 응답 및 로컬 `.memory/current.md`에 기록한다.
