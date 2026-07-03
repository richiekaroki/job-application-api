# Job Applications API — System Design Document

**Role target:** Junior API Developer — WizGlobal  
**Stack:** NestJS · TypeScript · PostgreSQL · Redis · Docker · Railway  
**Deliverables:** GitHub repo · Live deployment · Swagger docs · Postman collection

---

## 1. Project Overview

A production-grade Job Applications API built as a portfolio demo for a Junior API Developer role. The domain is intentionally meta — a job application tracking system submitted as a job application — making it contextually memorable to reviewers.

The API covers the full lifecycle of job recruitment: employers post jobs, applicants apply, recruiters review and update statuses, and employers receive real-time webhook notifications on status changes. Every design decision prioritises demonstrating API security, scalable architecture, and frontend-readiness.

---

## 2. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | NestJS | Modular, opinionated structure — signals architectural awareness |
| Language | TypeScript | Type safety, matches JD requirements |
| Primary database | PostgreSQL | Relational domain, ACID transactions |
| ORM | TypeORM | Native NestJS integration, migration support |
| Cache / rate limiting | Redis | Token blacklisting + throttler — directly showcases API security |
| Containerisation | Docker Compose | Reproducible local environment |
| Deployment | Railway | No cold starts, native PostgreSQL + Redis plugins |
| Docs | Swagger / OpenAPI | Self-documenting API, auto-generated from decorators |
| Testing | Jest | Unit tests on auth and application status logic |
| API testing | Postman | Collection with environment variables, expected responses |

---

## 3. RBAC — Four Roles

| Permission | Super Admin | Employer | Recruiter | Applicant |
|---|---|---|---|---|
| Manage all users | ✓ | ✗ | ✗ | ✗ |
| Post / edit jobs | ✓ | ✓ | ✗ | ✗ |
| Review & shortlist applicants | ✓ | ✓ | ✓ | ✗ |
| Update application status | ✓ | ✓ | ✓ | ✗ |
| Apply to jobs | ✗ | ✗ | ✗ | ✓ |
| View own applications | ✗ | ✗ | ✗ | ✓ |
| Register webhook URL | ✓ | ✓ | ✗ | ✗ |
| View analytics & reports | ✓ | ✓ | ✓ | ✗ |

Roles are stored as a PostgreSQL enum on the `users` table. NestJS `@Roles()` decorator + a custom `RolesGuard` enforces access at the controller level.

---

## 4. Database Schema

### `users`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
email         VARCHAR UNIQUE NOT NULL
password_hash VARCHAR NOT NULL
role          ENUM('super_admin','employer','recruiter','applicant') NOT NULL
full_name     VARCHAR NOT NULL
webhook_url   VARCHAR NULL
created_at    TIMESTAMP DEFAULT now()
```

### `jobs`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
posted_by   UUID REFERENCES users(id) NOT NULL
title       VARCHAR NOT NULL
description TEXT NOT NULL
location    VARCHAR NOT NULL
status      ENUM('open','closed') DEFAULT 'open'
created_at  TIMESTAMP DEFAULT now()
```

### `applications`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
job_id        UUID REFERENCES jobs(id) NOT NULL
applicant_id  UUID REFERENCES users(id) NOT NULL
cover_letter  TEXT NOT NULL
status        ENUM('pending','reviewed','shortlisted','rejected','hired') DEFAULT 'pending'
reviewed_by   UUID REFERENCES users(id) NULL
created_at    TIMESTAMP DEFAULT now()

UNIQUE(job_id, applicant_id)  -- prevents duplicate applications
```

### `refresh_tokens`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) NOT NULL
token_hash  VARCHAR NOT NULL
expires_at  TIMESTAMP NOT NULL
revoked     BOOLEAN DEFAULT false
```

### `webhook_logs`

```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
application_id UUID REFERENCES applications(id) NOT NULL
event_type     VARCHAR NOT NULL
payload        JSONB NOT NULL
status_code    INT NULL
delivered_at   TIMESTAMP DEFAULT now()
```

