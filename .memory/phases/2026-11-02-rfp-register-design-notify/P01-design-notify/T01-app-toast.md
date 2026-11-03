# Task: T01 앱 공통 알림(AppToaster·useAppToast)

## Status: done

## Goal
어느 화면에서든 `useAppToast().notify(message, intent)` 한 줄로 레퍼런스 모양(본문 영역 아래 가운데, 글자 길이에 맞춘 폭, 어두운 배경, 약 2.2초)의 알림을 띄울 수 있게 공통 Toaster를 만들고 인증 레이아웃에 한 번만 둔다. RFP 등록 화면(T03)과 이후 화면이 같은 알림을 재사용하기 위함이다.

## Decision Summary
- D02: 앱 공통 알림, Fluent `Toaster` + 공용 훅, 레퍼런스 `.toast` 모양.
- 기존 `components/profile/token/TokenDialogs.tsx`의 Toaster(자체 `toasterId`, bottom-end, 3.5초)는 변경하지 않는다. `useToastController(toasterId)`는 같은 id의 Toaster로만 보내므로 서로 섞이지 않는다.

## Review Fixes (2026-11-03, 완료 후 사용자 확인 반영)
사용자가 화면에서 확인한 뒤 요청한 수정. 아래 I01 본문은 이 내용으로 갱신되었다.
- **알림 폭을 글자 길이에 맞춤**: Fluent `Toaster` 루트가 `width: 292px`로 고정되어 짧은 문구도 292px 상자에 왼쪽 정렬로 보였다. 레퍼런스 `.toast`는 폭 지정 없이 `translateX(-50%)`로 글자 길이만큼만 차지한다.
  → `toaster`에 `width: "max-content"`, `toast`에 `width: "fit-content"`·`marginLeft/Right: "auto"`·`maxWidth: "100%"`.
- **본문(사이드바 제외) 가운데에 표시**: 초기 설계의 "뷰포트 가운데"를 정정. Toaster가 body 포털이라 `--nav-sidebar-width`를 읽을 수 없으므로, `AppShell`의 `#main-content` 위치를 측정해 `offset.horizontal`로 넘긴다(`useMainCenterOffset`).
- 관련 커밋: (리뷰 수정 커밋에 포함)

## Implementation

### I01. 공통 알림 모듈

- Related Files:
  - `components/ui/AppToast.tsx` :: `APP_TOASTER_ID`, `AppToastIntent`, `AppToaster`, `useAppToast` — new (`"use client"`)
  - `components/profile/token/TokenDialogs.tsx` — `Toaster`·`Toast`·`ToastTitle`·`useToastController` 사용 예; read-only

```typescript
export const APP_TOASTER_ID = "app-toaster";
export type AppToastIntent = "success" | "error" | "info";
export function AppToaster(): React.ReactElement;                // 레이아웃에 1회 렌더
export function useAppToast(): { notify(message: string, intent?: AppToastIntent): void }; // 기본 intent "success"
```
- `AppToaster`:
  ```tsx
  const horizontal = useMainCenterOffset();
  <Toaster toasterId={APP_TOASTER_ID} position="bottom" offset={{ vertical: 64, horizontal }} timeout={2200} pauseOnHover className={styles.toaster} />
  ```
  - `position="bottom"`은 `left: calc(50% + {horizontal}px)` + `translateX(-50%)`. 레퍼런스처럼 **사이드바를 뺀 본문 가운데**에 두기 위해 `horizontal`을 측정한다(Review Fixes에서 정정 — 초기엔 뷰포트 가운데).
  - `useMainCenterOffset()`(파일 내부 훅): `document.getElementById("main-content")`(AppShell의 `<main>`)의 `getBoundingClientRect()`로 `rect.left + rect.width / 2 - document.documentElement.clientWidth / 2`를 계산. `ResizeObserver`(사이드바 접기·펼치기 → 본문 폭 변화, 연결 직후 1회 호출로 초기값도 계산) + `window` `resize`로 갱신. `#main-content`가 없으면 0(뷰포트 가운데).
  - styles.toaster: `{ zIndex: 4400, width: "max-content", maxWidth: "calc(100vw - 32px)" }` (TokenDialogs와 같은 z-index 층). Fluent 기본 `width: 292px`를 풀어 글자 길이에 맞춘다(Griffel reset 스타일보다 atomic className이 우선).
- `useAppToast`: `const { dispatchToast } = useToastController(APP_TOASTER_ID)`; `notify`를 `useCallback`으로 고정해 반환(의존성 배열 `[dispatchToast, styles]`).
  ```tsx
  dispatchToast(
    <Toast className={styles.toast}>
      <ToastTitle className={styles.title} media={intent === "error" ? <ErrorCircle16Regular className={styles.iconError} /> : intent === "info" ? <Info16Regular className={styles.icon} /> : <Checkmark16Regular className={styles.icon} />}>
        {message}
      </ToastTitle>
    </Toast>,
    { intent: intent === "error" ? "error" : intent === "info" ? "info" : "success" },
  );
  ```
- `makeStyles` (레퍼런스 `.toast`):
  - `toast`: `backgroundColor: "#1d1e22"`, `color: "#ffffff"`, `borderRadius: "10px"`, `padding: "10px 16px"`, `boxShadow: "0 18px 48px rgba(16,17,20,.16), 0 2px 6px rgba(16,17,20,.06)"`, `width: "fit-content"`, `maxWidth: "100%"`, `marginLeft: "auto"`, `marginRight: "auto"`(여러 개가 쌓여도 각자 폭으로 가운데 정렬), `boxSizing: "border-box"`, `fontFamily: tokens.fontFamilyBase`.
  - `title`: `color: "#ffffff"`, `fontSize: "12px"`, `fontWeight: 650`, `lineHeight: "18px"`, `overflowWrap: "anywhere"`.
  - `icon`: `color: "#ffffff"`; `iconError`: `color: "#ffd1d7"`(레퍼런스 `.toast-undo` 글자색 계열, 어두운 배경에서 대비 확보).
  - Toast 기본 흰 배경을 이기도록 반드시 `Toast`/`ToastTitle`의 `className`으로 넘긴다(Tailwind 클래스 금지 — Phase Rules).
