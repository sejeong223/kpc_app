# Plan: 제작 통프롬프트 편집기·슬라이드 단축키

## Status: done (4/4)

## Goal

우클릭 메뉴의 단축키 표시와 실행을 일치시키고, 일반·제조업 제작 편집기를 한 개의 자유로운 통프롬프트 입력 흐름으로 통합한다. 로컬 시연으로 기존 슬라이드 레이아웃에 내용을 배치하며 원문과 결과를 각 슬라이드에 독립적으로 저장한다. 본문 편집 권한·완료 잠금·미저장 보호·반응형 동작을 유지하고, 개별 슬라이드의 상태 변경은 실제 담당자만 허용한다.

## Confirmed Decisions

- [확정 결정](../decisions/2026-11-07-production-prompt-editor-shortcuts.md)
- [현재 코드 관찰 및 계획 검증](../reports/2026-11-07-production-prompt-editor-shortcuts-planning.md)
- 사용자는 제목/표 등 구역별 프롬프트를 원하지 않는다. 단일 텍스트 입력이 최우선 계약이다.
- ↑ 이전 / ↓ 다음 수정은 인접 문제 확인 후 사용자가 명시 승인했다.
- 버튼 리팩토링은 이번 범위에서 제외한다.
- 후속 요청: 비담당 슬라이드의 작성 상태 드롭다운은 비활성화한다. PM/관리자 권한만으로 상태 변경/고정 해제를 허용하지 않는다.
- 완료 프롬프트는 점선·회색 상자에 자물쇠와 `작성 완료 · 고정됨`을 표시하고 기본 접힘으로 둔다. 오른쪽 `프롬프트 보기`로 읽기 전용 원문을 펼치며 전송·별도 고정 해제 버튼은 표시하지 않는다. 비담당 완료 드롭다운 글자는 기존 disabled 회색 토큰을 사용한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 메뉴 단축키와 슬라이드별 통프롬프트 편집 통합 | [P01](../phases/2026-11-07-production-prompt-editor-shortcuts/P01-production/phase.md) |

## Task Boundaries

| Task | 결과 | 주요 파일 |
| :--- | :--- | :--- |
| T01 | 팝업/목록 단축키 일치, 지정 스타일 구분선·키 표시, ↑/↓ 수정 | `SlideNavigator.tsx`, 신규 `navigator-shortcuts.ts` |
| T02 | 원문과 배치 결과를 한 슬라이드에 원자 저장하는 서비스·모델 | `types/workspace-production.ts`, `config/workspace-production.ts`, `schemas.ts`, `domain.ts`, `WorkspaceProductionService.ts`, 신규 `slide-prompt.ts` |
| T03 | 하나의 통프롬프트 편집기·훅 적용, 기존 두 편집 분기 정리 | `ProductionWorkspace.tsx`, 신규 `ActiveSlideEditor.tsx`, `SlidePromptEditor.tsx`, `use-slide-prompt.ts`, 직접 대체된 두 편집기·훅 |
| T04 | 담당자 상태 변경 제한·완료 프롬프트 접기/보기·회색 표시 | `permissions.ts`, `selectors.ts`, `domain.ts`, `ProductionToolbar.tsx`, `ProductionWorkspace.tsx`, `ActiveSlideEditor.tsx`, 신규 `CompletedSlidePrompt.tsx` |

메뉴 작업은 저장 모델에 의존하지 않아 독립 검증/커밋한다. T02는 현재 UI가 계속 동작하는 호환 상태로 저장 계약을 추가한다. T03에서 그 계약을 사용해 UI를 한 번에 교체하므로 중간 Task에서도 타입 검사와 실행 경로가 성립한다. 기능 하나에 해당하므로 Phase는 하나로 유지한다.

후속 상태 권한 요구는 T04로 묶는다. 화면에서만 막으면 직접 mutation으로 변경할 수 있으므로 권한 계산과 domain 검사를 같은 Task에서 적용한다. 앞선 통프롬프트 편집 권한과 분리해 본문 편집 범위를 실수로 축소하지 않는다.

