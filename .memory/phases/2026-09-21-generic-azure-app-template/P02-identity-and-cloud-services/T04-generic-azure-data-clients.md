# Task: T04 Generic Azure Data Clients

## Status: done

## Goal
번역 컨테이너와 shared key에 고정된 Cosmos DB·Blob Storage 서비스를 Managed Identity 우선의 범용 클라이언트로 교체하고, 리소스 생성은 명시적으로 실행하는 Cosmos provisioning CLI에만 허용한다.

## Decision Summary
- 운영 기본 credential은 `DefaultAzureCredential`, 로컬 대체는 Cosmos account key와 Blob shared key다.
- runtime 서비스의 `getContainer`는 handle만 반환하며 `createIfNotExists`를 호출하지 않는다.
- sample CRUD/upload API와 도메인 데이터 모델은 만들지 않는다.

## Implementation

### I01. 기능별 Azure 설정 파서

- Related Files:
  - `config/azure.ts` :: `getCosmosConfig`, `getBlobConfig`, config unions — optional integration의 지연 검증 경계; new
  - `tests/config/azure.test.ts` :: managed identity/key configuration matrix — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  export type CosmosConfig = {
    endpoint: string;
    databaseName: string;
  } & (
    | { authMode: 'managed-identity' }
    | { authMode: 'key'; key: string }
  );

  export type BlobConfig = {
    accountName: string;
    serviceUrl: string;
  } & (
    | { authMode: 'managed-identity' }
    | { authMode: 'shared-key'; accountKey: string }
  );

  export function getCosmosConfig(env?: ServerEnv): CosmosConfig;
  export function getBlobConfig(env?: ServerEnv): BlobConfig;
  ```
- **Conditional Validation**:
  - Cosmos factory 호출 시 `COSMOS_DB_ENDPOINT`와 `COSMOS_DB_NAME`은 항상 필수다.
  - `AZURE_USE_MANAGED_IDENTITY=false`이면 Cosmos에 `COSMOS_DB_KEY`, Blob에 `BLOB_ACCOUNT_KEY`가 필수다.
  - Blob factory 호출 시 `BLOB_ACCOUNT_NAME`이 필수이고 service URL은 `https://{accountName}.blob.core.windows.net`로 생성한다.
  - `AZURE_USE_MANAGED_IDENTITY=true`이면 account key를 client constructor에 전달하지 않는다. env에 키가 남아 있어도 Managed Identity가 우선한다.
  - 앱 시작 자체는 Cosmos/Blob 값을 요구하지 않으며 각 factory 최초 호출 시에만 해당 integration을 검증한다.
- **Error Handling**:
  - `AzureIntegrationConfigurationError`에 service 이름과 누락 key 이름만 포함하고 endpoint/key 값은 포함하지 않는다.

### I02. Cosmos DB runtime client와 provisioning 분리

