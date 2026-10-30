# Skill·Template 계획 수립 조사와 검증 기록

- Date: 2026-10-30 (Asia/Seoul)
- 단계: memory-plan. `.memory/` 문서만 작성했다.
- Plan: [실행 계획](../plans/2026-10-30-skill-template-ui.md)
- Decisions: [확정 설계](../decisions/2026-10-30-skill-template-ui.md)

## 실제로 확인한 현재 코드

| 경로/심볼 | 관찰 | 청사진 반영 |
| --- | --- | --- |
| `AdminRuntimeProvider.RuntimeInstance` | provider별 서비스/QueryClient, identity key로 수명 구분 | T06에서 같은 수명에 파일/작업 서비스를 추가, 별도 전역 저장소 금지 |
| `MockAdminDataService.actor/draft/commit/addAudit` | 활성 사용자/부서 확인, state 사본의 원자적 변경, 논리 시계, 구독 알림 | T03의 자산 CRUD와 T05 apply/export 로그에 재사용 |
| `AdminResourceSchema/CRUD_CEILING` | 현재 skills/templates 리소스 없음 | T01에서 enum/상한/기본 권한을 함께 추가 |
| `RolePermissionsPanel` | 상수 기반 전체 리소스 렌더, 슈퍼 관리자 permissions 잠금 방지 | 기존 정책 유지하고 새 행만 같은 경로로 반영 |
| `getDirectory/getGroups` | 부서 관리자에게 일반 전체 조회를 열 수 없음 | 자산 공개 후보의 최소 DTO 전용 API를 T03에 추가 |
| `AdminStoreStateSchema` | Zod strictObject, JSON 데이터만 포함 | 파일/ZIP은 별도 저장, schema 순환 import 방지 |
| `adminQueryKey/retireAdminQueries` | user/role/department/revision/filter 포함, 최신 관찰 쿼리 삭제 방지 | T06 자산·작업 키 확장, ACL 변경 시 placeholder 재사용 금지 |
| `AdminPage` | 모든 화면에 ‘예시 데이터 · 기준일 2026.10.20’ 고정 | 실제 업로드 파일과 혼동되지 않게 T06 dataNotice 확장 |
| `AUDIT_ACTION_LABELS.generate` | ‘AI 생성’으로 표시 | 규칙 기반 적용은 별도 apply 액션, tokens=0, AI 사용량 생성 안 함 |
| `PeriodSchema/AuditQuerySchema` | 최대 조회일 2026-10-20 | 기존 논리 시계를 유지하여 새 변경 로그가 필터 밖으로 사라지지 않게 함 |
| workspace route/AdminScreenRouter | Skill/Template은 안내 화면, 실제 서버 Admin guard 존재 | T07/T08에서 각각 실제 페이지 연결, 가드 보존 |
| package.json/vitest.config.ts | Next16/React19/Zod4/Query5, node 환경의 `.test.ts` | 현재 라이브러리 유지, 엔진용 JSZip과 테스트용 xmldom만 추가 계획 |

## 계획 중 추가 확인과 사용자 선택

기획 HTML의 `tplBrand`는 색상 5종, heading/body 글꼴, 로고/위치/범위를 다룬다. 반면 기존 v3.4 PoC는 일부 공유 요소 편집을 지원하지만 전역 테마 색상 변경·새 로고 삽입을 완성한 엔진은 아니다. 이 차이를 설명하고 범위를 질문했다.

사용자는 **‘현재 지원 범위로 계획하고 브랜드 전체 편집은 후속으로 둡니다’**를 선택했다. 확정 문서 D17에 반영했다. 이번에는 실제 재업로드·슬라이드 유형·객체 역할·적용 제외와 관리 설정을 편집한다. 추출한 테마/로고 후보는 조회 정보다. 현재 작업의 공유 디자인 편집은 D07대로 유지한다.

## PoC 출처와 이식 경계

- 기준 디렉터리: `C:/Users/k2020/Documents/Codex/2026-10-23/new-chat/work/kpc-skill-poc/`
- 기준 버전: package.json 3.4.0 / README v3.4
- 실제 참조 경로를 Task별로 고정했다. 독립 HTML esbuild/vendor/PptxGenJS 새 생성 경로와 localStorage/자체 그룹 저장소는 제외한다.

