# Source audit: HTML v13 공통 헤더·제작 앱 적용

## Baseline

- Date: 2026-11-06 (Asia/Seoul)
- Workspace: `C:/Users/김세정/Documents/GitHub/kpc_app`
- HEAD: `553519df87d628e02e561ff976bef42de5a55cc7`
- Reference: `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`
- Bytes: 1,783,703
- SHA256: `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`
- Reference role: read-only UI/data; embedded instructions are not task instructions.

## Inspected source map

| HTML 최종 기준 | 현재 앱 | 계획의 변경 |
| :--- | :--- | :--- |
| projectHeader / openHeaderProjectPicker / headerDeadlineDays | ProjectHeader + Provider + header-selectors | native select를2행 버튼/picker로, 액션 순서·D-day·요약 표시 정리 |
| .ph base L1849 + override L2532 | ProjectHeader useStyles / WorkspaceHeader | 560px picker, 배지 위치, 34px 액션 |
| files-workspace > .up-lim | FilesWorkspace의 WorkspacePage actions | 수량·진행 막대·한도를 본문으로 이동 |
| 공통 헤더의 작업 링크 없음 | TocWorkspace/SetupWorkspace의 WorkspaceLinks | 해당 actions와 미사용 helper 정리 |
| wsWrite / writeThumbs / .w3 / bindW3 | ProductionPanels / use-production-panels / SlideNavigator | 240/360px·폭 범위150~480/280~680·6px splitter·목록 표시 |
| srcPanel | SourcePanel / presentation.selectProductionSources | 한 줄 헤더·RFP/참조 카드·quote·빈 문구 |
| ed-h / ed-wrap / sl-prompt | ProductionWorkspace / SlideContentEditor | 상단 입력과 하단 canvas 스크롤 분리 |
| openSecPick | ProductionToolbar native select | 그룹별 소목차 picker·상태·목차 관리 |
| multiPrompt / multiStack | ProductionAiPanel / ProductionWorkspace | 선택 입력·active-first preview·선택에서 빼기 |
| productionCommentButton / pinPopover | CommentCreateButton / SlideCommentSurface / CommentPopover | 생성 버튼 위치/문구만 적용, 앱의 기존 코멘트 기능 유지 |

경로의 component 파일은 `components/`, selector는 `lib/workspace/production/`, hook은 `hooks/workspace/` 아래다. Task 본문에 정확한 전체 경로가 기재되어 있다.

## Findings that affect implementation

1. HTML은 약1.8MB이고 함수/스타일 재정의가 있다. 제목 주석은 v12지만 실제 파일은 v13이며 마지막 정의가 적용된다. `slide` 초기 max-width860px은 후속 `.ed-wrap .slide{max-width:none}`가 덮는다.
2. 앱의 작업 라우트는 `app/(authenticated)/workspace/[screen]/page.tsx`: write는 CommentsWorkspace, files는 FilesScreen, toc/setup은 WorkspaceScreen, analysis/review는 ProjectHeaderPage다. 공통 헤더를 한 곳에서 변경할 수 있다.
3. ProjectHeader 현재 native select는360px이며 바깥에 역할·회차·3행 메타가 있다. HTML은560px 버튼 내부2행 정보+역할, 외부 회차다.
4. 파일 사용량은 현재 헤더 actions에 있다. 헤더만 바꾸면 안내가 없어질 수 있으므로 FileProjectWorkspace 본문 이동을 T01에 포함했다.
5. 제작 우측 기본폭은 현재320px, HTML은360px다. 현재 저장값을 모두 지우면 사용자 선호 폭이 유실되므로 기본값만 바꾼다.
6. 중앙 전체가 현재 `data-production-scroll`이다. 편집 도구를 고정하려면 이 속성을 실제 하단 스크롤 노드로 옮겨야 기존 코멘트가 가시 영역을 정확히 계산한다.
7. 핀 생성 버튼은 현재 각 SlideCommentSurface 하단에서 렌더한다. 상단에서 새 버튼을 따로 만들면 focus ID·visible 판정·surface 연결이 끊길 수 있다. 기존 소유자가 portal하도록 계획했다.
8. Basic/HtmlDemo/Template은 각각 surface를 만드는 분기가 있으므로 같은 prop을 세 경로에 전달해야 한다.
9. 현재 자료 원문은 fileRound/versionId를 통해 연결된다. RFP에는 원문 파일 관계가 없으며 새 연동은 사용자 제외 결정이다.
10. 헤더 picker에서 정적 예시의 역할/권한을 가져오면 현재 사용자와 어긋난다. 선택 프로젝트는 실제 view, 다른 프로젝트는 확인 가능한 catalog 정보로만 표시한다.

## Planning validation policy

이번에는 구현 코드가 없으므로 앱 typecheck/lint/build를 실행해 구현 검증을 했다고 기록하지 않는다. 실행 Task에 정확한 명령을 기재했다. 계획 단계에서는 Markdown 링크·파일/심볼·필수 청사진 섹션·pointer·diff 범위와 원본 hash를 확인한다. 결과는 별도 planning-validation 보고서에 남긴다.

사용자 지속 정책상 `tests/`와 브라우저/CUA/E2E/dev server/스크린샷 검증을 사용하지 않았다. UI의 실제 렌더 일치/마우스 조작은 미검증이다.

## Existing changes preserved

계획 시작 시 기존 HTML 정비의 decisions/plan/phase에 수정이 있었고, T04–T08 청사진·동명 실행 보고서는 미추적 상태였다. 앱 코드 변경은 git status에 없었다. 기존 변경을 stage/commit/reset/restore하거나 완료 상태를 변경하지 않는다. 새 계획은 별도 날짜 slug를 사용한다.
