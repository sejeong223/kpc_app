# Task: T07 브라우저 회귀·전체 검증·문서·통합 커밋

## Status: done

## Goal
T01~T06의 수정이 실제 사용자 흐름과 출력 PPT에서 동작함을 반복 가능한 검사로 남기고, 전체 검증 뒤 이번 작업을 한 번 커밋한다.

## Decision Summary
- 사용자 범위: 주요 결함 4개+추가 개선 2개+재검증. 보안 패키지 업그레이드, 실서비스 인증/저장소, 일반 제작 연결은 제외한다.
- 선행 T01~T06 done과 각 단위 검사 결과가 있어야 진행한다. 기존 사용자의 단일 커밋 선호를 따른다. 실패한 필수 검사를 건너뛰어 완료로 기록하지 않는다.

## Implementation

### I01. 저장소에서 재현 가능한 실제 브라우저 검사
- Related Files:
  - `package.json`, `package-lock.json` :: 개발 의존성·test:admin-review — 검사 도구; modify
  - `playwright.admin-review.config.ts` :: `defineConfig` — 전용 실행 환경; new
  - `tests/e2e/admin-review.helpers.ts` :: 테스트 생성/파일 제어 helper; new
  - `tests/e2e/admin-review.spec.ts` :: 작업·취소·권한·활동 상호작용; new
  - `tests/e2e/admin-responsive.spec.ts` :: 실제 폭·탭 탐색; new
  - `.gitignore` :: `/playwright-report/` — 자동 생성 보고서 제외; modify
  - `vitest.config.ts` :: node/`tests/**/*.test.ts` — 기존 검사와 분리; read-only
  - `tests/fixtures/pptx/native-template.pptx`, `shared-groups.pptx` — 입력 재사용; read-only

