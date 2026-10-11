import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PasswordService } from './password.service';

// `bcrypt.compare` is a native addon export, which `jest.spyOn` cannot
// wrap directly (`Object.defineProperty` on a native binding throws
// "Cannot redefine property"). `jest.mock` replaces the module in the
// registry instead, so every call still delegates to the real
// implementation (`jest.requireActual`) — every other test in this file
// keeps exercising genuine bcrypt hashing/verification — while the one
// regression test below can inspect `bcrypt.compare`'s call arguments.
jest.mock('bcrypt', () => {
  const actual = jest.requireActual<typeof bcrypt>('bcrypt');
  return {
    ...actual,
    compare: jest.fn((plaintext: string, hash: string): Promise<boolean> =>
      actual.compare(plaintext, hash),
    ),
  };
});

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    jest.mocked(bcrypt.compare).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: ConfigService,
          // A low cost factor keeps the suite fast; production behavior
          // (default 12, bounded 10-15) is enforced by env.schema.ts, not
          // re-tested here — this test exercises the hashing/verification
          // logic itself, independent of the configured cost.
          useValue: { get: () => ({ bcryptSaltRounds: 4 }) },
        },
      ],
    }).compile();

    service = module.get(PasswordService);
  });

  it('hashes a password to a bcrypt digest, not the plaintext', async () => {
    const hash = await service.hash('correct horse battery staple');

    expect(hash).not.toBe('correct horse battery staple');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('verifies a correct password against its own hash', async () => {
    const hash = await service.hash('correct horse battery staple');

    await expect(service.verify('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('correct horse battery staple');

    await expect(service.verify('wrong password', hash)).resolves.toBe(false);
  });

  it('produces a different hash for the same password on each call (random salt)', async () => {
    const [first, second] = await Promise.all([
      service.hash('same password'),
      service.hash('same password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('returns false, not a rejection, for a null stored hash (OAuth-only account)', async () => {
    await expect(service.verify('anything', null)).resolves.toBe(false);
  });

  it('performs a real bcrypt comparison even for a null stored hash, not a short-circuit', async () => {
    // Regression test for the timing side-channel fixed during the
    // DEV-02/DB-02/FE-02/BE-02 merge (see
    // docs/architecture/RECONCILIATION-DEV02-DB02-FE02-BE02.md §5): an
    // early `if (!storedHash) return false` before ever calling
    // `bcrypt.compare` meant a nonexistent-user/OAuth-only login attempt
    // returned near-instantly while a real wrong-password attempt paid a
    // full bcrypt comparison — a measurable enumeration side-channel.
    // Asserting `bcrypt.compare` is genuinely called on the null-hash
    // path (not just that the return value happens to be `false`) is
    // what actually pins this fix; a reintroduced short-circuit would
    // still pass every other test in this file.
    await service.verify('anything', null);

    const compareMock = jest.mocked(bcrypt.compare);
    expect(compareMock).toHaveBeenCalledTimes(1);
    const comparedHash = compareMock.mock.calls[0]?.[1];
    expect(comparedHash).toMatch(/^\$2[aby]\$/);
  });
});
