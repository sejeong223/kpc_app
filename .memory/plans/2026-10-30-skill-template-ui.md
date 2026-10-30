# Plan: Skill·Template 관리자 UI와 실제 PPT 적용 테스트

- Date: 2026-10-30
- Status: done
- Decisions: [확정 설계](../decisions/2026-10-30-skill-template-ui.md)
- Reference: [PoC 조사](../reports/2026-10-29-skill-template-poc-reference.md)
- 실행 청사진의 T01~T10 구현·검증 완료. 실제 실행 결과는 [검증 기록](../reports/2026-10-30-skill-template-validation.md)에 구분해 남겼다.

## Goal

관리자 전용 Skill·Template 목록과 편집, 역할/부서/공개 범위에 따른 CRUD, 실제 PPTX/POTX 추출 및 Skill 적용 테스트를 제공한다. 기존 적용 버전을 유지하며 명시적 최신 재적용만 새 버전을 반영한다. 원본 비활성·삭제와 권한 회수의 동작을 구분하여 자동 검증한다. 디자인 교체를 위한 공통 컴포넌트를 재사용하고 HTML 가이드를 작성한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 타입·권한·PPT 엔진·관리 UI·적용 테스트·통합 검증 | [P01](../phases/2026-10-30-skill-template-ui/P01-skill-template-ui/phase.md) |

## Task 흐름

| Task | 결과 | 주요 파일 |
| --- | --- | --- |
| T01 | 자산·버전·Skill 설정 계약과 권한 상한 | `lib/admin/assets/schemas.ts`, `lib/skills/schema.ts`, `types/admin-assets.ts`, `config/admin-permissions.ts` |
| T02 | 실제 PPT 분석과 실행 중 파일 보관 | `lib/pptx/`, `services/admin/TemplateFileStore.ts`, `tests/lib/pptx/` |
| T03 | 원자적인 자산 CRUD·복제·공개·삭제와 로그 | `services/admin/MockAdminDataService.ts`, `lib/admin/assets/`, `config/admin-assets-seed.ts` |
| T04 | Skill·공유 디자인 변환 및 변경 보고서 | `lib/pptx/template-apply.ts`, `shared-design.ts`, `template-results.ts` |
| T05 | 고정 버전 작업·재적용·취소·권한 회수 | `services/admin/TemplateWorkService.ts`, `types/template-work.ts` |
| T06 | 실행 공급자·Query 훅·공통 자산 UI | `AdminRuntimeProvider.tsx`, `hooks/admin/use-assets.ts`, `components/admin/assets/` |
| T07 | Skill 목록·9개 영역 편집 화면 | `components/admin/skills/`, `AdminScreenRouter.tsx`, workspace route |
| T08 | Template 업로드·추출·버전 편집 화면 | `components/admin/templates/`, workspace route |
| T09 | 적용 테스트·공유 디자인·전후 비교·다운로드 | `components/admin/templates/workbench/` |
| T10 | 시나리오 검증·출력 확인·HTML 가이드·통합 커밋 | `tests/integration/skill-template-workflow.test.ts`, `.memory/reports/2026-10-30-skill-template-*` |

단일 기능의 연속 구현이며 외부 배포나 별도의 인프라 마일스톤이 없으므로 한 Phase로 둔다. Task는 검증 가능한 계약·서비스·엔진·화면 단위로 나누며 순차 실행한다. T01에서 모든 서비스 메서드를 기존 인터페이스에 미리 붙여 컴파일을 깨뜨리지 않고, 실제 구현 Task에서 인터페이스와 클래스를 함께 확장한다.

## 공통 실행 기준

