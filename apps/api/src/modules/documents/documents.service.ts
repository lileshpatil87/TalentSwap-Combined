import { Injectable } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';
import { QueueService } from '@app/cache/queue.service';
import { StorageService } from '../storage/storage.service';
import { ProfilesService } from '../profiles/profiles.service';
import { DocumentAccessException, DocumentNotFoundException, InvalidDocumentException } from './documents.exceptions';

const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly repo: DocumentsRepository,
    private readonly queue: QueueService,
    private readonly profiles: ProfilesService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, input: any) {
    if (!ALLOWED_TYPES.has(input.fileType)) throw new InvalidDocumentException();
    if (!input.fileKey.startsWith(`users/${userId}/`)) throw new DocumentAccessException();
    try {
      await this.storage.inspectMagic(userId, input.fileKey, input.fileType);
    } catch {
      throw new InvalidDocumentException();
    }

    const d = await this.repo.create({
      userId,
      fileKey: input.fileKey,
      fileType: input.fileType,
      originalName: input.originalName,
      status: 'SCANNING',
    });
    const downloadUrl = await this.storage.presignRead(userId, d.fileKey);
    await this.queue.addJob('document-scan', 'scan', { documentId: d.id, downloadUrl }, {
      jobId: `document-scan:${d.id}`,
    });
    return d;
  }

  async list(userId: string, admin = false) { return this.repo.list(admin ? undefined : userId); }

  async review(id: string, adminId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const d = await this.repo.findById(id);
    if (!d) throw new DocumentNotFoundException();
    if (d.status !== 'PENDING_REVIEW') throw new InvalidDocumentException();
    const updated = await this.repo.update(id, {
      status,
      reviewedBy: adminId,
      scanResult: reason ? { ...(d.scanResult as any ?? {}), moderatorReason: reason } : d.scanResult,
    });
    if (status === 'APPROVED') await this.profiles.markVerified(d.userId, 'DOCUMENT_VERIFIED');
    return updated;
  }
}
