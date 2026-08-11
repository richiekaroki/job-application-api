# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Job Applications API.

## What is an ADR?

An ADR is a short document that captures a significant architectural decision along with its context and consequences.

## Format

Each ADR follows this template:

```
# ADR-{NUMBER}: {TITLE}

## Status
{Proposed | Accepted | Deprecated | Superseded}

## Context
{What is the issue that we're seeing that motivates this decision?}

## Decision
{What is the change that we're proposing and/or doing?}

## Consequences
{What becomes easier or more difficult to do because of this change?}
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| 001 | Use NestJS as primary framework | Accepted |
| 002 | JWT-based authentication with refresh tokens | Accepted |
| 003 | TypeORM with PostgreSQL | Accepted |
| 004 | Redis for caching and token blacklisting | Accepted |
| 005 | Event-driven webhook architecture | Accepted |
| 006 | SQLite for testing | Accepted |
| 007 | Docker multi-stage builds | Accepted |
| 008 | Structured logging with Winston | Accepted |
