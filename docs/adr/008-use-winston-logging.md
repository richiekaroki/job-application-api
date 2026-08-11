# ADR-008: Structured Logging with Winston

## Status

Accepted

## Context

We need logging that:
- Supports structured JSON for log aggregation
- Provides different log levels
- Includes request context (request ID, user ID)
- Integrates with monitoring tools

Options considered:
- **console.log** — Simple, but unstructured
- **Pino** — Fast, but less ecosystem
- **Winston** — Mature, flexible, good ecosystem
- **Bunyan** — Structured, but less maintained

## Decision

Use Winston for structured logging.

## Consequences

### Positive
- JSON output for log aggregation (ELK, Datadog)
- Multiple transports (console, file, HTTP)
- Custom formats for development and production
- Supports metadata and context

### Negative
- Configuration complexity
- Slightly higher memory usage than console.log
- May need additional transports for production
