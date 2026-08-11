import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './test-app.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    fullName: 'Test User',
  };

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.email).toBe(testUser.email);
          expect(res.body.data.fullName).toBe(testUser.fullName);
          expect(res.body.data.role).toBe('applicant');
          expect(res.body.data).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409)
        .expect((res) => {
          expect(res.body.error.code).toBe('EMAIL_TAKEN');
        });
    });

    it('should reject registration without required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'bad@bad.com' })
        .expect(400);
    });

    it('should reject registration with short password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: '123' })
        .expect(400);
    });

    it('should reject role field injection', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'new@test.com', role: 'super_admin' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.user.email).toBe(testUser.email);
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
        });
    });

    it('should reject non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password123!' })
        .expect(401);
    });
  });

  describe('Token flow', () => {
    let accessToken: string;
    let refreshToken: string;

    it('should get tokens from login', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });

    it('should access protected route with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications/mine')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications/mine')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should logout and blacklist token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Token should now be blacklisted
      await request(app.getHttpServer())
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
