---
trigger: glob
pattern: "backend/src/**/*.ts"
description: WhatsApp event handling standards
---

# WhatsApp Event Rules

- Treat WhatsApp events as idempotent and retry-safe
- Separate event parsing from business logic
- Normalize incoming payloads before processing
- Do not block event handlers with heavy work
- Push long-running tasks to queues or workers
- Validate message type, sender, session, and timestamp before processing
- Deduplicate events using stable message or event identifiers
- Preserve ordering only where the business flow requires it
- Emit realtime updates through existing gateway/event infrastructure
- Avoid logging full message bodies, media URLs, tokens, or personal data
