import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Backend API contract smoke (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
    await app.init();
  });
  afterAll(async () => app.close());

  it('protects authenticated mutation routes', async () => {
    await request(app.getHttpServer()).post('/api/v1/skills').send({}).expect(401);
    await request(app.getHttpServer()).post('/api/v1/transactions').send({}).expect(401);
    await request(app.getHttpServer()).get('/api/v1/wallet/balance').expect(401);
    await request(app.getHttpServer()).post('/api/v1/documents').send({}).expect(401);
  });

  it('rejects malformed public search input without a server exception', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/search').query({ q: 'a'.repeat(5000) });
    expect([200, 400]).toContain(response.status);
  });
});
