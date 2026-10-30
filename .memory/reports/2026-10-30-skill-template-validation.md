# Skill·Template 구현 검증 기록

- 실행일: 2026-10-30 KST. 최종 전체 테스트 11:04, 후속 상태/문서 동기화 후 단일 커밋.
- 계획: `2026-10-30-skill-template-ui`, P01, T01~T10.
- 기준 HEAD: `539d36f` (`feat(admin): 관리자 mock UI와 디자인 컴포넌트 가이드 구현`).
- 환경: Windows, PowerShell, Node v22.20.0, npm 10.9.3, Next 16.0.10.
- 구현 범위: 관리자 Skill/Template, mock 자산·권한·버전, 실제 PPT 분석·변환·공유 디자인·적용 작업·다운로드.
- 제외: Cosmos DB/Blob/AI/RAG/LLM, 일반 제작 연결, 전역 브랜드 색상 편집·새 로고 삽입, 리소스 생성/배포/push.
- 기존 관리자 계획의 T09 미완료 상태는 유지한다. 아래 4개 기존 화면 smoke는 과거 T09 전체 완료를 의미하지 않는다.

## 자동 검사

| 명령 | 최종 결과 | 근거 |
| --- | --- | --- |
| `npm.cmd run typecheck` | exit 0 | 전체 TypeScript 검사 |
| `npm.cmd run lint` | exit 0 | 전체 ESLint 검사 |
| `npm.cmd test` | exit 0, 57 files / 392 tests | 실제 XML·ZIP·서비스·권한·경합·화면·기존 회귀 포함, 8.09초 |
| `npm.cmd run build` | exit 0 | Turbopack production compile, TypeScript, 페이지 생성 |
| `git diff --check` | exit 0 | 최종 stage 전/후 확인 |

처음 전체 병렬 실행에서는 실제 PPT를 두 번 이상 변환하는 3개 테스트가 5초 기본 제한에 걸렸다(387 통과 / 3 timeout). 개별 검사에서는 통과했으며, 해당 3개 테스트만 15초로 조정했다. 기능 assert를 제거하거나 전체 timeout을 완화하지 않았다. 이후 전체 390개 통과, 그룹 삭제/read 권한 회수 경합 사례 2개 추가 후 최종 392개가 통과했다.

`baseline-browser-mapping` 데이터 갱신 안내와 Vite의 향후 native config 경고는 남아 있다. 현재 검사 실패는 아니다. 의존성 전반 업그레이드는 이번 범위에 포함하지 않았다.

## 시나리오와 자동 검증 위치

| 시나리오 | 확인 내용 | 주요 테스트 |
| --- | --- | --- |
| 역할·라우트·메뉴 | 관리자 서버 가드, 일반 사용자 메뉴 차단, CRUD 상한 | `tests/app/workspace/screen.test.ts`, `tests/config/sidebar.test.ts`, `tests/lib/admin/assets/permissions.test.ts` |
| 실제 등록→적용→재분석 | 문구·슬라이드 수·관계·미변경 파트 보존, 적용 로그 1건, tokens=0, usage 변화 없음 | `tests/integration/skill-template-workflow.test.ts` |
| 소유 부서와 공개 범위 | 타 부서 공개 자산은 조회/적용/복제, 원본 수정·삭제 거절, 사본은 자기 부서·비활성·비공개·v1 | `tests/services/admin/assets.test.ts`, 통합 테스트 |
| 내용 버전 | 내용 변경만 immutable revision 추가, 메타 상태 변경은 record version, 동일 내용 no-op | `tests/services/admin/asset-versions.test.ts` |
| 고정/최신 적용 | 기존 파일/결과 유지, 최신 성공 때 refs/result 동시 교체, 최신 실패 시 기존 다운로드 유지 | `tests/services/admin/TemplateWorkService.test.ts` |
| 비활성·삭제 | 새 선택/최신 적용 불가, 기존 고정 버전 적용/다운로드 허용 | 동일 서비스 테스트, 통합 테스트 |
| 현재 ACL 회수 | 공개 축소, 그룹 탈퇴·삭제, read 회수, 계정 잠금, 부서/역할 변경, 늦은 처리 결과 게시 차단 | `tests/services/admin/TemplateWorkService.races.test.ts` |
| 공유 디자인 | master/layout 연결 전체, 그룹 내부 변경, 등록 원본 유지, unsupported/공간 부족 사유 | `tests/lib/pptx/shared-design.test.ts`, `shared-groups.test.ts`, `tests/lib/admin/assets/workbench-view.test.ts` |
| 파일 안전성 | ZIP CRC·용량·경로·DTD·손상·매크로/서명·종류 거절, POTX 지원 | `tests/lib/pptx/zip-validation.test.ts`, `template-read.test.ts`, `tests/services/admin/template-upload.test.ts` |
| 수명·캐시 | StrictMode 재연결 유지, 실제 identity 해제 시 파일·작업·Query 정리, 역할 변경 접근 차단 | `tests/lib/admin/assets/runtime.test.ts`, `query-keys.test.ts` |
| 업로드 경합 | 연속 선택, 취소, 미저장 유지/폐기, 늦은 import 참조 정리 | `tests/services/admin/template-upload.test.ts` |

