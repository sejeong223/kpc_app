# Task: T09 파일 선택 흐름과 자료 표시 개선

## Status: done

## Goal
기획 HTML의 파일 추가 흐름과 자료 표시를 보완한다. 파일 탐색기 취소 시 빈창이 뜨지 않고, 웹 기간·참조 우선순위·로컬 저장 범위를 쉽게 알 수 있게 한다.

## Decision Summary
- 데이터 구조와 업로드 한도는 기존 기능을 재사용한다. 실제 서버 업로드/분석/검색을 추가하지 않는다.
- 기존 분류3개·다중선택·드롭·일괄설정·미리보기·원본·회차보존을 유지한다.
- 공통 Dadam 컨트롤·토큰·간격을 사용하고 큰 안내 배너나 제거한 메뉴제목을 복원하지 않는다.

## Implementation

### I01. 파일 탐색기 선행 진입
- Related Files:
  - components/workspace/files/FilesWorkspace.tsx :: openAdd/FileProjectWorkspace — modify
  - components/workspace/files/FileCategoryPanel.tsx :: +파일 callback — modify
  - components/workspace/files/FileUploadDialog.tsx :: initialFiles/additional picker/drop — modify
  - components/workspace/files/file-ui-types.ts :: FileDialogState/FileUploadDialogProps — reuse/필요한명세보완
  - hooks/workspace/use-file-picker.ts :: useFilePicker — new
  - config/workspace-files.ts :: FILE_LIMITS/허용확장자 — read-only/reuse
  - lib/workspace/files/validation.ts :: validateUploadFile, guessReferenceKind — read-only/reuse
#### Details
~~~typescript
interface FilePickerScope {
  projectId: string;
  round: number;
  revision: number;
  category: Exclude<FileCategory,"web">;
}
interface FilePickerResult {
  scope: FilePickerScope;
  files: File[];
}
// useFilePicker(onSelected:(result:FilePickerResult)=>void)
// 반환: inputRef, inputProps, open(scope:FilePickerScope):void
~~~
- 사용자 클릭 핸들러에서 input[type=file,multiple].click()을 동기 호출한다. OS 탐색기를 열기 전에 await/query/guard를 넣어 사용자 제스처를 잃지 않는다. 권한 없는 +파일 버튼은render하지않는다.
- input accept는기존확장자상수를공유한다. click전input.value=""로초기화해동일파일재선택을허용한다. scope에현재project/round/revision/category를캡처한다.
- onChange에서FileList를즉시File[]로복사한뒤input.value를비운다. files.length=0 또는cancel event면아무modal/dirty도만들지않고pending scope를정리한다.
- 선택완료시여전히같은project/round인지,현재권한/쓰기상태인지확인한다. scope가바뀌었으면늦게돌아온파일을새project에붙이지않고폐기한다.
- 선택한파일이있을때만기존draft guard를거쳐openAdd(category,files)로설정창을연다. capture revision은그대로전달하고다른탭변경을최신revision으로자동덮어쓰지않는다.
- +웹은기존WebReferenceDialog진입을유지한다. 카테고리드롭은filepicker를거치지않고기존openAdd로들어가되동일파일검증/권한/scope확인을적용한다.
- modal내추가선택/드롭, 개별·일괄설정, 오류행표시, 완료후dirty정리, 실패시파일목록유지는그대로다. 파일을선택했다는이유만으로자동저장하지않는다.
- FILE_LIMITS.fileBytes=50MB, currentMaterials=30을화면문구/선택검증/저장도메인이같이사용한다. picker에서만필터링하여드롭과다른한도를적용하지않는다. 잘못된확장자/용량파일을조용히누락하지말고기존행오류로보인다.

