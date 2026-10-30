# 관리자 UI·Skill·Template 전체 재검증

- 검증일: 2026-10-30, 약 11:58~12:10 KST
- 대상 HEAD: `790835657f82a27871ff5e1ec80632ca115c69c7`
- 요청: 지금까지 구현한 내용의 전체 검증. 이번 작업은 검토와 증거 수집이며 제품 코드 수정·커밋은 하지 않았다.
- 범위: 활동 로그, 대시보드, 사용자·그룹·CRUD 권한, 모델·토큰 관리, Skill·Template 관리, 실제 PPT 분석·적용·버전 수명주기.
- 판정: 기존 자동 검사는 모두 통과했지만 실제 동작에서 주요 결함 4개를 재현했다. 현재 상태를 결함 없이 검증 완료된 구현으로 보기는 어렵다.

## 주요 발견 사항

### F01 — [P1] 같은 파일의 최신 Template을 적용하면 선택하지 않은 슬라이드까지 수정한다

- 위치: [TemplateWorkService.ts:99](../../services/admin/TemplateWorkService.ts#L99)
- 관련 계약: T05는 `fileRefId`가 바뀔 때 선택 슬라이드를 초기화하도록 정의한다. 최신 적용 확인 창도 파일 변경 시 선택 초기화를 안내한다.
- 재현:
  1. 4장짜리 Template으로 작업을 생성하고 2쪽만 선택한다.
  2. 고정 버전을 적용한다.
  3. 원본 Template의 설명만 수정해 v2를 만든다. 파일은 동일하다.
  4. 작업에서 최신 버전 재적용을 실행한다.
- 기대: 같은 파일에서 선택한 2쪽을 유지한다. 새 등록 매핑은 합의한 정책대로 반영한다.
- 실제: `selectedSlides`가 `[1]`에서 `[0,1,2,3]`으로 변경된다. 생성 PPT를 원본과 비교하면 1·4쪽 XML도 수정된다. 3쪽은 지원 대상 변경이 없어 그대로였다.
- 원인: Template revision이 바뀌면 기본 옵션 전체를 생성한 뒤 `layout`, `images`, `sharedEdits`만 복원한다. `selectedSlides` 복원이 빠져 있다.
- 영향: 사용자가 의도한 적용 범위를 벗어난 출력 파일을 다운로드하게 된다.
- 수정 방향: 같은 `fileRefId`에서는 작업의 슬라이드 선택을 유지하고, 파일 교체인 경우만 기본값으로 초기화한다.
- 누락된 회귀 검사: 기존 동일 파일 최신 매핑 테스트는 `layout`만 검증하고 선택 슬라이드를 검증하지 않는다.
- 근거: [브라우저 화면](2026-10-30-full-review-evidence/latest-resets-selection.png), [서비스·XML 재현 결과](2026-10-30-full-review-evidence/engine-reproductions.json), [2쪽만 적용한 PPT](2026-10-30-full-review-evidence/selected-before.pptx), [최신 적용 후 PPT](2026-10-30-full-review-evidence/selected-latest.pptx).

### F02 — [P2] 적용 설정을 변경하면 편집 중인 슬라이드가 1쪽으로 돌아간다

- 위치: [use-template-work.ts:14](../../hooks/admin/use-template-work.ts#L14), [TemplateWorkbench.tsx:35](../../components/admin/templates/workbench/TemplateWorkbench.tsx#L35), [TemplateMappingFields.tsx:11](../../components/admin/templates/TemplateMappingFields.tsx#L11)
- 재현: 적용 작업에서 `설정할 슬라이드`를 2쪽으로 선택하고 페이지 유형을 변경한다.
- 실제: 설정은 2쪽에 저장되지만 슬라이드 선택은 즉시 1쪽으로 돌아간다. 다시 2쪽을 선택하면 변경된 유형을 확인할 수 있다.
- 원인: 옵션 변경마다 `workRevision`을 포함한 Query key가 바뀌어 `query.data`가 잠시 사라진다. Workbench가 로딩 화면으로 교체되면서 하위 편집기가 unmount되고, 슬라이드 선택의 `useState(0)`이 다시 실행된다.
- 영향: 여러 요소를 연속 편집할 때 다른 슬라이드를 잘못 변경할 수 있고 매번 원래 슬라이드로 이동해야 한다.
- 수정 방향: 같은 작업·같은 접근 권한 안의 데이터 갱신에서는 편집 위치와 포커스를 유지한다. 권한 변경 시 이전 데이터를 보여 주지 않는 현재 보호 정책은 유지해야 한다.
- 누락된 회귀 검사: UI에서 2쪽 이후를 선택한 다음 옵션을 저장해도 선택·포커스가 유지되는지 확인하는 검사가 필요하다.
- 근거: [재현 화면](2026-10-30-full-review-evidence/work-selection-reset.png).

### F03 — [P2] `hidden="true"`인 PPT 요소가 원본 보존 대상에서 빠진다

- 위치: [template-read.ts:61](../../lib/pptx/template-read.ts#L61), [template-read.ts:62](../../lib/pptx/template-read.ts#L62)
- 재현: 동일한 실제 PPT의 첫 번째 제목 요소에 `hidden="1"` 또는 `hidden="true"`를 지정한 두 입력을 생성하고 같은 Skill을 적용한다.
- 기대: 두 파일 모두 숨김 요소를 보존한다.
- 실제: `hidden="1"`은 `skipped`이고 요소 XML도 동일하지만, `hidden="true"`는 `changed`이며 `맑은 고딕 32pt`가 `Pretendard 40pt Bold`로 변경된다.
- 원인: 일반 요소 판독은 문자열 `1`만 참으로 취급한다. 상위 그룹 판독에는 이미 `1`과 `true`를 함께 처리하는 코드가 있어 처리 방식이 불일치한다. `flipH`, `flipV`도 같은 패턴이므로 함께 점검해야 한다.
- 명세 근거: XML boolean은 `true`, `false`, `1`, `0` 표현을 허용한다. [W3C XML Schema](https://www.w3.org/TR/xmlschema/#boolean), [Microsoft Open XML Hidden 속성](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.nonvisualdrawingproperties.hidden?view=openxml-2.8.1).
- 수정 방향: OOXML boolean 해석을 공통화하고 숨김·반전·굵기·병합 관련 속성에 적용한다. 이번에 실제 출력 차이까지 재현한 항목은 숨김이다.
- 근거: [결과 JSON](2026-10-30-full-review-evidence/engine-reproductions.json), `hidden-1-input/output.pptx`, `hidden-true-input/output.pptx`를 증거 폴더에 보관했다.

### F04 — [P2] 모바일 대시보드 탭이 문서 전체를 가로로 넘친다

- 위치: [AdminTabs.tsx:5](../../components/admin/ui/AdminTabs.tsx#L5)
- 재현: `/workspace/dashboard`를 320×568 또는 390×844로 연다.
- 실제: 문서 너비가 두 경우 모두 449px이 된다. 320px 화면에서 탭 영역은 client 288px / scroll 433px이며 `overflow-x: visible`, `flex-wrap: nowrap`이다. 마지막 탭이 화면 밖으로 밀려난다.
- 원인: 공통 `TabList`에 좁은 화면에서 줄바꿈하거나 탭 내부만 스크롤하는 처리가 없다.
- 수정 방향: 공통 탭 컨테이너에 명시적인 모바일 overflow/줄바꿈 정책을 적용하고 키보드로 활성 탭에 접근할 수 있게 한다.
- 근거: [모바일 화면](2026-10-30-full-review-evidence/dashboard-mobile-tabs.png), [36개 화면 측정값](2026-10-30-full-review-evidence/responsive.json).

## 추가 관찰

### 업로드 중 편집 닫기 취소 시 진행 상태가 즉시 해제되지 않는다

- 위치: `components/admin/templates/TemplateEditorDialog.tsx:37`
- `File.arrayBuffer()`만 테스트 브라우저에서 대기시키고, 분석 중 하단 `취소` → `계속 편집`을 선택했다. `session.cancel()` 이후에도 `progress`가 남아 입력과 저장이 비활성 상태였다. 실제 읽기 Promise를 해제한 뒤에야 `finally`에서 해제된다.
- 전용 `분석 취소` 버튼은 `setProgress(null)`을 수행하므로 회복할 수 있다. 영구 멈춤으로 판정하지 않았다. 대용량 파일 처리 시 불필요한 대기 UI가 남는 문제로 개선할 수 있다.
- 테스트 지연은 브라우저에서만 적용했고 원래 File API로 복구했다. 초기 계측 정리 중 테스트 코드가 삭제한 함수에 접근해 발생한 오류는 제품 결함으로 집계하지 않았다.
- 근거: [분석 대기 상태](2026-10-30-full-review-evidence/cancel-still-busy.png).

### 대시보드의 세부 작업에 내부 코드와 JSON이 노출된다

- 위치: `components/admin/dashboard/ActivityBreakdownPanel.tsx:11`, `lib/admin/selectors.ts:64`, `services/admin/MockAdminDataService.ts:164,207`
- CSV 내보내기 이후 `작업·리소스 상세`에서 조회 조건 JSON 전체가 작업 이름으로 표시됐다. 사용자·그룹 편집도 `update-group` 같은 내부 명령명으로 표시된다.
- `detail` 전체를 집계 키와 표시명으로 함께 사용하는 구조다. 자산 버전 refs가 다른 적용 작업도 서로 다른 세부 작업으로 분리될 수 있다.
- 사용자용 작업 분류와 감사용 상세 데이터를 분리하면 디자인 교체와 무관하게 의미 있는 집계를 유지할 수 있다. 주요 기능 결함 4개와는 별도의 표시·집계 개선 항목이다.

## 이번에 다시 실행한 자동 검사

| 검사 | 결과 |
| --- | --- |
| `npm.cmd test` | 57개 파일, 392개 테스트 통과, exit 0. 약 11:58 KST 실행, 9.98초 |
| `npm.cmd run typecheck` | 통과, exit 0 |
| `npm.cmd run lint` | 통과, exit 0 |
| `npm.cmd run build` | production build 통과, exit 0 |
| `git diff --check` | 통과. 기존 memory 문서의 CRLF 안내만 존재 |
| 대상 폴더의 내부 `any` / `unknown` / 직접 `fetch()` 검색 | `services/admin`, `lib/admin`, `hooks/admin`, `components/admin`, `lib/pptx`에서 해당 패턴 없음 |

기존 테스트에는 권한·부서·CRUD 상한, ID와 버전 검증, 동시 변경, 접근 권한 회수, 파일 교체, 삭제·비활성 후 고정 작업, 최신 적용 실패 시 이전 결과 보존, ZIP/XML 검증, 공유 디자인 보존 등이 포함되어 있다. 그러나 위 F01~F04를 검출하는 단언은 부족하다. 392개 통과를 동작 전체의 무결성이나 코드 커버리지 100%로 해석해서는 안 된다.

`baseline-browser-mapping`의 오래된 데이터 안내와 Vite의 향후 native config 관련 경고가 남아 있다. 이번 검사 실패는 아니다.

## 실제 브라우저 검증

- production 서버: `AUTH_ENABLED=false`, `http://localhost:3189`.
- Playwright/Chromium, 실제 DOM 이벤트·파일 업로드·다운로드로 검증했다.
- 실제 Entra 로그인 테스트가 아니라 역할 미리보기와 mock 서비스 동작 확인이다.
- browser `pageerror` 0건, HTTP 400 이상 응답 0건: [수집 결과](2026-10-30-full-review-evidence/browser-errors.json).
- 일부 자동화 locator가 잘못된 접근성 이름 또는 여러 요소를 선택해 재시도했다. 활동 상세의 초기 문자열 비교도 잘못된 범위를 읽어 펼침 행 자체로 재확인했다. 이 도구 오류들은 제품 오류로 집계하지 않았다.

| 영역 | 확인 결과 |
| --- | --- |
| 사용자 | 이름 검색으로 1명 필터, 직급 변경 저장, 삭제 후 되돌리기 정상 |
| 그룹 | 그룹 생성, 구성원 1명→2명 편집 저장 정상 |
| CRUD | 관리자 Skill read 해제 시 create도 해제되고 체크박스 비활성. 다시 불러오기로 미저장 초안 폐기 정상 |
| 역할·메뉴 | 부서 관리자는 자기 부서 3명만 조회하고 사용자 편집 액션 미노출. 모델 설정 탭 미노출. 일반 사용자 전환 시 상단 7개 메뉴만 남고 일반 화면으로 이동 |
| 모델 | 업무별 기본 모델 변경 저장 정상 |
| 단가·환율 | 소수 6자리 단가·환율 저장, 0 환율 거절 정상 |
| 토큰 | 본인 한도 100K→150K, 정지→재개, 신청 승인·반려 정상. 프로필도 150K 및 사용률 48%로 동기화 |
| 활동 로그 | 생성·수정한 그룹 검색 결과 2건과 CSV 2건 일치, 한국어와 BOM 확인. 서로 다른 행의 요청 ID·대상 ID 상세 구분 정상 |
| 대시보드 | 4개 탭, 막대→선 전환, 역전 날짜 거절, 최근 30일 복원 정상. 모바일 탭 넘침은 F04 |
| 이전 경로 | `/workspace/tokens` → `/workspace/policy?tab=tokens` 정상 |
| 모달 | Skill 등록 모달 1개, Tab 포커스 내부 유지, Escape 닫기 후 등록 버튼 포커스 복구 정상 |
| Template | 실제 예시 파일 등록, 동일 파일 설명 버전 변경, 고정 적용·최신 적용 실행. F01/F02 재현 |
| 적용 파일 | 독립 서비스 실행과 출력 ZIP/XML 비교로 F01/F03 확인 |

CSV 내보내기는 그 자체를 새 감사 이벤트로 기록한다. 따라서 내보내기 후 화면 건수가 2→3이 된 것은 이번 검증에서 오류로 분류하지 않았다.

### 반응형 측정

6개 화면(Skill, Template, 사용자 설정, 모델·토큰 관리, 대시보드, 활동 로그) × 6개 해상도 = 36개 조합을 측정했다.

| 해상도 | 측정 결과 |
| --- | --- |
| 1440×900 | 6개 화면 문서 가로 넘침 없음 |
| 1024×768 | 6개 화면 문서 가로 넘침 없음 |
| 768×1024 | 6개 화면 문서 가로 넘침 없음 |
| 390×844 | 대시보드만 문서 너비 449px, 나머지 5개 넘침 없음 |
| 320×568 | 대시보드만 문서 너비 449px, 나머지 5개 넘침 없음 |
| 1024×500 | 6개 화면 문서 가로 넘침 없음 |

이 측정은 기본 페이지의 문서 전체 넘침 검사다. 표 내부의 의도된 가로 스크롤까지 실패로 판정하지 않았다. 모든 모달·모든 데이터 길이 조합을 36회씩 검사한 것은 아니다. 데스크톱과 320px 화면 스크린샷을 증거 폴더에 보관했다.

## 의존성 보안 검사

| 명령 | 결과 |
| --- | --- |
| `npm.cmd audit --json` | 총 24건: critical 3 / high 13 / moderate 7 / low 1 |
| `npm.cmd audit --omit=dev --json` | 운영 의존성 총 11건: critical 3 / high 6 / moderate 2 |

- critical로 보고된 패키지는 `next`, `next-auth`, 간접 의존성 `fast-xml-parser`다.
- 이것은 이번 Skill/Template 변경으로 새로 유입된 결함이라고 판정한 것이 아니라 저장소 전체의 기존 의존성 위험이다. 이전 검증 기록에도 동일한 전체 건수가 있었다.
- `jszip`, `@xmldom/xmldom` 항목은 이번 audit 취약 패키지 목록에 없었다. 이는 알려진 advisory 목록 기준이며 모든 입력에 대한 안전성 보장은 아니다.
- 개별 advisory의 실제 배포 설정상 공격 가능성, 인증 사용 경로, 권장 업그레이드 조합은 이번에 침투 테스트하거나 수정하지 않았다. 따라서 모든 advisory가 현재 앱에서 재현되는 취약점이라고 단정하지 않는다.
- 원본: [전체 audit](2026-10-30-full-review-evidence/npm-audit.json), [운영 의존성 audit](2026-10-30-full-review-evidence/npm-audit-production.json). 배포 전 의존성 업데이트와 영향 검증은 별도 작업이 필요하다.

## 검증 한계와 아직 완료로 볼 수 없는 부분

- 실제 Entra 인증·배포 환경에서의 권한 검증, 실제 Cosmos DB/Blob 연결은 수행하지 않았다. 해당 연동은 현재 구현 범위 밖이다. 클라이언트 mock 권한 검사를 서버 인가의 대체물로 볼 수 없다.
- 실제 204~250 MiB 파일을 이용한 브라우저 메모리·응답성 시험은 하지 않았다. 기존 경계 검사는 size 메타데이터와 합성 슬라이드 수 검사이며 실파일 부하 시험과 다르다.
- 이번 새 출력은 ZIP/XML 수준으로 비교했다. PowerPoint COM 열기·렌더링은 [직전 구현 검증 기록](2026-10-30-skill-template-validation.md)에 있는 검증이며 이번 세션에서 다시 실행하지 않았다.
- Chromium으로 확인했다. Firefox/Safari/모바일 실기기·스크린리더 검증은 수행하지 않았다.
- 이전 관리자 계획 T09에 요구된 모든 수동 경합·설정 보존 조합을 이번에 전부 반복하지는 않았다. 해당 Task의 `in_progress` 상태를 변경하지 않았다.
- 이번에 확인한 주요 결함을 수정하고 회귀 검사를 추가한 다음, 대용량 파일·실제 인증·Office 호환성 검증을 보완해야 배포 판단에 필요한 근거가 갖춰진다.

## 재현 자료와 작업 보존

- 재현 스크립트: [reproduce.ts.txt](2026-10-30-full-review-evidence/reproduce.ts.txt). 저장소 루트에서 `.git/full-review.ts`로 복사한 다음 `npx.cmd --no-install tsx .git/full-review.ts`를 실행한다. 실제 서비스·실제 PPT 엔진을 호출하며 원본 fixture는 수정하지 않는다. 버그를 숨기는 성공 테스트가 아니라 기대/실제 차이를 기록하는 재현 도구다.
- 이 문서와 증거 폴더만 새로 작성했다. 검증 전부터 있던 Task 기록 10개와 `package-lock.json`의 30줄 삭제 변경은 그대로 두었다.
- 제품 코드·의존성·계획 포인터는 수정하지 않았고 커밋·push·배포·Azure 리소스 변경은 하지 않았다.
