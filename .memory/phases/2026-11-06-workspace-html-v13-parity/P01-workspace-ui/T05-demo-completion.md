# Task: T05 HTML 예시 완성본과 PPT 추가

## Status: done

사용자 요청: 완성본 보기/PPT 미표시 이유를 확인하고, 초기 완성 이력이 없다면 HTML 예시 프로젝트에 추가한다. 확인 결과 초기 snapshots/pptVersions가 모두 비어 있었다.

## 구현

- `services/workspace/html-demo-ppt.ts`: HTML_DEMO_SLIDES 6장으로 실제 OOXML PPTX Blob 생성. 기존 JSZip 사용, 16:9/제목/리딩/본문/표 포함, 파일명에 예시 명시.
- `services/workspace/workspace-demo.ts`: HTML demo만, 1차 작성 중이고 이력이 없는 경우 1차 complete snapshot 및 generated PptVersion 추가. snapshot은 원본 예시 6장이고 현재 사용자가 수정한 body와 구분한다. 상태2차/파일2차로 함께 전진하고 현재 본문·댓글·자료·되돌리기 데이터 보존.
- `services/workspace/IndexedDbWorkspaceRepository.ts`: load 후 대상일 때만 PPT 준비/해시 계산, 새 readwrite 트랜잭션에서 조건 재확인 후 snapshot/version/blob/files 원자적 저장. 중복 호출·기존 완성본·다른 프로젝트는 추가하지 않는다.
- 기존 ProjectHeader의 완성본/보기/PPT 및 실제 다운로드 경로를 그대로 사용한다. 버튼만 표시하는 시연은 추가하지 않는다.

## 데이터 계약

`RoundSnapshot.kind='complete', round=1, inputRevision=1, pptVersionId=version.id`. `PptVersion.snapshotId=snapshot.id, round=1, pinIds=[], manifest=null, sha256=실제 Blob 해시`. `StoredWorkspaceBlob.kind='ppt'`와 namespace/projectId 일치. 현재 state/files.currentRound=2, state.phase='writing'. 기존 이력은 덮어쓰지 않는다.

## 검증

typecheck/lint/build/diff --check. tests/ 없이 stdin fake-indexeddb로 최초/기존 수정본/동시 로드/재로드/일반 프로젝트/이미 완성한 프로젝트 확인, 실제 downloadPpt 경로와 해시·6장 OOXML 연결/텍스트 검증. 브라우저 검증 제외 유지.

## Commit

feat(workspace): HTML 예시에 완성본과 PPT 다운로드 추가

Plan: 2026-11-06-workspace-html-v13-parity
Phase: P01-workspace-ui
Task: T05-demo-completion

## Progress

- [x] 구현·검증
- commit: 이 Task를 포함한 `feat(workspace): HTML 예시에 완성본과 PPT 다운로드 추가` 커밋 (`git log -- 이 파일`로 조회)
- [검증 결과](../../../reports/2026-11-06-workspace-html-v13-parity-T05.md)