완료 프롬프트 디자인도 같은 상태 전환의 표시이므로 T04에 합친다. 작성 완료의 원문 보기와 작성 중으로 돌아가는 상태 변경을 분리하고, 중복 완료 안내 및 별도 해제 버튼을 정리한다. Task 수는 4개로 유지한다.

## Scope and Invariants

- 단일 plain-text 통프롬프트, 정확한 원문 보존, 현재 활성 슬라이드 한 장에 반영.
- 제목·본문·목록·표는 출력 `SlideContent`의 구조이지 입력 폼의 구역이 아니다.
- 로컬 배치는 결정적 시연이다. 실제 모델 호출/백엔드/토큰 차감/임의 수치 생성 없음.
- 저장 원문이 없는 예전 슬라이드는 자기 `content`에서 읽기 전용 fallback을 만든다. 기존 데이터를 일괄 변환하거나 초기화하지 않는다.
- 같은 소목차의 다른 슬라이드 원문/본문/완료 상태를 수정하지 않는다.
- 완료된 슬라이드, 보관본, 비작성 회차, 권한 없는 사용자는 본문 반영 불가. 본문 편집은 PM/관리자를 포함해 기본 편집기의 공통 권한을 적용한다.
- 개별 상태 변경/고정 해제는 실제 담당자만 허용한다. 비담당 슬라이드 상태는 보이되 드롭다운 조작은 불가이며, PM/관리자 예외도 없다. 목차 전체·프로젝트 완료 정책은 변경하지 않는다.
- 완료 원문은 기본 접힘이며 읽기 전용 펼침만 가능하다. 접힘/펼침 모두 저장 버튼 없음. 담당자의 드롭다운 전환이 개별 완료 해제 진입점이며 제작의 `고정 해제` 버튼은 제거한다.
- 완료 상자 배경/점선/disabled select는 기존 Dadam 회색 토큰을 재사용한다. 펼침 자체는 저장 내용·완료 상태·revision·undo를 바꾸지 않는다.
- 입력 중 오류/권한 변경/외부 revision 변경이 있어도 미저장 입력을 유지한다. Ctrl+S/IME/페이지 이동 보호 유지.
- 카드·절차·KPI의 3개 text block, 표의 2열 구조, Template binding, 이미지 참조/크기, 출처를 보존한다.
- 담당 테두리 2.5px, 장수 gap 8px, Dadam 폰트, 패널 반응형, 메뉴 사이드바 설정 유지.

## Out of Scope

공용 버튼 통합, 서버 AI/DB 설계, 외부 클립보드 가져오기, 설정 권한 저장 구현, 알림/로그 연동, 원본 HTML 수정, 전역 서비스/컴포넌트 정리, 패키지 추가, 배포/push.

## Validation Strategy

- 각 Task의 typecheck와 변경 파일 ESLint, 필요한 Node stdin 동작 검증. 마지막 Task에서 `npm.cmd run build`.
- 테스트 폴더/임시 테스트 파일 생성 금지. 브라우저·CUA·E2E·서버 실행·스크린샷 제외.
- 단순 스타일 수정용 테스트를 만들지 않는다. 단축키 대상/편집 잠금/원문 독립 저장/충돌·IME 같은 실제 회귀 위험을 검증한다.
- 계획 작성 시에는 문서 경로·포인터·상태·범위만 검증하며 앱 검증 결과로 보고하지 않는다.

## Execution

- 시작 포인터: [current](../current.md) → P01-T01.
- T01 → T02 → T03 → T04 순서로 실행하고 Task별 한국어 커밋 1개를 만든다.
- 완료 후 Task/Phase/Plan/current와 실행 검증 보고를 동기화한다. `current.md`의 ignore를 유지하고 강제 stage하지 않는다.

## Completion

- 2026-11-07: T01~T04 순차 구현·검증·태스크별 한국어 커밋 완료.
- [실행 검증 보고](../reports/2026-11-07-production-prompt-editor-shortcuts-validation.md).
- 공용 버튼 리팩토링 제외, DadamControls.tsx 원본 SHA256 동일 확인.
- current의 Active Task 없음. 브라우저 시각 검증 미실시.
