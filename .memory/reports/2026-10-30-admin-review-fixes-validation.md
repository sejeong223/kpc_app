# 관리자 재검증 개선 완료 기록

- 검증일: 2026-10-30, Windows / Node 22 / Chromium / 설치된 Microsoft PowerPoint.
- 계획: [admin-review-fixes](../plans/2026-10-30-admin-review-fixes.md), T01~T07.
- 결과: 주요 결함 F01~F04와 추가 개선 2건을 구현했다. 전체 단위·통합 검사 444개와 실제 브라우저 검사 47개가 통과했다. 타입·린트·production build도 통과했다.
- 커밋: 사용자 요청대로 중간 커밋 없이 이번 범위를 한 번 커밋한다. 실제 SHA는 커밋 후 [current](../current.md)에 사후 기록한다. push 없음.
- 기존 관리자 mock UI 계획의 T09 전체 완료를 뜻하지 않는다. 기존 계획 상태와 선행 작업은 보존한다.

## 재현 전후와 근거

| 대상 | 재검증에서 발견한 동작 | 수정 후 계약 | 확인 근거 |
| --- | --- | --- | --- |
| F01 / T01 | 같은 파일의 설명만 고쳐 최신 재적용해도 선택이 전체 슬라이드로 바뀜 | 같은 파일은 선택·배치·이미지·공유 편집 유지, 등록 매핑은 최신값 반영. 파일 교체는 기본값으로 초기화 | work-policy·서비스·브라우저 검사. 2쪽만 적용한 전/후 다운로드에서 1·3·4쪽 XML 원문 일치, 2쪽 변경 확인 |
| F02 / T03 | 옵션 저장마다 편집 중인 2쪽이 1쪽으로 돌아감 | 현재 권한으로 검증한 스냅샷을 Query 초기 데이터로 사용. 동일 작업·파일의 편집 위치와 초안 유지 | 2쪽 유형·역할·제외 변경 후 위치와 포커스, 공유 편집 초안, 결과 필터와 비교 페이지 유지. 실제 파일 교체 후 초기화. 역할 회수 시 작업·다운로드 차단 |
| F03 / T02 | hidden=true와 flipH/flipV=true를 보호 대상으로 읽지 못함 | 1/true와 0/false를 공통 판독. 굵기·표 병합·공유 표시에도 동일 적용 | XML 단위 검사. 숨김/가로 반전/세로 반전 × 1/true 출력 6개에서 도형 XML 유지, 각 35개 미수정 파트 보존, 사유 skipped |
| F04 / T05 | 작은 화면의 탭이 문서 전체 폭을 늘림 | 공통 탭 내부에서 가로 스크롤. 선택/포커스 처리가 끝난 프레임에 탭 위치 보정 | 36개 화면·해상도 조합 문서 폭 정상. 320/390px 마지막 탭 선택, 방향키 포커스, Enter 활성화, 페이지 가로 이동 없음 |
| 업로드 취소 / T04 | 하단 취소→계속 편집 뒤 파일 읽기가 끝날 때까지 입력 잠김 | 요청 번호부터 무효화하고 UI 진행 상태 즉시 해제. 완료된 임시 파일은 계속 편집 시 보존 | 지연 A 취소 후 B 완료, A 성공/오류/진행 상태 무시. 하단·전용 취소, 계속 편집, 실제 폐기 확인 |
| 활동 표시 / T06 | 내부 명령어와 refs/filter JSON이 목록·집계명에 노출되고 같은 작업이 분산됨 | 공통 한국어 작업명, 안정된 resource:action:operation ID로 집계. 원문 보존 | 그룹 생성/수정 검색·집계, 서로 다른 버전 적용 2건 합산. CSV 5열 표시명·15열 원문·BOM·수식 방어 검사 |

원본 재검증 기록은 [full-review](./2026-10-30-full-review.md)에 그대로 두었다. 당시 실패를 이번 성공 결과로 덮지 않았다.

## 실행한 검사

