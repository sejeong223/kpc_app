# Task: T03 공통 인증 세션 갱신 연결

## Status: pending

## Goal
SessionProvider가 자동 갱신하거나 로그아웃으로 변경한 세션이 useAuthRuntime 소비자에게 즉시 같은 값으로 전달되게 한다. 최초 서버 props 세션을 계속 사용하는 구조를 제거한다.

## Decision Summary
- 계획 중 사용자 추가 선택(D19)으로 포함한 공통 수정이다. 기존 Context API와 인증 비활성 preview 동작은 유지하고 최신 세션의 단일 공급자를 사용한다.
- 토큰 발급·서버 권한·로그인 UI는 변경하지 않는다. 파일 저장 scope는 이 Task 후 T04에서 새 세션을 기준으로 연결한다.

## 실행 범위 및 지속 정책

- cwd: C:/Developer/Project/kpc_app. Plan: 2026-11-03-workspace-file-upload, Phase: P01-file-workspace. 확정 범위: 실제 파일/설정의 로컬 저장, 서버·검색·AI·KMS 연결 제외. 공통 인증 세션 갱신은 사용자 추가 선택으로 포함한다.
- 이 파일은 청사진이다. 계획 작성 시 코드 구현 금지. 실행 시에만 명시된 production 경로를 수정한다. 일반 레이아웃은 tw: Tailwind와 공통 토큰, 내부 타입은 strict/Container 기반, 데이터 훅은 TanStack Query를 사용한다.
- tests/ 생성·복원 금지. 브라우저/CUA/E2E/스크린샷/검증용 dev server 제외. npm run test 및 test:admin-review를 대체 검증으로 호출하지 않는다. 기존 테스트 삭제도 하지 않는다.
- 서버 권한 검사를 이번 로컬 규칙이 대체한다고 보고하지 않는다. Azure/Cosmos 리소스 생성·설정 변경 없음. DB/버킷/환경 변수를 새로 요구하지 않는다.
- Task별 커밋 메시지는 아래 것을 사용하되 실행 요청의 단일 커밋 등 최신 지시가 우선이다. 이번 계획 작성은 commit/push를 수행하지 않는다.

## Implementation

### I01. SessionProvider 내부의 AuthRuntime bridge

- Related Files:
  - components/providers.tsx :: Providers, AuthRuntimeBridge, AuthRuntimeContextValue, useAuthRuntime — modify
  - app/layout.tsx :: RootLayout — 초기 session을 전달하는 호출부; read-only
  - types/next-auth.d.ts :: Session.user/Session.error — 기존 타입; read-only
  - node_modules/next-auth/react/index.d.ts :: useSession/SessionContextValue — 설치된 NextAuth 4.24.13 API 확인 자료; read-only
  - node_modules/next-auth/react/index.js :: SessionProvider — 설치된 구현의 갱신·loading 의미 확인; read-only

#### Details
- **Signatures & Types**:
~~~typescript
interface AuthRuntimeContextValue {
  authEnabled: boolean;
  session: import("next-auth").Session | null;
}
interface ProvidersProps {
  children: React.ReactNode;
  authEnabled: boolean;
  session: import("next-auth").Session | null;
}
interface AuthRuntimeBridgeProps extends Pick<ProvidersProps, "children" | "authEnabled"> {}
declare function Providers(props: ProvidersProps): React.ReactElement;
declare function AuthRuntimeBridge(props: AuthRuntimeBridgeProps): React.ReactElement;
declare function useAuthRuntime(): AuthRuntimeContextValue;
~~~
- **Data & Schema Fields**:
  - 계약은 {authEnabled:boolean, session:Session|null} 그대로다. status 필드를 모든 소비자에게 강제로 추가하지 않는다.
  - 기존 Session은 user.oid?/upn?/email?/roles와 error?를 제공한다. APP_ROLES는 User/Admin이다.
  - AuthRuntimeBridge는 파일 최상위 컴포넌트로 정의해 Providers 렌더마다 새로운 컴포넌트 타입을 만들지 않는다.
  - SessionProvider의 props: session=서버 초기값, refetchInterval=authEnabled ? 15*60 : 0, refetchOnWindowFocus=authEnabled 유지.

- **Execution Flow / Logic**:
  1. Providers의 최상위는 SessionProvider가 되며 그 자식으로 AuthRuntimeBridge와 children을 배치한다. useSession은 반드시 이 내부에서 호출한다.
  2. bridge는 항상 useSession()을 호출하고 반환한 실시간 data를 사용한다. authEnabled=false이면 runtime.session=null. 활성 모드에서 data가 있고 data.error가 없으면 그 data를 제공하고, data 없음/오류는 null이다. status만 loading이라는 이유로 유효 data를 버리지 않는다. 설치된 NextAuth 구현은 update 진행 중 session을 유지한 채 loading=true로 바꿀 수 있으며, 이때 임의 null을 만들면 기존 메모리 Template 작업까지 불필요하게 재생성될 수 있다.
  3. useMemo 의존성에 authEnabled, data, status를 포함한다. 최초 session prop을 bridge로 넘기거나 data가 null일 때 props.session으로 fallback하지 않는다.
  4. 같은 사용자의 갱신된 roles/name과 새 사용자 ID, 로그아웃 null이 매번 Context에 전달된다. access token을 로깅하거나 storage에 별도로 저장하지 않는다.
  5. 임의 fetch/timer/세션 API를 추가하지 않는다. SessionProvider의 기존 주기·visibility·broadcast 갱신을 재사용한다.
  6. 별도 로그인 redirect, 오류 alert, 전역 페이지 잠금, 서버 claim 확장은 추가하지 않는다. 기존 인증·권한 guard는 유지한다.
