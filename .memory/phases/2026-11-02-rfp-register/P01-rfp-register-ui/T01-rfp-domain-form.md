# Task: T01 RFP 상수·스키마·폼 상태 로직

## Status: done

## Goal
RFP 등록 화면이 쓸 상수(샘플값·파일 종류·제한), 저장 레코드 zod 스키마, React 없이 테스트 가능한 폼 상태 reducer와 변환 함수를 만든다. UI(T03·T04)와 저장소(T02)가 같은 규칙(필수 5항목, AI 태그 해제, 50MB 제한, 예산 정수화)을 공유하게 하기 위함이다.

## Decision Summary
- D02·D03·D04: 레퍼런스 필드 그대로, 필수 5개, AI가 채운 칸을 사용자가 고치면 AI 태그 해제, 파일당 50MB 초과 거절, 담당부서·PM은 등록자 기본값.
- 파일 내용은 저장하지 않는다(메타데이터만). 이 Task는 순수 함수만 — DOM·IndexedDB·React 사용 금지.

## Implementation

### I01. 상수

- Related Files:
  - `config/rfp-register.ts` :: 상수 모음 — new
  - `config/comments.ts` — 상수 파일 스타일 참고; read-only

#### Details
```typescript
export const RFP_DB_NAME = "kpc-rfp-register";
export const RFP_DB_VERSION = 1;
export const RFP_SCHEMA_VERSION = 1 as const;
export const RFP_FILE_MAX_BYTES = 50 * 1024 * 1024;   // 파일당 50MB
export const RFP_FILE_MAX_COUNT = 30;
export const RFP_ANALYZE_DURATION_MS = 1000;          // 진행바 연출 시간
export const RFP_REVIEWER_MAX = 20;

export const RFP_FILE_KINDS = ["rfp", "related", "reference", "etc"] as const;
export type RfpFileKind = (typeof RFP_FILE_KINDS)[number];
export const RFP_FILE_KIND_LABELS: Record<RfpFileKind, string> = { rfp: "RFP", related: "사업 관련 문서", reference: "참고자료", etc: "기타 자료" };

export const RFP_PERIOD_OPTIONS = ["3개월", "6개월", "8개월", "12개월"] as const;
export type RfpPeriod = (typeof RFP_PERIOD_OPTIONS)[number];

export const RFP_TEXT_FIELDS = ["name", "org", "due", "budget", "summary", "official", "memo"] as const;
export type RfpTextField = (typeof RFP_TEXT_FIELDS)[number];
export const RFP_FIELD_LABELS: Record<RfpTextField | "period" | "reviewers", string> = {
  name: "프로젝트명", org: "발주처", due: "제안 마감일", budget: "사업예산 (원)", summary: "사업 주요내용 (RFP 핵심 과업 및 목적)",
  official: "사업명 (공식 공고명)", memo: "기타 사업 관련 메모", period: "사업기간", reviewers: "검토자",
};
export const RFP_REQUIRED_KEYS = ["name", "org", "due", "summary", "reviewers"] as const;

// "AI 추출" 시연값. page는 태그 "AI 추출 · p.N"에 표시한다.
export const RFP_SAMPLE_EXTRACTION: Readonly<Partial<Record<RfpTextField, { value: string; page: number }>>> = {
  name: { value: "공공기관 생성형 AI 기반 지능형 업무혁신 플랫폼 구축", page: 1 },
  official: { value: "2026년도 국가 디지털 행정 혁신 지원 사업 — 생성형 AI 업무혁신 플랫폼 구축", page: 1 },
  org: { value: "행정안전부 디지털정부혁신실", page: 1 },
  due: { value: "2026-11-27", page: 2 },
  budget: { value: "1200000000", page: 4 },
  summary: { value: "공공기관 맞춤형 생성형 AI 업무혁신 플랫폼 구축, 지능형 RAG 사내 지식검색, 보안 가이드라인 준수 망연계 시스템 구현.", page: 5 },
};
export const RFP_SAMPLE_PERIOD: RfpPeriod = "8개월";
export const RFP_SAMPLE_FILES = [
  { name: "2026_공공기관_생성형AI_업무혁신_플랫폼_구축_RFP.pdf", sizeBytes: 4_812_000 },
  { name: "과업지시서_세부과업내역서_v1.0.docx", sizeBytes: 1_204_000 },
] as const;
export const RFP_DATA_NOTICE = "예시 화면입니다. AI 추출은 샘플 값이며, 등록 내용은 이 브라우저에만 저장됩니다.";
export const RFP_DATA_NOTICE_SUMMARY = "예시 데이터 · 이 브라우저에만 저장";
```

### I02. zod 스키마

- Related Files:
  - `lib/rfp/schemas.ts` :: `RfpPersonSchema`, `RfpFileMetaSchema`, `RfpRecordSchema`, types — new
  - `lib/admin/record-schema.ts` :: `IdSchema` — 재사용 검토(id 형식이 맞지 않으면 사용하지 않고 `z.string().trim().min(1).max(200)`); read-only

