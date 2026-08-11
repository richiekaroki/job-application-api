import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp, seedUsers } from './test-app.helper';
import { UserRole } from '../src/users/user.entity';

describe('Applications (e2e)', () => {
  let app: INestApplication<App>;
  let employerToken: string;
  let applicantToken: string;
  let recruiterToken: string;
  let jobId: string;
  let applicationId: string;

  beforeAll(async () => {
    app = await createTestApp();

    await seedUsers(app, [
      {
        email: 'app-employer@test.com',
        password: 'Password123!',
        fullName: 'App Employer',
        role: UserRole.EMPLOYER,
      },
      {
        email: 'app-applicant@test.com',
        password: 'Password123!',
        fullName: 'App Applicant',
        role: UserRole.APPLICANT,
      },
      {
        email: 'app-recruiter@test.com',
        password: 'Password123!',
        fullName: 'App Recruiter',
        role: UserRole.RECRUITER,
      },
    ]);

    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'app-employer@test.com', password: 'Password123!' });
    employerToken = empLogin.body.data.accessToken;

    const appLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'app-applicant@test.com', password: 'Password123!' });
    applicantToken = appLogin.body.data.accessToken;

    const recLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'app-recruiter@test.com', password: 'Password123!' });
    recruiterToken = recLogin.body.data.accessToken;

    // Employer creates a job
    const jobRes = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Test Position',
        description: 'A test job',
        location: 'Test City',
      });
    jobId = jobRes.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /applications/:jobId/apply', () => {
    it('should apply to a job as applicant', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/applications/${jobId}/apply`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ coverLetter: 'I would like to apply.' })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.status).toBe('pending');
          applicationId = res.body.data.id;
        });
    });

    it('should reject duplicate application', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/applications/${jobId}/apply`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ coverLetter: 'Trying again.' })
        .expect(409);
    });

    it('should reject employer applying to a job', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/applications/${jobId}/apply`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ coverLetter: 'Employer trying to apply.' })
        .expect(403);
    });

    it('should reject unauthenticated application', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/applications/${jobId}/apply`)
        .send({ coverLetter: 'No auth.' })
        .expect(401);
    });
  });

  describe('GET /applications/mine', () => {
    it('should return applicant own applications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications/mine')
        .set('Authorization', `Bearer ${applicantToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.data.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /applications (employer view)', () => {
    it('should return applications for employer own jobs', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    it('should return applications for recruiter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .expect(200);
    });

    it('should reject applicant viewing all applications', () => {
      return request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .expect(403);
    });
  });

  describe('PATCH /applications/:id/status', () => {
    it('should update application status as employer', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'shortlisted' })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('shortlisted');
        });
    });

    it('should reject applicant updating status', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ status: 'hired' })
        .expect(403);
    });

    it('should reject invalid status value', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });
  });
});
