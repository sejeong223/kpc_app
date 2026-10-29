# Plan: 관리자 화면과 모델·토큰 통합 관리 mock

- Date: 2026-10-29
- Status: in_progress — T01~T08 구현·자동 검증 완료, T09 브라우저 검증 대기
- Decisions: [확정 결정](../decisions/2026-10-29-admin-mock-ui.md)

## Goal
활동 로그, 대시보드, 사용자 설정, 모델·토큰 관리의 4개 관리자 화면을 공통 디자인과 공유 mock 데이터로 구현한다. 일반/부서 관리자/슈퍼 관리자의 메뉴·작업·데이터 범위를 지키고, 신청→승인→한도→로그→대시보드의 연결과 과거 단가·환율 보존을 검증한다. 계획에 따라 구현을 진행했으며 실행 결과와 남은 브라우저 검증은 검증 보고서와 current에 기록한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 공통 계약부터 관리자 화면·통합 검증까지 순차 구현 | [P01](../phases/2026-10-29-admin-mock-ui/P01-admin-mock-ui/phase.md) |

`in_progress`는 활성 계획의 Phase 지정이며 Task 구현 완료를 뜻하지 않는다.

## 실행 순서와 분할 이유
- T01-domain-contracts: 도메인 계약·권한·비용·예시 데이터
- T02-mock-service: 범위 검사와 원자적 mock 서비스
- T03-design-foundation: Tailwind·Query 의존성과 공용 UI
- T04-runtime-and-navigation: 3단계 메뉴·공유 상태·프로필 연결
- T05-user-permissions: 사용자·그룹·역할별 권한 화면
- T06-model-token-cost: 모델·단가·환율·토큰 승인 화면
- T07-activity-log: 활동 로그 검색·상세·내보내기
- T08-dashboard: 대시보드 4개 탭과 공통 기간
- T09-integration-validation: 통합 흐름·회귀·접근성 검증

모두 같은 브라우저 mock 기능이며 외부 연동 경계가 없어 단일 Phase로 구성한다. 도메인 규칙을 먼저 순수 함수로 검증한 뒤 저장소·UI 기반을 만든다. 기존 프로필의 로컬 신청 목록 제거와 신규 저장소 연결은 T04에서 함께 처리하여 중간 단계의 이중 저장을 피한다. 각 화면은 독립적인 관찰 가능 결과를 갖고, 최종 Task는 화면 사이 회귀를 확인한다.

## 확정 범위
- 제작 아래 구분선 위 7개 메뉴는 전 역할, 아래 7개 메뉴는 관리자·슈퍼 관리자에게 노출한다. 기존 15개 항목은 모델/토큰 통합 후 14개가 된다.
- 정식 통합 URL은 `/workspace/policy?tab=models|tokens`. `/workspace/tokens`는 서버 권한 검사를 거쳐 tokens 탭으로 이동한다. 단일 사이드바 항목 이름은 모델·토큰 관리다.
- 3단계 업무 역할은 `super_admin | department_admin | user`. 실제 Entra의 `Admin | User` 스키마와 권한 가드는 보존한다. 인증된 Admin은 기존 전사 관리자 권한을 mock의 super_admin 표현으로 매핑하고, 실제 부서 관리자 로그인 역할을 새로 발급하지 않는다.
- 부서 관리자는 자기 부서 사용자·사용량·대시보드·로그 조회와 토큰 승인/반려만 가능하다. 사용자 변경, 전사 정책, 모델/단가/환율, 권한표 편집은 슈퍼 관리자만 가능하다.
- CRUD 편집 대상은 이번 4개 관리자 화면의 업무 리소스다. 역할별 상한 및 부서 범위는 체크박스로 확대할 수 없다.
- 비용은 모델별 입력/출력 100만 토큰당 USD 단가와 수동 USD/KRW 환율로 계산한다. 사용 시점 설정을 보존하고 원화 예상 비용을 표시한다.
- 대시보드: RFP 현황 / 사용량 트렌드 / 작업·리소스 상세 / 사용자별 현황.
- 디자인은 Tailwind 레이아웃과 기존 Fluent UI 컨트롤을 결합한다. 기존 ModalFrame·SegmentedControl·ToggleSwitch·프로필 모달을 재사용한다.
- 서비스 인터페이스와 Query 훅으로 UI를 분리한다. mock 저장소는 레이아웃 수명 동안 유지되고 새로고침 시 초기화한다. 모듈 전역 사용자 저장소·localStorage·실제 API/DB는 추가하지 않는다.

