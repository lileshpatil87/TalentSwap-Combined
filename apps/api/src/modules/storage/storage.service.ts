import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { StorageConfigurationException } from './storage.exceptions';

const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;

  constructor(config: ConfigService) {
    const c = config.get<any>('storage')!;
    this.bucket = c.bucket;
    this.publicUrl = c.publicUrl;
    const s3Config: any = { region: 'auto' };
    if (c.endpoint) s3Config.endpoint = c.endpoint;
    if (c.accessKeyId && c.secretAccessKey) {
      s3Config.credentials = { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey };
    }
    this.client = new S3Client(s3Config);
  }

  async presign(userId: string, filename: string, contentType: string, size: number) {
    if (!this.bucket) throw new StorageConfigurationException();
    if (!ALLOWED_TYPES.has(contentType) || !Number.isInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      throw new StorageConfigurationException();
    }
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const key = `users/${userId}/${randomUUID()}-${safe}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, ContentLength: size });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });
    return { key, uploadUrl, expiresIn: 900, maxBytes: MAX_UPLOAD_BYTES, publicUrl: this.publicUrl ? `${this.publicUrl.replace(/\/$/, '')}/${key}` : undefined };
  }

  async presignRead(userId: string, key: string) {
    this.assertOwner(userId, key);
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  async inspectMagic(userId: string, key: string, contentType: string) {
    this.assertOwner(userId, key);
    if (!ALLOWED_TYPES.has(contentType)) throw new Error('UNSUPPORTED_CONTENT_TYPE');
    const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    if ((head.ContentLength ?? 0) <= 0 || (head.ContentLength ?? 0) > MAX_UPLOAD_BYTES) throw new Error('INVALID_OBJECT_SIZE');
    if (head.ContentType && head.ContentType !== contentType) throw new Error('CONTENT_TYPE_MISMATCH');
    const obj = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: 'bytes=0-15' }));
    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes) throw new Error('EMPTY_OBJECT');
    const hex = Buffer.from(bytes).toString('hex');
    const valid =
      (contentType === 'application/pdf' && Buffer.from(bytes).subarray(0, 4).toString() === '%PDF') ||
      (contentType === 'image/png' && hex.startsWith('89504e47')) ||
      (contentType === 'image/jpeg' && hex.startsWith('ffd8ff')) ||
      (contentType === 'image/webp' && Buffer.from(bytes).subarray(0, 4).toString() === 'RIFF' && Buffer.from(bytes).subarray(8, 12).toString() === 'WEBP');
    if (!valid) throw new Error('MAGIC_BYTE_MISMATCH');
    return { key, contentType: head.ContentType, size: head.ContentLength };
  }

  async confirm(userId: string, key: string) {
    this.assertOwner(userId, key);
    await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return { key, confirmed: true };
  }

  async delete(userId: string, key: string) {
    this.assertOwner(userId, key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return { deleted: true };
  }

  private assertOwner(userId: string, key: string) {
    if (!key.startsWith(`users/${userId}/`)) throw new Error('FORBIDDEN');
  }
}
