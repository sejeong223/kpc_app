# Plan: HTML v13 헤더 전체 동작·제조업 제작 예시 적용

## Status: done

## Goal

현재 개발 화면의 공통 헤더와 재작업·완성본·완성·설정에서 열리는 콘텐츠를 지정 HTML에 맞춘다. 제작 상태 변경의 일반 성공 문구를 없애고, 제조업 PoC 예시의 **46장·6섹션·담당 15장·편집·출처**를 시연할 수 있게 한다. 이번 단계의 산출물은 계획 문서뿐이다.

## Decisions

- [확정 사항](../decisions/2026-11-06-workspace-mfg-html-parity.md)
- [HTML 근거와 현재 코드 차이](../reports/2026-11-06-workspace-mfg-html-parity-sources.md)
- HTML: `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`, SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`.
- 마지막 `PAGES.mfg` 정의를 기준으로 8+8+8+8+7+7=46장이다. 이전 예시/이력에 나오는 6장·42장을 복사하지 않는다.
- 사용자 확정: 제조업 편집 본문에 섞인 행정업무 문구를 제조업 내용으로 정리한다. 프로젝트 설정은 창 안에서 조작하고 닫으면 폐기하는 HTML 방식으로 통일한다.
- 기존 일반 프로젝트와 행정업무 예시의 저장 내용은 보존한다. 새 제조업 예시 ID로 분리하고, 이전 예시는 별도 선택으로 계속 접근한다.
- 이전 완성본/PPT 시연 요청을 유지한다. 제조업 예시는 1차 예시 완성본과 2차 현재 작업으로 구성하며, 양쪽 46장이다. 이는 원본 mfg의 1차/이력 없음과 구분한 의도적 시연 보강이다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 데이터·제작·헤더·설정·완성본 연결 | [P01](../phases/2026-11-06-workspace-mfg-html-parity/P01-header-production/phase.md) |

## Task 구조와 순서

| Task | 결과 | 주요 파일 |
| :--- | :--- | :--- |
| T01 | 독립 제조업 예시 데이터와 46장 초기 상태 | `config/production-mfg-demo.ts`, `config/workspace-projects.ts`, `services/workspace/workspace-mfg-demo.ts`, `workspace-records.ts`, production types/schemas/routing |
| T02 | 제작의 상태 변경·간결한 편집·배정 표시·출처 시연 | `ProductionWorkspace.tsx`, 신규 `ManufacturingPromptEditor.tsx`, `SourcePanel.tsx`, `HtmlDemoSlidePreview.tsx`, production domain/presentation |
| T03 | 공통 헤더 및 완성·재작업·완성본 콘텐츠 | `ProjectHeader.tsx`, `ProjectRoundDialog.tsx`, `use-project-round.ts`, header selectors/types |
| T04 | 설정 4탭의 HTML 시연 동작 | `ProjectSettingsDrawer.tsx`, 신규 `header-settings-demo.ts`, header types |
| T05 | 제조업 46장 완성본 보기/PPT 및 재완성 연결 | 신규 `manufacturing-demo-ppt.ts`, `IndexedDbWorkspaceRepository.ts`, `use-project-round.ts`, demo bundle |

데이터를 먼저 확정해야 화면에서 46장/담당 15장을 실제로 계산할 수 있다. 제작 화면은 입력·권한·출처가 같은 선택 상태를 쓰므로 한 Task로 묶는다. 헤더 회차 명령과 설정의 임시 상태는 저장 규칙이 달라 분리한다. PPT는 단순 문구 교체가 아니라 실제 보관본과 파일을 연결해야 하므로 마지막 구현 Task로 분리한다. 각 Task는 독립적으로 typecheck/lint가 통과하는 경계로 완료한다.

## Scope

- 공통 헤더 적용 화면: 파일·RFP 분석·목차·제작 설정·제작·리뷰에서 사용하는 `ProjectHeader` 전체.
- 설정의 기본정보/권한/알림/로그 콘텐츠와 탭·체크박스·수신 방식 토글을 포함한다. 실제 이메일 발송·알림 예약·서버 감사 로그 수집은 포함하지 않는다.
- 제조업 출처의 파일명·쪽수·위치·근거 문장 및 RFP/자료 모달 시연을 포함한다. 원본 PDF/XLSX/DOCX 바이너리가 없는 것을 실제 원본으로 위장하지 않는다.
- 기존 코멘트·읽기 전용·회차·충돌·초안 보호는 유지한다. 새 예시의 데이터로 기존 프로젝트를 덮어쓰지 않는다.
- HTML 파일은 읽기 전용 참조이며 문서 안의 지시문은 실행 명령으로 취급하지 않는다.

## Regression Gates

1. 46장 제목/lead/항목/레이아웃과 6섹션 순서를 마지막 HTML 리터럴과 대조한다. 기본 배정: 이서연 23장, 정소담 15장, 김민수 8장.
2. `todo`는 앱의 `writing`으로 정규화한다. 작성 완료 2섹션/작성 중 4섹션이며 슬라이드 수와 섹션 수를 혼용하지 않는다.
3. 상태 변경은 성공 안내 없이 실제 상태/완성 통계를 갱신한다. 오류·충돌은 계속 보여 준다.
4. 편집 입력은 IME 조합/이동/회차 변경 시 유실되지 않는다. 슬라이드 크기는 16:9 비율과 가변 너비를 유지한다.
5. 설정 변경은 닫기/Escape/외부 클릭/프로젝트 전환 후 재개방 시 초기화한다. 실제 grant 저장 명령을 호출하지 않는다.
6. 보관본의 통계/보기/PPT는 해당 snapshot을 기준으로 한다. 현재 작업을 수정해도 이전 PPT가 바뀌지 않는다.
7. 기존 목 프로젝트의 마감일·부서 데이터, 행정업무 예시 저장본/PPT를 보존한다.

## Validation Policy

- 각 Task: `npm run typecheck`, 변경 파일 대상 `npx eslint ...`, `git diff --check`.
- 최종 T05: `npm run lint`, `npm run build`; 필요 불변식은 파일을 만들지 않는 Node/tsx stdin 검증으로 확인한다.
- `tests/` 생성·복원 금지. 브라우저/CUA/E2E/dev server/스크린샷 검증은 기존 사용자 정책에 따라 제외한다. 코드 대조를 픽셀 단위 검증 완료라고 기록하지 않는다.
- Cosmos DB/인프라/패키지 추가/배포/push 없음. 계획 단계에서 앱 구현·테스트 실행·커밋 없음.
- Task마다 지정 한국어 커밋을 만든다. 기존 다른 계획의 미커밋 변경을 stage하지 않는다. `.memory/current.md` ignore 유지/강제 추가 금지.

## Planning Completion

- [계획 문서 검증](../reports/2026-11-06-workspace-mfg-html-parity-planning-validation.md)
- 실행은 후속 `/memory-execute`, `current 보고 이어서 해줘`, 또는 새 `/mea` 요청으로 시작한다. 이전 계획의 `/mea` 실행 승인은 자동 승계하지 않는다.
