# Task: T02 공통 알림 "항상 하나"

## Status: done

## Goal
`useAppToast().notify`를 연달아 불러도 알림이 쌓이지 않고, 화면에 떠 있는 알림 하나의 문구·아이콘만 바뀌며 2.2초를 처음부터 다시 센다(레퍼런스 `toast()`). 검토자를 연달아 지정할 때 알림이 위로 쌓이던 문제를 없앤다.

## Decision Summary
- D03: 앱 전체 공통 알림을 단일 알림으로. 레퍼런스 `toast(msg){ ... clearTimeout(t._h); t._h=setTimeout(..., 2200) }`.
- 선행 D02의 "동시에 여러 개가 오면 쌓아서 보여 준다"를 대체한다.

## Preconditions
- `components/ui/AppToast.tsx`에 선행 계획의 **리뷰 수정(알림 폭·본문 가운데, 미커밋)** 이 남아 있으면, 이 Task 시작 전에 별도 커밋되어 있어야 한다(`git diff components/ui/AppToast.tsx`가 비어 있는지 확인). 비어 있지 않으면 사용자에게 확인 후 진행.

## Implementation

### I01. 단일 알림 바꿔치기

- Related Files:
  - `components/ui/AppToast.tsx` :: `useAppToast`, `AppToaster` — modify
  - `node_modules/@fluentui/react-toast` — read-only (아래 라이브러리 사실 확인됨)

#### 확인된 Fluent 동작 (근거)
- `dispatchToast`는 같은 `toastId`가 이미 내부 맵에 있으면 **무시**한다(`createToaster.js` `buildToast`: `if (toasts.has(toastId)) return;`). 종료 애니메이션 중인 알림도 맵에 남아 있다.
- `updateToast({ toastId, ...options })`는 옵션을 덮어쓰고 `updateId++` 한다. `renderToastContainer`가 타이머를 `key={updateId}`로 렌더하므로 **타이머가 다시 마운트되어 timeout이 처음부터 다시 돈다**.
- `ToastDispatchOptions.onStatusChange(event, data)`의 `data.status`: `"queued" | "visible" | "dismissed" | "unmounted"`.
- `useToastController(id)`가 내주는 함수: `dispatchToast`, `dismissToast`, `dismissAllToasts`, `updateToast`, `pauseToast`, `playToast`.

#### Details
- **Signatures & Types** (공개 API 변경 없음):
  ```tsx
  export const APP_TOASTER_ID = "app-toaster";
  export const APP_TOAST_TIMEOUT_MS = 2200; // new export, AppToaster timeout과 updateToast에 공통 사용
  export type AppToastIntent = "success" | "error" | "info";
  export function AppToaster(): React.ReactElement;
  export function useAppToast(): { notify(message: string, intent?: AppToastIntent): void };
  ```
- **모듈 상태** (훅 인스턴스가 여러 개여도 앱 전체에서 하나를 공유해야 하므로 모듈 수준):
  ```tsx
  // 화면에 떠 있는 공통 알림 id. 레퍼런스처럼 알림은 하나만 둔다.
  let liveToastId: string | null = null;
  let toastSeq = 0;
  ```
- **Execution Flow / Logic** (`useAppToast` 내부 `notify`):
  1. 기존과 같이 `media`(아이콘)와 `content = <Toast className={styles.toast}><ToastTitle className={styles.title} media={media}>{message}</ToastTitle></Toast>`를 만든다.
  2. `const { dispatchToast, updateToast } = useToastController(APP_TOASTER_ID);`
  3. `if (liveToastId) { updateToast({ toastId: liveToastId, content, intent, timeout: APP_TOAST_TIMEOUT_MS }); return; }`
  4. 아니면 새 id로 띄운다:
     ```tsx
     const toastId = `app-toast-${++toastSeq}`;
     liveToastId = toastId;
     dispatchToast(content, {
       toastId, intent,
       onStatusChange: (_event, data) => {
         // 사라지기 시작하면(종료 애니메이션 포함) 다음 알림은 새로 띄운다.
         if ((data.status === "dismissed" || data.status === "unmounted") && liveToastId === toastId) liveToastId = null;
       },
     });
     ```
  5. `useCallback` 의존성: `[dispatchToast, updateToast, styles]`.
- `AppToaster`: `timeout={2200}` → `timeout={APP_TOAST_TIMEOUT_MS}`. 그 외(위치·offset·`useMainCenterOffset`·스타일)는 변경 금지.
- `ToastUpdateOptions`에 `content`·`intent`·`timeout`이 허용되지 않아 타입 오류가 나면, `dist/index.d.ts`의 `ToastUpdateOptions` 정의를 확인해 허용 필드만 넘기고(필요 시 `content`만), 타이머 재시작은 `updateId` 증가로 보장됨을 유지한다.

### I02. 동작 검토 포인트 (테스트 파일 작성 없음)
- 연속 `notify` 3회 → `dispatchToast` 1회 + `updateToast` 2회 경로(코드 확인).
- 알림이 사라지기 시작한 뒤(`dismissed`)의 `notify`는 새 id로 `dispatchToast` — 이전 id 재사용으로 무시되는 일이 없다.
- 종료 애니메이션 중인 이전 알림과 새 알림이 아주 잠깐 겹칠 수 있다(Fluent 퇴장 애니메이션). 육안 확인 항목.
- `TokenDialogs`의 알림(다른 toasterId)은 영향 없음.

## Acceptance Criteria
- [x] 알림이 쌓이지 않고 하나의 알림에서 문구·아이콘이 바뀐다(코드 기준).
- [x] 문구가 바뀔 때마다 2.2초가 다시 시작된다(`updateToast` → `updateId` 증가).
- [x] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(ui): 공통 알림을 하나만 띄우고 새 알림으로 바꿔치기

Plan: 2026-11-03-rfp-register-review-polish
Phase: P01-review-polish
Task: T02-single-toast

- 떠 있는 알림이 있으면 updateToast로 문구·아이콘 교체, 2.2초 타이머 재시작
- 사라지기 시작하면 다음 알림은 새 id로 dispatch
- APP_TOAST_TIMEOUT_MS 상수로 timeout 통일
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
