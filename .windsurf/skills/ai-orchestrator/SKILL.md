---
name: ai-orchestrator
description: Use when working on AI reply generation, prompt construction, context selection, and provider calls
---

# AI Orchestrator Skill

## Use this skill when

- A task changes AI auto-reply behavior
- A task touches prompts, memory, blacklist, opt-out, human handoff, or token usage
- A provider integration, timeout, fallback, or model selection needs adjustment

## Approach

- Verify the existing AI service boundaries before adding new logic
- Keep provider-specific logic behind the existing abstraction
- Apply eligibility checks before prompt construction
- Minimize prompt context and remove sensitive data
- Add idempotency guards so one incoming message cannot generate duplicate replies

## Done criteria

- AI response generation is bounded, safe, and observable
- Provider failures do not break message processing
- Token and usage behavior remains predictable
