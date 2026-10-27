# Azure App Template

Next.js 16 기반의 Azure 사내 애플리케이션 템플릿입니다. Fluent UI v9로 구성한 KPC 사이드바와 중앙 콘텐츠 영역, Microsoft 로그인 화면을 제공합니다. 인증과 Azure 자격 증명 없이 로컬에서 시작하고, 프로젝트에 필요할 때 Microsoft Entra ID와 Azure 데이터 서비스를 연결할 수 있습니다.

## 포함 기능

- 선택형 Microsoft Entra ID/NextAuth 로그인과 `User`, `Admin` App Role
- iframe 환경을 위한 popup 로그인, CSP allowlist, cross-site cookie 설정
- 개발용 메모리 세션 캐시와 운영용 Redis 캐시
- Microsoft Graph 프로필 정보와 재사용 가능한 프로필 이미지 API
- Managed Identity 우선 Cosmos DB·Blob Storage 클라이언트
- 범용 페이지네이션 계산 함수
- Fluent UI v9 사이드바·아이콘·테마, 메뉴별 안내 화면과 App Router 스타일 SSR
- Vitest 단위 테스트, TypeScript, 명시적 `any`를 오류로 처리하는 ESLint 품질 게이트

## 요구사항

- Node.js `20.9.0` 이상(Next.js 16 engine 조건)
- 해당 Node.js에 포함된 npm. 현재 프로젝트는 npm `11.17.0`으로 검증했습니다.
- 선택: Redis, Azure Cosmos DB for NoSQL, Azure Blob Storage

Git Bash, macOS, Linux에서는 `npm ...`을 사용합니다. Windows PowerShell 실행 정책이 `npm.ps1`을 차단하면 `npm.cmd ...`, `npx.cmd ...`을 사용하세요.

## 빠른 시작: 인증 없이 실행

1. 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. 공개 예시를 로컬 설정으로 복사합니다.

   ```bash
   cp .env.example .env.local
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. `.env.local`에서 다음 값을 유지합니다.

   ```dotenv
   AUTH_ENABLED=false
   EMBEDDED_MODE=false
   ```

4. 개발 서버를 실행하고 `http://localhost:3000`을 엽니다.

   ```bash
   npm run dev
   ```

`AUTH_ENABLED=false`인 현재 개발 모드에서는 `/`의 사이드바·중앙 콘텐츠 레이아웃을 바로 확인할 수 있습니다. `AUTH_ENABLED=true`와 Entra ID 설정을 적용하면 **URL 접속 → Microsoft 로그인 → 세션·App Role 확인 → 워크스페이스 렌더링** 순서로 동작합니다. 앱 진입에는 `User` 또는 `Admin` 역할이 필요하며, 우측 상단에는 로그인 버튼을 두지 않습니다.

`/auth/login`에는 Microsoft 로그인 화면이 준비되어 있습니다. 인증 연결 전에는 로그인 버튼이 비활성화됩니다. `/admin`은 별도로 `Admin` 역할을 검사하며 인증이 꺼져 있으면 404를 반환합니다. `/auth/login/popup`은 임베디드 로그인 흐름에 사용됩니다.

`/api/profile-image`는 Microsoft Graph 프로필 이미지 API의 재사용 예시이고, `lib/pagination.ts`는 범용 계산 함수입니다. 둘 다 기본 화면에서는 호출하지 않습니다.

## 사이드바 UI와 메뉴 미리보기

사이드바는 제공된 KPC 목업의 최종 메뉴를 사용합니다. 위에서부터 RFP 등록·검토 목록, 구분선, AI 분석·파일 업로드·목차·제작 설정·제작, 구분선, 프롬프트 세트·Skill·Template·운영 정책·토큰·비용 관리·사용자 설정·대시보드·활동 로그 순서입니다. 데스크톱에서는 220px/54px로 펼치고 접을 수 있으며, 접힌 메뉴의 이름은 툴팁으로 확인합니다. 모바일에서는 헤더 메뉴 버튼으로 열고 닫습니다.

메뉴 원본은 `config/sidebar.ts`입니다. 메뉴마다 `/workspace/register`, `/workspace/pipeline`처럼 다른 URL을 사용하고 `app/(authenticated)/workspace/[screen]/page.tsx`에서 해당 메뉴의 간단한 안내를 표시합니다. 새로고침·직접 접근·뒤로/앞으로 이동을 지원하며, 등록되지 않은 screen은 404입니다. 기존 `/` 홈은 유지하고 상단 브랜드를 누르면 돌아갑니다.

