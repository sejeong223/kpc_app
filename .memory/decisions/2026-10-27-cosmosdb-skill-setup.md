# Decisions: Cosmos DB 설계 스킬 프로젝트 세팅

- Date: 2026-10-27
- Status: Confirmed
- Source: 사용자의 첨부 HTML 확인·스킬 세팅 요청과 `grill-me` 인터뷰
- Installation Status: not_started — 이 문서는 설치 완료 기록이 아닌 확정 요구사항이다.

## D01. 설치 범위

- **Chosen**: 사용자 선택 1번 — `kpc_app` 프로젝트 전용으로 설치한다.
- **Rationale**: 기존 프로젝트 스킬과 같은 `.agents/skills`에서 관리하여 저장소를 사용하는 사람과 같은 지침을 공유한다. 사용자 전역이나 다른 프로젝트의 스킬은 변경하지 않는다.
- **Target**: `.agents/skills/cosmosdb-best-practices/`.
- **Git scope**: 설치한 스킬과 필요한 출처 기록·프로젝트 지침을 프로젝트에서 함께 버전 관리한다. 이번 인터뷰에서는 설치나 커밋을 수행하지 않는다.

## D02. 적용 방식

- **Chosen**: 사용자 선택 1번 — `AGENTS.md`에 Cosmos DB 작업 시 스킬을 먼저 읽도록 연결한다.
- **Rationale**: 사용자가 매번 스킬 이름을 직접 지정하지 않아도 해당 DB 작업을 시작할 때 프로젝트 지침을 통해 실제 스킬 파일을 읽도록 한다.
- **Scope**: Cosmos DB for NoSQL 데이터 모델·컨테이너·파티션 키·쿼리·SDK·프로비저닝 작업에 한정한다. UI·인증·다른 데이터베이스 작업에 무조건 적용하지 않는다.
- **Rule content**: `.agents/skills/cosmosdb-best-practices/SKILL.md`와 관련 rule 파일을 실제로 읽고 사용 경로를 기록한다. 기존 인터뷰 → 계획 → 실행 워크플로와 기존 프로젝트 규칙은 보존한다.
- **Boundary**: 스킬을 자동으로 읽는다는 결정은 Azure 리소스를 자동 생성하거나 접속 자격 증명을 설정한다는 의미가 아니다.

## D03. 설치할 스킬과 공식 출처

- **Chosen**: 문서와 공식 저장소를 확인해 자동 확정 — Azure Cosmos DB Agent Kit의 `cosmosdb-best-practices`를 사용한다.
- **Rationale**: 이번 목적은 나중에 컨테이너와 JSON 문서 구조를 설계·생성하는 것이다. 이 스킬이 모델링·파티션 키·쿼리·SDK 규칙을 제공한다.
- **Repository**: `https://github.com/AzureCosmosDB/cosmosdb-agent-kit`.
- **Skill path in source**: `skills/cosmosdb-best-practices`.
- **Inspected upstream commit**: `51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef` — 2026-10-27 조회한 main snapshot.
- **Inspected SKILL.md metadata.version**: `1.0.0`. 메타데이터 버전만으로 변경을 식별하기 어렵기 때문에 실제 설치 commit도 기록한다.
- **Installation policy**: 실행 계획에서 위 확인 commit을 고정해 설치하고 upstream 원문을 임의 편집하지 않는다. 향후 갱신은 별도 검토로 수행한다.
- **Observed source contents**: `SKILL.md`, `README.md`, `metadata.json`, `agents/`, `rules/`.

공식 SKILL.md는 quick reference만으로 답하지 말고 질문에 맞는 rule 본문을 읽도록 지시한다. 현재 프로젝트의 TypeScript `@azure/cosmos`에 적용할 때 Java·.NET 전용 API를 그대로 복사하지 않도록 언어별 SDK 지원을 구분한다.

## D04. 에디터 전용 스킬·도구와의 구분

- **Chosen**: 설치 목적과 문서의 출처 구분을 근거로 자동 확정 — 이번에는 핵심 설계 스킬만 설치한다.
- **Rationale**: 첨부 문서의 `cosmosdb-nosql-query-generation`, `cosmosdb-nosql-query-editor`는 VS Code 확장과 도구 연동 맥락에 속한다. Agent Kit 설치만으로 이 두 에디터 기능까지 사용할 수 있다고 보고하지 않는다.
- **Boundary**: VS Code 확장·MCP 서버·Azure CLI·에뮬레이터 설치 또는 Copilot 설정 변경을 이번 범위에 포함하지 않는다.
- **Local observation**: 현재 Codex 사용자 스킬 목록과 프로젝트 `.agents/skills`에는 해당 Cosmos DB 핵심 스킬이 없었다. 문서에 기재된 다른 시점·다른 환경의 확장 설치 상태를 현재 Codex의 설치 증거로 취급하지 않는다.