#### Details
```typescript
import { z } from "zod";
export const RfpPersonSchema = z.strictObject({ id: z.string().trim().min(1).max(200), name: z.string().trim().min(1).max(80) });
export const RfpFileMetaSchema = z.strictObject({
  id: z.string().min(1).max(80), name: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().nonnegative().max(RFP_FILE_MAX_BYTES),
  kind: z.enum(RFP_FILE_KINDS), isMain: z.boolean(),
});
const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const RfpRecordSchema = z.strictObject({
  schemaVersion: z.literal(RFP_SCHEMA_VERSION),
  id: z.string().min(1).max(80),
  namespace: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  org: z.string().trim().min(1).max(120),
  dueDate: DateOnly,
  budgetKrw: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  summary: z.string().trim().min(1).max(4000),
  officialName: z.string().trim().max(300),            // "" 허용
  period: z.enum(RFP_PERIOD_OPTIONS).nullable(),
  memo: z.string().trim().max(4000),
  reviewers: z.array(RfpPersonSchema).min(1).max(RFP_REVIEWER_MAX)
    .refine((list) => new Set(list.map((p) => p.id)).size === list.length, "중복된 검토자입니다."),
  files: z.array(RfpFileMetaSchema).max(RFP_FILE_MAX_COUNT)
    .refine((list) => list.length === 0 || list.filter((f) => f.isMain).length === 1, "대표 RFP는 하나여야 합니다."),
  aiExtractedFields: z.array(z.enum(RFP_TEXT_FIELDS)),  // 등록 시점까지 AI 값이 유지된 칸
  registeredBy: RfpPersonSchema,
  pmId: z.string().trim().min(1).max(200),               // 등록자 id (D04)
  departmentName: z.string().trim().max(80).nullable(),  // 등록자 부서 (D04)
  status: z.literal("review"),
  createdAt: z.iso.datetime(),
});
export type RfpPerson = z.infer<typeof RfpPersonSchema>;
export type RfpFileMeta = z.infer<typeof RfpFileMetaSchema>;
export type RfpRecord = z.infer<typeof RfpRecordSchema>;
```
- 주의: 프로젝트는 zod v4(`^4.6.5`). `z.iso.datetime()`·`z.strictObject` 사용(관리자 스키마와 동일). `z.string().datetime()` 쓰지 않는다.

### I03. 오류 타입

- Related Files:
  - `lib/rfp/errors.ts` :: `RfpError`, `RfpErrorCode` — new
  - `lib/comments/domain.ts` :: `CommentError` — 형태 참고; read-only

```typescript
export type RfpErrorCode = "invalid" | "unidentified" | "forbidden" | "conflict" | "db_unavailable" | "db_blocked" | "storage";
export class RfpError extends Error {
  constructor(readonly code: RfpErrorCode, message: string, options?: { cause?: unknown }) { super(message, options); this.name = "RfpError"; }
}
```

### I04. 폼 상태 reducer와 순수 함수

- Related Files:
  - `lib/rfp/form.ts` :: `RfpFormState`, `RfpFormAction`, `createRfpFormState`, `rfpFormReducer`, `normalizeBudgetInput`, `formatBudget`, `rfpRequiredProgress`, `isPastDue`, `toRfpRecord` — new

