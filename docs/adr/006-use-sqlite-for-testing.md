# ADR-006: SQLite for Testing

## Status

Accepted

## Context

We need a test database that:
- Doesn't require external services
- Starts quickly for fast test runs
- Supports the same SQL queries as PostgreSQL
- Cleans up after each test

Options considered:
- **PostgreSQL (Docker)** — Same as production, but slow startup
- **SQLite in-memory** — Fast, no setup, but some SQL differences
- **Testcontainers** — Full container lifecycle, but complex setup
- **Mock repository** — Fast, but doesn't test actual queries

## Decision

Use SQLite in-memory for E2E tests.

## Consequences

### Positive
- Tests run without external dependencies
- Fast startup and teardown
- In-memory database isolates tests
- Same TypeORM API as PostgreSQL

### Negative
- Some PostgreSQL-specific features not available
- Enum handling differs (strings vs native enums)
- May miss PostgreSQL-specific query issues
