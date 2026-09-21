# Decisions: 범용 Azure 사내 앱 템플릿

- Date: 2026-09-21
- Status: Confirmed

## D01. 템플릿 범위
- **Chosen**: Entra ID, Microsoft Graph, Redis, Cosmos DB, Blob Storage와 공통 UI를 포함하는 사내 Azure 앱 템플릿
- **Rationale**: Daruda 번역 도메인은 제거하되 여러 사내 앱에서 반복 사용할 인증·인프라 로직은 일반화해 재사용한다.

## D02. 인증 활성화 방식
- **Chosen**: `AUTH_ENABLED` 환경변수로 Entra ID 인증을 선택적으로 활성화
- **Rationale**: 로컬에서는 Azure 설정 없이 템플릿을 실행할 수 있어야 하며, 운영에서 인증을 켠 경우 필수 설정 누락을 즉시 차단해야 한다.

## D03. 기본 애플리케이션 셸
- **Chosen**: 설정 기반 사이드바, 페이지 헤더, 사용자 프로필과 빈 대시보드 예시를 갖춘 범용 관리자 대시보드
- **Rationale**: 번역 UI를 제거한 뒤에도 새 사내 앱이 공통 레이아웃을 바로 확장할 수 있게 한다.

## D04. 기존 관리자 화면
- **Chosen**: 목업 권한 관리와 번역 전용 일반 설정·용어집 화면을 제거하고 공통 역할 검사 및 보호된 관리자 예시 페이지만 유지
- **Rationale**: 현재 관리자 화면은 실제 저장소와 연결되지 않았거나 번역 도메인에 종속되어 있어 템플릿 기능으로 오해될 수 있다.

## D05. 앱 브랜딩과 메뉴
- **Chosen**: `config/app.ts`의 중앙 설정을 기본값으로 사용하고 공개 가능한 배포별 값은 환경변수로 재정의
- **Rationale**: 앱 이름·설명·메뉴 같은 구조적 설정을 한곳에서 관리하면서 배포 환경별 브랜딩 변경도 허용한다.

## D06. Power Automate 연동
- **Chosen**: 사용되지 않는 `MSFlowService` 제거
- **Rationale**: Power Automate 토큰 발급은 범용 핵심 기능이 아니며 현재 참조하는 코드도 없다.

## D07. Entra ID 클라이언트 자격 증명
- **Chosen**: 인증서를 우선 지원하고 로컬 개발용 클라이언트 시크릿도 선택적으로 지원
- **Rationale**: 운영 보안 수준을 유지하면서 새 프로젝트의 로컬 설정 장벽을 낮춘다. 두 방식의 동시 설정이나 전체 누락은 명확한 구성 오류로 처리한다.

## D08. 인증 세션 캐시
- **Chosen**: 개발 환경에서는 메모리 캐시를 허용하고, 인증을 활성화한 운영 환경에서는 Redis를 필수로 사용
- **Rationale**: 로컬 의존성을 줄이되 다중 인스턴스 운영 환경에서는 토큰 캐시의 일관성과 지속성을 보장한다.

## D09. Cosmos DB 리소스 생성
- **Chosen**: 런타임 조회와 프로비저닝을 분리하고 컨테이너명·파티션 키를 호출자가 지정
- **Rationale**: 앱 실행 중 암묵적인 리소스 생성을 막고 번역 전용 컨테이너 타입과 고정 `/partition_key`를 제거한다.

## D10. Azure 데이터 서비스 자격 증명
- **Chosen**: Cosmos DB와 Blob Storage는 운영에서 Managed Identity(`DefaultAzureCredential`)를 우선 사용하고 로컬에서 계정 키 대체를 허용
- **Rationale**: 운영의 장기 비밀키 의존도를 줄이면서 Azure 외부의 로컬 개발도 지원한다.

## D11. 역할 기반 접근 제어
- **Chosen**: Entra ID App Roles의 `roles` 클레임을 사용하며 공통 서버 역할 검사 함수를 제공
- **Rationale**: 별도 권한 DB와 목업 관리 화면 없이도 Microsoft 관리 체계 안에서 `User`와 `Admin` 접근을 일관되게 제어할 수 있다.

## D12. 관리자 접근 실패 처리
- **Chosen**: 미로그인 사용자와 로그인했지만 `Admin` 역할이 없는 사용자를 로그인 페이지로 보내되, 후자는 권한 부족 안내와 다른 계정 로그인 버튼을 표시
- **Rationale**: 일반 사용자의 관리자 접근을 차단하면서 기존 세션 때문에 `/admin`과 로그인 페이지 사이에서 무한 리다이렉트가 발생하지 않게 한다.

## D13. 인증 비활성 환경의 관리자 기능
- **Chosen**: `AUTH_ENABLED=false`이면 관리자 메뉴를 숨기고 관리자 라우트 직접 접근도 404로 차단
- **Rationale**: 인증 설정 실수로 관리자 기능이 공개되는 상황을 예방한다.