- Related Files:
  - `services/CosmosDBService.ts` :: `CosmosDBService` — generic client/database/container handle factory; modify
  - `scripts/provision-cosmos.ts` :: `parseProvisionArgs`, `provisionCosmosContainer`, `main` — 유일한 `createIfNotExists` 경로; new
  - `tests/services/CosmosDBService.test.ts` :: auth mode and no-create behavior — 단위 테스트; new
  - `tests/scripts/provision-cosmos.test.ts` :: argument parsing and explicit create call — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  import type { Container, CosmosClient, Database } from '@azure/cosmos';
  import type { TokenCredential } from '@azure/core-auth';

  export interface CosmosDBServiceOptions {
    config?: CosmosConfig;
    credential?: TokenCredential;
    client?: CosmosClient;
  }

  export default class CosmosDBService {
    constructor(options?: CosmosDBServiceOptions);
    getCosmosClient(): CosmosClient;
    getDatabase(): Database;
    getContainer(containerId: string): Container;
  }

  export interface ProvisionCosmosArgs {
    containerId: string;
    partitionKeyPath: `/${string}`;
    throughput?: number;
  }

  export function parseProvisionArgs(argv: readonly string[]):
    | { kind: 'help' }
    | { kind: 'run'; value: ProvisionCosmosArgs };

  export async function provisionCosmosContainer(
    args: ProvisionCosmosArgs,
    service?: CosmosDBService,
  ): Promise<{ containerId: string; created: boolean }>;
  ```
- **Execution Flow / Logic**:
  1. key mode는 `new CosmosClient({ endpoint, key })`.
  2. managed identity mode는 `new CosmosClient({ endpoint, aadCredentials: credential ?? new DefaultAzureCredential() })`.
  3. `getDatabase`는 `client.database(config.databaseName)`, `getContainer`는 `.container(containerId)`만 호출한다.
  4. 기존 `CONTAINER_ID` union, `glossary_languages`, `glossarys`, `translations`, `files`, `permissions`, `refdata`와 고정 `/partition_key`를 삭제한다.
  5. 기존 `deleteAll`은 일부 batch 실패를 삼키고 success를 반환하므로 범용 client-only 범위에서 제거한다.
  6. provisioning CLI만 `database.containers.createIfNotExists({ id, partitionKey, throughput })`를 호출한다.
  7. CLI flags는 `--container <id>`, `--partition-key </path>`, 선택적 `--throughput <positive-integer>`, `--help`다.
  8. CLI import 시 자동 실행하지 않도록 `main` 경계를 두고, 직접 실행일 때만 `process.exitCode`를 설정한다.
- **Validation Rules**:
  - container id는 trim 후 빈 값 금지.
  - partition key는 정확히 `/`로 시작하고 공백 금지.
  - throughput은 제공 시 양의 정수.
  - config/argument error에서는 Azure SDK를 생성하거나 호출하지 않는다.
- **Return Semantics**:
  - SDK response의 status code를 근거로 created 여부를 계산하되 credentials나 endpoint는 출력하지 않는다.

### I03. Blob Storage runtime client 일반화

- Related Files:
  - `services/BlobStorageService.ts` :: `BlobStorageService` — Managed Identity/shared key client factory; modify
  - `tests/services/BlobStorageService.test.ts` :: auth mode and child client calls — 단위 테스트; new

#### Details
- **Signatures & Types**:
  ```typescript
  import type {
    BlobClient,
    BlobServiceClient,
    ContainerClient,
  } from '@azure/storage-blob';
  import type { TokenCredential } from '@azure/core-auth';

  export interface BlobStorageServiceOptions {
    config?: BlobConfig;
    credential?: TokenCredential;
    client?: BlobServiceClient;
  }

  export default class BlobStorageService {
    constructor(options?: BlobStorageServiceOptions);
    getBlobServiceClient(): BlobServiceClient;
    getContainerClient(containerName: string): ContainerClient;
    getBlobClient(containerName: string, blobName: string): BlobClient;
  }
  ```
- **Execution Flow / Logic**:
  1. shared-key mode는 `new StorageSharedKeyCredential(accountName, accountKey)`를 만든다.
  2. managed identity mode는 injected credential 또는 `new DefaultAzureCredential()`을 사용한다.
  3. 양쪽 모두 검증된 `serviceUrl`로 `BlobServiceClient`를 생성한다.
  4. container/blob name은 빈 문자열을 거부하고 trim된 값을 사용한다.
  5. 기존 `generateSasUrl`은 shared key와 user delegation credential에서 의미와 권한 요구가 다르므로 template core에서 제거한다. 파생 프로젝트가 명시적 SAS 전략을 선택하게 한다.
  6. client constructor 이후에는 실제 upload/list/network 호출을 하지 않는다.
- **Testing Boundary**:
  - SDK constructor와 child client 반환값을 mock해 외부 storage account가 없어도 검증한다.
  - managed identity mode가 shared key constructor를 호출하지 않는지 확인한다.

### I04. 미사용 Power Automate 연동 제거

- Related Files:
  - `services/MSFlowService.ts` :: `MSFlowService` — 사용처 없는 특수 integration 제거; delete

#### Details
- 전체 활성 소스에서 `MSFlowService`, `service.flow.microsoft.com` 참조가 0이어야 한다.
- Power Automate 관련 패키지는 별도 direct dependency가 없으므로 Microsoft Graph client는 Graph 기능을 위해 유지한다.

## Acceptance Criteria
- [x] Cosmos/Blob config는 factory 호출 전까지 앱 시작을 막지 않는다.
- [x] Managed Identity 모드에서 account key가 SDK constructor에 전달되지 않는다.
- [x] key mode에서 누락 key를 secret value 없이 명확히 거부한다.
- [x] runtime Cosmos service에서 `createIfNotExists`와 고정 container union이 제거된다.
- [x] `createIfNotExists`는 `scripts/provision-cosmos.ts`에만 존재한다.
- [x] Blob service는 client handle만 제공하고 SAS·upload 예제 API를 만들지 않는다.
- [x] MS Flow 연동이 완전히 제거된다.

## Validation
- `npm.cmd run test -- tests/config/azure.test.ts tests/services/CosmosDBService.test.ts tests/services/BlobStorageService.test.ts tests/scripts/provision-cosmos.test.ts` — 외부 연결 없이 테스트 통과
- `npm.cmd run azure:cosmos:provision -- --help` — 사용법 출력, Azure 연결 없이 exit code 0
- `npm.cmd run typecheck` — exit code 0
- `npm.cmd run lint -- config/azure.ts services scripts tests/config/azure.test.ts tests/services tests/scripts` — error/warning 0
- `rg -n "createIfNotExists" services scripts` — `scripts/provision-cosmos.ts`에서만 발견
- `rg -n -i "glossary|translation|daruda|MSFlow|service\.flow\.microsoft\.com" services config/azure.ts scripts` — 결과 없음

## Commit Message
```text
feat(azure): add generic data service clients

Plan: 2026-09-21-generic-azure-app-template
Phase: P02-identity-and-cloud-services
Task: T04-generic-azure-data-clients

- prefer managed identity with local key fallback
- separate Cosmos runtime access from explicit provisioning
- remove translation containers, bulk deletion, SAS, and Power Automate code
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
