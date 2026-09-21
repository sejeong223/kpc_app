import 'server-only';
import {
  BlobGenerateSasUrlOptions,
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

export default class BlobStorageService {
  async getCredential() {
    const sharedKeyCredential = new StorageSharedKeyCredential(
      process.env.BLOB_NAME ?? '',
      process.env.BLOB_KEY ?? '',
    );

    return sharedKeyCredential;
  }

  async getBlobServiceClient() {
    const credential = await this.getCredential();

    const blobServiceClient = new BlobServiceClient(
      `https://${process.env.BLOB_NAME}.blob.core.windows.net`,
      credential,
    );

    return blobServiceClient;
  }

  async getContainerClient(containerName: string) {
    const blobServiceClient = await this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    return containerClient;
  }

  async getBlobClient(containerName: string, blobName: string) {
    const blobClient = await this.getContainerClient(containerName);
    return blobClient.getBlobClient(blobName);
  }

  async generateSasUrl(
    containerName: string,
    blobPath: string,
    options: BlobGenerateSasUrlOptions,
  ): Promise<string> {
    const blobClient = await this.getBlobClient(containerName, blobPath);
    const sasUrl = await blobClient.generateSasUrl(options);

    return sasUrl;
  }
}
