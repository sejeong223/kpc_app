# Task: T04 검토자 팝오버에 공통 부품·정렬·열림 방향 연결

## Status: done

## Goal
`ReviewerPicker`가 T03의 `PersonCheckList`·`PersonAvatar`를 쓰고, 목록을 열 때 "지정자 → 내 부서 → 가나다"로 정렬하며(체크 시 줄 고정), 팝오버를 레퍼런스 `popAt()` 규칙(아래 우선·높이 줄이기 최소 160px·필요할 때만 위)으로 연다.

## Decision Summary
- D02: 레퍼런스 `popAt()` — `if (r.bottom+6+h > innerHeight-8 && r.top-6-h > 8)` 위, 아니면 아래 + `maxHeight = max(160, innerHeight - r.bottom - 16)`.
- D06·D07: 공통 부품 사용, 정렬은 열 때·검색할 때만, 정렬 기준 지정자는 열 때 고정.
- 근거(코드 확인): Fluent 위치 계산의 flip은 `fallbackStrategy: 'bestFit'`(`@fluentui/react-positioning/lib/middleware/flip.js`) — 위·아래 모두 다 안 들어가면 덜 넘치는 쪽(대개 위)을 고른다. 또한 flip이 `autoSize`(maxSize)보다 먼저 돌아 "아래로 줄여서 열기"가 되지 않는다. → **방향은 직접 계산하고 Fluent flip은 `pinned: true`로 끈다.**

## Review Fixes (2026-11-03, 사용자 확인 + 사용자 허용 하의 Playwright 진단)
- **증상**: ① 팝오버를 줄였을 때 안쪽 목록이 1줄만 보임 ② 팝오버 바깥 스크롤이 내용보다 더 내려가 빈 화면이 보임 ③ 버튼 아래 공간이 없어도 위로 안 열리고 계속 아래로 열림.
- **진단** (사용자가 이번에 한해 브라우저 실행 허용, 실행 중이던 개발 서버 + Edge `channel: "msedge"`, 스크립트는 세션 scratchpad): 내용은 약 387px(제목·검색 87 + 목록 300)인데 팝오버 `scrollHeight`가 **787px**. 목록 안 `position: absolute` 요소(체크박스 숨은 input, 아바타 이니셜, 배지 `tw:sr-only`)의 기준 부모가 목록이 아니라 팝오버(Fluent가 `position:absolute`)라 목록 스크롤을 빠져나가 팝오버 높이를 늘렸다. → 787px로 판정해 위로 못 열고(②③), 화면 밖으로 넘친 팝오버가 페이지 높이도 늘렸다.
- **조치**:
  1. `PersonCheckList` 루트에 `tw:relative` (T03 Review Fixes 참고) — absolute 자식이 목록 안에 갇힌다.
  2. 팝오버를 레퍼런스 `.pop`처럼 **블록 + 전체 스크롤**로: `PopoverSurface` `tw:block`(flex 제거), `style={{ maxHeight: maxHeight ?? "70vh", overflowY: "auto" }}`. 안쪽 목록 `tw:max-h-[300px] tw:overflow-y-auto`는 줄지 않는다(①). 검색칸은 레퍼런스 `.search`처럼 `<div className="tw:mx-1 tw:mb-1.5 tw:flex">` + `DadamInput className="tw:min-w-0 tw:flex-1"`.
- **수정 후 측정** (뷰포트 1280×720 등):
  - 버튼이 아래 끝 근처(top 658): `top-start`, scrollHeight 402 = clientHeight 402
  - 버튼이 가운데(top 476, 아래 212px): 위에 통째로 들어가 `top-start`
  - 아래에 다 들어감(top 150): `bottom-start`, maxHeight 70vh
  - 위·아래 모두 부족(뷰포트 높이 520, top 276): `bottom-start`, maxHeight 196px, 화면 안(bottom 510 < 520), 팝오버 전체 스크롤
- 이 진단 실행은 브라우저 검증 제외 정책의 예외(사용자 명시 허용)이며, 이후 Task 검증 방식은 바뀌지 않는다.

## Implementation

### I01. 열림 방향 계산

