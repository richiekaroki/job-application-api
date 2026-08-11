# ADR-002: JWT-Based Authentication with Refresh Tokens

## Status

Accepted

## Context

We need stateless authentication that:
- Scales horizontally without session storage
- Supports short-lived access tokens for security
- Provides refresh mechanism for user experience
- Supports token revocation for logout

Options considered:
- **Session-based** — Server-side sessions, requires sticky sessions or shared store
- **JWT without refresh** — Simple, but users must re-login frequently
- **JWT with refresh tokens** — Short-lived access + long-lived refresh, revocable
- **OAuth 2.0** — Standards-compliant, but overkill for this API

## Decision

Use JWT with access tokens (15min) and refresh tokens (7d) stored in database.

## Consequences

### Positive
- Stateless access tokens enable horizontal scaling
- Short-lived tokens limit exposure window
- Refresh tokens provide good UX (users stay logged in)
- Database-stored refresh tokens enable revocation
- Token blacklisting via Redis for immediate logout

### Negative
- More complex than simple session-based auth
- Requires database storage for refresh tokens
- Token rotation adds complexity to refresh flow
