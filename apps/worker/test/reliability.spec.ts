import assert from 'node:assert/strict';
import net from 'node:net';
import { MAX_DOCUMENT_BYTES, parseClamAvResponse, retryOptions, scanBufferWithClamAv, validateDocumentSize } from '../src/reliability';

function test(name: string, run: () => void) {
  run();
  console.log(`PASS ${name}`);
}

test('accepts a clean ClamAV response with a trailing NUL', () => {
  assert.deepEqual(parseClamAvResponse('stream: OK\0'), { clean: true });
});

test('rejects infected files and preserves the signature', () => {
  const result = parseClamAvResponse('stream: Eicar-Test-Signature FOUND');
  assert.equal(result.clean, false);
  assert.match(result.signature ?? '', /Eicar-Test-Signature/);
});

test('fails closed for empty, malformed, and error responses', () => {
  assert.throws(() => parseClamAvResponse(''));
  assert.throws(() => parseClamAvResponse('unknown response'));
  assert.throws(() => parseClamAvResponse('stream: size limit exceeded ERROR'));
});

test('enforces positive integer upload size and the 10 MB ceiling', () => {
  assert.equal(MAX_DOCUMENT_BYTES, 10 * 1024 * 1024);
  validateDocumentSize(1);
  validateDocumentSize(MAX_DOCUMENT_BYTES);
  for (const size of [0, -1, 1.2, Number.NaN, Number.MAX_SAFE_INTEGER, MAX_DOCUMENT_BYTES + 1]) {
    assert.throws(() => validateDocumentSize(size));
  }
});

test('configures bounded retries with exponential backoff', () => {
  assert.deepEqual(retryOptions(), { attempts: 5, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 500, removeOnFail: 1_000 });
});

async function testAsync(name: string, run: () => Promise<void>) {
  await run();
  console.log(`PASS ${name}`);
}

async function fakeClamServer(response: string, expectedBytes: Buffer): Promise<{ host: string; port: number; close: () => Promise<void> }> {
  const server = net.createServer(socket => {
    let received = Buffer.alloc(0);
    socket.on('data', chunk => {
      received = Buffer.concat([received, Buffer.from(chunk)]);
      if (received.length >= 4 && received.subarray(-4).equals(Buffer.alloc(4))) {
        // Confirm that INSTREAM command and content bytes were transmitted.
        assert.ok(received.includes(Buffer.from('zINSTREAM\0')));
        assert.ok(received.includes(expectedBytes));
        socket.write(Buffer.from(response + '\0')); // clamd may keep the connection open after the NUL-terminated response
      }
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_UNAVAILABLE');
  return { host: '127.0.0.1', port: address.port, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

async function main() {
await testAsync('sends file content through ClamAV INSTREAM and accepts a clean result', async () => {
  const bytes = Buffer.from('safe-test-document');
  const server = await fakeClamServer('stream: OK', bytes);
  try { assert.deepEqual(await scanBufferWithClamAv(bytes, server.host, server.port), { clean: true }); }
  finally { await server.close(); }
});

await testAsync('rejects an infected file reported by ClamAV', async () => {
  const bytes = Buffer.from('test-virus-payload');
  const server = await fakeClamServer('stream: Eicar-Test-Signature FOUND', bytes);
  try {
    const result = await scanBufferWithClamAv(bytes, server.host, server.port);
    assert.equal(result.clean, false);
    assert.match(result.signature ?? '', /Eicar-Test-Signature/);
  } finally { await server.close(); }
});

}

void main().catch(error => { console.error(error); process.exitCode = 1; });
