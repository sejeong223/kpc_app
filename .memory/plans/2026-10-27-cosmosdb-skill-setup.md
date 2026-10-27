# Plan: Cosmos DB 설계 스킬 프로젝트 세팅

## Goal

공식 Azure Cosmos DB Agent Kit의 `cosmosdb-best-practices`를 이 프로젝트의 `.agents/skills`에 설치하고, Cosmos DB 작업 시 해당 파일과 관련 규칙을 먼저 읽도록 `AGENTS.md`에 연결한다. 설치 출처와 버전을 재현 가능하게 기록하고 모델링·파티션 키·쿼리 규칙을 실제로 읽을 수 있는지 확인한다.

계획 작성 후 사용자의 `$mea` 요청으로 P01-T01을 실행 완료했다. 프로젝트에 스킬과 지침을 설치했으며 Azure 연결·리소스 생성은 수행하지 않았다. 상세 검증 결과는 T01 실행 기록에 남긴다.

## Source Decisions

- [확정 결정: 프로젝트 전용 설치와 Cosmos DB 작업 시 우선 적용](../decisions/2026-10-27-cosmosdb-skill-setup.md)
- 사용자 첨부 HTML: `C:\Users\김세정\Desktop\자료집\스킬 설치부터 프롬프트 기반 코스모스 DB 테이블 설계하기.html`
- 공식 저장소: [AzureCosmosDB/cosmosdb-agent-kit](https://github.com/AzureCosmosDB/cosmosdb-agent-kit)
- 고정 소스: [확인한 커밋의 스킬 폴더](https://github.com/AzureCosmosDB/cosmosdb-agent-kit/tree/51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef/skills/cosmosdb-best-practices)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 공식 스킬 고정 설치·출처 검증·프로젝트 사용 규칙 연결 | [P01](../phases/2026-10-27-cosmosdb-skill-setup/P01-project-skill/phase.md) |

## Tasks

| Task | Status | Summary | 주요 파일 |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 공식 스킬 설치와 AGENTS 연결·실제 읽기 검증 | `.agents/skills/cosmosdb-best-practices/**`, `.agents/skill-sources.json`, `.gitattributes`, `AGENTS.md`, `README.md` |

## Installation Contract

| 항목 | 고정 값 |
| :--- | :--- |
| 저장소 | `AzureCosmosDB/cosmosdb-agent-kit` |
| commit | `51ed7e9b6dc01039902b8f9d33d4f077d2ead1ef` |
| 저장소 내부 경로 | `skills/cosmosdb-best-practices` |
| 프로젝트 설치 경로 | `.agents/skills/cosmosdb-best-practices` |
| 설치 방식 | 로컬 `skill-installer` helper, `--ref`와 `--dest .agents/skills` 명시 |
| SKILL.md metadata.version | `1.0.0` |
| metadata.json version | `1.3.0` |
| 원본 폴더 파일 수 | 146개 |
| rules/*.md 수 | 142개 — 보조 템플릿 포함 |
| SKILL.md의 rules 링크 수 | 140개, 확인 시 누락 없음 |
| 라이선스 | 원본 저장소 루트의 MIT `LICENSE`를 같은 commit에서 추가 보존 |

두 버전 표기와 README의 규칙 수 설명을 임의로 고치지 않는다. 커밋을 기준으로 원문을 고정하고 실제 파일 수·해시·각 버전 값을 출처 기록에 남긴다. Vercel skills CLI를 실행한 것처럼 표준 lock 파일을 꾸미지 않고 `.agents/skill-sources.json`을 프로젝트 자체 출처 기록으로 사용한다.

## Application Contract

- Cosmos DB for NoSQL의 모델·컨테이너·파티션 키·쿼리·SDK·프로비저닝 작업에서 로컬 SKILL.md와 관련 rule 본문을 우선 읽는다.
- 사용한 파일 경로와 고정 소스 commit을 기록한다. UI 작업이나 다른 DB에 무조건 적용하지 않는다.
- 기존 인터뷰 → 계획 → 실행 규칙과 기존 CosmosDBService·생성 스크립트를 유지한다.
- 스킬의 Java·.NET 예제를 TypeScript SDK 코드로 그대로 복사하지 않는다. 프로젝트가 사용하는 SDK에서 지원하는 방법인지 확인한다.
- 스킬 자동 적용은 지침을 읽는 방식이다. 사용자 요청 없는 Azure 리소스 생성·데이터 변경으로 이어지지 않는다.

## Boundaries

포함:

- 고정 commit의 공식 스킬 폴더 전체 및 MIT LICENSE 보존
- 설치 위치·출처·두 버전·해시·파일 수 기록
- 설치 폴더에 한정한 Git LF 줄바꿈 규칙 — Windows checkout 이후에도 원문 해시 보존
- AGENTS.md의 Cosmos DB 관련 적용 규칙과 README의 사용법
- 원본 파일 무결성, 140개 rule 링크, 실제 로컬 파일 읽기 검증

제외:

- 사용자 전역 설치, 다른 프로젝트·에이전트 설정 변경
- VS Code 확장, 편집기 전용 query-generation/query-editor 스킬, MCP·Azure CLI·에뮬레이터 설치
- Azure 로그인·자격 증명·접속 설정, DB/컨테이너/문서 생성·수정·조회
- 업무별 스키마·파티션 키·인덱스·TTL·처리량 설계
- CosmosDBService 및 기존 프로비저닝 스크립트 확장, npm 의존성·UI 변경
- upstream 스킬의 코드 예시·버전 표기·README 문구 수정

## Completion Criteria

- [x] 프로젝트 경로에 원본 146개 파일과 추가 LICENSE가 존재하며 원본과 일치한다.
- [x] SKILL.md 이름·두 버전·고정 commit·해시·파일 수가 출처 기록과 맞는다.
- [x] Git 줄바꿈 정책이 설치 폴더에만 LF로 지정되어 있으며 사용자 전역 설정은 유지된다.
- [x] SKILL.md의 140개 rules 링크가 설치 폴더 안의 실제 파일을 가리킨다.
- [x] 모델링·파티션 키·쿼리의 지정 rule 3개를 실제로 읽고 요지를 실행 기록에 남긴다.
- [x] AGENTS.md에 정확한 프로젝트 스킬 경로를 추가하고 기존 워크플로를 보존한다.
- [x] README가 설치 범위·사용법·다음 요청에서의 인식 확인 방법을 설명한다.
- [x] 애플리케이션·패키지·Azure 리소스·사용자 전역 스킬에 변경이 없다.
- [x] 즉시 확인한 로컬 읽기와 다음 대화에서 확인해야 할 자동 발견을 구별해 보고한다.
- [x] T01 검증 후 한국어 커밋 하나를 남기고 current를 완료로 전진시킨다.

## Planning Rationale

설치만 완료하고 AGENTS 연결을 다음 Task로 미루면 사용자가 기대한 프로젝트 적용 상태가 되지 않는다. 설치·출처·규칙 연결·읽기 검증을 단일 Task로 묶어 하나의 완결된 세팅으로 검증하고 커밋한다. 텍스트 지침 설치이므로 앱 테스트·빌드를 대신 설치 검증으로 쓰지 않는다.

계획 당시 `core.autocrlf=true`이고 `.gitattributes`가 없었다. 설치 파일을 Git으로 공유한 뒤 Windows에서 checkout하면 줄바꿈이 달라져 원문 해시가 불일치할 수 있으므로, 설치 폴더에만 `text eol=lf`를 적용했다. 앱 전체나 사용자 Git 설정의 줄바꿈 정책은 바꾸지 않았다.

실행 시 원본 문서에 줄 끝 공백 393곳이 확인됐다. 원문을 변경하지 않도록 동일 설치 폴더에만 `whitespace=-blank-at-eol`을 추가했다. 다른 파일의 공백 검사와 원본 전체 해시 검증은 유지한다.

## Deferred Finding

이미 확인한 기존 `scripts/provision-cosmos.ts`의 컨테이너 설정 비교 부재는 결정 D07에 따라 제외한다. 실제 컨테이너 생성 작업에서 별도로 검토하며 이번 계획에 Task를 추가하지 않는다.
