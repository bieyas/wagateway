---
trigger: glob
pattern: "backend/src/**/*.ts"
description: Billing, usage accounting, and quota safety rules
---

# Billing Rules

- Treat billing and usage accounting as auditable business logic
- Validate tenant ownership before reading or mutating billing data
- Keep quota checks before expensive AI, media, webhook, or message operations
- Make usage increments idempotent where retries can happen
- Store monetary values in integer minor units when applicable
- Avoid hardcoded prices, package limits, and billing thresholds
- Use environment or configuration-backed billing settings
- Never expose payment secrets, provider tokens, or raw webhook signatures
- Verify billing provider webhooks before processing
- Prefer append-only usage records for critical billing events