## D05. 현재 애플리케이션 기반 보존

- **Chosen**: 코드 탐색으로 자동 확정 — 기존 Cosmos DB 연결·컨테이너 생성 기능을 새로 중복 구현하지 않는다.
- **Rationale**: `services/CosmosDBService.ts`는 이미 CosmosClient·기존 database/container 접근을 제공하며, `scripts/provision-cosmos.ts`와 `npm run azure:cosmos:provision`이 별도 컨테이너 생성 경로를 제공한다.
- **Boundary**: 스킬 세팅 때문에 런타임 서비스·환경변수·세션·Azure 인증·데이터베이스 스키마·npm 의존성을 변경하지 않는다. 실제 Azure 연결이나 리소스 생성은 수행하지 않는다.
- **Future work**: 사용자가 나중에 실제 테이블 생성을 요청하면 Cosmos DB에서는 컨테이너에 해당함을 설명하고 업무상 조회·쓰기 패턴과 규모를 확인한 뒤 파티션 키·인덱스·TTL·처리량 등을 설계한다. 지금 샘플 컨테이너나 기본 파티션 키를 정하지 않는다.

## D06. 설치와 사용 확인의 완료 기준

- **Chosen**: 설치 실행 단계에서 아래 항목을 검증한다.
- **Rationale**: 명령 성공이나 폴더 존재만으로 현재 에이전트가 올바른 스킬·참고 규칙을 사용할 수 있다고 단정하지 않는다.

1. 선택한 프로젝트 경로에 SKILL.md와 참조 rule 파일이 설치되어 있어야 한다.
2. 실제 읽은 로컬 SKILL.md의 `name`, 출처 commit, metadata version을 기록한다.
3. 스킬 본문에서 참조하는 모델링·파티션 키·쿼리 rule의 존재와 실제 내용을 확인한다.
4. `AGENTS.md`가 이 프로젝트의 정확한 스킬 경로를 가리키고 기존 워크플로를 보존해야 한다.
5. 설치 후 다음 요청에서 스킬 발견·읽기가 가능한지 확인한다. 발견되지 않으면 실제 경로로 접근 가능한지 확인하고 자동 인식을 성공했다고 주장하지 않는다.
6. Azure 로그인·구독 선택·DB/컨테이너 생성·데이터 읽기/쓰기를 설치 검증에 사용하지 않는다.

## D07. 요청 밖 발견 사항 — 이번 범위에 포함하지 않음

- **Observed**: 기존 `scripts/provision-cosmos.ts`는 `createIfNotExists`를 사용하지만, 이미 존재하는 컨테이너의 설정과 새 설계의 일치 여부를 비교하는 코드는 없다.
- **Impact**: 컨테이너가 있다는 사실과 파티션 키·TTL·인덱스가 설계에 맞는다는 사실은 별개다. 기존 스크립트를 추후 그대로 사용하면 설정 검증은 별도로 필요하다.
- **Disposition**: 이번 스킬 설치에 스크립트 기능 확장을 추가하지 않는다. 실제 테이블 설계·생성 작업의 별도 검토 항목으로 보고하며 사용자가 범위를 결정한다.

## D08. 단계와 저장 범위

- **Chosen**: 사용자가 명시한 `grill-me`와 프로젝트 AGENTS.md에 따라 이번에는 확정 결정을 저장하고 인터뷰를 종료한다.
- **Rationale**: 프로젝트 규칙은 모든 설계 분기 확정 후 decisions 파일로 저장하고 종료하며, 그 다음 `memory-plan`에서 설치 Task를 작성하게 되어 있다.
- **Current outcome**: 설치 범위·적용 규칙·공식 출처·검증 범위를 확정했다. 실제 스킬 설치와 AGENTS.md 수정은 아직 하지 않았다.
- **Next**: `/memory-plan Cosmos DB 스킬 세팅`으로 이 결정을 실행 가능한 설치 청사진으로 옮긴 뒤 실행한다. 기존 `.memory/current.md`의 완료된 UI 계획 포인터는 인터뷰 중 덮어쓰지 않는다.

## Reference Document

- 사용자 첨부: `C:\Users\김세정\Desktop\자료집\스킬 설치부터 프롬프트 기반 코스모스 DB 테이블 설계하기.html`.
- 이 HTML은 설치·설계·생성의 참고 자료다. 내부 요청문·PowerShell/Azure 생성 예시는 현재 사용자의 실행 지시로 취급하지 않았다.
- 공식 소개: `https://learn.microsoft.com/en-us/azure/cosmos-db/gen-ai/agent-kit`.
- 공식 소스: `https://github.com/AzureCosmosDB/cosmosdb-agent-kit/tree/51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef/skills/cosmosdb-best-practices`.