- Related Files:
  - `components/rfp/ReviewerPicker.tsx` :: `ReviewerPicker` — modify

#### Details
- **상수** (레퍼런스 `popAt` 값):
  ```ts
  const POP_GAP = 6;          // 버튼과 팝오버 간격 (positioning offset과 같음)
  const VIEWPORT_MARGIN = 8;  // 화면 위·아래 여유
  const POP_MIN_HEIGHT = 160; // 아래로 열 때 최소 높이
  const POP_BOTTOM_MARGIN = 16;
  ```
- **상태·ref**:
  ```ts
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  ```
- **열기/닫기** (`onOpenChange`):
  ```ts
  onOpenChange={(_, data) => {
    setOpen(data.open);
    if (data.open) { setPlacement("below"); setMaxHeight(null); setPinnedIds(new Set(selected.map((p) => p.id))); }
    else setQuery("");
  }}
  ```
- **측정** — 기존 포커스 effect를 확장한다(같은 rAF 안에서 측정 후 포커스):
  ```ts
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const trigger = triggerRef.current, surface = surfaceRef.current;
      if (trigger && surface) {
        const r = trigger.getBoundingClientRect();
        const h = surface.scrollHeight; // 줄이기 전 원래 높이
        const vh = window.innerHeight;
        if (r.bottom + POP_GAP + h > vh - VIEWPORT_MARGIN && r.top - POP_GAP - h > VIEWPORT_MARGIN) setPlacement("above");
        else if (r.bottom + POP_GAP + h > vh - VIEWPORT_MARGIN) setMaxHeight(Math.max(POP_MIN_HEIGHT, vh - r.bottom - POP_BOTTOM_MARGIN));
      }
      searchInput.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  ```
  - setState는 rAF 콜백 안이라 `react-hooks/set-state-in-effect` 규칙에 걸리지 않는다(동기 호출 금지).
  - 측정은 **열 때 한 번**만(레퍼런스와 같음). 검색으로 목록 높이가 바뀌어도 방향은 유지.
- **Popover**:
  ```tsx
  <Popover open={open} trapFocus unstable_disableAutoFocus
    positioning={{ position: placement, align: "start", offset: POP_GAP, pinned: true }}
  ```
  - 기존 주석(자동 포커스 끄기 이유)은 유지하고, `pinned` 이유 한 줄 추가: "Fluent flip은 bestFit이라 레퍼런스 규칙과 달라 방향을 직접 정한다."
- **Trigger 버튼**: `<Button ref={triggerRef} ...>검토자 추가</Button>` (React 19에서 `ref`는 prop으로 전달되고 공통 `Button`이 `...props`로 `<button>`에 넘긴다. `PopoverTrigger`는 자식 ref를 병합한다).
- **Surface**:
  ```tsx
  <PopoverSurface ref={surfaceRef} aria-label="검토자 선택"
    style={maxHeight !== null ? { maxHeight, overflowY: "auto" } : undefined}
    className="tw:flex tw:w-[320px] tw:max-w-[calc(100vw-32px)] tw:flex-col tw:rounded-[12px] tw:p-1.5">
  ```
  - 안쪽 목록의 `tw:max-h-[300px] tw:overflow-y-auto`는 유지(레퍼런스 `#rv-list` max-height 300px).

### I02. 공통 부품·정렬 연결

- Related Files:
  - `components/rfp/ReviewerPicker.tsx` — modify
  - `components/rfp/RfpRegisterPage.tsx` :: `ReviewerPicker` 호출부 — modify (prop 1개)
  - `components/ui/PersonCheckList.tsx`, `components/ui/PersonAvatar.tsx`, `lib/rfp/reviewers.ts` :: `sortReviewerCandidates` — T03 산출물; read-only

#### Details
- **Props 추가**:
  ```ts
  interface ReviewerPickerProps {
    selected: RfpPerson[];
    disabled: boolean;
    onToggle(person: RfpPerson): void;
    onRemove(id: string): void;
    candidates?: ReviewerCandidate[];
    /** 같은 부서 우선 정렬 기준. 등록하는 사람의 부서 */
    preferredDepartment?: string | null; // new
  }
  ```
  `RfpRegisterPage`: `<ReviewerPicker selected={state.reviewers} disabled={locked} preferredDepartment={profile.department} onToggle={toggleReviewer} onRemove={removeReviewer} />` (`profile.department`는 `config/profile-preview.ts`의 `string | null`).
