# Task: T03 업로드 드롭존·파일 목록·검토자 선택 컴포넌트

## Status: pending

## Goal
등록 화면의 세 부품 — 파일 드롭존(`RfpUploadZone`), 업로드 파일 목록(`RfpFileList`), 검토자 팝오버(`ReviewerPicker`)를 상태 없는(controlled) 컴포넌트로 만든다. T04가 reducer 상태를 연결만 하면 되도록 부품 단위로 검증하기 위함이다.

## Decision Summary
- D03: 드롭·파일 선택·"샘플 RFP로 체험", 진행 중 진행바, 완료 후 "다시 하기", 파일별 종류 선택 + 첫 파일 "대표 RFP" 배지.
- D05: Fluent `Popover` + 검색 + 체크박스 다중 선택, 후보는 관리자 시드 활성 사용자(잠김·초대·삭제 제외), 관리자 저장소에 쓰지 않는다.
- D08: Fluent v9 + `tw:` 유틸리티 + `--kpc-*` 변수. 레퍼런스의 빨간 색 미사용.

## Implementation

### I01. 검토자 후보

- Related Files:
  - `lib/rfp/reviewers.ts` :: `ReviewerCandidate`, `getReviewerCandidates`, `filterReviewerCandidates` — new
  - `config/admin-seed.ts` :: `createAdminSeed` — 읽기 전용 호출; read-only

```typescript
export interface ReviewerCandidate { id: string; name: string; title: string; departmentName: string }
export function getReviewerCandidates(): ReviewerCandidate[];       // 모듈 내 1회 계산 후 캐시
export function filterReviewerCandidates(list: readonly ReviewerCandidate[], query: string): ReviewerCandidate[];
```
- `createAdminSeed()`의 `users` 중 `status === "active" && deletedAt === null`만, `departments`로 `departmentId` → 이름(없으면 "미지정"). 이름 가나다순(`localeCompare(b, "ko")`).
- 필터: `query.trim().toLowerCase()`가 `name + departmentName + title` 소문자에 포함. 빈 쿼리는 전체.

### I02. RfpUploadZone

- Related Files:
  - `components/rfp/RfpUploadZone.tsx` :: `RfpUploadZone` — new
  - `components/admin/templates/TemplateFileInput.tsx` — 드롭존 스타일·`useId` 숨김 input 패턴 참고; read-only

```typescript
interface RfpUploadZoneProps {
  phase: RfpFormPhase;               // idle | analyzing | extracted
  error: string | null;              // state.fileError
  onFiles(files: File[]): void;      // 크기 검사는 reducer가 담당
  onSample(): void;
  onRestart(): void;                 // "다시 하기"
}
```
- 마크업: `<section aria-label="RFP 파일 업로드" data-rfp-dropzone>`; `onDragOver` preventDefault + `data-over="true"` 표시, `onDragLeave`/`onDrop` 해제. 드롭 시 `[...event.dataTransfer.files]`를 `onFiles`.
- 상태별 본문:
  - idle: 제목 "RFP 파일을 놓으면 사업개요가 자동으로 채워집니다", 보조 "PDF · HWP · DOCX · 파일당 50MB · 대표 RFP 300쪽 이하 권장", 버튼 `파일 선택`(숨김 `<input type="file" multiple accept=".pdf,.hwp,.hwpx,.doc,.docx">`를 클릭), `샘플 RFP로 체험`(appearance primary).
  - analyzing: "RFP를 분석하고 있어요…" + Fluent `ProgressBar`(indeterminate 아님 — 부모가 넘기는 값 없이 `ProgressBar` 기본 indeterminate 사용 가능) + 보조 "사업명·발주처·예산·기간·마감일을 찾아 입력합니다". 버튼 비활성.
  - extracted: "AI가 사업개요를 채웠어요" + 보조 "강조 표시된 칸은 AI가 채운 값입니다. 원문 페이지와 다르면 바로 고치세요." + 버튼 `다시 하기`.
- input `onChange` 후 `event.currentTarget.value = ""`(같은 파일 재선택 허용).
- `error`가 있으면 `<p role="alert" className="tw:text-(--kpc-danger)">`.
- 스타일: `tw:rounded-lg tw:border tw:border-dashed tw:border-(--kpc-line-strong) tw:bg-(--kpc-card) tw:p-(--layout-card-inset)`, drag over 시 `tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)`.

