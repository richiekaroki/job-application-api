import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, seedUsers } from './test-app.helper';
import { UserRole } from '../src/users/user.entity';

describe('Jobs (e2e)', () => {
  let app: INestApplication<App>;
  let employerToken: string;
  let applicantToken: string;
  let jobId: string;

  beforeAll(async () => {
    app = await createTestApp();

    await seedUsers(app, [
      {
        email: 'employer@test.com',
        password: 'Password123!',
        fullName: 'Test Employer',
        role: UserRole.EMPLOYER,
      },
      {
        email: 'applicant@test.com',
        password: 'Password123!',
        fullName: 'Test Applicant',
        role: UserRole.APPLICANT,
      },
    ]);

    const employerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employer@test.com', password: 'Password123!' });
    employerToken = employerLogin.body.data.accessToken;

    const applicantLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@test.com', password: 'Password123!' });
    applicantToken = applicantLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /jobs (create)', () => {
    it('should create a job as employer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Backend Developer',
          description: 'Build APIs with NestJS',
          location: 'Remote',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.title).toBe('Backend Developer');
          expect(res.body.data.status).toBe('open');
          jobId = res.body.data.id;
        });
    });

    it('should reject applicant creating a job', () => {
      return request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          title: 'Unauthorized Job',
          description: 'Should fail',
          location: 'Nowhere',
        })
        .expect(403);
    });

    it('should reject unauthenticated job creation', () => {
      return request(app.getHttpServer())
        .post('/api/v1/jobs')
        .send({
          title: 'No Auth Job',
          description: 'Should fail',
          location: 'Nowhere',
        })
        .expect(401);
    });

    it('should reject job without required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Incomplete' })
        .expect(400);
    });
  });

  describe('GET /jobs (list)', () => {
    it('should list jobs without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/jobs')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    it('should filter jobs by title', () => {
      return request(app.getHttpServer())
        .get('/api/v1/jobs?title=Backend')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThan(0);
          expect(res.body.data[0].title).toContain('Backend');
        });
    });

    it('should return single job by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.id).toBe(jobId);
          expect(res.body.data.title).toBe('Backend Developer');
        });
    });

    it('should return 404 for non-existent job', () => {
      return request(app.getHttpServer())
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /jobs/:id (update)', () => {
    it('should update own job as employer', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'Senior Backend Developer' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.title).toBe('Senior Backend Developer');
        });
    });

    it('should reject applicant updating a job', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });
  });

  describe('DELETE /jobs/:id', () => {
    let deleteJobId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'To Delete',
          description: 'Will be deleted',
          location: 'Test',
        });
      deleteJobId = res.body.data.id;
    });

    it('should delete own job as employer', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/jobs/${deleteJobId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);
    });

    it('should return 404 for deleted job', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/jobs/${deleteJobId}`)
        .expect(404);
    });
  });
});
