# Phase: P01 프로젝트 파일 자료함

- Date: 2026-11-03
- Plan: [프로젝트 파일 업로드 자료함](../../../plans/2026-11-03-workspace-file-upload.md)
- Status: done

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 자료 모델·권한·회차 규칙 | [T01](./T01-domain-contracts.md) |
| T02 | `done ✅` | 원본 파일·설정의 원자적 로컬 저장 | [T02](./T02-indexeddb-storage.md) |
| T03 | `done ✅` | 공통 인증 세션 갱신 연결 | [T03](./T03-auth-session-sync.md) |
| T04 | `done ✅` | Query·프로젝트 선택·자료함 화면 | [T04](./T04-runtime-and-workspace.md) |
| T05 | `done ✅` | 파일·웹 편집과 회차 액션 | [T05](./T05-material-editing.md) |
| T06 | `done ✅` | 실제 미리보기·다운로드·최종 검증 | [T06](./T06-preview-and-validation.md) |

## Execution Rules

- T01 → T02 → T03 → T04 → T05 → T06 순차 구현. 각 Task의 독립 계약·파일·검증 명세를 따른다.
- 구현 중 변경한 계약은 영향을 받는 미완료 청사진에도 반영한다. 브라우저 저장 키, 권한, 과거 이력, 실제 서버 범위 등의 확정 요구를 임의로 바꾸지 않는다.
- 금지: `tests/` 생성·복원, 브라우저/CUA/E2E/스크린샷, 검증 목적 dev server, Azure 프로비저닝.
- 계획 생성과 실제 구현 완료를 구분한다. Task 완료는 검증 결과와 커밋 정책을 반영한 후 기록한다.

## Progress

- done: 6/6 (active: 없음)
- implementation: T01~T06 구현 및 검증 완료. T01 기존 커밋 유지, T02~T06 최종 일괄 커밋.
- T01 검증: typecheck/lint/차이 공백 검사 및 인라인 78개 경계 확인 통과. 브라우저·DB 검증 제외.
