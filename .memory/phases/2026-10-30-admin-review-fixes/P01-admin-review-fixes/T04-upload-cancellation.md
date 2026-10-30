# Task: T04 업로드 취소 상태 복구와 늦은 응답 격리

## Status: done

## Goal
파일 읽기가 아직 끝나지 않아도 분석 취소 또는 닫기 취소 후 계속 편집할 수 있고, 취소한 요청의 완료가 새 업로드 상태를 덮지 않게 한다.

## Decision Summary
- 승인된 추가 관찰 개선. 실제 File.arrayBuffer/JSZip 실행을 강제로 중단한다고 가정하지 않는다. UI 진행 상태와 완료 반영 권한을 즉시 해제한다.
- 완료된 staged 파일은 계속 편집에서 보존하고 실제 폼 폐기 때 해제한다. 이전 파일 자동 복원 기능은 추가하지 않는다. T03 다음 순차 실행, 중간 커밋 보류.

## Implementation

### I01. 취소 경로의 UI 상태 통합
- Related Files:
  - `components/admin/templates/TemplateEditorDialog.tsx` :: `close`, `select`, 분석 취소 callback — 상태 정리; modify
  - `lib/admin/assets/import-session.ts` :: `cancel`, `clear`, `select` — 기존 취소·파일 수명; 필요 시 최소 보완; modify
  - `hooks/admin/use-assets.ts` :: `useTemplateImport` — 기존 mutation; read-only
  - `components/admin/templates/TemplateFileInput.tsx` :: progress 기반 disabled — 동작 확인; read-only
  - `services/admin/TemplateFileStore.ts` :: import/discard — 기존 파일 수명; read-only

#### Details
- Signatures & Types:
```typescript
// TemplateEditorDialog 내부 공통 핸들러
function invalidateImport(mode: "cancel" | "clear", message?: string): void;
// 기존 서비스 계약 유지
type Importer = (input: {
  file: File; signal: AbortSignal; onProgress: TemplateProgress;
}) => Promise<StagedTemplateSource>;
```
- Data & Schema Fields: UI `request:MutableRefObject<number>`, `progress:string|null`, `fileError:string|null`, `draft.value.fileRefId:string|null`, `extraction:TemplateExtraction|null`, `filename:string|null`. 기존 `TemplateImportSession`의 sequence:number/controller:AbortController|null/source:StagedTemplateSource|null를 유지한다.
- Execution Flow / Logic:
  1. invalidateImport는 request.current를 먼저 증가시킨다. mode=cancel은 session.cancel(), clear는 session.clear(). progress=null, 필요한 취소 안내 설정, import mutation reset을 즉시 수행한다.
  2. 전용 `분석 취소`는 clear와 사용자 안내를 사용한다. 미저장 폼 닫기는 저장 mutation pending이면 기존대로 거절하고, 그 외에는 cancel 후 기존 dirty 확인을 연다. `계속 편집`은 폼 초안과 완료된 staged 파일을 그대로 유지한다.
  3. `변경사항 버리기`/실제 닫기는 기존 unmount disposal lease를 통해 clear한다. 저장에 성공하여 revision에 retain된 파일은 discardStaged가 삭제하면 안 된다.
  4. select 시작 시 요청 번호를 캡처한다. source 반영, 오류 표시, finally의 progress/reset 모두 같은 요청 번호인 경우에만 실행한다. 늦은 진행 callback은 기존 session sequence/abort 검사로 무시한다.
  5. A 취소→B 선택 후 A가 성공/실패/finally에 도달해도 B의 progress·extraction·fileRefId·오류를 덮지 않는다. 뒤늦게 생성된 A staged source는 session에서 discard한다.
  6. 현재 권한 상실 시 기존 session.clear와 읽기 차단을 유지한다. 정리 과정에서 다른 사용자의 파일을 버리지 않으며 비동기 완료가 권한 없는 화면을 다시 열지 않는다.
- 상태 보존: 새 파일 선택 시작 시 fileRefId/extraction/매핑을 비우는 기존 정책은 유지한다. 취소 후 이름·설명 등 나머지 초안은 유지하되 유효한 파일이 없으면 저장은 비활성이고 다시 파일 선택은 가능하다. 기존 파일 자동 복원이 동작한다고 안내하지 않는다.
- 에러: 진짜 최신 import 오류는 표시한다. 취소된 요청의 오류는 무시한다. 원본 파일 읽기 Promise가 늦게 끝나는 것을 오류로 간주하지 않는다.

### I02. 경합 검사
- Related Files:
  - `tests/services/admin/template-upload.test.ts` — 취소와 늦은 응답; modify
  - `tests/services/admin/work-fixture.ts` :: `deferred` — 제어된 Promise; read-only
- 단위 검사: 취소 후 늦은 성공 source 해제, 늦은 실패와 진행 무시, A 취소 후 B 성공만 보존, cancel은 완료 source 유지/clear는 해제, read 권한 회수 후 discard 허용.
- 실제 UI 검증(T07 자동화): 브라우저에서 테스트 파일의 arrayBuffer만 지연한다. 분석 중 footer 취소→계속 편집에서 이름/설명과 파일 선택이 즉시 활성화되고 진행 표시가 없어야 한다. File API를 실제로 복구하기 전에 지연된 callback이 참조하는 원래 함수를 삭제하지 않는다.
- B 업로드 성공 후 A를 해제해 B가 유지되는지 확인한다. 실패·취소된 파일만으로 저장이 활성화되면 안 된다. 이미 분석 완료한 파일에서 닫기→계속 편집은 파일을 보존한다.

## Acceptance Criteria
- [x] 아직 파일 읽기 중이어도 취소 후 즉시 폼 조작/재선택이 가능하다.
- [x] 오래된 요청의 성공·실패·finally가 최신 UI와 파일 참조를 변경하지 않는다.
- [x] 계속 편집과 폐기 사이의 staged 파일 수명을 구분한다.

## Validation
- `npm.cmd test -- tests/services/admin/template-upload.test.ts tests/services/admin/TemplateFileStore.test.ts tests/lib/admin/assets/runtime.test.ts` — 통과.
- `npm.cmd run typecheck` 및 `npm.cmd run lint` — exit 0.
- 실제 브라우저 지연 시나리오를 기록하고 T07 E2E에 포함한다. 서비스 단위 통과만으로 UI 복구 완료를 선언하지 않는다.

## Commit Message
```text
fix(admin): 파일 분석 취소 후 편집 상태와 요청 경합 정리

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Task: T04-upload-cancellation

- 취소 즉시 진행 상태 복구
- 오래된 업로드 완료의 상태 덮어쓰기 차단
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 검증: 관련 3개 파일 10개 테스트, typecheck, lint 통과. 지연 File API 실제 화면 검사는 T07 필수 검사로 남긴다.

- 최종 확인: T07 실제 브라우저: 하단 취소 후 계속 편집의 입력 즉시 복구, B 완료 후 늦은 A 격리, 전용 취소·완료된 임시 파일 보존·실제 폐기 통과.
