import type { TokenCredential } from "@azure/core-auth";
import type { BlobServiceClient } from "@azure/storage-blob";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BlobConfig } from "@/config/azure";

const mocks = vi.hoisted(() => ({
  serviceConstructor: vi.fn(),
  sharedKeyConstructor: vi.fn(),
  defaultCredentialConstructor: vi.fn(),
  getContainerClient: vi.fn(),
  getBlobClient: vi.fn(),
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class MockBlobServiceClient {
    constructor(url: string, credential: unknown) {
      mocks.serviceConstructor(url, credential);
    }

    getContainerClient(containerName: string) {
      return mocks.getContainerClient(containerName);
    }
  },
  StorageSharedKeyCredential: class MockStorageSharedKeyCredential {
    constructor(accountName: string, accountKey: string) {
      mocks.sharedKeyConstructor(accountName, accountKey);
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

import BlobStorageService from "@/services/BlobStorageService";

const sharedKeyConfig: BlobConfig = {
  accountName: "localaccount",
  serviceUrl: "https://localaccount.blob.core.windows.net",
  authMode: "shared-key",
  accountKey: "local-key",
};

const managedIdentityConfig: BlobConfig = {
  accountName: "managedaccount",
  serviceUrl: "https://managedaccount.blob.core.windows.net",
  authMode: "managed-identity",
};

describe("BlobStorageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBlobClient.mockReturnValue({ kind: "blob" });
    mocks.getContainerClient.mockReturnValue({
      kind: "container",
      getBlobClient: mocks.getBlobClient,
    });
  });

  it("creates and reuses a shared-key service client", () => {
    const service = new BlobStorageService({ config: sharedKeyConfig });

    const first = service.getBlobServiceClient();
    const second = service.getBlobServiceClient();

    expect(mocks.sharedKeyConstructor).toHaveBeenCalledWith(
      "localaccount",
      "local-key",
    );
    expect(mocks.serviceConstructor).toHaveBeenCalledOnce();
    expect(mocks.serviceConstructor).toHaveBeenCalledWith(
      "https://localaccount.blob.core.windows.net",
      expect.anything(),
    );
    expect(mocks.defaultCredentialConstructor).not.toHaveBeenCalled();
    expect(second).toBe(first);
  });

  it("uses an injected managed identity credential without shared-key auth", () => {
    const credential = { getToken: vi.fn() } as TokenCredential;

    new BlobStorageService({
      config: managedIdentityConfig,
      credential,
    }).getBlobServiceClient();

    expect(mocks.sharedKeyConstructor).not.toHaveBeenCalled();
    expect(mocks.defaultCredentialConstructor).not.toHaveBeenCalled();
    expect(mocks.serviceConstructor).toHaveBeenCalledWith(
      "https://managedaccount.blob.core.windows.net",
      credential,
    );
  });

  it("uses DefaultAzureCredential when none is injected", () => {
    new BlobStorageService({ config: managedIdentityConfig })
      .getBlobServiceClient();

    expect(mocks.defaultCredentialConstructor).toHaveBeenCalledOnce();
    expect(mocks.serviceConstructor).toHaveBeenCalledWith(
      "https://managedaccount.blob.core.windows.net",
      expect.anything(),
    );
  });

  it("returns trimmed container and blob handles", () => {
    const service = new BlobStorageService({ config: sharedKeyConfig });

    expect(service.getContainerClient("  documents  ")).toEqual({
      kind: "container",
      getBlobClient: mocks.getBlobClient,
    });
    expect(service.getBlobClient(" documents ", " reports/one.pdf ")).toEqual({
      kind: "blob",
    });
    expect(mocks.getContainerClient).toHaveBeenCalledWith("documents");
    expect(mocks.getBlobClient).toHaveBeenCalledWith("reports/one.pdf");
  });

  it("rejects blank child names before creating an SDK client", () => {
    const service = new BlobStorageService({ config: sharedKeyConfig });

    expect(() => service.getContainerClient(" ")).toThrowError(
      /containerName/,
    );
    expect(() => service.getBlobClient("container", " ")).toThrowError(
      /blobName/,
    );
    expect(mocks.serviceConstructor).not.toHaveBeenCalled();
  });

  it("accepts a fully injected service client", () => {
    const client = {
      getContainerClient: mocks.getContainerClient,
    } as unknown as BlobServiceClient;

    expect(
      new BlobStorageService({
        config: sharedKeyConfig,
        client,
      }).getBlobServiceClient(),
    ).toBe(client);
    expect(mocks.serviceConstructor).not.toHaveBeenCalled();
  });
});
