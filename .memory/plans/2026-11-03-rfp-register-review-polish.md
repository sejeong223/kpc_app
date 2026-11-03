# Plan: RFP 등록 화면 리뷰 보완 (필수 표시·팝오버 방향·단일 알림·검토자 목록)

## Goal
사용자 리뷰에서 나온 RFP 등록 화면 보완 4건을 레퍼런스(`KPC_제안서_UI_v12 8.html`)에 맞춘다.
측정 가능한 결과:
- "사업개요" 카드 머리글에서 "* 필수 n/5"가 제목 바로 옆에 붙는다(공통 `WorkspaceCard`의 새 `titleMeta`). 다른 화면의 카드 머리글은 변하지 않는다.
- 공통 알림은 화면에 항상 하나만 보이고, 새 알림이 오면 문구를 바꾸고 2.2초를 다시 센다(검토자를 연달아 지정해도 쌓이지 않음).
- 검토자 목록 행이 레퍼런스처럼 아바타(사진 없으면 성씨)·이름·직급 / 부서·역할 배지(SA·Admin)로 보이고, 공통 `PersonAvatar`·`PersonCheckList`로 분리된다.
- 검토자 목록은 지정된 사람 → 내 부서 → 가나다순으로 열 때 정렬되고, 체크할 때 줄이 움직이지 않는다.
- "검토자 추가" 팝오버가 아래를 우선해 열리고, 공간이 모자라면 높이를 줄이며(최소 160px), 아래가 모자라고 위에 다 들어갈 때만 위로 연다.
- `npm.cmd run typecheck`·`npm.cmd run lint`·`npm.cmd run build` 통과. 브라우저 검증·테스트 파일 작성 제외.

Decisions: [2026-11-03-rfp-register-review-polish](../decisions/2026-11-03-rfp-register-review-polish.md)

## Preconditions
- 선행 계획 [2026-11-02-rfp-register-design-notify](./2026-11-02-rfp-register-design-notify.md)의 **리뷰 수정(미커밋)** — `components/ui/AppToast.tsx`(알림 폭·본문 가운데), `components/rfp/ReviewerPicker.tsx`(팝오버 스크롤), 관련 문서 — 을 이 계획 실행 전에 별도 커밋한다. T02·T04가 같은 파일을 고치므로 섞이지 않게 하기 위함이다(커밋 여부는 사용자 확인).

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 필수 표시 위치 → 단일 알림 → 공통 사람 부품 → 검토자 팝오버 연결 (단일 Phase) | [P01](../phases/2026-11-03-rfp-register-review-polish/P01-review-polish/phase.md) |

## Out of Scope
- Entra ID(Microsoft Graph) 프로필 사진 실제 연동(`photoUrl` 자리만 만든다), `ProfileMenu` 아바타 통일, `TokenDialogs` 알림 이전, 검토 목록 화면.
