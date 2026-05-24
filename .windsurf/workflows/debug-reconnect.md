---
description: Debug WhatsApp reconnect and session lifecycle issues
---

# Debug Reconnect Workflow

1. Inspect the latest user-facing symptom and identify the affected session id, tenant, and timestamp range.
2. Read the existing session lifecycle code before proposing changes.
3. Trace state transitions around QR, authenticated, ready, disconnected, reconnecting, and destroyed states.
4. Check for duplicate clients, stale listeners, pending timers, and browser resources that were not cleaned up.
5. Verify retry and backoff behavior so reconnect attempts are bounded.
6. If code changes are needed, fix the root lifecycle issue instead of masking it with extra retries.
7. Run the smallest relevant validation command or test available in the project.
8. Summarize the root cause, changed files, and remaining operational checks.