`AUTH_ENABLED=false`에서는 일반 7개와 관리자 8개, 총 15개 메뉴 및 안내 화면을 미리볼 수 있습니다. `AUTH_ENABLED=true`에서는 기존 앱 진입 인증이 적용되고, 관리자 메뉴는 Admin에게만 표시되며 해당 안내 페이지도 서버에서 다시 역할을 검사합니다. 이 미리보기 예외는 새 정적 안내 화면에만 적용합니다. 기존 `/admin` 관리자 예시는 인증이 꺼지면 계속 404이며, 실제 관리자 API·데이터 접근을 허용하지 않습니다.

하단 프로필은 표시 영역만 구현했습니다. 개발 모드의 이름·소속은 샘플이며 실제 로그인이나 관리자 역할을 생성하지 않습니다. 실제 세션에서는 사용자 이름·역할을 표시하고 기존 로그아웃 링크를 제공합니다. 프로필 팝업·모달, 토큰 사용량·신청, 알림, 권한 전환 및 실제 RFP·AI·제작·관리자 업무 기능은 구현 범위에 포함하지 않습니다.

사이드바·셸·헤더는 각 TSX 안에 `makeStyles`로 스타일 객체를 정의하고 `useStyles()`로 사용합니다. 상태별 클래스는 `mergeClasses`로 결합하며 CSS module을 추가하지 않습니다. `components/providers/FluentUiProvider.tsx`가 작업 영역의 Fluent 테마와 요청별 Griffel renderer를 제공하고 SSR 스타일의 중복 출력을 방지합니다. 로그인 화면과 홈 본문의 기존 스타일은 유지합니다.

Fluent 패키지의 큰 export 목록이 개발 시 전체 모듈 탐색을 유발하지 않도록 `next.config.ts`의 `experimental.optimizePackageImports`에 컴포넌트·아이콘 패키지를 지정했습니다. Next.js 버전은 유지하며 별도 변환 플러그인은 설치하지 않습니다.

## Microsoft Entra ID 설정

1. Entra ID에서 앱을 등록하고 tenant ID와 client ID를 확보합니다.
2. Web redirect URI로 로컬은 `http://localhost:3000/api/auth/callback/azure-ad`, 운영은 `https://<app-host>/api/auth/callback/azure-ad`를 등록합니다.
3. App Role `User`, `Admin`을 생성하고 사용자 또는 그룹에 필요한 역할을 할당합니다.
4. 로그인 사용자 정보를 위한 delegated `User.Read`와 서버 프로필 조회를 위한 Microsoft Graph application permission `User.Read.All`을 설정하고 관리자 동의를 완료합니다.
5. 인증서 PFX 또는 client secret 중 하나만 선택합니다. PFX는 base64 문자열로 `MSAL_CERT_PFX`에 제공합니다.
6. `AUTH_ENABLED=true`로 바꾸고 필수 환경변수를 채웁니다.

인증을 켠 상태에서 인증서와 client secret을 모두 제공하거나 모두 누락하면 앱이 시작을 거부합니다.

## 환경변수

| 변수 | 필수 조건 | Secret | 설명 |
| --- | --- | --- | --- |
| `NODE_ENV` | 일반적으로 Next.js가 설정 | 아니오 | `development`, `test`, `production` |
| `APP_ENV` | 항상 | 아니오 | 캐시 네임스페이스에 쓰는 배포 환경명 |
| `NEXT_PUBLIC_APP_NAME` | 선택 | 아니오 | 앱 이름 |
| `NEXT_PUBLIC_APP_DESCRIPTION` | 선택 | 아니오 | 앱 설명 |
| `AUTH_ENABLED` | 항상 | 아니오 | Entra/NextAuth 기능 플래그 |
| `EMBEDDED_MODE` | 항상 | 아니오 | iframe/popup 모드. `true`는 auth도 `true`여야 함 |
| `AUTH_CACHE_NAMESPACE` | 항상 | 아니오 | Redis/메모리 세션 키 prefix. 기본값 `azure-app-template` |
| `NEXTAUTH_URL` | auth 켜짐 | 아니오 | 앱의 정확한 base URL. 운영에서 HTTPS 사용 |
| `NEXTAUTH_SECRET` | auth 켜짐 | 예 | 충분히 긴 무작위 값 |
| `MSAL_TENANT_ID` | auth 켜짐 | 아니오 | Entra tenant ID |
| `MSAL_CLIENT_ID` | auth 켜짐 | 아니오 | Entra application client ID |
| `MSAL_CLIENT_SECRET` | secret 방식 | 예 | 로컬 대체 credential |
| `MSAL_CERT_PFX` | 인증서 방식 | 예 | base64 PFX. secret과 동시 사용 금지 |
| `MSAL_CERT_PASSWORD` | PFX에 password가 있을 때 | 예 | PFX password |
| `REDIS_URL` | production + auth 켜짐 | 예 | standalone/cluster Redis URL |
| `REDIS_CLUSTER_MODE` | Redis cluster 사용 시 | 아니오 | `true`면 cluster client 사용 |
| `IFRAME_ALLOWED_DOMAINS` | 추가 iframe host가 있을 때 | 아니오 | `https://host` 형식의 comma-separated CSP source |
| `AZURE_USE_MANAGED_IDENTITY` | Azure 서비스 사용 시 | 아니오 | Azure 배포에서 `true` 권장 |
| `COSMOS_DB_ENDPOINT` | Cosmos client 생성 시 | 아니오 | Cosmos DB account endpoint |
| `COSMOS_DB_NAME` | Cosmos client 생성 시 | 아니오 | 기존 database 이름 |
| `COSMOS_DB_KEY` | Cosmos local key 모드 | 예 | Managed Identity면 불필요 |
| `BLOB_ACCOUNT_NAME` | Blob client 생성 시 | 아니오 | Storage account 이름 |
| `BLOB_ACCOUNT_KEY` | Blob local key 모드 | 예 | Managed Identity면 불필요 |

