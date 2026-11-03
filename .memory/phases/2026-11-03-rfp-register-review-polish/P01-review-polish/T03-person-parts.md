# Task: T03 공통 사람 부품(`PersonAvatar`·`PersonCheckList`)과 후보 데이터

## Status: done

## Goal
레퍼런스 검토자 목록 행(`revItems()`)을 재사용 가능한 공통 부품으로 만든다. 아바타는 사진이 있으면 사진, 없으면 성씨(이름 첫 글자)를 보여 주고, 행에는 이름·직급 / 부서와 역할 배지(SA·Admin)가 붙는다. 검토자 후보 데이터에 `role`·`photoUrl`을 더하고 레퍼런스 정렬 함수를 추가한다. 화면 연결은 T04.

## Decision Summary
- D04: 사진 우선, 없으면 성씨. `photoUrl: string | null` 자리만 만들고 지금은 모두 `null`(Entra ID 연동 범위 밖).
- D05: `super_admin` → "SA", `department_admin` → "Admin", `user` → 배지 없음. 레퍼런스 `.badge.b-plain` 회색.
- D06: 공통 `components/ui/PersonAvatar.tsx`·`components/ui/PersonCheckList.tsx`. 목록만 담당(검색·제목은 호출부).
- D07: 정렬 = 고정된 지정자 → 같은 부서 → 가나다.

## Review Fixes (2026-11-03, T04 진단 결과 반영)
- `PersonCheckList` 루트를 `tw:relative tw:flex tw:flex-col`로. 행 안 absolute 요소(Fluent Checkbox 숨은 input, Avatar 이니셜, 배지 `tw:sr-only`)가 바깥 스크롤 영역을 기준으로 배치되어 목록 스크롤을 빠져나가고 바깥 높이를 늘리던 문제(팝오버 scrollHeight 787px) 방지. 이 부품을 어떤 스크롤 영역에 넣어도 안전하다.
- 행 배경을 레퍼런스 `.pop .it:hover, .pop .it.on{background:#f4f5f7}`에 맞춰 **선택 시에도 `#f4f5f7`**(기존 `--kpc-brand-soft`에서 변경).
- 부품은 높이·스크롤을 갖지 않는다(감싸는 쪽이 정함) — 주석으로 명시.

## Implementation

### I01. `PersonAvatar` (new)

- Related Files:
  - `components/ui/PersonAvatar.tsx` :: `PersonAvatar` — new (`"use client"`)
  - `components/profile/ProfileMenu.tsx` — 같은 우회(`initials={{ children: name.slice(0, 1) }}`) 사용 예; read-only, 변경 금지

#### Details
- 근거: Fluent `Avatar`의 `getInitials`는 한글(`가-힯`)을 이니셜 불가로 보고 사람 아이콘을 그린다(`node_modules/@fluentui/react-avatar/lib/utils/getInitials.js:23`). 그래서 `initials`를 직접 넘긴다.
- **Signatures & Types**:
  ```tsx
  import type { AvatarSize } from "@fluentui/react-components";

  export interface PersonAvatarProps {
    name: string;
    /** 프로필 사진 주소. 없거나 불러오기 실패하면 성씨(첫 글자)로 표시 */
    photoUrl?: string | null;
    /** 배경색 결정용 고정 값. 없으면 이름으로 정해진다 */
    colorId?: string;
    size?: AvatarSize; // 기본 20
    className?: string;
  }
  export function PersonAvatar(props: PersonAvatarProps): React.ReactElement;
  ```
- **Logic**:
  ```tsx
  const initial = Array.from(name.trim())[0] ?? "?";
  return <Avatar name={name} idForColor={colorId} color="colorful" size={size}
    image={photoUrl ? { src: photoUrl, alt: "" } : undefined}
    initials={{ children: initial }} aria-hidden="true" className={className} />;
  ```
  - 장식용이므로 `aria-hidden="true"`(이름은 옆 텍스트가 읽힌다). 사진 로드 실패 시 Fluent가 이니셜로 되돌아간다.
  - `named export`만 둔다(default export 없음).