상한 검사는 250 MiB 크기 메타데이터 및 그 값+1, 200장 허용·201장 거절을 검사했다. 파일 크기 경계 테스트는 작은 파일의 size를 재정의한 검사이며 실제 250 MiB 처리 성능 검사가 아니다. 200장 fixture는 동일 슬라이드 파트에 대한 참조를 반복하는 합성 경계 입력이다. 204 MB 이상 대용량 실파일은 실행하지 않았다.

## 브라우저 확인

- 앱: `AUTH_ENABLED=false`, production `next start --port 3188`, Playwright + Chromium 156.0.8078.4.
- 실제 Entra 인증이나 실서비스 인가 테스트가 아니다. 실제 서버 가드는 별도의 자동 테스트로 확인했다.
- 파일/모달 입력은 실제 브라우저 이벤트로 수행했다. 분석 취소를 확실히 관찰하기 위해 한 차례 테스트 브라우저의 `File.arrayBuffer()`에 1.2초 지연을 주었으며 검증 후 즉시 복구했다. 앱 코드에는 지연을 추가하지 않았다.
- 첫 검증 브라우저 도구의 잘못된 제목 대기로 세션이 재시작되었다. 이후 상태를 새로 생성해 전체 적용 흐름을 다시 확인했다. 초기 수집에는 URL이 식별되지 않은 resource 404 한 건이 있었다. 새 브라우저에서 응답 URL까지 수집한 이후 앱/가이드 JS 오류·HTTP 오류는 0건이었다.

| 항목 | 결과 |
| --- | --- |
| Skill 등록·편집 | 이름/약칭/활성/공개 저장, 변경 후 v2, 미저장 Escape 확인→계속 편집→저장 |
| Template 등록 | 예시 import, 실제 `shared-groups.pptx` 교체, 추출 메타데이터 갱신, 활성/전사 공개 저장 |
| 업로드 취소 | 지연 중 분석 취소, 늦은 응답이 교체 파일 정보를 게시하지 않음 |
| 적용 작업 | 실제 등록 Template + Skill 선택, 공유 그룹 내부 글꼴/색상 예약, 적용 완료·결과 보고서 |
| 공유 범위 | 연결 1~4쪽, 구조상 표시 3장 안내; 그룹 이동/크기 제한 및 숨김 요소 보존 사유 노출 |
| 다운로드 | 실제 37,637-byte PPTX 저장, ZIP/XML 및 PowerPoint 확인(아래 참조) |
| 메뉴 이동 | Skill 메뉴에서 원본 v2 수정 후 Template 작업 복귀, 이전 v1/성공 다운로드 유지, 새 버전 알림 |
| 최신 재적용 | 확인 모달→최신 적용 성공, 작업 Skill v2로 변경 |
| 직접 옵션 수정 | 이전 결과 표시 + 미적용 안내, 다운로드 숨김, 현재 버전 재적용 성공 후 다운로드 복구 |
| 비활성 | 목록의 새 적용 액션 숨김, 기존 작업의 성공 결과 다운로드 가능 |
| 일반 사용자 preview | 관리자 Skill/Template 링크 0개, 관리자 화면에서 검토 목록으로 이동 |
| 부서 관리자 preview | 다른 부서 공개 Skill 행에는 복제만, 상세는 조회 전용, 저장 버튼 0개 |
| 기존 화면 smoke | 모델·토큰 관리 / 사용자 설정 / 대시보드 / 활동 로그 제목·내용 로딩, JS 오류 없음 |
| 새로고침 | 새 등록 Template과 적용 작업이 초기화됨 |
| 키보드 | Tab은 모달 내부, Escape 닫기/미저장 확인, Skill 상세·등록과 Template 등록의 호출 버튼 포커스 복귀 |

