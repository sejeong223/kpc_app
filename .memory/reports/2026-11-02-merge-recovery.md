# 관리자·제작 코멘트 병합 복구

- 날짜: 2026-11-02
- 요청: `npm run dev`의 EJSONPARSE 원인을 해결하고, 양쪽 기능을 보존하여 병합한다.
- 기준: 이미 만들어진 병합 커밋 `573a4d36c9a2c76286ed05ca95aac0fa6ade4848`.
- 부모: 관리자 `20ecffc4154ba6d0a0f7bfe74d27c79202738894`, 코멘트 `8a0f76711582bc54b00d8eec073c851fe1c1f3e8`.
- 공통 조상: `5cfc9f6c44a2f3383e27ff5f0e041e928b1589a9`.
- 시작 시 Git working tree/index는 깨끗했지만, 충돌 표시가 이미 커밋된 6개 파일에 남아 있었다. 기존 병합 이력을 다시 쓰지 않고 복구 변경을 추가한다.

## 보존 기준과 수정

| 파일 / 영역 | 합친 내용 |
| --- | --- |
| `package.json` | 관리자 쪽 React Query·JSZip·Fluent/Tailwind·Playwright와 코멘트 쪽 fake-indexeddb·jsdom을 모두 유지. 기존 스크립트도 유지 |
| `package-lock.json` | 부모 두 개와 공통 조상의 패키지 항목을 키별로 비교하여 병합. 잘린 enhanced-resolve/entities 객체를 각각 온전하게 복원 |
| `app/(authenticated)/layout.tsx` | ProfilePreviewProvider 아래 AdminRuntimeProvider와 CommentsProvider를 함께 연결. AppShell과 TokenDialogs는 둘 다 안에 배치. requireAppAccess/force-dynamic 유지 |
| `components/layout/AppShell.tsx` | 관리자 화면 스타일과 `/workspace/write` 전용 화면 스타일을 조건별로 병존. 코멘트 쪽의 공용 헤더 제거·독립 모바일 메뉴·suspendUi·포커스 복귀 유지 |
| 모바일 관리자 여백 | 공용 헤더가 제거된 상태에서 고정 메뉴 버튼이 제목을 덮지 않도록 상단 여백 64px 확보. 320/390px에서 실제 위치 검사 |
| `tests/app/workspace/screen.test.ts` | 관리자 경로는 AdminScreenRouter, 제작은 CommentsWorkspace, 나머지는 기존 안내 화면을 검사. 서버 역할 검사·거절 전파·토큰 리다이렉트 검사 유지 |
| `tests/lib/comments/shell-ui.test.ts` | 관리자 데이터 조회를 사용하는 통합 TokenDialogs에 맞춰 실제 AdminRuntimeProvider를 테스트에도 제공. 테스트 단언을 제거하지 않음 |
| `.memory/current.md` | 관리자 완료 7/7과 코멘트 미완료 검증 상태를 함께 보존. 실제 남은 코멘트 T03을 포인터로 두고, 양쪽 원문을 history에 별도 보존 |

양쪽에서 동시에 수정한 경로는 위 파일 및 `app/(authenticated)/workspace/[screen]/page.tsx` 총 7개였다. 화면 라우터의 자동 병합 결과는 관리자 6개 화면과 제작 코멘트 분기가 모두 남아 있음을 코드와 테스트로 확인했다. 한쪽에서만 변경한 나머지 파일은 해당 부모의 Git blob과 병합 결과를 비교하여 누락·변조가 없음을 확인했다. 삭제가 의도된 AppHeader를 되살리지 않았다.

lock의 공통 항목 중 버전이 달랐던 nanoid / postcss / source-map-js는 관리자 부모에서 이미 갱신된 3.3.20 / 8.5.32 / 1.2.2를 유지했다. 코멘트 부모는 공통 조상과 같은 이전 버전이었다. 이번 복구에서 새 버전 업그레이드는 하지 않았다. `npm install --ignore-scripts --no-audit --no-fund`로 부족한 41개 패키지를 설치했고, 설치 후에도 lock 버전이 위 3-way 선택과 일치함을 확인했다.

## 검증 결과

| 검사 | 결과 |
| --- | --- |
| package/lock JSON 파싱 및 루트 의존성 비교 | 정상, 일치 |
| 추적 파일의 충돌 표시 전수 검색 | 남은 표시 없음 |
| `npm.cmd test` | 68개 파일, **544개 통과** |
| `npm.cmd run typecheck` | 통과 |
| `npm.cmd run lint` | 통과 |
| `npm.cmd run build` | production build 통과 |
| `npm.cmd run test:admin-review` | Chromium **50개 통과**, retries=0, skip 없음 |
| 개발 서버의 병합 전용 브라우저 검사 | 캐시 분리 후 **3개 통과**, retries=0 |
| 개발 서버 재시작 후 동일 캐시의 통합 흐름 재검사 | 1개 통과 |
| `git diff --check` | 통과 |