| 파일 | SHA-256 |
| --- | --- |
| `src/_scheme/skill.ts` | `665511c327b673ac90c0a403a60ae388527b258f7203c78e53fd4dee1d040c6e` |
| `src/_scheme/shared-design.ts` | `06babca1bbc0485a331f4f116f41e39a3e41eab2699c73306ed72a3ff3c6a82f` |
| `src/_types/template.ts` | `8994baef222debbcdcb948e2a762441956fab21a5a93f94c73a15583c29a5dfe` |
| `src/_lib/pptx-xml.ts` | `761cd0ae8d13ba3f9dfcd56bb46bea40c4147d2d145d278d2abe86043930d5a0` |
| `src/_lib/template-read.ts` | `fbb9ae6b9c93a979dd954bc6fd1d24dad6d5a7e81169153f3a2cd2dd0161f3f7` |
| `src/_lib/template-apply.ts` | `f85f6b6a4c6721da633f461b1daa92a5d3c58eeb0c4b1ed5e5805eab3d2dc772` |
| `src/_lib/shared-design.ts` | `947727ed130b36302f1c1a3afd053b62e481291df6294ea7bc9dde2ca3027129` |
| `src/_lib/template-results.ts` | `f8b046211c1820aeefa7c779d7d559f8e0d9c8c74913ff2006b0622b426de5db` |
| `src/_lib/layout.ts` | `42237f8b0455cf85a0222cb69472ca6ea0a337b35f6e9b58d95a045eef4a50e0` |

합성 fixture는 native-template(50,079 bytes), shared-design(35,828), shared-groups(36,347), native-shared-group(51,726), skill-comparison(151,709)을 실행 단계에서 복사하도록 계획했다. 이번 단계에는 PPT 파일이나 소스를 이식하지 않았다.

## 작업 단위의 이유

- T01 계약과 enum/권한 기본값을 함께 바꿔 z.record 필수 키 누락을 막는다.
- T02 분석과 T04 변환을 나눠 손상 입력/추출 오류를 서식 적용 오류와 구분한다.
- T03 registry 데이터와 T05 작업 상태를 분리해 등록 자산 수정이 작업 결과를 자동 덮어쓰지 않게 한다.
- T06에서 수명/권한/공통 UI를 정리한 후 T07/T08 두 메뉴를 연결해 각 Task가 컴파일 가능한 단계가 되게 한다.
- T09는 실제 엔진·서비스가 준비된 후 연결해 작동하지 않는 적용 버튼을 먼저 배포하지 않게 한다.
- T10에서 전체 연동·브라우저·출력·HTML 가이드를 검증하며 모든 작업은 사용자의 기존 선호에 따라 한 번 커밋한다.

## 기존 작업과 검증 수준

- 이전 관리자 계획의 T09 브라우저 검증은 [보관본](2026-10-30-current-before-skill-template-ui.md)에 남겼다. 기존 Task/Phase를 완료로 변경하지 않았다.
- 계획 시작 시 git 상태는 package-lock.json 수정, 이번 인터뷰의 결정/조사 문서 untracked였다.
- package-lock.json 기준 SHA-256: `f908856ca1cfc8fbd175a26026467fcefe9b2168214b007173de2b51e4449190`. 이 계획에서 변경하지 않았다.
- 문서 16개의 헤더·코드 블록·상대 링크, Task 10개의 필수 구획과 current의 T01 포인터를 검사하여 오류 0건을 확인했다. 공통 update 명령/host 접근/작업 표시 계약의 문서 간 일치 검사도 오류 0건이다. `git diff --check`가 통과했고 package-lock SHA-256이 기준값과 동일하다. 앱 테스트/빌드/실제 브라우저/PPT 변환은 실행하지 않았다.
- 공개 API나 실제 Cosmos 모델을 설계하지 않았으므로 Cosmos SDK/컨테이너/파티션 작업은 포함하지 않는다.

## 기술 문서 확인

JSZip의 입력 참조 유지와 CRC 옵션, 출력 메모리 사용/ZIP 재생성의 한계를 확인했다. [loadAsync](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html), [limitations](https://stuk.github.io/jszip/documentation/limitations.html). 이를 원본 불변 보관·별도 파일 저장소·구성 파일 단위 보존 검증에 반영했다.

브라우저 엔진의 호출 시 지연 로딩은 [Next.js 공식 가이드](https://nextjs.org/docs/app/guides/lazy-loading)를 참고했다. 최신 문서의 버전 표기를 이유로 현재 프로젝트 Next 버전을 업그레이드하지 않는다.