### I02. 후보 데이터 확장과 정렬 함수

- Related Files:
  - `lib/rfp/reviewers.ts` :: `ReviewerCandidate`, `getReviewerCandidates`, `sortReviewerCandidates`(new) — modify
  - `lib/admin/schemas.ts` :: `AdminRole` — read-only (`"super_admin" | "department_admin" | "user"`)
  - `config/admin-seed.ts` :: `createAdminSeed` — read-only (사용자 `role` 필드 보유)

#### Details
- **Data**:
  ```ts
  import type { AdminRole } from "@/lib/admin/schemas";
  export interface ReviewerCandidate {
    id: string; name: string; title: string; departmentName: string;
    role: AdminRole;          // new — 시드 u.role
    photoUrl: string | null;  // new — 지금은 항상 null (Entra ID 사진 연동 전)
  }
  ```
  `getReviewerCandidates()`의 map에 `role: u.role, photoUrl: null` 추가. 필터·캐시·가나다 정렬은 그대로.
- **새 정렬 함수**:
  ```ts
  /** 레퍼런스 revItems 순서: 고정된 지정자 → 같은 부서 → 이름 가나다. 원본은 바꾸지 않는다. */
  export function sortReviewerCandidates(
    list: readonly ReviewerCandidate[],
    options: { pinnedIds: ReadonlySet<string>; department: string | null },
  ): ReviewerCandidate[] {
    return [...list].sort((a, b) =>
      Number(options.pinnedIds.has(b.id)) - Number(options.pinnedIds.has(a.id))
      || Number(b.departmentName === options.department) - Number(a.departmentName === options.department)
      || a.name.localeCompare(b.name, "ko"));
  }
  ```
  - `department`가 `null`이면 부서 기준은 모두 0(효과 없음).
- `filterReviewerCandidates`는 변경 금지.

### I03. `PersonCheckList` (new)

- Related Files:
  - `components/ui/PersonCheckList.tsx` :: `PersonCheckList`, `PersonListItem` — new (`"use client"`)
  - `components/ui/DadamControls.tsx` :: `DadamCheckbox` — read-only
  - `components/ui/PersonAvatar.tsx` :: `PersonAvatar` — I01 산출물

#### Details
- **Signatures & Types**:
  ```tsx
  import type { AdminRole } from "@/lib/admin/schemas";

  export interface PersonListItem {
    id: string;
    name: string;
    title?: string;
    departmentName?: string;
    role?: AdminRole | null;
    photoUrl?: string | null;
  }

  interface PersonCheckListProps<T extends PersonListItem> {
    people: readonly T[];
    selectedIds: ReadonlySet<string>;
    onToggle(person: T): void;
    /** 선택 최대 인원. 도달하면 미선택 행 비활성 */
    max?: number;
    disabled?: boolean;
    /** 체크박스 접근성 이름. 기본 `${name} 선택` */
    itemLabel?(person: T): string;
    emptyText?: string; // 기본 "검색 결과가 없습니다"
    className?: string;
  }
  export function PersonCheckList<T extends PersonListItem>(props: PersonCheckListProps<T>): React.ReactElement;
  ```
- **역할 배지** (모듈 상수):
  ```tsx
  const ROLE_BADGES: Partial<Record<AdminRole, { short: string; full: string }>> = {
    super_admin: { short: "SA", full: "슈퍼 관리자" },
    department_admin: { short: "Admin", full: "관리자" },
  };
  ```
  배지 마크업(일반 요소, `tw:`; 레퍼런스 `.badge.b-plain` + `.badge{height:18px}`):
  ```tsx
  <span title={badge.full} className="tw:inline-flex tw:h-[18px] tw:flex-none tw:items-center tw:rounded-[6px] tw:border tw:border-solid tw:border-[#e8e9ec] tw:bg-[#f4f5f7] tw:px-[7px] tw:text-[10px] tw:font-extrabold tw:whitespace-nowrap tw:text-[#55585f]">
    <span aria-hidden="true">{badge.short}</span><span className="tw:sr-only">{badge.full}</span>
  </span>
  ```