프로덕션의 50개는 기존 관리자 47개와 새 병합 시나리오 3개다. 모든 시나리오에서 pageerror와 HTTP 400 이상 응답이 없는지 단언했다. 관리자 회귀에는 PPT 실제 파일 등록·변환·다운로드, 선택 보존, 편집 상태, 취소 경합, 역할 회수, 토큰 신청/승인, 프로필 동기화, 사용자 복구, 활동 CSV, 반응형 36개 조합이 포함된다.

추가한 `tests/e2e/admin-comments-merge.spec.ts`는 다음을 검사한다.

1. Template 작업 생성·실제 적용 → 제작으로 이동 → 새 코멘트 저장 → Template 작업 재조회·다운로드 가능 상태 유지.
2. 제작 새로고침 → IndexedDB 코멘트 복원 → 반영 완료 → 일반 사용자 전환 후 제작 기능 유지·관리자 메뉴 비노출.
3. 320/390px 관리자 제목과 모바일 메뉴 버튼 비중첩, 제작 핀/팝업, 메뉴 열 때 코멘트 팝업 닫힘, Escape 후 메뉴 버튼 포커스 복귀, 문서 가로 넘침 없음.

[프로덕션 결과](./2026-11-02-merge-recovery-evidence/production-browser.json), [개발 모드 결과](./2026-11-02-merge-recovery-evidence/development-browser.json).

## 개발 캐시 확인

최초 개발 모드 검사는 2개 통과/1개 실패였다. 제작 화면을 새로고침한 뒤 FluentProvider의 서버/브라우저 ID가 달라졌고 개발 오류 오버레이가 프로필 클릭을 막았다. 서버와 브라우저의 최초 출력이 다를 때 발생하는 종류의 오류다. [Next.js 공식 설명](https://nextjs.org/docs/messages/react-hydration-error).

기존 개발 서버가 없음을 확인하고 `.next/dev`를 `.next/dev-before-merge-recheck`로 이동하여 원본 캐시를 보존했다. 같은 소스에서 새 캐시로 실행한 동일 3개 검사는 모두 통과했다. 생성된 캐시를 유지한 서버 재시작 후에도 통합 흐름 1개가 다시 통과했다. [재시작 결과](./2026-11-02-merge-recovery-evidence/development-restart.json). 오류 억제, 인증 완화, FluentProvider 임시 우회는 추가하지 않았다. 캐시 분리 전후 관찰로 구분하며 라이브러리 내부 원인을 확정한 것으로 기록하지 않는다. [첫 검사 기록](./2026-11-02-merge-recovery-evidence/development-initial.json).

개발 확인은 별도 3191 포트의 `npm run dev -- --port 3191 --hostname 127.0.0.1`와 격리된 Chromium context에서 수행했다. 테스트용 AUTH_ENABLED=false만 자식 서버에 적용했으며 `.env`와 실제 인증 정책을 수정하지 않았다. 생성한 서버·브라우저는 검사 종료 후 정리했다. 일반 실행은 기존대로 `npm run dev`다.

## 후속 작업의 경계

- 이번 검사는 병합 지점의 기능 보존 확인이다. 코멘트 원래 계획의 전체 터치·native IME·모든 팝업 조합·육안 검사 완료로 확대하지 않았다. 기존 T03/T04의 in_progress 상태는 유지했다.
- 관리자는 메모리 mock, 코멘트는 로컬 IndexedDB라는 저장 수명이 그대로다. 실제 공유 서버·Cosmos·Blob·알림 연동은 추가하지 않았다.
- 기존 보안 의존성 후속 및 Vite/브라우저 매핑 데이터 경고는 이번 충돌 복구와 별개다. `npm audit fix`와 운영 패키지 업그레이드는 실행하지 않았다.
- 작업 시작 시 기존 미커밋 변경은 없었다. 이번 변경만 단일 복구 커밋으로 정리하며 push 또는 기존 병합 커밋의 amend/reset은 하지 않는다.

## 같은 충돌을 다시 만났을 때

패키지 추가끼리의 충돌은 양쪽 의존성과 잠금을 보존한다. Provider 충돌은 각 하위 컴포넌트가 요구하는 context를 확인하여 두 Provider를 조합한다. 경로별 화면 분기와 테스트도 두 기능을 모두 검증하도록 합친다. 마지막으로 Git의 unmerged 목록만 보지 말고 추적 파일에 남은 충돌 표시를 검색한 뒤 JSON·타입·테스트·빌드·실제 화면을 확인한다.
