import { DocumentsService } from './documents.service';
import { DocumentAccessException, InvalidDocumentException } from './documents.exceptions';

describe('DocumentsService scan reliability', () => {
  const userId = '00000000-0000-4000-8000-000000000001';
  const document = { id: '00000000-0000-4000-8000-000000000010', fileKey: `users/${userId}/file.pdf`, status: 'SCANNING' };
  let repo: { create: jest.Mock; update: jest.Mock; findById: jest.Mock; list: jest.Mock };
  let queue: { addJob: jest.Mock };
  let storage: { inspectMagic: jest.Mock };
  let profiles: { markVerified: jest.Mock };
  let service: DocumentsService;

  beforeEach(() => {
    repo = { create: jest.fn().mockResolvedValue(document), update: jest.fn().mockResolvedValue({ ...document, status: 'SCAN_FAILED' }), findById: jest.fn(), list: jest.fn() };
    queue = { addJob: jest.fn().mockResolvedValue(undefined) };
    storage = { inspectMagic: jest.fn().mockResolvedValue({ size: 100 }) };
    profiles = { markVerified: jest.fn() };
    service = new DocumentsService(repo as any, queue as any, profiles as any, storage as any);
  });

  it('queues scanning by private object key, not a time-limited signed URL', async () => {
    await service.create(userId, { fileKey: document.fileKey, fileType: 'application/pdf', originalName: 'file.pdf' });
    expect(queue.addJob).toHaveBeenCalledWith('document-scan', 'scan', { documentId: document.id, fileKey: document.fileKey }, expect.objectContaining({ attempts: 5, jobId: `document-scan:${document.id}` }));
  });

  it('persists SCAN_FAILED when the queue is unavailable instead of leaving a stuck SCANNING record', async () => {
    queue.addJob.mockRejectedValueOnce(new Error('redis unavailable'));
    const result = await service.create(userId, { fileKey: document.fileKey, fileType: 'application/pdf', originalName: 'file.pdf' });
    expect(repo.update).toHaveBeenCalledWith(document.id, expect.objectContaining({ status: 'SCAN_FAILED', scanResult: expect.objectContaining({ error: 'SCAN_QUEUE_UNAVAILABLE' }) }));
    expect(result.status).toBe('SCAN_FAILED');
  });

  it('rejects object keys that do not belong to the authenticated user', async () => {
    await expect(service.create(userId, { fileKey: 'users/another-user/file.pdf', fileType: 'application/pdf', originalName: 'file.pdf' })).rejects.toBeInstanceOf(DocumentAccessException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported content types before creating a record', async () => {
    await expect(service.create(userId, { fileKey: document.fileKey, fileType: 'application/x-msdownload', originalName: 'file.exe' })).rejects.toBeInstanceOf(InvalidDocumentException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
