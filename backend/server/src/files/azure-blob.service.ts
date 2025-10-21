import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import { createReadStream } from 'fs';

@Injectable()
export class AzureBlobService {
  private client = process.env.AZURE_STORAGE_CONNECTION_STRING
    ? BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
    : null;

  async uploadLocalFile(localPath: string, filename: string): Promise<string> {
    // Em dev ou sem credencial → devolve o caminho local para servir via /uploads
    if (!this.client) return `/uploads/${filename}`;
    const container = this.client.getContainerClient(process.env.AZURE_BLOB_CONTAINER || 'uploads');
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(filename);
    await blob.uploadStream(createReadStream(localPath));
    return blob.url; // URL pública do Azure Blob
  }
}
