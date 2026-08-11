import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const httpDuration = new Trend('http_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_duration: ['p(95)<500'],     // 95% of requests under 500ms
    errors: ['rate<0.1'],             // Error rate under 10%
  },
};

function registerAndLogin() {
  const email = `loadtest${Date.now()}${Math.random().toString(36).slice(2)}@test.com`;

  // Register
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      email,
      password: 'LoadTest123!',
      fullName: 'Load Test User',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(registerRes, { 'register succeeded': (r) => r.status === 201 });

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password: 'LoadTest123!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(loginRes, { 'login succeeded': (r) => r.status === 200 });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body as string);
    return body.data?.accessToken;
  }
  return null;
}

export default function () {
  // Health check (no auth)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health ok': (r) => r.status === 200 });
  httpDuration.add(healthRes.timings.duration);

  // List jobs (no auth)
  const jobsRes = http.get(`${BASE_URL}/jobs`);
  check(jobsRes, { 'jobs list ok': (r) => r.status === 200 });
  httpDuration.add(jobsRes.timings.duration);

  // Auth flow
  const token = registerAndLogin();

  if (token) {
    const authHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    // Create job (as employer — register a separate employer)
    const empEmail = `emp${Date.now()}${Math.random().toString(36).slice(2)}@test.com`;
    http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({ email: empEmail, password: 'LoadTest123!', fullName: 'Load Employer' }),
      { headers: { 'Content-Type': 'application/json' } },
    );

    const empLogin = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: empEmail, password: 'LoadTest123!' }),
      { headers: { 'Content-Type': 'application/json' } },
    );

    if (empLogin.status === 200) {
      const empBody = JSON.parse(empLogin.body as string);
      const empToken = empBody.data?.accessToken;

      if (empToken) {
        const empHeaders = {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${empToken}`,
          },
        };

        // Create job
        const createJobRes = http.post(
          `${BASE_URL}/jobs`,
          JSON.stringify({
            title: `Load Test Job ${Date.now()}`,
            description: 'Created during load testing',
            location: 'Test Location',
          }),
          empHeaders,
        );
        check(createJobRes, { 'job created': (r) => r.status === 201 });
        httpDuration.add(createJobRes.timings.duration);

        if (createJobRes.status === 201) {
          const jobBody = JSON.parse(createJobRes.body as string);
          const jobId = jobBody.data?.id;

          if (jobId) {
            // Apply to job (as applicant)
            const applyRes = http.post(
              `${BASE_URL}/applications/${jobId}/apply`,
              JSON.stringify({ coverLetter: 'Load test application' }),
              authHeaders,
            );
            check(applyRes, { 'application created': (r) => r.status === 201 });
            httpDuration.add(applyRes.timings.duration);
          }
        }
      }
    }

    // List applications (as applicant)
    const mineRes = http.get(`${BASE_URL}/applications/mine`, authHeaders);
    check(mineRes, { 'my applications ok': (r) => r.status === 200 });
    httpDuration.add(mineRes.timings.duration);
  }

  sleep(1);
}