확인 viewport: **1440×900 / 1280×800 / 1024×768 / 768×1024 / 390×844 / 360×740**. Skill 목록/편집, Template 목록/편집, 적용 작업/공유 편집/비교를 각각 캡처했다. 모달 경계·본문 스크롤·footer 도달을 확인했고 창 전체 가로 넘침은 없었다. 자산 표는 좁은 화면에서 내부 가로 스크롤을 사용한다.

키보드 검사에서 기존 `ModalFrame`의 단독 Dialog 사용 시 호출 버튼으로 포커스가 돌아오지 않는 문제를 발견했다. 공통 모달에 호출 요소 보관/닫힌 뒤 복귀를 추가했다. 다음 모달이 열려 있으면 포커스를 빼앗지 않는다. 수정 후 production build를 다시 시작해 포커스 복귀를 실제 확인했다.

증거 폴더: [2026-10-30-skill-template-evidence](./2026-10-30-skill-template-evidence/). `skill-list-*`, `skill-editor-*`, `template-list-*`, `template-editor-*`, `workbench-*`, `shared-editor-*`, `comparison-*`, `smoke-*` JPG와 `browser-checks.json`.

## 실제 출력 파일 확인 수준

- 출력: [browser-shared-applied.pptx](./2026-10-30-skill-template-evidence/browser-shared-applied.pptx), 37,637 bytes.
- SHA256: `a9ba47dcc6ee2f2f39d2c1d96dd72945e365899ec7bf5023c9f09a8f3bcbd461`.
- 원본: 합성 `shared-groups.pptx`, SHA256 `86bfae7d660c319122b82b684c91254c1753e0a5aa7c62c343e7344afddfa202`.
- 실제 출력의 XML/관계 34개 모두 파싱 성공, 필수 package/presentation/relationship 파트 존재.
- 원본의 구성 파일 32개가 해제된 바이트 기준으로 같았다. 변경은 `slide1.xml`, `slide2.xml`, `slide4.xml`, `slideMaster1.xml` 4개다. 관계·차트·미디어 등 다른 파트는 보존했다.
- master XML에 선택한 `D7192F` 색상 기록 4곳을 확인했다. 변경·유지·제외 요약은 7 / 15 / 4이며 공유 요소는 표시 페이지마다 집계한다.
- PowerPoint **16.0.20527.20088**, COM 읽기 전용/비표시로 파일 열기와 4장 PNG export 성공. 원본/출력 PPT를 다시 저장하지 않았다.
- `powerpoint-render/슬라이드1~4.PNG`를 직접 확인했다. 제목/문구/표·병합표/차트/그룹이 출력된다. 합성 fixture의 화면 밖·겹친·축소 그룹은 보존 테스트용이므로 이 파일을 최종 시안 품질의 예시로 보지 않는다.
- COM 열기/렌더 중 오류는 없었다. **사용자에게 표시되는 복구 경고 대화상자 유무를 대면 확인한 검사는 아니다.** 글꼴 대체, 모든 실무 PPT의 정밀 배치·overflow까지 보장하지 않는다.
- 구조 근거: `output-structure.json`; PowerPoint 근거: `powerpoint-check.json`, `powerpoint-render/`.

## 디자인 가이드