- **목록 마크업** — 현재 `components/rfp/ReviewerPicker.tsx`의 목록 부분을 옮겨 일반화한다(행 모양 값 유지):
  ```tsx
  if (!people.length) return <p className="tw:m-0 tw:py-2 tw:text-center tw:text-[12px] tw:text-(--kpc-muted)">{emptyText}</p>;
  const full = max !== undefined && selectedIds.size >= max;
  return <div className={"tw:flex tw:flex-col " + (className ?? "")}>
    {people.map((p) => {
      const checked = selectedIds.has(p.id);
      const locked = disabled || (!checked && full);
      const badge = p.role ? ROLE_BADGES[p.role] : undefined;
      return <label key={p.id} className={"tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:px-[9px] tw:py-2 "
        + (locked ? "tw:cursor-not-allowed tw:opacity-50 " : "tw:cursor-pointer ")
        + (checked ? "tw:bg-(--kpc-brand-soft)" : "tw:hover:bg-[#f4f5f7]")}>
        <DadamCheckbox checked={checked} disabled={locked} aria-label={itemLabel ? itemLabel(p) : `${p.name} 선택`} onChange={() => onToggle(p)} />
        <PersonAvatar name={p.name} photoUrl={p.photoUrl} colorId={p.id} size={20} />
        <span className="tw:min-w-0 tw:flex-1 tw:text-[12px]">
          <span className="tw:block tw:truncate"><b className="tw:font-extrabold tw:text-(--kpc-ink)">{p.name}</b>{p.title && <> <span className="tw:text-[11px] tw:text-(--kpc-muted)">{p.title}</span></>}</span>
          {p.departmentName && <span className="tw:block tw:truncate tw:text-[11px] tw:text-(--kpc-muted)">{p.departmentName}</span>}
        </span>
        {badge && /* 위 배지 마크업 */}
      </label>;
    })}
  </div>;
  ```
  - `disabled`(화면 잠금)일 때는 선택된 행도 비활성(`locked`).
  - 줄 순서는 `people` 그대로 렌더한다(정렬은 호출부 책임 — D07 "체크 시 줄 고정"을 호출부가 보장).
- 이번 Task에서 두 부품의 호출처는 없다(T04에서 연결). 미사용 export는 lint 오류가 아니다.

### I04. 동작 검토 포인트 (테스트 파일 작성 없음)
- scratchpad 스크립트로 `sortReviewerCandidates` 확인(선택): pinned 2명이 맨 앞, 다음 `"AI사업본부"` 사람, 나머지 가나다. 원본 배열이 바뀌지 않음.
- `getReviewerCandidates()` 결과 16명, `role`이 시드와 같고 `photoUrl`이 모두 `null`.
- `tw:sr-only`·`tw:h-[18px]`·`tw:bg-[#f4f5f7]` 클래스가 빌드 CSS에 생성됨(`cat .next/static/chunks/*.css | grep -oF 'h-\[18px\]'`).

## Acceptance Criteria
- [x] `components/ui/PersonAvatar.tsx`·`components/ui/PersonCheckList.tsx`가 생기고 위 시그니처를 따른다.
- [x] `ReviewerCandidate`에 `role`·`photoUrl`이 있고 `sortReviewerCandidates`가 레퍼런스 순서로 정렬한다.
- [x] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(ui): 공통 PersonAvatar·PersonCheckList와 검토자 후보 역할·정렬 추가

Plan: 2026-11-03-rfp-register-review-polish
Phase: P01-review-polish
Task: T03-person-parts

- PersonAvatar: 사진 우선, 없으면 성씨(첫 글자), 이름별 색
- PersonCheckList: 체크박스·아바타·이름/직급·부서·역할 배지(SA·Admin) 목록
- ReviewerCandidate에 role·photoUrl 추가, sortReviewerCandidates(지정자→같은 부서→가나다)
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: f8cd5b9