All schema changes are managed via TypeORM migrations. Never use `synchronize: true` in production.

---

## 5. API Routes

### Auth

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account |
| POST | `/auth/login` | Public | Returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh token | Issues new access token |
| POST | `/auth/logout` | JWT | Blacklists token, revokes refresh |

### Jobs

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/jobs` | Public | List jobs (paginated + filtered) |
| GET | `/jobs/:id` | Public | Single job detail |
| POST | `/jobs` | Employer+ | Create a job |
| PATCH | `/jobs/:id` | Employer+ | Update job details or status |
| DELETE | `/jobs/:id` | Employer+ | Remove a job |

### Applications

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/jobs/:id/apply` | Applicant | Submit application |
| GET | `/applications` | Recruiter+ | All applications (paginated) |
| GET | `/applications/mine` | Applicant | Own applications |
| PATCH | `/applications/:id/status` | Recruiter+ | Update status → triggers webhook |

### Webhooks

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/webhooks/register` | Employer+ | Save webhook URL to user profile |
| GET | `/webhooks/logs` | Employer+ | View delivery history |

### Admin

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/admin/users` | Super Admin | List all users |
| PATCH | `/admin/users/:id/role` | Super Admin | Reassign user role |

All routes prefixed `/api/v1`.

---

## 6. Authentication — JWT + Refresh Token + Redis Blacklist

### Flow

1. **Login** — User posts credentials. Server validates password hash (bcrypt), issues:
   - `access_token` (JWT, 15 min TTL, contains `sub`, `role`, `jti`)
   - `refresh_token` (opaque token, 7 days TTL, hash stored in `refresh_tokens` table)

2. **Authenticated request** — Client sends `Authorization: Bearer <access_token>`. The JWT Guard decodes the token, checks the `jti` against the Redis blacklist, and attaches `user` + `role` to the request context.

3. **Token refresh** — Client POSTs the refresh token to `/auth/refresh`. Server validates it against the DB (not expired, not revoked), issues a new access token, and rotates the refresh token (old one revoked, new one issued).

4. **Logout** — The access token's `jti` is added to Redis with a TTL equal to its remaining lifetime. The refresh token row is marked `revoked = true` in PostgreSQL. The token cannot be reused even before expiry.

### Why Redis blacklisting matters

Pure JWT is stateless — a logged-out token remains valid until expiry. Redis blacklisting closes this gap. When a reviewer asks "how do you handle logout securely?", this is the answer.

---

## 7. Webhook System

### Design: internal EventEmitter → configurable URL

**Step 1 — Register**  
Employer calls `POST /webhooks/register` with their target URL. Saved to `users.webhook_url`.

**Step 2 — Trigger**  
When a recruiter calls `PATCH /applications/:id/status`, the `ApplicationsService` emits an internal `application.status_changed` event via NestJS `EventEmitter2`.

**Step 3 — Deliver**  
`WebhookService` listens for the event, constructs a signed payload, and POSTs to the employer's registered URL via `axios`:

```json
{
  "event": "application.status_changed",
  "applicationId": "uuid",
  "jobId": "uuid",
  "applicantId": "uuid",
  "status": "shortlisted",
  "timestamp": "2026-06-13T10:00:00Z"
}
```

**Step 4 — Sign**  
An `X-Webhook-Signature` header is included with every delivery:

```
X-Webhook-Signature: sha256=<HMAC-SHA256(payload, WEBHOOK_SECRET)>
```

This is how Stripe and GitHub webhooks work. The receiving server verifies the signature before trusting the payload.

**Step 5 — Log**  
Response status code + timestamp written to `webhook_logs`. Failed deliveries retry once after 5 seconds. Employer can query `GET /webhooks/logs` to inspect history.

---

## 8. Rate Limiting

Implemented via `@nestjs/throttler` with Redis as the storage backend.

