import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest'; // default import, evita o erro de "namespace-style import"
import { AppModule } from '../src/app.module';

describe('App E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health deve responder', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    // Aceita 200 (OK), 204 (No Content) ou 302 (se tiver redirect)
    expect([200, 204, 302]).toContain(res.status);
  });
});