| 명령 / 검사 | 최종 결과 |
| --- | --- |
| `npm.cmd test` | 60개 파일 / 444개 검사 통과 (이전 전체 검사 392개 대비 52개 추가) |
| `npm.cmd run typecheck` | exit 0 |
| `npm.cmd run lint` | exit 0 |
| `npm.cmd run build` | production build 성공, 최신 AdminTabs 프레임 보정 포함 |
| `npm.cmd run test:admin-review` | 47 passed / 0 failed / 0 skipped / 0 flaky, retries=0, 약 59초 |
| `npx.cmd tsx .memory/reports/2026-10-30-admin-review-fixes-evidence/verify-pptx.ts` | 6개 변형 입력/출력 생성 및 도형·미수정 파트 보존 확인 |
| PowerPoint 읽기 전용 열기·PNG 내보내기 | 8개 출력 PPT, 32장 모두 열기·렌더링 성공 |
| `npm.cmd audit --json` | 전체 24건: critical 3 / high 13 / moderate 7 / low 1. 선행 결과와 동일 |
| `npm.cmd audit --omit=dev --json` | 운영 11건: critical 3 / high 6 / moderate 2. 선행 결과와 동일 |
| `git diff --check`, `git diff --cached --check` | 공백 오류 없음. 커밋 직전 범위 검사 |

audit 명령의 종료 코드 1은 기존 advisory가 남아 있기 때문이다. 이를 성공으로 숨기거나 `audit fix`로 패키지를 갱신하지 않았다. Vitest는 기존 설정의 향후 Vite native config 전환 경고를 출력하지만 현재 444개 검사는 성공한다.

브라우저 실행은 새 production 서버(127.0.0.1:3190, AUTH_ENABLED=false)와 독립 Chromium context를 사용했다. 기존 서버·실제 로그인·Azure 리소스·사용자의 열린 문서는 사용하지 않았다. 테스트 종료 시 생성한 서버와 브라우저가 종료되었다. 모든 시나리오에서 `pageerror` 및 HTTP 400 이상 응답이 없는지 자동 단언했다.

## 실제 화면과 출력 파일

- [47개 브라우저 결과](./2026-10-30-admin-review-fixes-evidence/browser-validation.json): 필수 사용자 흐름 8개 + 반응형 36개 + 탭 2개 + HTML 가이드 1개.
- [36개 문서 폭 측정](./2026-10-30-admin-review-fixes-evidence/responsive.json): skills / templates / users / policy?tab=tokens / dashboard / audit 각각 1440×900, 1024×768, 768×1024, 390×844, 320×568, 1024×500. 모두 `document.scrollWidth <= innerWidth + 1`.
- [320px 탭](./2026-10-30-admin-review-fixes-evidence/dashboard-320.png), [390px 탭](./2026-10-30-admin-review-fixes-evidence/dashboard-390.png), [작업 편집 상태](./2026-10-30-admin-review-fixes-evidence/workbench-state.png), [컴포넌트 HTML](./2026-10-30-admin-review-fixes-evidence/design-components.png).
- [최신 적용 전 출력](./2026-10-30-admin-review-fixes-evidence/selected-before.pptx), [최신 적용 후 출력](./2026-10-30-admin-review-fixes-evidence/selected-latest.pptx), [실제 다운로드 CSV](./2026-10-30-admin-review-fixes-evidence/audit.csv). CSV 데이터는 mock이다.
- [OOXML 보존 결과](./2026-10-30-admin-review-fixes-evidence/pptx-preservation.json), [PowerPoint 결과](./2026-10-30-admin-review-fixes-evidence/office-validation.json). 6개 속성 변형 출력과 선택 적용 출력 2개를 확인했다. ZIP 압축 파일 자체의 바이트 동일성이 아니라 개별 미수정 파트 내용과 대상 도형 XML의 보존을 검사했다.
- Office 렌더링은 기존 POWERPNT 프로세스가 없음을 확인한 뒤 별도 COM 인스턴스에서 읽기 전용·창 숨김으로 실행했다. 검증용 문서만 닫고 해당 인스턴스만 종료했다. 32장을 자동 렌더링했으며, 숨김 true 사례와 선택 적용 결과의 2쪽을 이미지로 직접 확인했다. 32장 모두의 육안 전수 검사를 주장하지 않는다.
- [디자인 컴포넌트 가이드](./2026-10-30-skill-template-design-components.html)의 08절에 상태 경계, 취소 수명, 탭과 활동 표시 계약을 추가했다. 1440/390/320px 폭, 내부 목차 대상, 스크립트 오류를 Chromium에서 확인했다.

