import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

/**
 * Foundation-scope e2e smoke test (Backend Constitution §53). Confirms the
 * bootstrap wiring — global prefix (with the health exclusion), response
 * envelope, and health checks — all work together. Domain modules add
 * their own e2e suites (`TEST-xx`) alongside their own controllers; this
 * file is not extended by them.
 *
 * Requires a reachable Postgres + Redis (see `.env.example` /
 * `docker-compose.yml`) since `AppService` pings both.
 *
 * NOTE: health routes are intentionally excluded from the `/api/v1`
 * prefix (see `main.ts`), so this suite hits `/health`, not
 * `/api/v1/health` — this was corrected per the 2026-08 integration
 * review, which found the DevOps compose/Dockerfile healthchecks and
 * onboarding docs all assumed the unprefixed path.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns the standard success envelope', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: expect.stringMatching(/ok|degraded/),
        dependencies: {
          database: expect.stringMatching(/ok|unreachable/),
          redis: expect.stringMatching(/ok|unreachable/),
        },
      },
      meta: {
        requestId: expect.any(String),
        timestamp: expect.any(String),
      },
    });
  });

  it('GET /health/database returns a granular indicator result', async () => {
    const response = await request(app.getHttpServer()).get('/health/database').expect(200);

    expect(response.body.data).toMatchObject({ status: expect.stringMatching(/up|down/) });
  });

  it('GET /health/redis returns a granular indicator result', async () => {
    const response = await request(app.getHttpServer()).get('/health/redis').expect(200);

    expect(response.body.data).toMatchObject({ status: expect.stringMatching(/up|down/) });
  });

  it('sets an X-Request-Id response header', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('does not expose unprefixed routes outside the health exclusion', async () => {
    // Sanity check that the exclusion is scoped to `health*` only, not a
    // blanket prefix bypass. `/some-future-resource` still isn't a real
    // route (the `auth` module's routes all live under `/api/v1/auth/*`),
    // so this should 404, not resolve under the bare path.
    await request(app.getHttpServer()).get('/some-future-resource').expect(404);
  });
});