운영 secret은 환경변수 또는 비밀 관리 서비스로 주입하고 파일에 저장하지 마세요.

## 프로젝트 식별자 변경

npm 패키지명과 인증 캐시 기본 네임스페이스는 `azure-app-template`입니다. 템플릿을 복제할 때 프로젝트에 맞게 `package.json`, `package-lock.json`, `.env.example`의 `AUTH_CACHE_NAMESPACE` 및 `config/env.schema.ts` 기본값을 함께 바꾸세요.

실제 `.env.local`이나 배포 환경에 이전 프로젝트의 네임스페이스가 명시되어 있으면 별도로 갱신해야 합니다. 네임스페이스를 바꾸면 기존 Redis 세션 키와 임베디드 로그인 상태 쿠키를 재사용하지 않으므로 사용자가 다시 로그인해야 할 수 있습니다.

## Popup과 iframe

- `EMBEDDED_MODE=true`면 cross-site 환경을 위해 `SameSite=None; Secure` cookie와 popup 로그인 흐름을 사용합니다. HTTPS 배포가 필요합니다.
- 부모 host를 `IFRAME_ALLOWED_DOMAINS` CSP allowlist에 추가하세요. scheme과 host만 허용되며 path는 허용되지 않습니다.
- 브라우저가 popup을 차단하면 로그인을 시작할 수 없으므로 해당 사이트의 popup을 허용하세요.
- 로그인 완료 메시지는 동일 origin과 실제로 연 popup window가 모두 일치할 때만 수락됩니다.

## Redis 세션 캐시

개발에서 `REDIS_URL`이 없으면 process 메모리 캐시를 사용합니다. 서버를 재시작하거나 다중 instance로 확장하면 캐시가 공유되지 않습니다. `NODE_ENV=production`이고 auth가 켜져 있으면 `REDIS_URL`이 필수입니다.

## Azure 데이터 서비스

Azure에서는 `AZURE_USE_MANAGED_IDENTITY=true`를 사용하세요. 로컬 개발에서만 Cosmos account key와 Blob shared key를 대체 방식으로 사용합니다.

- Cosmos DB: identity에 `Cosmos DB Built-in Data Contributor` 또는 필요한 `readMetadata`, `containers/*`, `items/*` data action을 포함한 custom role을 할당합니다.
- Blob Storage: 읽기·쓰기·삭제가 필요하면 `Storage Blob Data Contributor`를 최소 필요 scope에 할당합니다.
- runtime 서비스는 기존 database/container/blob handle만 반환하며 리소스를 자동 생성하지 않습니다.

권한은 account 전체보다 필요한 database/container/storage scope에 최소한으로 할당하세요.

### Cosmos container provisioning

실행 전에 database를 생성하고 실행 identity에 container 생성과 throughput 설정에 필요한 권한을 할당하세요. runtime과 분리된 명시적 CLI로만 container를 생성합니다.

```bash
npm run azure:cosmos:provision -- --container records --partition-key /tenantId
```

선택 throughput:

```bash
npm run azure:cosmos:provision -- --container records --partition-key /tenantId --throughput 400
```

### Cosmos DB 설계 스킬

