# Project Memory Workflow Rules

당신은 아래 3가지 단계(명령어)에 따라 순차적으로 작업해야 합니다.

---

## [1단계: 인터뷰] `/grill-me <기능명>`

코딩을 시작하기 전에 애매한 요구사항과 아키텍처 결정을 확정합니다.

1. **한 번에 딱 1개씩 질문하세요.** (질문 폭탄 금지)
2. **질문할 때 추천 답안(Recommended)과 2~3개 선택지를 함께 제시하세요.**
3. 기존 코드베이스를 뒤져서 알 수 있는 내용은 묻지 말고 직접 확인하세요.
4. 모든 설계 분기가 확정되면 `.memory/decisions/YYYY-MM-DD-{기능명}.md` 파일로 저장하고 종료합니다.

---

## [2단계: 계획] `/memory-plan <기능명>`

`decisions/`를 바탕으로 계획을 물리적 파일로 쪼갭니다.
**(이 단계에서는 절대로 코드를 치지 마세요!)**

1. 전체 로드맵을 `.memory/plans/YYYY-MM-DD-{기능명}.md`로 작성합니다.
2. 각 Phase 폴더(`phases/YYYY-MM-DD-{기능명}/P01.../`)를 만들고 `phase.md`를 생성합니다.
3. 각 Task 파일(`T01...md`)에 아래 내용을 포함한 상세 청사진을 작성합니다:
   - 수정할 파일 경로 및 심볼(클래스/함수)
   - 모델 스키마, 필드명, 타입
   - 검증 커맨드 (테스트 명령어)
   - 커밋 메시지 (Plan: YYYY-MM-DD-{기능명} 헤더 포함)
4. `.memory/current.md`를 생성하여 첫 번째 Task(P01-T01)를 가리키게 세팅합니다.

---

## [3단계: 순차 실행] `/memory-execute` 또는 `"current 보고 이어서 해줘"`

`.memory/current.md` 포인터를 기준으로 작업을 1개씩 순차 구현합니다.

1. `.memory/current.md`를 읽고 현재 `Active Task` 청사진 파일을 확인합니다.
2. 청사진에 지정된 파일에 코드를 구현하고 검증 커맨드를 실행합니다.
3. 테스트 통과 시:
   - Task 파일의 `Status`를 `done`으로 변경
   - Git 커밋 (청사진에 적힌 커밋 메시지 사용)
   - 상위 `phase.md`의 진행률 갱신
   - `.memory/current.md`의 `Active Task`를 다음 Task로 전진

## Cosmos DB 스킬 사용 규칙

- Cosmos DB for NoSQL 데이터 모델·컨테이너·파티션 키·쿼리·SDK·프로비저닝 작업 전에 `.agents/skills/cosmosdb-best-practices/SKILL.md`를 먼저 읽는다.
- 요약 목차만으로 판단하지 않고 해당 작업과 관련된 `rules/*.md` 본문을 읽는다. 사용한 실제 파일 경로와 `.agents/skill-sources.json`의 고정 소스 commit을 작업 기록에 남긴다.
- 기존 인터뷰 → 계획 → 실행 workflow를 유지한다. `services/CosmosDBService.ts`와 `scripts/provision-cosmos.ts`를 우선 검토해 기존 연결·생성 경로를 중복 구현하지 않는다.
- 현재 프로젝트는 TypeScript의 `@azure/cosmos`를 사용한다. Java·.NET 전용 API나 설정을 그대로 복사하지 말고 해당 SDK에서 지원하는지 확인한다.
- 업무별 주요 조회·쓰기 패턴과 예상 규모를 확인한 뒤 데이터 모델과 파티션 키 후보를 비교한다. 대표 데이터 측정 없이 비용·성능을 확정하지 않는다.
- 리소스 생성·설정 변경은 사용자가 요청한 범위에서 별도 프로비저닝으로 처리한다. 스킬 읽기나 앱 시작으로 Azure 리소스를 자동 생성하지 않고, 기존 컨테이너 설정 불일치를 자동 삭제·재생성으로 해결하지 않는다.
- 이 규칙을 UI나 비대상 데이터베이스 작업에 무조건 적용하지 않는다. 사용자의 명시적 요청이 프로젝트 관례보다 우선한다.
