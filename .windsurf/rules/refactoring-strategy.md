---
trigger: always_on
description: Incremental production refactoring strategy for the WhatsApp gateway project
---

# Production Refactoring Strategy

## Primary Goals

- Improve maintainability, runtime stability, modularity, and long-running process safety
- Reduce technical debt and duplicate logic without changing behavior unnecessarily
- Preserve existing APIs, routes, events, business logic, and runtime flow
- Optimize for low regression risk and backward compatibility
- Avoid unnecessary token usage when analyzing or changing code

## Priority Order

1. Runtime stability
2. Session safety
3. Event safety
4. Maintainability
5. Performance
6. Code cleanliness

## Refactoring Rules

- Analyze the existing architecture before modifying code
- Refactor incrementally per domain or module
- Preserve current behavior unless explicitly instructed otherwise
- Minimize code movement and avoid broad rewrites
- Reuse existing services, DTOs, modules, utilities, and patterns whenever possible
- Keep transport logic separate from business logic
- Keep WhatsApp gateway logic separate from AI orchestration
- Avoid creating unnecessary abstractions, files, dependencies, or architecture layers
- Do not change unrelated modules while solving a focused task
- Summarize changed files, compatibility impact, validation, and risks after changes

## Runtime Stability Rules

- Prioritize long-running process stability over cosmetic cleanup
- Avoid memory leaks from event listeners, timers, browser instances, queues, and retained payloads
- Prevent race conditions around sessions, queues, realtime events, and AI replies
- Avoid blocking operations in request handlers, event handlers, workers, and realtime flows
- Use retry mechanisms only when bounded and observable
- Prefer async processing for heavy operations

## WhatsApp Gateway Safety

- Never initialize duplicate WhatsApp clients for the same session accidentally
- Prevent duplicate event listener registration
- Protect against reconnect loops with guarded state and bounded backoff
- Preserve session persistence and avoid unnecessary QR regeneration
- Never block WhatsApp event handlers with AI, webhook, media, or billing work
- Queue outgoing messages and keep send handlers idempotent
- Preserve existing whatsapp-web.js runtime flow unless a safer minimal change is required

## AI Integration Rules

- Separate AI orchestration from transport, gateway, controller, and realtime layers
- Minimize prompt context and token usage
- Summarize or trim large conversation history instead of forwarding raw oversized context
- Avoid sending unnecessary metadata, secrets, credentials, or sensitive personal data to AI providers
- Add fallback handling for AI provider failures and timeouts
- Prevent AI requests from blocking realtime events or WhatsApp event handlers
- Guard against duplicate AI replies using existing idempotency or message state patterns

## Error Handling Rules

- Use centralized error handling patterns already present in the project
- Prevent silent failures in async paths
- Validate external input at boundaries
- Add actionable logs for important state transitions and failures
- Avoid noisy logs in loops or high-frequency event paths

## Coding Style

- Use async/await consistently
- Prefer early returns and shallow control flow
- Use descriptive names and production-oriented readability
- Add comments only for non-obvious logic
- Preserve naming conventions and file organization already used by the project

## Never Do

- Never rewrite the whole project
- Never invent nonexistent APIs, functions, modules, or events
- Never break existing routes, events, contracts, or business logic
- Never overengineer or introduce risky architecture without clear need
- Never change unrelated logic during a focused refactor