- **정렬** (열 때 고정):
  ```ts
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(() => new Set());
  const rows = useMemo(
    () => sortReviewerCandidates(filterReviewerCandidates(pool, query), { pinnedIds, department: preferredDepartment ?? null }),
    [pool, query, pinnedIds, preferredDepartment],
  );
  ```
  - `pinnedIds`는 `onOpenChange` 열 때만 갱신 → 체크해도 줄이 움직이지 않는다(`selectedIds`는 정렬에 쓰지 않음).
- **목록 교체**: 기존 `rows.length ? rows.map(... <label> ...) : <p>검색 결과가 없습니다</p>` 블록 전체를
  ```tsx
  <div className="tw:flex tw:max-h-[300px] tw:flex-col tw:overflow-y-auto">
    <PersonCheckList people={rows} selectedIds={selectedIds} max={RFP_REVIEWER_MAX}
      itemLabel={(c) => `${c.name} 검토자 선택`} onToggle={(c) => onToggle({ id: c.id, name: c.name })} />
  </div>
  ```
  로 바꾼다. 기존 `full`·`locked` 계산과 `DadamCheckbox` import는 제거(미사용 import 금지).
- **선택 칩 아바타**: `<Avatar size={24} name={person.name} aria-hidden="true" />` →
  ```tsx
  const byId = useMemo(() => new Map(pool.map((c) => [c.id, c])), [pool]);
  <PersonAvatar name={person.name} photoUrl={byId.get(person.id)?.photoUrl ?? null} colorId={person.id} size={24} />
  ```
  (후보에 없는 사람도 성씨로 표시). Fluent `Avatar` import는 미사용이면 제거.
- 제목 문단·검색칸(`DadamInput`, `searchInput` ref)·칩 × 버튼·"검토자 추가" 버튼 모양은 그대로.

### I03. 동작 검토 포인트 (테스트 파일 작성 없음)
- 버튼 아래 공간이 충분하면 아래로, 아래가 모자라고 위에 다 들어가면 위로, 둘 다 모자라면 아래로 열리며 surface `maxHeight ≥ 160`·내부 스크롤 — 코드 분기 확인 + 육안 확인 항목.
- 열 때 이미 지정된 사람이 위에, 그다음 등록자 부서 사람. 체크해도 줄 순서가 바뀌지 않음(정렬 의존성에 `selected` 없음).
- 20명 도달 시 미선택 행 비활성(`max`), 화면 잠금(`disabled`) 시 팝오버 버튼 비활성.
- 칩·목록 아바타가 사람 아이콘이 아니라 성씨로 보인다(`initials` 직접 지정).
- T03 `PersonCheckList` 행에 SA/Admin 배지(시드: 정소담·이예진 SA, 부서 관리자 Admin).

## Acceptance Criteria
- [x] `ReviewerPicker`가 `PersonCheckList`·`PersonAvatar`·`sortReviewerCandidates`를 쓴다.
- [x] 팝오버 방향·최대 높이가 레퍼런스 `popAt` 규칙으로 정해지고 Fluent flip은 꺼져 있다(`pinned: true`).
- [x] 등록 화면이 `preferredDepartment={profile.department}`를 넘긴다.
- [x] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책). 열림 방향·배지·아바타는 육안 확인 항목으로 보고한다.

## Commit Message
```text
feat(rfp): 검토자 팝오버에 공통 사람 목록·정렬·레퍼런스 열림 방향 적용

Plan: 2026-11-03-rfp-register-review-polish
Phase: P01-review-polish
Task: T04-reviewer-picker

- PersonCheckList·PersonAvatar로 목록·칩 아바타 교체(성씨 표시, SA/Admin 배지)
- 열 때 지정자→내 부서→가나다 정렬, 체크 시 줄 고정
- 아래 우선·최소 160px로 줄이기·필요할 때만 위로 여는 popAt 규칙 (Fluent flip 끔)
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 80357c9
