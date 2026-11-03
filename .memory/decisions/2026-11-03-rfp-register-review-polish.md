# Decisions: RFP 등록 화면 리뷰 보완 (필수 표시·팝오버 방향·단일 알림·검토자 목록)

- Date: 2026-11-03
- Status: Confirmed
- Feature: rfp-register-review-polish
- 선행: [2026-11-02-rfp-register-design-notify](./2026-11-02-rfp-register-design-notify.md) (구현 `399a0c6`·`4bf76db`·`61edaeb` + 리뷰 수정 미커밋분: 알림 폭·본문 가운데, 검토자 팝오버 스크롤). 이 문서는 선행 D02의 "동시에 여러 개가 오면 쌓아서 보여 준다"를 **대체**한다.
- 레퍼런스: `KPC_제안서_UI_v12 8.html` — `.card-h`·`.meta`, `popAt()`, `toast()`, `revItems()`·`.pop .it`·`.badge.b-plain`, `av()`.
- 출처 구분: **사용자 선택**, **사용자 지시**(질문 없이 직접 요청), **레퍼런스 확인**, **코드 확인**, **설계 기본값**.

## D01. "* 필수 n/5" 위치 — 제목 옆
- **Chosen**: 공통 `components/layout/WorkspaceCard.tsx`에 선택 prop `titleMeta?: ReactNode`를 추가해 제목(`h2`) 바로 옆에 그린다. 기존 `actions`(오른쪽 끝)는 그대로. 등록 화면은 "* 필수 n/5"를 `actions` 대신 `titleMeta`로 넘긴다. (사용자 선택 1번 — "공통을 따라가자")
- **Rationale**: 레퍼런스 `.card-h`는 `display:flex; gap:8px`(양끝 정렬 없음)이고 `.meta`(11px, `--mute`, `margin-left:4px`)가 제목 옆에 붙는다. 우리 `WorkspaceCard` 머리글은 `justify-between`이라 `actions`가 오른쪽 끝으로 간다. 새 prop은 추가형이라 쓰지 않는 다른 화면은 변하지 않는다.
- 설계 기본값: 제목과 `titleMeta`를 한 묶음(`flex`, gap 8px, `align-items: baseline` 또는 center)으로 왼쪽에 두고, 그 묶음과 `actions` 사이만 기존 `justify-between`을 유지한다. 별표(`*`)는 `--kpc-brand`.

## D02. 검토자 팝오버 열림 방향 — 레퍼런스 `popAt()` 규칙
- **Chosen**: 아래를 우선한다. 아래 공간이 모자라면 목록 높이를 남은 공간에 맞게 줄이고(최소 160px), 그래도 안 될 때만 위로 연다. (사용자 선택 1번)
- **Rationale**: 레퍼런스 `popAt()` — `if(r.bottom+6+h>innerHeight-8 && r.top-6-h>8)` 위, 아니면 아래 + `maxHeight=max(160, innerHeight-r.bottom-16)`.
- 코드 확인: 현재 팝오버 전체 높이(목록 최대 300px + 제목 + 검색)가 약 380px이라, 폼 아래쪽 "검토자" 칸에서는 Fluent 기본 flip이 거의 항상 위로 뒤집는다.
- 설계 기본값: Fluent `positioning`의 `autoSize: "height"`(남은 높이에 맞춰 줄이기)와 `fallbackPositions: ["above-start"]`로 구현하고, 목록 최소 높이 160px을 보장한다. Fluent 동작이 레퍼런스 규칙과 다르면 계획 단계에서 대체 방법을 정한다.

## D03. 알림은 항상 하나 — 바꿔치기
- **Chosen**: 공통 알림(`components/ui/AppToast.tsx`) 전체를 "화면에 하나만"으로 바꾼다. 새 알림이 오면 종류와 관계없이 떠 있던 알림을 새 문구로 바꾸고 2.2초를 다시 센다. (사용자 선택 1번)
- **Rationale**: 레퍼런스 `toast()`는 단일 `#toast` 요소의 내용만 교체하고 `clearTimeout` 후 2.2초 타이머를 다시 건다. 검토자를 연달아 지정할 때 알림이 위로 쌓이던 문제를 없앤다.
- 코드 확인: `useAppToast` 사용처는 현재 RFP 등록 화면뿐. `TokenDialogs`는 별도 Toaster라 영향 없음.
- 설계 기본값: 같은 위치(본문 가운데 아래 64px)에서 교체. Fluent는 같은 `toastId`로 다시 `dispatchToast`하면 무시하므로, 고정 id + `updateToast` 또는 이전 알림 `dismissToast` 후 새로 띄우기 중 타이머 재시작이 확실한 쪽을 계획 단계에서 확인해 고른다. `intent`(성공·오류 아이콘)도 새 알림 기준으로 바뀐다.

## D04. 사람 아바타 — 사진 우선, 없으면 성씨
- **Chosen**: 레퍼런스처럼 사용자 프로필(아바타)을 보여 준다. 프로필 사진이 있으면 사진, 없으면 성씨(이름 첫 글자)로 표시한다. 추후 Entra ID 프로필 사진이 들어간다. (사용자 지시)
- 레퍼런스 확인: `av(n)` — 사람별 배경색 원 안에 `n[0]`(첫 글자), 최종 CSS 기준 18px.
- 코드 확인:
  - Fluent `Avatar`의 `getInitials`는 한글(`가-힯`)을 이니셜 불가 문자로 보고 사람 아이콘을 보여 준다(현재 검토자 목록·칩이 아이콘으로 보이는 원인). `components/profile/ProfileMenu.tsx`는 `initials={{ children: name.slice(0, 1) }}`로 우회한다.
  - 인증 세션·관리자 시드·검토자 후보 어디에도 사진 주소 필드가 없다.
