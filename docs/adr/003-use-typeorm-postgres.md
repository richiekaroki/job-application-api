# ADR-003: TypeORM with PostgreSQL

## Status

Accepted

## Context

We need a database layer that:
- Supports complex queries and relationships
- Provides type safety with TypeScript
- Supports migrations for schema evolution
- Works well with NestJS

Options considered:
- **Prisma** — Modern, type-safe, but schema-first approach
- **TypeORM** — Decorator-based, supports complex queries, mature
- **Drizzle** — Lightweight, SQL-first, but newer ecosystem
- **Raw pg** — Maximum control, but no ORM benefits

## Decision

Use TypeORM with PostgreSQL.

## Consequences

### Positive
- Decorator-based entities integrate well with NestJS
- QueryBuilder supports complex queries without raw SQL
- Migrations support schema versioning
- Large ecosystem and documentation
- Supports SQLite for testing

### Negative
- Decorator-based approach can be verbose
- Some advanced queries may need QueryBuilder
- Entity metadata can be complex
