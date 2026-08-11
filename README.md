# Job Applications API

Production-grade RESTful API for managing job postings, applications, and recruitment workflows.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=flat&logo=githubactions&logoColor=white)](https://github.com/features/actions)

---

## Live Demo

| Resource | URL |
|---|---|
| Base URL | `https://job-application-api-17rf.onrender.com/api/v1` |
| Swagger UI | `https://job-application-api-17rf.onrender.com/api/v1/docs` |
| Postman Collection | [`./postman/JobApplicationsAPI.postman_collection.json`](./postman/JobApplicationsAPI.postman_collection.json) |

---

## What It Does

Full lifecycle of job recruitment — employers post jobs, applicants apply, recruiters review and advance candidates through a status pipeline. Every status change fires a signed webhook to the employer.

---

## Features

| Feature | Details |
|---|---|
| JWT auth | Access + refresh tokens with Redis-backed blacklisting |
| RBAC | 4 roles: `super_admin`, `employer`, `recruiter`, `applicant` |
| Webhooks | HMAC-SHA256 signed payloads with delivery logs |
| Rate limiting | Global + per-route throttling via Redis |
| Pagination | Cursor-based with filtering by title, location, status |
| Migrations | TypeORM — no `synchronize: true` in production |
| CI/CD | Lint, build, test, security audit, Docker build |
| Observability | Structured logging, Prometheus metrics, health checks |

---

## Quick Start

```bash
git clone https://github.com/richiekaroki/job-applications-api.git
cd job-applications-api
cp .env.example .env        # edit with your values
docker-compose up -d        # start PostgreSQL + Redis
npm run migration:run       # apply schema
npm run seed                # create test users
npm run start:dev           # http://localhost:3000/api/v1
```

See [`.env.example`](./.env.example) for all required variables.

---

## API Routes

All routes prefixed `/api/v1`. Full docs in [Swagger UI](https://job-application-api-17rf.onrender.com/api/v1/docs).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Get access + refresh tokens |
| `POST` | `/auth/refresh` | — | Rotate tokens |
| `POST` | `/auth/logout` | Bearer | Blacklist token |
| `GET` | `/jobs` | — | List jobs (paginated) |
| `GET` | `/jobs/:id` | — | Get job details |
| `POST` | `/jobs` | Employer+ | Create job |
| `PATCH` | `/jobs/:id` | Employer+ | Update job |
| `DELETE` | `/jobs/:id` | Employer+ | Delete job |
| `POST` | `/jobs/:id/apply` | Applicant | Submit application |
| `GET` | `/applications` | Recruiter+ | List all applications |
| `GET` | `/applications/mine` | Applicant | Own applications |
| `PATCH` | `/applications/:id/status` | Recruiter+ | Update status |
| `POST` | `/webhooks/register` | Employer+ | Register webhook URL |
| `GET` | `/webhooks/logs` | Employer+ | Delivery history |
| `GET` | `/admin/users` | Super Admin | List all users |
| `PATCH` | `/admin/users/:id/role` | Super Admin | Change user role |

---

## Response Format

```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 84, "totalPages": 9 },
  "error": null
}
```

---

## Tech Stack

NestJS · TypeScript · PostgreSQL · TypeORM · Redis · Docker · Jest · GitHub Actions

---

## Tests

```bash
npm run test        # unit tests
npm run test:e2e    # end-to-end tests
```

---

## Project Structure

```
src/
├── auth/           JWT, guards, refresh logic
├── users/          Entity, service, admin
├── jobs/           CRUD, pagination, filters
├── applications/   Apply, status updates, RBAC
├── webhooks/       Delivery, HMAC signing, logs
├── common/         Guards, decorators, middleware
├── config/         Env validation, DB/Redis setup
├── health.controller.ts
└── main.ts
```

---

## Architecture

See [DESIGN.md](./DESIGN.md) for schema, auth flow, webhook design, and integration contracts.

---

## Author

**Richard Kabue Karoki**
Backend / Full Stack Developer — Nairobi, Kenya
[github.com/richiekaroki](https://github.com/richiekaroki) · [linkedin.com/in/richard-karoki007](https://linkedin.com/in/richard-karoki007)