- Next 16.0.10, React 19.2.1, Zod 4, TanStack Query 5, Fluent UI 9, Tailwind 4의 현재 구성을 유지한다. 패키지 업그레이드는 이 계획의 목적이 아니다.
- 문서에 명시한 파일과 심볼을 구현한다. 내부 any/unknown 금지, Zod 입력 검증, 전체 모델에서 Pick/Omit 파생, Tailwind `tw:` 접두사, 한국어 설명/주석을 따른다.
- 현재 실제 인증 User/Admin 서버 가드를 유지한다. 3단계 업무 역할은 mock 시연이다. 실제 권한·데이터 보호를 구현한 것처럼 안내하지 않는다.
- 자산 메타데이터/버전은 기존 `MockAdminDataService`의 공통 state에 둔다. 파일/ZIP/결과 바이트는 별도 메모리 저장소에 두고 사용자·그룹·부서를 복제하지 않는다.
- mock은 메뉴 이동 동안 유지하고 새로고침·인증 사용자 변경 시 정리한다. 일반 제작 화면·Cosmos DB·Blob·RAG·LLM·전역 브랜드 편집 엔진은 제외한다.
- Template의 이번 편집은 메타데이터·공개/상태·파일 교체·슬라이드 유형·요소 역할·적용 제외다. 추출한 테마 색상/글꼴/로고 후보는 정보로 보여준다. 사용자는 계획 중 후속 질문에서 ‘현재 지원 범위로 계획하고 브랜드 전체 편집은 후속’으로 명시적으로 선택했다. 전역 테마 색 변경·새 로고 삽입은 이번에 추가하지 않는다.
- 변경 로그는 기존 mock 시계 `2026-10-20T00:00:00.000Z`에서 증가시킨다. 실제 현재 날짜를 섞으면 기존 감사 기간 필터 상한에 걸린다. PPT 적용은 새 `apply` 액션으로 구분해 AI 생성·토큰 사용으로 집계하지 않는다.
- 전체 검사 명령은 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`다. Task별 필요한 검사와 전체 검사는 각각 청사진에 명시한다.

## 커밋 방침

사용자의 ‘모든 Task 진행 후 한 번에 커밋’ 선호를 계승한다. 각 Task에는 추적 가능한 커밋 메시지를 준비하지만 실행 중에는 파일을 커밋하지 않고 `commit: deferred (통합 커밋 대기)`로 기록한다. T10에서 모든 필수 검증이 끝나면 이번 범위만 한 번 커밋하고 Task/Phase/current 기록에 같은 커밋을 연결한다. 검증 실패·브라우저 미검증을 완료로 덮어쓰지 않는다. push는 요청 범위가 아니다.

기존 `package-lock.json` 변경(선택적 패키지의 libc 30행 삭제)은 사용자 기존 변경으로 보존한다. 의존성 추가 시 기존 변경과 새 패키지 변경을 분리해 검토하고, 기존 변경을 되돌리거나 통합 커밋에 우연히 섞지 않는다.

통합 메시지:

```text
feat(admin): Skill·Template 관리와 실제 PPT 적용 테스트 구현

Plan: 2026-10-30-skill-template-ui
Phase: P01-skill-template-ui
Tasks: T01-T10

- 부서별 자산 권한과 고정 버전 재적용 정책 구현
- PPT 분석·변환·공유 디자인·전후 비교 연결
- 공통 디자인 컴포넌트 가이드와 검증 기록 작성
```

## 기존 계획 보존 및 범위 밖 발견

- 이전 관리자 계획은 T01~T08 done, T09 브라우저 검증 미완료다. [기존 current 보관본](../reports/2026-10-30-current-before-skill-template-ui.md)에 보존하고 기존 Task/Phase 상태는 변경하지 않는다.
- 일반 제작 화면은 안내 화면이다. 이번 적용 테스트를 구현하면서 일반 사용자 제작을 완성한 것처럼 표시하지 않는다.
- 기존 PoC의 새 PPT 생성용 PptxGenJS·esbuild·localStorage·자체 그룹 관리와 나중의 RAG/LLM 실험은 가져오지 않는다.
- 전역 브랜드 색상 편집·새 로고 삽입은 기존 PoC에 없는 확장이다. 사용자가 후속으로 남기기로 선택했으므로 현재 계획에서 제외한다.

## 참고한 공식 기술 문서

- JSZip의 `loadAsync` 입력, 기존 데이터 참조 유지, CRC 확인 옵션을 근거로 원본 바이트를 불변으로 보관하고 ZIP을 매 적용마다 다시 연다. [JSZip loadAsync](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html)
- JSZip의 비동기 출력은 결과 전체를 메모리에 유지하므로 용량 제한과 작업 정리를 함께 검증한다. ZIP 전체 바이트의 동일성 대신 수정하지 않은 구성 파일의 해제된 바이트를 비교한다. [JSZip limitations](https://stuk.github.io/jszip/documentation/limitations.html)
- PPT 모듈과 작업 UI는 사용 시 클라이언트에서 지연 로딩하며 브라우저 API를 서버 렌더 단계에서 실행하지 않는다. [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading)

## 완료 기준

- [x] T01~T10 구현·검증 통과 및 체크 기록
- [x] 실제 파일의 내용/관계/미변경 구성 파일 보존과 정책별 시나리오 검증
- [x] 브라우저·키보드·모달·반응형·PPT 출력 확인을 검증 수준별로 기록
- [x] HTML 컴포넌트 가이드 생성·열람 확인
- [x] 이번 범위의 단일 커밋 및 기존 작업 보존
