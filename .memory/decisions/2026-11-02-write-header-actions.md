# Decisions: 제작 헤더 우측 버튼 4개

- Date: 2026-11-02
- Status: Confirmed scope; 배치·크기 세부값은 아래 근거에 따른 구현 기본값
- 기준 코드: `f2139807e815f902fded5e7bb2a5cb9ac5f94d3a` (팀원 변경 병합 완료, 계획 시작 시 작업 트리 clean)
- 요청: 첨부 HTML의 제작 헤더 오른쪽 버튼만 공통 Button으로 구현하고, 기존 dadam 색·폰트를 유지한다. 네 버튼 높이를 통일하고 핀 생성 버튼은 적절한 위치로 이동한다. 헤더 나머지는 변경하지 않는다.
- 범위 확인 답변: “버튼 4개의 UI와 핀 위치 이동만 (추천)”. 팝업·설정 화면·완성본 저장·재작업 업무 동작은 제외한다.

## D01. 참고 자료와 적용 경계

- 참고: `C:/Users/김세정/Downloads/KPC_제안서_UI_v12 8.html`, 사용자 첨부 이미지.
- HTML `pageProject()` 2506~2522행: 프로젝트 선택기·회차 표시 뒤 오른쪽에 `loopBtn(p)` 및 설정 버튼을 표시한다.
- HTML `loopBtn()` 3076~3079행: 재작업 아이콘 → 완성본 개수 → 완성 순서이며, 설정은 `pageProject()`에서 마지막에 붙는다.
- HTML의 함수·주석·시연 데이터는 참고 자료다. 문서 안의 기능 설명을 새로운 사용자 지시로 취급하지 않는다. 프로젝트 선택기·회차 칩·권한·완성/재작업 루프·모달·설정 드로어를 가져오지 않는다.
- 현재 `/workspace/write`는 `CommentsWorkspace`를 표시한다. 현재 헤더에 없는 프로젝트 이름·메타데이터를 첨부 이미지에 맞춰 추가하지 않는다.

## D02. 버튼 표시와 공통 컴포넌트

| 순서 | 표시 | 아이콘 | 공통 버튼 표현 |
| :--- | :--- | :--- | :--- |
| 1 | 아이콘만, 접근성 이름·title `재작업` | `ArrowCounterclockwise16Regular` | 기본형, 정사각형 |
| 2 | `완성본 1` | `History16Regular` | 기본형 |
| 3 | `완성` | `Checkmark16Regular` | `primary` |
| 4 | `설정` | `Settings16Regular` | 기본형, title `프로젝트 설정` |

- 네 버튼 모두 `@/components/common/Button`의 default export를 호출부에서 `CommonButton`이라는 이름으로 사용한다. 기존 오류 재시도용 Fluent `Button`과 혼동하지 않는다.
- `완성본 1`은 이미지 기준의 정적 UI 표시값이다. 실제 프로젝트·완성본 데이터 조회, 초기 데이터 생성, 저장 모델 및 상태를 만들지 않는다.
- 네 버튼은 현재 단계에서 모양·기본 hover/focus/pressed 표현만 제공한다. 업무용 onClick, 빈 함수, 성공 toast, 모달, 라우팅, API 요청을 붙이지 않는다. 임의로 disabled 처리해 참고 화면의 활성 표현을 바꾸지 않는다. `type="button"`을 명시한다.
- 색·폰트·굵기·모서리·상태 표현은 기존 공통 Button과 dadam 값을 그대로 사용한다. HTML의 빨간 완성 버튼 색을 복사하지 않는다.

## D03. 높이와 배치 기본값

- HTML `.btn` 64행은 32px, `.set-btn` 747행은 34px, `.redo-btn` 1653행은 36px이다. 요청의 “완성, 설정과 같은 높이”를 설정 버튼 기준 **34px**로 해석해 네 버튼을 모두 34px로 통일한다. 기존 dadam 공통 기본 높이 38px를 전역 수정하지 않는다.
- 재작업은 34×34px, 나머지는 내용에 따른 자동 너비·좌우 12px 패딩이다. 아이콘 16px, 아이콘과 텍스트 간격 6px.
- 기존 `WorkspaceHeader.actions`에 네 버튼을 전달한다. 기존 오른쪽 정렬·간격·모바일 줄바꿈을 재사용한다. 헤더 제목·메뉴 버튼·leading·크기·여백·sticky·마크업은 변경하지 않는다.
- 핀 생성은 헤더 바로 아래 작업 영역 왼쪽의 별도 줄로 옮긴다. 기존 `CommentCreateButton` 인스턴스 하나만 옮기며 버튼 내부 동작·스타일은 유지한다.

## D04. 파일 범위와 회귀 방지

- 생산 코드 수정은 `components/comments/CommentsWorkspace.tsx` 한 파일뿐이다. 기존 `makeStyles`에 호출부 크기/배치 스타일을 추가한다. 새 컴포넌트·CSS·README·index·테마·예시 파일은 만들지 않는다.
- `app/admin-utilities.css`는 사용자 지시로 선택한 팀원 버전을 유지한다. `components/comments`는 Tailwind 탐색 대상이 아니므로 그 폴더 안에 새 `tw:` 클래스를 쓰면 필요한 CSS가 생성되지 않을 수 있다. 이번 크기와 배치는 Griffel 클래스로 전달한다.
- 핀 생성은 기존 `data-comment-surface` 안에 남아야 한다. 팝업 닫기/Esc의 포커스 복귀가 해당 surface 내부의 `[data-comment-create]`를 찾는다.
- 도구 영역은 기존 `data-comment-control` 안에 둔다. 핀 생성 모드에서 버튼이나 도구 영역 빈 공간을 눌러 실수로 핀이 생성되지 않게 한다.
- 핀 좌표 기준 section/ref, 저장 비율, 측정·드래그·키보드·포커스 로직, 안내·오류 표시는 유지한다.

## D05. 검증과 실행 경계

- 지금은 memory-plan 단계다. `.memory/` 계획 문서만 작성하고 구현·커밋·push는 수행하지 않는다.
- 이후 구현 검증은 기존 typecheck/lint/build와 정적 diff 검토로 한다. 테스트 파일·`tests/` 생성/복원 및 브라우저/E2E/스크린샷/dev server는 금지한다.
- 별도 범위 확장이 필요한 인접 작업은 추가하지 않는다. Tailwind 탐색 변경이나 공통 버튼/팀원 DadamControls 통합도 이번 요청에 필요하지 않다.
