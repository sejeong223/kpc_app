import { describe, expect, it } from "vitest";

import {
  AzureIntegrationConfigurationError,
  getBlobConfig,
  getCosmosConfig,
} from "@/config/azure";
import type { ServerEnv } from "@/config/env.schema";

function createEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    nodeEnv: "development",
    appEnv: "local",
    authEnabled: false,
    embeddedMode: false,
    authCacheNamespace: "kpc_app",
    redisClusterMode: false,
    azureUseManagedIdentity: false,
    iframeAllowedDomains: [],
    ...overrides,
  };
}

describe("Azure integration configuration", () => {
  it("builds a managed identity Cosmos configuration without exposing a key", () => {
    expect(
      getCosmosConfig(
        createEnv({
          azureUseManagedIdentity: true,
          cosmosDbEndpoint: "https://cosmos.example.com",
          cosmosDbName: "application",
          cosmosDbKey: "ignored-key",
        }),
      ),
    ).toEqual({
      endpoint: "https://cosmos.example.com",
      databaseName: "application",
      authMode: "managed-identity",
    });
  });

  it("builds a Cosmos key configuration for local development", () => {
    expect(
      getCosmosConfig(
        createEnv({
          cosmosDbEndpoint: "https://cosmos.example.com",
          cosmosDbName: "application",
          cosmosDbKey: "local-key",
        }),
      ),
    ).toEqual({
      endpoint: "https://cosmos.example.com",
      databaseName: "application",
      authMode: "key",
      key: "local-key",
    });
  });

  it("builds managed identity and shared-key Blob configurations", () => {
    expect(
      getBlobConfig(
        createEnv({
          azureUseManagedIdentity: true,
          blobAccountName: "managedaccount",
          blobAccountKey: "ignored-key",
        }),
      ),
    ).toEqual({
      accountName: "managedaccount",
      serviceUrl: "https://managedaccount.blob.core.windows.net",
      authMode: "managed-identity",
    });

    expect(
      getBlobConfig(
        createEnv({
          blobAccountName: "localaccount",
          blobAccountKey: "local-key",
        }),
      ),
    ).toEqual({
      accountName: "localaccount",
      serviceUrl: "https://localaccount.blob.core.windows.net",
      authMode: "shared-key",
      accountKey: "local-key",
    });
  });

  it("reports missing Cosmos fields without leaking configured values", () => {
    const endpoint = "https://must-not-appear.example.com";

    expect(() =>
      getCosmosConfig(createEnv({ cosmosDbEndpoint: endpoint })),
    ).toThrowError(AzureIntegrationConfigurationError);

    try {
      getCosmosConfig(createEnv({ cosmosDbEndpoint: endpoint }));
    } catch (error) {
      expect(error).toBeInstanceOf(AzureIntegrationConfigurationError);
      expect((error as Error).message).toContain("Cosmos DB");
      expect((error as Error).message).toContain("COSMOS_DB_NAME");
      expect((error as Error).message).toContain("COSMOS_DB_KEY");
      expect((error as Error).message).not.toContain(endpoint);
    }
  });

  it("requires the Blob key only outside managed identity mode", () => {
    expect(() =>
      getBlobConfig(createEnv({ blobAccountName: "localaccount" })),
    ).toThrowError(/BLOB_ACCOUNT_KEY/);

    expect(() =>
      getBlobConfig(
        createEnv({
          azureUseManagedIdentity: true,
          blobAccountName: "managedaccount",
        }),
      ),
    ).not.toThrow();
  });
});
