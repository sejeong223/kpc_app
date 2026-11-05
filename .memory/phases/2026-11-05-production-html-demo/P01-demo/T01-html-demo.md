# T01: HTML 예시 프로젝트 생성·편집·미리보기 연결

- Status: done
- Plan: 2026-11-05-production-html-demo
- Phase: P01-demo

## 구현 청사진

- `config/production-html-demo.ts`: 프로젝트 ID/이름, HTML의 여섯 장과 레이아웃 데이터, 호환 가능한 저장 내용에 한정한 예시 레이아웃 선택.
- `config/workspace-projects.ts` / createWorkspaceProjectCatalog: 별도 예시 프로젝트와 현재 사용자 참여 정보 추가.
- `services/workspace/workspace-demo.ts`: WorkspaceContext에서 표준 WorkspaceBundle과 StoredFileBlob 생성. 빈 상태 생성 함수를 재사용하고 스키마 검증 후 반환.
- `services/workspace/workspace-records.ts` / readWorkspaceBundle: files/state 모두 없고 예시 ID인 경우에만 원자적으로 예시 초기화.
- `services/workspace/IndexedDbWorkspaceRepository.ts`, `IndexedDbFileRepository.ts`: 초기화 가능한 트랜잭션에 blobs 저장소 포함.
- `components/workspace/production/HtmlDemoSlidePreview.tsx`, `.module.css`: HTML 스타일의 16:9 카드/process/kpi/table. 저장 title/lead/blocks로 렌더링; 긴 본문은 전체 내용 확인 가능.
- `components/workspace/production/ProductionPreview.tsx`: 예시 ID이고 Template이 없으며 내용 구조가 호환될 때 예시 미리보기, 이외 기존 미리보기 유지.

## 모델

- WorkspaceProject: id/number/name:string, departmentId:string|null, pmId/pmName:string, memberIds:string[]. 현재 사용자 PM.
- SlideContent: title/lead:string, blocks:ContentBlock[]. 카드/절차/KPI는 첫 줄 제목+나머지 설명인 text 세 개, 표는 columns:string[]/rows:string[][]인 table 한 개.
- 기존 Chapter/Section/ProposalSlide/Requirement/SourceRef를 그대로 사용. template/pins null/빈 배열. SourceRef.provenance 및 Requirement.provenance는 mock.
- FileProjectState에 txt 파일 하나와 버전/회차 entry, StoredFileBlob에 HTML 발췌 UTF-8 내용. 참조 SourceRef는 해당 assetId/versionId/round를 정확히 연결.
- 새로운 영속 스키마/마이그레이션/Template 자산/외부 서비스 호출 없음.

## 수용 기준

1. 제작 프로젝트 선택에서 HTML 예시를 골라 여섯 장을 즉시 보고 편집한다.
2. 저장 후 다시 불러와도 내용 유지; 비예시 프로젝트/기존 빈 레코드에 자동 주입하지 않음.
3. HTML의 문구·네 가지 레이아웃·Teal 색상 재현. 출처는 시연 표시하며 참조 텍스트 원문이 열린다.
4. 내용 구조 변경 시 기본 미리보기로 전체 내용 표시, 일반 슬라이드/실제 Template 동작 유지.

## 검증

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- 기존 tsx/fake-indexeddb를 사용하는 stdin 인라인 검증: catalog, 원자적 최초 생성, 재로드, 편집 유지, 네임스페이스 격리, 일반/기존 빈 프로젝트 보호, 출처 버전/Blob, HTML 데이터 일치, fallback.
- `git diff --check`
- tests/ 생성·복원/브라우저/dev server/실제 포인터 검증 제외. 미실시 결과는 통과로 기록하지 않음.

## 커밋

제작 화면에 HTML 예시 프로젝트 추가

Plan: 2026-11-05-production-html-demo
Phase: P01-demo
Task: T01

## 완료 기록

2026-11-05: 청사진의 9개 구현 파일을 추가/수정했다. typecheck/lint/build/diff 및 저장 56개·실제 컴포넌트 서버 렌더링 54개 검증을 통과했다. 브라우저 검증 및 tests/ 생성은 수행하지 않았다.
[상세 결과 및 사용자 수동 확인 경로](../../../reports/2026-11-05-production-html-demo.md)
