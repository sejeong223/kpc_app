# Task: T03 등록 화면 디자인·알림 4종 연결

## Status: pending

## Goal
`RfpRegisterPage`의 사업개요 폼을 레퍼런스 모양(노란 AI 칸·보라 AI 태그·파란 필수 별표·원형 기간 칩·큰 등록 버튼·폭 제한 없음)으로 바꾸고, 레퍼런스 알림 4종(분석 완료·업로드 제한 초과·검토자 지정/해제·등록 성공)을 T01 공통 알림으로 띄우며, 화면 안 성공 문구를 없앤다.

## Decision Summary
- D01: 레퍼런스 값 그대로, 빨강 → 파랑. AI 칸 노랑(`#fffdf3`/`#ecd98f`)·AI 태그 보라(`#6b3fc4`/`#f4effe`)는 의미 색이라 유지.
- D03: 알림은 4종만. 파일 종류 변경·파일 빼기·다시 하기·업로드 시작·사업기간 칩에는 알림 없음.
- D04: 등록 성공 `role="status"` 문구 삭제(알림만). 등록 실패 `role="alert"`·사용자 정보 없음 `role="alert"`는 유지. 같은 업로드 오류가 반복돼도 매번 알림.

## Implementation

### I01. 업로드 거절 문구를 미리 계산하는 순수 함수

- Related Files:
  - `lib/rfp/form.ts` :: `describeFileRejection` (new export), `addFiles`(내부 함수) — modify
- 이유: 알림은 dispatch 직후에 띄워야 하는데 reducer의 새 `fileError`는 다음 렌더 전까지 읽을 수 없고, `useEffect`로 `fileError` 변화를 보면 **같은 문구가 연속될 때 알림이 뜨지 않는다**(D04 위반).
```typescript
export function describeFileRejection(currentCount: number, incoming: { name: string; sizeBytes: number }[]): string | null;
```
- 로직: 현재 `addFiles` 내부의 메시지 계산(50MB 초과 → `"{첫 이름}[ 외 N개]: 파일당 50MB를 넘을 수 없습니다."`, 남은 자리 `RFP_FILE_MAX_COUNT - currentCount`보다 허용 파일이 많으면 `"파일은 최대 30개까지 올릴 수 있습니다."`, 둘 다면 공백으로 이어 붙임, 없으면 `null`)를 이 함수로 옮기고, `addFiles`는 `fileError: describeFileRejection(state.files.length, incoming)`으로 사용한다. 문구·동작은 바뀌지 않는다.

### I02. 알림 연결

- Related Files:
  - `components/rfp/RfpRegisterPage.tsx` :: `RfpRegisterPage` — modify
  - `components/ui/AppToast.tsx` :: `useAppToast` — T01 산출물; read-only
- `const toast = useAppToast();`
1. **업로드 제한 초과**: `addFiles(files)` 첫 부분에서 `const rejection = describeFileRejection(state.files.length, files); if (rejection) toast.notify(rejection, "error");` 후 기존 dispatch. (샘플 버튼 경로도 같은 함수를 지나므로 자동 처리 — 샘플 파일은 제한 안이라 알림 없음.)
2. **분석 완료**: 분석 타이머 콜백 `() => { timer.current = null; dispatch({ type: "finish-analysis" }); toast.notify("AI가 사업개요를 채웠습니다", "success"); }`. "다시 하기"·언마운트·등록 성공 시 `stopTimer()`가 타이머를 지우므로 취소된 분석에는 알림이 뜨지 않는다.
3. **검토자 지정·해제**: `ReviewerPicker`의 `onToggle={(person) => { const removing = state.reviewers.some((p) => p.id === person.id); if (!removing && state.reviewers.length >= RFP_REVIEWER_MAX) return; dispatch({ type: "toggle-reviewer", person }); toast.notify(removing ? \`${person.name}님을 검토 담당자에서 뺐습니다\` : \`${person.name}님을 검토 담당자로 지정했습니다\`, "success"); }}`, `onRemove={(id) => { const person = state.reviewers.find((p) => p.id === id); dispatch({ type: "remove-reviewer", id }); if (person) toast.notify(\`${person.name}님을 검토 담당자에서 뺐습니다\`, "success"); }}`. (`RFP_REVIEWER_MAX`는 `@/config/rfp-register`에서 import.)
4. **등록 성공**: 기존 `setNotice(...)` 대신 `toast.notify(\`'${record.name}' RFP를 등록했습니다\`, "success")`. `notice` 상태와 `<p role="status">` 삭제, 관련 `setNotice(null)` 호출도 삭제(restart·addFiles·submit 시작부).
5. 등록 실패 `submitError` `<p role="alert">`와 `!identity` `<p role="alert">`는 유지(알림 없음).

### I03. 폼 디자인

- Related Files:
  - `components/rfp/RfpRegisterPage.tsx` — modify