| Scope | Limit | Window |
|---|---|---|
| Global | 100 requests | 1 minute |
| Auth routes (`/auth/login`, `/auth/register`) | 10 requests | 1 minute |

Auth routes have a stricter limit to mitigate brute-force attacks. When the limit is exceeded, the API returns:

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "statusCode": 429
  }
}
```

---

## 9. Response Envelope

Every endpoint returns a consistent shape. A frontend client always destructures `{ data, meta, error }` and never guesses the response structure.

### Success — list resource

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 84,
    "totalPages": 9
  },
  "error": null
}
```

### Success — single resource

```json
{
  "data": {
    "id": "uuid",
    "title": "Senior Developer",
    "postedBy": "uuid",
    "location": "Nairobi",
    "status": "open",
    "createdAt": "2026-06-13T08:00:00Z"
  },
  "meta": null,
  "error": null
}
```

### Error

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "statusCode": 403
  }
}
```

Implemented as a global `TransformInterceptor` in NestJS and a global `HttpExceptionFilter`.

---

## 10. Error Codes

| HTTP | code | When it fires |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid request fields (class-validator) |
| 401 | `INVALID_TOKEN` | JWT missing, malformed, or expired |
| 401 | `TOKEN_BLACKLISTED` | Token was invalidated after logout |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh token expired or revoked |
| 403 | `FORBIDDEN` | Role does not have permission |
| 404 | `JOB_NOT_FOUND` | Job id does not exist |
| 404 | `APPLICATION_NOT_FOUND` | Application id does not exist |
| 409 | `ALREADY_APPLIED` | Duplicate application by same applicant |
| 409 | `EMAIL_TAKEN` | Registration with existing email |
| 429 | `RATE_LIMIT_EXCEEDED` | Redis throttler hit |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |

---

## 11. `GET /jobs` — Filtering & Pagination

```
GET /api/v1/jobs?page=1&limit=10&title=developer&location=nairobi&status=open&postedAfter=2026-01-01
```

| Param | Type | Behaviour |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 10, max: 50 |
| `title` | string | `ILIKE %keyword%` on `title` column |
| `location` | string | Exact match |
| `status` | `open` \| `closed` | Enum filter |
| `postedAfter` | ISO 8601 date | `WHERE created_at >= date` |

All params are optional and combinable. Validated via NestJS `ValidationPipe` + class-validator DTOs.

---

## 12. Field Naming Convention

Database columns follow PostgreSQL `snake_case` convention. API responses use JavaScript `camelCase`. The transform is handled automatically — no manual mapping.

| DB column | API response |
|---|---|
| `posted_by` | `postedBy` |
| `created_at` | `createdAt` |
| `cover_letter` | `coverLetter` |
| `webhook_url` | `webhookUrl` |
| `token_hash` | `tokenHash` |
| `reviewed_by` | `reviewedBy` |

**Implementation:** TypeORM `SnakeNamingStrategy` for DB ↔ entity mapping. NestJS `ClassSerializerInterceptor` + `@Expose()` decorators for entity ↔ response mapping.

---

## 13. CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',           // Next.js local dev
'https://job-application-api-production.up.railway.app',     // production frontend  ],
  credentials: true,                   // required for httpOnly cookie auth
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

Open CORS (`*`) is a deliberate security red flag in any code review. Locking origins signals security discipline.

---

## 14. Folder Structure

```
src/
  auth/               ← JWT strategy, guards, refresh logic, logout
  users/              ← entity, service, admin controller
  jobs/               ← CRUD, pagination, query filters
  applications/       ← apply, status update, RBAC enforcement
  webhooks/           ← event emitter, delivery service, logs
  common/
    decorators/       ← @Roles(), @CurrentUser()
    guards/           ← JwtAuthGuard, RolesGuard
    interceptors/     ← TransformInterceptor (response envelope)
    filters/          ← HttpExceptionFilter (error envelope)
    pipes/            ← ValidationPipe config
  config/             ← env validation (Joi), DB config, Redis config
  app.module.ts
  main.ts             ← Swagger setup, global pipes, CORS, versioning

