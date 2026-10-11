import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * BE-02 (Authentication Foundation) e2e suite (Backend Constitution §53).
 *
 * Requires a reachable Postgres (see `.env.example` / `docker-compose.yml`)
 * with the `auth` module's migration applied
 * (`pnpm --filter @talentswap/api prisma migrate deploy`, or `dev` for a
 * local scratch database) — this suite creates real `users`/
 * `refresh_tokens` rows and cleans up its own test data in `afterEach`,
 * per Architecture Foundation §17.2 step 8 ("a real test-database
 * transaction, rolled back after each test"). A full `$transaction`
 * rollback isn't practical here since the flows under test span multiple
 * independent HTTP requests (register, then refresh, then logout) that
 * each open and close their own connection — so cleanup is a targeted
 * delete instead, scoped to the emails this file creates.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmailPrefix = 'be02-e2e-';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
    app.use(cookieParser());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: testEmailPrefix } } });
  });

  afterAll(async () => {
    await app.close();
  });

  function uniqueEmail(): string {
    return `${testEmailPrefix}${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  }

  /**
   * `response.headers['set-cookie']` is an array of full `Set-Cookie`
   * header strings (`name=value; Path=...; HttpOnly; SameSite=Strict`).
   * A request `Cookie:` header wants only the `name=value` pair — sending
   * the full attribute string back can behave inconsistently across
   * HTTP client versions, so this extracts just the pair explicitly
   * rather than relying on supertest's array-to-string coercion.
   */
  function extractCookieHeader(setCookie: string[] | string | undefined): string {
    const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!raw) {
      throw new Error('Expected a Set-Cookie header in the response.');
    }
    return raw.split(';')[0];
  }

  describe('POST /api/v1/auth/register', () => {
    it('creates an account and returns an access token + refresh cookie', async () => {
      const email = uniqueEmail();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: { email, role: 'USER' },
          accessToken: expect.any(String),
          accessTokenExpiresIn: expect.any(Number),
        },
      });
      expect(response.body.data.accessToken).not.toBe('');

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(String(setCookie)).toMatch(/talentswap_refresh_token=/);
      expect(String(setCookie)).toMatch(/HttpOnly/i);
    });

    it('rejects a duplicate email with 409 EMAIL_ALREADY_REGISTERED', async () => {
      const email = uniqueEmail();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'a different password' })
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('rejects an invalid payload with 400 VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const email = uniqueEmail();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'correct horse battery' })
        .expect(200);

      expect(response.body.data.user.email).toBe(email);
    });

    it('rejects an incorrect password with 401 INVALID_CREDENTIALS', async () => {
      const email = uniqueEmail();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'wrong password' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an unknown email with the SAME 401 INVALID_CREDENTIALS code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail(), password: 'whatever password' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects a request with no access token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('returns the authenticated user for a valid access token', async () => {
      const email = uniqueEmail();
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const accessToken = registerResponse.body.data.accessToken as string;

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({ email, role: 'USER' });
    });

    it('rejects a malformed bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh + POST /api/v1/auth/logout', () => {
    it('rotates the refresh token and the old cookie can no longer be reused', async () => {
      const email = uniqueEmail();
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const originalCookie = extractCookieHeader(registerResponse.headers['set-cookie']);

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookie)
        .expect(200);

      expect(refreshResponse.body.data.accessToken).toEqual(expect.any(String));
      const rotatedCookie = extractCookieHeader(refreshResponse.headers['set-cookie']);
      expect(rotatedCookie).not.toBe(originalCookie);

      // Replaying the ORIGINAL (now-rotated-away) cookie must fail and,
      // per ADR-0003/Spec §8.2, this is treated as reuse — the whole
      // family is revoked, so even the just-issued rotated cookie stops
      // working afterward too.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookie)
        .expect(401);

      const rotatedRetry = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', rotatedCookie)
        .expect(401);
      expect(rotatedRetry.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects refresh with no cookie present', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('logout revokes the token and clears the cookie', async () => {
      const email = uniqueEmail();
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const cookie = extractCookieHeader(registerResponse.headers['set-cookie']);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie)
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .expect(401);
    });

    it('logout is idempotent when no cookie is present', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(204);
    });
  });
});