- **Error & Exception Handling**: Provider 밖의 useAuthRuntime은 기존 Error를 유지한다. 갱신 실패 세션(error="RefreshAccessTokenError")은 과거 세션으로 대체하지 않는다. 외부 라이브러리 네트워크 실패 처리는 SessionProvider에 맡긴다.
- **State Transition & Return**: 인증 초기값 → 최신 data → roles 변경 → session=null 순으로 Context가 같은 객체 의미를 전달한다. 비활성 preview는 항상 authEnabled=false/session=null이며 SessionProvider가 존재한다는 이유로 preview 역할 선택을 막지 않는다.

### I02. 소비자 회귀 검토

- Related Files:
  - components/admin/AdminRuntimeProvider.tsx :: AdminRuntimeProvider — adminIdentityKey에 따라 인스턴스 재생성; read-only
  - lib/admin/runtime-actor.ts :: adminIdentityKey/resolveAdminActor — roles/identity 파생; read-only
  - components/comments/CommentsProvider.tsx :: CommentsProvider — identity=null 시 unidentified, 사용자 전환 시 key 변경; read-only
  - components/profile/ProfilePreviewProvider.tsx :: ProfilePreviewProvider — 프로필 display 갱신; read-only
  - components/profile/ProfileMenu.tsx :: ProfileMenu — 로그인/권한 표시; read-only
  - components/layout/NavSidebar.tsx :: NavSidebar — 세션 역할 기반 메뉴; read-only
  - lib/auth/guards.ts :: requireAppAccess/requireRole — 서버 검사 보존; read-only

#### Details
- **Signatures & Types**: 위 소비자들의 public API는 변경하지 않는다. 현재 모두 useAuthRuntime에서 authEnabled/session을 읽으며 새로운 필수 prop이 없다.
- **Execution Flow / Logic**:
  1. 각 소비자가 최신 session을 파생 값의 의존성으로 사용하는지 확인한다. 이미 정상 연결된 소비자를 의미 없이 리팩터링하지 않는다.
  2. 관리자 캐시 key는 oid/email/정렬 roles에 의존하고 코멘트는 안정적 actor ID에 의존한다. 이 Task는 관리자 mock의 고정 u-self 정책이나 코멘트 데이터 스키마를 바꾸지 않는다.
  3. 파일 런타임은 T04에서 stable ID가 없을 때 아예 생성하지 않도록 연결한다. 이 Task에서 미구현 파일 Provider를 미리 import하지 않는다.
  4. 정상→권한 변경/사용자 전환/null→재인증이 Context에서 끊기지 않는지 아래 상태표로 정적 추적한다.

| 입력 상태 | useAuthRuntime.session 기대 |
| --- | --- |
| authEnabled=false, 외부 data 존재 여부 무관 | null |
| authEnabled=true, authenticated, 정상 data | 해당 최신 data |
| 같은 oid, roles가 Admin에서 User로 갱신 | User roles를 가진 최신 data |
| oid A에서 B로 변경 | B data, A fallback 없음 |
| loading, data=null 또는 unauthenticated | null |
| 갱신 중 loading이지만 SessionProvider가 정상 data를 유지 | 해당 live data, 인위적인 로그아웃/캐시 초기화 없음 |
| authenticated, data.error 존재 | null |
| 오류 후 정상 재인증 | 새 정상 data |

## Acceptance Criteria
- [ ] bridge의 useSession이 SessionProvider 내부이며 기존 Context API가 유지된다.
- [ ] props.session은 초기 SessionProvider 값으로만 사용하고 갱신 시 fallback하지 않는다.
- [ ] 인증 비활성 preview와 기존 서버 guard·refetch 설정이 유지된다.
- [ ] 소비자의 identity/roles 파생과 오래된 데이터 정리 경로를 정적으로 확인한다.

## Validation
- npm run typecheck — Provider/기존 소비자 API 호환.
- npm run lint — Hook 규칙·의존성·미사용 값 오류 없음.
- npm run build — 공통 Provider 변경의 Next.js SSR/client 번들 빌드 통과.
- git diff --check — 형식 오류 없음.
- 상태표와 컴포넌트 트리 정적 검토. 실제 로그인/시간 경과/다른 탭 브라우저 검증은 정책상 수행하지 않고 미실시로 기록한다.

## Commit Message
~~~text
fix(auth): 공통 런타임에 최신 인증 세션 반영

Plan: 2026-11-03-workspace-file-upload
Phase: P01-file-workspace
Task: T03-auth-session-sync

- SessionProvider 내부 갱신값을 AuthRuntimeContext로 전달
- 로그아웃과 갱신 오류에서 이전 세션 재사용 방지
~~~

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
