# Task: 메뉴 제목 공통 표시 규칙 변경
## Status: done
## 구현 계약
- components/layout/WorkspacePage.tsx: showTitle?:boolean을 전체 props에 추가한다.
- components/layout/WorkspaceHeader.tsx: 기본 showTitle=false, 숨긴 제목은 툴바 밖의 sr-only h1. title/leading/actions가 없는 툴바는 모바일 메뉴가 있을 때만 모바일에 표시한다.
- components/admin/skills/SkillEditorPage.tsx, components/admin/prompts/{PromptEditorPage,PromptDetailPage}.tsx, components/admin/templates/workbench/TemplateWorkbench.tsx: showTitle을 지정한다.
- 제목 ID/ref, 모바일 메뉴 ID/aria/토글, 필터·제출 액션 및 sticky 측정 계약 보존.
## 수용 기준
- 메뉴 상단의 눈에 보이는 중복 메뉴명이 없고 제목만 있던 빈 헤더 공간도 없다.
- 모바일 메뉴와 데스크톱 업무 액션, 상세·편집 제목은 유지한다. 각 화면의 접근 가능한 h1은 하나다.
## 검증
- 기존 헤더·라우트·제작 코멘트 통합 테스트 기대값 갱신. 제목 예외·모바일 메뉴·폼 제출·sticky 측정·본문 입력 보존 검증.
- npm.cmd test -- --maxWorkers=4, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, git diff --check.
- 브라우저·E2E·시각 검증 제외. 테스트 로컬 보관.
## 커밋
fix(ui): 본문 상단의 중복 메뉴 제목 제거

Plan: 2026-11-02-remove-menu-headings
Phase: P01-headings
Task: T01-headings

## 실행 결과
- 공통 WorkspaceHeader의 기본 showTitle=false를 적용해 모든 메뉴의 중복 제목을 화면에서 제거했다. 접근 가능한 h1은 툴바 밖에 하나만 남긴다.
- 제목·실제 액션이 없는 헤더는 데스크톱에서 공간을 차지하지 않는다. 모바일 메뉴가 필요한 경우에만 760px 이하에서 툴바를 표시한다. 날짜 필터·저장·내보내기 등 기존 액션은 유지한다.
- Skill 등록/편집/상세, 프롬프트 세트 등록/수정/상세, PPT 적용 작업에는 showTitle을 지정해 작업 제목을 표시한다.
- 제목 ID/ref, 모바일 메뉴 연결, 기존 권한 조건부 렌더링, sticky 높이 측정 계약을 유지했다.

## 검증 결과
- npm.cmd test -- --maxWorkers=4: **81개 파일, 617개 테스트 통과**.
- npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build 통과.
- 생성된 CSS에서 모바일 전용 헤더의 max-width:760px 표시 규칙을 정적으로 확인했다.
- 기존 공통 레이아웃 및 제작 코멘트 테스트를 갱신해 빈 헤더 제거, 접근성 제목 1개, 업무 액션·본문 입력 보존, 표시 제목의 ref/제출 동작, 모바일 메뉴 토글, sticky 측정을 검증했다.
- git diff --check 및 staged diff 검사 통과. 테스트는 로컬에서만 보관하며 브라우저·수동 UI·스크린샷 비교는 수행하지 않았다.
- 단일 로컬 커밋, 원격 push 없음.
