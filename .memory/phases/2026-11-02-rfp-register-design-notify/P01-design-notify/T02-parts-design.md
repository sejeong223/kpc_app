# Task: T02 드롭존·파일 목록·검토자 선택 부품 디자인

## Status: done

## Goal
기존 부품 3개(`RfpUploadZone`·`RfpFileList`·`ReviewerPicker`)의 모양을 레퍼런스 CSS(`.drop`·`.filelist .f`·`.rchip.reg-rv`·검토자 팝오버) 크기·간격으로 바꾸고, 드롭존에서 파일 거절 문구를 없앤다(알림으로 대체 — T03). props 계약은 `error` 제거 외에는 유지해 T03이 연결만 하게 한다.

## Decision Summary
- D01: 레퍼런스 배치·모양·크기 그대로, 빨강 → 파랑(`--kpc-brand` 계열). 어두운 버튼 `#303238`(hover `#1d1e22`).
- D04: 드롭존 아래 파일 거절 문구 삭제. reducer의 `fileError` 상태는 유지(T03이 알림 문구로 사용).
- Phase Rules: Fluent 컴포넌트 모양 변경은 `makeStyles`, 일반 요소는 `tw:`.

## Execution Note (2026-11-03, 사용자 지시)
- 사용자 결정: 버튼·입력 부품은 **원격(upstream)의 공통 부품**을 쓴다. 레퍼런스 크기(32/26px 버튼·26px select)보다 이 결정이 우선한다.
  - 버튼: `components/common/Button`(기본 38px, `dark` 프리셋은 샘플 버튼, `ghost`는 20px × 버튼). 작은 버튼("다시 하기"·"검토자 추가")은 `tw:h-(--dadam-control-height-compact)`(32px)·12px.
  - 파일 종류: `DadamSelect size="small"`(32px, 폭 120px). 검색: `DadamInput size="small"`. 체크박스: `DadamCheckbox`.
- Fluent `Avatar`는 22px 크기가 없어 24px를 썼다.

## Review Fixes (2026-11-03, 완료 후 사용자 확인 반영)
- **"검토자 추가"를 누르면 페이지가 위로 스크롤되던 문제**: Popover가 열린 직후 위치 계산 전(화면 위쪽)에 Fluent 자동 포커스와 검색칸 `autoFocus`가 포커스를 옮겨 브라우저가 그 위치로 스크롤했다.
  → `Popover`에 `unstable_disableAutoFocus`, 검색칸 `autoFocus` 삭제, `open`이 true가 된 다음 프레임에 `searchInput.current?.focus({ preventScroll: true })`(`useEffect` + `requestAnimationFrame`, 정리 시 `cancelAnimationFrame`). 열리면 바로 검색 입력 가능한 동작은 유지. 아래 I03-6은 이 내용으로 갱신되었다.
- 주의: `unstable_` 접두 prop은 Fluent 업데이트 때 바뀔 수 있으므로 업그레이드 후 다시 확인한다.

## Implementation

### I01. RfpUploadZone

- Related Files:
  - `components/rfp/RfpUploadZone.tsx` :: `RfpUploadZone` — modify
  - `components/rfp/RfpRegisterPage.tsx` :: `<RfpUploadZone ... error={state.fileError} />` — modify (호출부에서 `error` prop 한 개 삭제만; 다른 변경은 T03)
