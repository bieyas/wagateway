---
description: Optimize AI token usage and prompt efficiency
---

# Optimize Token Workflow

1. Locate the AI orchestration service, prompt builder, and provider call site.
2. Identify which context is mandatory for reply quality and which context can be trimmed.
3. Check blacklist, opt-out, human-handoff, and quota gates before optimizing prompt construction.
4. Reduce duplicated instructions, repeated chat history, oversized metadata, and unnecessary raw payloads.
5. Preserve behavior by keeping the same output contract for downstream message sending.
6. Add or adjust usage tracking only through existing metrics or logging patterns.
7. Validate with representative short, medium, and long conversation inputs.
8. Summarize expected token reduction and any quality trade-offs.