기존 사용자 삭제·복구, 토큰 승인 후 프로필 100K→150K, 단가 소수 6자리 저장, 활동 상세 요청 ID, Skill 미저장 모달과 포커스 복귀, 예전 토큰 주소 리다이렉트도 브라우저에서 통과했다. 부서/그룹/read 권한 회수와 비동기 결과 차단은 기존 서비스 경합 검사까지 함께 통과했다.

## 핵심 변경 학습 노트

### 1. 파일과 버전을 구분하여 상태를 유지한다

`lib/admin/assets/work-policy.ts`의 `resolveReapplyOptions`가 적용 옵션 선택을 담당한다. 내용 버전이 달라져도 원본 파일이 같으면 현재 작업 선택을 유지한다. 반대로 파일이 바뀌면 이전 도형 ID와 선택을 새 파일에 강제로 붙이지 않는다.

```ts
if (pinned.definition.fileRefId === candidate.definition.fileRefId) {
  options.selectedSlides = retained.selectedSlides;
}
```

`TemplateWorkService.run`은 이 후보 옵션으로 처리하고 성공했을 때만 버전·옵션·결과를 함께 교체한다. 실패 시 이전 성공 결과를 보존하는 기존 계약은 유지했다.

### 2. Query 초기 데이터와 React key의 역할을 분리한다

`TemplateWorkService.getWorkSnapshot`은 현재 actor·소유권·ACL 검사를 통과한 복제 데이터만 반환한다. `hooks/admin/use-template-work.ts`는 이를 `initialData`로 사용해 매번 로딩 화면으로 바뀌며 자식 편집기가 사라지는 현상을 막는다. 사용자·역할·부서·서비스/작업 revision을 포함하는 Query key는 그대로 유지한다.

`TemplateWorkbench.tsx`의 아래 key는 실제 파일 교체 때에만 자식 컴포넌트의 로컬 편집 상태를 새로 만든다. React key가 바뀌면 해당 하위 트리가 다시 만들어진다.

```tsx
<Fragment key={workId + ":" + view.fileRefId}>
```

포커스는 대상이 여전히 연결되어 있고 사용자가 다른 곳으로 이동하지 않았으며 현재 작업·파일·권한이 유효할 때만 복구한다. 이전 Query의 `placeholderData`를 무조건 재사용하는 방식은 권한 회수 시 낡은 데이터를 보일 수 있으므로 사용하지 않았다. 실제 서버 연결 때는 동기 mock 스냅샷을 그대로 네트워크 조회에 대입할 수 없다.

### 3. 중단과 늦은 결과 무시는 별개다

`TemplateEditorDialog.tsx`는 취소 요청 시 요청 번호를 먼저 증가시킨다. 브라우저 파일 읽기나 압축 연산이 즉시 끝나지 않더라도 UI는 새 입력을 받고, 이전 요청의 콜백은 새 결과를 덮지 못한다.

```ts
request.current++;
session.cancel();
setProgress(null);
```

전용 분석 취소는 `clear`, 편집 닫기 시도는 `cancel`을 사용한다. 이미 완료된 임시 파일은 계속 편집할 수 있어야 하므로 두 수명을 합치지 않았다.

### 4. 표시·집계와 감사 원문을 분리한다

`lib/admin/audit-operation.ts`의 `getAuditOperation`을 목록·검색·CSV·대시보드가 공유한다. 표시 문구가 바뀌거나 refs JSON 내용이 달라도 같은 작업 ID로 집계한다. 저장된 `AdminAuditEvent.detail`은 변경하지 않는다.

