import net from 'node:net';

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface ClamAvScanResult {
  clean: boolean;
  signature?: string;
}

/** Parse clamd's INSTREAM response and fail closed on unknown responses. */
export function parseClamAvResponse(raw: string): ClamAvScanResult {
  const response = raw.replace(/\0+$/g, '').trim();
  if (!response) throw new Error('CLAMAV_EMPTY_RESPONSE');
  if (/\bOK$/i.test(response)) return { clean: true };
  if (/\bFOUND$/i.test(response)) return { clean: false, signature: response };
  if (/\bERROR$/i.test(response) || /\bERROR:/i.test(response)) {
    throw new Error(`CLAMAV_SCAN_ERROR:${response.slice(0, 240)}`);
  }
  throw new Error('CLAMAV_INVALID_RESPONSE');
}

export function validateDocumentSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_DOCUMENT_BYTES) {
    throw new Error('INVALID_OBJECT_SIZE');
  }
}

export function retryOptions(attempts = 5, delay = 2_000) {
  return { attempts, backoff: { type: 'exponential' as const, delay }, removeOnComplete: 500, removeOnFail: 1_000 };
}

function writeSocket(socket: net.Socket, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.destroyed) {
      reject(new Error('CLAMAV_SOCKET_CLOSED'));
      return;
    }
    if (socket.write(data)) {
      resolve();
      return;
    }
    const cleanup = () => {
      socket.off('drain', onDrain);
      socket.off('error', onError);
    };
    const onDrain = () => { cleanup(); resolve(); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    socket.once('drain', onDrain);
    socket.once('error', onError);
  });
}

/** Send a bounded file buffer using clamd's INSTREAM protocol. */
export async function scanBufferWithClamAv(
  bytes: Buffer,
  host = process.env.CLAMAV_HOST ?? 'localhost',
  port = Number(process.env.CLAMAV_PORT ?? 3310),
): Promise<ClamAvScanResult> {
  validateDocumentSize(bytes.length);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_CLAMAV_PORT');

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const responseChunks: Buffer[] = [];
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };
    socket.setTimeout(30_000);
    socket.on('connect', async () => {
      try {
        await writeSocket(socket, Buffer.from('zINSTREAM\0', 'utf8'));
        const chunkSize = 64 * 1024;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
          const header = Buffer.alloc(4);
          header.writeUInt32BE(chunk.length, 0);
          await writeSocket(socket, header);
          await writeSocket(socket, chunk);
        }
        const terminator = Buffer.alloc(4);
        terminator.writeUInt32BE(0, 0);
        await writeSocket(socket, terminator);
      } catch (error) {
        finish(() => reject(error));
      }
    });
    const completeResponse = () => {
      try {
        const result = parseClamAvResponse(Buffer.concat(responseChunks).toString('utf8'));
        finish(() => resolve(result));
      } catch (error) {
        finish(() => reject(error));
      }
    };
    socket.on('data', chunk => {
      responseChunks.push(Buffer.from(chunk));
      // clamd's z-protocol terminates the response with NUL but may keep the
      // TCP connection alive. Resolve on the protocol terminator, not socket end.
      if (Buffer.concat(responseChunks).includes(0)) completeResponse();
    });
    socket.on('end', () => { if (!settled) completeResponse(); });
    socket.on('timeout', () => finish(() => reject(new Error('CLAMAV_TIMEOUT'))));
    socket.on('error', error => finish(() => reject(error)));
  });
}
