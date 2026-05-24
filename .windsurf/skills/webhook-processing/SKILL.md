---
name: webhook-processing
description: Use when handling inbound or outbound webhooks, provider callbacks, and event delivery
---

# Webhook Processing Skill

## Use this skill when

- A task touches webhook endpoints, delivery retries, signatures, or callback processing
- A bug involves duplicate webhook events or missed provider callbacks
- A feature publishes WhatsApp, AI, billing, or status events to external systems

## Approach

- Verify signatures and tenant ownership before processing sensitive webhooks
- Normalize payloads before passing them to business services
- Deduplicate events with stable provider ids when available
- Respond quickly and move heavy work to queues
- Keep retry behavior bounded and log delivery failures with correlation ids

## Done criteria

- Webhook handling is secure, idempotent, and retry-safe
- External delivery failures do not block core processing
- Payload logging avoids secrets and sensitive content
