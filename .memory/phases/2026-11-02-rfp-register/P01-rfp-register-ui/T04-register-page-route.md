# Task: T04 등록 화면 조립과 라우트 연결

## Status: pending

## Goal
T01~T03을 조립한 `RfpRegisterPage`를 만들고 `/workspace/register`의 빈 자리표시자를 교체한다. 사용자가 실제로 파일→AI 추출 흉내→확인·수정→검토자 지정→등록까지 한 화면에서 끝낼 수 있게 하기 위함이다.

## Decision Summary
- D04: 필수 5항목 충족 시에만 등록 활성, "필수 n/5" 표시, 사업예산 콤마 표시, 과거 마감일 경고(등록은 허용).
- D02·D06·D07: 등록 시 `IndexedDbRfpRepository.create` → 성공하면 폼 `reset` + `<p role="status">` 완료 안내(토스트 컴포넌트 신규 도입 없음).
- D08 계획 기본값: 한 열, 본문 최대 폭 960px, 드롭존 → 파일 목록 → 사업개요 카드 → 하단 오른쪽 등록 버튼.

## Implementation

### I01. 화면 컴포넌트

- Related Files:
  - `components/rfp/RfpRegisterPage.tsx` :: `RfpRegisterPage` (default export, `"use client"`) — new
  - `components/layout/WorkspacePage.tsx` :: `WorkspacePage` (`title`, `dataNotice`, `dataNoticeSummary`) — read-only
  - `components/layout/WorkspaceCard.tsx` :: `WorkspaceCard`(title, actions) — read-only
  - `components/providers.tsx` :: `useAuthRuntime` → `{ authEnabled, session }` — read-only
  - `components/profile/ProfilePreviewProvider.tsx` :: `useProfilePreview` → `profile.name`, `profile.department` — read-only

```typescript
interface RfpRegisterPageProps {
  repositoryFactory?: () => RfpRepository;   // 기본 () => new IndexedDbRfpRepository()  (교체 가능한 의존성)
  createId?: () => string;                   // 기본 () => crypto.randomUUID()
  now?: () => Date;                          // 기본 () => new Date()
  analyzeDelayMs?: number;                   // 기본 RFP_ANALYZE_DURATION_MS
}
export default function RfpRegisterPage(props: RfpRegisterPageProps): React.ReactElement;
```
- 상태: `useReducer(rfpFormReducer, undefined, createRfpFormState)`, `submitting: boolean`, `notice: string | null`, `submitError: string | null`.
- 식별: `useMemo(() => resolveRfpIdentity({ authEnabled, session, displayName: profile.name }), ...)`. null이면 등록 버튼 비활성 + `role="alert"` "사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.".
- 저장소: `useState(() => repositoryFactory())`, 언마운트 시 `repository.close()`.
- 분석 흉내: `onFiles(files)` → `dispatch(add-files, files.map(f => ({ id: createId(), name: f.name, sizeBytes: f.size })))`. 추가 후 정상 파일이 하나라도 있었고 phase가 idle이면 `start-analysis` + `setTimeout(analyzeDelayMs) → finish-analysis`. `onSample` → `RFP_SAMPLE_FILES`로 add-files 후 동일. 타이머 id를 ref로 보관하고 `onRestart`·언마운트에서 `clearTimeout`. `onRestart` → `reset`(파일·값·검토자 모두 초기화, notice 제거).
  - 정상 파일 여부 판단: reducer 적용 전 `files.some(f => f.size <= RFP_FILE_MAX_BYTES)`로 계산(reducer 결과를 기다리지 않음).