- 현재: props `{ phase, error, onFiles, onSample, onRestart }`, section 1px dashed + `tw:rounded-lg`, 40px 아이콘 상자(스파클/업로드), Fluent `ProgressBar`, 버튼 "파일 선택"·"샘플 RFP로 체험"(primary)·"다시 하기", `error` → `<p role="alert">`.
- 변경:
  1. props에서 `error` 제거: `interface RfpUploadZoneProps { phase: RfpFormPhase; onFiles(files: File[]): void; onSample(): void; onRestart(): void }`. `role="alert"` 문단 삭제.
  2. section(`aria-label="RFP 파일 업로드"`, `data-rfp-dropzone`, `data-over`, 드래그 핸들러 유지) 스타일: `display:flex; align-items:center; gap:16px; padding:22px; border:1.5px dashed #d3d5db; border-radius:14px; background:#fff;` over 시 `border-color: var(--kpc-brand); background: var(--kpc-brand-soft)`. 일반 요소이므로 `tw:` 사용 예: `tw:flex tw:items-center tw:gap-4 tw:rounded-[14px] tw:border-[1.5px] tw:border-dashed tw:border-[#d3d5db] tw:bg-(--kpc-card) tw:p-[22px]` / over `tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)`. 좁은 폭(≤760px)에서는 `tw:flex-wrap`.
  3. 아이콘 상자: 46×46px, radius 12px, `background: var(--kpc-brand-soft)`, `color: var(--kpc-brand)`, 아이콘 22px. 아이콘은 extracted면 `Checkmark24Regular`(레퍼런스 `check`), 그 외 `ArrowUpload24Regular`, `style={{ width: 22, height: 22 }}`.
  4. 본문 블록(`flex:1; min-width:0`):
     - idle: 제목 "RFP 파일을 여기에 놓으면 사업개요가 자동으로 채워집니다"(12px 800, `h2`), 보조 "PDF · HWP · DOCX · 파일당 50MB · 대표 RFP 300쪽 이하 권장"(11px `--kpc-muted`, margin-top 3px).
     - analyzing: 제목 "RFP를 분석하고 있어요…", 보조 "사업명·발주처·예산·기간·마감일을 찾아 입력합니다"(margin 4px 0 8px), 그 아래 진행바. Fluent `ProgressBar` 유지(`aria-label="RFP 분석 진행"`)하고 `makeStyles` `bar: { height: "4px", borderRadius: "2px", backgroundColor: "#eef0f2" }`, 채움 `"& .fui-ProgressBar__bar": { backgroundColor: "var(--kpc-brand)" }`.
     - extracted: 제목 "AI가 사업개요를 채웠어요", 보조 "노란색 칸은 AI가 채운 값입니다. 원문 페이지와 다르면 바로 고치세요."(margin-top 3px).
  5. 버튼(오른쪽, gap 8px) — `makeStyles`로 레퍼런스 `.btn`(높이 32px, padding 0 12px, radius 8px, 12px 700, gap 6px) 적용:
     - idle/analyzing: `파일 선택`(기본: 흰 배경, 1px `#dddde2` 테두리, 글자 `#34363c`, 업로드 아이콘 16) + `샘플 RFP로 체험`(dark: 배경·테두리 `#303238`, 흰 글자, hover `#1d1e22`, 스파클 아이콘 16). analyzing에서 둘 다 disabled.
     - extracted: `다시 하기`(sm: 높이 26px, padding 0 9px, 11px, radius 7px, 기본 버튼 모양).
  6. 숨김 `<input type="file" multiple hidden accept=".pdf,.hwp,.hwpx,.doc,.docx">`와 `onChange` 후 `value = ""` 초기화 유지.

### I02. RfpFileList

- Related Files:
  - `components/rfp/RfpFileList.tsx` :: `RfpFileList` — modify
- 현재: 행에 문서 아이콘·파일명·"대표 RFP" 배지(brand tint)·크기 MB·종류 Select·빼기 버튼.
- 변경(레퍼런스 `.filelist .f`): `ul`은 `margin-top: 8px`(부모 gap과 별개로 0이어도 됨 — 부모 래퍼 gap을 따른다), 행 간격 6px. 행: `display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid #eff0f3; border-radius:9px; background:#fcfcfd`.
  - 순서: 파일 아이콘(`Document16Regular`, `--kpc-muted`) → 파일명(`flex:1; min-width:0`, 11.5px 700, 말줄임, `title`) → 종류 `Select`(높이 26px, 11px — `makeStyles`로 `select` 슬롯 높이·글자 조정) → `isMain`이면 "대표 RFP" 배지 → 빼기 버튼(20px subtle, `Dismiss12Regular`, `aria-label="{파일명} 빼기"`).
  - **크기(MB) 표시는 삭제**(레퍼런스에 없음). 빼기 버튼은 유지(레퍼런스에 없지만 잘못 올린 파일을 지울 수단이 "다시 하기"뿐이 되는 것을 막기 위함 — 보고 항목).
  - "대표 RFP" 배지: 레퍼런스 `.badge.b-active`(높이 20px, padding 0 7px, radius 6px, 10px 800, 1px 테두리) → 파랑: 글자 `--kpc-brand-ink`, 배경 `--kpc-brand-soft`, 테두리 `--kpc-brand`의 옅은 톤(`color-mix(in srgb, var(--kpc-brand) 25%, #fff)`). Fluent `Badge`에 `makeStyles` className.
  - props·aria-label(`"{파일명} 종류"`, `"{파일명} 빼기"`)·`disabled` 동작은 유지.

