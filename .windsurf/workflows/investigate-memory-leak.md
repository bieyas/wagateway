---
description: Investigate memory leaks in long-running backend or WhatsApp session processes
---

# Investigate Memory Leak Workflow

1. Identify the process, endpoint, worker, or session flow where memory grows unexpectedly.
2. Check recent changes around sessions, queues, event emitters, browser instances, timers, and media handling.
3. Look for retained listeners, unbounded arrays/maps, unresolved promises, cached payloads, and missing cleanup paths.
4. Confirm whether memory growth correlates with reconnects, incoming messages, outbound sends, AI calls, uploads, or webhooks.
5. Add temporary targeted diagnostics only when existing logs are insufficient.
6. Fix ownership and cleanup of retained resources at the source.
7. Run a focused reproduction or monitoring command when available.
8. Summarize the suspected leak source, fix, validation, and any monitoring recommendation.