## D14. 임베디드 및 팝업 로그인
- **Chosen**: `EMBEDDED_MODE`로 선택적으로 활성화하며 현재 개발 환경에서는 활성화
- **Rationale**: Teams·Microsoft 365 iframe에서는 팝업 로그인과 교차 사이트 쿠키가 필요하지만 일반 웹 앱에는 강제하지 않는다.

## D15. 팝업 메시지 보안
- **Chosen**: 팝업 참조와 동일 출처를 모두 검증하고 명시적인 `targetOrigin`으로만 로그인 완료 메시지를 전달
- **Rationale**: 기존 구현은 `message` 이벤트의 출처와 송신 창을 확인하지 않아 위조된 `LOGIN_SUCCESS` 메시지를 받아들일 수 있다.

## D16. 환경변수 검증
- **Chosen**: Zod 기반 중앙 스키마에서 기능·환경·자격 증명 방식별 조건을 검증
- **Rationale**: 빈 문자열로 외부 서비스 연결을 시도하지 않고 시작 단계에서 조치 가능한 오류를 제공하며, 오류에 비밀값을 노출하지 않는다.

## D17. 비밀 환경파일 관리
- **Chosen**: 실제 `.env.development`는 로컬에만 보존하고 `.env*`를 Git에서 제외하되 `.env.example`은 추적
- **Rationale**: 현재 `.env.development`가 Git 제외 대상이 아니어서 Azure 키와 인증서 같은 비밀값이 커밋될 위험이 있다.

## D18. 테스트 및 검증
- **Chosen**: Vitest 단위 테스트와 `lint`, `typecheck`, `build` 스크립트 제공
- **Rationale**: 환경설정, 역할 검사, 공통 유틸리티와 서비스 구성을 빠르게 검증하면서 외부 Azure 계정에 의존하는 브라우저 테스트는 기본 범위에서 제외한다.

## D19. 공통 UI 컴포넌트
- **Chosen**: `components/ui`의 범용 shadcn/ui 컴포넌트는 유지하고 번역·목업 관리자 컴포넌트 및 도메인 의존성은 제거
- **Rationale**: 새 화면 개발에 필요한 UI 도구 상자는 보존하면서 `react-dropzone` 등 번역 기능에서만 사용한 패키지를 정리한다.

## D20. 기본 디자인
- **Chosen**: 중립적인 회색 기반 shadcn/ui 테마와 교체 가능한 강조색 토큰
- **Rationale**: Daruda의 하늘색 테마, 너구리 이미지와 번역용 애니메이션을 제거하고 파생 프로젝트가 쉽게 브랜딩할 수 있게 한다.

## D21. Cosmos DB와 Blob Storage 제공 범위
- **Chosen**: 공통 클라이언트 팩토리, 환경검증, 오류 처리와 단위 테스트만 제공하고 샘플 CRUD·업로드 API는 만들지 않음
- **Rationale**: 재사용 로직은 유지하면서 템플릿 실행 자체가 실제 Azure 리소스를 요구하지 않게 한다.

## D22. 기존 코드 보존
- **Chosen**: 로컬 Git 저장소를 초기화하고 민감 파일을 제외한 현재 상태를 원본 스냅샷으로 커밋한 뒤 Daruda 전용 코드를 삭제
- **Rationale**: 완성된 템플릿에 레거시 코드를 남기지 않으면서 원본을 로컬 Git 이력에서 복구할 수 있게 한다.

## D23. CodeBurn
- **Chosen**: `.codeburn`, CodeBurn 스킬, 설정 문서와 관련 참조를 모두 제거
- **Rationale**: 별도 데스크톱 앱을 사용하므로 약 39MB의 CLI 번들과 프로젝트 내 CodeBurn 통합은 필요하지 않다.

## D24. 프로젝트 메모리 워크플로
- **Chosen**: `AGENTS.md`, `grill-me`, `memory-plan`, `memory-execute`, `visualize`와 `.memory` 구조는 유지하고 Product API 예제 및 중복 스타터 안내는 제거
- **Rationale**: 실제 프로젝트 워크플로는 유지하되 템플릿과 무관한 샘플 콘텐츠는 배포물에서 제외한다.

## D25. 문서 언어
- **Chosen**: README와 환경변수 안내는 한국어 중심으로 작성하고 코드 식별자는 영어로 유지
- **Rationale**: 현재 팀의 사용성을 우선하면서 코드 관례와 외부 라이브러리 용어는 일관된 영어 이름을 사용한다.

## D26. 버전 변경 범위
- **Chosen**: 현재 Next.js·React·NextAuth 주요 버전은 유지하고 템플릿화에 필요한 직접 의존성만 추가·제거
- **Rationale**: 요청과 무관한 프레임워크 마이그레이션을 섞지 않아 회귀 범위와 계획 복잡도를 제한한다.

