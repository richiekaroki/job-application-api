# Job Applications API

A production-grade RESTful API for managing job postings, applications, and recruitment workflows. Built as a portfolio project targeting a Junior API Developer role.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=flat&logo=railway&logoColor=white)](https://railway.app)

---

## Live Demo

| Resource | URL |
|---|---|
| Base URL | `https://your-api.railway.app/api/v1` |
| Swagger UI | `https://your-api.railway.app/api/docs` |
| Postman Collection | [`/postman/JobApplicationsAPI.postman_collection.json`](./postman/JobApplicationsAPI.postman_collection.json) |

---

## What This API Does

The API covers the full lifecycle of job recruitment:

- **Employers** post jobs and register webhook URLs to receive real-time status notifications
- **Recruiters** review applications and advance candidates through a status pipeline
- **Applicants** browse open jobs and submit applications
- **Super Admins** manage users and reassign roles

Every status change fires a signed webhook event to the employer — simultaneously notifying them while the applicant sees the update on their own dashboard.

---

## Key Features

| Feature | Implementation |
|---|---|
| JWT authentication | Access token (15 min) + refresh token (7 days) |
| Token blacklisting | Redis — invalidates tokens on logout before expiry |
| Four-role RBAC | `super_admin` · `employer` · `recruiter` · `applicant` |
| Webhook delivery | HMAC-SHA256 signed payloads, delivery logs, single retry |
| Rate limiting | Global (100 req/min) + strict auth routes (10 req/min) via Redis |
| Pagination & filtering | `page`, `limit`, `title`, `location`, `status`, `postedAfter` |
| Consistent response envelope | `{ data, meta, error }` on every endpoint |
| Database migrations | TypeORM migrations — no `synchronize: true` |
| OpenAPI docs | Auto-generated Swagger UI from NestJS decorators |

---

## Tech Stack

```
NestJS + TypeScript    — framework
PostgreSQL             — primary database
TypeORM                — ORM + migrations
Redis                  — rate limiting + token blacklist
Docker Compose         — local development environment
Railway                — deployment
Swagger / OpenAPI      — API documentation
Jest                   — unit tests
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Clone the repo

```bash
git clone https://github.com/richiekaroki/job-applications-api.git
cd job-applications-api
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start PostgreSQL and Redis

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
npm run migration:run
```

### 5. Seed test data

```bash
npm run seed
```

### 6. Start the server

```bash
npm run start:dev
```

API is now running at `http://localhost:3000/api/v1`.  
Swagger UI at `http://localhost:3000/api/docs`.

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list. Key variables:

```bash
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=jobapi
DB_PASSWORD=jobapi_pass
DB_NAME=job_applications

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

WEBHOOK_SECRET=your_webhook_hmac_secret
```

---

## API Overview

All routes are prefixed `/api/v1`. Full documentation available in [Swagger UI](https://your-api.railway.app/api/docs).

### Auth

```
POST   /auth/register        — create account
POST   /auth/login           — returns access + refresh tokens
POST   /auth/refresh         — issue new access token
POST   /auth/logout          — blacklist token, revoke refresh
```

### Jobs

```
GET    /jobs                 — list jobs (paginated + filtered) — public
GET    /jobs/:id             — single job — public
POST   /jobs                 — create job — employer+
PATCH  /jobs/:id             — update job — employer+
DELETE /jobs/:id             — delete job — employer+
```

### Applications

```
POST   /jobs/:id/apply           — submit application — applicant
GET    /applications             — all applications — recruiter+
GET    /applications/mine        — own applications — applicant
PATCH  /applications/:id/status  — update status → fires webhook — recruiter+
```

### Webhooks

```
POST   /webhooks/register    — save webhook URL — employer+
GET    /webhooks/logs        — delivery history — employer+
```

### Admin

```
GET    /admin/users              — list all users — super_admin
PATCH  /admin/users/:id/role     — reassign role — super_admin
```

---

## Authentication

The API uses JWT with refresh token rotation and Redis-backed token blacklisting.

```bash
# 1. Register
POST /auth/register
{ "email": "user@example.com", "password": "secure_pass", "fullName": "Jane Doe", "role": "applicant" }

# 2. Login — returns access_token and refresh_token
POST /auth/login
{ "email": "user@example.com", "password": "secure_pass" }

# 3. Use the access token on protected routes
Authorization: Bearer <access_token>

# 4. Refresh when the access token expires (15 min)
POST /auth/refresh
{ "refreshToken": "<refresh_token>" }

# 5. Logout — token is blacklisted in Redis immediately
POST /auth/logout
```

---

## Response Format

Every endpoint returns the same envelope shape:

```json
// Success
{
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 84, "totalPages": 9 },
  "error": null
}

// Error
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

The `code` field is machine-readable for frontend `switch()` logic. The `message` is human-readable for toast notifications.

---

## Webhook System

When a recruiter updates an application status, the employer receives a signed POST to their registered URL:

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

Every delivery includes an `X-Webhook-Signature` header for verification:

```
X-Webhook-Signature: sha256=<HMAC-SHA256(payload, WEBHOOK_SECRET)>
```

Register a webhook URL:

```bash
POST /webhooks/register
Authorization: Bearer <employer_token>
{ "webhookUrl": "https://your-server.com/hooks/jobs" }
```

View delivery logs:

```bash
GET /webhooks/logs
Authorization: Bearer <employer_token>
```

---

## Application Status Pipeline

```
pending → reviewed → shortlisted → rejected
                              ↘
                            hired
```

Only `recruiter`, `employer`, and `super_admin` roles can advance status. Every transition fires a webhook event.

---

## Running Tests

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov
```

---

## Deployment — Railway

The API is deployed on Railway with PostgreSQL and Redis as native plugins.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

See [`railway.toml`](./railway.toml) for build and deploy configuration.

---

## Project Structure

```
src/
  auth/               ← JWT strategy, guards, refresh logic
  users/              ← entity, service, admin controller
  jobs/               ← CRUD, pagination, filters
  applications/       ← apply, status update, RBAC
  webhooks/           ← emitter, delivery, HMAC signing, logs
  common/             ← decorators, guards, interceptors, filters
  config/             ← env validation, DB/Redis config
  app.module.ts
  main.ts
migrations/
postman/
docker-compose.yml
railway.toml
.env.example
```

---

## System Design

Full architecture decisions, schema, auth flow, webhook design, and frontend integration contract documented in:

**[DESIGN.md](./DESIGN.md)**

Covers: tech stack rationale · RBAC matrix · database schema · all API routes · JWT + Redis auth flow · webhook HMAC signing · rate limiting · response envelope · error codes · filtering params · field naming convention · CORS config · folder structure · Docker Compose · environment variables · Next.js integration contract · 5-day build plan.

---

## Author

**Richard Kabue Karoki**  
Backend / Full Stack Developer — Nairobi, Kenya  
[github.com/richiekaroki](https://github.com/richiekaroki) · [linkedin.com/in/richard-karoki007](https://linkedin.com/in/richard-karoki007)