[디자인 컴포넌트 HTML](./2026-10-30-skill-template-design-components.html)은 오프라인 단일 파일이다. 사용자 흐름, 공통/전용 컴포넌트 20개 단위, 실제 파일/props, 토큰, 9영역 Skill 폼, Template 3영역, 전후 비교, 상태 비교, 권한 표, 디자인 인계 경계가 포함된다.

1440×1000 / 768×1024 / 375×812에서 가로 넘침 없이 확인했다. 목차 anchor, 컴포넌트 검색, 상태 버튼, 밝음/어두움 테마가 동작하고 외부 HTTP 요청·JS 오류가 없다. 주요 화면을 직접 이미지로 확인했다. `guide-*.jpg` 참고.

`visualize` 스킬의 skeleton을 바탕으로 만들되 계획의 오프라인 요구를 우선하여 원격 폰트/CDN·PNG 다운로드 의존성을 제거하고 테마·인쇄/PDF·탐색 메뉴를 유지했다. 문서 인터랙션은 탐색/상태 비교이며 파일을 서버에 보내지 않는다. 실제 고객 개인정보나 업로드 자료는 문서에 포함하지 않았다.

## 의존성과 기존 작업 보존

- 추가 runtime: `jszip` 3.10.1. 실제 ZIP 열기/재압축에 사용한다.
- 추가 dev: `@xmldom/xmldom` 0.9.12. Node 테스트의 DOMParser/XMLSerializer로 사용한다. 브라우저는 네이티브 DOM API를 사용한다.
- PptxGenJS/esbuild/새 디자인 라이브러리나 PoC의 localStorage/사용자 시스템을 가져오지 않았다.
- 설치 후 npm audit에는 총 24건(low 1 / moderate 7 / high 13 / critical 3)이 보고되었다. 신규 직접 의존성 jszip/xmldom은 해당 audit 항목에 없었다. 설치 전 audit 수치를 확보하지 않았으므로 기존부터 같은 수치였다고 단정하지 않는다. 일괄 audit fix는 수행하지 않았다.
- 시작 시 존재하던 `package-lock.json`의 libc 삭제 30줄은 작업 트리에 보존한다. 최종 index에는 이번 의존성 추가만 넣고 기존 삭제는 제외한다.
- 기존 관리자 T09 및 로컬 PoC 원본은 수정하지 않는다. 대용량 fixture/인증값/고객 파일은 커밋하지 않는다.

## 학습·인계 메모

- `lib/admin/assets/schemas.ts` / `lib/skills/schema.ts`: Zod strict schema로 입력과 타입을 함께 정의한다. UI가 보낸 추출 요약을 믿지 않고 FileStore의 분석 결과에서 다시 구성한다.
- `MockAdminDataService` / `TemplateWorkService`: 자산 관리와 적용 작업을 분리한다. `apply-work`의 `mode: "pinned" | "latest"`가 현재 적용 버전 유지/최신 반영을 명시한다. 새 버전 알림은 자동 업데이트가 아니다.
- `TemplateFileStore` / `lib/pptx/`: 파일 참조와 변환 엔진을 화면에서 분리한다. 디자인 변경 시 XML 엔진이나 권한 검사를 옮길 필요가 없다.
- `AdminRuntimeProvider` / Query 훅: 메뉴 이동은 상태 유지, 인증 identity 해제는 작업/파일/캐시 정리. mock을 영속 저장으로 바꿀 때도 현재 사용자 권한 검사를 서버에서 다시 해야 한다.
- 함께 처리한 인접 사항: 공통 모달의 포커스 복귀, 업로드 닫기 확인 중 계속 편집할 때 staged 파일 보존. 둘 다 이번 화면의 실제 입력 흐름 검증에서 확인한 문제다.
- 범위 밖 발견: audit 취약점/데이터 갱신 경고, 기존 관리자 T09 미완료. 별도 업그레이드·검증 작업으로 다룬다.

## 커밋

전체 Task 완료 후 `feat(admin): Skill·Template 관리와 실제 PPT 적용 테스트 구현` 메시지로 한 번 커밋한다. 생성 후 SHA는 별도 완료 기록에 남기며 자기 참조를 맞추기 위한 amend/push는 하지 않는다.