#### Details
- 설치(실행 단계에만): `npm.cmd install --save-dev --save-exact @playwright/test@1.64.1`, `npx.cmd playwright install chromium`. 2026-10-30 npm 메타데이터상 Node >=20, 프로젝트 환경 Node 22. 설치 전 기존 package-lock diff를 기록하고 libc 30줄 삭제를 보존·분리한다. 사용자 전역 npm cache의 절대 Playwright 경로에 의존하지 않는다. 운영 의존성 갱신이나 `npm audit fix`를 실행하지 않는다.
- Signatures & Types:
```typescript
import type { Page } from "@playwright/test";
interface TemplateFixtureInput { name: string; filePath: string }
async function registerTemplate(page: Page, input: TemplateFixtureInput): Promise<void>;
async function startTemplateWork(page: Page, templateName: string): Promise<void>;
async function setPreviewRole(page: Page, role: "user" | "department_admin" | "super_admin"): Promise<void>;
```
- package script: `test:admin-review` = `playwright test --config playwright.admin-review.config.ts`.
- Config: testDir=`./tests/e2e`, testMatch=`admin-*.spec.ts`, Chromium headless, workers=1, fullyParallel=false, retries=0, forbidOnly=Boolean(process.env.CI), per-test timeout=60_000, expect timeout=10_000, baseURL=`http://127.0.0.1:3190`, default viewport=1440×900, acceptDownloads=true, trace=`retain-on-failure`, screenshot=`only-on-failure`. 36개 조합은 각각 별도 test로 생성해 한 테스트의 timeout을 부풀리지 않는다.
- webServer: command=`npm run start -- --port 3190 --hostname 127.0.0.1`, url=baseURL+`/workspace/skills`, env.AUTH_ENABLED=`false`, reuseExistingServer=false, startup timeout=60_000. 미리 production build가 있어야 한다. 외부/사용자 서버나 로그인 환경을 재사용하지 않는다. `.env`를 편집하거나 Azure 리소스를 만들지 않는다.
- 테스트는 Playwright의 독립 context를 사용한다. 같은 시나리오의 메뉴 이동은 앱의 link 클릭으로 실행해 메모리 상태를 유지한다. page.goto/reload가 mock을 초기화하므로 자산을 만든 뒤 메뉴 이동을 goto로 대체하지 않는다.
- 접근성 이름(getByRole/getByLabel)과 web-first assertions를 사용한다. 임의 sleep을 성공 판정으로 쓰지 않는다. main/dialog/region으로 범위를 좁혀 동일 이름의 메뉴와 필드가 충돌하지 않게 한다.
- 앱에 테스트 전용 전역 관리자 서비스나 권한 우회 API를 노출하지 않는다. 파일 대기는 브라우저 테스트의 File.prototype.arrayBuffer에만 적용하며 원래 함수를 closure로 보관한다. 복구는 finally에서 수행한다. 테스트 helper 타입은 File/Window/Promise<ArrayBuffer>로 명시하고 any/unknown을 추가하지 않는다.
- 로그 수집: 모든 pageerror와 400 이상 응답을 수집하여 정상 시나리오에서 빈 배열인지 검증한다. 실패 시 URL·상태를 보관한다. 인증 서버와 클라우드의 실제 통신을 테스트 성공 조건으로 삼지 않는다.
- 근거: [Playwright webServer](https://playwright.dev/docs/test-webserver), [test configuration](https://playwright.dev/docs/test-configuration).

### I02. 반드시 포함할 브라우저 시나리오
1. **같은 파일 최신 선택 보존**: UI로 활성 Template 등록→seed Skill 선택→2쪽만 선택→적용→PPT 다운로드. 작업 닫기→Template 설명만 변경→작업 복귀→최신 재적용. 선택 2쪽만 유지하고 두 출력의 미선택 슬라이드 XML은 원본과 동일. 결과 상태/버전/다운로드 정상.
2. **편집 위치·포커스**: 2쪽 선택 후 유형, 요소 역할, 제외 변경. 매번 2쪽·해당 입력 포커스가 유지된다. 비교 슬라이드·결과 필터와 공유 요소 선택/미저장 초안도 다른 작업 옵션 저장으로 사라지지 않는다. 적용 진행/완료 후 같은 파일의 상태도 유지한다.
3. **파일 교체 경계**: 다른 파일을 등록한 latest가 성공하면 새 파일 기본 선택과 편집 위치를 사용한다. 실패 시 이전 성공 결과/선택 유지는 서비스 경합 검사와 함께 확인한다.
4. **업로드 취소**: 특정 테스트 파일만 읽기를 지연. 분석 중 footer 취소→계속 편집에서 파일 입력·이름/설명은 즉시 활성화, Spinner 제거. 파일 없는 저장은 비활성. B 업로드 완료 후 A 읽기를 해제해 B 정보가 유지됨을 확인. 전용 분석 취소 경로, 분석 완료 파일에서 계속 편집, 실제 폐기 경로도 확인한다.
5. **현재 권한**: 작업 이용 중 역할을 일반 사용자로 변경하면 관리자 메뉴/작업 데이터/다운로드를 노출하지 않고 기존 정책대로 이동한다. 다시 슈퍼 관리자로 전환한 뒤 허용되는 기존 작업만 조회한다. 부서/그룹/read 회수의 비동기 결과 차단은 서비스 races 테스트와 연결한다.
6. **활동 표시/CSV**: 그룹 생성/수정 후 한국어 작업명 검색. CSV 표시명과 원문 15열, BOM 확인. Template 적용·다른 버전 재적용 이후 대시보드에 같은 PPT 서식 적용 종류로 합산되며 refs JSON이 제목에 노출되지 않음을 확인한다.
7. **탭·반응형**: skills/templates/users/policy?tab=tokens/dashboard/audit 각 기본 화면에 대해 1440×900, 1024×768, 768×1024, 390×844, 320×568, 1024×500 총 36개 조합. 문서 scrollWidth<=innerWidth+1. 320/390 대시보드의 마지막 탭 클릭·키보드 이동 후 활성 탭이 내부 영역에 보이고 페이지 가로 이동은 없어야 한다.
8. **기존 흐름 smoke**: 사용자 삭제 복구, 토큰 승인·프로필 100K→150K 동기화, 모델 단가 소수 6자리 저장, 활동 상세 요청 ID 구분, Skill 미저장 모달 Escape/계속 편집/포커스 복귀. `/workspace/tokens` 리다이렉트 유지.

### I03. 전체 검사·파일·문서 기록
- Related Files:
  - `.memory/reports/2026-10-30-admin-review-fixes-validation.md` — 수정 후 결과; new
  - `.memory/reports/2026-10-30-admin-review-fixes-evidence/` — 필요한 JSON·CSV·스크린샷·PPT; new
  - `.memory/reports/2026-10-30-skill-template-design-components.html` — 재사용 경계·Query/탭/활동 표시 설명; modify
  - `.memory/reports/2026-10-30-full-review.md` — 원본 결함 보고서 보존, 새 결과 링크만 추가 가능; modify
  - `.memory/phases/2026-10-30-admin-review-fixes/P01-admin-review-fixes/*.md`, `.memory/current.md` — 진도·커밋 동기화; modify
- 각 F01~F04/추가 2건의 재현 전·수정 후·검증 명령·결과를 표로 연결한다. 미실행은 미실행으로 기록한다. 현재 원본 보고서를 성공 보고서로 덮지 않는다.
- hidden=true/1 및 flipH/flipV 출력의 도형 XML 보존, 관계/미디어/미수정 파트 보존과 2쪽만 선택한 출력 확인. 설치된 PowerPoint가 있고 사용자의 문서를 건드리지 않는 별도 읽기 전용 열기/렌더링이 가능하면 해당 출력으로 확인한다. COM/Office 검증이 불가능하면 사유를 기록하고 ZIP/XML 검사와 구분한다. 임의의 기존 PowerPoint 프로세스를 종료하지 않는다.
- HTML 가이드에는 같은 파일/교체 파일 상태 경계, 공통 탭 내부 스크롤, 사용자용 작업명과 원본 기록 분리를 반영한다. HTML 자체를 로컬 브라우저로 확인해 링크·가로 넘침·스크립트 오류를 검사한다.
- audit 재검사는 원본 JSON을 보관하고 기존 값(전체24/운영11)과 비교해 새 dev dependency의 영향을 기록한다. 보안 경고를 없애기 위한 운영 패키지 업데이트는 하지 않는다.
- 최종 diff는 해당 Task 파일 목록과 계획/보고서/필수 테스트 도구만 포함하는지 확인한다. 기존 lock 변경·다른 계획 Task 기록 변경을 섞지 않는다. 모든 Task done 후 통합 메시지로 커밋하고 실제 SHA를 진행 기록에 남긴다. 문서에 자기 커밋 SHA를 넣기 위한 별도 기능 커밋을 만들지 않으며, 필요하면 사후 기록 변경임을 밝힌다. push는 하지 않는다.

## Acceptance Criteria
- [x] T01~T06 수정과 해당 단위 검사가 모두 통과했다.
- [x] 실제 브라우저 필수 시나리오·36개 조합 통과, pageerror/HTTP 오류가 없다.
- [x] 출력 PPT를 검사했고 Office 검증의 실행 여부와 한계를 기록했다.
- [x] 전체 test/typecheck/lint/build 및 diff 검사 통과.
- [x] 새 검증 보고서·증거·HTML 가이드가 일치한다.
- [x] 기존 사용자 변경을 보존하고 승인 범위만 한 번 커밋했다.

## Validation
- `npm.cmd test` — 기존 392개와 신규 단위/통합 검사 모두 통과.
- `npm.cmd run typecheck` — exit 0.
- `npm.cmd run lint` — exit 0.
- `npm.cmd run build` — production build 통과.
- `npm.cmd run test:admin-review` — Chromium 필수 회귀·반응형 통과. 실패를 retries로 숨기지 않는다.
- `npm.cmd audit --json` 및 `npm.cmd audit --omit=dev --json` — 결과 기록; 기존 경고는 별도 후속.
- `git diff --check` — 오류 없음. `git diff --cached --stat`, `git diff --cached --check`로 커밋 범위 확인.
- 테스트 서버/브라우저는 자신이 생성한 것만 정리하고 사용자 프로세스는 보존한다.

## Commit Message
```text
fix(admin): 재검증에서 발견한 PPT 보존·편집 상태·관리 UI 개선

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Tasks: T01-T07

- 최신 적용 범위와 PPT 속성 판독 보완
- 편집 상태·업로드 취소·모바일 탭 개선
- 활동 표시와 집계 통일 및 브라우저 회귀 검사 추가
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: T01~T07 통합 커밋 (실제 SHA는 .memory/current.md 사후 기록 참조)

- 최종 확인: 최종 검증: Vitest 60파일 444개, Chromium 47개(반응형 36 포함), typecheck/lint/build 통과. PPT 8개 32장 PowerPoint 렌더링, audit 전체24/운영11로 기존과 동일. 검증 도구의 생성된 번들 JS를 소스 lint에서 제외하도록 eslint.config.mjs를 추가 수정하고 admin-guide.spec.ts로 HTML을 검사했다. 상세 근거는 .memory/reports/2026-10-30-admin-review-fixes-validation.md 참고.