- 레이아웃(`WorkspacePage title="RFP 등록" dataNotice={RFP_DATA_NOTICE} dataNoticeSummary={RFP_DATA_NOTICE_SUMMARY}`) 안의 래퍼 `tw:mx-auto tw:flex tw:w-full tw:max-w-[960px] tw:flex-col tw:gap-(--layout-section-gap)`:
  1. `RfpUploadZone`
  2. `RfpFileList`(disabled = analyzing || submitting)
  3. `WorkspaceCard title="사업개요" actions={<span>필수 {done}/5</span>}`:
     - 2열 그리드 `tw:grid tw:grid-cols-1 tw:md:grid-cols-2 tw:gap-(--layout-section-gap)` (코드 확인: 반응형은 `tw:md:grid-cols-2`처럼 `tw:` 뒤에 변형자를 붙인다). 전체 폭 칸은 `tw:md:col-span-2`.
     - 필드 순서: 프로젝트명*(placeholder "내부에서 부를 이름"), 발주처*, 제안 마감일*(`type="date"`), 사업예산(원)(표시값 `formatBudget`, `inputMode="numeric"`, placeholder "예: 1,200,000,000"), 사업 주요내용*(Textarea, 3줄, 전체 폭).
     - "추가 정보" 소구획(상단 점선 구분 `tw:border-t tw:border-dashed tw:border-(--kpc-line)`): 사업명(공식 공고명)(전체 폭), 사업기간 칩(Fluent `ToggleButton` 4개, 같은 값 다시 누르면 해제), 검토자*(`ReviewerPicker`, 전체 폭), 기타 메모(Textarea, 전체 폭, AI 태그 없음).
     - 각 칸은 Fluent `Field label`; 필수는 `required`. AI 값(`state.ai[field]` 존재) 칸: 라벨 옆 `Badge appearance="tint" color="informative"` `AI 추출 · p.{page}` + 입력 배경 `--kpc-brand-soft`(`data-ai="true"`로 표시해 테스트 가능). 레퍼런스의 노란 배경 대신 브랜드 옅은 배경을 쓴다(D08 색 기준).
     - 마감일이 `isPastDue(due, todayYmd(now()))`이면 `Field validationState="warning" validationMessage="마감일이 이미 지났습니다. 날짜를 확인하세요."`.
  4. 하단 줄 `tw:flex tw:justify-end tw:items-center tw:gap-(--layout-control-gap)`: 누락 안내(`필수 항목: {missing.join(", ")}` muted, 다 채우면 숨김) + `Button appearance="primary" size="large"` "등록" — disabled = `done < 5 || submitting || phase === "analyzing" || !identity`.
  5. `notice` → `<p role="status">`, `submitError` → `<p role="alert">`.
- 등록: `toRfpRecord(state, { id: createId(), namespace: identity.namespace, actor: { id: identity.actor.id, name: identity.actor.name }, departmentName: profile.department, now: now().toISOString() })` → `await repository.create(identity, record)` → 성공 시 이전 타이머 정리, `dispatch(reset)`, `notice = "'{name}' RFP를 등록했습니다. 검토 목록 화면은 준비 중입니다."`, 첫 입력(프로젝트명)으로 포커스 이동. 실패 시 `RfpError`면 그 message, 아니면 "RFP를 저장하지 못했습니다. 다시 시도해 주세요." → `submitError`, 입력값 유지. 저장 중에는 버튼 텍스트 "등록 중…".
- `todayYmd(date)`: 로컬 날짜 `YYYY-MM-DD` — `lib/rfp/form.ts`에 export 추가(T01 파일 수정 허용).

### I02. 라우트 연결

- Related Files:
  - `app/(authenticated)/workspace/[screen]/page.tsx` :: `WorkspaceScreenPage` — modify
- 마지막 return의 삼항을 확장: `screen === "write" ? <CommentsWorkspace /> : screen === "register" ? <RfpRegisterPage /> : <WorkspacePage .../>`. `PreviewRoleBoundary`로 감싸는 구조와 관리자 분기 순서는 변경하지 않는다. `register`는 `requiredRole` 없음(일반 사용자 접근).

### I03. 동작 검토 포인트 (테스트 파일 작성 없음)
- 테스트 파일·`tests/` 폴더를 만들지 않는다. 구현 후 아래를 코드로 직접 확인한다.
- 초기 등록 버튼 disabled, "필수 0/5".
- 샘플 체험 → 6개 칸 AI 표시(`data-ai="true"`), 파일 2개 중 대표 1개, 사업기간 "8개월".
- AI 칸 수정 시 해당 칸 표시만 해제, 저장 레코드의 `aiExtractedFields`에서 제외.
- 등록 성공 → `create` 1회, `namespace`·`budgetKrw` 정수 저장, 폼 초기화 + `role="status"`. 실패 → `role="alert"`, 입력 유지.
- 과거 마감일은 경고만 표시하고 등록은 허용. 50MB 초과 파일만 고르면 분석이 시작되지 않는다.
- "다시 하기"·언마운트 시 분석 타이머 `clearTimeout`.

## Acceptance Criteria
- [ ] `/workspace/register`가 빈 화면 대신 등록 화면을 렌더링한다(코드상 분기 확인 + build 성공).
- [ ] I03 검토 포인트 확인.
- [ ] 레퍼런스 빨간색(`#d7192f`)·레퍼런스 CSS 클래스명이 새 코드에 없다 (`git grep -n "d7192f" components/rfp` 결과 없음).
- [ ] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책). build 성공을 육안 검증으로 표현하지 않는다.

## Commit Message
```text
feat(rfp): RFP 등록 화면 목업 구현 및 라우트 연결

Plan: 2026-11-02-rfp-register
Phase: P01-rfp-register-ui
Task: T04-register-page-route

- 드롭존·파일 목록·사업개요 카드·검토자 선택을 조립한 RfpRegisterPage
- 샘플 AI 추출, 필수 5항목 검사, 과거 마감일 경고, IndexedDB 등록
- /workspace/register 자리표시자를 등록 화면으로 교체
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