- 설계 기본값: 사진 주소 필드 `photoUrl: string | null`을 후보 데이터에 추가하되 지금은 모두 `null`. Entra ID(Microsoft Graph) 사진 연동은 **범위 밖**. 배경색은 이름별로 정해지는 Fluent `color="colorful"`.

## D05. 역할 배지 — SA / Admin
- **Chosen**: `super_admin`은 "SA", `department_admin`은 "Admin" 배지를 목록 행 오른쪽 끝에 붙인다. `user`는 배지 없음. (사용자 지시)
- 레퍼런스 확인: `u.role==='admin'`이면 `<span class="badge b-plain">관리자</span>` — 높이 18px, padding 0 7px, radius 6px, 10px 800, 글자 `--ink3`, 배경 `#f4f5f7`, 테두리 `#e8e9ec`.
- 코드 확인: 역할 값은 `config/admin-seed.ts`의 `super_admin`·`department_admin`·`user`. 관리자 화면 이름표(`config/admin-permissions.ts`의 "슈퍼 관리자"·"관리자")와는 별개의 **짧은 배지 문구**로 쓴다.
- 설계 기본값: 두 배지 모두 레퍼런스 `.b-plain` 회색 모양. 스크린 리더용으로 배지에 전체 이름("슈퍼 관리자"·"관리자")을 `title`/숨김 텍스트로 함께 둔다.

## D06. 컴포넌트화 — 공통 `PersonAvatar`·`PersonCheckList`
- **Chosen**: 공통 `components/ui/`에 범용 부품 두 개를 만든다. (사용자 선택 1번)
  - `PersonAvatar`: `{ name, photoUrl?, size }` → 사진 또는 성씨, `color="colorful"`.
  - `PersonCheckList`: 사람 목록(id·이름·직급·부서·역할·사진), 선택된 id, 선택 변경 함수, 최대 인원(초과 시 미선택 행 비활성)을 받는 체크박스 목록. 행 = 체크박스 + `PersonAvatar` + 이름(굵게)·직급 / 부서(말줄임) + 역할 배지.
- **Rationale**: 검토자 팝오버와 검토자 칩이 함께 쓰고, 이후 담당자 지정 등 다른 화면에서 재사용한다. 사진 지원이 들어올 때 고칠 곳이 `PersonAvatar` 하나다.
- 설계 기본값:
  - 검색칸·"검토 담당자 지정 · 여러 명 가능" 제목·팝오버는 `ReviewerPicker`에 남기고, `PersonCheckList`는 목록만 담당한다.
  - 검토자 칩의 아바타도 `PersonAvatar`로 바꾼다(선택된 사람의 사진·역할은 후보 목록에서 id로 찾는다).
  - 행 모양은 T02의 현재 값(패딩 8px 9px, radius 8px, 선택 시 옅은 파랑 배경, 체크박스 `DadamCheckbox`)을 유지하고, 아바타 크기는 레퍼런스 최종값에 가깝게 Fluent 지원 크기 중 20px로 한다.
  - 후보 데이터 `ReviewerCandidate`에 `role`·`photoUrl` 필드를 추가한다(`lib/rfp/reviewers.ts`, 관리자 시드 읽기 전용).
  - `components/ui`는 이미 Tailwind `@source`에 포함되어 있어 추가 설정이 필요 없다.

## D07. 검토자 목록 정렬
- **Chosen**: ① 이미 지정된 사람 → ② 등록하는 사람과 같은 부서(`profile.department`) → ③ 이름 가나다순. 팝오버를 열 때와 검색할 때만 다시 정렬하고, 체크하는 순간에는 줄을 움직이지 않는다. (사용자 선택 1번)
- **Rationale**: 레퍼런스 `revItems()` 정렬을 따르되, 등록 화면에는 "프로젝트 부서"가 없어 등록자 부서로 대신한다. 체크 시 줄이 튀면 잘못 누를 수 있다.
- 설계 기본값: 정렬 기준이 되는 "열 때 지정된 사람" 목록은 팝오버를 연 시점에 고정한다.
- **본인 포함** (사용자 지시, 2026-11-03 T01 실행 시): 등록하는 사람 본인도 검토자가 될 수 있다. 후보 목록에서 본인을 빼지 않는다. 참고로 등록 신원 id(`preview:sodam` 등)와 관리자 시드 id(`u-self`)는 서로 달라 본인 여부를 판별하지 않으며, 그럴 필요도 없다.

## D08. 검증 (선행 결정 유지)
- 브라우저 검증 제외(`2026-10-30-task-validation-policy.md`), `tests/` 폴더·테스트 파일 작성 제외. `npm.cmd run typecheck`·`npm.cmd run lint`·`npm.cmd run build`와 Task별 동작 검토 포인트로 확인.

## 범위 밖 (후속 후보)
- Entra ID(Microsoft Graph) 프로필 사진 실제 연동 — `photoUrl` 자리만 만든다.
- `ProfileMenu`의 아바타를 `PersonAvatar`로 통일할지.
- `TokenDialogs` 알림을 단일 공통 알림으로 옮길지.