### I03. ReviewerPicker

- Related Files:
  - `components/rfp/ReviewerPicker.tsx` :: `ReviewerPicker` — modify
- 현재: 선택 칩(Avatar 20 + 이름 + subtle × 버튼, rounded-full), "검토자 추가" 버튼, Popover(300px) 안 안내·검색 Input·Checkbox 목록(label "{이름} {직급} · {부서}").
- 변경:
  1. 선택 칩(레퍼런스 `.rchip.reg-rv`): `display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 4px 0 6px; border:1px solid var(--kpc-line); border-radius:15px; background:#fff; font-size:11.5px` → Avatar 22 + `<b>`이름(800) + × 버튼(20×20px 원형, 투명 배경, `--kpc-muted`, hover `#f2f3f5`·`--kpc-ink`, `Dismiss12Regular`). aria-label 유지.
  2. "검토자 추가" 버튼: 레퍼런스 `.btn.sm`(높이 26px, padding 0 9px, 11px, radius 7px), `Add12Regular` 아이콘, 문구 "검토자 추가".
  3. 칩 영역과 버튼은 한 줄 `flex-wrap`, gap 6px.
  4. PopoverSurface(`aria-label="검토자 선택"`): 폭 320px, padding 6px, radius 12px. 안: 그룹 제목 "검토 담당자 지정 · 여러 명 가능"(10px 850 `--kpc-muted`, padding 8px 9px 4px) → 검색 Input(아이콘, margin 0 4px 6px) → 목록(max-height 300px, overflow auto).
  5. 목록 행(레퍼런스 `.pop .it.rv-it`): `label` 요소 전체가 클릭 영역, `display:flex; align-items:center; gap:8px; padding:8px 9px; border-radius:8px`, hover 배경 `#f4f5f7`, 선택 시 배경 `--kpc-brand-soft`. 내용: Fluent `Checkbox`(라벨 없이, `aria-label="{이름} 검토자 선택"`) → Avatar 22 → 텍스트 블록(`flex:1; min-width:0`): 1행 `<b>{이름}</b> <span meta>{직급}</span>`, 2행 meta `{부서}`(말줄임). 20명 도달 시 미선택 행 disabled(체크박스 disabled + 행 `opacity:.5`).
  6. 닫힐 때 검색어 초기화·`filterReviewerCandidates` 사용·props 계약 유지. 열릴 때 검색칸 포커스는 `autoFocus` 대신 `unstable_disableAutoFocus` + `focus({ preventScroll: true })`(Review Fixes).

## Acceptance Criteria
- [x] 세 부품이 결정 D01 표의 크기·모양을 따르고 빨강 계열 색이 없다(`git grep -n -i "d7192f\|c91c2b\|fff0f2" components/rfp` 결과 없음).
- [x] 드롭존에 파일 거절 문구가 없고 `RfpUploadZone`에 `error` prop이 없다. 등록 화면 호출부도 컴파일된다.
- [x] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책) — 색·크기 일치는 코드 값으로만 확인한다.

## Commit Message
```text
style(rfp): 드롭존·파일 목록·검토자 선택을 레퍼런스 모양으로 변경

Plan: 2026-11-02-rfp-register-design-notify
Phase: P01-design-notify
Task: T02-parts-design

- 드롭존 46px 아이콘 상자·어두운 샘플 버튼·4px 진행바, 파일 거절 문구 제거
- 파일 행 레퍼런스 모양(크기 표시 제거, 대표 RFP 파랑 배지)
- 검토자 30px 칩과 아바타·부서 2줄 팝오버 목록
- 버튼·선택·검색·체크박스는 원격 공통 부품(Button·DadamControls) 사용
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 4bf76db (Review Fixes는 별도 커밋)
