import type { CosmosClient } from "@azure/cosmos";
import type { TokenCredential } from "@azure/core-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CosmosConfig } from "@/config/azure";

const mocks = vi.hoisted(() => ({
  cosmosConstructor: vi.fn(),
  defaultCredentialConstructor: vi.fn(),
  database: vi.fn(),
  container: vi.fn(),
}));

vi.mock("@azure/cosmos", () => ({
  CosmosClient: class MockCosmosClient {
    constructor(options: unknown) {
      mocks.cosmosConstructor(options);
    }

    database(databaseName: string) {
      return mocks.database(databaseName);
    }
  },
}));
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class MockDefaultAzureCredential {
    constructor() {
      mocks.defaultCredentialConstructor();
    }
  },
}));

import CosmosDBService from "@/services/CosmosDBService";

const keyConfig: CosmosConfig = {
  endpoint: "https://cosmos.example.com",
  databaseName: "application",
  authMode: "key",
  key: "local-key",
};

const managedIdentityConfig: CosmosConfig = {
  endpoint: "https://cosmos.example.com",
  databaseName: "application",
  authMode: "managed-identity",
};

describe("CosmosDBService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.container.mockReturnValue({ kind: "container" });
    mocks.database.mockReturnValue({ container: mocks.container });
  });

  it("creates and reuses a key-authenticated client", () => {
    const service = new CosmosDBService({ config: keyConfig });

    const first = service.getCosmosClient();
    const second = service.getCosmosClient();

    expect(mocks.cosmosConstructor).toHaveBeenCalledOnce();
    expect(mocks.cosmosConstructor).toHaveBeenCalledWith({
      endpoint: "https://cosmos.example.com",
      key: "local-key",
    });
    expect(mocks.defaultCredentialConstructor).not.toHaveBeenCalled();
    expect(second).toBe(first);
  });

  it("uses an injected managed identity credential without a key", () => {
    const credential = { getToken: vi.fn() } as TokenCredential;

    new CosmosDBService({
      config: managedIdentityConfig,
      credential,
    }).getCosmosClient();

    expect(mocks.cosmosConstructor).toHaveBeenCalledWith({
      endpoint: "https://cosmos.example.com",
      aadCredentials: credential,
    });
    expect(mocks.defaultCredentialConstructor).not.toHaveBeenCalled();
  });

  it("uses DefaultAzureCredential when none is injected", () => {
    new CosmosDBService({ config: managedIdentityConfig }).getCosmosClient();

    expect(mocks.defaultCredentialConstructor).toHaveBeenCalledOnce();
    expect(mocks.cosmosConstructor).toHaveBeenCalledWith({
      endpoint: "https://cosmos.example.com",
      aadCredentials: expect.anything(),
    });
  });

  it("returns existing database and container handles without creating resources", () => {
    const container = new CosmosDBService({ config: keyConfig }).getContainer(
      "  records  ",
    );

    expect(mocks.database).toHaveBeenCalledWith("application");
    expect(mocks.container).toHaveBeenCalledWith("records");
    expect(container).toEqual({ kind: "container" });
  });

  it("rejects an empty container before creating an SDK client", () => {
    const service = new CosmosDBService({ config: keyConfig });

    expect(() => service.getContainer("   ")).toThrowError(/containerId/);
    expect(mocks.cosmosConstructor).not.toHaveBeenCalled();
  });

  it("accepts a fully injected client", () => {
    const client = { database: mocks.database } as unknown as CosmosClient;

    expect(
      new CosmosDBService({ config: keyConfig, client }).getCosmosClient(),
    ).toBe(client);
    expect(mocks.cosmosConstructor).not.toHaveBeenCalled();
  });
});