- 현재: 래퍼 `tw:mx-auto tw:max-w-[960px]`, `WorkspaceCard title="사업개요" actions="필수 n/5"`, 2열 그리드(`tw:md:grid-cols-2`, gap `--layout-section-gap`), Fluent `Field`+`Input`/`Textarea`, AI 칸은 `data-ai="true"` + 인라인 `style` 브랜드 옅은 배경, 라벨 옆 `Badge informative` "AI 추출 · p.N", "추가 정보" section(점선), 사업기간 `ToggleButton` 4개, 하단 누락 안내 + 큰 primary "등록".
- 변경(`makeStyles` 사용 — Fluent 컴포넌트 대상):
  1. 래퍼: `tw:mx-auto tw:max-w-[960px]` 삭제 → `tw:flex tw:w-full tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)` (폭 제한 없음, D01 정정).
  2. 카드 헤더 오른쪽: `"* 필수 {done}/{total}"`(11px `--kpc-muted`, `*`는 `--kpc-brand`).
  3. 그리드 gap: 행 12px · 열 14px(`tw:gap-x-[14px] tw:gap-y-3`). 1열 전환 기준은 기존 `tw:md:` 유지.
  4. 라벨(레퍼런스 `.label`): `Field` className으로 `"& .fui-Field__label": { fontSize: "11px", fontWeight: 700, color: "#55585f" }`, 필수 별표 `"& .fui-Label__required": { color: "var(--kpc-brand)" }`. Field 내부 gap 5px.
  5. AI 태그(레퍼런스 `.ai-tag`): Fluent `Badge` 대신 `<span>`(일반 요소, `tw:`): `inline-flex; align-items:center; gap:3px; margin-left:6px; padding:1px 5px; border-radius:4px; font-size:9.5px; font-weight:800; color:#6b3fc4; background:#f4effe` + `Sparkle12Regular` + "AI 추출 · p.{page}". 기존 `Badge` import는 미사용이면 삭제.
  6. AI 칸: 인라인 `style`(AI_INPUT_STYLE) 삭제 → `makeStyles` `aiField: { backgroundColor: "#fffdf3", ...shorthands.borderColor("#ecd98f") }`를 `Input`/`Textarea` root `className`에 조건부 적용(`mergeClasses`). `data-ai="true"`는 유지(검토용 표식).
  7. 입력 공통(레퍼런스 `.inp`): 높이 32px, radius 8px, 12px. `makeStyles`로 Input root 높이/radius, Textarea는 `line-height:1.6`.
  8. "추가 정보" 구획(레퍼런스 `.sub-sec`): 위 1px dashed `--kpc-line`, `margin-top:18px`, `padding-top:16px`, 제목 12.5px 800 `#34363c` margin-bottom 12px. 내부 그리드는 위 3번과 같음.
  9. 사업기간 칩(레퍼런스 `.chip`): `ToggleButton` → 일반 `<button type="button" aria-pressed={checked}>` 4개(`tw:` 스타일): 높이 28px, padding 0 10px, radius 14px, 1px `#dddde2`, 흰 배경, 11.5px 650 `#55585f`, hover 테두리 `#c4c6cc`. 선택: 테두리 `--kpc-brand`, 글자 `--kpc-brand-ink`, 배경 `--kpc-brand-soft`, 800. 그룹 `role="group" aria-label="사업기간"`, gap 6px. 같은 칩 다시 누르면 해제(기존 동작 유지). `ToggleButton` import 삭제.
  10. 등록 줄(레퍼런스 `.reg-foot`): `justify-content:flex-end; margin-top:14px`. 누락 안내(11px muted) 유지. 등록 버튼(레퍼런스 `.btn.primary.lg`): 높이 38px, padding 0 16px, 13px 700, radius 8px, 배경·테두리 `--kpc-brand`, hover `--kpc-brand-hover`, 오른쪽 `ArrowRight16Regular` 아이콘(`iconPosition="after"`), 문구 "등록"/"등록 중…". disabled 조건 유지.
  11. 기존 placeholder·필드 순서·`type="date"`·`inputMode="numeric"`·`formatBudget` 표시·마감일 경고(`validationState="warning"`)는 유지.

### I04. 동작 검토 포인트 (테스트 파일 작성 없음)
- 알림은 4종 경로에서만 호출된다(`toast.notify` 호출 위치 5곳: 업로드 거절, 분석 완료, 검토자 토글, 칩 ×, 등록 성공).
- 같은 50MB 초과 파일을 두 번 올리면 알림이 두 번 뜬다(`describeFileRejection`을 매번 호출).
- 검토자 20명 상태에서 미선택 후보를 눌러도 알림이 뜨지 않는다(조기 return).
- 다시 하기 직후 이전 분석 타이머 알림이 뜨지 않는다(`stopTimer`).
- `role="status"` 문구가 화면에 없고, 등록 실패·사용자 정보 없음 `role="alert"`는 남는다.
- `git grep -n -i "d7192f\|c91c2b\|fff0f2\|max-w-\[960px\]" components/rfp` 결과 없음.

## Acceptance Criteria
- [ ] 알림 4종이 D03 문구대로 연결되고 그 외 동작에는 알림이 없다.
- [ ] 등록 성공 화면 문구가 없고 실패 문구는 남는다.
- [ ] 폼이 D01 표의 모양을 따른다(코드 값 기준).
- [ ] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책). 알림 표시·색은 코드로만 확인했음을 보고에 명시한다.

## Commit Message
```text
feat(rfp): 등록 화면 레퍼런스 디자인 적용 및 알림 4종 연결

Plan: 2026-11-02-rfp-register-design-notify
Phase: P01-design-notify
Task: T03-page-design-notify

- 노란 AI 칸·보라 AI 태그·파란 필수 별표·원형 기간 칩·큰 등록 버튼
- 분석 완료·업로드 제한·검토자 지정/해제·등록 성공 알림 연결
- 등록 성공 화면 문구 제거, 업로드 거절 문구 계산을 describeFileRejection으로 분리
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
