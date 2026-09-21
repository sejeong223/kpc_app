import type { TokenCredential } from "@azure/core-auth";
import { DefaultAzureCredential } from "@azure/identity";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  type BlobClient,
  type ContainerClient,
} from "@azure/storage-blob";

import {
  AzureIntegrationConfigurationError,
  getBlobConfig,
  type BlobConfig,
} from "@/config/azure";

export interface BlobStorageServiceOptions {
  config?: BlobConfig;
  credential?: TokenCredential;
  client?: BlobServiceClient;
}

export default class BlobStorageService {
  private readonly config: BlobConfig;
  private readonly credential?: TokenCredential;
  private client?: BlobServiceClient;

  constructor(options: BlobStorageServiceOptions = {}) {
    this.config = options.config ?? getBlobConfig();
    this.credential = options.credential;
    this.client = options.client;
  }

  getBlobServiceClient(): BlobServiceClient {
    if (this.client) {
      return this.client;
    }

    const credential =
      this.config.authMode === "shared-key"
        ? new StorageSharedKeyCredential(
            this.config.accountName,
            this.config.accountKey,
          )
        : (this.credential ?? new DefaultAzureCredential());

    this.client = new BlobServiceClient(this.config.serviceUrl, credential);
    return this.client;
  }

  getContainerClient(containerName: string): ContainerClient {
    const normalizedContainerName = this.requireName(
      containerName,
      "containerName",
    );

    return this.getBlobServiceClient().getContainerClient(
      normalizedContainerName,
    );
  }

  getBlobClient(containerName: string, blobName: string): BlobClient {
    const normalizedContainerName = this.requireName(
      containerName,
      "containerName",
    );
    const normalizedBlobName = this.requireName(blobName, "blobName");

    return this.getBlobServiceClient()
      .getContainerClient(normalizedContainerName)
      .getBlobClient(normalizedBlobName);
  }

  private requireName(value: string, key: string): string {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
      throw new AzureIntegrationConfigurationError("Blob Storage", [key]);
    }

    return normalizedValue;
  }
}
