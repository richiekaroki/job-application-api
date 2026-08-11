# ADR-005: Event-Driven Webhook Architecture

## Status

Accepted

## Context

We need to notify employers when application status changes:
- Real-time delivery preferred
- Decouple webhook delivery from API response
- Support retry on failure
- Log delivery attempts

Options considered:
- **Synchronous** — Deliver in API handler, blocks response
- **Event-driven** — Emit events, separate handler delivers webhooks
- **Message queue** — Use RabbitMQ/SQS for delivery
- **Third-party** — Use webhook service (Svix, Hookdeck)

## Decision

Use NestJS EventEmitter for event-driven webhook delivery.

## Consequences

### Positive
- API response not blocked by webhook delivery
- Retry logic for failed deliveries
- Easy to add new webhook events
- No external dependency for event bus
- Logging of all delivery attempts

### Negative
- In-memory events lost on restart
- No guaranteed delivery (would need message queue)
- Single-instance limitation for events
