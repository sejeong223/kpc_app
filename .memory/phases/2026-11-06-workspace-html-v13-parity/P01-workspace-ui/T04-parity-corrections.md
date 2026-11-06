# Task: T04 화면 불일치 수정과 전체 프로젝트 메타데이터

## Status: done

## 사용자 보완 요청

2026-11-06 사용자 스크린샷과 HTML 재대조 요청에 따라 이전 적용 누락을 수정한다. 슬라이드 폭 제한을 제거하고 제작 헤더와 편집창 표현을 HTML에 맞춘다. 모든 목 프로젝트에 마감일·부서 표시 데이터를 채운다. 이 요청은 수정 실행을 포함한다.

## 구현 청사진

- `app/globals.css`: 전역 font reset의 `button:not(...)` specificity를 낮춰 컴포넌트의 명시적 폰트 크기·굵기 우선. 입력 컨트롤 기본 font 상속 유지.
- `components/workspace/production/HtmlDemoSlidePreview.module.css`: `.frame` 860px max-width 제거. width100%, 16:9 비율과 기존 핀 좌표 기준 유지.
- `components/workspace/production/SlideContentEditor.tsx`: title/lead/text/list를 13px·1.7·4px/2px 간격의 compact 본문으로 표시. 원본 title/lead/blocks와 parser, 저장, IME를 유지하며 텍스트를 지우거나 요약하지 않음.
- `components/workspace/production/ProductionToolbar.tsx`: 제목16px/700·breadcrumb11px/브랜드색·선택 버튼 간격/상태30px를 실제 적용.
- `components/common/ProjectHeader.tsx`: 원본 12px 좌우 padding·8px row/action gap·배지 스타일과 전체 프로젝트 메타 표시.
- `config/workspace-project-metadata.ts`: 기존 admin seed의 36개와 HTML demo 1개에 고정 목 데이터 생성. `organization:string`, `departmentName:string`, `dueDate:string`(ISO 날짜), demo budget. 날짜는 오늘마다 바뀌지 않는 명시적 기준일 사용.
- `types/workspace-header.ts`, `lib/workspace/production/header-selectors.ts`, `components/common/ProjectHeaderProvider.tsx`, `ProjectSettingsDrawer.tsx`: 표시용 departmentName을 전달하고 header/picker/settings에서 확인 가능하게 함. 저장 모델·실제 권한·본문은 변경하지 않음.

## 검증

- typecheck, 전체 lint, build, diff --check.
- 파일 생성 없이 stdin으로 전체 37개 목 프로젝트의 ID coverage·부서·유효한 마감일·D-day를 검증.
- 전역 CSS specificity와 renderer 폭·문서 roundtrip을 정적/DOM 검사. 브라우저/CUA/E2E/dev server/스크린샷 실행 및 tests/ 생성 금지 유지.

## Commit

fix(workspace): HTML 화면 불일치와 프로젝트 목 정보 보완

Plan: 2026-11-06-workspace-html-v13-parity
Phase: P01-workspace-ui
Task: T04-parity-corrections

## Progress

- [x] 구현 및 검증
- commit: 이 Task를 포함한 `fix(workspace): HTML 화면 불일치와 프로젝트 목 정보 보완` 커밋 (`git log -- 이 파일`로 조회)
- 결과: [T04 검증 기록](../../../reports/2026-11-06-workspace-html-v13-parity-T04.md)