- 아이콘 import: `@fluentui/react-icons`의 `Checkmark16Regular`, `ErrorCircle16Regular`, `Info16Regular`.

### I02. 레이아웃 연결

- Related Files:
  - `app/(authenticated)/layout.tsx` :: `AuthenticatedLayout` — modify (1줄 + import 1줄)
- 현재 구조:
  ```tsx
  <CommentsProvider>
    <AppShell>{children}</AppShell>
    <DadamThemeScope><TokenDialogs /></DadamThemeScope>
  </CommentsProvider>
  ```
- 변경: `TokenDialogs` 줄 바로 아래에 `<DadamThemeScope><AppToaster /></DadamThemeScope>` 한 줄 추가, `import { AppToaster } from "@/components/ui/AppToast";` 추가. `FluentUiProvider` 안쪽이어야 Fluent 테마·렌더러를 쓴다(이미 충족). 그 외 순서·래퍼 변경 금지.

### I02-b. Tailwind 소스 경로에 `components/rfp` 추가 (rebase 후 발견한 기존 결함)

- Related Files:
  - `app/admin-utilities.css` — modify (1줄)
- 현재: `@import "tailwindcss/utilities.css" layer(utilities) prefix(tw) source(none);` 뒤에 `@source "../components/admin"`, `"../components/layout"`, `"../components/ui"`, `"../hooks/admin"`, `"./"`만 있다. `source(none)`이라 **나열되지 않은 폴더의 `tw:` 클래스는 CSS가 생성되지 않는다.**
- 확인된 결과: 빌드 CSS(`.next/static/**/*.css`)에 `components/rfp`에서만 쓰는 `tw:md:grid-cols-2`, `tw:border-dashed`, `tw:size-10`, `tw:max-h-[300px]`, `tw:truncate`, `tw:rounded-full` 등이 하나도 없다. 즉 현재 RFP 등록 화면의 Tailwind 레이아웃(2열 그리드·점선 드롭존·칩·간격)이 전부 빠져 있다.
- 변경: `@source "../components/ui";` 바로 아래에 `@source "../components/rfp";` 한 줄 추가. 다른 줄의 순서·내용은 바꾸지 않는다.
- 검증 보조: build 후 아래 스크립트로 클래스 생성 여부를 확인한다(파일 생성 없이 실행).
  ```
  node -e "const fs=require('fs'),p=require('path');let c='';(function w(d){for(const f of fs.readdirSync(d)){const q=p.join(d,f);if(fs.statSync(q).isDirectory())w(q);else if(q.endsWith('.css'))c+=fs.readFileSync(q,'utf8')}})('.next/static');for(const k of ['tw\\\\:md\\\\:grid-cols-2','tw\\\\:border-dashed','tw\\\\:truncate'])console.log(k,c.includes('.'+k))"
  ```
  기대: 모두 `true`.

### I03. 동작 검토 포인트 (테스트 파일 작성 없음)
- `AppToaster`는 호출 전에는 빈 컨테이너만 렌더(보이는 변화 없음) — 다른 화면 영향 없음.
- `APP_TOASTER_ID`가 TokenDialogs의 `useId()` 값과 겹치지 않는다(문자열 고정 "app-toaster").
- `notify`의 기본 intent가 success, error일 때 오류 아이콘.
- 이번 Task에서 `useAppToast`를 호출하는 곳은 없다(T03에서 연결). 미사용 export는 lint 오류가 아니다.
- (Review Fixes) 짧은 문구의 알림 상자가 글자 길이만큼만 차지하고, 사이드바를 접거나 펼쳐도 본문 가운데에 뜬다 — 브라우저 육안 확인 항목.
- 검증 보조 스크립트(I02-b)는 Git Bash에서 역슬래시가 사라져 `false`가 나올 수 있다. 그때는 `cat .next/static/chunks/*.css | grep -oF 'md\:grid-cols-2'`처럼 고정 문자열로 확인한다.

## Acceptance Criteria
- [x] `components/ui/AppToast.tsx`가 생기고 레이아웃에 `AppToaster`가 한 번 렌더된다.
- [x] TokenDialogs·다른 화면 파일이 변경되지 않았다(`git diff --stat`에 layout·AppToast·admin-utilities.css만).
- [x] 빌드 CSS에 `components/rfp`의 `tw:` 클래스가 생성된다(I02-b 스크립트 결과 모두 true).
- [x] typecheck·lint·build 통과.

## Validation
- `npm.cmd run typecheck` — 0 error
- `npm.cmd run lint` — 0 error
- `npm.cmd run build` — 성공
- 브라우저 검증 제외(정책).

## Commit Message
```text
feat(ui): 앱 공통 알림 AppToaster·useAppToast 추가

Plan: 2026-11-02-rfp-register-design-notify
Phase: P01-design-notify
Task: T01-app-toast

- 아래 가운데·어두운 배경·2.2초 레퍼런스 알림 모양의 공통 Toaster
- useAppToast().notify(message, intent) 공용 훅
- 인증 레이아웃에 AppToaster 1회 렌더 (기존 TokenDialogs 알림 유지)
- Tailwind 소스 경로에 components/rfp 추가 (등록 화면 tw: 클래스 미생성 수정)
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 399a0c6 (Review Fixes는 별도 커밋)