#### Details
```typescript
export type RfpFormPhase = "idle" | "analyzing" | "extracted";
export interface RfpFormState {
  values: Record<RfpTextField, string>;     // 모든 칸 "" 시작. budget은 숫자만 담은 문자열
  period: RfpPeriod | null;
  reviewers: RfpPerson[];
  files: RfpFileMeta[];
  ai: Partial<Record<RfpTextField, number>>; // 필드 → 원문 페이지. 존재하면 AI 태그 표시
  phase: RfpFormPhase;
  fileError: string | null;                 // 파일 거절 안내(role="alert")
}
export type RfpFormAction =
  | { type: "set-field"; field: RfpTextField; value: string }
  | { type: "set-period"; period: RfpPeriod | null }
  | { type: "add-files"; files: { id: string; name: string; sizeBytes: number }[] }
  | { type: "set-file-kind"; id: string; kind: RfpFileKind }
  | { type: "remove-file"; id: string }
  | { type: "start-analysis" }
  | { type: "finish-analysis" }
  | { type: "toggle-reviewer"; person: RfpPerson }
  | { type: "remove-reviewer"; id: string }
  | { type: "reset" };
export function createRfpFormState(): RfpFormState;
export function rfpFormReducer(state: RfpFormState, action: RfpFormAction): RfpFormState;
export function normalizeBudgetInput(raw: string): string;     // 숫자 이외 제거, 앞 0 제거("0"은 유지), 최대 16자리
export function formatBudget(digits: string): string;           // "1200000000" → "1,200,000,000", "" → ""
export function rfpRequiredProgress(state: RfpFormState): { done: number; total: 5; missing: string[] }; // missing은 RFP_FIELD_LABELS 라벨
export function isPastDue(due: string, today: string): boolean; // 둘 다 YYYY-MM-DD, due < today면 true, 빈 값은 false
export function toRfpRecord(state: RfpFormState, ctx: {
  id: string; namespace: string; actor: RfpPerson; departmentName: string | null; now: string;
}): RfpRecord;
```
- 실행 규칙:
  1. `set-field`: `budget`이면 `normalizeBudgetInput` 적용 후 저장. 값이 바뀌면 `ai[field]` 삭제(같은 값이면 유지). 다른 상태 불변.
  2. `add-files`: 각 파일 `sizeBytes > RFP_FILE_MAX_BYTES`면 제외하고 `fileError = "{이름}: 파일당 50MB를 넘을 수 없습니다."`(여러 개면 첫 이름 + " 외 N개"). 합계가 `RFP_FILE_MAX_COUNT` 초과 시 초과분 제외 + `"파일은 최대 30개까지 올릴 수 있습니다."`. 정상 파일이 하나도 없으면 phase 변경 없음. 기존 목록이 비어 있었으면 추가된 첫 파일을 `isMain: true, kind: "rfp"`, 나머지는 `isMain: false, kind: "related"`. 거절이 없으면 `fileError = null`.
  3. `set-file-kind`: 해당 id만 kind 변경. `isMain`은 바꾸지 않는다.
  4. `remove-file`: 삭제. 삭제된 것이 대표였고 남은 파일이 있으면 첫 남은 파일을 `isMain: true`. 목록이 비면 phase는 그대로 둔다.
  5. `start-analysis`: phase `"analyzing"`. `finish-analysis`: `RFP_SAMPLE_EXTRACTION`의 각 필드를 `values`에 덮어쓰고 `ai`를 해당 page로 설정, `period = RFP_SAMPLE_PERIOD`, phase `"extracted"`. phase가 `"analyzing"`이 아니면 무시(언마운트·다시 하기 후 늦게 도착한 타이머 대비).
  6. `toggle-reviewer`: id가 있으면 제거, 없으면 뒤에 추가. 20명 초과는 추가하지 않음. `remove-reviewer`: 제거.
  7. `reset`: `createRfpFormState()` 반환(검토자 포함 전체 초기화).
  8. `rfpRequiredProgress`: name·org·due·summary는 `trim()` 비어 있지 않음, reviewers는 length ≥ 1.
  9. `toRfpRecord`: `budgetKrw = values.budget ? Number(values.budget) : null`(Number.isSafeInteger 아니면 RfpError "invalid" "사업예산을 확인해 주세요."), `dueDate = values.due`, `officialName = values.official`, `memo = values.memo`, `aiExtractedFields = Object.keys(ai)` (RFP_TEXT_FIELDS 순서), `pmId = actor.id`, `registeredBy = actor`, `status: "review"`, `schemaVersion: 1`, `createdAt = now`. 최종 `RfpRecordSchema.safeParse` 실패 시 `new RfpError("invalid", "필수 항목을 확인해 주세요.", { cause: error })`.

### I05. 동작 검토 포인트 (테스트 파일 작성 없음)
- 테스트 파일·`tests/` 폴더를 만들지 않는다. 구현 후 아래를 코드로 직접 확인한다.
- `finish-analysis`는 phase가 `"analyzing"`일 때만 적용되고, 아니면 같은 state 참조를 반환한다.
- `set-field`로 값이 바뀔 때만 해당 `ai` 키가 삭제된다.
- `normalizeBudgetInput("1,200,000,000원") === "1200000000"`, `"007"` → `"7"`.
- 50MB 초과 파일 거절 메시지, 대표 RFP 승계, 30개 제한, 검토자 20명 제한, `reset`이 초기 상태와 같다.
- `toRfpRecord`는 필수 누락 시 `RfpError("invalid")`, 예산 빈 값은 `null`.

## Acceptance Criteria
- [x] `config/rfp-register.ts`, `lib/rfp/schemas.ts`, `lib/rfp/errors.ts`, `lib/rfp/form.ts`가 React·DOM 의존 없이 컴파일된다.
- [x] I05 검토 포인트를 코드에서 확인했다.
- [x] typecheck·lint 오류 없음.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(rfp): 등록 폼 상수·스키마·상태 로직 추가

Plan: 2026-11-02-rfp-register
Phase: P01-rfp-register-ui
Task: T01-rfp-domain-form

- RFP 등록 상수(샘플 추출값, 파일 종류, 50MB 제한) 정의
- RfpRecord zod 스키마와 RfpError 추가
- 필수 5항목·AI 태그 해제·예산 정수화 reducer
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (typecheck·lint 통과, I05 검토 포인트는 저장소 밖 임시 스크립트로 확인)
- commit: pending
