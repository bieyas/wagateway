---
trigger: glob
pattern: "backend/src/**/*.ts"
description: WhatsApp session lifecycle and reconnect safety rules
---

# WhatsApp Session Rules

- Treat each WhatsApp session as an isolated runtime boundary
- Keep session state transitions explicit and observable
- Never recreate sessions blindly without checking current state
- Use guarded reconnect flows with backoff and maximum retry limits
- Avoid duplicate browser/client instances for the same session
- Persist only safe session metadata, never raw secrets or auth artifacts in logs
- Clean up listeners, timers, and browser resources on disconnect or destroy
- Make QR, authenticated, ready, disconnected, and failure states consistent
- Ensure concurrent session operations are serialized per session id
- Prefer existing session manager abstractions before adding new lifecycle code
