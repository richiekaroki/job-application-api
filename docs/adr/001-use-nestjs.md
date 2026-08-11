# ADR-001: Use NestJS as Primary Framework

## Status

Accepted

## Context

We need a backend framework that supports:
- Enterprise-grade architecture (modules, guards, interceptors)
- TypeScript-first development
- Built-in support for REST APIs, WebSocket, and microservices
- Strong community and maintenance
- Good testing capabilities

Options considered:
- **Express** — Minimal, flexible, but lacks structure for enterprise apps
- **Fastify** — High performance, but smaller ecosystem than Express
- **NestJS** — Opinionated, modular, TypeScript-native, built on Express/Fastify
- **Koa** — Modern, but smaller community

## Decision

Use NestJS as the primary framework.

## Consequences

### Positive
- Modular architecture enforces clean separation of concerns
- Guards, interceptors, and pipes provide reusable cross-cutting logic
- Dependency injection makes testing and mocking straightforward
- Built-in Swagger integration for API documentation
- Active maintenance and strong TypeScript support

### Negative
- Steeper learning curve than Express
- More boilerplate for simple endpoints
- Opinionated structure may feel restrictive for small projects