### I02. 웹 기간·우선순위·브라우저 저장 표시
- Related Files:
  - components/workspace/files/FileResourceCard.tsx :: 자료 메타데이터/priority — modify
  - components/workspace/files/ReferencePriorityBadge.tsx :: 공통배지 — new
  - components/workspace/files/FileResourceMeta.tsx :: 자료메타데이터 — new
  - components/workspace/files/FileRoundSection.tsx :: 밀도/읽기전용 — 필요한범위modify
  - components/workspace/files/FileUploadDialog.tsx, FilesWorkspace.tsx :: 저장문구 — modify
  - lib/ui/dadam-theme.ts :: 공통색상token — reuse/없는의미token만추가
  - app/dadam-tokens.css :: 공통 의미별 배지 토큰 — 필요한 토큰이 없을 때만 modify
  - types/workspace-files.ts :: ReferencePriority,WebPeriod — read-only
#### Details
~~~typescript
interface ReferencePriorityBadgeProps {
  priority: ReferencePriority; // required|preferred|normal|excluded
}
interface FileResourceMetaProps {
  resource: FileResourceView;
}
// WebPeriod = "all"|"1y"|"3m"
// 전부표시용이며새로운저장필드는추가하지않는다.
~~~
- required=필수(기존경고/강조tone), preferred=우선(브랜드tone), normal=일반(중립tone), excluded=제외(낮은강조중립tone). 실제색은기존Dadam의semantic token으로관리하고card별hex/클래스중복을만들지않는다. 색외텍스트를항상보인다.
- 웹source이면hostname과함께기간을표시한다: all→전체기간, 1y→최근1년, 3m→최근3개월. FileResourceMeta에서종류·등록정보·웹기간을일관되게출력하고파일source에는가짜기간을표시하지않는다.
- 읽기전용회차에서도우선순위/웹기간/유형/등록정보가사라지지않는다. 설정변경후새버전으로반영하며과거버전의period/priority를최신것으로보여주지않는다.
- 저장문구는도구영역또는업로드modal의작은텍스트 “이 브라우저에 저장”으로제공한다. 예시데이터/화면안내대형배너를추가하지않는다.
- 기존정렬/순서/설정/삭제/복사/미리보기action을유지하고역할별조건부렌더링을유지한다. 이번작업으로카드전체를다른목록형태로교체하지않는다.

## Acceptance Criteria
- [x] +파일→OS탐색기→선택파일설정창 순서이며 탐색기취소만으로 빈창/dirty가 없다.
- [x] 다중선택/드롭/추가선택은 같은 용량·개수·형식 제한을 적용한다.
- [x] 다른project/round의 늦은 파일선택결과가 현재자료에 붙지 않는다.
- [x] 웹 카드에는참고기간, 모든카드에는구분되는우선순위텍스트/배지가 있다.
- [x] 저장범위를짧게알리며기존기능과공통여백을유지한다.

## Validation
- npm run typecheck
- npx eslint components/workspace/files hooks/workspace/use-file-picker.ts lib/ui/dadam-theme.ts
- git diff --check
- rg -n "50|30|FILE_LIMITS|accept=|type=.file|openAdd|priority|period" components/workspace/files hooks/workspace/use-file-picker.ts config/workspace-files.ts lib/workspace/files
- 정적검토: .click이클릭stack안에있는지, FileList빈값/cancel/scope변경에서modal생성안하는지, 드롭과동일검증인지, 웹period/읽기전용표시, 권한별render.
- 순수메타데이터formatter/업로드검증은node --require tsx/cjs - stdin으로검증한다. OS탐색기·드롭·시각배치의실행검증은이번정책상하지않으며최종보고서에명시한다.

## Commit Message
~~~text
feat(workspace): 파일 선택 진입과 자료 메타데이터 표시 개선

Plan: 2026-11-04-workspace-shared-header-files
Phase: P01-shared-workspace
Task: T09-file-upload-usability

- 파일 선택 흐름과 자료 표시 개선
- 원본 보존과 공통 컴포넌트 정책 유지
~~~

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 전체 T01~T10 최종 단일 커밋에 포함 (본 파일의 Git 이력 참조)


## Execution Result
- typecheck/lint/diff 및 웹 기간/파일 메타데이터/허용 형식/0바이트/50MB 초과 인라인 검증 통과. picker 동기 click·cancel·scope·공통 검증·읽기 전용 조건 정적 확인. OS/브라우저 검증 미실행.
- 사용자 요청으로 개별 커밋 보류. 전체 완료 후 단일 커밋.