migrations/           ← TypeORM migration files (never synchronize: true)
postman/              ← JobApplicationsAPI.postman_collection.json
docker-compose.yml    ← postgres + redis services
railway.toml          ← Railway deployment config
.env.example          ← all required env vars documented
```

---

## 15. Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: jobapi
      POSTGRES_PASSWORD: jobapi_pass
      POSTGRES_DB: job_applications
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 16. Environment Variables

```bash
# .env.example

# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=jobapi
DB_PASSWORD=jobapi_pass
DB_NAME=job_applications

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d

# Webhooks
WEBHOOK_SECRET=your_webhook_hmac_secret

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
AUTH_THROTTLE_LIMIT=10
```

---

## 17. Frontend Integration Contract

### Base URL

```
https://job-application-api-production.up.railway.app/api/v1```

### Auth header

```

Authorization: Bearer <access_token>

```

### Swagger UI

```

<https://job-application-api-production.up.railway.app/api/v1/docs```>

### Token strategy for Next.js

- Store `access_token` in memory (React state or a module-level variable) — never in `localStorage`
- Store `refresh_token` in an `httpOnly` cookie
- On any `401 INVALID_TOKEN` response, silently call `POST /auth/refresh` and retry the original request once
- On `401 REFRESH_TOKEN_INVALID`, clear state and redirect to login

### How a Next.js jobs page consumes this API

1. `GET /jobs?page=1&status=open` — `data[]` drives job cards, `meta.totalPages` drives pagination controls, query params map to URL search params via `useSearchParams`
2. On application status update: applicant sees change via `GET /applications/mine`, employer receives the same change simultaneously via webhook — two consumers, one database write
3. All error `code` values are machine-readable — frontend can `switch(error.code)` to show the correct toast, redirect, or UI state

---

## 18. Application Status — State Machine

```
pending → reviewed → shortlisted → rejected
                  ↘              ↗
                    hired
```

Only `Recruiter`, `Employer`, and `Super Admin` can advance status. Every transition fires the webhook event to the employer. The `ALREADY_APPLIED` (409) constraint prevents an applicant from submitting twice to the same job.

---

## 19. Five-Day Build Plan

| Day | Focus | Key deliverables |
|---|---|---|
| 1 | Foundation | NestJS scaffold, Docker Compose, PostgreSQL + Redis running, all 5 TypeORM entities, migration files, Config module, `.env.example` |
| 2 | Auth | Register, login, JWT access token, refresh token rotation, Redis blacklist, logout, `@Roles()` decorator, `RolesGuard` |
| 3 | Core routes | Jobs CRUD, pagination + filtering, apply to job, status update, role-gated endpoints, global error/transform interceptors |
| 4 | Advanced features | Rate limiting (global + auth-specific), webhook register, `EventEmitter2`, HMAC signing, delivery logs, single retry on failure |
| 5 | Ship | Swagger/OpenAPI decorators, Postman collection (with env vars + example responses), README with integration docs, seed data script, deploy to Railway |

---

## 20. What Makes This Stand Out

**The webhook HMAC signature** is the single detail that separates this from every other junior demo. Adding `X-Webhook-Signature: sha256=<hmac>` to every delivery is how Stripe, GitHub, and M-Pesa Daraja all do it. One extra line of code, but it signals you understand production API security, not just basic CRUD.

**The four-role RBAC** demonstrates that you think about systems, not just endpoints. Most juniors build two roles at most.

**The consistent response envelope** shows you've thought about the frontend consumer. Any reviewer who has built a Next.js app on top of an inconsistent API will immediately appreciate `{ data, meta, error }` on every response.

**Redis for two jobs** — rate limiting and token blacklisting — demonstrates that you reach for the right tool for the problem, not just the simplest one.

---

*Document version: 1.0 — June 2026*  
*Author: Richard Kabue Karoki*  
*Target role: Junior API Developer — WizGlobal*
