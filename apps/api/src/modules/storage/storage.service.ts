import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export interface PresignedUrlResult {
  presignedUrl: string;
  key: string;
  url: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('aws.region', 'us-east-1');
    this.bucketName = this.configService.get<string>(
      'aws.bucketName',
      'my-unique-app-uploads-2026',
    );

    const accessKeyId = this.configService.get<string>('aws.accessKeyId', '');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
      '',
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async createPresignedUploadUrl(params: {
    folder: string;
    fileName: string;
    mimeType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedUrlResult> {
    const { folder, fileName, mimeType, expiresInSeconds = 300 } = params;

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const key = `${folder}/${Date.now()}-${randomSuffix}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      presignedUrl,
      key,
      url,
      expiresIn: expiresInSeconds,
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to delete S3 file ${key}: ${error.message}`);
      return false;
    }
  }
}
