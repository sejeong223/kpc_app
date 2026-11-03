# Task: T01 카드 제목 옆 보조 정보(`titleMeta`)

## Status: done

## Goal
"사업개요" 카드 머리글의 "* 필수 n/5"를 오른쪽 끝이 아니라 제목 바로 옆에 붙인다(레퍼런스 `.card-h`). 공통 `WorkspaceCard`에 선택 prop `titleMeta`를 추가하는 방식이라, 이 prop을 쓰지 않는 다른 20개 화면은 그대로다.

## Decision Summary
- D01: 공통 `WorkspaceCard`에 `titleMeta?: ReactNode` 추가. `actions`(오른쪽 끝)는 유지. 레퍼런스 `.card-h{display:flex;align-items:center;gap:8px}` + `.meta{font-size:11px;color:var(--mute);margin-left:4px}`.

## Implementation

### I01. `WorkspaceCard`에 `titleMeta` 추가

- Related Files:
  - `components/layout/WorkspaceCard.tsx` :: `WorkspaceCardProps`, `WorkspaceCard` — modify
  - `components/layout/WorkspaceCard.tsx` :: `WorkspaceCardSection` — 변경 금지

#### Details
- **현재 코드**:
  ```tsx
  export interface WorkspaceCardProps {
    title?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyPadding?: "inset" | "flush";
  }
  export default function WorkspaceCard({ title, actions, children, className = "", bodyPadding = "inset" }: WorkspaceCardProps): ReactElement {
    const hasHeader = Boolean(title || actions);
    return <section aria-label={title} className={...}>
      {hasHeader && <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:p-(--layout-card-inset)">
        {title && <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">{title}</h2>}{actions}
      </header>}
      ...
  ```
- **Signatures & Types**:
  ```tsx
  export interface WorkspaceCardProps {
    title?: string;
    /** 제목 바로 옆(왼쪽 묶음)에 붙는 보조 정보. 예: "* 필수 2/5" */
    titleMeta?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyPadding?: "inset" | "flush";
  }
  ```
- **Execution Flow / Logic**:
  1. 구조 분해에 `titleMeta`를 추가한다.
  2. `const hasHeader = Boolean(title || titleMeta || actions);`
  3. 제목 출력부만 조건 분기한다. **`titleMeta`가 없으면 기존과 똑같이 `h2`를 header의 직접 자식으로 둔다**(다른 화면 DOM 불변 — 회귀 방지):
     ```tsx
     const heading = title ? <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">{title}</h2> : null;
     ...
     {titleMeta
       ? <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-2">{heading}{titleMeta}</div>
       : heading}{actions}
     ```
  4. header의 `tw:justify-between`은 그대로 둔다(제목 묶음 ↔ `actions` 사이만 벌어진다).
  5. `aria-label={title}`, 본문 div 분기(`hasHeader ? " tw:pt-0" : ""`)는 그대로. `hasHeader`가 `titleMeta`도 포함하므로 titleMeta만 있는 경우에도 본문 위 여백 규칙이 같다.

### I02. 등록 화면에서 `titleMeta` 사용

- Related Files:
  - `components/rfp/RfpRegisterPage.tsx` :: `RfpRegisterPage` — modify (WorkspaceCard 한 줄)

#### Details
- 현재:
  ```tsx
  <WorkspaceCard title="사업개요" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)"><span aria-hidden="true" className="tw:text-(--kpc-brand)">* </span>필수 {progress.done}/{progress.total}</span>}>
  ```
- 변경: `actions=` → `titleMeta=`, span에 레퍼런스 `.meta` 여백 `tw:ml-1`(4px) 추가:
  ```tsx
  <WorkspaceCard title="사업개요" titleMeta={<span className="tw:ml-1 tw:text-[11px] tw:text-(--kpc-muted)"><span aria-hidden="true" className="tw:text-(--kpc-brand)">* </span>필수 {progress.done}/{progress.total}</span>}>
  ```
- 그 외 등록 화면 코드는 바꾸지 않는다.

### I03. 동작 검토 포인트 (테스트 파일 작성 없음)
- `git grep -n "titleMeta" components` 결과는 `WorkspaceCard.tsx`와 `RfpRegisterPage.tsx`뿐.
- `titleMeta`를 넘기지 않는 화면은 header 안 DOM이 이전과 같다(`h2` 직접 자식, 감싸는 div 없음).
- 좁은 폭에서 "사업개요"와 "* 필수 n/5"가 같은 묶음 안에서 줄바꿈된다(`tw:flex-wrap`).

## Acceptance Criteria
- [x] "* 필수 n/5"가 `titleMeta`로 제목 옆에 렌더된다(코드 기준).
- [x] `WorkspaceCard`의 기존 prop 사용처는 수정 없이 컴파일되고, `titleMeta` 미사용 시 DOM이 바뀌지 않는다.
- [x] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(layout): WorkspaceCard 제목 옆 보조 정보 titleMeta 추가

Plan: 2026-11-03-rfp-register-review-polish
Phase: P01-review-polish
Task: T01-card-title-meta

- WorkspaceCard에 선택 prop titleMeta 추가 (미사용 화면 DOM 불변)
- RFP 등록 사업개요 카드의 "* 필수 n/5"를 제목 옆으로 이동
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 41e6c5a
