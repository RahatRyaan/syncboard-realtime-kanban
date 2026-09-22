import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'aws.region') return 'us-east-1';
      if (key === 'aws.bucketName') return 'my-unique-app-uploads-2026';
      if (key === 'aws.accessKeyId') return 'test-key';
      if (key === 'aws.secretAccessKey') return 'test-secret';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a valid presigned upload URL payload', async () => {
    const result = await service.createPresignedUploadUrl({
      folder: 'cards/123',
      fileName: 'test-file.pdf',
      mimeType: 'application/pdf',
      expiresInSeconds: 300,
    });

    expect(result).toBeDefined();
    expect(result.presignedUrl).toContain('https://');
    expect(result.key).toContain('cards/123/');
    expect(result.key).toContain('test-file.pdf');
    expect(result.url).toContain('https://my-unique-app-uploads-2026.s3.us-east-1.amazonaws.com/');
    expect(result.expiresIn).toBe(300);
  });
});
