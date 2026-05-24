---
description: Create a new production-ready feature in the WhatsApp gateway
---

# Create Feature Workflow

1. Clarify the feature goal, affected users, and expected API or UI behavior.
2. Search existing modules for reusable services, DTOs, entities, hooks, and components.
3. Design the smallest change that fits the existing architecture and preserves backward compatibility.
4. Implement business logic in services, keeping controllers, gateways, and UI components thin.
5. Validate external inputs and avoid hardcoded tenant, billing, provider, or session assumptions.
6. Add queue, realtime, webhook, or billing integration only when the feature explicitly requires it.
7. Run relevant lint, typecheck, build, or targeted tests.
8. Summarize changed files, behavior, validation results, and follow-up risks.