```ts
{ id: `${resource}:${action}:${operation}`, label }
```

CSV 기존 5열은 사용자용 작업명이며 마지막 15열에 원문을 둔다. CSV를 외부에서 소비한다면 이 열 추가를 인지해야 한다. 역할/기간 필터를 적용한 다음 집계하는 순서는 유지했다.

### 5. 공통 컴포넌트와 파서에 수정 지점을 모은다

`AdminTabs.tsx`는 컨테이너의 `scrollLeft`만 바꾼다. 실제 브라우저에서 즉시 보정한 위치가 Fluent 선택·포커스 처리로 되돌아가는 것을 확인해 `requestAnimationFrame` 이후 보정하도록 수정했다. 기존 키보드 계약인 방향키 포커스 이동·Enter 선택은 변경하지 않았다.

`lib/pptx/pptx-xml.ts`의 `readXmlBoolean`은 유효한 네 문자열과 속성별 기본값을 처리한다. `template-read.ts`에서 숨김·반전·굵기·병합·공유 표시를 읽을 때 사용한다. 미지원 구조나 숨김 요소를 더 많이 변환하는 기능 확장은 하지 않았다.

## 함께 처리한 검증 도구와 범위 밖 사항

- 저장소에서 재현하도록 `@playwright/test@1.64.1` 개발 의존성, 전용 config/script, E2E 4개 파일을 추가했다. 운영 패키지는 갱신하지 않았다.
- Playwright의 생성된 HTML 보고서 안에 번들 JavaScript가 있어 기존 `eslint`가 이를 소스로 검사했다. 검사 도구 추가에 필요한 인접 설정으로 `eslint.config.mjs`의 generated report/test-results 제외를 추가했다. 소스 lint 규칙을 완화하지 않았다.
- 초기 자동화의 필수 입력 접근성 이름, 일반 사용자 전환 뒤 자동 닫힌 프로필, Fluent 방향키 동작에 대한 잘못된 기대를 수정했다. 이 테스트 오류를 제품 결함으로 집계하지 않았다. 실제 모바일 스크롤 위치 경합은 제품 코드에서 수정한 뒤 확인했다.
- 추가로 즉시 처리할 제품 결함은 이번 검증에서 발견하지 않았다. 이미 확인된 보안 의존성, 실제 인증/서버 ACL·Cosmos/Blob, 대용량 성능, Firefox/Safari·모바일 실기기·스크린리더, 고객 실파일 다양성은 [후속 목록](./2026-10-30-admin-review-followups.md)에 남아 있다.
- 444+47개 통과는 전체 코드 커버리지나 모든 고객 PPT의 호환성을 뜻하지 않는다. 현재는 메모리 mock이며 새로고침하면 관리 데이터가 초기화된다. 공유 디자인 변경은 선택 슬라이드와 무관하게 연결 전체에 영향을 준다. 전역 브랜드 색상·새 로고 삽입, 일반 제작 연결은 이번 범위에 포함하지 않았다.

## 기존 변경 보존과 재실행

기존 Skill·Template Task 10개의 SHA 기록 변경과 package-lock의 libc 30행 삭제를 이번 index에서 분리한다. 선행 full-review 보고서·증거도 변경하지 않는다. 이번 신규 계획/결정/Task/보고서, 구현 파일, 테스트, 필수 도구 변경만 통합 커밋한다. 설치 전 lock diff는 임시 폴더에 기록해 비교했다.

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:admin-review
```

브라우저 검사는 production build가 필요하다. 3190 포트가 이미 사용 중이면 그 서버를 재사용하지 않고 실패한다. 실행자가 포트 사용 원인을 확인해야 한다. 자동 생성 보고서는 playwright-report/test-results에 있고 Git에서 제외한다. 이번 실행의 필요한 결과만 evidence 폴더에 보존했다.

도구 사용 근거: [Playwright webServer](https://playwright.dev/docs/test-webserver), [테스트 설정](https://playwright.dev/docs/test-configuration), [PowerPoint 읽기 전용 열기](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentations.open), [슬라이드 내보내기](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentation.export).