## 실행 기준
- Next 16.0.10, React 19.2.1, Fluent UI 9.74.11, Zod 4.6.5 범위가 현재 package.json에 있다. 기존 프레임워크 업그레이드는 포함하지 않는다.
- 2026-10-29 npm 레지스트리에서 확인한 추가 버전: `@tanstack/react-query@5.105.0`, `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`, `postcss@8.5.32`. 설치는 T03에서만 수행하며 정확한 버전을 저장한다.
- 테스트 환경은 Vitest의 node이고 `tests/**/*.test.ts`만 수집한다. 업무·권한·비용·캐시 테스트는 순수 TS로 작성하고 브라우저 검증을 별도로 수행한다.
- `tsconfig.json` target은 ES2017이다. 정수 비용 계산에 BigInt를 쓰되 리터럴 `1n` 대신 `BigInt(1)`을 사용하고 저장·반환 DTO는 10진 문자열로 직렬화한다.
- 신규 주석·메시지는 한국어. 내부 any/unknown 금지, Zod 검증, Container→Pick/Omit 전략을 따른다.
- Tailwind는 Preflight를 제외하고 `tw:` 접두사를 사용한다. 기존 Fluent/Griffel SSR 처리와 로그인 기본 스타일을 유지한다.
- 각 Task는 이 문서를 다시 읽지 않아도 실행할 수 있도록 필요한 계약과 기존 연결 정보를 자체 포함한다. 뒤 Task용 계약을 부록에 적은 경우 해당 Task의 Related Files 밖까지 선행 구현하지 않는다.

## 관찰과 회귀 방지
- 기존 신청은 `ProfilePreviewProvider`의 reducer에 쌓이고 `PROFILE_TOKEN_USAGE.limit=100000`을 직접 읽는 곳이 여러 곳이다. T04에서 데이터 소스를 한 번에 바꾼다.
- 기존 사용량 일별/프로젝트별 합계는 72.4K이나 최근 내역의 10/19 항목과 일별 10/19=0은 일치하지 않는다. T01의 동일 원장으로 최근 내역을 다시 파생하여 총량을 유지한다.
- 기존 역할 전환은 동일 사용자 유지가 전제다. 예시 사용자 ID는 유지하고 시연 역할만 변경한다. 실제 세션 역할 변경 기능으로 만들지 않는다.
- 관리자 메뉴의 기본 노출과 특정 CRUD 허용은 구분한다. 조회가 해제되면 해당 본문은 접근 불가를 표시하고 데이터 조회를 실행하지 않는다.
- 이전 전사 결과를 부서 화면의 placeholderData로 재사용하지 않는다. 캐시 키에는 사용자·역할·부서·권한 revision·입력 필터가 포함된다.
- 비용 표시를 반올림한 뒤 다시 합산하지 않는다. 최소 단위 정수 문자열을 합산한 후 표시 시 반올림한다.
- 날짜는 시연 기준 `2026-10-20`과 한국 시간으로 고정한다. 변경 로그도 동일 논리 시계를 사용하여 새 작업이 과거 기준 필터 밖으로 사라지지 않게 한다.
- `AppShell` 본문은 현재 maxWidth 1320px/padding 40px 38px다. 관리자 화면에만 적절한 여백을 적용하고 원본 HTML .page padding을 다시 중첩하지 않는다.

## 제외 및 인접 후속 사항
- Cosmos DB 컨테이너·파티션·쿼리·프로비저닝, 실제 모델 호출/청구, 자동 환율, 메일 발송, 실제 조직 조회, Entra의 3역할 변경은 제외한다. 이번 작업은 DB 설계가 아니므로 Cosmos 스킬을 적용하지 않았다.
- 실제 세션의 부서가 없고 nullable인 점은 별도 연동 과제다. 미확인 부서를 전사 권한으로 바꾸지 않는다.
- 일반 업무/프롬프트 세트/Skill/Template 본문 CRUD는 구현하지 않는다. 이번 메뉴 그룹 노출 규칙만 적용한다.
- 인터뷰 전부터 package-lock.json에 30줄 삭제가 있다. 설치 전에 diff를 보존·확인하고 임의 복구나 unrelated 일괄 stage를 하지 않는다.
- 위 후속 항목은 이미 인터뷰에서 별도 범위로 정했다. 새로 발견한 별개 문제는 보고하고 사용자 선택 없이 Task를 추가하지 않는다.
- 최초 분석의 브라우저 호스트 연결은 실패했다. 실제 시각·키보드 검증은 T09에서 수행하고, 불가능하면 미검증으로 기록하며 통과했다고 쓰지 않는다.

## 검증 및 완료 정의
각 Task의 지정 테스트·typecheck·lint를 통과하고 필요한 빌드를 수행한다. T09에서는 전체 `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` 및 세 역할/부서/승인/비용 이력의 브라우저 시나리오를 확인한다. 계획 생성 단계에서는 이러한 구현 테스트를 수행·통과한 것으로 기록하지 않는다.

## 공식 참고
- [Tailwind의 Preflight 제외와 접두사](https://tailwindcss.com/docs/preflight): 기존 전역 스타일과의 충돌 방지 설정 근거.
- [Tailwind PostCSS 설치](https://tailwindcss.com/docs/installation/using-postcss): Next 프로젝트의 플러그인 구성 근거.
- [TanStack Query 키](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys): 조회에 영향을 주는 역할·범위·필터를 캐시 키에 포함하는 근거.
- [TanStack Query 기본 동작](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults): 명시적 invalidation과 Infinity staleTime의 조합 근거.
- [TanStack Query와 App Router](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr): 클라이언트 공급자 경계 참고. 이번 mock은 서버 데이터 prefetch를 하지 않는다.

## 작업 시작 전 상태
결정 문서는 생성되어 있으며 기존 사용량 모달 계획의 Task는 모두 완료되어 있다. 새 계획 포인터는 P01-T01로 설정한다. 기존 current 기록은 `../reports/2026-10-29-current-before-admin-mock-ui.md`에 보존한다.
