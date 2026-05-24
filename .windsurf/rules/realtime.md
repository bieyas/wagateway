---
trigger: model_decision
description: Realtime and event-driven backend standards
---

# Realtime Backend Rules

- Prevent duplicate event listeners
- Avoid memory leaks
- Clean up listeners properly
- Use retry mechanisms
- Separate queue processing from realtime handlers
- Never block event loop
- Use debounce/throttle when needed
- Handle reconnect gracefully
- Ensure idempotent processing
- Protect against race conditions