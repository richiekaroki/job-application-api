# ADR-004: Redis for Caching and Token Blacklisting

## Status

Accepted

## Context

We need:
- Fast key-value storage for JWT blacklist
- Rate limiting counter storage
- Distributed cache for performance
- Session storage for real-time features

Options considered:
- **In-memory** — Simple, but lost on restart, not shared across instances
- **Redis** — Fast, persistent, supports TTL, widely used
- **Memcached** — Fast, but no persistence or data structures
- **Database** — Persistent, but too slow for high-frequency operations

## Decision

Use Redis for token blacklisting, rate limiting, and caching.

## Consequences

### Positive
- Sub-millisecond reads for token blacklist
- TTL support for automatic token expiration
- Shared across multiple API instances
- Pub/Sub support for future real-time features
- Managed options available (Redis Cloud, Upstash)

### Negative
- Adds infrastructure dependency
- Requires connection management
- Memory usage for large token sets
