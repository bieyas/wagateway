---
trigger: model_decision
description: WhatsApp gateway architecture and wwebjs safety rules
---

# WhatsApp Gateway Rules

- Use whatsapp-web.js as primary transport layer
- Never initialize multiple WhatsApp clients accidentally
- Prevent duplicate message event registration
- Protect against reconnect loops
- Queue all outgoing messages
- Separate transport and AI logic
- Never block message event handlers
- Use async processing for AI operations
- Preserve session stability
- Avoid unnecessary QR regeneration
- Implement retry and reconnect strategy
- Ensure message handlers are idempotent
- Prevent duplicate outgoing messages
- Use throttling for burst sends
- Avoid memory leaks from listeners
- Separate business logic from WhatsApp event handlers