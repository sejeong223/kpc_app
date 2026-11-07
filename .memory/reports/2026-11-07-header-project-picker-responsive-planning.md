# 헤더 프로젝트 선택 반응형 — 계획 검토 기록

- Date: 2026-11-07
- Baseline: 6d459e7, branch dev; 조사 시작 시 git status clean.
- 이번 기록은 코드 조사 결과다. 브라우저에서 현상을 재현하거나 화면을 측정하지 않았다.
- Skill: .agents/skills/memory-plan/SKILL.md; 계획 단계 구현 금지 준수.

## 원인 근거

| 위치 | 현재 코드 | 영향 |
| :--- | :--- | :--- |
| components/common/ProjectHeader.tsx:29 | selector width560px, maxWidth100%, 760px 이하 width100% | 상위 공간이 줄어들어도 지정된 너비를 기준으로 배치 |
| components/common/Button.tsx:34 | 공용 버튼 flex-shrink:0 | 선택 필드가 남은 공간에 맞춰 자연스럽게 축소되지 않음 |
| components/common/ProjectHeader.tsx:28 | leading flex-wrap:wrap, 760px 이하 width100% | 선택·회차가 각각 줄로 분리될 수 있음 |
| components/layout/WorkspaceHeader.tsx:49 | 메뉴, leading, actions가 wrap 행의 형제 | 모바일 메뉴와 width100% leading이 같은 줄에 들어가기 어려움 |
| components/layout/AppShell.tsx:19 | 사이드바 펼침200/접힘64, 모바일 offset0 | 동일 viewport에도 실제 헤더 가용 너비가 달라짐 |
| components/common/ProjectHeader.tsx:31 | name/meta에 이미 nowrap+ellipsis | 텍스트 줄바꿈 규칙을 다시 만드는 것만으로는 부모 배치 문제가 해결되지 않음 |

행 번호는 조사 시점 기준이다. 기존 속성을 확인한 것으로 실제 브라우저의 줄바꿈 위치를 측정한 결과가 아니다.

## 최소 수정 범위

- WorkspaceHeader: 선택적인 왼쪽 묶음/액션 배치 옵션. 기본 경로의 DOM/행동 유지.
- ProjectHeader: 두 호출 경로에 옵션 적용, leading/selector 축소와 배지 말줄임.
- 두 파일을 같은 Task로 처리한다. 옵션만 먼저 추가하거나 자식만 줄이는 독립 단계는 사용자가 확인할 결과를 완성하지 못한다.
- 버튼/테마/Provider/데이터/내부 popup 크기 변경은 불필요하다.
- 관련 메모: Plan, P01, T01, 결정 문서, 본 기록, 이전 current 백업 및 새 current.

## 동작 보존 체크 지점

- HeaderLoading과 ProjectHeaderContent 모두 확인. ready 경로만 수정하면 조회 중/오류 경로에서 고정 너비가 남는다.
- common/Button의 shrink0를 제거하는 전역 변경은 다른 버튼까지 작아지게 하므로 트리거만 덮어쓴다.
- 기본 WorkspaceHeader, navigation=null, headerRef/sticky, 선택 취소/초안 보호/포커스 복귀 보존.
- getHeaderRoundLabel의 긴 보관본·미완성 이력 및 복수 역할 표시를 포함한다.
- CSS 기반 배치만 변경한다. 별도 hydration 문제 해결을 주장하지 않는다.

## Validation Plan

- npm.cmd run typecheck
- npx.cmd eslint components/layout/WorkspaceHeader.tsx components/common/ProjectHeader.tsx --max-warnings=0
- git diff --check 및 지정 파일/보호 파일 diff
- T01의 데스크톱·모바일·긴 값·상태별 정적 검토 매트릭스
- DadamControls SHA256 보존: 56468648EF696239EC5B14704E6F58E60E21DA97CFBA199A90BD03F96F073F84
- 브라우저 실측을 수행하지 않으므로 실제 줄 이동 임계점/렌더링은 미검증으로 남긴다.
- 이번 계획 문서 작성 후에는 링크/상태/포인터와 .memory 외 변경 없음만 검증한다.

## 추가 범위

이번 요구를 구현하기 위해 별도로 사용자 판단이 필요한 새 인접 문제는 확인되지 않았다. 앞서 보고한 파일 메뉴 리팩토링이나 미해결 hydration 오류는 자동 추가하지 않는다.
