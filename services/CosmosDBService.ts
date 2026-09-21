import { CosmosClient, type Container, type Database } from "@azure/cosmos";
import type { TokenCredential } from "@azure/core-auth";
import { DefaultAzureCredential } from "@azure/identity";

import {
  AzureIntegrationConfigurationError,
  getCosmosConfig,
  type CosmosConfig,
} from "@/config/azure";

export interface CosmosDBServiceOptions {
  config?: CosmosConfig;
  credential?: TokenCredential;
  client?: CosmosClient;
}

export default class CosmosDBService {
  private readonly config: CosmosConfig;
  private readonly credential?: TokenCredential;
  private client?: CosmosClient;

  constructor(options: CosmosDBServiceOptions = {}) {
    this.config = options.config ?? getCosmosConfig();
    this.credential = options.credential;
    this.client = options.client;
  }

  getCosmosClient(): CosmosClient {
    if (this.client) {
      return this.client;
    }

    this.client =
      this.config.authMode === "key"
        ? new CosmosClient({
            endpoint: this.config.endpoint,
            key: this.config.key,
          })
        : new CosmosClient({
            endpoint: this.config.endpoint,
            aadCredentials: this.credential ?? new DefaultAzureCredential(),
          });

    return this.client;
  }

  getDatabase(): Database {
    return this.getCosmosClient().database(this.config.databaseName);
  }

  getContainer(containerId: string): Container {
    const normalizedContainerId = containerId.trim();

    if (normalizedContainerId.length === 0) {
      throw new AzureIntegrationConfigurationError("Cosmos DB", [
        "containerId",
      ]);
    }

    return this.getDatabase().container(normalizedContainerId);
  }
}
