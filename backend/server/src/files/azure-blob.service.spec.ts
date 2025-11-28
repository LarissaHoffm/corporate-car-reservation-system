import { AzureBlobService } from './azure-blob.service';

describe('AzureBlobService', () => {
  let service: AzureBlobService;

  beforeEach(() => {
    service = new AzureBlobService();
  });

  it('retorna path local quando client é nulo', async () => {
    (service as any).client = null;

    // usa um arquivo que existe pra evitar erro de fs
    const url = await service.uploadLocalFile(__filename, 'file.txt');

    expect(url).toBe('/uploads/file.txt');
  });

  it('usa cliente Azure quando configurado', async () => {
    const uploadStream = jest.fn().mockResolvedValue(undefined);
    const blob = { uploadStream, url: 'https://blob.test/uploads/file.txt' };

    const createIfNotExists = jest.fn().mockResolvedValue(undefined);
    const getBlockBlobClient = jest.fn().mockReturnValue(blob);

    const getContainerClient = jest.fn().mockReturnValue({
      createIfNotExists,
      getBlockBlobClient,
    });

    // sobrescreve o client interno por um fake
    (service as any).client = {
      getContainerClient,
    };

    const url = await service.uploadLocalFile(__filename, 'file.txt');

    expect(getContainerClient).toHaveBeenCalledWith(
      process.env.AZURE_BLOB_CONTAINER || 'uploads',
    );
    expect(createIfNotExists).toHaveBeenCalled();
    expect(uploadStream).toHaveBeenCalled();
    expect(url).toBe(blob.url);
  });
});
