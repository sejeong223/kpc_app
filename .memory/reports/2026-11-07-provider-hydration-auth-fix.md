# 공통 Provider의 hydration·인증 오류 수정

- 사용자 요청 순서에 따라 이전 제작 화면 수정사항을 먼저 `9001f48`로 커밋한 뒤 이 작업을 시작했다.
- 기존 제작 계획의 Task는 모두 완료 상태로 유지하며, 이번 수정은 별도 후속 커밋으로 처리한다.

## 원인 및 변경

- 접힌 메뉴의 Fluent Tooltip이 서버와 클라이언트 첫 렌더에서 서로 다른 Portal 내용을 생성했다. FluentUiProvider에 SSRProvider가 빠져 있었으며 개발 로그에도 관련 경고가 있었다.
- `components/providers/FluentUiProvider.tsx`의 RendererProvider 안에서 SSRProvider가 FluentProvider와 하위 테마/툴팁 전체를 감싸도록 수정했다. 기존 스타일 renderer/flush 및 DadamThemeScope는 유지한다.
- 인증이 비활성화돼도 SessionProvider가 마운트돼 개발 StrictMode의 effect 재실행에서 세션 요청이 발생했다. `/api/auth/session`은 인증 비활성화 시 본문 없는 404를 반환하므로 NextAuth의 JSON 파싱이 실패했다. 원인 확인 시 로컬 API의 404 및 빈 응답도 확인했다.
- `components/providers.tsx`는 인증 비활성화 시 고정된 `{ authEnabled: false, session: null }` context만 제공한다. SessionProvider 및 useSession을 호출하는 bridge는 인증 활성화 시에만 마운트한다.
- 정상 인증 모드의 서버 전달 세션, 15분 갱신 주기, 창 포커스 갱신 및 인증 실패 세션 제외 동작은 유지한다. 서버 인증 검사와 비활성 인증 API의 404 처리는 변경하지 않는다.

## 검증

- `npm.cmd run typecheck`, 변경 두 파일 ESLint, `git diff --check` 통과.
- Node stdin + jsdom: 실제 FluentUiProvider와 중첩 DadamThemeScope, description 방식 툴팁 3개를 SSR 후 StrictMode에서 hydrate했다. recoverable error 및 console warning/error가 없고, 초기화 후 Portal 생성과 aria-describedby ID 연결을 확인했다.
- Node stdin + jsdom: 실제 Providers 및 NextAuth SessionProvider를 검증했다. 비활성 모드에서는 StrictMode 초기화·포커스·탭 동기화 이벤트에도 HTTP 요청 0회이며, 전달된 이전 세션도 context에 노출되지 않는다.
- 활성 모드는 모의 JSON 세션 응답을 사용해 포커스·탭 동기화 갱신을 확인했고, refresh error 및 미인증 응답은 runtime.session을 null로 처리했다. 실제 로그인이나 외부 인증 서버 호출은 수행하지 않았다.
- 브라우저 직접 조작·시각 검증·dev server 실행·테스트 폴더 및 임시 검증 파일 생성 없음. 검증 스크립트는 stdin에서만 실행했다.
- 공용 버튼 리팩토링 및 DadamControls.tsx 수정 없음.
