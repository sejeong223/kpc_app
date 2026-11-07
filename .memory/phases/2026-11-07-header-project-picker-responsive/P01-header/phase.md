# Phase: P01 헤더 선택 필드 반응형

## Goal

프로젝트 선택과 회차는 함께 유지하면서 실제 헤더 가용 너비에 따라 선택 필드와 우측 버튼 행을 배치한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 가변 선택 필드·메뉴/회차 묶음·액션 줄 이동과 회귀 검증 | [T01](./T01-fluid-project-picker.md) |

## Progress

- done: 1/1 (active: 없음)

## Scope Guard

- 구현 파일은 WorkspaceHeader.tsx와 ProjectHeader.tsx 두 개로 한정한다.
- 부모/자식 축소 규칙은 원자적으로 구현한다. 프로젝트 선택·권한·회차·완성본·설정 이벤트 변경 금지.
- DadamControls.tsx 및 common/Button.tsx, 전역 CSS/Provider, 기존 자료·제작 화면 파일 수정 금지.
- 검증은 T01 정책을 따르며 시각 검증 미실시를 명시한다.
