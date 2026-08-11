# ADR-007: Docker Multi-Stage Builds

## Status

Accepted

## Context

We need containerization that:
- Produces small production images
- Separates build and runtime dependencies
- Runs as non-root user for security
- Includes health checks

Options considered:
- **Single-stage** — Simple, but large images with dev dependencies
- **Multi-stage** — Small images, separates concerns
- ** distroless** — Minimal, but debugging is harder
- **Alpine only** — Small base, but may miss system libraries

## Decision

Use Docker multi-stage builds with Node.js Alpine.

## Consequences

### Positive
- Production image excludes dev dependencies
- Non-root user improves security
- Health checks enable orchestration
- Layer caching speeds up builds

### Negative
- More complex Dockerfile
- Build stage adds CI time
- Must maintain two environments
