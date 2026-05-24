---
trigger: glob
pattern: "backend/src/**/*.ts"
description: AI agent orchestration, prompt, and token safety rules
---

# AI Agent Rules

- Keep AI orchestration separate from transport and persistence layers
- Validate tenant, contact, session, and conversation context before invoking AI
- Use bounded prompts and avoid sending unnecessary chat history
- Redact secrets, tokens, credentials, and sensitive personal data from prompts
- Track token usage, latency, and provider failures where supported
- Use deterministic fallbacks when AI provider calls fail or timeout
- Do not hardcode model names, API keys, pricing, or limits in business logic
- Keep blacklist, opt-out, and human-handoff checks before AI response generation
- Avoid duplicate AI replies by using idempotency keys or message guards
- Preserve existing provider abstractions before adding a new AI integration