### I03. RfpFileList

- Related Files:
  - `components/rfp/RfpFileList.tsx` :: `RfpFileList` — new
```typescript
interface RfpFileListProps { files: RfpFileMeta[]; disabled: boolean; onKindChange(id: string, kind: RfpFileKind): void; onRemove(id: string): void }
```
- 파일 없으면 `null` 반환. `<ul aria-label="업로드한 파일">`, 행: 파일명(말줄임, `title`), 크기(`(sizeBytes/1048576).toFixed(1) + " MB"`), Fluent `Select`(aria-label `"{파일명} 종류"`, 옵션 `RFP_FILE_KIND_LABELS`), `isMain`이면 Fluent `Badge appearance="tint"` "대표 RFP", 삭제 `Button appearance="subtle"` aria-label `"{파일명} 빼기"`.

### I04. ReviewerPicker

- Related Files:
  - `components/rfp/ReviewerPicker.tsx` :: `ReviewerPicker` — new
  - `components/profile/ProfileMenu.tsx` — Fluent `Popover`/`PopoverTrigger disableButtonEnhancement`/`PopoverSurface` 사용 예; read-only
```typescript
interface ReviewerPickerProps { selected: RfpPerson[]; disabled: boolean; onToggle(person: RfpPerson): void; onRemove(id: string): void; candidates?: ReviewerCandidate[] } // 기본값 getReviewerCandidates()
```
- 선택 칩: 각 선택자 `Avatar size={20} name` + 이름 + `Button appearance="subtle" aria-label="{이름} 검토자에서 빼기"`. 칩 영역 `<ul aria-label="선택한 검토자">`.
- 트리거 `Button icon={<Add16Regular/>}` "검토자 추가". `PopoverSurface aria-label="검토자 선택"` 안: 안내 "검토 담당자 지정 · 여러 명 가능", `Input` placeholder "이름 · 부서 검색"(열릴 때 autoFocus), 목록 최대 높이 300px 스크롤, 항목은 Fluent `Checkbox` label `"{이름} {직급} · {부서}"`, checked = 선택 여부, 변경 시 `onToggle({ id, name })`. 결과 없으면 "검색 결과가 없습니다". 선택 20명 도달 시 미선택 항목 disabled.
- 팝오버를 닫아도 선택은 즉시 반영된 상태(별도 확인 버튼 없음). 닫힐 때 검색어 초기화.

### I05. 동작 검토 포인트 (테스트 파일 작성 없음)
- 테스트 파일·`tests/` 폴더를 만들지 않는다. 구현 후 아래를 코드로 직접 확인한다.
- 후보에서 잠김(배유진)·초대(신현우)·삭제 사용자가 제외된다.
- UploadZone: 숨김 input `onChange` 후 `value = ""` 초기화, analyzing에서 버튼 disabled, `error`는 `role="alert"`.
- FileList: 대표 배지는 `isMain` 파일에만, Select·빼기 버튼에 파일명이 들어간 aria-label.
- ReviewerPicker: 팝오버 닫힐 때 검색어 초기화, 20명 도달 시 미선택 항목 disabled.

## Acceptance Criteria
- [ ] 세 컴포넌트가 상태를 내부에 저장하지 않고 props로만 동작한다(검색어·드래그 표시 같은 UI 일시 상태 제외).
- [ ] 잠김·초대·삭제 사용자가 검토자 후보에 나오지 않는다.
- [ ] I05 검토 포인트 확인, typecheck·lint 0 error.

## Validation
- `npm.cmd run typecheck` / `npm.cmd run lint` — 0 error
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(rfp): 업로드 드롭존·파일 목록·검토자 선택 컴포넌트 추가

Plan: 2026-11-02-rfp-register
Phase: P01-rfp-register-ui
Task: T03-upload-reviewer-components

- 드롭/파일 선택/샘플 체험과 분석 진행 상태를 갖는 RfpUploadZone
- 파일 종류 선택·대표 RFP 배지 RfpFileList
- 관리자 시드 활성 사용자 기반 Popover 검토자 선택 ReviewerPicker
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