공식 `cosmosdb-best-practices` 스킬을 이 프로젝트의 [`.agents/skills/cosmosdb-best-practices/SKILL.md`](.agents/skills/cosmosdb-best-practices/SKILL.md)에 설치했습니다. [Azure Cosmos DB Agent Kit](https://github.com/AzureCosmosDB/cosmosdb-agent-kit)의 commit `51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef`를 고정했으며, 출처·두 메타데이터 버전·검증 해시는 [`.agents/skill-sources.json`](.agents/skill-sources.json)에 기록합니다. 스킬 원문과 MIT LICENSE를 보존하고, 해당 폴더에만 LF 줄바꿈을 적용합니다.

다음 요청에서 `$cosmosdb-best-practices`를 명시해 사용하거나, Cosmos DB 컨테이너 설계·파티션 키·쿼리 작업을 요청하면 됩니다. `AGENTS.md`는 해당 작업 전에 로컬 SKILL.md와 관련 규칙을 읽도록 연결합니다. 새 스킬의 대화 목록 인식은 다음 요청에서 확인하며, 목록에 보이지 않으면 위 실제 경로를 읽도록 요청할 수 있습니다.

Cosmos DB에서 테이블에 해당하는 저장 단위는 컨테이너이며 데이터는 JSON 문서로 저장합니다. 실제 작업은 업무 데이터와 주요 조회·쓰기 패턴을 확인하고 기존 인터뷰 → 계획 → 실행 흐름으로 설계합니다. 이번 세팅에서는 샘플 컨테이너나 파티션 키를 정하지 않았습니다. 스킬 설치는 Azure 로그인·권한·네트워크 설정을 대신하지 않으며 실제 리소스 생성도 수행하지 않습니다.

설치한 스킬은 설계 지침입니다. VS Code 전용 `cosmosdb-nosql-query-generation`·`cosmosdb-nosql-query-editor` 도구, MCP 서버, 에뮬레이터가 함께 설치된 것은 아닙니다. 원본 갱신은 별도 검토 후 고정 commit·출처 기록·파일 검증을 함께 갱신합니다.

## npm scripts

| Script | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드된 서버 실행 |
| `npm run lint` | ESLint 전체 검사 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run test` | Vitest 단발 실행 |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run azure:cosmos:provision -- ...` | Cosmos container 명시적 생성 |

## 주요 디렉터리

| 경로 | 역할 |
| --- | --- |
| `app` | Next.js App Router page와 API |
| `components/auth` | 로그인 동작과 안내 |
| `components/layout` | `AppShell` 레이아웃 조립, `NavSidebar` 사이드바, `AppHeader` 상단 헤더. Fluent `makeStyles`를 각 TSX 내부에서 관리 |
| `components/providers.tsx` | 인증 세션 공급 |
| `components/providers/FluentUiProvider.tsx` | 작업 영역의 Fluent 테마와 Griffel SSR 공급자 |
| `config/sidebar.ts` | 최종 메뉴·URL·아이콘 키·메뉴 노출 권한의 단일 원본 |
| `app/(authenticated)/workspace/[screen]` | 메뉴별 안내 화면과 관리자 서버 인가 |
| `config` | 앱 메타데이터·환경·Azure 설정 |
| `lib/auth` | 인증, role, cache, popup 보안 정책 |
| `services` | Auth, Graph, Cosmos, Blob client factory |
| `scripts` | 명시적 운영/프로비저닝 CLI |
| `tests` | Vitest 단위 테스트 |
| `.memory` | 의사결정, 계획, Phase/Task 진행 기록 |

## 보안 주의사항

- `.env*`, PFX, PEM, private key를 commit하지 마세요. 공개 예시는 `.env.example`만 추적합니다.
- client menu의 role filtering은 UX일 뿐입니다. 보호된 page/API는 server에서 role을 반드시 다시 검사해야 합니다.
- callback URL은 동일 origin 내부 경로만 허용하고 popup message는 origin과 window source를 모두 검증합니다.
- 운영에서는 Managed Identity와 최소 권한을 우선하고 account key 사용을 피하세요.

## 프로젝트 메모리 워크플로

1. `/grill-me`: 코딩 전에 모호한 요구사항과 설계 분기를 확정합니다.
2. `/memory-plan`: 결정 문서를 Phase와 실행 가능한 Task 청사진으로 분해합니다.
3. `/memory-execute`: 현재 Task를 구현·검증·커밋한 다음 포인터로 이동합니다.

## 문제 해결

- PowerShell에서 `npm.ps1` 실행이 거부되면 `npm.cmd run dev`처럼 `.cmd`를 사용합니다.
- 인증을 켰는데 환경 구성 오류가 발생하면 오류에 표시된 key 이름을 확인하세요. 실제 secret 값은 오류 메시지에 포함되지 않습니다.
- iframe 로그인이 멈추면 HTTPS, cookie 정책, CSP allowlist, 브라우저 popup 허용 상태를 순서대로 확인하세요.
